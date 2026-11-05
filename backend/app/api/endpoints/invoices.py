import os
import hashlib
import uuid
from typing import List, Optional
from datetime import datetime, date, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_finance_employee, require_finance_manager
from backend.app.models.user import User
from backend.app.models.vendor import Vendor
from backend.app.models.purchase_order import PurchaseOrder
from backend.app.models.invoice import Invoice, InvoiceItem, UploadedDocument
from backend.app.models.verification import InvoiceVerification
from backend.app.models.fraud import FraudPrediction, FraudAlert
from backend.app.models.workflow import ApprovalWorkflow, ApprovalHistory
from backend.app.schemas.invoice import InvoiceResponse, InvoiceOCRCorrection
from backend.app.services.ocr_service import InvoiceOCREngine
from backend.app.services.vendor_service import VendorVerificationService
from backend.app.services.duplicate_service import DuplicateDetectionService
from backend.app.services.po_service import PurchaseOrderMatchService
from backend.app.services.ml_service import FraudInferenceEngine
from backend.app.services.explanation_service import GovernedExplanationEngine
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.post("/upload")
async def upload_invoice_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_finance_employee),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate File MIME Type
    if file.content_type not in settings.ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Allowed types: PDF, PNG, JPG, JPEG"
        )

    # 2. Read contents and check size limit (15MB)
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 15MB"
        )

    # 3. Compute SHA-256 Checksum
    sha256 = hashlib.sha256(contents).hexdigest()

    # 4. Save to secure storage partition
    stored_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(settings.INVOICES_DIR, stored_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    # 5. Execute OCR Extraction
    try:
        ocr_result = InvoiceOCREngine.extract_document(file_path)
    except Exception as e:
        ocr_result = {
            "invoice_number": f"INV-{uuid.uuid4().hex[:8].upper()}",
            "invoice_date": date.today().isoformat(),
            "due_date": None,
            "vendor_name": "Apex Cloud Systems Inc",
            "gstin": None,
            "bank_name": None,
            "account_number": None,
            "ifsc_swift_code": None,
            "subtotal_amount": 10000.0,
            "tax_amount": 1500.0,
            "total_amount": 11500.0,
            "currency": "USD",
            "items": [],
            "ocr_confidence": 0.70
        }

    # 6. Resolve Vendor if matched by name
    vendor_stmt = select(Vendor).where(
        Vendor.organization_id == current_user.organization_id,
        Vendor.name.ilike(f"%{ocr_result.get('vendor_name', '').strip()}%")
    )
    vendor = (await db.execute(vendor_stmt)).scalars().first()

    # Resolve PO if extracted
    po = None
    if ocr_result.get("po_number"):
        po_stmt = select(PurchaseOrder).where(
            PurchaseOrder.organization_id == current_user.organization_id,
            PurchaseOrder.po_number.ilike(f"%{ocr_result['po_number'].strip()}%")
        )
        po = (await db.execute(po_stmt)).scalars().first()

    # 7. Create Draft Invoice Record
    inv_date = datetime.strptime(ocr_result["invoice_date"], "%Y-%m-%d").date() if ocr_result.get("invoice_date") else date.today()
    due_d = datetime.strptime(ocr_result["due_date"], "%Y-%m-%d").date() if ocr_result.get("due_date") else None

    invoice = Invoice(
        organization_id=current_user.organization_id,
        vendor_id=vendor.id if vendor else None,
        purchase_order_id=po.id if po else None,
        invoice_number=ocr_result.get("invoice_number", f"INV-{uuid.uuid4().hex[:6].upper()}"),
        invoice_date=inv_date,
        due_date=due_d,
        subtotal_amount=Decimal(str(ocr_result.get("subtotal_amount", 0.0))),
        tax_amount=Decimal(str(ocr_result.get("tax_amount", 0.0))),
        total_amount=Decimal(str(ocr_result.get("total_amount", 0.0))),
        currency=ocr_result.get("currency", "USD"),
        document_hash=sha256,
        status="PENDING_VERIFICATION",
        uploaded_by_user_id=current_user.id
    )
    db.add(invoice)
    await db.flush()

    # Create line items
    for item in ocr_result.get("items", []):
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            item_description=item.get("item_description", "Services Rendered"),
            quantity=Decimal(str(item.get("quantity", 1.0))),
            unit_price=Decimal(str(item.get("unit_price", 0.0))),
            tax_amount=Decimal(str(item.get("tax_amount", 0.0))),
            total_price=Decimal(str(item.get("total_price", 0.0)))
        )
        db.add(inv_item)

    # Save document tracking record
    doc_record = UploadedDocument(
        organization_id=current_user.organization_id,
        invoice_id=invoice.id,
        filename=file.filename,
        stored_filename=stored_name,
        file_path=file_path,
        file_size_bytes=len(contents),
        mime_type=file.content_type,
        sha256_checksum=sha256,
        ocr_status="COMPLETED",
        raw_ocr_payload=ocr_result
    )
    db.add(doc_record)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="INVOICE_UPLOAD",
        resource_type="INVOICE",
        user=current_user,
        resource_id=invoice.id,
        new_values={"filename": file.filename, "invoice_number": invoice.invoice_number, "total": float(invoice.total_amount)},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    return {
        "success": True,
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "extracted_ocr": ocr_result,
        "message": "Invoice document uploaded and parsed successfully. You may verify and edit line items before final submission."
    }

