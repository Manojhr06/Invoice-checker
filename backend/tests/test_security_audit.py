import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in headers
    assert "Content-Security-Policy" in headers
    assert "X-Correlation-ID" in headers

@pytest.mark.asyncio
async def test_rate_limiting_on_login(client: AsyncClient):
    # Enforce rate limiter by disabling bypass header
    rate_limit_headers = {"X-Bypass-Rate-Limit": "false"}
    
    # Maximum 5 attempts allowed in 60s window
    for _ in range(5):
        resp = await client.post(
            "/api/auth/login",
            headers=rate_limit_headers,
            json={
                "email": "admin@acmeglobal.com",
                "password": "WrongPasswordAttempt"
            }
        )
        assert resp.status_code == 401

    # 6th attempt must trigger rate limiter HTTP 429
    resp_rate_limited = await client.post(
        "/api/auth/login",
        headers=rate_limit_headers,
        json={
            "email": "admin@acmeglobal.com",
            "password": "WrongPasswordAttempt"
        }
    )
    assert resp_rate_limited.status_code == 429
    data = resp_rate_limited.json()
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"

@pytest.mark.asyncio
async def test_single_use_password_reset_flow(client: AsyncClient):
    # Request reset token
    forgot_resp = await client.post("/api/auth/forgot-password", json={
        "email": "finance.manager@acmeglobal.com"
    })
    assert forgot_resp.status_code == 200
    token = forgot_resp.json().get("dev_reset_token")
    assert token is not None

    # Reset password successfully
    reset_resp = await client.post("/api/auth/reset-password", json={
        "reset_token": token,
        "new_password": "NewSecureManagerPassword@2026"
    })
    assert reset_resp.status_code == 200
    assert reset_resp.json()["success"] is True

    # Replay attack: try to use the same token a second time
    replay_resp = await client.post("/api/auth/reset-password", json={
        "reset_token": token,
        "new_password": "HackerNewPassword@2026"
    })
    # Must be 400 Bad Request
    assert replay_resp.status_code == 400

    # Verify login works with new password
    login_resp = await client.post("/api/auth/login", json={
        "email": "finance.manager@acmeglobal.com",
        "password": "NewSecureManagerPassword@2026"
    })
    assert login_resp.status_code == 200

@pytest.mark.asyncio
async def test_jwt_revocation_on_logout(client: AsyncClient):
    # Login
    login_resp = await client.post("/api/auth/login", json={
        "email": "admin@acmeglobal.com",
        "password": "FinGuard@123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Verify token works
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200

    # Logout
    logout_resp = await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_resp.status_code == 200

    # Try to reuse the token after logout
    me_after_logout = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after_logout.status_code == 401

@pytest.mark.asyncio
async def test_gdpr_data_anonymization_flow(client: AsyncClient):
    # Create employee account to test anonymization
    admin_login = await client.post("/api/auth/login", json={
        "email": "admin@acmeglobal.com",
        "password": "FinGuard@123"
    })
    admin_token = admin_login.json()["access_token"]

    create_user_resp = await client.post(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "privacy.test@acmeglobal.com",
            "password": "TemporaryPassword@123",
            "first_name": "John",
            "last_name": "Doe",
            "role_name": "FINANCE_EMPLOYEE",
            "department": "Operations"
        }
    )
    assert create_user_resp.status_code == 200

    # Login as this user
    user_login = await client.post("/api/auth/login", json={
        "email": "privacy.test@acmeglobal.com",
        "password": "TemporaryPassword@123"
    })
    user_token = user_login.json()["access_token"]

    # Trigger data anonymization
    anon_resp = await client.delete("/api/users/me/anonymize-data", headers={"Authorization": f"Bearer {user_token}"})
    assert anon_resp.status_code == 200

    # Attempting to log back in must fail
    relogin_resp = await client.post("/api/auth/login", json={
        "email": "privacy.test@acmeglobal.com",
        "password": "TemporaryPassword@123"
    })
    assert relogin_resp.status_code == 401
