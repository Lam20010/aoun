// «حيّ عون»: the neighbourhood game from the presentation design. Help neighbours (walk Abu Nasser to the
// clinic, fix the potholes, find Salman a step-free path, remind grandma Latifa to drink water), play
// quick activities, collect coins, and build the district: houses, a park, a pharmacy, a clinic.
// One daily task is real: "complete a health step" is done when the person's appointment is confirmed.
// The same game, in a short calm mode, is «وقت الإبرة؟»: something to do with your hands while waiting.

export interface Game {
  pts: number; done: Record<string, boolean>; up: Record<string, boolean>; plots: Record<string, string>;
  coinsTaken: string[]; collected: number; claimed: Record<string, boolean>; actsDone: Record<string, boolean>; day: string;
}
export const GAME0 = (day: string): Game => ({ pts: 300, done: {}, up: {}, plots: {}, coinsTaken: [], collected: 0, claimed: {}, actsDone: {}, day });

/** A new day: coins come back and the daily rewards can be claimed again. Neighbours, buildings and upgrades stay. */
export function freshDay(g: Game, day: string): Game {
  return g.day === day ? g : { ...g, day, coinsTaken: [], collected: 0, claimed: {}, actsDone: {} };
}

type L2 = { ar: string; en: string };
export interface Npc { i: string; name: L2; ask: L2; how: L2; thanks: L2; type: 'drag' | 'tap' | 'voice'; goal?: L2; phrase?: L2; c: string; gain: number }
export const NPC: Record<string, Npc> = {
  nasser: { i: 'ن', c: '#59C2F9', gain: 100, type: 'drag',
    name: { ar: 'العم أبو ناصر', en: 'Uncle Abu Nasser' }, ask: { ar: 'يا جاري، تساعدني أوصل العيادة؟ رجلي تعبانة اليوم.', en: 'Neighbour, can you help me get to the clinic? My leg is tired today.' },
    how: { ar: 'اسحبيه على الطريق لين العيادة، أو اضغطي على العيادة', en: 'Drag him along the road to the clinic, or tap the clinic' }, goal: { ar: 'العيادة', en: 'Clinic' },
    thanks: { ar: 'الله يجزاك خير! وصلت بالسلامة.', en: 'Bless you! I made it safely.' } },
  umfahad: { i: 'ف', c: '#E2D36B', gain: 100, type: 'tap',
    name: { ar: 'أم فهد', en: 'Umm Fahad' }, ask: { ar: 'الطريق فيه حفر، ممكن ترتّبين لي طريق آمن؟', en: 'The road has potholes. Can you make me a safe path?' },
    how: { ar: 'اضغطي على الحفر عشان تصلّحينها', en: 'Tap the potholes to fix them' }, thanks: { ar: 'صار الطريق آمن، تسلم يدك!', en: 'The road is safe now, thank you!' } },
  salman: { i: 'س', c: '#6C8CBF', gain: 120, type: 'drag',
    name: { ar: 'سلمان', en: 'Salman' }, ask: { ar: 'أبي أروح الحديقة بكرسيّ، تدليني على ممر سهل؟', en: 'I want to go to the park in my wheelchair. Can you show me an easy path?' },
    how: { ar: 'اسحبيه على الممر لين الحديقة، أو اضغطي على الحديقة', en: 'Drag him along the path to the park, or tap the park' }, goal: { ar: 'الحديقة', en: 'Park' },
    thanks: { ar: 'أخيرًا وصلت الحديقة! شكرًا.', en: 'Finally at the park! Thanks.' } },
  latifa: { i: 'ل', c: '#BAC94A', gain: 80, type: 'voice',
    name: { ar: 'الجدة لطيفة', en: 'Grandma Latifa' }, ask: { ar: 'يا بنتي، ذكّريني أشرب موية، دايم أنسى.', en: 'Dear, remind me to drink water, I always forget.' },
    how: { ar: 'اضغطي وقوليها بصوتك', en: 'Press and say it out loud' }, phrase: { ar: 'قولي: «يلا يا جدة نشرب موية»', en: 'Say: "Come on grandma, let\'s drink some water"' },
    thanks: { ar: 'تسلمين! شربت كاسة كاملة.', en: 'Thank you! I drank a whole glass.' } },
};
export const NPC_ORDER = ['nasser', 'salman', 'umfahad', 'latifa'];

