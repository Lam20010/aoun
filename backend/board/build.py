"""Build the Ministry board page served at /ministry/board.

Source: Ministry.dc.html (the board design from the presentation) + live.js (sign-in and live data).
Output: ../app/static/ministry.html (assets are in ../app/static/board/).

    python board/build.py
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent / "app" / "static" / "ministry.html"
BLOBS = {
    "/_blob/9696cd0a861bad1a76006865402e9335": "/ministry/board/ksa-regions.json",
    "/_blob/a4364b41dd1782f1148f76b39a3c3e5d": "/ministry/board/mark.png",
    "/_blob/c3f120709c9e954988ea455ebfa38543": "/ministry/board/wordmark.png",
}

LOGIN = """
<sc-if value="{{login.show}}" hint-placeholder-val="{{ false }}">
  <div style="position: fixed; inset: 0; z-index: 50; background: linear-gradient(135deg, #0D2A3D, #1574AD); display: flex; align-items: center; justify-content: center; padding: 16px; font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif" dir="rtl">
    <div style="width: 100%; max-width: 420px; background: #FFFFFF; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.25)">
      <div dir="ltr" style="display: flex; align-items: center; gap: 6px; align-self: flex-end">
        <img src="/ministry/board/lockup.png" alt="عون" style="height: 52px; width: auto">
      </div>
      <b style="font-size: 22px; color: #0E2E45">منصة وزارة الصحة</b>
      <span style="font-size: 14px; color: #4A5E6D; line-height: 1.7">ادخل برقمك الوظيفي وكلمة المرور. اللوحة تعرض أرقامًا مجمّعة فقط، وتخفي أي مجموعة أقل من 50 شخصًا.</span>
      <label style="font-size: 13px; color: #4A5E6D; display: flex; flex-direction: column; gap: 6px">رقم الموظف
        <input id="min-id" autocomplete="username" placeholder="M01" style="height: 46px; border-radius: 12px; border: 1px solid #DBE6EC; padding: 0 14px; font-size: 15px; font-family: inherit" dir="ltr"></label>
      <label style="font-size: 13px; color: #4A5E6D; display: flex; flex-direction: column; gap: 6px">كلمة المرور
        <input id="min-pw" type="password" autocomplete="current-password" style="height: 46px; border-radius: 12px; border: 1px solid #DBE6EC; padding: 0 14px; font-size: 15px; font-family: inherit" dir="ltr"></label>
      <sc-if value="{{login.hasErr}}" hint-placeholder-val="{{ false }}"><span role="alert" style="font-size: 13px; color: #8A2A1C; background: #FDE7E2; border-radius: 10px; padding: 8px 12px">{{login.err}}</span></sc-if>
      <button onClick="{{login.submit}}" style="height: 48px; border-radius: 14px; border: none; background: #1574AD; color: #FFFFFF; font-size: 16px; font-weight: 700; cursor: pointer">{{login.label}}</button>
      <span style="font-size: 12px; color: #7D8B96">خمس محاولات خاطئة توقف الدخول ربع ساعة.</span>
    </div>
  </div>
</sc-if>
"""

LIVE_PANEL = """
                <sc-if value="{{livePanel.show}}" hint-placeholder-val="{{ false }}">
                  <div style="background: #F2FAF7; border: 1px solid #CCE4EE; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px">
                    <div style="display: flex; align-items: center; gap: 8px"><span class="aoun-live" style="width: 9px; height: 9px; border-radius: 5px; background: #2E9BD6"></span><b style="font-size: 14px; color: #0E2E45">{{livePanel.title}}</b></div>
                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">
                      <sc-for list="{{livePanel.stats}}" as="ls" hint-placeholder-count="6">
                        <div style="background: #FFFFFF; border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column"><b style="font-size: 18px; color: #1574AD">{{ls.n}}</b><span style="font-size: 11px; color: #4A5E6D">{{ls.k}}</span></div>
                      </sc-for>
                    </div>
                    <sc-if value="{{livePanel.hasBars}}" hint-placeholder-val="{{ false }}">
                      <span style="font-size: 12px; color: #4A5E6D">الأسباب التي ذكرها السكان لرفيدة:</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 6px"><sc-for list="{{livePanel.bars}}" as="lb" hint-placeholder-count="3"><span style="font-size: 12px; background: #FBF5D6; color: #6B5A08; border-radius: 10px; padding: 4px 10px">{{lb.k}} · {{lb.n}}</span></sc-for></div>
                    </sc-if>
                    <span style="font-size: 11px; color: #7D8B96">{{livePanel.note}}</span>
                  </div>
                </sc-if>
