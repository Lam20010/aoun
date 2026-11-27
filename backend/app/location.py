"""One-time location sharing, opened from the text message the agent sends.

The phone asks the person for permission. If they allow, the page sends coordinates once;
the server computes the distance to the nearest center, keeps ONLY that distance, and discards
the coordinates. The link works once and expires after 30 minutes.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, Field

from .security import hash_token
from .tools import km

router = APIRouter(prefix="/l")

PAGE = """<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>عون · مشاركة الموقع</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#F0F8FF;color:#0D2D3F}
main{max-width:420px;margin:0 auto;padding:32px 20px}
h1{font-size:24px;margin:0 0 12px}
p{font-size:18px;line-height:1.7;margin:0 0 16px}
button{width:100%;font-size:20px;padding:16px;border:0;border-radius:14px;background:#2C7495;color:#fff}
.note{font-size:15px;color:#205E7D}
#done{display:none;font-size:20px;font-weight:600}
</style></head><body><main>
<h1>عون · وزارة الصحة</h1>
<p>نستخدم موقعك مرة وحدة بس، عشان نعرف أقرب مركز أو عيادة متنقلة لك.</p>
<p class="note">ما نحفظ موقعك. نحفظ المسافة لأقرب مركز فقط، والرابط يشتغل مرة وحدة.</p>
<button id="b">شارك موقعي</button>
<p id="done">شكرًا لك، وصلنا. تقدر ترجع للمكالمة.</p>
<script>
document.getElementById('b').onclick=function(){
  if(!navigator.geolocation){return;}
  navigator.geolocation.getCurrentPosition(function(p){
    fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({lat:p.coords.latitude,lon:p.coords.longitude})})
    .then(function(){document.getElementById('b').style.display='none';
      document.getElementById('done').style.display='block';});
  });
};
</script></main></body></html>"""


class Coords(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


def _link(request: Request, code: str):
    if len(code) > 64:
        raise HTTPException(404)
    row = request.app.state.db.one("SELECT * FROM location_links WHERE code_hash = ?", hash_token(code))
    if row is None or row["used"] or datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(404, "link_expired")
    return row


@router.get("/{code}", response_class=HTMLResponse)
def page(code: str, request: Request):
    _link(request, code)
    return HTMLResponse(PAGE, headers={"Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"})


@router.post("/{code}")
def receive(code: str, coords: Coords, request: Request):
    link = _link(request, code)
    db = request.app.state.db
    centers = db.all("SELECT DISTINCT lat, lon FROM slots WHERE lat != 0")
    nearest = min(km(coords.lat, coords.lon, r["lat"], r["lon"]) for r in centers) if centers else None
    with db.tx() as c:
        c.execute("UPDATE location_links SET used = 1 WHERE code_hash = ?", (link["code_hash"],))
        if nearest is not None:
            c.execute("UPDATE call_sessions SET distance_km = ? WHERE id = ?", (round(nearest, 1), link["call_id"]))
    del coords  # coordinates are not stored or logged anywhere
    return {"ok": True}
