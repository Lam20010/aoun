"""Getting there and keeping the date: Google Maps, Uber, Careem, Darb, Apple Maps and the phone calendar.

- Route: with AOUN_GOOGLE_MAPS_KEY set, the server asks the Google Directions API for the real route,
  travel time and steps (walking, driving or transit, which includes the Riyadh Metro). The key stays
  on the server. Without a key it returns a straight-line estimate and says so (`source: estimate`).
  The person's location is used for that one request only and never stored.
- Rides: Uber and Careem do not let outside apps book a ride without a business agreement, so Aoun
  opens their apps with the destination already filled in (Uber's documented universal link).
- Darb: no public API or deep link; Aoun opens Google Maps transit directions (which include the metro
  and buses) and the Darb app's store page for tickets.
- Calendar: a one-time link to an .ics file the phone adds to its calendar.
"""
import math
import os
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from . import catalog
from .patient import current_patient, open_case
from .security import hash_token, secrets_token

router = APIRouter()
LINK_SECONDS = 120
SPEED_KMH = {"walking": 4.8, "driving": 28.0, "transit": 18.0}
DIRECTIONS = "https://maps.googleapis.com/maps/api/directions/json"

# The neighbourhood walk: a park or walkway per district (approximate, demo).
PARKS = {k: (v[2] + 0.002, v[3] + 0.0025, "ممشى " + v[0], v[1] + " walkway") for k, v in catalog.DISTRICTS.items()}


def _km(a, b) -> float:
    r = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _decode(poly: str) -> list[list[float]]:
    """Google encoded polyline to [[lat, lon], ...]."""
    pts, idx, lat, lon = [], 0, 0, 0
    while idx < len(poly):
        for which in (0, 1):
            shift, result = 0, 0
            while True:
                b = ord(poly[idx]) - 63
                idx += 1
                result |= (b & 0x1F) << shift
                shift += 5
                if b < 0x20:
                    break
            d = ~(result >> 1) if result & 1 else result >> 1
            if which == 0:
                lat += d
            else:
                lon += d
        pts.append([lat / 1e5, lon / 1e5])
    return pts


def links(dest: tuple[float, float], name: str, mode: str) -> dict:
    lat, lon = dest
    return {
        "google": f"https://www.google.com/maps/dir/?api=1&destination={lat}%2C{lon}&travelmode={mode}",
        "apple": f"https://maps.apple.com/?daddr={lat},{lon}&dirflg={'w' if mode == 'walking' else 'r' if mode == 'transit' else 'd'}",
        # https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links/introduction
        "uber": "https://m.uber.com/ul/?" + urlencode({"action": "setPickup", "pickup": "my_location",
                                                       "dropoff[latitude]": lat, "dropoff[longitude]": lon,
                                                       "dropoff[nickname]": name}),
        "careem": "https://app.careem.com/rides",
        "darb_ios": "https://apps.apple.com/sa/app/id1549817739",
        "darb_android": "https://play.google.com/store/apps/details?id=com.rcrc.riyadhjourneyplanner",
        "transit": f"https://www.google.com/maps/dir/?api=1&destination={lat}%2C{lon}&travelmode=transit",
    }


def route_between(origin: tuple[float, float], dest: tuple[float, float], mode: str, lang: str = "ar") -> dict:
    key = os.environ.get("AOUN_GOOGLE_MAPS_KEY", "")
    if key:
        try:
            r = httpx.get(DIRECTIONS, timeout=6, params={
                "origin": f"{origin[0]},{origin[1]}", "destination": f"{dest[0]},{dest[1]}", "mode": mode,
                "language": "ar" if lang == "ar" else "en", "region": "sa", "key": key})
            data = r.json()
            if data.get("status") == "OK":
                leg = data["routes"][0]["legs"][0]
                steps = [re.sub(r"<[^>]+>", " ", s.get("html_instructions", "")).strip() for s in leg.get("steps", [])][:8]
                return {"source": "google", "duration_min": round(leg["duration"]["value"] / 60),
                        "distance_km": round(leg["distance"]["value"] / 1000, 1),
                        "points": _decode(data["routes"][0]["overview_polyline"]["points"]), "steps": steps}
        except (httpx.HTTPError, KeyError, ValueError, IndexError):
            pass
    km = _km(origin, dest) * 1.3  # streets are longer than a straight line
    return {"source": "estimate", "duration_min": max(1, round(km / SPEED_KMH.get(mode, 20) * 60)), "distance_km": round(km, 1),
            "points": [list(origin), [origin[0], dest[1]], list(dest)], "steps": []}