"""

CALLS = r"""
    <!-- ================= صوت الأحياء ================= -->
    <sc-if value="{{is.calls}}" hint-placeholder-val="{{ false }}">
      <div style="display: flex; flex-direction: column; gap: 16px">
        <section style="background: linear-gradient(150deg, #1574AD 0%, #1E86C4 100%); color: #FFFFFF; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 12px">
          <b style="font-size: 20px">صوت الأحياء · لماذا لا يفحص الناس؟</b>
          <span style="font-size: 13px; line-height: 1.8; color: #E2EFF5">كل مكالمة من رفيدة ورفيد تُسجَّل كرمز سبب واحد وعدد للحي فقط: ما يُحفظ كلام الشخص ولا اسمه ولا رقمه. هنا تشوف السبب الأكثر في كل حي، والحل اللي خلّى الناس يحجزون فعلًا، وتعتمد التدخل بضغطة.</span>
          <sc-if value="{{ins.loading}}" hint-placeholder-val="{{ false }}"><span style="font-size: 13px">جاري التحميل…</span></sc-if>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px">
            <sc-for list="{{ins.kpis}}" as="ik" hint-placeholder-count="6">
              <div style="background: rgba(255,255,255,.14); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px">
                <b style="font-size: 22px">{{ik.n}}</b><span style="font-size: 12px; color: #D5E8F0">{{ik.k}}</span>
              </div>
            </sc-for>
          </div>
        </section>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px">
          <section style="background: rgba(255,255,255,.92); border-radius: 22px; padding: 18px; display: flex; flex-direction: column; gap: 10px">
            <b style="font-size: 16px; color: #0E2E45">أكثر الأسباب في الرياض</b>
            <span style="font-size: 12px; color: #4A5E6D">من {{ins.withReason}} شخص ذكر سببًا في المكالمة</span>
            <sc-for list="{{ins.reasons}}" as="ir" hint-placeholder-count="6">
              <div style="display: flex; flex-direction: column; gap: 4px">
                <div style="display: flex; justify-content: space-between; font-size: 13px"><span>{{ir.ar}}</span><b style="color: #1574AD">{{ir.n}}</b></div>
                <div style="height: 8px; border-radius: 4px; background: #E6EEF1; overflow: hidden"><div style="height: 100%; margin-left: auto; width: {{ir.w}}; background: {{ir.color}}; border-radius: 4px"></div></div>
              </div>
            </sc-for>
          </section>
          <section style="background: rgba(255,255,255,.92); border-radius: 22px; padding: 18px; display: flex; flex-direction: column; gap: 10px">
            <b style="font-size: 16px; color: #0E2E45">ماذا نجح؟</b>
            <span style="font-size: 12px; color: #4A5E6D">لكل سبب: الحل اللي حجز به أكثر الناس في النهاية</span>
            <sc-for list="{{ins.worked}}" as="iw" hint-placeholder-count="6">
              <div style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #F3F9FD; border-radius: 12px">
                <span style="flex: 1; font-size: 13px"><b>{{iw.ar}}</b><br><span style="color: #4A5E6D; font-size: 12px">{{iw.best}}</span></span>
                <b style="font-size: 18px; color: #1574AD">{{iw.pct}}</b>
              </div>
            </sc-for>
          </section>
        </div>

        <section style="background: rgba(255,255,255,.92); border-radius: 22px; padding: 18px; display: flex; flex-direction: column; gap: 10px">
          <b style="font-size: 16px; color: #0E2E45">خريطة الأسباب حسب الحي</b>
          <span style="font-size: 12px; color: #4A5E6D">النسبة من الناس اللي ذكروا سببًا في كل حي. «&lt;5» تعني مجموعة صغيرة مخفية للخصوصية.</span>
          <div style="overflow-x: auto">
            <div style="display: grid; grid-template-columns: 110px repeat({{ins.ncols}}, minmax(84px, 1fr)); gap: 4px; font-size: 12px; min-width: 720px">
              <span style="padding: 6px 8px; color: #4A5E6D; font-weight: 600">الحي</span>
              <sc-for list="{{ins.cols}}" as="ic" hint-placeholder-count="6"><span style="padding: 6px 4px; color: #4A5E6D; font-weight: 600; text-align: center; line-height: 1.4">{{ic.ar}}</span></sc-for>
              <sc-for list="{{ins.heatCells}}" as="cl" hint-placeholder-count="48">
                <span style="padding: 8px 6px; text-align: {{cl.align}}; border-radius: 8px; background: {{cl.bg}}; color: {{cl.ink}}; font-weight: {{cl.weight}}; white-space: nowrap">{{cl.t}}</span>
              </sc-for>
            </div>
          </div>
        </section>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px">
          <sc-for list="{{ins.cards}}" as="ix" hint-placeholder-count="8">
            <section style="background: rgba(255,255,255,.95); border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 10px">
              <div style="display: flex; align-items: baseline; justify-content: space-between"><b style="font-size: 17px; color: #0E2E45">حي {{ix.ar}}</b><span style="font-size: 12px; color: #4A5E6D">{{ix.en}}</span></div>
              <div style="display: flex; gap: 4px; font-size: 11px; color: #4A5E6D">
                <sc-for list="{{ix.funnel}}" as="fn" hint-placeholder-count="4">
                  <div style="flex: 1; background: #F0F5F7; border-radius: 10px; padding: 6px; display: flex; flex-direction: column; align-items: center"><b style="font-size: 15px; color: #1574AD">{{fn.n}}</b><span>{{fn.k}}</span></div>
                </sc-for>
              </div>
              <span style="font-size: 12px; color: #4A5E6D">ليش ما حجزوا من أول مرة:</span>
              <sc-for list="{{ix.top}}" as="tp" hint-placeholder-count="3">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px">
                  <span style="width: 120px">{{tp.ar}}</span>
                  <div style="flex: 1; height: 8px; border-radius: 4px; background: #EEF1F3; overflow: hidden"><div style="height: 100%; margin-left: auto; width: {{tp.w}}; background: {{tp.color}}"></div></div>
                  <b style="width: 40px; text-align: left; color: #0E2E45">{{tp.pct}}</b>
                </div>
              </sc-for>
              <sc-if value="{{ix.hasAsks}}" hint-placeholder-val="{{ true }}">
                <span style="font-size: 12px; color: #4A5E6D">وش طلبوا:</span>
                <div style="display: flex; flex-wrap: wrap; gap: 6px"><sc-for list="{{ix.asks}}" as="ak" hint-placeholder-count="4"><span style="font-size: 12px; background: #EEF2FA; color: #3D5F94; border-radius: 10px; padding: 4px 10px">{{ak}}</span></sc-for></div>
              </sc-if>
              <sc-if value="{{ix.hasSug}}" hint-placeholder-val="{{ true }}">
                <div style="background: #FFF8E6; border: 1px solid #F3E2B0; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px">
                  <b style="font-size: 13px; color: #6B5A08">المقترح: {{ix.sugTitle}}</b>
                  <span style="font-size: 12px; color: #6B5A08; line-height: 1.6">{{ix.sugWhy}}</span>
                  <sc-if value="{{ix.sugPending}}" hint-placeholder-val="{{ true }}"><button onClick="{{ix.approve}}" style="align-self: flex-start; min-height: 36px; padding: 0 14px; border-radius: 10px; border: none; background: #1574AD; color: #FFFFFF; font-weight: 600; font-size: 13px; cursor: pointer">{{ix.sugBtn}}</button></sc-if>
                  <sc-if value="{{ix.sugDone}}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; font-weight: 700; color: #1574AD">معتمد · يظهر للسكان الآن</span></sc-if>
                </div>
              </sc-if>
            </section>
          </sc-for>
        </div>
        <span style="font-size: 12px; color: #56707F; text-align: center">{{ins.note}}</span>
      </div>
    </sc-if>
