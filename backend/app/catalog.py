"""Synthetic reference data for the demo: Riyadh districts, health centers, hospitals and clinics,
doctors, the screening programme, hereditary conditions, follow-up symptoms and medicines.

Everything here is invented for the hackathon. Place coordinates are approximate district centres in
Riyadh; facility and doctor names are fictional and do not refer to real people or real facilities.
"""

# ---------- districts (approximate centres) ----------
DISTRICTS = {
    #  key          ar           en             lat      lon
    "Qurtubah":   ("قرطبة",     "Qurtubah",    24.8160, 46.7350),
    "Al-Naseem":  ("النسيم",    "Al-Naseem",   24.7360, 46.8330),
    "Al-Yarmouk": ("اليرموك",   "Al-Yarmouk",  24.8030, 46.7810),
    "Al-Malqa":   ("الملقا",    "Al-Malqa",    24.8100, 46.6150),
    "Al-Olaya":   ("العليا",    "Al-Olaya",    24.6950, 46.6850),
    "Al-Rawdah":  ("الروضة",    "Al-Rawdah",   24.7390, 46.7700),
    "Al-Aziziyah": ("العزيزية", "Al-Aziziyah", 24.5850, 46.7600),
    "Al-Suwaidi": ("السويدي",   "Al-Suwaidi",  24.5900, 46.6600),
}

# ---------- facilities ----------
# kind: phc (primary health centre, where Aoun books screenings), hospital, private_clinic, lab
FACILITIES = [
    # id, kind, district, name_ar, name_en, dlat, dlon, wheelchair, female_staff
    ("F-QUR", "phc", "Qurtubah", "مركز صحي قرطبة", "Qurtubah Health Center", 0.0, 0.0, 1, 1),
    ("F-NAS", "phc", "Al-Naseem", "مركز صحي النسيم", "Al-Naseem Health Center", 0.0, 0.0, 1, 1),
    ("F-YAR", "phc", "Al-Yarmouk", "مركز صحي اليرموك", "Al-Yarmouk Health Center", 0.0, 0.0, 1, 1),
    ("F-MAL", "phc", "Al-Malqa", "مركز صحي الملقا", "Al-Malqa Health Center", 0.002, -0.003, 1, 1),
    ("F-OLA", "phc", "Al-Olaya", "مركز صحي العليا", "Al-Olaya Health Center", -0.002, 0.002, 1, 0),
    ("F-RAW", "phc", "Al-Rawdah", "مركز صحي الروضة", "Al-Rawdah Health Center", 0.001, 0.003, 0, 1),
    ("F-AZI", "phc", "Al-Aziziyah", "مركز صحي العزيزية", "Al-Aziziyah Health Center", 0.003, 0.001, 1, 1),
    ("F-SUW", "phc", "Al-Suwaidi", "مركز صحي السويدي", "Al-Suwaidi Health Center", -0.001, -0.002, 1, 0),
    ("H-EAST", "hospital", "Al-Naseem", "مستشفى شرق الرياض العام", "East Riyadh General Hospital", 0.012, -0.010, 1, 1),
    ("H-NORTH", "hospital", "Al-Yarmouk", "مستشفى شمال الرياض التخصصي", "North Riyadh Specialist Hospital", -0.008, 0.015, 1, 1),
    ("H-CENTRAL", "hospital", "Al-Olaya", "مستشفى الرياض المركزي", "Riyadh Central Hospital", 0.010, 0.006, 1, 1),
    ("C-NAKHEEL", "private_clinic", "Al-Rawdah", "عيادات النخيل الطبية", "Al-Nakheel Medical Clinics", -0.004, 0.004, 1, 1),
    ("C-SHIFA", "private_clinic", "Al-Malqa", "مجمع الشفاء الطبي", "Al-Shifa Medical Complex", 0.006, 0.004, 1, 1),
    ("L-RAZI", "lab", "Al-Olaya", "مختبرات الرازي", "Al-Razi Laboratories", -0.006, -0.004, 1, 1),
]

