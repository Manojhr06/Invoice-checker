from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.security import get_password_hash
from backend.app.models.organization import Organization, CompanyPolicy
from backend.app.models.user import Role, User
from backend.app.models.vendor import Vendor, VendorBankAccount
from backend.app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from backend.app.models.fraud import ModelVersion

ROLES_DATA = [
    {
        "name": "ADMIN",
        "description": "Full administrative governance over organization, users, permissions, and ML configuration.",
        "permissions": ["all"]
    },
    {
        "name": "FINANCE_MANAGER",
        "description": "Reviews invoices, approves/rejects disbursements, investigates fraud alerts, and inspects vendors.",
        "permissions": ["invoices:read", "invoices:approve", "invoices:reject", "alerts:investigate", "vendors:verify"]
    },
    {
        "name": "FINANCE_EMPLOYEE",
        "description": "Uploads invoices, checks OCR accuracy, corrects line items, and tracks processing stages.",
        "permissions": ["invoices:upload", "invoices:read", "invoices:edit_ocr", "invoices:submit"]
    },
    {
        "name": "AUDITOR",
        "description": "Read-only oversight across all transactions, immutable audit trails, and risk metrics.",
        "permissions": ["invoices:read", "alerts:read", "audit:read", "analytics:read"]
    }
]

POLICIES_DATA = [
    {
        "policy_title": "Vendor Bank Account Modification Verification Protocol",
        "category": "VENDOR_ONBOARDING",
        "policy_content": (
            "Any modification to a vendor's bank disbursement details (account number, IFSC/SWIFT, or routing code) "
            "requires mandatory dual-channel verification by an authorized Finance Manager before invoice release. "
            "A verbal phone confirmation with the vendor's registered CFO or finance department head must be performed "
            "and documented in the audit trail. Invoices referencing changed bank details within 30 days are automatically placed on forensic hold."
        )
    },
    {
        "policy_title": "Purchase Order 3-Way Matching and Tolerance Thresholds",
        "category": "DISBURSEMENT_LIMITS",
        "policy_content": (
            "All invoices exceeding $2,500.00 USD must map to an active Purchase Order. Line item unit prices must match the PO contract "
            "within a strict 2.0% variance tolerance. Invoices exceeding the authorized PO total balance require an escalated budget amendment "
            "signed by the Department Vice President."
        )
    },
    {
        "policy_title": "Duplicate Invoice Detection & Hash Collision Standards",
        "category": "FRAUD_ESCALATION",
        "policy_content": (
            "Any invoice submitted with an identical SHA-256 document hash, or matching invoice number from the same vendor within 365 days, "
            "is automatically flagged as CRITICAL risk and blocked from payment scheduling. Invoices with similar amounts within 7 days undergo "
            "mandatory fuzzy reconciliation."
        )
    },
    {
        "policy_title": "Tax Identification (GSTIN/TIN) Validation Requirement",
        "category": "TAX_COMPLIANCE",
        "policy_content": (
            "Every vendor invoice must display a valid, verifiable Tax Identification Number (GSTIN, EIN, or VAT). Invoices where the OCR extracted "
            "tax identifier fails algorithmic check-digit validation or mismatches the vendor master database must be placed under investigation."
        )
    }
]

