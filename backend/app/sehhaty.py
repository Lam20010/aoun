"""The link to Sehhaty, behind one small interface so the real service can replace the simulation.

Sehhaty has no public API: a real connection needs an official agreement with the Ministry of Health
(and Nafath sign-in for the person). Until then `SimulatedSehhaty` behaves the way the integration
would: the person's account is ready without registering, identity and insurance come from the
Sehhaty record, and every booking gets a Sehhaty reference.

To plug in the real service later, implement `SehhatyClient` and set AOUN_SEHHATY_MODE=live with
AOUN_SEHHATY_BASE_URL, AOUN_SEHHATY_CLIENT_ID and AOUN_SEHHATY_CLIENT_SECRET.
"""
import os
import secrets
from typing import Protocol

from . import catalog

# Fictional first names for the demo account (the real name would come from Sehhaty).
DEMO_NAMES = {"f": ("حصة", "Hessa", "حصة عبدالله", "Hessa Abdullah"), "m": ("عبدالله", "Abdullah", "عبدالله محمد", "Abdullah Mohammed")}


class SehhatyClient(Protocol):
    mode: str

    def profile(self, row, phone: str | None = None) -> dict: ...

    def book(self, row, slot) -> str: ...

    def cancel(self, ref: str) -> None: ...


def _mask_phone(phone: str | None) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) < 4:
        return ""
    local = "0" + digits[-9:] if digits.startswith("966") else digits
    return local[:2] + "•• ••• " + local[-3:]


class SimulatedSehhaty:
    mode = "simulated"

    def profile(self, row, phone: str | None = None) -> dict:
        g = row["gender"] if "gender" in row.keys() else "f"
        first_ar, first_en, full_ar, full_en = DEMO_NAMES.get(g, DEMO_NAMES["f"])
        out = catalog.sehhaty_profile(row)
        out.update(mode=self.mode, first_name_ar=first_ar, first_name_en=first_en, name_ar=full_ar, name_en=full_en,
                   phone_masked=_mask_phone(phone))
        return out

    def book(self, row, slot) -> str:
        return "SH-" + "".join(secrets.choice("0123456789") for _ in range(8))

    def cancel(self, ref: str) -> None:
        return None


class LiveSehhaty(SimulatedSehhaty):
    """Placeholder for the official connection. Refuses to start without its settings."""
    mode = "live"

    def __init__(self):
        for k in ("AOUN_SEHHATY_BASE_URL", "AOUN_SEHHATY_CLIENT_ID", "AOUN_SEHHATY_CLIENT_SECRET"):
            if not os.environ.get(k):
                raise RuntimeError(f"Sehhaty live mode needs {k}")
        raise RuntimeError("Sehhaty live mode needs an agreement with the Ministry of Health; not available yet")


_CLIENT: SehhatyClient | None = None


def client() -> SehhatyClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = LiveSehhaty() if os.environ.get("AOUN_SEHHATY_MODE") == "live" else SimulatedSehhaty()
    return _CLIENT
