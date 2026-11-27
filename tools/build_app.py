"""Build backend/app/static/aoun-app.html from the exported prototype page (bundler HTML).

Usage: python tools/build_app.py <prototype.html> <live.js>
Replaces the /_blob/ pictures and videos with /app/assets/, and appends live.js (the ElevenLabs
wiring) after the prototype's logic class.
"""
import json
import re
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "backend" / "app" / "static" / "aoun-app.html"
ASSETS = OUT.parent / "assets"
MARK = '<script type="__bundler/template">'


def main(src: str, live: str) -> None:
    page = Path(src).read_text(encoding="utf-8")
    i = page.rindex(MARK) + len(MARK)
    k = page.rindex("</script>")
    tpl = json.loads(page[i:k])

    def blob(m):
        bid = m.group(1)
        for ext in ("png", "mp4"):
            if (ASSETS / f"{bid}.{ext}").exists():
                return f"/app/assets/{bid}.{ext}"
        raise SystemExit(f"missing asset {bid}")

    tpl = re.sub(r"/_blob/([0-9a-f]{32})", blob, tpl)
    tpl = tpl.replace("agent_1801m7x9q2tney5r6qh2erxg8rf7", "agent_5601m8ef72qze8yv81t5v27tfqe0")
    tpl = tpl.replace("agent_2401m7x9pdtpfghakjnscgt90zsp", "agent_1501m8ef5ggye2a9q13mtb0rvkzj")
    end = tpl.rindex("</script>")
    tpl = tpl[:end] + Path(live).read_text(encoding="utf-8") + "\n" + tpl[end:]
    tpl = tpl.replace("<title>عون · iOS</title>", "<title>عون · تجربة حيّة</title>")
    enc = json.dumps(tpl, ensure_ascii=False).replace("</", "<\\u002F")
    OUT.write_text(page[:i] + enc + "\n  " + page[k:], encoding="utf-8")
    print(OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main(*sys.argv[1:3])
