// The neighbourhood: Najdi houses with crenellations, palms, a mosque dome and minaret, people walking.
// The same scene as the presentation's footer, drawn once and reused on the home screen and the walk tile.
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

const SAND = '#E9DCC3', SAND2 = '#DCCBAA', DOOR = '#C9B38A', DOME = '#CFE6E0', PALM = '#96C9B4', TRUNK = '#C9A87A', INK = '#9DB8B2';

function House({ x, w, h, c = SAND }: { x: number; w: number; h: number; c?: string }) {
  const y = 120 - h, teeth = Math.max(2, Math.floor(w / 9));
  const zig = Array.from({ length: teeth }, (_, i) => { const tw = w / teeth; return `L${x + i * tw + tw / 2} ${y - 5} L${x + (i + 1) * tw} ${y}`; }).join(' ');
  return (
    <G>
      <Path d={`M${x} 120 L${x} ${y} ${zig} L${x + w} 120 Z`} fill={c} />
      <Rect x={x + w * 0.2} y={y + h * 0.25} width={w * 0.16} height={h * 0.16} rx={1.5} fill={SAND2} />
      <Rect x={x + w * 0.62} y={y + h * 0.25} width={w * 0.16} height={h * 0.16} rx={1.5} fill={SAND2} />
      <Path d={`M${x + w * 0.4} 120 L${x + w * 0.4} ${120 - h * 0.38} Q${x + w * 0.5} ${120 - h * 0.5} ${x + w * 0.6} ${120 - h * 0.38} L${x + w * 0.6} 120 Z`} fill={DOOR} />
    </G>
  );
}
function Palm({ x, h = 46 }: { x: number; h?: number }) {
  const top = 120 - h;
  return (
    <G>
      <Path d={`M${x} 120 Q${x + 3} ${top + h / 2} ${x} ${top}`} stroke={TRUNK} strokeWidth={3.5} fill="none" />
      <Path d={`M${x} ${top} Q${x - 14} ${top - 4} ${x - 20} ${top + 8} Q${x - 10} ${top} ${x} ${top} Q${x + 14} ${top - 4} ${x + 20} ${top + 8} Q${x + 10} ${top} ${x} ${top} Q${x - 4} ${top - 14} ${x - 12} ${top - 16} Q${x - 2} ${top - 8} ${x} ${top} Q${x + 4} ${top - 14} ${x + 12} ${top - 16} Q${x + 2} ${top - 8} ${x} ${top}`} fill={PALM} />
    </G>
  );
}
function Mosque({ x }: { x: number }) {
  return (
    <G>
      <Rect x={x} y={86} width={44} height={34} fill={DOME} />
      <Path d={`M${x + 6} 86 Q${x + 22} 58 ${x + 38} 86 Z`} fill={DOME} />
      <Circle cx={x + 22} cy={64} r={2} fill={INK} />
      <Rect x={x + 50} y={46} width={8} height={74} fill={DOME} />
      <Rect x={x + 48} y={62} width={12} height={4} fill={INK} opacity={0.5} />
      <Path d={`M${x + 50} 46 L${x + 54} 36 L${x + 58} 46 Z`} fill={DOME} />
    </G>
  );
}
function Walker({ x }: { x: number }) {
  return (
    <G stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none">
      <Circle cx={x} cy={102} r={3} fill={INK} stroke="none" />
      <Path d={`M${x} 106 L${x} 114 M${x} 114 L${x - 4} 121 M${x} 114 L${x + 4} 121 M${x - 4} 108 L${x + 4} 110`} />
    </G>
  );
}

/** A strip of the district; `variant` changes the arrangement a little. */
export function Skyline({ width, height = 120, variant = 0, opacity = 1 }: { width: number | string; height?: number; variant?: number; opacity?: number }) {
  const a = variant % 2 === 0;
  return (
    <Svg width={width} height={height} viewBox="0 0 400 130" preserveAspectRatio="xMidYMax slice" style={{ opacity }}>
      <House x={a ? 4 : 10} w={46} h={44} />
      <Palm x={a ? 66 : 70} h={52} />
      <House x={a ? 82 : 90} w={36} h={30} c={SAND2} />
      <Mosque x={a ? 128 : 230} />
      <House x={a ? 200 : 124} w={52} h={50} />
      <Palm x={a ? 264 : 190} h={44} />
      <House x={a ? 280 : 290} w={40} h={36} c={SAND2} />
      <Palm x={a ? 336 : 344} h={56} />
      <House x={a ? 350 : 356} w={48} h={42} />
      <Walker x={a ? 72 : 300} /><Walker x={a ? 186 : 112} />
      <Rect x={0} y={120} width={400} height={10} fill="#EFE5D2" />
      <Path d="M0 125 H400" stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="10 8" />
    </Svg>
  );
}