export interface Act { t: L2; how: L2; thanks: L2; type: 'fall' | 'tap' | 'move'; need: number; gain: number; c: string; icon: string }
export const ACTS: Record<string, Act> = {
  dates: { type: 'fall', need: 10, gain: 40, c: '#E2D36B', icon: 'M12 4c4 0 6 4 6 9s-3 8-6 8-6-3-6-8 2-9 6-9zM12 4c0-1 1-2 2-2',
    t: { ar: 'اجمعي التمر', en: 'Catch the dates' }, how: { ar: 'اضغطي على حبات التمر قبل ما تطيح', en: 'Tap the dates before they fall' }, thanks: { ar: 'أحسنتِ! جمعتِ التمر كله.', en: 'Well done! You caught them all.' } },
  litter: { type: 'tap', need: 7, gain: 30, c: '#59C2F9', icon: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    t: { ar: 'نظّفي الحي', en: 'Clean the street' }, how: { ar: 'اضغطي على المخلّفات عشان ينظف الشارع', en: 'Tap the litter to clean the street' }, thanks: { ar: 'الشارع صار نظيف، يعطيك العافية!', en: 'The street is clean, thank you!' } },
  boxes: { type: 'move', need: 3, gain: 50, c: '#EADFB8', icon: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
    t: { ar: 'وصّلي الأغراض', en: 'Deliver the boxes' }, how: { ar: 'اسحبي الصناديق لسيارة التوصيل، أو اضغطي على السيارة', en: 'Drag the boxes to the van, or tap the van' }, thanks: { ar: 'وصلت الأغراض للجيران، شكرًا!', en: 'The neighbours got their things, thanks!' } },
  plant: { type: 'move', need: 3, gain: 60, c: '#BAC94A', icon: 'M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7',
    t: { ar: 'ازرعي الأشجار', en: 'Plant trees' }, how: { ar: 'اسحبي الشتلات للحفر، أو اضغطي على الحفرة', en: 'Drag the saplings into the holes, or tap a hole' }, thanks: { ar: 'حديقتك صارت أخضر، تسلم يدك!', en: 'Your park is greener, thank you!' } },
};

export const BUILD: Record<string, { t: L2; cost: number }> = {
  house: { t: { ar: 'منزل', en: 'House' }, cost: 250 }, park: { t: { ar: 'حديقة', en: 'Park' }, cost: 300 },
  pharmacy: { t: { ar: 'صيدلية', en: 'Pharmacy' }, cost: 450 }, clinic: { t: { ar: 'عيادة', en: 'Clinic' }, cost: 500 },
};
export const SHOP: [string, L2, number][] = [
  ['trees', { ar: 'أشجار', en: 'Trees' }, 120], ['path', { ar: 'ممر ميسّر للجميع', en: 'Step-free path' }, 200],
  ['bench', { ar: 'مقاعد وإنارة', en: 'Benches and lights' }, 100], ['clinicUp', { ar: 'تطوير العيادة', en: 'Upgrade the clinic' }, 300],
];
export const ICON_COL: Record<string, string[]> = {
  house: ['#6C8CBF', '#FBF6E4', '#EADFB8', '#59C2F9'], park: ['#BAC94A', '#CFE08A', '#B4C45A', '#3BA6E0'], pharmacy: ['#F3F9FD', '#FFFFFF', '#E1E7EA', '#BAC94A'],
  clinic: ['#F3F9FD', '#FFFFFF', '#E1E7EA', '#3BA6E0'], trees: ['#59C2F9', '#BAC94A', '#3BA6E0', '#3BA6E0'], path: ['#E2D36B', '#F6F0C4', '#E8DC8C', '#FFFFFF'],
  bench: ['#E2D36B', '#FBF6E4', '#EADFB8', '#E2D36B'], clinicUp: ['#6C8CBF', '#FFFFFF', '#E1E7EA', '#3BA6E0'],
};

