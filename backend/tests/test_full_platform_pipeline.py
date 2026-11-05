import io
import pytest
from httpx import AsyncClient
from decimal import Decimal

@pytest.mark.asyncio
async def test_vendor_and_po_flow(client: AsyncClient):
    # 1. Login as Finance Manager
    login_resp = await client.post("/api/auth/login", json={
        "email": "finance.manager@acmeglobal.com",
        "password": "FinGuard@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. List Vendors
    v_resp = await client.get("/api/vendors", headers=headers)
    assert v_resp.status_code == 200
    vendors = v_resp.json()
    assert len(vendors) >= 1
    apex_vendor = next(v for v in vendors if "Apex" in v["name"])

    # 3. Create Purchase Order
    po_resp = await client.post(
        "/api/purchase-orders",
        headers=headers,
        json={
            "vendor_id": apex_vendor["id"],
            "po_number": "PO-TEST-2026-999",
            "issue_date": "2026-10-15",
            "total_amount": 50000.00,
            "notes": "Testing Cloud Cluster Contract",
            "items": [
                {
                    "item_description": "Dedicated Cloud Cluster Servers",
                    "quantity": 2.0,
                    "unit_price": 20000.0,
                    "tax_amount": 2000.0,
                    "total_price": 42000.0
                }
            ]
        }
    )
    assert po_resp.status_code == 200
    po_data = po_resp.json()
    assert po_data["po_number"] == "PO-TEST-2026-999"

@pytest.mark.asyncio
async def test_invoice_upload_ocr_verify_and_ml_detection(client: AsyncClient):
    login_resp = await client.post("/api/auth/login", json={
        "email": "finance.employee@acmeglobal.com",
        "password": "FinGuard@123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create dummy PDF in memory
    from reportlab.pdfgen import canvas
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer)
    c.drawString(100, 750, "TAX INVOICE")
    c.drawString(100, 730, "Apex Cloud Systems Inc")
    c.drawString(100, 710, "Invoice Number: INV-APEX-2026-888")
    c.drawString(100, 690, "Invoice Date: 2026-10-20")
    c.drawString(100, 670, "PO Number: PO-2026-APEX-001")
    c.drawString(100, 650, "Total Amount: $12,500.00")
    c.drawString(100, 630, "Tax: $1,500.00")
    c.drawString(100, 610, "Account: 987654321098")
    c.save()
    pdf_bytes = pdf_buffer.getvalue()

    # Upload PDF
    upload_resp = await client.post(
        "/api/invoices/upload",
        headers=headers,
        files={"file": ("invoice_apex_test.pdf", pdf_bytes, "application/pdf")}
    )
    assert upload_resp.status_code == 200
    up_data = upload_resp.json()
    assert up_data["success"] is True
    invoice_id = up_data["invoice_id"]

    # Verify and run dual-engine ML fraud detection
    verify_resp = await client.post(f"/api/invoices/{invoice_id}/verify", headers=headers)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert "composite_risk_score" in v_data
    assert "supervised_fraud_probability" in v_data
    assert "isolation_forest_anomaly_score" in v_data
    assert "explanation" in v_data
    assert v_data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    # Check Invoice Detail endpoint
    detail_resp = await client.get(f"/api/invoices/{invoice_id}", headers=headers)
    assert detail_resp.status_code == 200
    det = detail_resp.json()
    assert det["invoice_number"] is not None
    assert det["verification"] is not None
    assert det["fraud_prediction"] is not None

@pytest.mark.asyncio
async def test_approval_workflow_and_analytics(client: AsyncClient):
    # 1. Login as Finance Manager
    mgr_login = await client.post("/api/auth/login", json={
        "email": "finance.manager@acmeglobal.com",
        "password": "FinGuard@123"
    })
    token = mgr_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get pending approvals
    pending_resp = await client.get("/api/approvals/pending", headers=headers)
    assert pending_resp.status_code == 200

    # 3. Analytics Dashboard Summary
    dash_resp = await client.get("/api/analytics/dashboard-summary", headers=headers)
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert "total_invoices_processed" in stats
    assert "total_invoice_value" in stats
    assert "exposure_under_investigation" in stats

    # 4. AI Financial Assistant RAG query
    chat_resp = await client.post(
        "/api/assistant/chat",
        headers=headers,
        json={"query": "What is the policy for vendor bank account changes?"}
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "answer" in chat_data
    assert len(chat_data["cited_policies"]) >= 1

    # 5. Audit Log query
    auditor_login = await client.post("/api/auth/login", json={
        "email": "auditor@acmeglobal.com",
        "password": "FinGuard@123"
    })
    aud_token = auditor_login.json()["access_token"]
    audit_resp = await client.get("/api/audit", headers={"Authorization": f"Bearer {aud_token}"})
    assert audit_resp.status_code == 200
    assert len(audit_resp.json()) >= 1
