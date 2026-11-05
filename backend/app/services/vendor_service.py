from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.models.vendor import Vendor, VendorBankAccount

class VendorVerificationService:
    """
    Deterministic Vendor Compliance & Bank Account Fraud Guard.
    Identifies unregistered vendors, tax ID mismatches, and unauthorized bank modifications.
    """

    @staticmethod
    async def verify_vendor(
        db: AsyncSession,
        organization_id: str,
        vendor_id: Optional[str] = None,
        vendor_name: Optional[str] = None,
        gstin: Optional[str] = None,
        account_number: Optional[str] = None,
        ifsc_code: Optional[str] = None
    ) -> Dict[str, Any]:
        result = {
            "vendor_matched": False,
            "vendor_id": None,
            "vendor_name": vendor_name,
            "vendor_details_match_score": 0.0,
            "bank_details_matched": False,
            "bank_recently_changed": False,
            "gstin_verified": False,
            "risk_flags": []
        }

        # 1. Resolve Vendor
        vendor: Optional[Vendor] = None
        if vendor_id:
            stmt = select(Vendor).options(selectinload(Vendor.bank_accounts)).where(
                Vendor.id == vendor_id, Vendor.organization_id == organization_id
            )
            vendor = (await db.execute(stmt)).scalars().first()
        elif vendor_name:
            # Case-insensitive search
            stmt = select(Vendor).options(selectinload(Vendor.bank_accounts)).where(
                Vendor.organization_id == organization_id,
                Vendor.name.ilike(f"%{vendor_name.strip()}%")
            )
            vendor = (await db.execute(stmt)).scalars().first()

        if not vendor:
            result["risk_flags"].append("UNREGISTERED_VENDOR: Invoiced by entity not registered in vendor master ledger.")
            return result

        result["vendor_matched"] = True
        result["vendor_id"] = vendor.id
        result["vendor_name"] = vendor.name
        result["vendor_details_match_score"] = 100.0

        # 2. Tax ID / GSTIN Verification
        if gstin and vendor.gstin:
            if gstin.strip().upper() == vendor.gstin.strip().upper():
                result["gstin_verified"] = True
            else:
                result["risk_flags"].append(f"TAX_ID_MISMATCH: Invoiced GSTIN ({gstin}) does not match registered GSTIN ({vendor.gstin}).")
        else:
            result["gstin_verified"] = vendor.is_verified

        # 3. Bank Account Disbursement Verification
        if account_number:
            primary_account = next((b for b in vendor.bank_accounts if b.is_primary), None)
            matching_account = next((b for b in vendor.bank_accounts if b.account_number == account_number.strip()), None)

            if matching_account:
                result["bank_details_matched"] = True
                
                # Check if account details were changed recently (within 30 days)
                cutoff = datetime.now(timezone.utc) - timedelta(days=30)
                if matching_account.created_at and matching_account.created_at > cutoff:
                    result["bank_recently_changed"] = True
                    result["risk_flags"].append("RECENT_BANK_CHANGE: Bank disbursement account was registered or altered within the last 30 days. Mandatory manager verification required.")
                
                if matching_account.requires_manager_approval and not matching_account.is_verified:
                    result["bank_recently_changed"] = True
                    result["risk_flags"].append("UNVERIFIED_BANK_ACCOUNT: Bank details pending formal finance manager sign-off.")
            else:
                result["bank_details_matched"] = False
                result["risk_flags"].append(f"UNAUTHORIZED_BANK_ACCOUNT: Invoice disbursement target ({account_number}) is not in approved vendor bank registry.")
        else:
            # If no bank account found on invoice, default to vendor master
            result["bank_details_matched"] = True

        return result
