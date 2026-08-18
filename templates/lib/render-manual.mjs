/**
 * Shared Markdown → HTML rendering for feature manuals (ERP-style).
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { marked } from "marked";

const WEB_CSS = `
:root {
  --brand: #2954c2;
  --brand-hover: #1b3a9a;
  --brand-bg: #eef4ff;
  --brand-border: #c5d7f5;
  --warn-bg: #fff8e6;
  --warn-border: #f5a623;
  --text: #181818;
  --text-muted: #706e6b;
  --bg: #f3f3f3;
  --surface: #ffffff;
  --border: #e0e0e0;
  --radius: 8px;
  --shadow: 0 2px 8px rgba(0,0,0,.08);
  --font: "Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
}
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: var(--font); font-size: 15px; line-height: 1.65; color: var(--text); background: var(--bg); }
.layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar {
    position: sticky !important;
    top: 0;
    z-index: 10;
    height: auto !important;
    border-right: 0;
    border-bottom: 1px solid var(--border);
    padding: 8px 12px;
    overflow-x: auto;
    white-space: nowrap;
  }
  .sidebar-title { display: none; }
  .sidebar-back, .breadcrumb { display: inline-block; margin: 0 12px 0 0; }
  .toc { display: inline-flex; gap: 4px; margin: 0; vertical-align: middle; }
  .toc li { flex: 0 0 auto; }
  .toc a { padding: 8px 10px; white-space: nowrap; }
}
@media (max-width: 640px) {
  .header { padding: 14px 16px; }
  .main { padding: 20px 16px 48px; }
  .step-card { padding: 16px 14px; }
}
.header { grid-column: 1 / -1; background: var(--brand); color: #fff; padding: 16px 24px; box-shadow: var(--shadow); }
.header h1 { margin: 0; font-size: 1.35rem; font-weight: 600; }
.breadcrumb { margin: 0 0 8px; font-size: 0.8125rem; opacity: 0.92; }
.breadcrumb a { color: #fff; text-decoration: none; }
.breadcrumb a:hover { text-decoration: underline; }
.breadcrumb span { opacity: 0.75; }
.header-meta { margin: 6px 0 0; font-size: 0.8125rem; opacity: 0.92; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.header p { margin: 4px 0 0; font-size: 0.875rem; opacity: 0.9; }
.meta-tag { background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
.sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: var(--surface); border-right: 1px solid var(--border); padding: 20px 16px; }
.sidebar-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 12px; }
.sidebar-back { display: block; margin-bottom: 16px; font-size: 0.8125rem; color: var(--brand); text-decoration: none; }
.sidebar-back:hover { text-decoration: underline; }
.toc { list-style: none; padding: 0; margin: 0 0 20px; }
.toc li { margin: 0; }
.toc a { display: block; padding: 6px 10px; color: var(--text); text-decoration: none; border-radius: 4px; font-size: 0.875rem; line-height: 1.4; }
.toc a:hover { background: var(--brand-bg); color: var(--brand); }
.toc .toc-h3 { padding-left: 18px; font-size: 0.8125rem; color: var(--text-muted); }
.main { padding: 32px 40px 64px; max-width: 920px; }
.main > h1:first-child { display: none; }
.main h2 { font-size: 1.25rem; margin: 2rem 0 1rem; padding-bottom: 0.4rem; border-bottom: 2px solid var(--brand-border); color: var(--brand); scroll-margin-top: 16px; }
.main h3 { font-size: 1.05rem; margin: 1.5rem 0 0.75rem; scroll-margin-top: 16px; }
.main p { margin: 0.6em 0; }
.main ul, .main ol { padding-left: 1.4em; margin: 0.6em 0; }
.main li { margin: 0.35em 0; }
.main table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.875rem; }
.main th, .main td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.main th { background: var(--brand-bg); color: var(--brand); }
.main strong { font-weight: 600; }
.main hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.step-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin: 1.25rem 0; box-shadow: var(--shadow); }
.step-card > h3 { margin-top: 0; color: var(--brand); font-size: 1rem; }
.step-card > h3::before { content: "操作: "; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em; display: block; margin-bottom: 4px; opacity: 0.85; }
.step-card > ol { list-style: none; padding: 0; margin: 0; counter-reset: step; }
.step-card > ol > li { list-style: none; margin: 0 0 1.75rem; padding: 0 0 1.75rem; border-bottom: 1px solid var(--border); counter-increment: step; }
.step-card > ol > li:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.step-card > ol > li::before { content: "手順 " counter(step); display: block; font-size: 0.75rem; font-weight: 700; color: var(--brand); margin-bottom: 6px; letter-spacing: 0.03em; }
.step-card img, .main img { max-width: 100%; height: auto; display: block; margin: 12px 0; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); cursor: zoom-in; }
.main img:hover { border-color: var(--brand-border); }
.reference-video { margin: 1.25rem 0 2rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; box-shadow: var(--shadow); }
.reference-video h2 { margin: 0 0 8px; font-size: 1.05rem; border: none; padding: 0; color: var(--brand); }
.reference-video p { margin: 0 0 12px; font-size: 0.875rem; color: var(--text-muted); }
.reference-video video { width: 100%; max-height: 480px; border-radius: var(--radius); background: #000; }
.related-features { margin: 1.5rem 0; padding: 16px 20px; background: var(--brand-bg); border: 1px solid var(--brand-border); border-radius: var(--radius); }
.related-features h2 { margin: 0 0 10px; font-size: 1rem; border: none; padding: 0; color: var(--brand); }
.related-features ul { margin: 0; padding-left: 1.2em; }
.related-features a { color: var(--brand); }
dialog.lightbox { border: none; padding: 0; background: transparent; max-width: 95vw; max-height: 95vh; }
dialog.lightbox::backdrop { background: rgba(0,0,0,.75); }
dialog.lightbox img { max-width: 95vw; max-height: 90vh; display: block; border-radius: var(--radius); }
@media print { .sidebar, .header { display: none; } .layout { display: block; } .main { padding: 0; max-width: none; } .step-card { break-inside: avoid; box-shadow: none; } img { break-inside: avoid; } }
`;

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; font-size: 10.5pt; line-height: 1.55; color: #222; }
  h1 { font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 0.25em; }
  h2 { font-size: 13pt; margin-top: 1.3em; border-bottom: 1px solid #bbb; padding-bottom: 0.2em; }
  h3 { font-size: 11pt; margin-top: 1em; }
  img { max-width: 100%; height: auto; display: block; margin: 0.6em 0; page-break-inside: avoid; }
  ol, ul { padding-left: 1.35em; }
  li { margin: 0.3em 0; }
  p { margin: 0.45em 0; }
  strong { font-weight: 600; }
  a { color: #1a1a1a; word-break: break-all; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.2em 0; }
`;

const LIGHTBOX_SCRIPT = `
document.querySelectorAll('.main img, .step-card img').forEach(img => {
  img.addEventListener('click', () => {
    const dlg = document.getElementById('lightbox');
    const full = document.getElementById('lightbox-img');
    full.src = img.src;
    full.alt = img.alt || '';
    dlg.showModal();
  });
});
document.getElementById('lightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') e.target.close();
});
`;

const OP_LABELS = { view: "参照", create: "作成", update: "更新", print: "印刷", delete: "削除" };

export function extractHeadings(md) {
  const headings = [];
  for (const line of md.split("\n")) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) headings.push({ level: 2, text: h2[1].replace(/\*\*/g, ""), id: slugify(h2[1]) });
    else if (h3) headings.push({ level: 3, text: h3[1].replace(/\*\*/g, ""), id: slugify(h3[1]) });
  }
  return headings;
}

