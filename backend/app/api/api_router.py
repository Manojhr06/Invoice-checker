from fastapi import APIRouter
from backend.app.api.endpoints import (
    auth,
    organizations,
    users,
    invoices,
    vendors,
    purchase_orders,
    fraud,
    approvals,
    analytics,
    assistant,
    audit,
    notifications,
    ml
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders"])
api_router.include_router(fraud.router, prefix="/fraud", tags=["Fraud Detection & Alerts"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Human Approvals"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Financial Analytics"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["AI Financial Assistant"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(ml.router, prefix="/ml", tags=["Machine Learning Pipeline"])
