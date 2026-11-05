# FinGuard AI: Intelligent Invoice Fraud Detection & Financial Risk Prevention Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite%20+%20Tailwind-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Security Audited](https://img.shields.io/badge/Security-OWASP%20Hardened-brightgreen.svg)]()

FinGuard AI is an enterprise-grade financial fraud prevention and risk intelligence platform designed to intercept fraudulent, duplicate, inflated, and non-compliant vendor invoices *before* disbursements are executed.

---

> [!WARNING]
> ### CRITICAL SECURITY NOTICE — CREDENTIAL ROTATION MANDATE
> If any secret, token, private key, or password was ever hardcoded or utilized in pre-deployment development environments, **rotate that credential immediately**. Do not reuse development keys in production. 
> FinGuard AI strictly enforces that all production environments load credentials dynamically via environment variables or cloud secret managers (AWS Secrets Manager, HashiCorp Vault). The application automatically refuses to start in production if `SECRET_KEY` uses a development placeholder or is under 32 characters.

---

## 1. System Capabilities & Core Modules

1. **Multi-Tenant Organization Isolation**: Complete data and operational separation across corporate entities. One organization can never view or query another organization's invoices, vendors, or audit logs.
2. **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN`, `FINANCE_MANAGER`, `FINANCE_EMPLOYEE`, and `AUDITOR`.
3. **Automated Ingestion & OCR Review**: Multi-format ingestion (PDF, PNG, JPG, JPEG) up to 15MB with PyMuPDF OCR extraction and human-in-the-loop verification.
4. **Deterministic Compliance Rules**: Immediate detection of vendor mismatches, unauthorized bank account modifications, tax ID (GSTIN/EIN) discrepancies, and duplicate invoice SHA-256 digests.
5. **Purchase Order 3-Way Reconciliation**: Strict tolerance checks matching unit prices, line item quantities, and authorized PO contract ceilings.
6. **Dual Machine Learning Ensemble**:
   - **XGBoost Classifier**: Supervised classification predicting fraud probability based on historical deviations, vendor frequency spikes, and transaction anomalies.
   - **Isolation Forest**: Unsupervised outlier detection isolating multi-dimensional spending anomalies without requiring prior fraud tags.
   - **Calibrated Composite Risk Scoring**: Clean 0–100 scale classifying transactions into `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL` risk tiers.
7. **Explainable AI (XAI)**: Feature-level SHAP attributions with governed natural language rationale synthesis.
8. **Human Approval Workflow & Self-Learning Feedback Loop**: Enforced manual review gates for elevated risk tiers, recording verified human ground truth into versioned datasets for governed retraining.
9. **Real-Time Financial Intelligence**: Departmental risk exposure graphs, spend distributions, and an immutable forensic audit log.
10. **Conversational AI Financial Assistant**: Permission-aware RAG assistant answering policy and transaction questions without cross-tenant leakage.

---

## 2. Security Architecture & Privacy Safeguards

- **Strict Environment Separation**: All secrets, database URLs, and signing keys are read exclusively from environment variables (`.env`).
- **Cryptographic Password Hashing**: Passwords are encrypted using salted `bcrypt` hashes with 72-byte buffer-overflow truncation protection.
- **Enterprise Defense Headers**: Every HTTP response automatically includes:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `Content-Security-Policy: default-src 'self' ...`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Rate Limiting & Anti-Brute-Force**: Maximum 5 login attempts per minute per IP; maximum 3 password reset requests per hour.
- **Single-Use 15-Minute Password Reset**: Reset tokens are cryptographically signed, strictly time-limited to 15 minutes, and consumed immediately upon use to prevent replay attacks.
- **Session Invalidation on Logout**: Bearer tokens are instantly revoked upon calling `/api/auth/logout`.
- **GDPR / Privacy Compliance Flow**: Supports personal data anonymization (`DELETE /api/users/me/anonymize-data`) redacting personal identifying attributes while preserving immutable financial audit integrity.
- **Zero Information Leakage**: 500 internal errors generate a unique `X-Correlation-ID` and return a generic error message; detailed stack traces and SQL queries are logged only to secure server-side logs.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Axios, React Router.
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy (Async), Pydantic v2, Uvicorn.
- **Database**: PostgreSQL (production), SQLite / aiosqlite (zero-dependency development/test fallback).
- **Machine Learning**: Scikit-Learn, XGBoost, SHAP, Pandas, NumPy.
- **Document Processing**: PyMuPDF (`fitz`), ReportLab.

---

## 4. How to Run FinGuard AI

You can run FinGuard AI either using **Docker Compose** (recommended for production/containers) or **locally via PowerShell / Terminal**.

### Option A: One-Command Docker Compose (Full Stack)
```bash
# Build and run Postgres, Backend, and Frontend in unified isolated network
docker-compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API Docs (Swagger): `http://localhost:8000/docs`
- Healthcheck: `http://localhost:8000/api/health`

---

### Option B: Local Development Setup

#### Step 1: Clone Repository
```bash
git clone https://github.com/Manojhr06/Invoice-checker.git
cd Invoice-checker
```

#### Step 2: Configure Environment
Copy the pre-configured `.env.example` to `.env`:
```powershell
# On Windows PowerShell:
Copy-Item .env.example .env

# On Linux / macOS:
cp .env.example .env
```

#### Step 3: Run Backend (FastAPI + ML Engine)
```powershell
# On Windows:
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend/requirements.txt

# Start backend server (auto-seeds Acme Global & demo accounts on boot)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
```bash
# On Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Start backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 4: Run Frontend (React + Vite)
In a separate terminal window:
```powershell
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

### Step 5: Run Automated Security & Platform Test Suite
To execute the comprehensive 14-test test suite:
```powershell
# On Windows (PowerShell):
$env:PYTHONPATH="."
.\.venv\Scripts\pytest backend/tests/ -v

# On Linux / macOS:
PYTHONPATH=. pytest backend/tests/ -v
```

---

## 5. Seed Test Credentials

Upon startup, the database automatically provisions the default organization **Acme Global Financial Corp** with 4 evaluation accounts across all functional roles:

| Role | Email | Password | Primary Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@acmeglobal.com` | `FinGuard@123` | User provisioning, company risk policy, system configuration |
| **FINANCE_MANAGER** | `finance.manager@acmeglobal.com` | `FinGuard@123` | Invoice review, approvals/rejections, fraud investigations |
| **FINANCE_EMPLOYEE** | `finance.employee@acmeglobal.com` | `FinGuard@123` | Invoice upload, OCR correction, verification submission |
| **AUDITOR** | `auditor@acmeglobal.com` | `FinGuard@123` | Read-only forensic audits, immutable audit trails, analytics |

> **Tip**: On the login page, you can use the **1-Click Quick Demo Account Switcher** cards to instantly pre-fill and log in under any of the 4 roles.

---

## 6. Project Architecture & Design Documentation

For deep technical details, refer to the documentation suite in `/docs`:
- [Architecture & Flowcharts](docs/PROJECT_ARCHITECTURE.md)
- [Database Schema & 20 Entities](docs/DATABASE_DESIGN.md)
- [REST API Specifications](docs/API_DESIGN.md)
- [ML Pipeline & XAI Architecture](docs/ML_ARCHITECTURE.md)
- [Phased Engineering Roadmap](docs/IMPLEMENTATION_ROADMAP.md)

---

## 7. License
Proprietary Enterprise Software. All rights reserved.
