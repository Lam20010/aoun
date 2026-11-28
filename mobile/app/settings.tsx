import { Pressable, View } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Pill, Row, Segments, Txt } from '../src/ui/kit';
import { C, R } from '../src/theme';
import { LANGS, useT, type Lang } from '../src/i18n';
import { useApp, type Voice } from '../src/store';
import { api, refresh } from '../src/api';
import { router } from 'expo-router';
import { Avatar } from '../src/ui/Avatar';

export default function Settings() {
  const { t } = useT();
  const { lang, voice, fontScale, set } = useApp();
  const pickLang = (l: Lang) => { set({ lang: l }); api.language(l).catch(() => {}); };
  const me = useApp((st) => st.me);
  const seh = me?.sehhaty;
  const profiles: [string, 'pCitizen' | 'pCitizenIns' | 'pResidentIns' | 'pResidentNo'][] = [['citizen', 'pCitizen'], ['citizen_insured', 'pCitizenIns'], ['resident_insured', 'pResidentIns'], ['resident_uninsured', 'pResidentNo']];
  const current = seh ? (seh.id_type === 'citizen' ? (seh.insurance ? 'citizen_insured' : 'citizen') : (seh.insurance ? 'resident_insured' : 'resident_uninsured')) : '';
  const switchProfile = async (k: string) => { try { await api.sehhatyProfile(k); await refresh(); } catch {} };
  return (
    <Screen title={t('settings')}>
      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.globe} color={C.teal} /><Txt size={16} weight="700">{t('language')}</Txt></Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGS.map((l) => {
            const on = l.key === lang;
            return (
              <Pressable key={l.key} onPress={() => pickLang(l.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ backgroundColor: on ? C.dark : C.bg, borderRadius: R.pill, paddingVertical: 9, paddingHorizontal: 14 }}>
                <Txt size={15} weight={on ? '700' : '500'} color={on ? C.white : C.ink}>{l.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>
      {seh && (
        <Card style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={8}><Icon d={ICON.shield} color={C.teal} /><Txt size={16} weight="700">{t('sehhatyAccount')}</Txt></Row>
            <Pill text={'✓ ' + t('linked')} tone="mint" />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={14} color={C.inkSoft}>{t('idType')}</Txt><Txt size={14} weight="600">{lang === 'ar' ? seh.id_type_ar : seh.id_type_en} · {seh.id_masked}</Txt></Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt size={14} color={C.inkSoft}>{t('insurance')}</Txt><Txt size={14} weight="600">{seh.insurance ? (lang === 'ar' ? seh.insurance.name_ar : seh.insurance.name_en) : t('noInsurance')}</Txt></Row>
          {seh.insurance && <Txt size={13} color={C.muted}>{t('insClass', { c: seh.insurance.class, p: seh.insurance.copay_pct, cap: seh.insurance.copay_cap })} · {t('validUntil', { d: seh.insurance.valid_until })}</Txt>}
          <Txt size={13} color={C.muted}>{t('sehhatyNote')}</Txt>
          <Txt size={13} weight="700" style={{ marginTop: 4 }}>{t('demoProfile')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {profiles.map(([k, lbl]) => (
              <Pressable key={k} onPress={() => switchProfile(k)} style={{ backgroundColor: current === k ? C.dark : C.bg, borderRadius: R.pill, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Txt size={12} weight="600" color={current === k ? C.white : C.ink}>{t(lbl)}</Txt>
              </Pressable>
            ))}
          </View>
        </Card>
      )}
      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.text} color={C.teal} /><Txt size={16} weight="700">{t('textSize')}</Txt></Row>
        <Segments<number> value={fontScale} onChange={(v) => set({ fontScale: v as 0 | 1 | 2 })} items={[{ key: 0, label: t('normalSize') }, { key: 1, label: t('bigger') }, { key: 2, label: t('bigger') + '+' }]} />
      </Card>
      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.mic} color={C.teal} /><Txt size={16} weight="700">{t('voice')}</Txt></Row>
        <Segments<Voice> value={voice} onChange={(v) => set({ voice: v })} items={[{ key: 'f', label: t('female') }, { key: 'm', label: t('male') }]} />
        <Pressable onPress={() => router.push('/avatar')} accessibilityRole="button" style={{ backgroundColor: C.bg, borderRadius: 16, padding: 10 }}>
          <Row gap={10}><View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }}><Avatar size={40} /></View>
            <Txt size={15} weight="600" style={{ flex: 1 }}>{lang === 'ar' ? (voice === 'm' ? 'خصّص شكل رفيد' : 'خصّصي شكل رفيدة') : (voice === 'm' ? 'Customize how Rafeed looks' : 'Customize how Rufaida looks')}</Txt></Row>
        </Pressable>
      </Card>
      <Card style={{ gap: 6 }}>
        <Row gap={8}><Icon d={ICON.shield} color={C.teal} /><Txt size={16} weight="700">{t('privacy')}</Txt></Row>
        <Txt size={14} color={C.inkSoft}>{t('privacyBody')}</Txt>
      </Card>
    </Screen>
  );
}
