// Client tools that run on the phone. The agent never receives results or personal data from them.
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useApp } from '../store';
import { langInfo, type Lang } from '../i18n';
import { api } from '../api';
import type { Tool } from './types';

const SCREENS: Record<string, string> = {
  home: '/home', notebook: '/notebook', results: '/notebook?seg=results', preferences: '/notebook?seg=prefs',
  family: '/family', settings: '/settings', map: '/map', game: '/soon?k=game', plan: '/plan',
  booking: '/booking', record: '/record', medicines: '/meds', messages: '/messages',
};
const LANG_CODES: Lang[] = ['ar', 'en', 'ur', 'hi', 'bn', 'fil', 'id'];

const speak = (text: string, language: string) =>
  new Promise<void>((done) => Speech.speak(text, { language, onDone: done, onStopped: done, onError: () => done() }));

export const appTools: Record<string, Tool> = {
  open_screen: ({ screen }) => {
    const to = SCREENS[String(screen)];
    if (!to) return 'unknown screen';
    router.navigate(to as never);
    return 'opened ' + screen;
  },

  // Reads what is on the screen with the phone's own voice, so nothing on it is sent to the agent.
  read_screen: async (_p, ctx) => {
    const lines = useApp.getState().screenText;
    if (!lines.length) return 'nothing to read on this screen';
    ctx.setMicMuted(true);
    const voice = langInfo(useApp.getState().lang).speech;
    for (const line of lines) await speak(line, voice);
    ctx.setMicMuted(false);
    return 'done: the phone read the screen aloud';
  },

  set_text_size: ({ size }) => {
    const f = useApp.getState().fontScale;
    const next = size === 'bigger' ? Math.min(2, f + 1) : size === 'smaller' ? Math.max(0, f - 1) : 0;
    useApp.getState().set({ fontScale: next as 0 | 1 | 2 });
    return 'done';
  },

  set_app_language: ({ language }) => {
    if (!LANG_CODES.includes(language as Lang)) return 'unsupported';
    useApp.getState().set({ lang: language as Lang });
    api.language(String(language)).catch(() => {});
    return 'done';
  },

  show_on_map: ({ target }) => {
    router.navigate((target === 'walk' ? '/map?focus=walk' : '/map') as never);
    return 'done';
  },

  // Hands over to the booking call (to change or make an appointment).
  start_call: (_p, ctx) => {
    setTimeout(() => {
      ctx.endSession();
      router.navigate('/incoming');
    }, 1200);
  },
};
