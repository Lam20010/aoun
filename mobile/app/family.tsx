import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Button, Card, Circle, Pill, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C, R } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';
import { api, refresh } from '../src/api';
import type { Catalog } from '../src/types';

// Family history is a set of fixed codes ("runs in the family"); we never ask who, and never link an
// illness to a person. It only adds screenings to the person's own list.
const TREE = [['grand', 'grand', 'grand', 'grand'], ['parent', 'parent', 'aunt'], ['me', 'sib']];
// Who is who in the tree; the tree never shows who has which condition.
const REL: Record<string, [string, string]> = { grand: ['الأجداد', 'Grandparent'], parent: ['الوالدين', 'Parent'], aunt: ['العم/الخال', 'Aunt/uncle'], me: ['أنا', 'Me'], sib: ['الإخوة', 'Sibling'] };

export default function Family() {
  const { t, lang } = useT();
  const me = useApp((s) => s.me);
  const companion = useApp((s) => s.plan?.prefs.includes('companion_reminders'));
  const [cat, setCat] = useState<Catalog | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const name = (x: { ar: string; en: string }) => (lang === 'ar' ? x.ar : x.en);

  useEffect(() => { api.catalog().then(setCat).catch(() => {}); }, []);
  useEffect(() => { if (me) setCodes(me.family_history); }, [me]);

  const toggle = (k: string) => { setSaved(false); setCodes((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.concat(k))); };
  const save = useCallback(async () => { try { await api.family(codes); await refresh(); setSaved(true); } catch {} }, [codes]);

  useReadable([t('familyHistoryNote'), ...(me?.recommended ?? []).map(name)]);

  return (
    <Screen title={t('familyTitle')}>
      <Card style={{ gap: 16, alignItems: 'center', paddingVertical: 22 }}>
        {TREE.map((gen, gi) => (
          <Row key={gi} gap={14} style={{ justifyContent: 'center' }}>
            {gen.map((_, i) => {
              const self = gi === 2 && i === 0;
              return (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <Circle size={self ? 54 : 42} bg={self ? C.teal : C.mintSoft} style={{ borderWidth: 2, borderColor: self ? C.teal : C.mint }}>
                    <Icon d={ICON.people} size={17} color={self ? C.white : C.teal} />
                  </Circle>
                  <Txt size={11} color={self ? C.teal : C.inkSoft} weight={self ? '700' : '500'}>{REL[gen[i]][lang === 'ar' ? 0 : 1]}</Txt>
                </View>
              );
            })}
          </Row>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.tree} color={C.teal} /><Txt size={17} weight="800">{t('familyHistory')}</Txt></Row>
        <Txt size={13} color={C.muted}>{t('familyHistoryNote')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(cat?.family_history ?? []).map((f) => {
            const on = codes.includes(f.key);
            return (
              <Pressable key={f.key} onPress={() => toggle(f.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                style={{ backgroundColor: on ? C.dark : C.bg, borderRadius: R.pill, paddingVertical: 8, paddingHorizontal: 12 }}>
                <Txt size={14} weight={on ? '700' : '500'} color={on ? C.white : C.ink}>{name(f)}</Txt>
              </Pressable>
            );
          })}
        </View>
        <Button title={saved ? '✓ ' + t('saved') : t('save')} onPress={save} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Txt size={17} weight="800">{t('recommendedTests')}</Txt>
        {(me?.recommended ?? []).map((r) => (
          <Row key={r.key} style={{ justifyContent: 'space-between' }}>
            <Row gap={8} style={{ flex: 1 }}><Icon d={ICON.check} size={16} color={C.teal} /><Txt size={15} style={{ flex: 1 }}>{name(r)}</Txt></Row>
            <Pill text={t('every', { n: r.every_months })} tone="gray" />
          </Row>
        ))}
      </Card>

      <Card style={{ gap: 10, backgroundColor: '#FFF6F0' }}>
        <Row gap={8}><Icon d={ICON.alert} color="#C2410C" /><Txt size={16} weight="800" style={{ flex: 1 }}>{t('warningSigns')}</Txt></Row>
        {(cat?.symptoms ?? []).map((s) => (
          <View key={s.key} style={{ gap: 4 }}>
            <Txt size={14}>{name(s)}</Txt>
            <Pill text={t(s.urgency === 'soon' ? 'soonLbl' : s.urgency === 'urgent' ? 'urgent' : 'emergency')} tone={s.urgency === 'soon' ? 'amber' : 'red'} />
          </View>
        ))}
        <Button title={t('emergency')} tone="ghost" onPress={() => Linking.openURL('tel:997')} icon={<Icon d={ICON.phone} size={16} />} />
      </Card>

      {companion && <Card><Row gap={10}><Icon d={ICON.people} color={C.teal} /><Txt size={14} style={{ flex: 1 }}>{t('companion')}: {t('companionNote')}</Txt></Row></Card>}
    </Screen>
  );
}
