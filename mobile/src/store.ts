// App state shared by screens, the voice layer and agent tools.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './i18n';

export type Voice = 'f' | 'm';
export type Place = 'center' | 'mobile' | 'home';
export type Ride = '' | 'car' | 'fam' | 'wheel' | 'metro';

export interface Plan {
  when: 'thu' | 'thu5' | 'sun' | 'wed' | 'sat';
  place: Place;
  ride: Ride;
  rideAt: '4' | '330';
  companion: boolean;
  prefs: string[];
  confirmed: boolean;
}

export const PLAN0: Plan = { when: 'thu', place: 'center', ride: '', rideAt: '4', companion: false, prefs: [], confirmed: false };

export interface Line { who: 'a' | 'u'; text: string }

interface AppState {
  lang: Lang;
  voice: Voice;
  fontScale: 0 | 1 | 2;
  plan: Plan;
  /** what the current screen would read aloud (set by each screen when it is focused) */
  screenText: string[];
  lines: Line[];
  set: (p: Partial<Omit<AppState, 'set' | 'setPlan' | 'addLine'>>) => void;
  setPlan: (p: Partial<Plan>) => void;
  addLine: (l: Line) => void;
}

export const useApp = create<AppState>()(persist((set) => ({
  lang: 'ar',
  voice: 'f',
  fontScale: 0,
  plan: { ...PLAN0 },
  screenText: [],
  lines: [],
  set: (p) => set(p),
  setPlan: (p) => set((s) => ({ plan: { ...s.plan, ...p } })),
  addLine: (l) => set((s) => ({ lines: s.lines.concat([l]).slice(-40) })),
}), {
  // Kept on the phone only: settings and the booked plan. Never what was said in a call.
  name: 'aoun-app',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (s) => ({ lang: s.lang, voice: s.voice, fontScale: s.fontScale, plan: s.plan }),
}));