async def seed_initial_data(db: AsyncSession):
    # 1. Seed Roles
    roles_map = {}
    for r_data in ROLES_DATA:
        stmt = select(Role).where(Role.name == r_data["name"])
        existing_role = (await db.execute(stmt)).scalars().first()
        if not existing_role:
            role = Role(
                name=r_data["name"],
                description=r_data["description"],
                permissions=r_data["permissions"]
            )
            db.add(role)
            await db.flush()
            roles_map[r_data["name"]] = role
        else:
            roles_map[r_data["name"]] = existing_role

    # 2. Seed Default Organization
    org_stmt = select(Organization).where(Organization.slug == "acme-global")
    org = (await db.execute(org_stmt)).scalars().first()
    if not org:
        org = Organization(
            name="Acme Global Financial Corp",
            slug="acme-global",
            currency="USD",
            country="United States",
            is_active=True,
            risk_tolerance_threshold=Decimal("60.00")
        )
        db.add(org)
        await db.flush()

    # 3. Seed Users for each role
    demo_users = [
        {
            "email": "admin@acmeglobal.com",
            "first_name": "Sarah",
            "last_name": "Jenkins",
            "role_name": "ADMIN",
            "department": "Corporate Governance"
        },
        {
            "email": "finance.manager@acmeglobal.com",
            "first_name": "Marcus",
            "last_name": "Vance",
            "role_name": "FINANCE_MANAGER",
            "department": "Accounts Payable"
        },
        {
            "email": "finance.employee@acmeglobal.com",
            "first_name": "Elena",
            "last_name": "Rostova",
            "role_name": "FINANCE_EMPLOYEE",
            "department": "Disbursement Processing"
        },
        {
            "email": "auditor@acmeglobal.com",
            "first_name": "David",
            "last_name": "Sterling",
            "role_name": "AUDITOR",
            "department": "Internal Audit & Risk"
        }
    ]

    for u_info in demo_users:
        u_stmt = select(User).where(User.organization_id == org.id, User.email == u_info["email"])
        existing_u = (await db.execute(u_stmt)).scalars().first()
        if not existing_u:
            new_u = User(
                organization_id=org.id,
                role_id=roles_map[u_info["role_name"]].id,
                email=u_info["email"],
                hashed_password=get_password_hash("FinGuard@123"),
                first_name=u_info["first_name"],
                last_name=u_info["last_name"],
                department=u_info["department"],
                is_active=True
            )
            db.add(new_u)

    # 4. Seed Company Policies
    for p_info in POLICIES_DATA:
        p_stmt = select(CompanyPolicy).where(
            CompanyPolicy.organization_id == org.id,
            CompanyPolicy.policy_title == p_info["policy_title"]
        )
        existing_p = (await db.execute(p_stmt)).scalars().first()
        if not existing_p:
            new_policy = CompanyPolicy(
                organization_id=org.id,
                policy_title=p_info["policy_title"],
                category=p_info["category"],
                policy_content=p_info["policy_content"],
                is_active=True
            )
            db.add(new_policy)

    # 5. Seed Core Vendors
    sample_vendors = [
        {
            "vendor_code": "VND-APEX-01",
            "name": "Apex Cloud Systems Inc",
            "gstin": "29ABCDE1234F1Z5",
            "tax_id": "US-EIN-98-7654321",
            "email": "billing@apexcloud.io",
            "phone": "+1-555-019-2831",
            "address": "400 Silicon Way, Suite 100, San Jose, CA 95110",
            "risk_score": Decimal("12.50"),
            "risk_level": "LOW",
            "is_verified": True,
            "bank_account": {
                "bank_name": "JPMorgan Chase Bank, N.A.",
                "account_number": "987654321098",
                "ifsc_swift_code": "CHASUS33",
                "account_holder_name": "Apex Cloud Systems Inc"
            }
        },
        {
            "vendor_code": "VND-ZENITH-02",
            "name": "Zenith Industrial Supplies Ltd",
            "gstin": "27AAACZ1122D1ZP",
            "tax_id": "US-EIN-54-3210987",
            "email": "accounts@zenith-ind.com",
            "phone": "+1-555-044-8899",
            "address": "1200 Manufacturing Blvd, Detroit, MI 48202",
            "risk_score": Decimal("18.00"),
            "risk_level": "LOW",
            "is_verified": True,
            "bank_account": {
                "bank_name": "Bank of America",
                "account_number": "432109876543",
                "ifsc_swift_code": "BOFAUS3N",
                "account_holder_name": "Zenith Industrial Supplies Ltd"
            }
        },
        {
            "vendor_code": "VND-VERTEX-03",
            "name": "Vertex Global Logistics Co",
            "gstin": "06AABCV5544B1ZM",
            "tax_id": "US-EIN-33-2211445",
            "email": "invoices@vertexlogistics.com",
            "phone": "+1-555-077-3322",
            "address": "850 Harbor View Road, Long Beach, CA 90802",
            "risk_score": Decimal("22.00"),
            "risk_level": "LOW",
            "is_verified": True,
            "bank_account": {
                "bank_name": "Wells Fargo Bank",
                "account_number": "556677889900",
                "ifsc_swift_code": "WFBIUS6S",
                "account_holder_name": "Vertex Global Logistics Co"
            }
        }
    ]

    for v_info in sample_vendors:
        v_stmt = select(Vendor).where(Vendor.organization_id == org.id, Vendor.vendor_code == v_info["vendor_code"])
        existing_v = (await db.execute(v_stmt)).scalars().first()
        if not existing_v:
            v_obj = Vendor(
                organization_id=org.id,
                vendor_code=v_info["vendor_code"],
                name=v_info["name"],
                gstin=v_info["gstin"],
                tax_id=v_info["tax_id"],
                email=v_info["email"],
                phone=v_info["phone"],
                address=v_info["address"],
                risk_score=v_info["risk_score"],
                risk_level=v_info["risk_level"],
                is_verified=v_info["is_verified"],
                verified_at=datetime.now(timezone.utc)
            )
            db.add(v_obj)
            await db.flush()

            # Add bank account
            b_info = v_info["bank_account"]
            b_obj = VendorBankAccount(
                vendor_id=v_obj.id,
                organization_id=org.id,
                bank_name=b_info["bank_name"],
                account_number=b_info["account_number"],
                ifsc_swift_code=b_info["ifsc_swift_code"],
                account_holder_name=b_info["account_holder_name"],
                is_primary=True,
                is_verified=True,
                verified_at=datetime.now(timezone.utc)
            )
            db.add(b_obj)

            # Add sample Purchase Order for Apex Cloud
            if v_info["vendor_code"] == "VND-APEX-01":
                po_obj = PurchaseOrder(
                    organization_id=org.id,
                    vendor_id=v_obj.id,
                    po_number="PO-2026-APEX-001",
                    issue_date=date(2026, 10, 1),
                    expected_delivery_date=date(2026, 11, 30),
                    total_amount=Decimal("45000.00"),
                    utilized_amount=Decimal("12500.00"),
                    status="ACTIVE",
                    notes="Enterprise Cloud Hosting and Security Infrastructure Contract FY26"
                )
                db.add(po_obj)
                await db.flush()

                po_item1 = PurchaseOrderItem(
                    purchase_order_id=po_obj.id,
                    item_description="Enterprise Dedicated Cloud Clusters - Tier 3",
                    quantity=Decimal("3.00"),
                    unit_price=Decimal("10000.00"),
                    tax_amount=Decimal("1500.00"),
                    total_price=Decimal("31500.00")
                )
                po_item2 = PurchaseOrderItem(
                    purchase_order_id=po_obj.id,
                    item_description="24/7 Managed SRE Monitoring & Support",
                    quantity=Decimal("3.00"),
                    unit_price=Decimal("4000.00"),
                    tax_amount=Decimal("500.00"),
                    total_price=Decimal("12500.00")
                )
                db.add_all([po_item1, po_item2])

    # 6. Seed Baseline Active Model Version
    mv_stmt = select(ModelVersion).where(ModelVersion.version_tag == "finguard-xgb-v1.0")
    existing_mv = (await db.execute(mv_stmt)).scalars().first()
    if not existing_mv:
        base_mv = ModelVersion(
            model_name="FinGuard Hybrid Fraud & Anomaly Ensemble",
            algorithm="XGBoost + Isolation Forest + SHAP",
            version_tag="finguard-xgb-v1.0",
            artifact_path="ml-engine/artifacts/finguard_ensemble_v1.pkl",
            training_sample_count=1200,
            evaluation_metrics={
                "accuracy": 0.984,
                "precision": 0.962,
                "recall": 0.941,
                "f1_score": 0.951,
                "roc_auc": 0.991,
                "pr_auc": 0.978
            },
            is_active=True
        )
        db.add(base_mv)

    await db.commit()
