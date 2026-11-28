import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../src/ui/Icon';
import { Button, Card, Circle, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C, R } from '../src/theme';
import { useT, when } from '../src/i18n';
import { api } from '../src/api';
import type { Msg } from '../src/types';

type Doc = { id: string; name_ar: string; name_en: string; specialty_ar: string; specialty_en: string };

/** A private thread with the doctor the person booked with. Messages are encrypted on the server. */
export default function Messages() {
  const { t, rtl, locale, pick } = useT();
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [doc, setDoc] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [orig, setOrig] = useState<Record<string, boolean>>({});
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  const load = useCallback(() => api.messages().then((r) => {
    setDocs(r.doctors); setMsgs(r.messages);
    setDoc((d) => d ?? r.doctors[0]?.id ?? null);
  }).catch(() => setDocs((d) => d ?? [])), []);
  useFocusEffect(useCallback(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, [load]));
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 50); }, [msgs.length, doc]);

  const current = docs?.find((d) => d.id === doc);
  const thread = msgs.filter((m) => m.doctor_id === doc);
  useReadable(thread.slice(-4).map((m) => (m.sender === 'doctor' ? pick(current as never, 'name') : t('you')) + ': ' + m.body));

  const send = async () => {
    const body = draft.trim();
    if (!body || !doc) return;
    setSending(true);
    try { await api.sendMessage(body, doc); setDraft(''); await load(); } catch {} finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 10 }}>
        <Row gap={12}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={8}>
            <Circle size={42}><Icon d={rtl ? ICON.chevronRight : ICON.chevronLeft} /></Circle>
          </Pressable>
          <Txt size={26} weight="800" style={{ flex: 1 }} lines={1}>{t('messagesTitle')}</Txt>
        </Row>
        {docs && docs.length > 1 && (
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {docs.map((d) => (
              <Pressable key={d.id} onPress={() => setDoc(d.id)} style={{ backgroundColor: d.id === doc ? C.dark : C.white, borderRadius: R.pill, paddingVertical: 7, paddingHorizontal: 12 }}>
                <Txt size={13} weight="700" color={d.id === doc ? C.white : C.ink}>{pick(d as never, 'name')}</Txt>
              </Pressable>
            ))}
          </Row>
        )}
        {current && (
          <Row gap={10}>
            <Circle size={40} bg={C.lavender}><Icon d={ICON.people} size={18} /></Circle>
            <View><Txt size={16} weight="800">{pick(current as never, 'name')}</Txt><Txt size={12} color={C.muted}>{pick(current as never, 'specialty')}</Txt></View>
          </Row>
        )}
      </View>

      {docs && !docs.length ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Card><Txt size={15} color={C.inkSoft}>{t('noDoctor')}</Txt></Card>
          <Button title={t('pickTime')} onPress={() => router.push('/booking')} />
        </View>
      ) : (
        <>
          <ScrollView ref={scroll as never} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 8 }}>
            {!thread.length && <Txt size={14} color={C.muted} center>{t('noMessages')}</Txt>}
            {thread.map((m) => {
              const mine = m.sender === 'patient';
              const start = rtl ? 'flex-end' : 'flex-start';
              const end = rtl ? 'flex-start' : 'flex-end';
              const tr = !!m.translated && !orig[m.id];
              return (
                <View key={m.id} style={{ alignSelf: mine ? end : start, maxWidth: '82%', backgroundColor: mine ? C.dark : C.white, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 }}>
                  <Txt size={15} color={mine ? C.white : C.ink}>{tr ? m.translated : m.body}</Txt>
                  <Txt size={11} color={mine ? 'rgba(255,255,255,.6)' : C.muted}>{when(m.created_at, locale, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</Txt>
                  {!!m.translated && (
                    <Pressable onPress={() => setOrig((o) => ({ ...o, [m.id]: !o[m.id] }))} accessibilityRole="button">
                      <Txt size={11} weight="700" color={mine ? C.mint : C.teal}>{(tr ? t('translatedLbl') + ' · ' + t('showOriginal') : t('showTranslation'))}</Txt>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <Row style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
            <TextInput value={draft} onChangeText={setDraft} placeholder={t('typeMessage')} placeholderTextColor={C.muted} multiline maxLength={2000}
              style={{ flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 23, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, fontSize: 16, color: C.ink, textAlign: rtl ? 'right' : 'left' }} />
            <Pressable onPress={send} disabled={sending || !draft.trim()} accessibilityRole="button" accessibilityLabel={t('send')}>
              <Circle size={46} bg={draft.trim() ? C.mint : C.line}><Icon d={rtl ? ICON.arrowLeft : 'M5 12h14M13 6l6 6-6 6'} color={C.dark} /></Circle>
            </Pressable>
          </Row>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
