// A route drawn from its own points (used where no map can be shown): streets in the background,
// the path, home and the destination.
import { View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SText } from 'react-native-svg';
import { C } from '../theme';

export function RouteDrawn({ points, height = 240, title, color = C.tealMid, dest = C.teal }: { points: [number, number][]; height?: number; title?: string; color?: string; dest?: string }) {
  const W = 340, H = 240, pad = 34;
  const lats = points.map((p) => p[0]), lons = points.map((p) => p[1]);
  const la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  const sx = (W - 2 * pad) / Math.max(lo1 - lo0, 1e-4), sy = (H - 2 * pad) / Math.max(la1 - la0, 1e-4), s = Math.min(sx, sy);
  const X = (lon: number) => W / 2 + (lon - (lo0 + lo1) / 2) * s, Y = (lat: number) => H / 2 - (lat - (la0 + la1) / 2) * s;
  const d = points.map((p, i) => (i ? 'L' : 'M') + X(p[1]).toFixed(1) + ' ' + Y(p[0]).toFixed(1)).join(' ');
  const a = points[0], b = points[points.length - 1];
  return (
    <View style={{ height, borderRadius: 22, overflow: 'hidden', backgroundColor: '#E8F1EC' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect x="0" y="0" width={W} height={H} fill="#E8F1EC" />
        <Rect x="250" y="20" width="70" height="56" rx="10" fill="#CFE6C8" /><Rect x="24" y="150" width="70" height="40" rx="8" fill="#DCE9F5" />
        <Path d="M0 60 H340 M0 170 H340 M110 0 V240 M240 0 V240" stroke="#FFFFFF" strokeWidth="12" />
        <Path d={d} stroke="#FFFFFF" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={X(a[1])} cy={Y(a[0])} r="16" fill={C.blue} opacity={0.18} /><Circle cx={X(a[1])} cy={Y(a[0])} r="9" fill={C.blue} />
        <Circle cx={X(b[1])} cy={Y(b[0])} r="12" fill={dest} />
        {!!title && <SText x={X(b[1])} y={Y(b[0]) - 18} fontSize="12" fontWeight="700" fill={C.ink} textAnchor="middle">{title}</SText>}
      </Svg>
    </View>
  );
}
