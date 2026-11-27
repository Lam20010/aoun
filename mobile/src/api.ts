// Calls to the Aoun server. The app holds one random token for the person (in the phone's secure
// storage); no names, IDs or phone numbers live in the app.
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';
import { useApp } from './store';
import type { Catalog, Me, Med, Msg, Plan, Records, Slot } from './types';

const TOKEN_KEY = 'aoun_patient_token';
let token: string | null = null;

export class ApiError extends Error { constructor(public status: number, public detail: string) { super(detail); } }

async function req<T>(path: string, init?: { method?: string; body?: unknown; auth?: boolean }, retried = false): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  // A screen can ask before the app has loaded the person's token; wait for it instead of failing.
  if (init?.auth !== false && !token) await ensurePatient();
  if (init?.auth !== false && token) headers.authorization = 'Bearer ' + token;
  const r = await fetch(API_BASE + path, { method: init?.method ?? (init?.body !== undefined ? 'POST' : 'GET'), headers,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body) });
  // The demo server starts fresh on each deploy, so a saved token can stop working: get a new person once.
  if (r.status === 401 && init?.auth !== false && !retried) {
    token = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    return req<T>(path, init, true);
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new ApiError(r.status, String((j as { detail?: string }).detail ?? r.status));
  }
  return r.json() as Promise<T>;
}

/** Make sure this phone has a person to work for (an invented demo person on the demo server). */
let pending: Promise<string> | null = null;
export function ensurePatient(): Promise<string> {
  if (token) return Promise.resolve(token);
  // One lookup at a time, so screens that ask together never create two people.
  pending ??= (async () => {
    token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    if (token) return token;
    const { voice, lang } = useApp.getState();
    const j = await req<{ token: string }>('/patient/demo', { body: { gender: voice, lang }, auth: false });
    token = j.token;
    await SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
    return token;
  })().finally(() => { pending = null; });
  return pending;
}

export const api = {
  me: () => req<Me>('/patient/me'),
  catalog: () => req<Catalog>('/patient/catalog', { auth: false }),
  plan: () => req<Plan>('/patient/plan'),
  slots: (opts: { days?: number; female?: boolean; district?: string }) =>
    req<{ district: string; slots: Slot[] }>(`/patient/slots?days=${opts.days ?? 14}&female=${opts.female ? 'true' : 'false'}${opts.district ? '&district=' + encodeURIComponent(opts.district) : ''}`),
  book: (slot_id: string) => req<Plan>('/patient/book', { body: { slot_id } }),
  cancel: () => req<Plan>('/patient/cancel', { body: {} }),
  language: (language: string) => req('/patient/language', { method: 'PATCH', body: { language } }),
  family: (codes: string[]) => req('/patient/family-history', { method: 'PUT', body: { codes } }),
  records: () => req<Records>('/patient/records'),
  fileLink: async (id: string) => API_BASE + (await req<{ path: string }>(`/patient/files/${id}/link`)).path,
  meds: () => req<{ meds: Med[] }>('/patient/meds'),
  messages: () => req<{ doctors: { id: string; name_ar: string; name_en: string; specialty_ar: string; specialty_en: string }[]; messages: Msg[] }>('/patient/messages'),
  sendMessage: (body: string, doctor_id?: string) => req('/patient/messages', { body: doctor_id ? { body, doctor_id } : { body } }),
  accessLog: () => req<{ entries: { doctor_ar: string; doctor_en: string; action: string; at: string }[] }>('/patient/access-log'),

  // the booking call (demo server)
  start: (voice: string, lang: string) => req<{ k: string }>('/demo/start', { body: token ? { voice, lang, p: token } : { voice, lang }, auth: false }),
  bind: (k: string, conversationId: string) => req('/demo/bind', { body: { k, conversation_id: conversationId }, auth: false }),
  status: (k: string) => req<{ location: 'idle' | 'asked' | 'allowed' | 'refused' }>('/demo/status?k=' + encodeURIComponent(k), { auth: false }),
  location: (k: string, allow: boolean, lat?: number, lon?: number) =>
    req('/demo/location', { body: lat === undefined ? { k, allow } : { k, allow, lat, lon }, auth: false }),
  callPlan: (k: string) => req<Plan>('/demo/plan?k=' + encodeURIComponent(k), { auth: false }),
};

/** Refresh the person and their plan into the store. */
export async function refresh(): Promise<void> {
  await ensurePatient();
  const me = await api.me();
  useApp.getState().set({ me, plan: me.plan });
}
