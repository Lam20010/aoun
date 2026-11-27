// One live agent at a time (the booking call or the in-app assistant), shared by every screen.
// Screens call start('booking-call') / start('app-assistant'); everything agent-specific comes from
// the agent's AgentDef, so a new agent needs no change here.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { ConversationProvider, useConversation } from '@elevenlabs/react-native';
import { getAgent, type AgentDef } from '../agents';
import { api, ensurePatient, refresh } from '../api';
import { detectLang } from './detectLang';
import { t } from '../i18n';
import { useApp } from '../store';
import { toolsFor } from '../tools';

export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface SessionApi {
  active: AgentDef | null;
  status: SessionStatus;
  speaking: boolean;
  muted: boolean;
  /** last thing the agent said (for the assistant bar) */
  lastReply: string;
  /** the call reached "let me read you the plan" */
  planShown: boolean;
  /** increases each time a session ends, so screens can react */
  endedCount: number;
  start: (key: string) => Promise<void>;
  stop: () => void;
  setMuted: (m: boolean) => void;
  send: (text: string) => void;
}

const Ctx = createContext<SessionApi | null>(null);

export function useAgentSession(): SessionApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAgentSession outside AgentSessionProvider');
  return v;
}

export function AgentSessionProvider({ children }: { children: ReactNode }) {
  return (
    <ConversationProvider>
      <Inner>{children}</Inner>
    </ConversationProvider>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const conv = useConversation();
  const convRef = useRef(conv);
  convRef.current = conv;

  const [active, setActive] = useState<AgentDef | null>(null);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [muted, setMutedState] = useState(false);
  const [lastReply, setLastReply] = useState('');
  const [planShown, setPlanShown] = useState(false);
  const [endedCount, setEndedCount] = useState(0);
  const server = useRef<{ k: string; poll?: ReturnType<typeof setInterval>; asked?: boolean } | null>(null);
  const runId = useRef(0);

  const clearServer = () => {
    if (server.current?.poll) clearInterval(server.current.poll);
    server.current = null;
  };

  const finish = useCallback(() => {
    clearServer();
    setActive(null);
    setStatus('idle');
    setMutedState(false);
    setEndedCount((n) => n + 1);
  }, []);

  const stop = useCallback(() => {
    runId.current++;
    try { convRef.current.endSession(); } catch {}
    finish();
  }, [finish]);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    try { convRef.current.setMuted(m); } catch {}
  }, []);

  const syncPlan = useCallback(async (k: string, afterConfirm: boolean) => {
    try {
      const p = await api.callPlan(k);
      const st = useApp.getState();
      st.set({ plan: p });
      // the confirmation and the app follow the language the person spoke in the call
      if (afterConfirm && p.language && p.language !== st.lang) st.set({ lang: p.language as typeof st.lang });
      if (afterConfirm) refresh().catch(() => {});
    } catch {}
  }, []);

  // Follow the language the person speaks, in the whole app.
  const followLanguage = useCallback((text: string) => {
    const l = detectLang(text);
    const st = useApp.getState();
    if (!l || l === st.lang) return;
    st.set({ lang: l });
    api.language(l).catch(() => {});
  }, []);

  // The booking call asks for the location through the server; the phone shows its own prompt.
  const watchLocation = useCallback((k: string) => {
    const s = server.current;
    if (!s) return;
    s.poll = setInterval(async () => {
      if (!server.current || server.current.asked) return;
      try {
        const st = await api.status(k);
        if (st.location !== 'asked' || !server.current || server.current.asked) return;
        server.current.asked = true;
        const lang = useApp.getState().lang;
        const answer = async (allow: boolean) => {
          if (!allow) return api.location(k, false).catch(() => {});
          try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') return api.location(k, false).catch(() => {});
            const pos = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<null>((r) => setTimeout(() => r(null), 7000)),
            ]);
            // The coordinates go to our server once, which keeps only the distance.
            if (pos) await api.location(k, true, pos.coords.latitude, pos.coords.longitude);
            else await api.location(k, true);
          } catch { api.location(k, true).catch(() => {}); }
        };
        Alert.alert(t(lang, 'locTitle'), t(lang, 'locBody'), [
          { text: t(lang, 'dontAllow'), style: 'cancel', onPress: () => answer(false) },
          { text: t(lang, 'allow'), onPress: () => answer(true) },
        ]);
      } catch {}
    }, 1000);
  }, []);

  const start = useCallback(async (key: string) => {
    const def = getAgent(key);
    if (active) stop();
    const my = ++runId.current;
    const { voice, lang, addLine } = useApp.getState();
    const persona = def.personas[voice];
    setActive(def);
    setStatus('connecting');
    setLastReply('');
    setPlanShown(false);
    if (def.mode === 'call') useApp.getState().set({ lines: [] });

    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) throw new Error('mic');
      await ensurePatient();
      let k: string | undefined;
      if (def.serverSession) {
        k = (await api.start(voice, lang)).k;
        server.current = { k };
      }
      if (my !== runId.current) return;
      const ctx = { setMicMuted: setMuted, endSession: stop, startAgent: (next: string) => { void start(next); } };
      convRef.current.startSession({
        agentId: persona.agentId,
        // ElevenLabs takes the language codes it knows; Filipino is 'fil' there too, cast for the SDK type.
        overrides: { agent: { language: lang as never } },
        clientTools: toolsFor(def.clientTools, ctx),
        onConnect: ({ conversationId }) => {
          if (my !== runId.current) return;
          setStatus('connected');
          if (k) {
            api.bind(k, conversationId).catch(() => {});
            watchLocation(k);
          }
        },
        onMessage: (m) => {
          if (my !== runId.current) return;
          const text = (m.message || '').trim();
          if (!text) return;
          const who = (m.role ?? m.source) === 'user' ? 'u' : 'a';
          addLine({ who, text });
          if (who === 'u') followLanguage(text);
          if (who === 'a') {
            setLastReply(text);
            if (/أقرأ لك الخطة|read you the plan/i.test(text)) { setPlanShown(true); if (k) void syncPlan(k, false); }
          }
        },
        onAgentToolResponse: (e) => {
          const name = (e as { tool_name?: string }).tool_name ?? '';
          const act = def.afterServerTool?.[name];
          if (act && k) void syncPlan(k, act === 'confirmPlan');
        },
        onDisconnect: () => { if (my === runId.current) finish(); },
        onError: (msg) => { console.warn('[agent]', key, msg); },
      });
    } catch (e) {
      console.warn('[agent] could not start', key, e);
      if (my === runId.current) { clearServer(); setStatus('error'); setActive(def); }
    }
  }, [active, stop, finish, setMuted, syncPlan, watchLocation, followLanguage]);

  const send = useCallback((text: string) => {
    useApp.getState().addLine({ who: 'u', text });
    try { convRef.current.sendUserMessage(text); } catch {}
  }, []);

  useEffect(() => () => { clearServer(); }, []);

  const value = useMemo<SessionApi>(() => ({
    active, status, speaking: conv.isSpeaking, muted, lastReply, planShown, endedCount, start, stop, setMuted, send,
  }), [active, status, conv.isSpeaking, muted, lastReply, planShown, endedCount, start, stop, setMuted, send]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