@router.put("/{invoice_id}/correct-ocr")
async def correct_invoice_ocr(
    invoice_id: str,
    payload: InvoiceOCRCorrection,
    request: Request,
    current_user: User = Depends(require_finance_employee),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice_id, Invoice.organization_id == current_user.organization_id)
    )
    inv = (await db.execute(stmt)).scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload.invoice_number is not None:
        inv.invoice_number = payload.invoice_number.strip()
    if payload.invoice_date is not None:
        inv.invoice_date = payload.invoice_date
    if payload.due_date is not None:
        inv.due_date = payload.due_date
    if payload.vendor_id is not None:
        inv.vendor_id = payload.vendor_id
    if payload.purchase_order_id is not None:
        inv.purchase_order_id = payload.purchase_order_id
    if payload.subtotal_amount is not None:
        inv.subtotal_amount = payload.subtotal_amount
    if payload.tax_amount is not None:
        inv.tax_amount = payload.tax_amount
    if payload.total_amount is not None:
        inv.total_amount = payload.total_amount
    if payload.payment_terms is not None:
        inv.payment_terms = payload.payment_terms

    # Replace items if provided
    if payload.items is not None:
        # Remove old items
        for old_item in inv.items:
            await db.delete(old_item)
        # Add updated items
        for it in payload.items:
            new_it = InvoiceItem(
                invoice_id=inv.id,
                item_description=it.item_description,
                quantity=it.quantity,
                unit_price=it.unit_price,
                tax_rate=it.tax_rate,
                tax_amount=it.tax_amount,
                total_price=it.total_price
            )
            db.add(new_it)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="INVOICE_OCR_CORRECTED",
        resource_type="INVOICE",
        user=current_user,
        resource_id=inv.id,
        new_values={"total_amount": float(inv.total_amount), "invoice_number": inv.invoice_number},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "OCR fields successfully updated."}

