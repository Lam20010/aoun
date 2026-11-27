"""Settings come only from environment variables. Nothing secret lives in the code."""
import os
from dataclasses import dataclass


def _req(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    tool_key: str            # shared secret ElevenLabs sends on every tool call (X-Aoun-Key)
    admin_key: str           # separate key for staff/admin routes (X-Admin-Key)
    webhook_secret: str      # HMAC secret for ElevenLabs post-call webhooks
    phone_enc_key: str       # Fernet key that encrypts phone numbers at rest
    db_path: str
    elevenlabs_api_key: str  # optional: only needed to place real outbound calls
    phone_number_id: str     # optional: ElevenLabs phone number id for outbound calls
    agent_rafeed: str
    agent_rufaida: str
    token_ttl_minutes: int
    demo_now: str            # optional fixed clock (ISO, Riyadh) for the demo
    public_base_url: str = ""  # e.g. https://aoun-voice-tools.onrender.com (for the location link)
    twilio_sid: str = ""       # optional: SMS for the location link
    twilio_token: str = ""
    twilio_from: str = ""
    demo_mode: bool = False    # lets a dashboard/web test conversation claim the newest unbound demo session

    @property
    def sms_ready(self) -> bool:
        return bool(self.twilio_sid and self.twilio_token and self.twilio_from)


def load_settings() -> Settings:
    return Settings(
        tool_key=_req("AOUN_TOOL_KEY"),
        admin_key=_req("AOUN_ADMIN_KEY"),
        webhook_secret=_req("AOUN_WEBHOOK_SECRET"),
        phone_enc_key=_req("AOUN_PHONE_ENC_KEY"),
        db_path=os.environ.get("AOUN_DB_PATH", "aoun.db"),
        elevenlabs_api_key=os.environ.get("ELEVENLABS_API_KEY", ""),
        phone_number_id=os.environ.get("ELEVENLABS_PHONE_NUMBER_ID", ""),
        agent_rafeed=os.environ.get("AOUN_AGENT_RAFEED", "agent_3801m8d1800xe1dbvm93n5dg3gay"),
        agent_rufaida=os.environ.get("AOUN_AGENT_RUFAIDA", "agent_9701m8d18596fbv8ghbf9jk4we3c"),
        token_ttl_minutes=int(os.environ.get("AOUN_TOKEN_TTL_MINUTES", "1440")),
        demo_now=os.environ.get("AOUN_DEMO_NOW", "2026-11-26T09:00:00+03:00"),
        public_base_url=os.environ.get("AOUN_PUBLIC_BASE_URL", "").rstrip("/"),
        twilio_sid=os.environ.get("TWILIO_ACCOUNT_SID", ""),
        twilio_token=os.environ.get("TWILIO_AUTH_TOKEN", ""),
        twilio_from=os.environ.get("TWILIO_FROM_NUMBER", ""),
        demo_mode=os.environ.get("AOUN_DEMO_MODE", "0") == "1",
    )
