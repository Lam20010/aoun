// Small building blocks that follow the app language direction and the chosen text size.
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useApp } from '../store';
import { useT } from '../i18n';
import { C, R } from '../theme';

const SCALE = [1, 1.12, 1.25];

export function Txt({ children, style, size = 15, weight = '400', color = C.ink, center, lines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; size?: number; weight?: TextStyle['fontWeight']; color?: string; center?: boolean; lines?: number;
}) {
  const k = SCALE[useApp((s) => s.fontScale)];
  const { rtl } = useT();
  return (
    <Text numberOfLines={lines} style={[{ fontSize: size * k, lineHeight: size * k * 1.4, fontWeight: weight, color, textAlign: center ? 'center' : rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, style]}>
      {children}
    </Text>
  );
}

/** A horizontal row that starts from the right in Arabic and Urdu. */
export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  const { rtl } = useT();
  return <View style={[{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = <View style={[s.card, style]}>{children}</View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>{body}</Pressable> : body;
}

export function Circle({ children, size = 40, bg = C.white, style }: { children: ReactNode; size?: number; bg?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>{children}</View>;
}

export function Segments<K extends string | number>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { rtl } = useT();
  return (
    <View style={[s.seg, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={String(it.key)} onPress={() => onChange(it.key)} style={[s.segItem, on && { backgroundColor: C.dark }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Txt size={14} weight={on ? '700' : '500'} color={on ? C.white : C.ink} center>{it.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16 },
  seg: { backgroundColor: C.white, borderRadius: R.pill, padding: 4 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: R.pill },
});