function slugify(text) {
  return text.replace(/\*\*/g, "").trim().toLowerCase()
    .replace(/[^\w\u3000-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g, "-").replace(/^-|-$/g, "") || "section";
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\*\*/g, "").trim() : "機能マニュアル";
}

function addHeadingIds(html, headings) {
  let idx = 0;
  return html.replace(/<h([23])>/g, (match, level) => {
    const h = headings[idx++];
    return h && String(h.level) === level ? `<h${level} id="${h.id}">` : match;
  });
}

function wrapOperationSections(html) {
  return html.replace(
    /<h2([^>]*)>([^<]*操作手順[^<]*)<\/h2>([\s\S]*?)(?=<h2|$)/i,
    (_, attrs, title, content) => {
      let wrapped = content;
      if (/<h3/i.test(content)) {
        wrapped = content.replace(
          /<h3([^>]*)>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<h2|$)/gi,
          (m, h3attrs, h3title, body) => `<div class="step-card"><h3${h3attrs}>${h3title}</h3>${body}</div>`
        );
      } else if (/<ol>/i.test(content)) {
        wrapped = content.replace(
          /<ol>([\s\S]*?)<\/ol>/,
          (m, ol) => `<div class="step-card"><ol>${ol}</ol></div>`
        );
      }
      return `<h2${attrs}>${title}</h2>${wrapped}`;
    }
  );
}

function injectReferenceVideo(html, meta) {
  if (!meta?.referenceVideo?.url) return html;
  const { url, title = "操作録画", duration = "" } = meta.referenceVideo;
  const durationNote = duration ? `（${escapeHtml(duration)}）` : "";
  const block = `<section class="reference-video" aria-label="参照動画">
<h2>参照動画</h2>
<p>${escapeHtml(title)}${durationNote} — 画面操作の全体像を確認できます。</p>
<video controls preload="metadata" playsinline src="${escapeHtml(url)}"></video>
</section>`;
  const patterns = [
    /(<h2[^>]*id="前提・権限"[^>]*>)/,
    /(<h2[^>]*id="前提条件"[^>]*>)/,
    /(<h2[^>]*>前提・権限<\/h2>)/,
    /(<h2[^>]*>前提条件<\/h2>)/,
  ];
  for (const pat of patterns) {
    if (pat.test(html)) return html.replace(pat, `${block}$1`);
  }
  return block + html;
}

