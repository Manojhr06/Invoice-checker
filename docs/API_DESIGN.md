# FinGuard AI: REST API Architecture & Endpoint Specification

## 1. API Standards & Architectural Conventions
- **Protocol**: HTTP/1.1 and HTTP/2 over TLS.
- **Data Exchange**: JSON payload standard (`application/json`) and multipart upload (`multipart/form-data`) for files.
- **Authentication**: Bearer JWT tokens (`Authorization: Bearer <token>`) passed with all private endpoints.
- **Multi-Tenant Context**: Inferred strictly from validated JWT claims (`sub` = user_id, `org_id` = organization_id, `role` = user_role).
- **Standardized Response Envelope**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```
- **Error Format**:
```json
{
  "success": false,
  "error": {
    "code": "VENDOR_NOT_FOUND",
    "message": "The referenced vendor does not exist within the organization tenant",
    "details": {}
  }
}
```

---

## 2. API Endpoint Catalog

### 2.1 Authentication & Organization Management (`/api/auth`, `/api/organizations`)
- `POST /api/auth/register-company`: Register new tenant organization and primary `ADMIN` user.
- `POST /api/auth/login`: Authenticate email/password; returns JWT access and refresh tokens.
- `POST /api/auth/refresh`: Issue new access token using valid refresh token.
- `GET /api/auth/me`: Retrieve current user profile, organization details, and permissions.
- `POST /api/auth/forgot-password`: Request password reset token.
- `POST /api/auth/reset-password`: Apply new password using reset token.
- `GET /api/organizations/current`: Fetch organization profile, currency, and risk policy settings.
- `PUT /api/organizations/current`: Update risk tolerance thresholds and business rules (`ADMIN` only).

### 2.2 User Management (`/api/users`)
- `GET /api/users`: List users belonging to current tenant (supports role and search filters).
- `POST /api/users`: Invite or provision new user with role assignment (`ADMIN` only).
- `PUT /api/users/{id}`: Modify user role, department, or active status.
- `DELETE /api/users/{id}`: Deactivate user account.

### 2.3 Vendor Management & Verification (`/api/vendors`)
- `GET /api/vendors`: Paginated vendor list with risk ratings, GSTIN status, and search.
- `POST /api/vendors`: Register new vendor profile with initial bank details.
- `GET /api/vendors/{id}`: Vendor detailed profile, transaction history, and risk breakdown.
- `PUT /api/vendors/{id}`: Update vendor contact and compliance attributes.
- `POST /api/vendors/{id}/bank-accounts`: Add or update bank disbursement details.
- `POST /api/vendors/{id}/verify-bank`: Finance Manager verification endpoint for newly updated bank details.

### 2.4 Invoice Management & Ingestion (`/api/invoices`)
- `POST /api/invoices/upload`: Upload invoice document (`.pdf`, `.png`, `.jpg`, `.jpeg`).
- `POST /api/invoices/{id}/ocr`: Execute or re-run OCR extraction on uploaded document.
- `GET /api/invoices/{id}/ocr-data`: Fetch raw and structured OCR extracted fields.
- `PUT /api/invoices/{id}/correct-ocr`: Employee correction of OCR fields before verification submission.
- `GET /api/invoices`: Paginated invoice ledger with status, risk level, and date filters.
- `GET /api/invoices/{id}`: Full invoice details, line items, document preview URL, and verification reports.
- `POST /api/invoices/{id}/submit`: Submit corrected invoice into automated verification pipeline.

### 2.5 Verification & Fraud Detection (`/api/invoices/verify`, `/api/fraud`)
- `POST /api/invoices/{id}/verify`: Run deterministic rule suite (vendor match, bank check, PO match, duplicate search).
- `POST /api/fraud/detect/{id}`: Trigger ML inference (XGBoost probability, Isolation Forest score, SHAP explanation).
- `GET /api/fraud/alerts`: Query actionable fraud alerts filtered by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and investigation status.
- `GET /api/fraud/alerts/{id}`: Alert deep-dive including contributing features, duplicate comparisons, and audit markers.
- `PUT /api/fraud/investigations/{id}`: Update case status (`UNDER_INVESTIGATION`, `CONFIRMED_FRAUD`, `LEGITIMATE`, `ESCALATED`, `RESOLVED`) and assign investigator.

### 2.6 Purchase Order Management (`/api/purchase-orders`)
- `GET /api/purchase-orders`: Retrieve organization purchase orders and utilization levels.
- `POST /api/purchase-orders`: Create or import new authorized Purchase Order with line items.
- `GET /api/purchase-orders/{id}`: Purchase order item breakdown and matching invoices.
- `GET /api/purchase-orders/match/{invoice_id}`: Execute automated 3-way reconciliation against invoice.

### 2.7 Approval Workflows (`/api/approvals`)
- `GET /api/approvals/pending`: Filter invoices requiring current user review based on role and approval thresholds.
- `POST /api/approvals/{invoice_id}/action`: Approve, reject, or request changes with mandatory reason comments.
- `GET /api/approvals/{invoice_id}/history`: Full timeline of workflow progression and human decision notes.

### 2.8 Analytics & Reporting (`/api/analytics`)
- `GET /api/analytics/dashboard-summary`: Executive metrics (total invoices, fraud prevented value, pending reviews, duplicate count).
- `GET /api/analytics/monthly-trends`: Time-series data of volume, approved totals, and flagged fraud attempts.
- `GET /api/analytics/vendor-risk-distribution`: Aggregated distribution of vendors across risk tiers.
- `GET /api/analytics/department-exposure`: Financial exposure broken down by corporate department.
- `GET /api/analytics/export`: Stream compliance reports in CSV, PDF, or Excel format.

### 2.9 AI Financial Assistant & Policies (`/api/assistant`, `/api/policies`)
- `POST /api/assistant/chat`: Permission-aware conversational query answering. Retrieves tenant policies and invoices via context injection without cross-tenant leakage.
- `GET /api/policies`: View organization spending policies and threshold definitions.
- `POST /api/policies`: Register or update policy documentation (`ADMIN`).

### 2.10 ML Model Operations & Human-in-the-Loop Feedback (`/api/ml`)
- `GET /api/ml/models`: View registered model versions, accuracy, F1, ROC-AUC metrics.
- `POST /api/ml/feedback`: Record reviewer verification label (`CONFIRMED_FRAUD`, `LEGITIMATE`) for retraining.
- `GET /api/ml/feedback/dataset`: View curated, verified training dataset queue.
- `POST /api/ml/retrain`: Trigger governed pipeline retraining on verified feedback data (`ADMIN`).

### 2.11 Audit & Notifications (`/api/audit`, `/api/notifications`)
- `GET /api/audit`: Immutable audit log query with date range, user filter, and action type.
- `GET /api/notifications`: Retrieve current user notifications and alert counts.
- `PUT /api/notifications/{id}/read`: Mark notification as read.
