// A horizontal row that starts on the reading side: in Arabic the first item sits on the right and the
// row opens scrolled to it (the app lays out RTL itself, so the ScrollView would otherwise open on the left).
import { useRef } from 'react';
import { ScrollView, StyleProp, ViewStyle } from 'react-native';
import { useT } from '../i18n';

export function HScroll({ children, gap = 10, pad = 20, style }: { children: React.ReactNode; gap?: number; pad?: number; style?: StyleProp<ViewStyle> }) {
  const { rtl } = useT();
  const ref = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);
  return (
    <ScrollView ref={ref as never} horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]}
      onContentSizeChange={() => { if (rtl) ref.current?.scrollToEnd({ animated: false }); }}
      contentContainerStyle={{ flexDirection: rtl ? 'row-reverse' : 'row', gap, paddingHorizontal: pad }}>
      {children}
    </ScrollView>
  );
}
