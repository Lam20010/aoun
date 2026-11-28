// The Aoun orb: rings around the logo that breathe while the agent speaks.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import Svg, { Circle as SC, Defs, RadialGradient, Stop } from 'react-native-svg';

const LOGO = require('../../assets/aoun-icon.png');

export function Orb({ size = 170, active = false }: { size?: number; active?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: active ? 900 : 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: active ? 900 : 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.12 : 1.04] });
  const rings = Array.from({ length: 9 }, (_, i) => i);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="g" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#9CCDE3" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#9CCDE3" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <SC cx="100" cy="100" r="98" fill="url(#g)" />
          {rings.map((i) => (
            <SC key={i} cx={100 + Math.sin(i) * 3} cy={100 + Math.cos(i * 1.3) * 3} r={38 + i * 6.5} stroke="rgba(219,238,246,.55)" strokeWidth={0.9} fill="none" />
          ))}
        </Svg>
      </Animated.View>
      <View style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#BDE6F7', shadowOpacity: 0.9, shadowRadius: 18 }}>
        <Image source={LOGO} style={{ width: size * 0.26, height: size * 0.26 }} resizeMode="contain" />
      </View>
    </View>
  );
}
