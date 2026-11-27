import { Pressable } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { Icon, ICON } from '../src/ui/Icon';
import { Card, Row, Segments, Txt } from '../src/ui/kit';
import { C } from '../src/theme';
import { LANGS, useT, type Lang } from '../src/i18n';
import { useApp, type Voice } from '../src/store';

export default function Settings() {
  const { t } = useT();
  const { lang, voice, fontScale, set } = useApp();
  return (
    <Screen title={t('settings')}>
      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.text} color={C.teal} /><Txt size={16} weight="700">{t('textSize')}</Txt></Row>
        <Segments<number> value={fontScale} onChange={(v) => set({ fontScale: v as 0 | 1 | 2 })} items={[{ key: 0, label: t('normal') }, { key: 1, label: t('bigger') }, { key: 2, label: t('bigger') + '+' }]} />
      </Card>
      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.globe} color={C.teal} /><Txt size={16} weight="700">{t('language')}</Txt></Row>
        <Segments<Lang> value={lang} onChange={(v) => set({ lang: v })} items={LANGS.map((l) => ({ key: l.key, label: l.label }))} />
      </Card>
      <Card style={{ gap: 10 }}>
        <Row gap={8}><Icon d={ICON.mic} color={C.teal} /><Txt size={16} weight="700">{t('voice')}</Txt></Row>
        <Segments<Voice> value={voice} onChange={(v) => set({ voice: v })} items={[{ key: 'f', label: t('female') }, { key: 'm', label: t('male') }]} />
      </Card>
      <Card style={{ gap: 6 }}>
        <Row gap={8}><Icon d={ICON.shield} color={C.teal} /><Txt size={16} weight="700">{t('privacy')}</Txt></Row>
        <Txt size={14} color={C.inkSoft}>{t('privacyBody')}</Txt>
      </Card>
    </Screen>
  );
}
