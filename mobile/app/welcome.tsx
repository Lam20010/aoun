// The account is ready from Sehhaty: no sign-up. Shows only masked details, then goes in.
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ICON } from '../src/ui/Icon';
import { Skyline } from '../src/ui/Skyline';
import { Card, Row, Txt } from '../src/ui/kit';
import { C } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';

export default function Welcome() {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const me = useApp((s) => s.me);
  const set = useApp((s) => s.set);
  const seh = me?.sehhaty;
  const ar = lang === 'ar';
  const name = seh ? (ar ? seh.name_ar : seh.name_en) : '';
  const first = seh ? (ar ? seh.first_name_ar : seh.first_name_en) : '';
  const go = () => { set({ welcomed: true }); router.replace(me?.plan?.confirmed || me?.calls_ok === false ? '/home' : '/incoming'); };
  const rows: [string, string, string][] = [
    [t('wName'), name || '…', ICON.people],
    [t('wId'), seh?.id_masked ?? '…', ICON.shield],
    [t('wPhone'), seh?.phone_masked ?? '…', ICON.phone],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={['#D5EFE8', '#F3F8F6']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}><Skyline width="100%" height={150} opacity={0.9} /></View>
      <View style={{ paddingTop: insets.top + 40, paddingHorizontal: 24, gap: 18 }}>
        <Image source={require('../assets/aoun-icon.png')} style={{ width: 64, height: 64 }} />
        <Txt size={34} weight="800" color={C.teal}>{t('hello')} {first}</Txt>
        <Txt size={16} color={C.inkSoft}>{t('wReady')}</Txt>
        <Card style={{ gap: 12 }}>
          {rows.map(([k, v, d]) => (
            <Row key={k} style={{ justifyContent: 'space-between' }}>
              <Row gap={8}><Icon d={d} size={18} color={C.teal} /><Txt size={14} color={C.inkSoft}>{k}</Txt></Row>
              <Txt size={15} weight="700" style={{ writingDirection: 'ltr' }}>{v}</Txt>
            </Row>
          ))}
          <Row gap={6}><Icon d={ICON.lock} size={14} color={C.muted} /><Txt size={12} color={C.muted}>{t('wSafe')}</Txt></Row>
        </Card>
        <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.tealMid }} /><Txt size={14} color={C.inkSoft}>{me ? (ar ? 'حي ' + me.district_ar : me.district_en) : ''}</Txt></Row>
        <Pressable onPress={go} accessibilityRole="button" style={{ backgroundColor: C.dark, borderRadius: 999, paddingVertical: 16 }}>
          <Txt size={17} weight="800" color={C.white} center>{t('wEnter')}</Txt>
        </Pressable>
      </View>
    </View>
  );
}
