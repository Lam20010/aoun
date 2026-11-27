import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';
import { planRows, STEPS, WHEN } from '../src/data/plan';

export default function PlanScreen() {
  const { t } = useT();
  const plan = useApp((s) => s.plan);
  const rows = planRows(plan);
  const steps = STEPS(plan);
  const current = plan.confirmed ? 1 : 0;
  useReadable([WHEN[plan.when].label, ...rows.map((r) => r.text)]);

  return (
    <Screen title={t('planTitle')}>
      <Card style={{ gap: 8 }} onPress={() => router.push('/map')}>
        <Txt size={13} weight="700" color={C.teal}>{plan.confirmed ? '✓ ' + t('confirmed') : t('pending')}</Txt>
        <Txt size={24} weight="800">{WHEN[plan.when].label}</Txt>
        {rows.map((r, i) => <Row key={i} gap={8}><Icon d={r.icon} size={17} color={C.inkSoft} /><Txt size={15}>{r.text}</Txt></Row>)}
        <Row gap={6} style={{ marginTop: 6 }}><Icon d={ICON.map} size={16} color={C.teal} /><Txt size={14} weight="700" color={C.teal}>{t('openMaps')}</Txt></Row>
      </Card>
      <Card style={{ gap: 0 }}>
        {steps.map(([title, sub], i) => {
          const done = i < current, cur = i === current && plan.confirmed;
          return (
            <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: done || cur ? C.tealMid : '#CFDCDA', backgroundColor: done ? C.tealMid : C.white, alignItems: 'center', justifyContent: 'center' }}>
                  {done && <Icon d={ICON.check} size={12} color={C.white} width={3} />}
                </View>
                {i < steps.length - 1 && <View style={{ width: 2, height: 30, backgroundColor: done ? C.tealMid : C.line }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 10 }}>
                <Txt size={15} weight="700" color={done || cur ? C.ink : '#8C9A9C'}>{title}</Txt>
                <Txt size={13} color={C.muted}>{sub}</Txt>
              </View>
            </Row>
          );
        })}
      </Card>
    </Screen>
  );
}
