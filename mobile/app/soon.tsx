import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Card, Txt } from '../src/ui/kit';
import { useT, type Key } from '../src/i18n';

// Placeholder for screens still being ported from the prototype (the game, needle mode, tips).
export default function Soon() {
  const { t } = useT();
  const { k } = useLocalSearchParams<{ k?: string }>();
  const titles: Record<string, Key> = { game: 'game', needle: 'needle', tips: 'tips' };
  const title = titles[k ?? ''] ?? 'soon';
  return (
    <Screen title={t(title)}>
      <Card><Txt size={16} weight="700">{t('soon')}</Txt><Txt size={14}>{t('soonBody')}</Txt></Card>
    </Screen>
  );
}
