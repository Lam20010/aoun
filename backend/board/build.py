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
  <div style="position: fixed; inset: 0; z-index: 50; background: linear-gradient(135deg, #0F3A3B, #2F7F80); display: flex; align-items: center; justify-content: center; padding: 16px; font-family: 'IBM Plex Sans Arabic', system-ui, sans-serif" dir="rtl">
    <div style="width: 100%; max-width: 420px; background: #FFFFFF; border-radius: 24px; padding: 28px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.25)">
      <div dir="ltr" style="display: flex; align-items: center; gap: 6px; align-self: flex-end">
        <img src="/ministry/board/mark.png" alt="" style="width: 44px; height: 44px"><img src="/ministry/board/wordmark.png" alt="عون" style="height: 26px">
      </div>
      <b style="font-size: 22px; color: #173F42">منصة وزارة الصحة</b>
      <span style="font-size: 14px; color: #4C6466; line-height: 1.7">ادخل برقمك الوظيفي وكلمة المرور. اللوحة تعرض أرقامًا مجمّعة فقط، وتخفي أي مجموعة أقل من 50 شخصًا.</span>
      <label style="font-size: 13px; color: #4C6466; display: flex; flex-direction: column; gap: 6px">رقم الموظف
        <input id="min-id" autocomplete="username" placeholder="M01" style="height: 46px; border-radius: 12px; border: 1px solid #DCEBE8; padding: 0 14px; font-size: 15px; font-family: inherit" dir="ltr"></label>
      <label style="font-size: 13px; color: #4C6466; display: flex; flex-direction: column; gap: 6px">كلمة المرور
        <input id="min-pw" type="password" autocomplete="current-password" style="height: 46px; border-radius: 12px; border: 1px solid #DCEBE8; padding: 0 14px; font-size: 15px; font-family: inherit" dir="ltr"></label>
      <sc-if value="{{login.hasErr}}" hint-placeholder-val="{{ false }}"><span role="alert" style="font-size: 13px; color: #8A2A1C; background: #FDE7E2; border-radius: 10px; padding: 8px 12px">{{login.err}}</span></sc-if>
      <button onClick="{{login.submit}}" style="height: 48px; border-radius: 14px; border: none; background: #2F7F80; color: #FFFFFF; font-size: 16px; font-weight: 700; cursor: pointer">{{login.label}}</button>
      <span style="font-size: 12px; color: #7E8C8E">خمس محاولات خاطئة توقف الدخول ربع ساعة.</span>
    </div>
  </div>
</sc-if>
"""

LIVE_PANEL = """
                <sc-if value="{{livePanel.show}}" hint-placeholder-val="{{ false }}">
                  <div style="background: #F2FAF7; border: 1px solid #CDEDE5; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px">
                    <div style="display: flex; align-items: center; gap: 8px"><span class="aoun-live" style="width: 9px; height: 9px; border-radius: 5px; background: #2FA37F"></span><b style="font-size: 14px; color: #173F42">{{livePanel.title}}</b></div>
                    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">
                      <sc-for list="{{livePanel.stats}}" as="ls" hint-placeholder-count="6">
                        <div style="background: #FFFFFF; border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column"><b style="font-size: 18px; color: #2F7F80">{{ls.n}}</b><span style="font-size: 11px; color: #4C6466">{{ls.k}}</span></div>
                      </sc-for>
                    </div>
                    <sc-if value="{{livePanel.hasBars}}" hint-placeholder-val="{{ false }}">
                      <span style="font-size: 12px; color: #4C6466">الأسباب التي ذكرها السكان لرفيدة:</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 6px"><sc-for list="{{livePanel.bars}}" as="lb" hint-placeholder-count="3"><span style="font-size: 12px; background: #FBF5D6; color: #6B5A08; border-radius: 10px; padding: 4px 10px">{{lb.k}} · {{lb.n}}</span></sc-for></div>
                    </sc-if>
                    <span style="font-size: 11px; color: #7E8C8E">{{livePanel.note}}</span>
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
                      '<button onClick="{{logout}}" style="font-size: 12px; font-weight: 600; background: #FFFFFF; color: #2F7F80; border: 1px solid #DCEBE8; padding: 7px 12px; border-radius: 12px; cursor: pointer">خروج</button>')
    anchor = '<b style="font-size: 15px">اقتراحات رفيدة لهذا الحي</b>'
    assert anchor in src
    src = src.replace(anchor, LIVE_PANEL + "                " + anchor)

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
<meta name="theme-color" content="#2F7F80"><link rel="icon" href="/ministry/board/mark.png">
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