function loadCatalog(repoRoot) {
  if (!repoRoot) return null;
  const p = join(repoRoot, "data", "feature-catalog.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function findFeature(catalog, featureId) {
  if (!catalog?.modules) return null;
  for (const mod of catalog.modules) {
    const feat = mod.features?.find((f) => f.id === featureId);
    if (feat) return { ...feat, moduleLabel: mod.label, moduleId: mod.id };
  }
  return null;
}

function buildBreadcrumb(meta, catalog, siteRoot) {
  const feat = meta?.featureId ? findFeature(catalog, meta.featureId) : null;
  const moduleLabel = meta?.moduleLabel ?? feat?.moduleLabel ?? "—";
  const featureLabel = meta?.title ?? feat?.label ?? meta?.slug ?? "機能";
  return `<nav class="breadcrumb" aria-label="パンくず">
  <a href="${siteRoot}">機能マニュアル</a>
  <span> › </span>
  <span>${escapeHtml(moduleLabel)}</span>
  <span> › </span>
  <span>${escapeHtml(featureLabel)}</span>
</nav>`;
}

function buildHeaderMeta(meta, catalog) {
  const feat = meta?.featureId ? findFeature(catalog, meta.featureId) : null;
  const menuPath = meta?.menuPath ?? feat?.menuPath ?? "";
  const objectApi = meta?.objectApiName ?? feat?.objectApiName ?? "";
  const ops = (meta?.operations ?? []).map((op) => {
    const label = OP_LABELS[op] ?? op;
    return `<span class="meta-tag">${escapeHtml(label)}</span>`;
  }).join("");
  const parts = [];
  if (menuPath) parts.push(`<span class="meta-tag">${escapeHtml(menuPath)}</span>`);
  if (objectApi) parts.push(`<span class="meta-tag">${escapeHtml(objectApi)}</span>`);
  if (ops) parts.push(ops);
  return parts.length ? `<div class="header-meta">${parts.join("")}</div>` : "";
}

function injectRelatedFeatures(html, meta, catalog, siteRoot) {
  const ids = meta?.relatedFeatures ?? [];
  if (!ids.length || !catalog) return html;
  const links = ids.map((id) => {
    const feat = findFeature(catalog, id);
    if (!feat) return null;
    const slug = feat.manualSlug ?? `feat-${id}`;
    return `<li><a href="${siteRoot}manuals/${escapeHtml(slug)}/">${escapeHtml(feat.label)}</a></li>`;
  }).filter(Boolean);
  if (!links.length) return html;
  const block = `<section class="related-features" aria-label="関連機能">
<h2>関連機能</h2>
<ul>${links.join("")}</ul>
</section>`;
  if (/<h2[^>]*>関連機能<\/h2>/i.test(html)) return html;
  return html.replace(/(<h2[^>]*>補足・制約<\/h2>)/i, `${block}$1`)
    || html.replace(/(<h2[^>]*>補足<\/h2>)/i, `${block}$1`)
    || html + block;
}

function buildTocHtml(headings) {
  if (!headings.length) return '<p class="sidebar-title">目次</p>';
  const items = headings.map((h) => {
    const cls = h.level === 3 ? ' class="toc-h3"' : "";
    return `<li${cls}><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`;
  }).join("\n");
  return `<p class="sidebar-title">目次</p><ul class="toc">${items}</ul>`;
}

/**
 * @param {string} md
 * @param {{ mode?: 'web'|'print', title?: string, meta?: object, siteRoot?: string, repoRoot?: string }} options
 */
export async function renderManualHtml(md, options = {}) {
  const mode = options.mode ?? "web";
  const title = options.title ?? options.meta?.title ?? extractTitle(md);
  const meta = options.meta ?? null;
  const siteRoot = options.siteRoot ?? "../../";
  const catalog = loadCatalog(options.repoRoot);

  const bodyHtml = await marked.parse(md, { async: true });

  if (mode === "print") {
    return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`;
  }

  const headings = extractHeadings(md);
  let contentHtml = addHeadingIds(bodyHtml, headings);
  contentHtml = injectReferenceVideo(contentHtml, meta);
  contentHtml = wrapOperationSections(contentHtml);
  contentHtml = injectRelatedFeatures(contentHtml, meta, catalog, siteRoot);

  const tocHtml = buildTocHtml(headings);
  const breadcrumb = buildBreadcrumb(meta, catalog, siteRoot);
  const headerMeta = buildHeaderMeta(meta, catalog);
  const env = meta?.environment || catalog?.environment || "";
  const envLine = `<p>機能マニュアル${env ? ` · ${escapeHtml(env)}` : ""}</p>`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${WEB_CSS}</style>
</head>
<body>
<div class="layout">
  <header class="header">
    ${breadcrumb}
    <h1>${escapeHtml(title)}</h1>
    ${headerMeta}
    ${envLine}
  </header>
  <nav class="sidebar" aria-label="目次">
    <a class="sidebar-back" href="${siteRoot}">← 機能マニュアル一覧</a>
    ${tocHtml}
  </nav>
  <main class="main">${contentHtml}</main>
</div>
<dialog id="lightbox" class="lightbox"><img id="lightbox-img" src="" alt=""></dialog>
<script>${LIGHTBOX_SCRIPT}</script>
</body>
</html>`;
}
