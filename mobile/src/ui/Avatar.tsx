// Rufaida and Rafeed, drawn the same way as in the presentation design, with the person's own choices
// (hair, hijab, ghutra or shemagh, beard, skin, expression, glasses, colours). Saved per voice.
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useApp } from '../store';

export interface AvF { hair: string; hairC: string; skin: string; bg: string; outfit: string; expr: string; clip: boolean; glasses: boolean }
export interface AvM { head: string; hairC: string; skin: string; bg: string; beard: string; expr: string; glasses: boolean }
export const AVF: AvF = { hair: 'long', hairC: '#3B2418', skin: '#F7DCC8', bg: '#2E7AA0', outfit: '#5BA9C9', expr: 'happy', clip: true, glasses: false };
export const AVM: AvM = { head: 'ghutra', hairC: '#1E1A18', skin: '#DCEEF7', bg: '#2E7AA0', beard: 'none', expr: 'happy', glasses: false };

const FACE_F = 'M30 46 C30 33 38 28 50 28 C62 28 70 33 70 46 L70 57 C70 71 61 80 50 80 C39 80 30 71 30 57 Z';
const FACE_M = 'M29 56 C29 42 38 34 50 34 C62 34 71 42 71 56 C71 70 62 80 50 80 C38 80 29 70 29 56 Z';
const TOP_F = 'M28 50 C26 27 38 18 50 18 C62 18 74 27 72 50 C70 41 64 37 50 37 C36 37 30 41 28 50 Z';
const HAIR: Record<string, [string, string, string]> = {
  long: ['M23 98 L23 44 C23 22 36 13 50 13 C64 13 77 22 77 44 L77 98 Z', TOP_F, ''],
  bob: ['M24 74 L24 44 C24 22 36 14 50 14 C64 14 76 22 76 44 L76 74 C72 78 68 76 66 72 L34 72 C32 76 28 78 24 74 Z', TOP_F, ''],
  bun: ['', TOP_F, 'M40 14 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 Z'],
  pony: ['', TOP_F, 'M70 28 C88 34 90 66 78 84 C76 66 74 50 66 38 Z'],
  curly: ['M20 84 C10 74 14 60 22 56 C14 46 20 30 32 28 C34 14 48 10 56 16 C68 10 80 20 78 32 C88 38 88 54 80 58 C88 66 86 80 78 84 Z',
    'M28 50 C25 36 30 24 40 22 C44 16 56 16 60 22 C70 24 75 36 72 50 C70 42 64 38 50 38 C36 38 30 42 28 50 Z', ''],
  hijab: ['M17 100 C15 52 28 15 50 15 C72 15 85 52 83 100 Z', 'M29 52 C28 31 38 21 50 21 C62 21 72 31 71 52 C69 41 62 35 50 35 C38 35 31 41 29 52 Z', ''],
};
const BEARD: Record<string, string> = {
  none: '', short: 'M31 60 C32 74 40 81 50 81 C60 81 68 74 69 60 C66 69 59 73 50 73 C41 73 34 69 31 60 Z',
  full: 'M29 54 C29 77 39 87 50 87 C61 87 71 77 71 54 C68 66 60 71 50 71 C40 71 32 66 29 54 Z',
};
type Ex = { eyeL: string; eyeR: string; dotL: number; dotR: number; mouth: string; filled: boolean; dark?: boolean };
const expr = (male: boolean): Record<string, Ex> => ({
  happy: { eyeL: 'M37 56 Q41.5 51 46 56', eyeR: 'M54 56 Q58.5 51 63 56', dotL: 0, dotR: 0, mouth: male ? 'M41 64 Q50 73 59 64' : 'M43 65 Q50 73 57 65 Q50 68 43 65 Z', filled: !male },
  smile: { eyeL: '', eyeR: '', dotL: 2.5, dotR: 2.5, mouth: 'M44 66 Q50 71 56 66', filled: false },
  laugh: { eyeL: 'M37 56 Q41.5 51 46 56', eyeR: 'M54 56 Q58.5 51 63 56', dotL: 0, dotR: 0, mouth: 'M42 63 Q50 76 58 63 Z', filled: true, dark: true },
  wink: { eyeL: 'M37 56 Q41.5 51 46 56', eyeR: '', dotL: 0, dotR: 2.5, mouth: 'M44 65 Q50 71 56 65', filled: false },
  wow: { eyeL: '', eyeR: '', dotL: 2.9, dotR: 2.9, mouth: 'M46.5 68 a3.5 4 0 1 0 7 0 a3.5 4 0 1 0 -7 0 Z', filled: true, dark: true },
  calm: { eyeL: 'M37 55 Q41.5 58.5 46 55', eyeR: 'M54 55 Q58.5 58.5 63 55', dotL: 0, dotR: 0, mouth: 'M46 67 Q50 69 54 67', filled: false },
});

