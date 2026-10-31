# -*- coding: utf-8 -*-
import sys, re, urllib.request, urllib.error
from datetime import datetime
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except:
    pass

STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
TOOLS = Path(r"C:\Users\User\ahpal-tools")
OUT = TOOLS / "html-editor"
OUT.mkdir(parents=True, exist_ok=True)

def log(m): print(m)

log("=" * 70)
log(f"本地化「視覺化 HTML 編輯器」（{STAMP}）")
log("=" * 70)

# 下載原始 HTML
log("\n[1/5] 下載原始 HTML")
url = "https://goodcompany.tw/tools/html-tester/"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", errors="replace")
        log(f"  ✓ 下載 {len(html)} 字元")
except Exception as e:
    log(f"  ✗ 下載失敗：{e}")
    log("  → 改用你貼的內容（見下方備援）")
    sys.exit(1)

# 改 CDN
log("\n[2/5] 改 CDN（9 個外部檔案）")
replacements = [
    (r'\./[^"\']*codemirror\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js'),
    (r'\./[^"\']*xml\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js'),
    (r'\./[^"\']*javascript\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js'),
    (r'\./[^"\']*css\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js'),
    (r'\./[^"\']*htmlmixed\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js'),
    (r'\./[^"\']*searchcursor\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/searchcursor.min.js'),
    (r'\./[^"\']*codemirror\.min\.css', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css'),
    (r'\./[^"\']*neo\.min\.css', 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/neo.min.css'),
    (r'\./[^"\']*html2canvas\.min\.js\.下載', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
]
for pattern, replacement in replacements:
    html = re.sub(pattern, replacement, html)
log(f"  ✓ 已改 9 個外部檔案為 CDN")

# 拿掉 iframe 的 src（saved_resource.html）
log("\n[3/5] 拿掉 iframe 的 src")
html = re.sub(r'src="\./[^"\']*saved_resource\.html"', '', html)
log("  ✓ 已拿掉 saved_resource.html")

# 拿掉 Google Fonts 的本地路徑
log("\n[4/5] 改 Google Fonts 為 CDN")
html = re.sub(r'href="\./[^"\']*css2"', 'href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"', html)
log("  ✓ 已改 Google Fonts")

# 拿掉外部追蹤 script（beacon）
html = re.sub(r'<script type="module" src="\./[^"\']*vce701823e78c4301a35b7e07294d87301792088814092"[^>]*></script>', '', html)
log("  ✓ 已拿掉 Cloudflare beacon")

# 寫檔
log("\n[5/5] 寫入 index.html")
out_file = OUT / "index.html"
out_file.write_text(html, encoding="utf-8", newline="\n")
log(f"  ✓ 已寫入 {out_file}（{len(html)} 字元）")

# 驗證
log("\n[驗證]")
content = out_file.read_text(encoding="utf-8")
checks = [
    ("CDN codemirror.min.js", "cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js" in content),
    ("CDN neo.min.css", "cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/neo.min.css" in content),
    ("CDN html2canvas", "cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" in content),
    ("無 saved_resource.html", "saved_resource.html" not in content),
    ("無 Cloudflare beacon", "vce701823e78c4301a35b7e07294d87301792088814092" not in content),
    ("有 CodeMirror 初始化", "CodeMirror.fromTextArea" in content),
]
all_ok = True
for name, ok in checks:
    log(f"  [{'OK' if ok else 'FAIL'}] {name}")
    if not ok:
        all_ok = False

log("\n" + "=" * 70)
if all_ok:
    log("✅ 本地化完成")
    log(f"\n檔案：{out_file}")
    log(f"\n怎麼開：")
    log(f"  1. 雙擊 {out_file}")
    log(f"  2. 或跑：cd {OUT}; python -m http.server 8000")
    log(f"     然後開 http://localhost:8000/")
else:
    log("⚠️ 部分驗證失敗，請檢查")
log("=" * 70)