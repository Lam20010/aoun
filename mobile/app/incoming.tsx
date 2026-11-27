import { useEffect, useState } from 'react';
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
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const session = useAgentSession();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(i); }, []);
  useEffect(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, []);

  const locale = lang === 'en' ? 'en-GB' : 'ar-SA';
  const date = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = now.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[صمAPMapm.]+$/, '');

  const accept = () => {
    void session.start('booking-call');
    router.replace('/call');
  };
  const decline = () => router.replace('/home');

  return (
    <LinearGradient colors={GRAD.lock} style={[s.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]}>
      <Icon d={ICON.lock} color="rgba(255,255,255,.9)" size={18} />
      <Txt size={17} weight="600" color="rgba(255,255,255,.92)" center>{date}</Txt>
      <Txt size={86} weight="300" color={C.white} center style={{ lineHeight: 96 }}>{time}</Txt>

      <View style={{ height: 28 }} />
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
