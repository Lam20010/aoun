// Client tools that run on the phone. The agent never receives results or personal data from them.
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useApp } from '../store';
import { langInfo, type Lang } from '../i18n';
import { api } from '../api';
import type { Tool } from './types';
import { linesFor, READ_TOPICS, type Topic } from './readAloud';

const SCREENS: Record<string, string> = {
  home: '/home', notebook: '/notebook', results: '/notebook?seg=results', preferences: '/notebook?seg=prefs',
  family: '/family', settings: '/settings', map: '/map', game: '/game', needle: '/game?mode=calm', walk: '/walk', care: '/care', avatar: '/avatar', plan: '/plan',
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
  // Reads to the person with the phone's own voice: the open screen, or a topic from their own data
  // (plan, results, diagnoses, doctor messages, medicines, the whole record, or everything).
  // The agent only names the topic; nothing that is read is sent to it.
  read_screen: async ({ what }, ctx) => {
    const topic = (READ_TOPICS as readonly string[]).includes(String(what)) ? (what as Topic) : 'screen';
    const go: Partial<Record<Topic, string>> = { plan: '/plan', results: '/notebook?seg=results', diagnoses: '/record', record: '/record', messages: '/messages', medicines: '/meds' };
    if (go[topic]) router.navigate(go[topic] as never);
    const lang = useApp.getState().lang;
    let lines: string[] = [];
    try { lines = await linesFor(topic, lang); } catch { return 'could not load it; the phone may be offline'; }
    if (!lines.length) return 'nothing to read';
    ctx.setMicMuted(true);
    const voice = langInfo(lang).speech;
    for (const line of lines) await speak(line, voice);
    ctx.setMicMuted(false);
    return 'done: the phone read ' + topic + ' aloud (' + lines.length + ' lines)';
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
    router.navigate((target === 'walk' ? '/walk' : '/map') as never);
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