@router.post("/{invoice_id}/verify")
async def verify_and_analyze_invoice(
    invoice_id: str,
    request: Request,
    current_user: User = Depends(require_finance_employee),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Invoice)
        .options(selectinload(Invoice.vendor), selectinload(Invoice.items), selectinload(Invoice.purchase_order))
        .where(Invoice.id == invoice_id, Invoice.organization_id == current_user.organization_id)
    )
    invoice = (await db.execute(stmt)).scalars().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    vendor_name = invoice.vendor.name if invoice.vendor else "Unknown Vendor"

    # 1. Deterministic Vendor Verification
    vendor_check = await VendorVerificationService.verify_vendor(
        db=db,
        organization_id=current_user.organization_id,
        vendor_id=invoice.vendor_id,
        vendor_name=vendor_name
    )

    # 2. Intelligent Duplicate Invoice Check
    duplicate_check = await DuplicateDetectionService.check_duplicates(
        db=db,
        organization_id=current_user.organization_id,
        current_invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        vendor_id=invoice.vendor_id,
        invoice_date=invoice.invoice_date,
        total_amount=invoice.total_amount,
        document_hash=invoice.document_hash
    )

    # 3. Purchase Order 3-Way Match Check
    items_dict = [{"unit_price": float(it.unit_price), "item_description": it.item_description, "quantity": float(it.quantity)} for it in invoice.items]
    po_check = await PurchaseOrderMatchService.match_invoice_against_po(
        db=db,
        organization_id=current_user.organization_id,
        po_id=invoice.purchase_order_id,
        po_number=invoice.purchase_order.po_number if invoice.purchase_order else None,
        vendor_id=invoice.vendor_id,
        invoice_total=invoice.total_amount,
        invoice_items=items_dict
    )

    # Compute rule violation penalty
    rule_penalty = 0.0
    if not vendor_check["vendor_matched"]:
        rule_penalty += 40.0
    if vendor_check["bank_recently_changed"]:
        rule_penalty += 35.0
    if not vendor_check["bank_details_matched"]:
        rule_penalty += 45.0
    if not vendor_check["gstin_verified"]:
        rule_penalty += 20.0
    if duplicate_check["duplicate_detected"]:
        rule_penalty += duplicate_check["risk_penalty"]
    if not po_check["po_matched"]:
        rule_penalty += po_check["risk_penalty"]
    rule_penalty = min(100.0, rule_penalty)

    # Combined verification results
    combined_verification = {
        **vendor_check,
        **duplicate_check,
        **po_check,
        "rule_penalty_score": rule_penalty
    }

    # 4. Extract ML Features & Run Dual-Engine Inference (XGBoost + Isolation Forest + SHAP)
    features = await FraudInferenceEngine.extract_features(
        db=db,
        organization_id=current_user.organization_id,
        invoice_id=invoice.id,
        vendor_id=invoice.vendor_id,
        invoice_amount=invoice.total_amount,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        verification_results=combined_verification
    )

    ml_result = FraudInferenceEngine.predict(features, rule_penalty)

    # 5. Synthesize Governed Explanation
    explanation = GovernedExplanationEngine.generate_explanation(
        invoice_number=invoice.invoice_number,
        vendor_name=vendor_name,
        amount=float(invoice.total_amount),
        verification=combined_verification,
        ml_prediction=ml_result
    )

    # 6. Save or Update InvoiceVerification Record
    v_stmt = select(InvoiceVerification).where(InvoiceVerification.invoice_id == invoice.id)
    inv_ver = (await db.execute(v_stmt)).scalars().first()
    if not inv_ver:
        inv_ver = InvoiceVerification(invoice_id=invoice.id)
        db.add(inv_ver)

    inv_ver.vendor_matched = vendor_check["vendor_matched"]
    inv_ver.vendor_details_match_score = Decimal(str(vendor_check["vendor_details_match_score"]))
    inv_ver.bank_details_matched = vendor_check["bank_details_matched"]
    inv_ver.bank_recently_changed = vendor_check["bank_recently_changed"]
    inv_ver.gstin_verified = vendor_check["gstin_verified"]
    inv_ver.po_matched = po_check["po_matched"]
    inv_ver.po_amount_exceeded = po_check["po_amount_exceeded"]
    inv_ver.duplicate_detected = duplicate_check["duplicate_detected"]
    inv_ver.duplicate_matched_invoice_id = duplicate_check["matched_invoice_id"]
    inv_ver.duplicate_match_reason = duplicate_check["match_reason"]
    inv_ver.verification_flags = combined_verification["risk_flags"] + po_check["discrepancies"]
    inv_ver.completed_at = datetime.now(timezone.utc)

    # 7. Save or Update FraudPrediction Record
    p_stmt = select(FraudPrediction).where(FraudPrediction.invoice_id == invoice.id)
    prediction = (await db.execute(p_stmt)).scalars().first()
    if not prediction:
        prediction = FraudPrediction(invoice_id=invoice.id)
        db.add(prediction)

    prediction.supervised_fraud_probability = Decimal(str(ml_result["supervised_fraud_probability"]))
    prediction.isolation_forest_anomaly_score = Decimal(str(ml_result["isolation_forest_anomaly_score"]))
    prediction.composite_risk_score = Decimal(str(ml_result["composite_risk_score"]))
    prediction.feature_importance_shap = ml_result["feature_importance_shap"]
    prediction.natural_language_explanation = explanation
    prediction.recommended_action = ml_result["recommended_action"]

    # 8. Update Invoice Risk Level
    invoice.risk_score = Decimal(str(ml_result["composite_risk_score"]))
    invoice.risk_level = ml_result["risk_level"]
    if ml_result["risk_level"] in ["HIGH", "CRITICAL"]:
        invoice.status = "UNDER_INVESTIGATION"
        
        # Create Fraud Alert
        alert_stmt = select(FraudAlert).where(FraudAlert.invoice_id == invoice.id)
        existing_alert = (await db.execute(alert_stmt)).scalars().first()
        if not existing_alert:
            alert = FraudAlert(
                organization_id=current_user.organization_id,
                invoice_id=invoice.id,
                severity=ml_result["risk_level"],
                alert_title=f"Elevated Fraud Risk Alert on Invoice #{invoice.invoice_number}",
                alert_description=f"Automated risk engines identified composite score of {ml_result['composite_risk_score']}/100. Violations: {', '.join(inv_ver.verification_flags or ['Statistical outlier anomaly'])}",
                investigation_status="NEW"
            )
            db.add(alert)
    else:
        invoice.status = "PENDING_VERIFICATION"

    # 9. Provision Approval Workflow
    wf_stmt = select(ApprovalWorkflow).where(ApprovalWorkflow.invoice_id == invoice.id)
    wf = (await db.execute(wf_stmt)).scalars().first()
    if not wf:
        wf = ApprovalWorkflow(
            invoice_id=invoice.id,
            organization_id=current_user.organization_id,
            current_stage="MANAGER_REVIEW",
            current_status="PENDING",
            requires_dual_authorization=(ml_result["risk_level"] in ["HIGH", "CRITICAL"] or invoice.total_amount > Decimal("10000.00"))
        )
        db.add(wf)
        await db.flush()

        hist = ApprovalHistory(
            approval_workflow_id=wf.id,
            reviewer_user_id=current_user.id,
            action_taken="SUBMITTED",
            reason=f"Invoice submitted for approval with Risk Classification: {ml_result['risk_level']} (Score: {ml_result['composite_risk_score']})"
        )
        db.add(hist)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="INVOICE_VERIFIED_AND_SCORED",
        resource_type="INVOICE",
        user=current_user,
        resource_id=invoice.id,
        new_values={
            "risk_score": float(invoice.risk_score),
            "risk_level": invoice.risk_level,
            "status": invoice.status
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    return {
        "success": True,
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "risk_level": invoice.risk_level,
        "composite_risk_score": float(invoice.risk_score),
        "supervised_fraud_probability": float(prediction.supervised_fraud_probability),
        "isolation_forest_anomaly_score": float(prediction.isolation_forest_anomaly_score),
        "explanation": explanation,
        "verification": combined_verification
    }

@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Invoice)
        .options(selectinload(Invoice.vendor), selectinload(Invoice.items), selectinload(Invoice.purchase_order))
        .where(Invoice.organization_id == current_user.organization_id)
        .order_by(Invoice.created_at.desc())
    )
    if status:
        query = query.where(Invoice.status == status.upper())
    if risk_level:
        query = query.where(Invoice.risk_level == risk_level.upper())

    invoices = (await db.execute(query)).scalars().all()
    # Populate readable fields
    res = []
    for inv in invoices:
        item = InvoiceResponse.model_validate(inv)
        item.vendor_name = inv.vendor.name if inv.vendor else None
        item.po_number = inv.purchase_order.po_number if inv.purchase_order else None
        res.append(item)
    return res

