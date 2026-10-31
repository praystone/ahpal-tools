# -*- coding: utf-8 -*-
import sys, re, urllib.request, urllib.error, os
from datetime import datetime
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except:
    pass

STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
TOOLS = Path(r"C:\Users\User\ahpal-tools")
OUT = TOOLS / "html-editor"
VENDOR = OUT / "vendor"
VENDOR.mkdir(parents=True, exist_ok=True)

def log(m): print(m)

def download(url, dest):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
            dest.write_bytes(data)
            return True, len(data)
    except Exception as e:
        return False, str(e)

log("=" * 70)
log(f"完全離線本地化「視覺化 HTML 編輯器」（{STAMP}）")
log("=" * 70)

# ── 1. 下載 9 個檔案到 vendor/ ──
log("\n[1/6] 下載 9 個檔案到 vendor/")
files = [
    ("codemirror.min.js", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"),
    ("xml.min.js", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js"),
    ("javascript.min.js", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"),
    ("css.min.js", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js"),
    ("htmlmixed.min.js", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js"),
    ("searchcursor.min.js", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/search/searchcursor.min.js"),
    ("codemirror.min.css", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css"),
    ("neo.min.css", "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/neo.min.css"),
    ("html2canvas.min.js", "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
]
for name, url in files:
    dest = VENDOR / name
    ok, size = download(url, dest)
    if ok:
        log(f"  ✓ {name}（{size} bytes）")
    else:
        log(f"  ✗ {name}：{size}")

# ── 2. 下載原始 HTML ──
log("\n[2/6] 下載原始 HTML")
url = "https://goodcompany.tw/tools/html-tester/"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        html = r.read().decode("utf-8", errors="replace")
        log(f"  ✓ 下載 {len(html)} 字元")
except Exception as e:
    log(f"  ✗ 下載失敗：{e}")
    sys.exit(1)

# ── 3. 用「寬鬆正則」改所有檔案路徑為 ./vendor/ ──
log("\n[3/6] 改所有檔案路徑為 ./vendor/")
# 9 個檔案的名稱
vendor_files = [f[0] for f in files]
# 對每個檔案，找「任何包含該檔名的路徑」，改成 ./vendor/檔名
for vf in vendor_files:
    # 匹配 src="..." 或 href="..." 內含該檔名
    pattern = r'(src|href)="[^"]*' + re.escape(vf) + r'"'
    replacement = r'\1="./vendor/' + vf + r'"'
    html = re.sub(pattern, replacement, html)
log("  ✓ 已改 9 個檔案路徑")

# ── 4. 拿掉 iframe 的 src（saved_resource.html）──
log("\n[4/6] 拿掉 iframe 的 src")
html = re.sub(r'src="[^"]*saved_resource\.html"', '', html)
log("  ✓ 已拿掉 saved_resource.html")

# ── 5. 拿掉 Google Fonts、Cloudflare beacon ──
log("\n[5/6] 拿掉外部依賴")
html = re.sub(r'href="[^"]*fonts\.googleapis\.com[^"]*"', '', html)
html = re.sub(r'href="[^"]*css2[^"]*"', '', html)
html = re.sub(r'<script type="module"[^>]*vce[^>]*></script>', '', html)
html = re.sub(r'<link rel="preconnect"[^>]*>', '', html)
log("  ✓ 已拿掉 Google Fonts、Cloudflare beacon")

# ── 6. 寫檔 + 驗證 ──
log("\n[6/6] 寫入 index.html")
out_file = OUT / "index.html"
out_file.write_text(html, encoding="utf-8", newline="\n")
log(f"  ✓ 已寫入 {out_file}（{len(html)} 字元）")

log("\n[驗證]")
content = out_file.read_text(encoding="utf-8")
checks = [
    ("vendor/codemirror.min.js", './vendor/codemirror.min.js' in content),
    ("vendor/xml.min.js", './vendor/xml.min.js' in content),
    ("vendor/htmlmixed.min.js", './vendor/htmlmixed.min.js' in content),
    ("vendor/neo.min.css", './vendor/neo.min.css' in content),
    ("vendor/html2canvas.min.js", './vendor/html2canvas.min.js' in content),
    ("無 saved_resource.html", "saved_resource.html" not in content),
    ("無 Cloudflare beacon", "vce701823e78c4301a35b7e07294d87301792088814092" not in content),
    ("無 Google Fonts", "fonts.googleapis.com" not in content),
    ("有 CodeMirror 初始化", "CodeMirror.fromTextArea" in content),
]
all_ok = True
for name, ok in checks:
    log(f"  [{'OK' if ok else 'FAIL'}] {name}")
    if not ok:
        all_ok = False

# 檔案大小統計
log("\n[檔案統計]")
total_size = 0
for f in VENDOR.glob("*"):
    size = f.stat().st_size
    total_size += size
    log(f"  {f.name}：{size} bytes")
log(f"  vendor/ 總計：{total_size} bytes")
log(f"  index.html：{out_file.stat().st_size} bytes")
log(f"  總計：{total_size + out_file.stat().st_size} bytes")

log("\n" + "=" * 70)
if all_ok:
    log("✅ 完全離線本地化完成")
    log(f"\n檔案：{out_file}")
    log(f"vendor/：{VENDOR}")
    log(f"\n怎麼開：")
    log(f"  1. 雙擊 {out_file}")
    log(f"  2. 或跑：cd {OUT}; python -m http.server 8000")
    log(f"     然後開 http://localhost:8000/")
    log(f"\n完全離線，不需要網路。")
else:
    log("⚠️ 部分驗證失敗，請檢查")
log("=" * 70)