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
                      <div style="display: flex; flex-wrap: wrap; gap: 6px"><sc-for list="{{livePanel.bars}}" as="lb" hint-placeholder-count="3"><span style="font-size: 12px; background: #FFF6E0; color: #7A4E00; border-radius: 10px; padding: 4px 10px">{{lb.k}} · {{lb.n}}</span></sc-for></div>
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
                <div style="display: flex; flex-wrap: wrap; gap: 6px"><sc-for list="{{ix.asks}}" as="ak" hint-placeholder-count="4"><span style="font-size: 12px; background: #EEF5FA; color: #3D6D94; border-radius: 10px; padding: 4px 10px">{{ak}}</span></sc-for></div>
              </sc-if>
              <sc-if value="{{ix.hasSug}}" hint-placeholder-val="{{ true }}">
                <div style="background: #FFF8E6; border: 1px solid #F8DEAB; border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px">
                  <b style="font-size: 13px; color: #7A4E00">المقترح: {{ix.sugTitle}}</b>
                  <span style="font-size: 12px; color: #7A4E00; line-height: 1.6">{{ix.sugWhy}}</span>
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


NAV = """
  <!-- Top bar, in the style of a Saudi government portal, with Aoun's own logo and colours -->
  <style>
    .aoun-bar{flex-wrap:wrap}
    @media (max-width: 960px){
      .aoun-nav{order:3;flex:1 1 100% !important;margin:0 -4px;min-height:58px}
      .aoun-badge{display:none !important}
      .aoun-hero-in{padding:28px 22px 76px !important}
      .aoun-arrow{top:auto !important;bottom:14px !important;transform:none !important;width:44px !important;height:44px !important}
      .aoun-top-live{display:none !important}
    }
    @media (max-width: 1360px){
      .aoun-badge{display:none !important}
    }
  </style>
  <header style="width: 100%; position: sticky; top: 0; z-index: 20; box-shadow: 0 2px 14px rgba(0,35,54,.06)">
    <div style="background: #F2F6F9; border-bottom: 1px solid #E2EBF1; padding: 8px clamp(14px, 3vw, 40px); display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: #0E2E45">
      <span style="display: flex; align-items: center; gap: 8px"><img src="/ministry/board/mark.png" alt="" style="width: 20px; height: 20px">منصة عون للكشف المبكر · مسار وزارة الصحة</span>
      <span class="aoun-top-live" style="display: flex; align-items: center; gap: 8px; color: #4A5E6D"><span class="aoun-live" style="width: 8px; height: 8px; border-radius: 4px; background: #2E9BD6"></span>رفيدة ورفيد يتصلون الآن · {{liveCount}} محادثة</span>
    </div>
    <div class="aoun-bar" style="background: #FFFFFF; padding: 0 clamp(14px, 3vw, 40px); display: flex; align-items: stretch; gap: clamp(12px, 2vw, 28px); min-height: 84px">
      <div style="display: flex; align-items: center; padding: 10px 0"><img src="/ministry/board/lockup.png" alt="عون" style="height: 48px; width: auto; display: block"></div>
      <nav class="aoun-nav" aria-label="أقسام المنصة" style="flex: 1; display: flex; align-items: stretch; gap: 4px; overflow-x: auto; min-width: 0">
        <sc-for list="{{navTabs}}" as="tb" hint-placeholder-count="6">
          <button onClick="{{tb.pick}}" aria-current="{{tb.current}}" style="position: relative; flex: none; border: none; margin: 8px 0; padding: 0 14px; border-radius: 6px; background: {{tb.bg}}; color: {{tb.ink}}; font-size: 15px; font-weight: {{tb.weight}}; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="{{tb.d}}"></path></svg>{{tb.label}}
            <span style="position: absolute; left: 12px; right: 12px; bottom: 5px; height: 4px; border-radius: 2px; background: {{tb.bar}}"></span>
          </button>
        </sc-for>
      </nav>
      <div style="display: flex; align-items: center; gap: 8px; margin-inline-start: auto">
        <span class="aoun-badge" style="font-size: 12px; font-weight: 600; background: {{dataBadgeBg}}; color: {{dataBadgeInk}}; padding: 7px 10px; border-radius: 8px; white-space: nowrap">{{dataBadge}}</span>
        <button onClick="{{logout}}" aria-label="خروج" style="display: flex; align-items: center; gap: 6px; border: 1px solid #DBE6EC; background: #FFFFFF; color: #0E2E45; border-radius: 8px; padding: 8px 12px; font-size: 14px; cursor: pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6"></path></svg>خروج</button>
      </div>
    </div>
  </header>

  <!-- Hero: three live slides with working arrows -->
  <sc-if value="{{hero.show}}" hint-placeholder-val="{{ true }}">
    <section style="width: 100%; position: relative; overflow: hidden; background: linear-gradient(110deg, #002336 0%, #0B3A55 45%, #1574AD 100%); color: #FFFFFF; min-height: 300px; display: flex; align-items: center">
      <img src="/ministry/board/mark-white.png" alt="" style="position: absolute; left: 6%; top: 50%; transform: translateY(-50%); height: 120%; opacity: .09; pointer-events: none">
      <button class="aoun-arrow" onClick="{{hero.next}}" aria-label="التالي" style="position: absolute; z-index: 2; left: clamp(10px, 4vw, 60px); top: 50%; transform: translateY(-50%); width: 56px; height: 64px; border: none; border-radius: 6px; background: rgba(89,194,249,.28); color: #FFFFFF; cursor: pointer; display: flex; align-items: center; justify-content: center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></button>
      <button class="aoun-arrow" onClick="{{hero.prev}}" aria-label="السابق" style="position: absolute; z-index: 2; right: clamp(10px, 4vw, 60px); top: 50%; transform: translateY(-50%); width: 56px; height: 64px; border: none; border-radius: 6px; background: rgba(89,194,249,.28); color: #FFFFFF; cursor: pointer; display: flex; align-items: center; justify-content: center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>
      <div class="aoun-in aoun-hero-in" style="position: relative; width: 100%; box-sizing: border-box; padding: 40px clamp(80px, 12vw, 180px); display: flex; flex-direction: column; gap: 14px; align-items: flex-start">
        <span style="font-size: 13px; font-weight: 600; color: #59C2F9; letter-spacing: .2px">{{hero.kicker}}</span>
        <b style="font-size: clamp(24px, 3.2vw, 40px); line-height: 1.35; max-width: 820px">{{hero.title}}</b>
        <span style="font-size: 16px; line-height: 1.8; color: #D6EEFC; max-width: 720px">{{hero.text}}</span>
        <button onClick="{{hero.go}}" style="margin-top: 6px; border: none; background: #FFFFFF; color: #002336; font-size: 16px; font-weight: 700; padding: 12px 22px; border-radius: 6px; cursor: pointer">{{hero.cta}}</button>
        <div style="display: flex; gap: 6px; margin-top: 8px"><sc-for list="{{hero.dots}}" as="hd" hint-placeholder-count="3"><span style="width: {{hd.w}}; height: 6px; border-radius: 3px; background: {{hd.c}}"></span></sc-for></div>
      </div>
    </section>
  </sc-if>
"""

