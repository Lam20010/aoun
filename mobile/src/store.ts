// App state shared by screens, the voice layer and agent tools.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from './i18n';
import type { Me, Plan } from './types';
import type { AvF, AvM } from './ui/Avatar';
import type { Game } from './data/game';

export type Voice = 'f' | 'm';
export interface Line { who: 'a' | 'u'; text: string }

interface AppState {
  lang: Lang;
  voice: Voice;
  fontScale: 0 | 1 | 2;
  remindersOn: boolean;
  me: Me | null;
  plan: Plan | null;
  /** what the current screen would read aloud (set by each screen when it is focused) */
  screenText: string[];
  lines: Line[];
  /** the assistant's look, per voice (also kept on the server) */
  avatar: { f?: Partial<AvF>; m?: Partial<AvM> };
  /** the neighbourhood game (also kept on the server) */
  game: Game | null;
  /** has seen the Sehhaty welcome */
  welcomed: boolean;
  set: (p: Partial<Omit<AppState, 'set' | 'addLine'>>) => void;
  addLine: (l: Line) => void;
}

export const useApp = create<AppState>()(persist((set) => ({
  lang: 'ar',
  voice: 'f',
  fontScale: 0,
  remindersOn: false,
  me: null,
  plan: null,
  screenText: [],
  lines: [],
  avatar: {},
  game: null,
  welcomed: false,
  set: (p) => set(p),
  addLine: (l) => set((s) => ({ lines: s.lines.concat([l]).slice(-40) })),
}), {
  // Kept on the phone only: settings and the last plan seen. Never what was said in a call.
  name: 'aoun-app',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (s) => ({ lang: s.lang, voice: s.voice, fontScale: s.fontScale, remindersOn: s.remindersOn, plan: s.plan, avatar: s.avatar, game: s.game, welcomed: s.welcomed }),
}));