CLINICS = {
    "early": ("عيادة الفحص المبكر", "Early Screening Clinic"),
    "chronic": ("عيادة الأمراض المزمنة", "Chronic Care Clinic"),
    "women": ("عيادة صحة المرأة", "Women's Health Clinic"),
}

# ---------- doctors (fictional) ----------
# id, facility, gender, name_ar, name_en, specialty_ar, specialty_en, clinic key, room
DOCTORS = [
    ("D01", "F-NAS", "f", "د. نورة العتيبي", "Dr. Noura Al-Otaibi", "طب الأسرة", "Family medicine", "early", "3"),
    ("D02", "F-NAS", "m", "د. فهد القحطاني", "Dr. Fahad Al-Qahtani", "الباطنة", "Internal medicine", "chronic", "5"),
    ("D03", "F-NAS", "f", "د. ريم الشهري", "Dr. Reem Al-Shehri", "صحة المرأة", "Women's health", "women", "7"),
    ("D04", "F-QUR", "f", "د. هيفاء الدوسري", "Dr. Haifa Al-Dosari", "طب الأسرة", "Family medicine", "early", "2"),
    ("D05", "F-QUR", "m", "د. عبدالله الحربي", "Dr. Abdullah Al-Harbi", "الباطنة", "Internal medicine", "chronic", "4"),
    ("D06", "F-YAR", "f", "د. سارة المطيري", "Dr. Sarah Al-Mutairi", "طب الأسرة", "Family medicine", "early", "1"),
    ("D07", "F-YAR", "m", "د. خالد الزهراني", "Dr. Khalid Al-Zahrani", "طب الأسرة", "Family medicine", "chronic", "3"),
    ("D08", "F-MAL", "f", "د. لطيفة السبيعي", "Dr. Latifa Al-Subaie", "طب الأسرة", "Family medicine", "early", "2"),
    ("D09", "F-OLA", "m", "د. ماجد الغامدي", "Dr. Majed Al-Ghamdi", "الباطنة", "Internal medicine", "chronic", "6"),
    ("D10", "F-RAW", "f", "د. منيرة الشمري", "Dr. Munira Al-Shammari", "طب الأسرة", "Family medicine", "early", "1"),
    ("D11", "F-AZI", "m", "د. سلطان العنزي", "Dr. Sultan Al-Anazi", "طب الأسرة", "Family medicine", "early", "2"),
    ("D12", "F-SUW", "f", "د. أمل الرشيدي", "Dr. Amal Al-Rashidi", "طب الأسرة", "Family medicine", "early", "3"),
    # private clinics (paid; insurance may cover part)
    ("D13", "C-NAKHEEL", "f", "د. جواهر القرني", "Dr. Jawaher Al-Qarni", "طب الأسرة", "Family medicine", "early", "12"),
    ("D14", "C-SHIFA", "m", "د. ناصر البقمي", "Dr. Nasser Al-Buqami", "الباطنة", "Internal medicine", "chronic", "8"),
    ("D15", "C-SHIFA", "f", "د. هند العمري", "Dr. Hind Al-Omari", "صحة المرأة", "Women's health", "women", "9"),
]

