// «أنا معك»: everything the assistant can open for you, plus a box to type or talk.
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../src/ui/Avatar';
import { Icon, ICON } from '../src/ui/Icon';
import { Circle, Row, Txt } from '../src/ui/kit';
import { C } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';
import { appAssistant } from '../src/agents/appAssistant';
import { useAgentSession } from '../src/voice/AgentSession';

export default function Assistant() {
  const { lang, rtl } = useT();
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const insets = useSafeAreaInsets();
  const voice = useApp((s) => s.voice);
  const session = useAgentSession();
  const [draft, setDraft] = useState('');
  const f = voice !== 'm';
  const name = T(f ? 'رفيدة' : 'رفيد', f ? 'Rufaida' : 'Rafeed');
  const go = (to: string) => () => { router.back(); setTimeout(() => router.push(to as never), 50); };
  const talk = () => { router.back(); void session.start(appAssistant.key); };
  const send = () => {
    const v = draft.trim(); if (!v) return; setDraft('');
    router.back();
    if (session.active?.key === appAssistant.key && session.status === 'connected') session.send(v);
    else { void session.start(appAssistant.key).then(() => setTimeout(() => session.send(v), 1500)); }
  };
  const rows: [string, string, () => void][] = [
    [T(`تحدّثي مع ${name}`, `Talk to ${name}`), ICON.mic, talk],
    [T('شجرة العائلة', 'Family tree'), ICON.people, go('/family')],
    [T('دفتر فحوصاتي', 'My checks'), ICON.book, go('/notebook')],
    [T('خريطة موعدي', 'Map to my visit'), ICON.map, go('/map')],
    [T('ممشى الحي', 'District walkway'), ICON.walk, go('/walk')],
    [T('خطة الرعاية', 'Care plan'), ICON.doc, go('/care')],
    [T('نتائج فحوصاتي', 'My results'), ICON.file, go('/record')],
    [T('رسائل الطبيب', 'Doctor messages'), ICON.chat, go('/messages')],
    [T('حيّ عون', 'Aoun district'), ICON.game, go('/game')],
    [T('وقت الإبرة؟ وضع التشتيت', 'Needle time? Calm mode'), ICON.spark, go('/game?mode=calm')],
    [T(`ترتيب موعدي مع ${name}`, `Arrange my visit with ${name}`), ICON.phone, go('/incoming')],
    [T(`شكل ${name}`, `How ${name} looks`), ICON.heart, go('/avatar')],
    [T('الإعدادات', 'Settings'), ICON.sliders, go('/settings')],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 12 }}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20 }}>
        <Row gap={10}><Avatar size={44} /><Txt size={24} weight="800">{T('أنا معك', 'I\'m with you')}</Txt></Row>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={T('إغلاق', 'Close')}><Circle size={40}><Icon d={ICON.close} /></Circle></Pressable>
      </Row>
      <Txt size={14} color={C.inkSoft} style={{ paddingHorizontal: 20, marginTop: 6 }}>{T(`قولي مثلًا: «يا ${name}، افتحي شجرة عائلتي».`, `Say for example: "${name}, open my family tree."`)}</Txt>
      <Row gap={8} style={{ paddingHorizontal: 20, marginTop: 12 }}>
        <Pressable onPress={send} accessibilityRole="button" accessibilityLabel={T('إرسال', 'Send')}><Circle size={44} bg={C.tealMid}><Icon d={rtl ? ICON.arrowLeft : 'M5 12h14M13 6l6 6-6 6'} color={C.white} /></Circle></Pressable>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={send} placeholder={T('اكتبي لها…', 'Type here…')} placeholderTextColor={C.muted}
          style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: C.white, paddingHorizontal: 16, fontSize: 16, color: C.ink, textAlign: rtl ? 'right' : 'left' }} />
      </Row>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
        {rows.map(([label, d, on], i) => (
          <Pressable key={i} onPress={on} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Row style={{ justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }}>
              <Row gap={10}><Icon d={d} size={19} color={C.teal} /><Txt size={15} weight="600">{label}</Txt></Row>
              <Icon d={rtl ? ICON.chevronLeft : ICON.chevronRight} size={16} color={C.muted} />
            </Row>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
