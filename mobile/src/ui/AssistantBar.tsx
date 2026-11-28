// "يا رفيدة": the in-app assistant, available above the tabs on every main screen.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from './Avatar';
import { appAssistant } from '../agents/appAssistant';
import { useT } from '../i18n';
import { useApp } from '../store';
import { C } from '../theme';
import { useAgentSession } from '../voice/AgentSession';
import { Icon, ICON } from './Icon';
import { Circle, Row, Txt } from './kit';

export function AssistantBar() {
  const { t, rtl } = useT();
  const voice = useApp((s) => s.voice);
  const session = useAgentSession();
  const mine = session.active?.key === appAssistant.key;
  const live = mine && session.status === 'connected';
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (live && pending.current) { session.send(pending.current); pending.current = null; }
  }, [live, session]);

  const toggle = () => (mine ? session.stop() : void session.start(appAssistant.key));
  const send = () => {
    const v = draft.trim(); if (!v) return;
    setDraft(''); setTyping(false);
    if (live) session.send(v); else { pending.current = v; void session.start(appAssistant.key); }
  };

  const sub = mine && session.status === 'connecting' ? t('connecting')
    : mine && session.lastReply ? session.lastReply
    : mine && session.status === 'error' ? t('couldNotCall')
    : t(voice === 'f' ? 'female' : 'male') + ' ' + t('assistantHint');

  return (
    <View style={s.bar}>
      {typing ? (
        <Row gap={8}>
          <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} autoFocus placeholder={t('typeHere')} placeholderTextColor="rgba(255,255,255,.55)"
            style={[s.input, { textAlign: rtl ? 'right' : 'left' }]} returnKeyType="send" />
          <Pressable onPress={send} accessibilityRole="button" accessibilityLabel={t('send')}><Circle size={40} bg={C.mint}><Icon d={rtl ? ICON.arrowLeft : 'M5 12h14M13 6l6 6-6 6'} color={C.dark} /></Circle></Pressable>
          <Pressable onPress={() => setTyping(false)} accessibilityRole="button"><Icon d={ICON.close} color={C.white} /></Pressable>
        </Row>
      ) : (
        <Row gap={10}>
          <Pressable onPress={() => router.push('/assistant')} accessibilityRole="button" accessibilityLabel={t('assistantMenu')}>
            <View style={s.avatar}><Avatar size={46} talking={live && session.speaking} /></View>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => setTyping(true)} accessibilityRole="button" accessibilityHint={t('typeHere')}>
            <Txt size={16} weight="800" color={C.white}>{t('assistantCall', { name: t(voice === 'f' ? 'female' : 'male') })}</Txt>
            <Txt size={13} color="rgba(255,255,255,.82)" lines={2}>{sub}</Txt>
          </Pressable>
          <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={t(voice === 'f' ? 'female' : 'male')}>
            <Circle size={42} bg="transparent" style={s.mic}>
              <Icon d={ICON.mic} color={C.white} size={18} />
              <View style={[s.dot, { backgroundColor: live ? C.lime : mine ? '#E2D36B' : 'rgba(255,255,255,.35)' }]} />
            </Circle>
          </Pressable>
        </Row>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { backgroundColor: C.darkBar, borderRadius: 30, paddingVertical: 10, paddingHorizontal: 12, marginHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: '#2F6468' },
  mic: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,.35)' },
  dot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 3 },
  input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 14, color: C.white, backgroundColor: 'rgba(255,255,255,.12)', fontSize: 16 },
});
