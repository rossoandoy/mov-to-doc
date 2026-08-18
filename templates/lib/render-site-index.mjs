/**
 * Site index — feature catalog navigation
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadManualMeta(manualsRoot, slug) {
  return readJson(join(manualsRoot, slug, "manual.meta.json"));
}

const OP_LABELS = { view: "参照", create: "作成", update: "更新", print: "印刷", delete: "削除" };

/**
 * @param {{ siteDir: string, repoRoot: string }} opts
 */
export function renderSiteIndex(opts) {
  const { siteDir, repoRoot } = opts;
  const catalog = readJson(join(repoRoot, "data", "feature-catalog.json")) ?? { modules: [], product: "機能マニュアル" };
  const manualsRoot = join(repoRoot, "manuals");
  const siteManualsRoot = join(siteDir, "manuals");

  const publishedSlugs = existsSync(siteManualsRoot)
    ? readdirSync(siteManualsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  const metaBySlug = new Map();
  for (const slug of publishedSlugs) {
    const meta = loadManualMeta(manualsRoot, slug);
    if (meta) metaBySlug.set(slug, meta);
  }

  const modules = [...(catalog.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const moduleSections = modules.map((mod) => {
    const features = (mod.features ?? []).map((feat) => {
      const slug = feat.manualSlug;
      const published = slug && publishedSlugs.includes(slug);
      const meta = slug ? metaBySlug.get(slug) : null;
      const ops = (meta?.operations ?? []).map((op) => OP_LABELS[op] ?? op);
      const opText = ops.length ? ops.join(" · ") : "—";
      const href = published ? `./manuals/${escapeHtml(slug)}/` : "#";
      const cardClass = published ? "feature-card" : "feature-card pending";
      const status = published ? "" : '<span class="status-badge">準備中</span>';
      return `<article class="${cardClass}">
  <div class="feature-card-header">
    <h3>${published ? `<a href="${href}">${escapeHtml(feat.label)}</a>` : escapeHtml(feat.label)}</h3>
    ${status}
  </div>
  <p class="menu-path">${escapeHtml(feat.menuPath ?? "")}</p>
  <p class="summary">${escapeHtml(feat.summary ?? "")}</p>
  <p class="ops"><span class="ops-label">操作:</span> ${escapeHtml(opText)}</p>
</article>`;
    }).join("\n");

    return `<section class="module-section" id="module-${escapeHtml(mod.id)}">
  <h2 class="module-title">${escapeHtml(mod.label)}</h2>
  <div class="feature-grid">${features || '<p class="empty">機能が登録されていません。</p>'}</div>
</section>`;
  }).join("\n");

  const navItems = modules.map((mod) =>
    `<li><a href="#module-${escapeHtml(mod.id)}">${escapeHtml(mod.label)}</a></li>`
  ).join("");

  const product = catalog.product ?? "機能マニュアル";
  const env = catalog.environment ?? "";
  const featureCount = modules.reduce((n, m) => n + (m.features?.length ?? 0), 0);
  const publishedCount = modules.reduce((n, m) =>
    n + (m.features ?? []).filter((f) => f.manualSlug && publishedSlugs.includes(f.manualSlug)).length, 0);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(product)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root { --brand:#2954c2; --brand-bg:#eef4ff; --brand-border:#c5d7f5; --bg:#f3f3f3; --surface:#fff; --border:#e0e0e0; --muted:#706e6b; --radius:8px; }
*{box-sizing:border-box} body{margin:0;font-family:"Noto Sans JP",sans-serif;background:var(--bg);color:#181818;font-size:15px;line-height:1.6}
.layout{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
@media(max-width:800px){.layout{grid-template-columns:1fr}.side-nav{position:sticky;top:0;z-index:5;border-bottom:1px solid var(--border);padding:8px 16px;overflow-x:auto;white-space:nowrap}}
header{background:var(--brand);color:#fff;padding:24px 32px;grid-column:1/-1}
header h1{margin:0;font-size:1.4rem} header p{margin:6px 0 0;opacity:.9;font-size:.875rem}
.side-nav{background:var(--surface);border-right:1px solid var(--border);padding:20px 16px}
.side-nav h2{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 12px}
.side-nav ul{list-style:none;padding:0;margin:0}
.side-nav a{display:block;padding:8px 10px;color:#181818;text-decoration:none;border-radius:4px;font-size:.875rem}
.side-nav a:hover{background:var(--brand-bg);color:var(--brand)}
main{padding:24px 32px 64px;max-width:960px}
.module-section{margin-bottom:40px}
.module-title{font-size:1.1rem;color:var(--brand);margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid var(--brand-border)}
.feature-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.feature-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
.feature-card.pending{opacity:.7}
.feature-card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.feature-card h3{margin:0;font-size:1rem;line-height:1.4}
.feature-card h3 a{color:var(--brand);text-decoration:none}
.feature-card h3 a:hover{text-decoration:underline}
.status-badge{font-size:.6875rem;padding:2px 8px;border-radius:4px;background:#f0f0f0;color:var(--muted);white-space:nowrap}
.menu-path{margin:8px 0 4px;font-size:.8125rem;color:var(--muted)}
.summary{margin:0 0 8px;font-size:.875rem}
.ops{margin:0;font-size:.8125rem;color:var(--muted)}
.ops-label{font-weight:600}
.empty{color:var(--muted);font-size:.875rem}
.stats{font-size:.8125rem;margin-top:4px;opacity:.85}
</style>
</head>
<body>
<div class="layout">
<header>
  <h1>${escapeHtml(product)}</h1>
  <p>${escapeHtml(env)} · 機能マニュアル（${publishedCount} / ${featureCount} 件公開）</p>
</header>
<nav class="side-nav" aria-label="モジュール">
  <h2>モジュール</h2>
  <ul>${navItems}</ul>
</nav>
<main>
${moduleSections || '<p>機能カタログが未設定です。</p>'}
</main>
</div>
</body>
</html>`;
}