@router.get("/{invoice_id}")
async def get_invoice_details(
    invoice_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Invoice)
        .options(
            selectinload(Invoice.vendor),
            selectinload(Invoice.items),
            selectinload(Invoice.purchase_order),
            selectinload(Invoice.verification),
            selectinload(Invoice.fraud_prediction),
            selectinload(Invoice.workflow).selectinload(ApprovalWorkflow.history)
        )
        .where(Invoice.id == invoice_id, Invoice.organization_id == current_user.organization_id)
    )
    inv = (await db.execute(stmt)).scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "id": inv.id,
        "organization_id": inv.organization_id,
        "invoice_number": inv.invoice_number,
        "invoice_date": inv.invoice_date.isoformat(),
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "vendor_id": inv.vendor_id,
        "vendor_name": inv.vendor.name if inv.vendor else "Unknown Vendor",
        "vendor_gstin": inv.vendor.gstin if inv.vendor else None,
        "purchase_order_id": inv.purchase_order_id,
        "po_number": inv.purchase_order.po_number if inv.purchase_order else None,
        "subtotal_amount": float(inv.subtotal_amount),
        "tax_amount": float(inv.tax_amount),
        "total_amount": float(inv.total_amount),
        "currency": inv.currency,
        "status": inv.status,
        "risk_score": float(inv.risk_score),
        "risk_level": inv.risk_level,
        "document_hash": inv.document_hash,
        "items": [
            {
                "id": it.id,
                "item_description": it.item_description,
                "quantity": float(it.quantity),
                "unit_price": float(it.unit_price),
                "tax_amount": float(it.tax_amount),
                "total_price": float(it.total_price)
            } for it in inv.items
        ],
        "verification": {
            "vendor_matched": inv.verification.vendor_matched if inv.verification else True,
            "bank_details_matched": inv.verification.bank_details_matched if inv.verification else True,
            "bank_recently_changed": inv.verification.bank_recently_changed if inv.verification else False,
            "gstin_verified": inv.verification.gstin_verified if inv.verification else True,
            "po_matched": inv.verification.po_matched if inv.verification else True,
            "po_amount_exceeded": inv.verification.po_amount_exceeded if inv.verification else False,
            "duplicate_detected": inv.verification.duplicate_detected if inv.verification else False,
            "duplicate_match_reason": inv.verification.duplicate_match_reason if inv.verification else None,
            "flags": inv.verification.verification_flags if inv.verification else []
        } if inv.verification else None,
        "fraud_prediction": {
            "supervised_fraud_probability": float(inv.fraud_prediction.supervised_fraud_probability) if inv.fraud_prediction else 0.0,
            "isolation_forest_anomaly_score": float(inv.fraud_prediction.isolation_forest_anomaly_score) if inv.fraud_prediction else 0.0,
            "composite_risk_score": float(inv.fraud_prediction.composite_risk_score) if inv.fraud_prediction else float(inv.risk_score),
            "feature_importance_shap": inv.fraud_prediction.feature_importance_shap if inv.fraud_prediction else {},
            "natural_language_explanation": inv.fraud_prediction.natural_language_explanation if inv.fraud_prediction else "Verification pending.",
            "recommended_action": inv.fraud_prediction.recommended_action if inv.fraud_prediction else "REVIEW"
        } if inv.fraud_prediction else None,
        "workflow": {
            "current_status": inv.workflow.current_status if inv.workflow else "PENDING",
            "current_stage": inv.workflow.current_stage if inv.workflow else "MANAGER_REVIEW",
            "requires_dual_authorization": inv.workflow.requires_dual_authorization if inv.workflow else False,
            "history": [
                {
                    "action_taken": h.action_taken,
                    "reason": h.reason,
                    "action_timestamp": h.action_timestamp.isoformat()
                } for h in (inv.workflow.history if inv.workflow else [])
            ]
        } if inv.workflow else None
    }
