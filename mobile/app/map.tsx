import { Linking, Platform, Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Circle as SC, Path, Rect } from 'react-native-svg';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';
import { PLACE, rideLabel, WHEN } from '../src/data/plan';

// A simple drawn map of the district (fictional coordinates), with a button to open real directions.
const DEST = { lat: 24.7287, lon: 46.8152 };
const WALK = { lat: 24.7333, lon: 46.8260 };

export default function MapScreen() {
  const { t } = useT();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const plan = useApp((s) => s.plan);
  const walk = focus === 'walk';
  const title = walk ? t('walk') : PLACE[plan.place];
  const sub = walk ? t('walkSub') : WHEN[plan.when].label + (plan.ride ? ' · ' + rideLabel(plan) : '');
  useReadable([title, sub]);
  const to = walk ? WALK : DEST;
  const open = () => Linking.openURL(Platform.OS === 'ios'
    ? `https://maps.apple.com/?daddr=${to.lat},${to.lon}&dirflg=${walk ? 'w' : 'd'}`
    : `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}&travelmode=${walk ? 'walking' : 'driving'}`);

  return (
    <Screen title={walk ? t('walk') : t('planTitle')}>
      <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: '#E8F1EC' }}>
        <Svg width="100%" height={260} viewBox="0 0 340 260">
          <Rect x="0" y="0" width="340" height="260" fill="#E8F1EC" />
          <Path d="M0 180 H340 M120 0 V260 M0 70 H340 M250 0 V260" stroke="#FFFFFF" strokeWidth="14" />
          <Rect x="270" y="90" width="60" height="70" rx="10" fill="#CFE6C8" />
          <Path d={walk ? 'M60 210 H250 V125 H290' : 'M60 210 H120 V70 H230'} stroke={walk ? C.lime : C.tealMid} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={walk ? '2 9' : undefined} />
          <SC cx="60" cy="210" r="11" fill={C.blue} />
          <SC cx={walk ? 290 : 230} cy={walk ? 125 : 70} r="13" fill={walk ? C.lime : C.tealMid} />
        </Svg>
      </View>
      <Card style={{ gap: 6 }}>
        <Txt size={20} weight="800">{title}</Txt>
        <Txt size={14} color={C.inkSoft}>{sub}</Txt>
        <Pressable onPress={open} accessibilityRole="link" style={{ marginTop: 8, backgroundColor: C.dark, borderRadius: 24, paddingVertical: 12 }}>
          <Row gap={6} style={{ justifyContent: 'center' }}><Icon d={ICON.map} color={C.white} size={18} /><Txt size={15} weight="700" color={C.white}>{t('openMaps')}</Txt></Row>
        </Pressable>
      </Card>
    </Screen>
  );
}