# ---------- the screening programme ----------
# Each test: key, ar, en, unit, low, high (normal range), borderline high (None if not used)
SCREENINGS = {
    "diabetes": {
        "ar": "فحص السكر التراكمي", "en": "Diabetes (HbA1c)", "who": "35+ or risk factors", "every_months": 12,
        "tests": [("hba1c", "السكر التراكمي", "HbA1c", "%", 4.0, 5.6, 6.4),
                  ("fbg", "سكر صائم", "Fasting glucose", "mg/dL", 70, 99, 125)],
    },
    "hypertension": {
        "ar": "فحص ضغط الدم", "en": "Blood pressure", "who": "18+", "every_months": 12,
        "tests": [("sbp", "الضغط الانقباضي", "Systolic", "mmHg", 90, 119, 139),
                  ("dbp", "الضغط الانبساطي", "Diastolic", "mmHg", 60, 79, 89)],
    },
    "cholesterol": {
        "ar": "فحص الدهون والكوليسترول", "en": "Cholesterol (lipid panel)", "who": "40+", "every_months": 24,
        "tests": [("ldl", "الكوليسترول الضار", "LDL", "mg/dL", 0, 99, 159),
                  ("hdl", "الكوليسترول النافع", "HDL", "mg/dL", 40, 100, None),
                  ("tg", "الدهون الثلاثية", "Triglycerides", "mg/dL", 0, 149, 199)],
    },
    "obesity": {
        "ar": "مؤشر كتلة الجسم", "en": "Body mass index", "who": "all adults", "every_months": 12,
        "tests": [("bmi", "مؤشر كتلة الجسم", "BMI", "kg/m²", 18.5, 24.9, 29.9)],
    },
    "vitamin_d": {
        "ar": "فيتامين د", "en": "Vitamin D", "who": "on clinical advice", "every_months": 12,
        "tests": [("vitd", "فيتامين د", "25-OH Vitamin D", "ng/mL", 30, 100, None)],
    },
    "anemia": {
        "ar": "فحص فقر الدم", "en": "Anaemia (haemoglobin)", "who": "women of child-bearing age", "every_months": 12,
        "tests": [("hb", "الهيموغلوبين", "Haemoglobin", "g/dL", 12.0, 15.5, None)],
    },
    "thyroid": {
        "ar": "فحص الغدة الدرقية", "en": "Thyroid (TSH)", "who": "on clinical advice", "every_months": 24,
        "tests": [("tsh", "هرمون الغدة الدرقية", "TSH", "mIU/L", 0.4, 4.0, None)],
    },
    "colorectal": {
        "ar": "فحص سرطان القولون", "en": "Colorectal cancer (FIT)", "who": "45–75", "every_months": 24,
        "tests": [("fit", "فحص الدم الخفي في البراز", "Faecal immunochemical test", "", None, None, None)],
    },
    "breast": {
        "ar": "فحص سرطان الثدي", "en": "Breast cancer (mammogram)", "who": "women 40–69", "every_months": 24,
        "tests": [("mammo", "تصوير الثدي", "Mammogram (BI-RADS)", "", None, None, None)],
    },
    "cervical": {
        "ar": "فحص سرطان عنق الرحم", "en": "Cervical cancer", "who": "women 21–65", "every_months": 36,
        "tests": [("pap", "مسحة عنق الرحم", "Pap / HPV", "", None, None, None)],
    },
    "osteoporosis": {
        "ar": "فحص هشاشة العظام", "en": "Osteoporosis (DEXA)", "who": "women 65+", "every_months": 24,
        "tests": [("tscore", "كثافة العظام", "DEXA T-score", "", -1.0, 4.0, -2.5)],
    },
}

# Hereditary conditions: the programme can refer people, but genetic results are never shown in the
# app or stored by Aoun. Doctors send a referral to genetic counselling instead.
HEREDITARY = {
    "sickle_cell": ("فقر الدم المنجلي", "Sickle cell disease"),
    "thalassemia": ("الثلاسيميا", "Thalassaemia"),
    "g6pd": ("نقص إنزيم G6PD", "G6PD deficiency"),
    "familial_hypercholesterolemia": ("ارتفاع الكوليسترول العائلي", "Familial hypercholesterolaemia"),
}

# Family history a person may tick (no relative is ever named or linked).
FAMILY_HISTORY = {
    "diabetes": ("السكري", "Diabetes"),
    "hypertension": ("ارتفاع الضغط", "High blood pressure"),
    "heart": ("أمراض القلب", "Heart disease"),
    "colorectal": ("سرطان القولون", "Colorectal cancer"),
    "breast": ("سرطان الثدي", "Breast cancer"),
    "sickle_cell": ("فقر الدم المنجلي", "Sickle cell disease"),
    "thalassemia": ("الثلاسيميا", "Thalassaemia"),
    "familial_hypercholesterolemia": ("الكوليسترول العائلي", "Familial high cholesterol"),
}
# What a ticked family history adds to the recommended screenings.
FAMILY_TO_SCREENING = {"diabetes": "diabetes", "hypertension": "hypertension", "heart": "cholesterol",
                       "colorectal": "colorectal", "breast": "breast",
                       "familial_hypercholesterolemia": "cholesterol"}

