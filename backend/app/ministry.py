"""Ministry view: aggregate counts only, and any group under 50 residents is hidden."""
from collections import defaultdict

from fastapi import APIRouter, Depends, Request

from .security import require_admin_key

router = APIRouter(prefix="/ministry", dependencies=[Depends(require_admin_key)])

MIN_GROUP = 50
REASONS = ["transport", "work_hours", "fear", "no_need", "language", "childcare", "other"]


@router.get("/kpis")
def kpis(request: Request):
    db = request.app.state.db
    eligible = defaultdict(int)
    for r in db.all("""SELECT r.district FROM cases c JOIN residents r ON r.id = c.resident_id
                       WHERE c.due = 1"""):
        eligible[r["district"]] += 1

    def count(sql):
        out = defaultdict(int)
        for r in db.all(sql):
            out[r["district"]] += 1
        return out

    contacted = count("""SELECT DISTINCT cs.case_id, r.district FROM call_sessions cs
                         JOIN cases c ON c.id = cs.case_id JOIN residents r ON r.id = c.resident_id""")
    booked = count("""SELECT DISTINCT b.case_id, r.district FROM bookings b
                      JOIN cases c ON c.id = b.case_id JOIN residents r ON r.id = c.resident_id""")
    barriers = defaultdict(lambda: defaultdict(int))
    for r in db.all("SELECT district, reason FROM barriers"):
        barriers[r["district"]][r["reason"]] += 1

    districts = []
    for d in sorted(eligible):
        if eligible[d] < MIN_GROUP:
            districts.append({"district": d, "suppressed": True})
            continue
        districts.append({
            "district": d, "suppressed": False,
            "eligible": eligible[d], "contacted": contacted[d], "booked": booked[d],
            "barriers": {k: barriers[d][k] for k in REASONS},
        })
    return {"min_group_size": MIN_GROUP, "districts": districts}
