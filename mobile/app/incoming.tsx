import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon, ICON } from '../src/ui/Icon';
import { Circle, Row, Txt } from '../src/ui/kit';
import { Orb } from '../src/ui/Orb';
import { C, GRAD } from '../src/theme';
import { useT } from '../src/i18n';
import { useAgentSession } from '../src/voice/AgentSession';

const LOGO = require('../assets/aoun-icon.png');

export default function Incoming() {
  const { t, rtl } = useT();
  const insets = useSafeAreaInsets();
  const session = useAgentSession();
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, []);

  const accept = () => {
    void session.start('booking-call');
    router.replace('/call');
  };
  const decline = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <LinearGradient colors={GRAD.lock} style={[s.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 }]}>
      {/* An in-app call screen (not a lock screen): the person opened it from the app. */}
      <Row style={{ width: '100%' }}>
        <Pressable onPress={decline} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={8}>
          <Circle size={42} bg="rgba(255,255,255,.14)"><Icon d={rtl ? ICON.chevronRight : ICON.chevronLeft} color={C.white} /></Circle>
        </Pressable>
      </Row>
      <View style={{ height: 36 }} />
      <Row style={{ justifyContent: 'center' }} gap={6}>
        <Image source={LOGO} style={{ width: 20, height: 20, borderRadius: 5 }} />
        <Txt size={15} color="rgba(255,255,255,.85)">{t('incoming')}</Txt>
      </Row>
      <Txt size={34} weight="700" color={C.white} center>{t('aoun')}</Txt>
      <Txt size={16} color="rgba(255,255,255,.75)" center>{t('screeningHelper')}</Txt>

      <View style={s.orbWrap}><Orb size={190} active /></View>

      <Row style={s.btns}>
        <Pressable onPress={accept} accessibilityRole="button" accessibilityLabel={t('accept')} style={s.btnCol}>
          <Circle size={76} bg={C.mint}><Icon d={ICON.phone} color={C.dark} size={30} width={2} /></Circle>
          <Txt size={16} color={C.white} center>{t('accept')}</Txt>
        </Pressable>
        <Pressable onPress={decline} accessibilityRole="button" accessibilityLabel={t('decline')} style={s.btnCol}>
          <Circle size={76} bg={C.red}><View style={{ transform: [{ rotate: '135deg' }] }}><Icon d={ICON.phone} color={C.white} size={30} width={2} /></View></Circle>
          <Txt size={16} color={C.white} center>{t('decline')}</Txt>
        </Pressable>
      </Row>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  orbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btns: { width: '100%', justifyContent: 'space-around' },
  btnCol: { alignItems: 'center', gap: 10 },
});