@router.get("/patient/route")
def route(request: Request, to: str = "plan", mode: str = "driving", lat: float | None = None, lon: float | None = None,
          p=Depends(current_patient)):
    if mode not in SPEED_KMH or to not in ("plan", "walk"):
        raise HTTPException(422, "invalid_input")
    db = request.app.state.db
    home = catalog.DISTRICTS[p["district"]]
    origin = (lat, lon) if (lat is not None and lon is not None and abs(lat) <= 90 and abs(lon) <= 180) else (home[2] - 0.002, home[3] - 0.003)
    if to == "walk":
        plat, plon, ar, en = PARKS[p["district"]]
        dest, name_ar, name_en, mode = (plat, plon), ar, en, "walking"
    else:
        case = open_case(db, p["id"])
        slot = db.one("""SELECT sl.* FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                         WHERE b.case_id = ? AND b.status = 'confirmed'""", case["id"]) if case else None
        if slot is None:
            raise HTTPException(404, "no_booking")
        dest, name_ar, name_en = (slot["lat"], slot["lon"]), slot["center"], slot["center"]
    out = route_between(origin, dest, mode, p["language"])
    return {**out, "mode": mode, "to": to, "origin": list(origin), "dest": list(dest), "name_ar": name_ar, "name_en": name_en,
            "links": links(dest, name_ar, mode)}


@router.get("/patient/calendar/link")
def calendar_link(request: Request, p=Depends(current_patient)):
    """A one-time link (two minutes) to the appointment as a calendar file."""
    db = request.app.state.db
    case = open_case(db, p["id"])
    slot = db.one("""SELECT sl.*, b.sehhaty_ref FROM bookings b JOIN slots sl ON sl.id = b.slot_id
                     WHERE b.case_id = ? AND b.status = 'confirmed'""", case["id"]) if case else None
    if slot is None:
        raise HTTPException(404, "no_booking")
    code = secrets_token()
    store = getattr(request.app.state, "cal_links", {})
    now = time.time()
    store = {k: v for k, v in store.items() if v[1] > now}
    store[hash_token(code)] = (dict(slot), now + LINK_SECONDS, catalog.SCREENINGS.get(case["screening"], {}).get("ar", ""))
    request.app.state.cal_links = store
    return {"path": f"/c/{code}.ics", "expires_in": LINK_SECONDS}


def _ics_time(iso: str) -> str:
    return datetime.fromisoformat(iso).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


@router.get("/c/{code}.ics")
def calendar_file(code: str, request: Request):
    store = getattr(request.app.state, "cal_links", {})
    hit = store.pop(hash_token(code), None)
    if hit is None or hit[1] < time.time():
        raise HTTPException(404)
    s, _, screening = hit
    start = datetime.fromisoformat(s["start_local"])
    end = start + timedelta(minutes=30)
    esc = lambda t: t.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;")
    body = "\r\n".join([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aoun//Early screening//AR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
        f"UID:{s['id']}-{s.get('sehhaty_ref') or 'aoun'}@aoun", f"DTSTAMP:{_ics_time(datetime.now().astimezone().isoformat())}",
        f"DTSTART:{_ics_time(start.isoformat())}", f"DTEND:{_ics_time(end.isoformat())}",
        "SUMMARY:" + esc(f"موعد فحص {screening} · عون"),
        "LOCATION:" + esc(s["center"]), f"GEO:{s['lat']};{s['lon']}",
        "DESCRIPTION:" + esc(f"محجوز في صحتي: {s.get('sehhaty_ref') or ''}"),
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + esc("موعد الفحص بكرة"), "END:VALARM",
        "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:" + esc("موعد الفحص بعد ساعتين"), "END:VALARM",
        "END:VEVENT", "END:VCALENDAR", ""])
    return Response(content=body.encode(), media_type="text/calendar; charset=utf-8",
                    headers={"Content-Disposition": 'inline; filename="aoun-appointment.ics"', "Cache-Control": "no-store"})
