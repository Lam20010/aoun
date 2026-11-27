import { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { C } from '../theme';
import { Icon, ICON } from './Icon';
import { Circle, Row, Txt } from './kit';

/** A secondary screen with a back button and a title. */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const { t, rtl } = useT();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt size={26} weight="800">{title}</Txt>
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={t('back')}>
            <Circle size={42}><Icon d={rtl ? ICON.chevronRight : ICON.chevronLeft} /></Circle>
          </Pressable>
        </Row>
        {children}
      </ScrollView>
    </View>
  );
}
