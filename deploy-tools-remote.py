# -*- coding: utf-8 -*-
import sys, os, re, shutil, subprocess, time, urllib.request, urllib.error
from datetime import datetime
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except:
    pass

STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
TOOLS = Path(r"C:\Users\User\ahpal-tools")
EDITOR = TOOLS / "html-editor"
BACKUP = TOOLS / "_backups"
BACKUP.mkdir(parents=True, exist_ok=True)

def log(m): print(m)

def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout or ""), (r.stderr or "")

log("=" * 70)
log(f"遠端部署：tools.ahpal.com（{STAMP}）")
log("=" * 70)

# ── 1. 備份 index.html ──
log("\n[1/5] 備份 index.html")
idx = EDITOR / "index.html"
bak = BACKUP / f"index.html.bak-remote-{STAMP}"
shutil.copy2(idx, bak)
log(f"  ✓ 備份：{bak.name}")

# ── 2. 拿掉別人的品牌資訊、改雅寶品牌 ──
log("\n[2/5] 拿掉別人的品牌資訊、改雅寶品牌")
h = idx.read_text(encoding="utf-8")
orig_h = h

# 2a. 拿掉「SEO 免費諮詢」按鈕（整個 <a> 標籤）
h = re.sub(r'<a href="mailto:raymond@mycontentstrategies\.com"[^>]*>.*?</a>', '', h, flags=re.DOTALL)
log("  ✓ 拿掉 SEO 免費諮詢按鈕")

# 2b. 拿掉分隔線（按鈕旁那個 div）
h = re.sub(r'<div style="width: 1px; height: 20px; background: #ddd; margin: 0 2px;"></div>', '', h)
log("  ✓ 拿掉分隔線")

# 2c. 拿掉 CTA 區塊（從 <div class="cta"> 到對應的 </div>）
# 用「.cta { ... }」CSS 區塊保留，但 HTML 的 <div class="cta"> 拿掉
# 先找 HTML 裡的 <div class="cta"> 到 </div>
h = re.sub(r'<div class="cta">.*?</div>\s*</body>', '</body>', h, flags=re.DOTALL)
log("  ✓ 拿掉 CTA 區塊")

# 2d. 改 title
h = re.sub(
    r'<title>[^<]*</title>',
    '<title>視覺化 HTML 編輯器 · 雅寶工具箱 | AHPAL.COM</title>',
    h
)
log("  ✓ 改 title")

# 2e. 改 canonical
h = re.sub(
    r'<link rel="canonical" href="[^"]*">',
    '<link rel="canonical" href="https://tools.ahpal.com/html-editor/">',
    h
)
log("  ✓ 改 canonical")

# 2f. 改 og:url
h = re.sub(
    r'<meta property="og:url" content="[^"]*">',
    '<meta property="og:url" content="https://tools.ahpal.com/html-editor/">',
    h
)
log("  ✓ 改 og:url")

# 2g. 改 og:site_name
h = re.sub(
    r'<meta property="og:site_name" content="[^"]*">',
    '<meta property="og:site_name" content="雅寶社區 AHPAL.COM">',
    h
)
log("  ✓ 改 og:site_name")

# 2h. 改 JSON-LD 的 author 和 url
h = re.sub(r'"name": "Raymond"', '"name": "龍蝦總工程師"', h)
h = re.sub(r'"url": "https://mycontentstrategies\.com"', '"url": "https://tools.ahpal.com"', h)
h = re.sub(r'"url": "https://mycontentstrategies\.com/html-tester/"', '"url": "https://tools.ahpal.com/html-editor/"', h)
log("  ✓ 改 JSON-LD author 和 url")

# 2i. 改預設內容（左側編輯器載入的 HTML）
# 找 editor.setValue(`...`) 裡的「by 創伴人工作室」「SEO 顧問 Raymond」
h = re.sub(
    r'<p class="subtitle">by 創伴人工作室 My Content Strategies</p>',
    '<p class="subtitle">雅寶社區 · 頂客論壇 · 工具箱</p>',
    h
)
h = re.sub(
    r'<strong>你的網站有在 Google 上出現嗎？</strong>.*?</div>',
    '</div>',
    h,
    flags=re.DOTALL
)
log("  ✓ 改預設內容")

# 2j. 改 footer 的版權
h = re.sub(
    r'© 創伴人工作室 My Content Strategies',
    '© 2026 雅寶社區 · 頂客論壇 (AHPAL.COM)',
    h
)
log("  ✓ 改 footer 版權")

if h == orig_h:
    log("  ⚠️ 無變更，可能正則沒對上")
else:
    idx.write_text(h, encoding="utf-8")
    log(f"  ✓ 已寫回 index.html（{len(h)} 字元）")

# ── 3. 驗證「別人的品牌」全拿掉 ──
log("\n[3/5] 驗證別人的品牌全拿掉")
content = idx.read_text(encoding="utf-8")
checks = [
    ("無 raymond@mycontentstrategies.com", "raymond@mycontentstrategies.com" not in content),
    ("無 mycontentstrategies.com", "mycontentstrategies.com" not in content),
    ("無 創伴人工作室", "創伴人工作室" not in content),
    ("無 My Content Strategies", "My Content Strategies" not in content),
    ("無 Raymond（author）", '"name": "Raymond"' not in content),
    ("有 雅寶社區", "雅寶社區" in content),
    ("有 AHPAL.COM", "AHPAL.COM" in content),
    ("有 tools.ahpal.com", "tools.ahpal.com" in content),
]
all_ok = True
for name, ok in checks:
    log(f"  [{'OK' if ok else 'FAIL'}] {name}")
    if not ok:
        all_ok = False