# Symptoms that mean "do not wait for the routine screening" (shown in the app and to doctors).
FOLLOW_UP_SYMPTOMS = [
    ("thirst", "عطش مستمر وكثرة التبول", "Constant thirst and passing urine often", "diabetes", "soon"),
    ("headache_bp", "صداع شديد مع دوخة أو زغللة", "Severe headache with dizziness or blurred vision", "hypertension", "urgent"),
    ("fatigue", "تعب وشحوب مستمر", "Ongoing tiredness and paleness", "anemia", "soon"),
    ("blood_stool", "دم في البراز أو تغيّر مستمر في الإخراج", "Blood in stool or lasting change in bowel habit", "colorectal", "urgent"),
    ("breast_lump", "كتلة أو تغيّر في الثدي", "A lump or change in the breast", "breast", "urgent"),
    ("chest_pain", "ألم في الصدر", "Chest pain", "cholesterol", "emergency"),
    ("weight_change", "نقص أو زيادة وزن بدون سبب", "Unexplained weight loss or gain", "thyroid", "soon"),
    ("bone_pain", "كسر من سقطة بسيطة", "A fracture from a minor fall", "osteoporosis", "soon"),
]

# ---------- medicines and supplements a doctor can pick (or type another) ----------
MEDICINES = [
    # key, kind, name_ar, name_en, default dose, default times
    ("metformin", "medication", "ميتفورمين", "Metformin", "500 mg", "08:00,20:00"),
    ("atorvastatin", "medication", "أتورفاستاتين", "Atorvastatin", "20 mg", "21:00"),
    ("amlodipine", "medication", "أملوديبين", "Amlodipine", "5 mg", "08:00"),
    ("levothyroxine", "medication", "ليفوثيروكسين", "Levothyroxine", "50 mcg", "06:30"),
    ("vitd_daily", "vitamin", "فيتامين د3", "Vitamin D3", "1000 IU", "13:00"),
    ("vitd_weekly", "vitamin", "فيتامين د3 أسبوعي", "Vitamin D3 weekly", "50,000 IU", "13:00"),
    ("iron", "supplement", "حبوب الحديد", "Ferrous sulfate", "325 mg", "10:00"),
    ("folic", "vitamin", "حمض الفوليك", "Folic acid", "5 mg", "09:00"),
    ("calcium", "supplement", "كالسيوم مع فيتامين د", "Calcium + D3", "600 mg", "14:00"),
    ("omega3", "supplement", "أوميغا 3", "Omega-3", "1000 mg", "14:00"),
]

# ---------- messages to the person, in the language they spoke ----------
LANGS = ("ar", "en", "ur", "hi", "bn", "fil", "id")

BOOKED_SMS = {
    "ar": "عون - وزارة الصحة: تم تأكيد موعدك {when} في {place}{doctor}. الخطة كاملة في تطبيق عون.",
    "en": "Aoun - Ministry of Health: your appointment is confirmed for {when} at {place}{doctor}. The full plan is in the Aoun app.",
    "ur": "عون - وزارتِ صحت: آپ کی اپوائنٹمنٹ {when} کو {place}{doctor} میں کنفرم ہے۔ مکمل پلان عون ایپ میں ہے۔",
    "hi": "औन - स्वास्थ्य मंत्रालय: आपकी अपॉइंटमेंट {when} को {place}{doctor} में पक्की है। पूरी योजना औन ऐप में है।",
    "bn": "আউন - স্বাস্থ্য মন্ত্রণালয়: আপনার অ্যাপয়েন্টমেন্ট {when} তারিখে {place}{doctor}-এ নিশ্চিত। পুরো পরিকল্পনা আউন অ্যাপে আছে।",
    "fil": "Aoun - Ministry of Health: kumpirmado ang appointment mo sa {when} sa {place}{doctor}. Nasa Aoun app ang buong plano.",
    "id": "Aoun - Kementerian Kesehatan: janji temu Anda dikonfirmasi pada {when} di {place}{doctor}. Rencana lengkap ada di aplikasi Aoun.",
}
WITH_DOCTOR = {"ar": " مع {d}", "en": " with {d}", "ur": " ({d})", "hi": " ({d})", "bn": " ({d})", "fil": " kay {d}", "id": " dengan {d}"}

