import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../src/ui/Avatar';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../src/ui/Icon';
import { Circle, Row, Txt } from '../src/ui/kit';
import { Orb } from '../src/ui/Orb';
import { C, GRAD } from '../src/theme';
import { useT, when } from '../src/i18n';
import { useApp } from '../src/store';
import { planRows } from '../src/data/plan';
import { useAgentSession } from '../src/voice/AgentSession';

export default function Call() {
  const { t, rtl, lang, locale, pick } = useT();
  const insets = useSafeAreaInsets();
  const session = useAgentSession();
  const lines = useApp((s) => s.lines);
  const plan = useApp((s) => s.plan);
  const voice = useApp((s) => s.voice);
  const persona = session.active?.personas[voice];
  const [sec, setSec] = useState(0);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const startEnded = useRef(session.endedCount);
  const revealed = lines.some((l) => l.who === 'u');

  useEffect(() => { const i = setInterval(() => setSec((x) => x + 1), 1000); return () => clearInterval(i); }, []);

  // When the agent ends the call (or it drops), go back to the app.
  useEffect(() => {
    if (session.endedCount === startEnded.current) return;
    const done = !!useApp.getState().plan?.confirmed;
    const id = setTimeout(() => router.replace('/home'), done ? 2200 : 900);
    return () => clearTimeout(id);
  }, [session.endedCount]);

  const hang = () => { session.stop(); };
  const send = () => { const v = draft.trim(); if (!v) return; session.send(v); setDraft(''); setTyping(false); };

  const lastA = [...lines].reverse().find((l) => l.who === 'a')?.text;
  const recent = lines.slice(-6);
  const mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
  const headline = session.status === 'error' ? t('couldNotCall') : session.status === 'connecting' ? t('connecting') : lastA ?? '';

  return (
    <LinearGradient colors={GRAD.callBg} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }}>
        <Row style={s.top}>
          <Pressable style={s.topBtn} accessibilityRole="button"><Row gap={6}><Icon d={ICON.chat} color={C.white} size={18} /><Txt size={15} weight="600" color={C.white}>{mm}:{ss}</Txt></Row></Pressable>
          <Pressable style={s.topBtn} onPress={hang} accessibilityRole="button"><Txt size={15} weight="600" color={C.white}>{t('end')}</Txt></Pressable>
        </Row>

        <View style={{ alignItems: 'center', gap: 4 }}>
          {revealed && persona ? (
            <View style={[s.avatar, { overflow: 'hidden' }]}><Avatar size={64} talking={session.speaking} /></View>
          ) : (
            <Image source={require('../assets/aoun-icon.png')} style={{ width: 40, height: 40, tintColor: C.white }} />
          )}
          <Txt size={30} weight="700" color={C.white} center>{revealed && persona ? t(voice === 'f' ? 'female' : 'male') : t('aoun')}</Txt>
        </View>

        {(session.planShown || plan?.confirmed) && plan?.slot ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
            <View style={s.planCard}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={13} weight="700" color={C.teal}>{plan.confirmed ? '✓ ' + t('confirmed') : t('planTitle')}</Txt>
              </Row>
              <Txt size={24} weight="800">{when(plan.slot.iso, locale)}</Txt>
              {planRows(plan, t, pick, lang).map((r, i) => (
                <Row key={i} gap={8}><Icon d={r.icon} size={17} color={C.inkSoft} /><Txt size={15} color={r.accent ? C.teal : C.ink} weight={r.accent ? '700' : '400'} style={{ flex: 1 }}>{r.text}</Txt></Row>
              ))}
            </View>
            {!!lastA && <Txt size={17} weight="600" color={C.white} center style={{ marginTop: 18 }}>{lastA}</Txt>}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, gap: 18 }}>
            <Orb size={170} active={session.speaking} />
            {session.status === 'connected' && !session.speaking && (
              <Row gap={6}><Txt size={14} color="rgba(255,255,255,.7)">{t('yourTurn')}</Txt><View style={s.dots} /></Row>
            )}
            <Txt size={22} weight="700" color={C.white} center>{headline}</Txt>
            <View style={{ width: '100%', gap: 6 }}>
              {recent.slice(0, -1).filter((l) => l.who === 'u').slice(-2).map((l, i) => (
                <View key={i} style={[s.bubble, { alignSelf: rtl ? 'flex-start' : 'flex-end' }]}><Txt size={14} color={C.white}>{l.text}</Txt></View>
              ))}
            </View>
          </View>
        )}

        {typing ? (
          <Row style={s.inputRow}>
            <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} autoFocus placeholder={t('typeReply')} placeholderTextColor="rgba(255,255,255,.5)"
              style={[s.input, { textAlign: rtl ? 'right' : 'left' }]} returnKeyType="send" />
            <Pressable onPress={send} accessibilityRole="button"><Circle size={44} bg={C.mint}><Icon d={ICON.arrowLeft} color={C.dark} /></Circle></Pressable>
          </Row>
        ) : (
          <Row style={s.bottom}>
            <Pressable onPress={() => setTyping(true)} accessibilityRole="button"><Row gap={6}><Icon d={ICON.keyboard} color={C.white} size={18} /><Txt size={15} weight="600" color={C.white}>{t('typeReply')}</Txt></Row></Pressable>
            <Pressable onPress={() => session.setMuted(!session.muted)} accessibilityRole="button" accessibilityLabel={t('mute')}>
              <Circle size={52} bg={session.muted ? C.white : 'rgba(255,255,255,.16)'}><Icon d={session.muted ? ICON.micOff : ICON.mic} color={session.muted ? C.ink : C.white} size={22} /></Circle>
            </Pressable>
            <Pressable onPress={hang} accessibilityRole="button" accessibilityLabel={t('end')}>
              <Circle size={52} bg={C.red}><View style={{ transform: [{ rotate: '135deg' }] }}><Icon d={ICON.phone} color={C.white} size={22} /></View></Circle>
            </Pressable>
          </Row>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  top: { justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  topBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,.6)' },
  dots: { width: 18, height: 4, borderRadius: 2, backgroundColor: C.mint },
  bubble: { backgroundColor: 'rgba(255,255,255,.16)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '85%' },
  planCard: { backgroundColor: C.white, borderRadius: 22, padding: 18, gap: 8 },
  bottom: { justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 10 },
  inputRow: { paddingHorizontal: 16, paddingTop: 8 },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 16, color: C.white, backgroundColor: 'rgba(255,255,255,.14)', fontSize: 16 },
});