export function level(g: Game) {
  return Math.min(9, 1 + Object.keys(g.plots).length + Object.keys(g.done).length + Math.floor(Object.keys(g.actsDone).length / 2));
}

export function daily(g: Game, healthDone: boolean) {
  const helped = Object.keys(g.done).length;
  return [
    { k: 'help', t: { ar: 'ساعدي جارًا', en: 'Help a neighbour' }, v: Math.min(helped, 1), max: 1, rw: 100 },
    { k: 'health', t: { ar: 'أكملي خطوة صحية (أكّدي موعدك)', en: 'Take a health step (confirm your visit)' }, v: healthDone ? 1 : 0, max: 1, rw: 150 },
    { k: 'coins', t: { ar: 'اجمعي العملات', en: 'Collect coins' }, v: Math.min(g.collected, 3), max: 3, rw: 50 },
    { k: 'play', t: { ar: 'العبي نشاطًا', en: 'Play an activity' }, v: Math.min(Object.keys(g.actsDone).length, 1), max: 1, rw: 60 },
  ];
}

// ---------- the isometric district, in a 393 x 852 canvas ----------
export const W = 393, H = 852;
type Pt = [number, number];
export interface Scene {
  polys: { p: string; f: string; s: string; w: number; dash?: string }[];
  lines: { x1: number; y1: number; x2: number; y2: number; c: string; w: number; dash?: string }[];
  circles: { x: number; y: number; r: number; f: string }[];
  texts: { x: number; y: number; t: string; fs: number; c: string }[];
  plots: { key: string; x: number; y: number }[]; locks: { x: number; y: number }[];
  coins: { key: string; x: number; y: number }[]; npcs: { key: string; x: number; y: number }[];
}
const LAYOUT: Record<string, string> = { '0,0': 'my', '1,0': 'clinic0', '2,0': 'nasser', '0,1': 'umfahad', '1,1': 'latifa', '2,1': 'plotA', '0,2': 'salman', '1,2': 'plotB', '2,2': 'plotC' };