"""


def build():
    src = (HERE / "Ministry.dc.html").read_text(encoding="utf-8")
    for k, v in BLOBS.items():
        src = src.replace(k, v)
    # The two pilot districts that are not in the board's Riyadh list yet.
    src = src.replace("['الشفا', 4, 1], ['منفوحة', 4, 2], ['العزيزية', 4, 3]]",
                      "['اليرموك', 4, 0], ['الشفا', 4, 1], ['منفوحة', 4, 2], ['العزيزية', 4, 3], ['قرطبة', 4, 4]]")
    assert "['قرطبة', 4, 4]" in src
    # Data badge reflects whether live data is flowing, plus a sign-out button.
    badge = '<span style="font-size: 12px; font-weight: 600; background: #FBF5D6; color: #6B5A08; padding: 8px 12px; border-radius: 12px">بيانات تجريبية للعرض</span>'
    assert badge in src
    src = src.replace(badge, '<span style="font-size: 12px; font-weight: 600; background: {{dataBadgeBg}}; color: {{dataBadgeInk}}; padding: 8px 12px; border-radius: 12px">{{dataBadge}}</span>'
                      '<button onClick="{{logout}}" style="font-size: 12px; font-weight: 600; background: #FFFFFF; color: #1574AD; border: 1px solid #DBE6EC; padding: 7px 12px; border-radius: 12px; cursor: pointer">خروج</button>')
    pair = re.search(r'<img src="/ministry/board/mark.png"[^>]*>\s*<img src="/ministry/board/wordmark.png"[^>]*>', src)
    assert pair
    src = src.replace(pair.group(0), '<img src="/ministry/board/lockup.png" alt="عون" style="height: 40px; width: auto; display: block">')
    anchor = '<b style="font-size: 15px">اقتراحات رفيدة لهذا الحي</b>'
    assert anchor in src
    src = src.replace(anchor, LIVE_PANEL + "                " + anchor)

    rep = "    <!-- ================= التقارير ================= -->"
    assert rep in src
    src = src.replace(rep, CALLS + rep)
    tab0 = "['stats', 'الإحصائيات', 'M4 20V10M10 20V4M16 20v-7M22 20H2'], "
    assert tab0 in src
    src = src.replace(tab0, tab0 + "['calls', 'صوت الأحياء', 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v3'], ")

    helmet = re.search(r"<helmet>(.*?)</helmet>", src, re.S).group(1)
    logic = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', src, re.S).group(1)
    body = src[src.index("</helmet>") + len("</helmet>"):]
    body = body[:body.index('<script type="text/x-dc"')]
    body = re.sub(r"</x-dc>.*", "", body, flags=re.S)
    live = (HERE / "live.js").read_text(encoding="utf-8")
    html = f"""<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>منصة عون · وزارة الصحة</title>
<meta name="theme-color" content="#1574AD"><link rel="icon" href="/ministry/board/mark.png">
{helmet}
<style>html,body{{margin:0;padding:0}}#dc-root{{min-height:100dvh}}</style>
</head><body>
<div id="dc-root"></div>
<template id="dc-tpl">{LOGIN}{body}</template>
<script src="/ministry/board/dcrt.js"></script>
<script>
{logic}
{live}
window.__dc = DCmount(document.getElementById("dc-root"), document.getElementById("dc-tpl"), AounMinistry, {json.dumps({})});
</script>
</body></html>"""
    OUT.write_text(html, encoding="utf-8")
    print("wrote", OUT, len(html))


if __name__ == "__main__":
    build()