WEEKDAYS = {
    "ar": ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"],
    "en": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "ur": ["پیر", "منگل", "بدھ", "جمعرات", "جمعہ", "ہفتہ", "اتوار"],
    "hi": ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"],
    "bn": ["সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রবিবার"],
    "fil": ["Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado", "Linggo"],
    "id": ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
}


def facility(fid: str) -> dict:
    for f in FACILITIES:
        if f[0] == fid:
            fid_, kind, d, ar, en, dla, dlo, wc, fs = f
            _, _, lat, lon = DISTRICTS[d]
            return {"id": fid_, "kind": kind, "district": d, "district_ar": DISTRICTS[d][0], "district_en": DISTRICTS[d][1],
                    "name_ar": ar, "name_en": en, "lat": round(lat + dla, 5), "lon": round(lon + dlo, 5),
                    "wheelchair": bool(wc), "female_staff": bool(fs)}
    raise KeyError(fid)


def doctor(did: str) -> dict:
    for d in DOCTORS:
        if d[0] == did:
            did_, fid, g, ar, en, sar, sen, ck, room = d
            car, cen = CLINICS[ck]
            return {"id": did_, "facility": fid, "gender": g, "name_ar": ar, "name_en": en,
                    "specialty_ar": sar, "specialty_en": sen,
                    "clinic_ar": f"{car} - غرفة {room}", "clinic_en": f"{cen} - Room {room}"}
    raise KeyError(did)


def phc_for(district: str) -> str:
    return next(f[0] for f in FACILITIES if f[1] == "phc" and f[2] == district)


def doctors_at(fid: str) -> list[str]:
    return [d[0] for d in DOCTORS if d[1] == fid]


def when_text(start_iso: str, lang: str) -> str:
    from datetime import datetime
    d = datetime.fromisoformat(start_iso)
    days = WEEKDAYS.get(lang, WEEKDAYS["en"])
    return f"{days[d.weekday()]} {d.day}/{d.month} {d.hour:02d}:{d.minute:02d}"


def routine_for(age_band: str, gender: str) -> list[str]:
    """Routine adult screenings by age band and sex (the "who" column above), most common first."""
    try:
        lo = int(str(age_band).split("-")[0].rstrip("+"))
    except ValueError:
        lo = 40
    out = ["hypertension", "obesity"]
    if lo >= 35:
        out.insert(0, "diabetes")
    if lo >= 40:
        out.append("cholesterol")
    if lo >= 45 and lo < 75:
        out.append("colorectal")
    if gender == "f":
        if 40 <= lo < 70:
            out.append("breast")
        if 21 <= lo < 65:
            out.append("cervical")
        if lo >= 65:
            out.append("osteoporosis")
    return out