export function buildScene(g: Game, lang: 'ar' | 'en'): Scene {
  const unlocked = level(g) >= 5;
  const a = 27, ox = 196, oy = 372, P = (x: number, y: number): Pt => [ox + (x - y) * a, oy + (x + y) * a / 2];
  const pt = (q: Pt[]) => q.map((v) => v[0].toFixed(1) + ',' + v[1].toFixed(1)).join(' ');
  const up = (q: Pt, h: number): Pt => [q[0], q[1] - h];
  const S: Scene = { polys: [], lines: [], circles: [], texts: [], plots: [], locks: [], coins: [], npcs: [] };
  const poly = (q: Pt[], f: string, s = 'none', w = 0, dash = '') => S.polys.push({ p: pt(q), f, s, w, dash });
  const dia = (x0: number, y0: number, w: number, d: number): Pt[] => [P(x0, y0), P(x0 + w, y0), P(x0 + w, y0 + d), P(x0, y0 + d)];
  const box = (x0: number, y0: number, w: number, d: number, h: number, cTop: string, cL: string, cR: string, deco?: (FL: (u: number, v: number) => Pt, FR: (u: number, v: number) => Pt) => void): Pt => {
    const A = P(x0, y0), B = P(x0 + w, y0), C = P(x0 + w, y0 + d), D = P(x0, y0 + d);
    poly([D, C, up(C, h), up(D, h)], cL); poly([B, C, up(C, h), up(B, h)], cR); poly([up(A, h), up(B, h), up(C, h), up(D, h)], cTop);
    const FL = (u: number, v: number): Pt => { const q = P(x0 + u * w, y0 + d); return [q[0], q[1] - v * h]; };
    const FR = (u: number, v: number): Pt => { const q = P(x0 + w, y0 + u * d); return [q[0], q[1] - v * h]; };
    if (deco) deco(FL, FR);
    const top = P(x0 + w / 2, y0 + d / 2); return [top[0], top[1] - h];
  };
  const tree = (x: number, y: number, c = '#3BA6E0', r = 8) => { const q = P(x, y); S.lines.push({ x1: q[0], y1: q[1], x2: q[0], y2: q[1] - 10, c: '#7A5434', w: 3 }); S.circles.push({ x: q[0], y: q[1] - 14 - r / 2, r, f: c }); };
  const lamp = (x: number, y: number) => { const q = P(x, y); S.lines.push({ x1: q[0], y1: q[1], x2: q[0], y2: q[1] - 20, c: '#0E2E45', w: 2 }); S.circles.push({ x: q[0], y: q[1] - 22, r: 3.5, f: '#E2D36B' }); };
  poly(dia(-0.4, -0.4, 8.8, 8.8), '#DDE6A8');
  poly(dia(0, 0, 8, 8), '#C9D0D2');
  [2.5, 5.5].forEach((k) => { const p1 = P(k, 0), p2 = P(k, 8), p3 = P(0, k), p4 = P(8, k);
    S.lines.push({ x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], c: '#FFFFFF', w: 1.6, dash: '6 6' }); S.lines.push({ x1: p3[0], y1: p3[1], x2: p4[0], y2: p4[1], c: '#FFFFFF', w: 1.6, dash: '6 6' }); });
  const houseDeco = (FL: (u: number, v: number) => Pt, FR: (u: number, v: number) => Pt) => {
    poly([FL(0.38, 0), FL(0.62, 0), FL(0.62, 0.55), FL(0.38, 0.55)], '#7A5434'); poly([FR(0.3, 0.45), FR(0.65, 0.45), FR(0.65, 0.78), FR(0.3, 0.78)], '#59C2F9'); };
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const blocks = Object.keys(LAYOUT).sort((p, q) => { const [a1, b1] = p.split(',').map(Number), [a2, b2] = q.split(',').map(Number); return (a1 + b1) - (a2 + b2); });
  blocks.forEach((key) => {
    const [bx, by] = key.split(',').map(Number), x0 = bx * 3, y0 = by * 3, kind = LAYOUT[key];
    const plotKind = kind.startsWith('plot') ? (g.plots[kind] || null) : null;
    const isEmpty = kind.startsWith('plot') && !plotKind, locked = kind === 'plotC' && !unlocked && !plotKind;
    poly(dia(x0 - 0.15, y0 - 0.15, 2.3, 2.3), '#EFE7CC');
    poly(dia(x0, y0, 2, 2), isEmpty ? '#F3EBB5' : plotKind === 'park' ? '#CFE08A' : '#DDE6A8');
    if (g.up.path) poly(dia(x0 - 0.1, y0 - 0.1, 2.2, 2.2), 'none', '#E2D36B', 3);
    const center = P(x0 + 1, y0 + 1);
    if (isEmpty) {
      poly(dia(x0 + 0.2, y0 + 0.2, 1.6, 1.6), 'none', locked ? '#B8C0C7' : '#FFFFFF', 2, '5 4');
      if (locked) S.locks.push({ x: center[0], y: center[1] }); else S.plots.push({ key: kind, x: center[0], y: center[1] });
      return;
    }
    let topPt: Pt;
    if (kind === 'my') { topPt = box(x0 + 0.4, y0 + 0.4, 1.2, 1.2, 26, '#3BA6E0', '#FBF6E4', '#EADFB8', houseDeco); tree(x0 + 0.2, y0 + 1.8, '#59C2F9', 7); S.texts.push({ x: topPt[0], y: topPt[1] - 6, t: T('بيتك', 'Home'), fs: 11, c: '#002336' }); }
    else if (kind === 'clinic0' || plotKind === 'clinic') {
      const h = kind === 'clinic0' && g.up.clinicUp ? 48 : 34;
      topPt = box(x0 + 0.25, y0 + 0.25, 1.5, 1.5, h, '#F3F9FD', '#FFFFFF', '#E1E7EA', (FL, FR) => {
        poly([FL(0.05, 0.72), FL(0.95, 0.72), FL(0.95, 0.95), FL(0.05, 0.95)], '#3BA6E0'); poly([FL(0.42, 0), FL(0.58, 0), FL(0.58, 0.45), FL(0.42, 0.45)], '#59C2F9');
        poly([FR(0.15, 0.3), FR(0.4, 0.3), FR(0.4, 0.6), FR(0.15, 0.6)], '#59C2F9'); poly([FR(0.6, 0.3), FR(0.85, 0.3), FR(0.85, 0.6), FR(0.6, 0.6)], '#59C2F9'); });
      S.texts.push({ x: topPt[0], y: topPt[1] - 8, t: kind === 'clinic0' ? T('العيادة', 'Clinic') : T('عيادة', 'Clinic'), fs: 12, c: '#1E86C4' });
      S.circles.push({ x: topPt[0], y: topPt[1] + 10, r: 7, f: '#3BA6E0' });
      S.lines.push({ x1: topPt[0] - 4, y1: topPt[1] + 10, x2: topPt[0] + 4, y2: topPt[1] + 10, c: '#FFFFFF', w: 2.4 });
      S.lines.push({ x1: topPt[0], y1: topPt[1] + 6, x2: topPt[0], y2: topPt[1] + 14, c: '#FFFFFF', w: 2.4 });
    } else if (plotKind === 'pharmacy') {
      topPt = box(x0 + 0.3, y0 + 0.3, 1.4, 1.4, 28, '#F3F9FD', '#FFFFFF', '#E1E7EA', (FL) => {
        poly([FL(0.05, 0.7), FL(0.95, 0.7), FL(0.95, 0.95), FL(0.05, 0.95)], '#BAC94A'); poly([FL(0.4, 0), FL(0.6, 0), FL(0.6, 0.45), FL(0.4, 0.45)], '#59C2F9'); });
      S.texts.push({ x: topPt[0], y: topPt[1] - 6, t: T('صيدلية', 'Pharmacy'), fs: 11, c: '#4B5512' });
    } else if (plotKind === 'park') {
      tree(x0 + 0.5, y0 + 0.6, '#3BA6E0', 9); tree(x0 + 1.4, y0 + 0.5, '#BAC94A', 8); tree(x0 + 1.5, y0 + 1.5, '#59C2F9', 9); tree(x0 + 0.6, y0 + 1.5, '#BAC94A', 7);
      const b1 = P(x0 + 0.9, y0 + 1.0), b2 = P(x0 + 1.3, y0 + 1.0); S.lines.push({ x1: b1[0], y1: b1[1] - 4, x2: b2[0], y2: b2[1] - 4, c: '#7A5434', w: 4 });
      topPt = P(x0 + 1, y0 + 1); S.texts.push({ x: topPt[0], y: topPt[1] + 22, t: T('حديقة', 'Park'), fs: 11, c: '#4B5512' });
    } else {
      const npc = NPC[kind];
      topPt = box(x0 + 0.4, y0 + 0.4, 1.2, 1.2, 24, npc ? npc.c : '#6C8CBF', '#FBF6E4', '#EADFB8', houseDeco);
      tree(x0 + 1.8, y0 + 0.2, '#BAC94A', 7);
      if (npc) S.npcs.push({ key: kind, x: topPt[0], y: topPt[1] - 4 });
    }
    if (g.up.trees) tree(x0 + 1.9, y0 + 1.9, '#3BA6E0', 7);
    const coinKey = kind === 'my' || kind === 'clinic0' || (kind.startsWith('plot') && plotKind) ? kind : null;
    if (coinKey && !g.coinsTaken.includes(coinKey)) S.coins.push({ key: coinKey, x: topPt[0] + (kind === 'clinic0' ? -34 : kind === 'my' ? 30 : 0), y: topPt[1] - (kind === 'my' ? 2 : 18) });
  });
  ([[-0.9, 1.5], [-0.9, 4.5], [8.6, 2], [8.6, 6], [3, -0.9], [7, -0.9], [1, 8.7], [6, 8.7]] as Pt[]).forEach(([x, y], i) => tree(x, y, ['#3BA6E0', '#BAC94A', '#59C2F9'][i % 3], 9));
  if (g.up.bench) ([[2.2, 2.2], [5.2, 2.2], [2.2, 5.2], [5.2, 5.2], [2.2, 7.8], [7.8, 2.2]] as Pt[]).forEach(([x, y]) => lamp(x, y));
  return S;
}
