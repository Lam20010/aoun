// Shapes the Aoun server returns (see backend/app/patient.py).
export interface Doctor { id: string; name_ar: string; name_en: string; gender?: string; specialty_ar: string; specialty_en: string; clinic_ar?: string; clinic_en?: string }
export interface Slot {
  id: string; iso: string; kind: 'center' | 'mobile_clinic' | 'home_visit'; band: string;
  center_ar: string; center_en?: string; district: string; district_ar: string; lat: number; lon: number;
  female_staff: boolean; wheelchair: boolean; remaining: number; facility_id?: string; doctor?: Doctor & { clinic_ar: string; clinic_en: string };
  facility_kind?: string; cost?: Cost;
}
export interface Cost { free: boolean; price: number; insurance_pays: number; you_pay: number; basis: 'moh_free' | 'insurance' | 'cash'; say_ar: string; say_en: string; note_ar: string; note_en: string }
export interface Sehhaty { id_type: string; id_type_ar: string; id_type_en: string; id_masked: string; linked: boolean;
  insurance: { insurer: string; name_ar: string; name_en: string; class: string; copay_pct: number; copay_cap: number; valid_until: string } | null }
export interface Ride { mode: 'car' | 'metro'; party?: string; pickup_at?: string; pickup_minutes?: number }
export interface Plan {
  confirmed: boolean; slot: Slot | null; ride: Ride | null; prefs: string[];
  screening: string; screening_ar: string; screening_en: string; case_status: string; language?: string; sehhaty_ref?: string | null;
}
export interface Me {
  patient: string; district: string; district_ar: string; district_en: string; language: string; gender: 'f' | 'm';
  age_band: string; family_history: string[]; recommended: { key: string; ar: string; en: string; every_months: number }[]; plan: Plan | null; sehhaty?: Sehhaty;
}
export interface FileRef { id: string; record_id: string | null; filename: string; mime: string; size: number; created_at: string; doctor: string }
export interface Rec {
  id: string; kind: string; screening: string | null; test_key: string | null; value: string | null; unit: string | null; flag: string | null;
  range: { low: number | null; high: number | null } | null; title_ar: string; title_en: string; summary_ar: string; summary_en: string;
  taken_at: string; source: 'history' | 'aoun'; facility: { id: string; kind: string; name_ar: string; name_en: string };
  doctor: { name_ar: string; name_en: string } | null; files: FileRef[];
}
export interface Note { id: string; body: string; created_at: string; doctor: { id: string; name_ar: string; name_en: string } }
export interface Records { records: Rec[]; files: FileRef[]; notes: Note[]; referrals: { kind: string; created_at: string; doctor: string }[] }
export interface Med {
  id: string; kind: 'medication' | 'vitamin' | 'supplement'; name_ar: string; name_en: string; dose: string; times: string[]; days: number;
  start_date: string; with_food: boolean; instructions_ar: string; instructions_en: string; active: boolean;
  facility_ar: string; facility_en: string; doctor: { name_ar: string; name_en: string } | null;
}
export interface Msg { id: string; sender: 'doctor' | 'patient'; doctor_id: string; body: string; created_at: string; lang?: string; translated?: string }
export interface Catalog {
  family_history: { key: string; ar: string; en: string }[];
  symptoms: { key: string; ar: string; en: string; screening: string; urgency: 'soon' | 'urgent' | 'emergency' }[];
  hereditary: { key: string; ar: string; en: string }[];
  districts: { key: string; ar: string; en: string }[];
}