# ---------- Sehhaty (simulated integration) ----------
# Aoun reads the person's Sehhaty profile (identity type, last 4 digits of the ID, insurance) and books
# through Sehhaty. Ministry health centers, mobile clinics, home care and video consultations booked
# through Sehhaty are free of charge. Private clinics are paid; insurance pays its share.
# Insurers and prices below are invented demo values.
INSURERS = {
    "WAHA": ("الواحة للتأمين الصحي", "Al-Waha Health Insurance"),
    "SANABEL": ("سنابل للتأمين", "Sanabel Insurance"),
}
INSURANCE_CLASS = {"A": (10, 50), "B": (20, 75), "C": (20, 100)}  # class: (copay %, copay cap SAR per visit)
PRIVATE_PRICE = {  # SAR, the screening visit at a private clinic, including the lab test
    "diabetes": 120, "hypertension": 80, "cholesterol": 150, "obesity": 60, "vitamin_d": 180, "anemia": 90,
    "thyroid": 160, "colorectal": 140, "breast": 450, "cervical": 300, "osteoporosis": 400,
}
FREE_KINDS = ("phc", "mobile_clinic", "home_visit", "virtual")
DEMO_PROFILES = {  # what the demo patient's Sehhaty account looks like
    "citizen": {"id_type": "citizen", "insurer": "", "insurance_class": ""},
    "citizen_insured": {"id_type": "citizen", "insurer": "WAHA", "insurance_class": "A"},
    "resident_insured": {"id_type": "resident", "insurer": "SANABEL", "insurance_class": "B"},
    "resident_uninsured": {"id_type": "resident", "insurer": "", "insurance_class": ""},
}


def insurance(row) -> dict | None:
    code = row["insurer"] if "insurer" in row.keys() else ""
    if not code:
        return None
    pct, cap = INSURANCE_CLASS.get(row["insurance_class"] or "B", (20, 75))
    ar, en = INSURERS[code]
    return {"insurer": code, "name_ar": ar, "name_en": en, "class": row["insurance_class"], "copay_pct": pct,
            "copay_cap": cap, "valid_until": row["insurance_until"] or "2027-06-30"}


def quote(facility_kind: str, slot_kind: str, screening: str, row) -> dict:
    """What this visit costs this person. Free at Ministry places booked through Sehhaty."""
    if slot_kind in ("mobile_clinic", "home_visit") or facility_kind in FREE_KINDS:
        return {"free": True, "price": 0, "insurance_pays": 0, "you_pay": 0, "basis": "moh_free",
                "say_ar": "مجاني", "say_en": "Free",
                "note_ar": "حكومي، محجوز عبر صحتي ومجاني", "note_en": "Ministry of Health, booked through Sehhaty, free of charge"}
    price = PRIVATE_PRICE.get(screening, 150)
    ins = insurance(row) if row is not None else None
    if ins:
        you = min(round(price * ins["copay_pct"] / 100), ins["copay_cap"])
        return {"free": False, "price": price, "insurance_pays": price - you, "you_pay": you, "basis": "insurance",
                "say_ar": f"{you} ريال عليك", "say_en": f"You pay SAR {you}",
                "note_ar": f"السعر {price} ريال، تأمين {ins['name_ar']} يغطي {price - you} وعليك {you} ريال (نسبة التحمل {ins['copay_pct']}٪)",
                "note_en": f"Price SAR {price}; {ins['name_en']} pays {price - you}, you pay SAR {you} ({ins['copay_pct']}% co-pay)"}
    return {"free": False, "price": price, "insurance_pays": 0, "you_pay": price, "basis": "cash",
            "say_ar": f"{price} ريال", "say_en": f"SAR {price}",
            "note_ar": f"عيادة خاصة، السعر {price} ريال (ما عندك تأمين مسجّل في صحتي)",
            "note_en": f"Private clinic, SAR {price} (no insurance on your Sehhaty record)"}


def sehhaty_profile(row) -> dict:
    """The person's Sehhaty details as Aoun shows them: never the full ID number."""
    ins = insurance(row)
    t = row["id_type"] if "id_type" in row.keys() else "citizen"
    return {"id_type": t, "id_type_ar": "مواطن" if t == "citizen" else "مقيم", "id_type_en": "Citizen" if t == "citizen" else "Resident",
            "id_masked": "••••••" + (row["id_last4"] or "0000"), "insurance": ins, "linked": True}


def new_sehhaty_ref() -> str:
    import secrets
    return "SH-" + "".join(secrets.choice("0123456789") for _ in range(8))