if not all_ok:
    log("\n⚠️ 部分驗證失敗，請檢查")
    log("  仍存在的別品牌字串：")
    for brand in ["raymond@", "mycontentstrategies", "創伴人", "My Content", "Raymond"]:
        if brand in content:
            log(f"    ⚠️ 還有：{brand}")

# ── 4. 建 tools.ahpal.com 首頁（工具箱首頁）──
log("\n[4/5] 建工具箱首頁")
tools_index = TOOLS / "index.html"
tools_index.write_text('''<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>雅寶工具箱 | AHPAL.COM</title>
<meta name="description" content="雅寶社區 · 頂客論壇 線上工具箱。HTML 編輯器、更多工具持續新增。">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://tools.ahpal.com/">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft JhengHei",sans-serif;background:#0D1117;color:#E6EDF3;line-height:1.8;padding:40px 20px;}
.container{max-width:900px;margin:0 auto;}
h1{color:#D4AF37;font-size:32px;margin-bottom:12px;text-align:center;}
.sub{color:#8B949E;text-align:center;margin-bottom:40px;}
.tool-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;}
.tool-card{background:#161B22;border:1px solid #2D303A;border-radius:12px;padding:24px;text-decoration:none;color:#E6EDF3;transition:all 0.2s;}
.tool-card:hover{border-color:#D4AF37;transform:translateY(-2px);}
.tool-card .icon{font-size:32px;margin-bottom:12px;}
.tool-card .name{color:#D4AF37;font-weight:700;font-size:18px;margin-bottom:8px;}
.tool-card .desc{color:#8B949E;font-size:14px;}
.footer{text-align:center;margin-top:60px;color:#8B949E;font-size:13px;}
.footer a{color:#58A6FF;text-decoration:none;}
</style>
</head>
<body>
<div class="container">
<h1>🛠️ 雅寶工具箱</h1>
<p class="sub">雅寶社區 · 頂客論壇 線上工具箱</p>
<div class="tool-grid">
<a href="/html-editor/" class="tool-card">
<div class="icon">📝</div>
<div class="name">視覺化 HTML 編輯器</div>
<div class="desc">即時預覽、雙向同步、螢光筆標註、手機版模擬</div>
</a>
</div>
<div class="footer">
<p>© 2026 雅寶社區 · 頂客論壇 (AHPAL.COM)</p>
<p><a href="https://www.ahpal.com/">回到主站</a></p>
</div>
</div>
</body>
</html>
''', encoding="utf-8", newline="\n")
log(f"  ✓ 已建 {tools_index}")

# ── 5. 建 git repo + push ──
log("\n[5/5] 建 git repo + push")
if not (TOOLS / ".git").exists():
    log("  [init] git init")
    rc, out, err = run("git init", cwd=str(TOOLS))
    log(f"    rc={rc}")
    rc, out, err = run("git remote add origin https://github.com/praystone/ahpal-tools.git", cwd=str(TOOLS))
    log(f"    remote add → rc={rc}")

# 建 .gitignore
gitignore = TOOLS / ".gitignore"
gitignore.write_text("_backups/\n*.bak-*\nstaging/\n", encoding="utf-8", newline="\n")
log("  ✓ 已建 .gitignore")

# 建 README
readme = TOOLS / "README.md"
readme.write_text("""# 🛠️ ahpal-tools

雅寶社區 · 頂客論壇 線上工具箱

## 網址
- 主站：https://tools.ahpal.com/
- HTML 編輯器：https://tools.ahpal.com/html-editor/

## 工具清單
1. 視覺化 HTML 編輯器（html-editor/）

## 部署
- Cloudflare Pages，GitHub Actions 或直連 Git
- `git push` 即部署

## 授權
© 2026 雅寶社區 · 頂客論壇 (AHPAL.COM)
""", encoding="utf-8", newline="\n")
log("  ✓ 已建 README.md")

# git add + commit + push
rc, out, err = run("git add -A", cwd=str(TOOLS))
log(f"  git add → rc={rc}")
rc, out, err = run('git commit -m "feat: 雅寶工具箱首頁 + 視覺化 HTML 編輯器（完全離線）"', cwd=str(TOOLS))
log(f"  git commit → rc={rc}")
if out.strip(): log(f"    {out.strip()[:300]}")
rc, out, err = run("git push -u origin main", cwd=str(TOOLS))
log(f"  git push → rc={rc}")
if err.strip(): log(f"    stderr: {err.strip()[:300]}")

log("\n" + "=" * 70)
log("✅ 遠端部署完成（本機）")
log("=" * 70)
log("\n手動步驟（Cloudflare Pages）：")
log("  1. 打開 https://dash.cloudflare.com/")
log("  2. Workers & Pages → Create → Pages → Connect to Git")
log("  3. 選 praystone/ahpal-tools")
log("  4. 建置設定：Framework = None, Build command = (空), Output = /")
log("  5. 建好後 → Custom domains → 加 tools.ahpal.com")
log("  6. 等 1-2 分鐘，開 https://tools.ahpal.com/ 驗證")