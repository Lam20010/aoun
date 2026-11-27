"""Synthetic past records from different hospitals, clinics and labs, so the health record in the app
and the doctor portal shows a realistic history. Everything here is invented and deterministic."""
import random

from .security import new_id

# (months ago, facility, kind, screening, test_key, value, unit, flag, title_ar, title_en, summary_ar, summary_en)
_POOL = [
    (26, "H-EAST", "lab", "diabetes", "hba1c", "5.6", "%", "normal", "السكر التراكمي", "HbA1c",
     "ضمن الطبيعي.", "Within the normal range."),
    (14, "C-NAKHEEL", "lab", "diabetes", "hba1c", "5.9", "%", "borderline", "السكر التراكمي", "HbA1c",
     "مرحلة ما قبل السكري، يُنصح بالمتابعة بعد سنة مع تعديل الغذاء والمشي.",
     "Prediabetes range; repeat in a year with diet changes and walking."),
    (11, "L-RAZI", "lab", "cholesterol", "ldl", "142", "mg/dL", "borderline", "الكوليسترول الضار", "LDL cholesterol",
     "أعلى بقليل من المطلوب.", "Slightly above target."),
    (11, "L-RAZI", "lab", "cholesterol", "tg", "168", "mg/dL", "borderline", "الدهون الثلاثية", "Triglycerides",
     "مرتفعة قليلًا.", "Slightly raised."),
    (9, "C-NAKHEEL", "lab", "vitamin_d", "vitd", "17", "ng/mL", "low", "فيتامين د", "Vitamin D",
     "نقص فيتامين د، صُرف علاج لمدة ٨ أسابيع.", "Vitamin D deficiency; 8-week treatment prescribed."),
    (7, "H-NORTH", "visit", "hypertension", "sbp", "134", "mmHg", "borderline", "قياس ضغط الدم", "Blood pressure reading",
     "زيارة عيادة: ضغط 134/86، يُعاد القياس.", "Clinic visit: BP 134/86, recheck advised."),
    (7, "H-NORTH", "visit", "hypertension", "dbp", "86", "mmHg", "borderline", "الضغط الانبساطي", "Diastolic",
     "", ""),
    (5, "H-CENTRAL", "report", None, None, None, None, None, "تقرير زيارة طوارئ", "Emergency visit report",
     "التهاب حلق فيروسي، صُرف خافض حرارة، لا يحتاج متابعة.", "Viral sore throat; fever reducer given; no follow-up needed."),
    (4, "C-SHIFA", "lab", "anemia", "hb", "11.4", "g/dL", "low", "الهيموغلوبين", "Haemoglobin",
     "فقر دم بسيط، يُنصح بالحديد ومتابعة بعد ٣ أشهر.", "Mild anaemia; iron advised, recheck in 3 months."),
    (3, "L-RAZI", "lab", "thyroid", "tsh", "2.1", "mIU/L", "normal", "هرمون الغدة الدرقية", "TSH",
     "طبيعي.", "Normal."),
    (2, "C-SHIFA", "lab", "obesity", "bmi", "28.4", "kg/m²", "borderline", "مؤشر كتلة الجسم", "BMI",
     "وزن زائد، يُنصح بالنشاط اليومي.", "Overweight; daily activity advised."),
]


def seed_history(c, vault, resident_id: str, months_ref: str = "2026-11-01") -> None:
    """Give one person 5–8 past records from different places, plus one finished course of vitamin D."""
    from datetime import date

    rnd = random.Random(resident_id)
    picks = sorted(rnd.sample(range(len(_POOL)), k=rnd.randint(5, 8)))
    ref = date.fromisoformat(months_ref)
    for i in picks:
        m, fac, kind, scr, key, val, unit, flag, tar, ten, sar, sen = _POOL[i]
        y, mo = divmod(ref.month - 1 - m, 12)
        taken = date(ref.year + y, mo + 1, min(ref.day + rnd.randint(0, 20), 28)).isoformat()
        c.execute("""INSERT INTO records (id,resident_id,facility_id,doctor_id,kind,screening,test_key,value,unit,flag,
                     title_enc,summary_enc,taken_at,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                  (new_id("rec"), resident_id, fac, None, kind, scr, key, val, unit, flag,
                   vault.encrypt(tar + "|" + ten), vault.encrypt(sar + "|" + sen) if sar else None, taken, "history"))
    c.execute("""INSERT INTO meds (id,resident_id,doctor_id,facility_id,kind,name,dose,times,days,start_date,with_food,
                 instructions_enc,active,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
              (new_id("med"), resident_id, None, "C-NAKHEEL", "vitamin", "فيتامين د3 أسبوعي|Vitamin D3 weekly",
               "50,000 IU", "13:00", 56, "2026-02-10", 1, vault.encrypt("مرة في الأسبوع بعد الغداء|Once a week after lunch"),
               0, "2026-02-10T10:00:00+03:00"))