/** The drawing for one voice and set of choices. `talking` swaps to a laughing face while speaking. */
export function AvatarSvg({ voice, f, m, size = 46, talking }: { voice: 'f' | 'm'; f?: Partial<AvF>; m?: Partial<AvM>; size?: number; talking?: boolean }) {
  const male = voice === 'm';
  const A = male ? { ...AVM, ...m } : { ...AVF, ...f };
  const E = expr(male);
  const ex = E[talking ? (A.expr === 'laugh' ? 'happy' : 'laugh') : A.expr] ?? E.happy;
  let back = '', backFill = '', body = '', bodyFill = '', face = '', beard = '', top = '', topFill = '', extra = '', igal = '', clip = false, ink = '', mouthC = '';
  if (!male) {
    const a = A as AvF; const H = HAIR[a.hair] ?? HAIR.long;
    back = H[0]; backFill = a.hairC; body = 'M26 100 C28 88 37 83 50 83 C63 83 72 88 74 100 Z'; bodyFill = a.outfit; face = FACE_F;
    top = H[1]; topFill = a.hairC; extra = H[2]; clip = a.clip && a.hair !== 'hijab'; ink = '#1E2A32'; mouthC = '#D25C6A';
  } else {
    const a = A as AvM; const has = a.head !== 'none'; const wrap = a.head === 'shemagh' ? '#C8443A' : '#FFFFFF';
    back = has ? 'M14 100 C12 48 28 18 50 18 C72 18 88 48 86 100 L72 100 C74 64 66 46 50 46 C34 46 26 64 28 100 Z' : ''; backFill = wrap;
    body = 'M24 100 C26 87 36 82 50 82 C64 82 74 87 76 100 Z'; bodyFill = '#F5F7F7'; face = FACE_M; beard = BEARD[a.beard] ?? '';
    top = has ? 'M28 52 C27 32 37 22 50 22 C63 22 73 32 72 52 C68 44 60 40 50 40 C40 40 32 44 28 52 Z' : 'M29 52 C27 33 38 26 50 26 C62 26 73 33 71 52 C69 43 62 38 50 38 C38 38 31 43 29 52 Z';
    topFill = has ? wrap : a.hairC; igal = has ? 'M27 34 Q50 22 73 34 M28 41 Q50 30 72 41' : ''; ink = '#17303A'; mouthC = '#5E7C86';
  }
  const mouthFill = ex.filled ? (ex.dark ? '#8A2F3A' : mouthC) : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: size / 2, overflow: 'hidden' }}>
      <Rect x="0" y="0" width="100" height="100" fill={A.bg} />
      {!!back && <Path d={back} fill={backFill} />}
      <Rect x="44" y="74" width="12" height="12" fill={A.skin} />
      <Path d={body} fill={bodyFill} />
      <Path d={face} fill={A.skin} />
      {!!beard && <Path d={beard} fill={A.hairC} />}
      <Path d={top} fill={topFill} />
      {!!extra && <Path d={extra} fill={A.hairC} />}
      {!!igal && <Path d={igal} fill="none" stroke="#17303A" strokeWidth={4} strokeLinecap="round" />}
      {!male && <><Circle cx="37" cy="65" r="4.5" fill="#F2A7A0" fillOpacity={0.75} /><Circle cx="63" cy="65" r="4.5" fill="#F2A7A0" fillOpacity={0.75} /></>}
      {!!ex.eyeL && <Path d={ex.eyeL} fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />}
      {!!ex.eyeR && <Path d={ex.eyeR} fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />}
      {ex.dotL > 0 && <Circle cx="41.5" cy="55" r={ex.dotL} fill={ink} />}
      {ex.dotR > 0 && <Circle cx="58.5" cy="55" r={ex.dotR} fill={ink} />}
      <Path d={ex.mouth} fill={mouthFill} stroke={ex.filled ? 'none' : mouthC} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {clip && <><Circle cx="67" cy="33" r="4.2" fill="#F4B183" /><Circle cx="67" cy="33" r="1.6" fill="#FFFFFF" /></>}
      {A.glasses && <G fill="none" stroke="#173F42" strokeWidth={1.8}><Circle cx="41.5" cy="55" r="6" /><Circle cx="58.5" cy="55" r="6" /><Path d="M47.5 55h5" /></G>}
    </Svg>
  );
}

/** The assistant as the person has set them up. */
export function Avatar({ size = 46, talking }: { size?: number; talking?: boolean }) {
  const voice = useApp((s) => s.voice);
  const av = useApp((s) => s.avatar);
  return <AvatarSvg voice={voice} f={av.f} m={av.m} size={size} talking={talking} />;
}
