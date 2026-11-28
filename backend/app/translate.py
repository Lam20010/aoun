"""Optional translation of chat messages, so each side reads them in their own language.

Only runs when ANTHROPIC_API_KEY is set on the server (the key never reaches a browser or the app).
Translations are kept in memory only, keyed by a hash of the text; nothing extra is written to disk.
Without a key, messages are shown as written."""
import hashlib
import logging
import os
import re

import httpx

log = logging.getLogger("aoun.translate")
NAMES = {"ar": "Arabic (Saudi, plain)", "en": "English", "ur": "Urdu", "hi": "Hindi", "bn": "Bengali",
         "fil": "Filipino", "id": "Indonesian"}
_CACHE: dict[str, str] = {}
_URDU = re.compile(r"[ٹڈڑںےہھۓ]")
_ARABIC = re.compile(r"[؀-ۿ]")
_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
_BENGALI = re.compile(r"[ঀ-৿]")


def detect(text: str) -> str:
    """Rough script-based guess: ar, ur, hi, bn, or en for Latin script."""
    if _URDU.search(text):
        return "ur"
    if _ARABIC.search(text):
        return "ar"
    if _DEVANAGARI.search(text):
        return "hi"
    if _BENGALI.search(text):
        return "bn"
    return "en"


def enabled() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def translate(text: str, target: str) -> str | None:
    if target not in NAMES or not text.strip() or not enabled():
        return None
    key = hashlib.sha256(f"{target}\0{text}".encode()).hexdigest()
    if key in _CACHE:
        return _CACHE[key]
    try:
        r = httpx.post("https://api.anthropic.com/v1/messages", timeout=10, headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": os.environ.get("AOUN_TRANSLATE_MODEL", "claude-haiku-5-5"), "max_tokens": 600,
                  "system": "You translate short messages between a patient and their doctor. Keep the meaning, tone and any "
                            "numbers exactly. Reply with the translation only, nothing else.",
                  "messages": [{"role": "user", "content": f"Translate into {NAMES[target]}:\n\n{text}"}]})
        r.raise_for_status()
        out = "".join(b.get("text", "") for b in r.json().get("content", [])).strip()
    except Exception as e:  # never break the chat because translation failed
        log.warning("translation failed: %s", type(e).__name__)
        return None
    if out:
        if len(_CACHE) > 5000:
            _CACHE.clear()
        _CACHE[key] = out
    return out or None


def localize(msg: dict, target: str | None) -> dict:
    """Add lang, and translated when the message is in another language than the reader's."""
    lang = detect(msg["body"])
    msg["lang"] = lang
    if target and target != lang:
        tr = translate(msg["body"], target)
        if tr:
            msg["translated"] = tr
    return msg
