import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "FinGuard AI"

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "email": "admin@acmeglobal.com",
        "password": "FinGuard@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["email"] == "admin@acmeglobal.com"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    response = await client.post("/api/auth/login", json={
        "email": "admin@acmeglobal.com",
        "password": "WrongPassword123"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_all_four_roles_can_login(client: AsyncClient):
    roles_credentials = [
        ("admin@acmeglobal.com", "ADMIN"),
        ("finance.manager@acmeglobal.com", "FINANCE_MANAGER"),
        ("finance.employee@acmeglobal.com", "FINANCE_EMPLOYEE"),
        ("auditor@acmeglobal.com", "AUDITOR")
    ]
    for email, expected_role in roles_credentials:
        resp = await client.post("/api/auth/login", json={
            "email": email,
            "password": "FinGuard@123"
        })
        assert resp.status_code == 200, f"Failed login for {email}"
        data = resp.json()
        assert data["user"]["role"] == expected_role

@pytest.mark.asyncio
async def test_tenant_isolation_and_registration(client: AsyncClient):
    # Register Tenant B
    reg_resp = await client.post("/api/auth/register-company", json={
        "company_name": "Beta Financial Holdings",
        "currency": "EUR",
        "country": "Germany",
        "admin_first_name": "Hans",
        "admin_last_name": "Gruber",
        "admin_email": "admin@betaholdings.de",
        "admin_password": "BetaHoldingsSecure@2026"
    })
    assert reg_resp.status_code == 200
    beta_token = reg_resp.json()["access_token"]
    beta_org_id = reg_resp.json()["user"]["organization_id"]

    # Login to Acme (Tenant A)
    acme_login = await client.post("/api/auth/login", json={
        "email": "admin@acmeglobal.com",
        "password": "FinGuard@123"
    })
    acme_token = acme_login.json()["access_token"]
    acme_org_id = acme_login.json()["user"]["organization_id"]

    assert beta_org_id != acme_org_id, "Organizations must have separate IDs"

    # Acme admin queries users; should only see Acme users
    acme_users_resp = await client.get("/api/users", headers={"Authorization": f"Bearer {acme_token}"})
    assert acme_users_resp.status_code == 200
    acme_emails = [u["email"] for u in acme_users_resp.json()]
    assert "admin@acmeglobal.com" in acme_emails
    assert "admin@betaholdings.de" not in acme_emails

    # Beta admin queries users; should only see Beta users
    beta_users_resp = await client.get("/api/users", headers={"Authorization": f"Bearer {beta_token}"})
    assert beta_users_resp.status_code == 200
    beta_emails = [u["email"] for u in beta_users_resp.json()]
    assert "admin@betaholdings.de" in beta_emails
    assert "admin@acmeglobal.com" not in beta_emails

@pytest.mark.asyncio
async def test_role_based_access_control(client: AsyncClient):
    # Login as FINANCE_EMPLOYEE
    emp_login = await client.post("/api/auth/login", json={
        "email": "finance.employee@acmeglobal.com",
        "password": "FinGuard@123"
    })
    emp_token = emp_login.json()["access_token"]

    # Attempt to access admin-only endpoint: POST /api/users
    create_user_resp = await client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {emp_token}"},
        json={
            "email": "intruder@acmeglobal.com",
            "password": "Password@123",
            "first_name": "Intruder",
            "last_name": "User",
            "role_name": "ADMIN"
        }
    )
    # Must be 403 Forbidden
    assert create_user_resp.status_code == 403