FLOAT = """
  <!-- Accessibility: one tap makes everything larger -->
  <button onClick="{{a11y.toggle}}" aria-pressed="{{a11y.on}}" aria-label="تكبير الخط" style="position: fixed; left: 18px; bottom: 18px; z-index: 30; width: 60px; height: 60px; border-radius: 30px; border: 4px solid #FFFFFF; background: #1574AD; color: #FFFFFF; cursor: pointer; box-shadow: 0 8px 24px rgba(0,35,54,.3); display: flex; align-items: center; justify-content: center">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="7" r="1.4"></circle><path d="M7 10l5 1 5-1M12 11v4l-3 4M12 15l3 4"></path></svg>
  </button>
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
    badge = '<span style="font-size: 12px; font-weight: 600; background: #FFF6E0; color: #7A4E00; padding: 8px 12px; border-radius: 12px">بيانات تجريبية للعرض</span>'
    assert badge in src
    src = src.replace(badge, '')  # the data badge and sign-out now live in the top bar
    anchor = '<b style="font-size: 15px">اقتراحات رفيدة لهذا الحي</b>'
    assert anchor in src
    src = src.replace(anchor, LIVE_PANEL + "                " + anchor)

    # Layout: a government-portal style top bar and hero instead of the side menu.
    a = src.index("  <aside ")
    b = src.index("</aside>", a) + len("</aside>")
    src = src[:a] + NAV + src[b:]
    first = "box-sizing: border-box; display: flex; flex-wrap: wrap; font-family:"
    assert first in src
    src = src.replace(first, "box-sizing: border-box; display: flex; flex-direction: column; align-items: center; zoom: {{a11y.zoom}}; font-family:", 1)
    src = src.replace('<main style="flex: 999 1 600px; min-width: 0;', '<main style="width: 100%; max-width: 1440px; min-width: 0;', 1)
    src = src.replace("  </main>\n</div>", "  </main>\n" + FLOAT + "</div>", 1)
    assert FLOAT in src
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
