// The demo person is invented. A real build would read the first name from the signed-in account.
import type { Lang } from '../i18n';

const NAMES = { f: { ar: 'حصة', latin: 'Hessa' }, m: { ar: 'فهد', latin: 'Fahad' } };

/** The demo first name in the app's script: Arabic for Arabic and Urdu, Latin letters otherwise. */
export function demoFirstName(gender: 'f' | 'm', lang: Lang): string {
  return lang === 'ar' || lang === 'ur' ? NAMES[gender].ar : NAMES[gender].latin;
}
