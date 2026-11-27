import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssistantBar } from '../../src/ui/AssistantBar';
import { Icon, ICON } from '../../src/ui/Icon';
import { Row, Txt } from '../../src/ui/kit';
import { useT, type Key } from '../../src/i18n';
import { C } from '../../src/theme';

const TABS: { name: string; label: Key; icon: string }[] = [
  { name: 'home', label: 'home', icon: ICON.home },
  { name: 'notebook', label: 'notebook', icon: ICON.book },
];

function Bar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { paddingBottom: insets.bottom + 6 }]} pointerEvents="box-none">
      <AssistantBar />
      <Row style={s.pill} gap={4}>
        {TABS.map((tab, i) => {
          const route = state.routes.find((r) => r.name === tab.name);
          const on = !!route && state.routes[state.index]?.key === route.key;
          return (
            <Pressable key={tab.name} onPress={() => route && navigateToTab(route.key)} style={[s.item, on && { backgroundColor: C.dark }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Row gap={6}><Icon d={tab.icon} color={on ? C.white : C.ink} size={18} /><Txt size={15} weight="700" color={on ? C.white : C.ink}>{t(tab.label)}</Txt></Row>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <Bar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="notebook" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10, alignItems: 'stretch' },
  pill: { alignSelf: 'center', backgroundColor: C.white, borderRadius: 30, padding: 5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  item: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
});
