# -*- coding: utf-8 -*-
import sys, os, shutil, subprocess, re
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
log(f"清乾淨「goodcompany.tw」殘留品牌（{STAMP}）")
log("=" * 70)

idx = EDITOR / "index.html"
if not idx.exists():
    log(f"✗ 找不到 {idx}")
    sys.exit(1)

bak = BACKUP / f"index.html.bak-cleanbrand-{STAMP}"
shutil.copy2(idx, bak)
log(f"✓ 備份：{bak.name}")

h = idx.read_text(encoding="utf-8")
orig_h = h

# ── 1. 拿掉「SEO 免費諮詢」按鈕（含 <a> 和裡面的 <span>）──
log("\n[1/4] 拿掉「SEO 免費諮詢」按鈕")
# 找 "SEO 免費諮詢"，往前找最近的 <a，往後找最近的 </a>
pattern = r'<a[^>]*>\s*<span[^>]*></span>\s*SEO 免費諮詢\s*</a>'
h2 = re.sub(pattern, '', h)
if h2 != h:
    h = h2
    log("  ✓ 已用正則拿掉")
else:
    # 備用：逐行找，刪掉包含 "SEO 免費諮詢" 的 <a> 到 </a>
    log("  ⚠️ 正則沒對上，用備用方法")
    lines = h.split("\n")
    new_lines = []
    in_a = False
    for line in lines:
        if "SEO 免費諮詢" in line:
            log(f"    找到：{line.strip()[:100]}")
            # 往前找 <a，往後找 </a>
            in_a = True
            continue
        if in_a:
            if "</a>" in line:
                in_a = False
            continue
        new_lines.append(line)
    h = "\n".join(new_lines)
    log("  ✓ 已用備用方法拿掉")

# ── 2. 拿掉「本工作室不儲存任何用戶輸入內容」──
log("\n[2/4] 拿掉「本工作室不儲存」")
# 找 footer 的免責聲明
h2 = re.sub(
    r'免責聲明：本工具僅供網頁前端測試使用，本工作室不儲存任何用戶輸入內容。\s*',
    '',
    h
)
if h2 != h:
    h = h2
    log("  ✓ 已拿掉免責聲明")
else:
    log("  ⚠️ 沒找到免責聲明")

# ── 3. 改 footer 為雅寶版權 ──
log("\n[3/4] 改 footer 為雅寶版權")
# 找「© 創伴人工作室」或「© 2026 雅寶社區」在 footer 的位置
old_footer = "© 2026 雅寶社區 · 頂客論壇 (AHPAL.COM)"
new_footer = "© 2026 雅寶社區 · 頂客論壇 (AHPAL.COM)"
# 如果 footer 有「本工作室」殘留，改成單純版權
h = re.sub(
    r'本工作室不儲存任何用戶輸入內容。\s*©\s*2026\s*雅寶社區[^<]*',
    '© 2026 雅寶社區 · 頂客論壇 (AHPAL.COM)',
    h
)
log("  ✓ 已改 footer")

# ── 4. 拿掉「SEO 免費諮詢」相關的 CSS（.btn-cta、.cta-dot）──
log("\n[4/4] 拿掉 .btn-cta、.cta-dot CSS")
# 這些 CSS 留著無害，但為了乾淨，拿掉
h = re.sub(r'\.btn-cta\s*\{[^}]*\}', '', h)
h = re.sub(r'\.btn-cta:hover\s*\{[^}]*\}', '', h)
h = re.sub(r'\.btn-cta\s+\.cta-dot\s*\{[^}]*\}', '', h)
h = re.sub(r'\.cta-dot\s*\{[^}]*\}', '', h)
log("  ✓ 已拿掉 .btn-cta、.cta-dot CSS")

if h == orig_h:
    log("\n⚠️ 無變更，可能正則沒對上")
    log("  建議：手動開 index.html，搜「SEO 免費諮詢」「本工作室」，看它們在哪裡")
    sys.exit(1)

idx.write_text(h, encoding="utf-8")
log(f"\n✓ 已寫回 index.html（{len(h)} 字元）")

# ── 5. 驗證 ──
log("\n[驗證]")
content = idx.read_text(encoding="utf-8")
checks = [
    ("無 SEO 免費諮詢", "SEO 免費諮詢" not in content),
    ("無 raymond@", "raymond@" not in content),
    ("無 mycontentstrategies", "mycontentstrategies" not in content),
    ("無 創伴人", "創伴人" not in content),
    ("無 本工作室", "本工作室" not in content),
    ("有 雅寶社區", "雅寶社區" in content),
    ("有 AHPAL.COM", "AHPAL.COM" in content),
]
all_ok = True
for name, ok in checks:
    log(f"  [{'OK' if ok else 'FAIL'}] {name}")
    if not ok:
        all_ok = False

# ── 6. git push ──
log("\n[git push]")
rc, out, err = run("git add -A", cwd=str(TOOLS))
log(f"  git add → rc={rc}")
rc, out, err = run('git commit -m "fix(tools): 清乾淨 goodcompany.tw 殘留品牌（SEO 免費諮詢、本工作室）"', cwd=str(TOOLS))
log(f"  git commit → rc={rc}")
if out.strip(): log(f"    {out.strip()[:300]}")
rc, out, err = run("git push", cwd=str(TOOLS))
log(f"  git push → rc={rc}")
if err.strip(): log(f"    stderr: {err.strip()[:300]}")

log("\n" + "=" * 70)
if all_ok:
    log("✅ 品牌殘留清乾淨")
    log("  等 1~2 分鐘，Cloudflare Pages 會自動部署")
    log("  開 https://ahpal-tools.pages.dev/html-editor/ 驗證")
else:
    log("⚠️ 部分驗證失敗，請手動檢查")
log("=" * 70)