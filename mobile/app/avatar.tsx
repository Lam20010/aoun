// «شكل رفيدة»: choose how the assistant looks (saved on the phone and on the server).
import { Pressable, Switch, View } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { AVF, AVM, AvatarSvg } from '../src/ui/Avatar';
import { Button, Card, Row, Txt } from '../src/ui/kit';
import { C } from '../src/theme';
import { useT } from '../src/i18n';
import { useApp } from '../src/store';
import { saveSoon } from '../src/api';

type Opt = [string, string, string];   // value, Arabic, English
const EXPR_F: Opt[] = [['happy', 'مبتسمة', 'Happy'], ['smile', 'ابتسامة', 'Smile'], ['laugh', 'تضحك', 'Laughing'], ['wink', 'غمزة', 'Wink'], ['wow', 'متفاجئة', 'Surprised'], ['calm', 'هادية', 'Calm']];
const EXPR_M: Opt[] = [['happy', 'مبتسم', 'Happy'], ['smile', 'ابتسامة', 'Smile'], ['laugh', 'يضحك', 'Laughing'], ['wink', 'غمزة', 'Wink'], ['wow', 'متفاجئ', 'Surprised'], ['calm', 'هادي', 'Calm']];
const SKIN: Opt[] = [['#F7DCC8', 'فاتح', 'Light'], ['#E8B994', 'حنطي', 'Wheat'], ['#C98E66', 'أسمر', 'Tan'], ['#8D5A3B', 'داكن', 'Dark']];
const BG: Opt[] = [['#2E7AA0', 'الأصلي', 'Original'], ['#5AA7A7', 'تركوازي', 'Teal'], ['#96D7C6', 'نعناعي', 'Mint'], ['#6C8CBF', 'أزرق', 'Blue'], ['#BAC94A', 'زيتوني', 'Olive'], ['#E2D36B', 'أصفر', 'Yellow']];
const HAIRC: Opt[] = [['#3B2418', 'بني غامق', 'Dark brown'], ['#1E1A18', 'أسود', 'Black'], ['#6B4226', 'بني', 'Brown'], ['#8A3B24', 'كستنائي', 'Auburn'], ['#C79A5B', 'عسلي', 'Honey']];
const HIJAB: Opt[] = [['#2F7F80', 'تركوازي', 'Teal'], ['#173F42', 'كحلي', 'Navy'], ['#1E1A18', 'أسود', 'Black'], ['#6C8CBF', 'أزرق', 'Blue'], ['#E9E4D8', 'بيج', 'Beige']];
const OUTFIT: Opt[] = [['#5BA9C9', 'الأصلي', 'Original'], ['#BAC94A', 'زيتوني', 'Olive'], ['#E2D36B', 'أصفر', 'Yellow'], ['#F2A7A0', 'وردي', 'Pink'], ['#FFFFFF', 'أبيض', 'White']];

export default function AvatarScreen() {
  const { lang } = useT();
  const T = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  const voice = useApp((s) => s.voice);
  const av = useApp((s) => s.avatar);
  const set = useApp((s) => s.set);
  const male = voice === 'm';
  const cur: Record<string, unknown> = male ? { ...AVM, ...av.m } : { ...AVF, ...av.f };
  const put = (patch: Record<string, unknown>) => {
    set({ avatar: male ? { ...av, m: { ...av.m, ...patch } } : { ...av, f: { ...av.f, ...patch } } });
    saveSoon({ avatar: true });
  };
  const reset = () => { set({ avatar: male ? { ...av, m: {} } : { ...av, f: {} } }); saveSoon({ avatar: true }); };
  const lbl = (o: Opt) => (lang === 'ar' ? o[1] : o[2]);

  const chips = (title: string, key: string, list: Opt[]) => (
    <View style={{ gap: 8 }}>
      <Txt size={14} weight="700">{title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {list.map((o) => { const on = cur[key] === o[0];
          return (
            <Pressable key={o[0]} onPress={() => put({ [key]: o[0] })} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: on ? C.tealMid : C.white, borderWidth: 1.5, borderColor: on ? C.tealMid : '#CFE7E0' }}>
              <Txt size={13} weight="700" color={on ? C.dark : C.ink}>{lbl(o)}</Txt>
            </Pressable>
          ); })}
      </View>
    </View>
  );
  const colors = (title: string, key: string, list: Opt[]) => (
    <View style={{ gap: 8 }}>
      <Txt size={14} weight="700">{title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {list.map((o) => { const on = cur[key] === o[0];
          return <Pressable key={o[0]} onPress={() => put({ [key]: o[0] })} accessibilityLabel={lbl(o)} accessibilityState={{ selected: on }}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: o[0], borderWidth: 3, borderColor: on ? C.ink : '#DDE9E6' }} />; })}
      </View>
    </View>
  );
  const toggle = (title: string, key: string) => (
    <Row style={{ justifyContent: 'space-between' }}><Txt size={14} weight="700">{title}</Txt>
      <Switch value={!!cur[key]} onValueChange={(v) => put({ [key]: v })} trackColor={{ true: C.teal, false: C.line }} /></Row>
  );

  return (
    <Screen title={T(male ? 'شكل رفيد' : 'شكل رفيدة', male ? 'Customize Rafeed' : 'Customize Rufaida')}>
      <View style={{ alignItems: 'center', paddingVertical: 6 }}>
        <AvatarSvg voice={voice} f={av.f} m={av.m} size={150} />
      </View>
      <Card style={{ gap: 16 }}>
        {male ? (
          <>
            {chips(T('غطاء الراس', 'Headwear'), 'head', [['ghutra', 'غترة', 'Ghutra'], ['shemagh', 'شماغ', 'Shemagh'], ['none', 'بدون', 'None']])}
            {chips(T('اللحية', 'Beard'), 'beard', [['none', 'بدون', 'None'], ['short', 'خفيفة', 'Short'], ['full', 'كاملة', 'Full']])}
            {colors(T('لون الشعر واللحية', 'Hair and beard'), 'hairC', HAIRC.slice(0, 4))}
            {chips(T('التعبير', 'Expression'), 'expr', EXPR_M)}
            {colors(T('لون البشرة', 'Skin'), 'skin', SKIN.concat([['#DCEEF7', 'الأصلي', 'Original']]))}
          </>
        ) : (
          <>
            {chips(T('الشعر', 'Hair'), 'hair', [['long', 'طويل', 'Long'], ['bob', 'قصير', 'Short'], ['bun', 'كعكة', 'Bun'], ['pony', 'ذيل حصان', 'Ponytail'], ['curly', 'مجعّد', 'Curly'], ['hijab', 'حجاب', 'Hijab']])}
            {colors(cur.hair === 'hijab' ? T('لون الحجاب', 'Hijab colour') : T('لون الشعر', 'Hair colour'), 'hairC', cur.hair === 'hijab' ? HIJAB : HAIRC)}
            {chips(T('التعبير', 'Expression'), 'expr', EXPR_F)}
            {colors(T('لون البشرة', 'Skin'), 'skin', SKIN)}
            {colors(T('لون الملابس', 'Outfit'), 'outfit', OUTFIT)}
          </>
        )}
        {colors(T('الخلفية', 'Background'), 'bg', BG)}
        {toggle(T('نظارة', 'Glasses'), 'glasses')}
        {!male && toggle(T('مشبك الورد', 'Flower clip'), 'clip')}
      </Card>
      <Button title={T(male ? 'رجّعه مثل الأصل' : 'رجّعيها مثل الأصل', 'Back to the original look')} tone="ghost" onPress={reset} />
    </Screen>
  );
}
