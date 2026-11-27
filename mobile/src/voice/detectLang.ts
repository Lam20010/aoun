// Which language a spoken (transcribed) sentence is in, so the app can follow the person.
import type { Lang } from '../i18n';

const FIL = new Set(['po', 'opo', 'ako', 'ang', 'ng', 'mga', 'salamat', 'hindi', 'kayo', 'ito', 'ba', 'naman', 'lang', 'oo', 'sige', 'kumusta']);
const ID = new Set(['saya', 'tidak', 'terima', 'kasih', 'bisa', 'apa', 'dengan', 'untuk', 'ini', 'itu', 'sudah', 'baik', 'iya', 'boleh', 'mau', 'tolong']);

export function detectLang(text: string): Lang | null {
  const s = text.trim();
  if (s.length < 3) return null;
  if (/[ऀ-ॿ]/.test(s)) return 'hi';
  if (/[ঀ-৿]/.test(s)) return 'bn';
  if (/[؀-ۿ]/.test(s)) {
    const urdu = (s.match(/[ٹڈڑںےۓھگکیہ]/g) ?? []).length;
    return urdu >= 2 ? 'ur' : 'ar';
  }
  const words = s.toLowerCase().match(/[a-z]+/g) ?? [];
  if (words.length < 2) return null;
  const fil = words.filter((w) => FIL.has(w)).length;
  const id = words.filter((w) => ID.has(w)).length;
  if (fil >= 2 && fil > id) return 'fil';
  if (id >= 2 && id > fil) return 'id';
  return 'en';
}
