import Svg, { Path } from 'react-native-svg';

// 24x24 stroke icons, the same paths as the prototype.
export const ICON = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM9 8h6M9 12h6',
  doc: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  pin: 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  car: 'M4 16v-4l2-5h12l2 5v4zM7 16v2M17 16v2',
  people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 7a3 3 0 1 1 0 6M22 21c0-3-2-5-5-5',
  check: 'M20 6L9 17l-5-5',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  diag: 'M17 7L7 17M7 9v8h8',
  walk: 'M13 4a1.5 1.5 0 1 0 0-.01M9 21l2-6 3 3v3M7 12l3-3 3 2 3 1',
  spark: 'M12 3v6M12 15v6M3 12h6M15 12h6',
  game: 'M6 9h12a4 4 0 0 1 0 8l-2-2H8l-2 2a4 4 0 0 1 0-8zM8 12v2M7 13h2M15 12h.01M17 14h.01',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  plus: 'M12 5v14M5 12h14',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  micOff: 'M3 3l18 18M9 9v3a3 3 0 0 0 5 2M15 10V6a3 3 0 0 0-6-.5M5 11a7 7 0 0 0 11 5.7M19 11a7 7 0 0 1-.6 2.8M12 18v3',
  phone: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z',
  chat: 'M4 5h16v11H9l-5 4z',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  close: 'M6 6l12 12M18 6L6 18',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  text: 'M4 7V5h16v2M12 5v14M9 19h6',
  map: 'M9 4l6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14',
  tree: 'M12 21v-7M12 14c-3-1-5-3.5-5-6.5a5 5 0 0 1 10 0c0 3-2 5.5-5 6.5zM8 21h8',
};

export function Icon({ d, size = 20, color = '#173F42', width = 1.8 }: { d: string; size?: number; color?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
