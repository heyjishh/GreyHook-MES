import pytest
from fastapi import HTTPException

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_produces_argon2id():
    h = hash_password("mysecret")
    assert h.startswith("$argon2id$")


def test_hash_password_different_hashes_same_input():
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2


def test_verify_password_correct():
    h = hash_password("correct")
    assert verify_password("correct", h) is True


def test_verify_password_wrong():
    h = hash_password("correct")
    assert verify_password("wrong", h) is False


def test_verify_password_invalid_hash():
    assert verify_password("anything", "not-a-hash") is False


def test_verify_password_empty_plain():
    h = hash_password("nonempty")
    assert verify_password("", h) is False


def test_create_refresh_token_is_urlsafe_and_unique():
    t1 = create_refresh_token()
    t2 = create_refresh_token()
    assert t1 != t2
    assert len(t1) > 20


def test_create_and_decode_access_token():
    token = create_access_token("user-123", extra_claims={"org": "org-456", "role": "admin"})
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["org"] == "org-456"
    assert payload["type"] == "access"


def test_decode_access_token_invalid_raises_401():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("garbage.token.value")
    assert exc_info.value.status_code == 401


def test_decode_access_token_wrong_type_raises_401():
    import secrets
    from datetime import UTC, datetime, timedelta
    from jose import jwt
    from app.core.config import get_settings

    settings = get_settings()
    payload = {
        "sub": "user-999",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(minutes=5),
        "type": "refresh",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(token)
    assert exc_info.value.status_code == 401
