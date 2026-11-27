import { Linking, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Circle as SC, Path, Rect } from 'react-native-svg';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Button, Card, Row, Txt } from '../src/ui/kit';
import { PlanMap } from '../src/ui/PlanMap';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT, when } from '../src/i18n';
import { useApp } from '../src/store';
import { googleDirections, openDarb, placeName, planRows, uberTo } from '../src/data/plan';

// The neighbourhood walk (a park near the person's district; fictional point for the demo).
const WALK = { lat: 24.7333, lon: 46.826 };

export default function MapScreen() {
  const { t, lang, locale, pick } = useT();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const plan = useApp((s) => s.plan);
  const slot = plan?.slot ?? null;
  const walk = focus === 'walk' || !slot;
  const place = slot ? placeName(slot, t, lang) : '';
  const ride = plan ? planRows(plan, t, pick, lang).find((r) => r.accent)?.text : undefined;
  const title = walk ? t('walk') : place;
  const sub = walk ? t('walkSub') : when(slot!.iso, locale) + (ride ? ' · ' + ride : '');
  useReadable([title, sub]);

  if (walk) {
    return (
      <Screen title={t('walk')}>
        <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: '#E8F1EC' }}>
          <Svg width="100%" height={240} viewBox="0 0 340 240">
            <Rect x="0" y="0" width="340" height="240" fill="#E8F1EC" />
            <Path d="M0 170 H340 M120 0 V240 M0 70 H340 M250 0 V240" stroke="#FFFFFF" strokeWidth="14" />
            <Rect x="270" y="90" width="60" height="60" rx="10" fill="#CFE6C8" />
            <Path d="M60 200 H250 V120 H290" stroke={C.lime} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
            <SC cx="60" cy="200" r="11" fill={C.blue} />
            <SC cx="290" cy="120" r="13" fill={C.lime} />
          </Svg>
        </View>
        <Card style={{ gap: 8 }}>
          <Txt size={20} weight="800">{title}</Txt>
          <Txt size={14} color={C.inkSoft}>{sub}</Txt>
          <Button title={t('directions')} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${WALK.lat}%2C${WALK.lon}&travelmode=walking`)}
            icon={<Icon d={ICON.walk} color={C.white} size={16} />} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title={t('tripTitle')}>
      <PlanMap slot={slot!} height={300} title={place} />
      <Card style={{ gap: 6 }}>
        <Txt size={20} weight="800">{title}</Txt>
        <Row gap={6}><Icon d={ICON.clock} size={16} color={C.inkSoft} /><Txt size={14} color={C.inkSoft} style={{ flex: 1 }}>{sub}</Txt></Row>
        {slot!.doctor && <Txt size={14} color={C.teal} weight="600">{pick(slot!.doctor as never, 'name')} · {pick(slot!.doctor as never, 'clinic')}</Txt>}
      </Card>
      {slot!.kind !== 'home_visit' && (
        <View style={{ gap: 10 }}>
          <Button title={t('directions')} onPress={() => googleDirections(slot!, 'driving')} icon={<Icon d={ICON.map} color={C.white} size={16} />} />
          <Button title={t('uber')} tone="mint" onPress={() => uberTo(slot!, place)} icon={<Icon d={ICON.car} size={16} />} />
          <Row gap={10}>
            <View style={{ flex: 1 }}><Button title={t('transit')} tone="ghost" onPress={() => googleDirections(slot!, 'transit')} icon={<Icon d={ICON.train} size={16} />} /></View>
            <View style={{ flex: 1 }}><Button title={t('darb')} tone="ghost" onPress={openDarb} icon={<Icon d={ICON.train} size={16} />} /></View>
          </Row>
        </View>
      )}
    </Screen>
  );
}
