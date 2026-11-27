"""Security helpers: key checks, call tokens, phone encryption, webhook signatures, masking."""
import base64
import hashlib
import hmac
import secrets
import time

from cryptography.fernet import Fernet, InvalidToken
from fastapi import Header, HTTPException, Request

# ---------- shared-secret checks (constant-time) ----------

def _same(a: str, b: str) -> bool:
    return bool(a) and bool(b) and hmac.compare_digest(a.encode(), b.encode())


def require_tool_key(request: Request, x_aoun_key: str = Header(default="")) -> None:
    """Every tool call from ElevenLabs must carry the shared tool key."""
    if not _same(x_aoun_key, request.app.state.settings.tool_key):
        raise HTTPException(status_code=401, detail="unauthorized")


def require_admin_key(request: Request, x_admin_key: str = Header(default="")) -> None:
    """Staff/admin routes use a different key from the tools."""
    if not _same(x_admin_key, request.app.state.settings.admin_key):
        raise HTTPException(status_code=401, detail="unauthorized")


# ---------- call tokens ----------
# The plain token exists only inside the ElevenLabs conversation (as a dynamic variable).
# The database stores only its SHA-256 hash, so a database leak cannot be used to act on a call.

def new_call_token() -> str:
    return "ct_" + secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def secrets_token() -> str:
    return secrets.token_urlsafe(24)


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_hex(6)}"


# ---------- phone numbers: encrypted at rest, masked everywhere else ----------

class PhoneVault:
    def __init__(self, secret: str):
        # Any long random secret works: it is stretched into a valid Fernet key.
        if len(secret) < 32:
            raise RuntimeError("AOUN_PHONE_ENC_KEY must be at least 32 characters")
        key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
        self._f = Fernet(key)

    def encrypt(self, phone: str) -> str:
        return self._f.encrypt(phone.encode()).decode()

    def decrypt(self, blob: str) -> str:
        try:
            return self._f.decrypt(blob.encode()).decode()
        except InvalidToken as exc:  # wrong key or tampered value
            raise RuntimeError("phone decryption failed") from exc


def mask_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    return "•••••" + digits[-3:] if len(digits) >= 3 else "•••"


# ---------- ElevenLabs post-call webhook signature ----------
# Header format: "ElevenLabs-Signature: t=<unix seconds>,v0=<hex hmac>"
# where hmac = HMAC_SHA256(secret, f"{t}.{raw_body}").

MAX_WEBHOOK_AGE_SECONDS = 30 * 60


def verify_webhook_signature(secret: str, header: str, raw_body: bytes, now: float | None = None) -> bool:
    if not header or not secret:
        return False
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    ts, sig = parts.get("t", ""), parts.get("v0", "")
    if not ts.isdigit() or not sig:
        return False
    now = time.time() if now is None else now
    if abs(now - int(ts)) > MAX_WEBHOOK_AGE_SECONDS:
        return False
    expected = hmac.new(secret.encode(), f"{ts}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)
