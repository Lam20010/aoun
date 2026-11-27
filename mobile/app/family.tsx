import { View } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Circle, Row, Txt } from '../src/ui/kit';
import { useReadable } from '../src/ui/useReadable';
import { C } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';

// Relationships only. No illness is ever linked to a person, and no relative's details are asked for.
const TREE = [['جد', 'جدة', 'جد', 'جدة'], ['الأب', 'الأم', 'خالة'], ['أنتِ', 'أخ']];

export default function Family() {
  const { t } = useT();
  const companion = useApp((s) => s.plan.companion);
  useReadable([t('familyNote')]);
  return (
    <Screen title={t('family')}>
      <Card style={{ gap: 18, alignItems: 'center', paddingVertical: 24 }}>
        {TREE.map((gen, gi) => (
          <Row key={gi} gap={14} style={{ justifyContent: 'center' }}>
            {gen.map((rel, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <Circle size={gi === 2 && i === 0 ? 56 : 46} bg={C.mintSoft} style={{ borderWidth: 2, borderColor: gi === 2 && i === 0 ? C.tealMid : C.mint }}>
                  <Icon d={ICON.people} size={18} color={C.teal} />
                </Circle>
                <Txt size={12} weight="600" center>{rel}</Txt>
              </View>
            ))}
          </Row>
        ))}
      </Card>
      <Card><Row gap={10}><Icon d={ICON.shield} color={C.teal} /><Txt size={14} style={{ flex: 1 }}>{t('familyNote')}</Txt></Row></Card>
      {companion && <Card><Row gap={10}><Icon d={ICON.people} color={C.teal} /><Txt size={14} style={{ flex: 1 }}>{t('companion')}: {t('companionNote')}</Txt></Row></Card>}
    </Screen>
  );
}
