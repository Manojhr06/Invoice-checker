from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user, require_finance_manager, require_finance_employee
from backend.app.models.user import User
from backend.app.models.vendor import Vendor, VendorBankAccount
from backend.app.models.invoice import Invoice
from backend.app.schemas.vendor import VendorResponse, VendorCreate, VendorUpdate, VendorBankAccountCreate
from backend.app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("", response_model=List[VendorResponse])
async def list_vendors(
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Vendor)
        .options(selectinload(Vendor.bank_accounts))
        .where(Vendor.organization_id == current_user.organization_id)
        .order_by(Vendor.created_at.desc())
    )
    if search:
        query = query.where(
            Vendor.name.ilike(f"%{search.strip()}%") | Vendor.vendor_code.ilike(f"%{search.strip()}%")
        )
    if risk_level:
        query = query.where(Vendor.risk_level == risk_level.upper())

    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=VendorResponse)
async def create_vendor(
    payload: VendorCreate,
    request: Request,
    current_user: User = Depends(require_finance_employee),
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate code within organization
    code_check = await db.execute(
        select(Vendor).where(
            Vendor.organization_id == current_user.organization_id,
            Vendor.vendor_code == payload.vendor_code.strip()
        )
    )
    if code_check.scalars().first():
        raise HTTPException(status_code=400, detail="Vendor code already exists in your organization")

    vendor = Vendor(
        organization_id=current_user.organization_id,
        vendor_code=payload.vendor_code.strip(),
        name=payload.name.strip(),
        gstin=payload.gstin.strip() if payload.gstin else None,
        tax_id=payload.tax_id.strip() if payload.tax_id else None,
        email=str(payload.email) if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        address=payload.address.strip() if payload.address else None,
        risk_score=Decimal("15.00"),
        risk_level="LOW",
        is_verified=False
    )
    db.add(vendor)
    await db.flush()

    if payload.initial_bank_account:
        bank = VendorBankAccount(
            vendor_id=vendor.id,
            organization_id=current_user.organization_id,
            bank_name=payload.initial_bank_account.bank_name.strip(),
            account_number=payload.initial_bank_account.account_number.strip(),
            ifsc_swift_code=payload.initial_bank_account.ifsc_swift_code.strip(),
            account_holder_name=payload.initial_bank_account.account_holder_name.strip(),
            is_primary=True,
            is_verified=False,
            requires_manager_approval=True
        )
        db.add(bank)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="CREATE_VENDOR",
        resource_type="VENDOR",
        user=current_user,
        resource_id=vendor.id,
        new_values={"vendor_code": vendor.vendor_code, "name": vendor.name},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()

    stmt = select(Vendor).options(selectinload(Vendor.bank_accounts)).where(Vendor.id == vendor.id)
    return (await db.execute(stmt)).scalars().first()

@router.get("/{vendor_id}")
async def get_vendor_details(
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Vendor)
        .options(selectinload(Vendor.bank_accounts))
        .where(Vendor.id == vendor_id, Vendor.organization_id == current_user.organization_id)
    )
    vendor = (await db.execute(stmt)).scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Get recent transactions
    inv_stmt = (
        select(Invoice)
        .where(Invoice.organization_id == current_user.organization_id, Invoice.vendor_id == vendor.id)
        .order_by(Invoice.invoice_date.desc())
        .limit(10)
    )
    recent_invoices = (await db.execute(inv_stmt)).scalars().all()

    return {
        "id": vendor.id,
        "vendor_code": vendor.vendor_code,
        "name": vendor.name,
        "gstin": vendor.gstin,
        "tax_id": vendor.tax_id,
        "email": vendor.email,
        "phone": vendor.phone,
        "address": vendor.address,
        "risk_score": float(vendor.risk_score),
        "risk_level": vendor.risk_level,
        "is_verified": vendor.is_verified,
        "verified_at": vendor.verified_at.isoformat() if vendor.verified_at else None,
        "created_at": vendor.created_at.isoformat(),
        "bank_accounts": [
            {
                "id": b.id,
                "bank_name": b.bank_name,
                "account_number": b.account_number,
                "ifsc_swift_code": b.ifsc_swift_code,
                "account_holder_name": b.account_holder_name,
                "is_primary": b.is_primary,
                "is_verified": b.is_verified,
                "requires_manager_approval": b.requires_manager_approval,
                "verified_at": b.verified_at.isoformat() if b.verified_at else None
            } for b in vendor.bank_accounts
        ],
        "recent_invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat(),
                "total_amount": float(inv.total_amount),
                "status": inv.status,
                "risk_level": inv.risk_level
            } for inv in recent_invoices
        ]
    }

@router.post("/{vendor_id}/bank-accounts")
async def add_vendor_bank_account(
    vendor_id: str,
    payload: VendorBankAccountCreate,
    request: Request,
    current_user: User = Depends(require_finance_employee),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Vendor).where(Vendor.id == vendor_id, Vendor.organization_id == current_user.organization_id)
    vendor = (await db.execute(stmt)).scalars().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    bank = VendorBankAccount(
        vendor_id=vendor.id,
        organization_id=current_user.organization_id,
        bank_name=payload.bank_name.strip(),
        account_number=payload.account_number.strip(),
        ifsc_swift_code=payload.ifsc_swift_code.strip(),
        account_holder_name=payload.account_holder_name.strip(),
        is_primary=payload.is_primary,
        is_verified=False,
        requires_manager_approval=True
    )
    db.add(bank)

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="ADD_VENDOR_BANK_ACCOUNT",
        resource_type="VENDOR",
        user=current_user,
        resource_id=vendor.id,
        new_values={"account_number": bank.account_number, "bank_name": bank.bank_name},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "Bank account registered. Under mandatory Finance Manager verification hold."}

@router.post("/{vendor_id}/verify-bank/{bank_account_id}")
async def verify_vendor_bank_account(
    vendor_id: str,
    bank_account_id: str,
    request: Request,
    current_user: User = Depends(require_finance_manager),
    db: AsyncSession = Depends(get_db)
):
    """Authorized Finance Manager out-of-band verification protocol for vendor bank modifications."""
    stmt = select(VendorBankAccount).where(
        VendorBankAccount.id == bank_account_id,
        VendorBankAccount.vendor_id == vendor_id,
        VendorBankAccount.organization_id == current_user.organization_id
    )
    bank = (await db.execute(stmt)).scalars().first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank account not found")

    bank.is_verified = True
    bank.requires_manager_approval = False
    bank.verified_by_user_id = current_user.id
    bank.verified_at = datetime.now(timezone.utc)

    # Also verify vendor
    v_stmt = select(Vendor).where(Vendor.id == vendor_id)
    vendor = (await db.execute(v_stmt)).scalars().first()
    if vendor:
        vendor.is_verified = True
        vendor.verified_at = datetime.now(timezone.utc)
        vendor.verified_by_user_id = current_user.id

    await record_audit_log(
        db=db,
        organization_id=current_user.organization_id,
        action="VERIFY_VENDOR_BANK_ACCOUNT",
        resource_type="VENDOR_BANK_ACCOUNT",
        user=current_user,
        resource_id=bank.id,
        new_values={"verified_by": current_user.email, "status": "VERIFIED"},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    await db.commit()
    return {"success": True, "message": "Bank account verified and authorized for disbursements."}
