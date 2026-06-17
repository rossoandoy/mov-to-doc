/**
 * Shared Markdown → HTML rendering for mov-to-doc (web + print).
 */
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
  .sidebar-back { display: inline-block; margin: 0 12px 0 0; }
  .toc { display: inline-flex; gap: 4px; margin: 0; vertical-align: middle; }
  .toc li { flex: 0 0 auto; }
  .toc a { padding: 8px 10px; white-space: nowrap; }
  .uat-sidebar { display: none; }
}
@media (max-width: 640px) {
  .header { padding: 14px 16px; }
  .main { padding: 20px 16px 48px; }
  .step-card { padding: 16px 14px; }
}
.header { grid-column: 1 / -1; background: var(--brand); color: #fff; padding: 16px 24px; box-shadow: var(--shadow); }
.header h1 { margin: 0; font-size: 1.35rem; font-weight: 600; }
.header-meta { margin: 6px 0 0; font-size: 0.8125rem; opacity: 0.92; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.header p { margin: 4px 0 0; font-size: 0.875rem; opacity: 0.9; }
.phase-tag { background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
.sidebar { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: var(--surface); border-right: 1px solid var(--border); padding: 20px 16px; }
.sidebar-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin: 0 0 12px; }
.sidebar-back { display: block; margin-bottom: 16px; font-size: 0.8125rem; color: var(--brand); text-decoration: none; }
.sidebar-back:hover { text-decoration: underline; }
.toc { list-style: none; padding: 0; margin: 0 0 20px; }
.toc li { margin: 0; }
.toc a { display: block; padding: 6px 10px; color: var(--text); text-decoration: none; border-radius: 4px; font-size: 0.875rem; line-height: 1.4; }
.toc a:hover { background: var(--brand-bg); color: var(--brand); }
.toc .toc-h3 { padding-left: 18px; font-size: 0.8125rem; color: var(--text-muted); }
.uat-sidebar details { margin-top: 8px; font-size: 0.8125rem; }
.uat-sidebar summary { cursor: pointer; color: var(--brand); font-weight: 600; }
.uat-sidebar ul { padding-left: 1.2em; margin: 8px 0; }
.uat-sidebar li { margin: 4px 0; color: var(--text-muted); }
.main { padding: 32px 40px 64px; max-width: 920px; }
.main > h1:first-child { display: none; }
.main h2 { font-size: 1.25rem; margin: 2rem 0 1rem; padding-bottom: 0.4rem; border-bottom: 2px solid var(--brand-border); color: var(--brand); scroll-margin-top: 16px; }
.main h3 { font-size: 1.05rem; margin: 1.5rem 0 0.75rem; scroll-margin-top: 16px; }
.main p { margin: 0.6em 0; }
.main ul, .main ol { padding-left: 1.4em; margin: 0.6em 0; }
.main li { margin: 0.35em 0; }
.main strong { font-weight: 600; }
.main hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.flow-overview { margin: 1rem 0 1.5rem; }
.flow-strip { display: flex; align-items: stretch; gap: 8px; overflow-x: auto; scroll-snap-type: x proximity; padding: 4px 0 8px; }
.flow-node { flex: 0 0 152px; scroll-snap-align: start; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 10px; text-align: center; font-size: 0.8125rem; line-height: 1.4; position: relative; }
.flow-node:not(:last-child)::after { content: "→"; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); color: var(--brand); font-weight: 700; z-index: 1; }
.flow-node-num { display: block; font-size: 0.6875rem; color: var(--brand); font-weight: 700; margin-bottom: 4px; }
@media (min-width: 960px) {
  .flow-node { flex: 1 1 0; min-width: 0; }
}
@media (max-width: 640px) {
  .flow-strip { display: grid; grid-template-columns: 1fr; overflow: visible; }
  .flow-node { min-width: 0; text-align: left; padding-left: 44px; }
  .flow-node-num { position: absolute; left: 14px; top: 12px; }
  .flow-node:not(:last-child)::after { content: "↓"; right: auto; left: 20px; top: calc(100% - 2px); transform: none; }
}
.step-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; margin: 1.25rem 0; box-shadow: var(--shadow); }
.step-card > ol { list-style: none; padding: 0; margin: 0; counter-reset: step; }
.step-card > ol > li { list-style: none; margin: 0 0 1.75rem; padding: 0 0 1.75rem; border-bottom: 1px solid var(--border); counter-increment: step; }
.step-card > ol > li:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.step-card > ol > li::before { content: "手順 " counter(step); display: block; font-size: 0.75rem; font-weight: 700; color: var(--brand); margin-bottom: 6px; letter-spacing: 0.03em; }
.step-card > ol > li.branch-tip-item { counter-increment: none; margin: -0.5rem 0 1.5rem; padding: 0; border-bottom: 0; }
.step-card > ol > li.branch-tip-item::before { content: none; }
.step-uat { margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
.uat-badge { display: inline-block; font-size: 0.6875rem; font-weight: 600; padding: 2px 7px; border-radius: 4px; background: var(--brand-bg); color: var(--brand); border: 1px solid var(--brand-border); }
.branch-tip { background: var(--warn-bg); border-left: 4px solid var(--warn-border); padding: 12px 16px; margin: 0; border-radius: 0 var(--radius) var(--radius) 0; font-size: 0.875rem; }
.branch-tip strong { display: block; margin-bottom: 4px; color: #8a6116; }
.step-card img, .main img { max-width: 100%; height: auto; display: block; margin: 12px 0; border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); cursor: zoom-in; }
.main img:hover { border-color: var(--brand-border); }
.reference-video { margin: 1.25rem 0 2rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; box-shadow: var(--shadow); }
.reference-video h2 { margin: 0 0 8px; font-size: 1.05rem; border: none; padding: 0; color: var(--brand); }
.reference-video p { margin: 0 0 12px; font-size: 0.875rem; color: var(--text-muted); }
.reference-video video { width: 100%; max-height: 480px; border-radius: var(--radius); background: #000; }
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

function wrapStepCards(html) {
  return html.replace(
    /<h2([^>]*)>([^<]*操作手順[^<]*)<\/h2>([\s\S]*?)(?=<h2|$)/i,
    (_, attrs, title, content) => {
      const wrapped = content.replace(
        /<ol>([\s\S]*?)<\/ol>/,
        (_, ol) => `<div class="step-card"><ol>${ol}</ol></div>`
      );
      return `<h2${attrs}>${title}</h2>${wrapped}`;
    }
  );
}

function buildFlowStrip(steps) {
  return `<div class="flow-strip">${steps.map((label, i) =>
    `<div class="flow-node"><span class="flow-node-num">${i + 1}</span>${escapeHtml(label)}</div>`
  ).join("")}</div>`;
}

function injectFlowOverview(html, meta) {
  if (!meta?.flowSummary?.length) return html;
  const strip = `<div class="flow-overview">${buildFlowStrip(meta.flowSummary)}</div>`;
  if (/<h2[^>]*>業務フロー概要<\/h2>/i.test(html)) {
    return html.replace(/(<h2[^>]*>業務フロー概要<\/h2>)/i, `$1\n${strip}`);
  }
  return strip + html;
}

function injectBranchTips(html, meta) {
  if (!meta?.branchTips?.length) return html;
  return html.replace(/<div class="step-card"><ol>([\s\S]*?)<\/ol><\/div>/, (match, inner) => {
    let stepNum = 0;
    const parts = inner.split(/(?=<li>)/);
    const rebuilt = parts.map((part) => {
      if (!part.startsWith("<li>")) return part;
      stepNum++;
      const tip = meta.branchTips.find((t) => t.afterStep === stepNum);
      const tipHtml = tip
        ? `<li class="branch-tip-item"><div class="branch-tip"><strong>${escapeHtml(tip.condition)}</strong>${escapeHtml(tip.message)}</div></li>`
        : "";
      return part + tipHtml;
    }).join("");
    return `<div class="step-card"><ol>${rebuilt}</ol></div>`;
  });
}

function injectUatBadges(html, meta) {
  if (!meta?.uatMapping?.length) return html;
  const map = new Map(meta.uatMapping.map((m) => [m.step, m.ids]));
  let stepNum = 0;
  return html.replace(/<div class="step-card"><ol>([\s\S]*?)<\/ol><\/div>/, (match, inner) => {
    const rebuilt = inner.replace(/<li>/g, () => {
      stepNum++;
      const ids = map.get(stepNum);
      if (!ids?.length) return "<li>";
      const badges = ids.map((id) => `<span class="uat-badge" title="UAT">${escapeHtml(id)}</span>`).join("");
      return `<li><div class="step-uat">${badges}</div>`;
    });
    return `<div class="step-card"><ol>${rebuilt}</ol></div>`;
  });
}

function buildTocHtml(headings) {
  if (!headings.length) return '<p class="sidebar-title">目次</p>';
  const items = headings.map((h) => {
    const cls = h.level === 3 ? ' class="toc-h3"' : "";
    return `<li${cls}><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`;
  }).join("\n");
  return `<p class="sidebar-title">目次</p><ul class="toc">${items}</ul>`;
}

function buildUatSidebar(meta) {
  if (!meta?.uatMapping?.length) return "";
  const rows = meta.uatMapping.map((m) =>
    `<li>手順${m.step}: ${m.ids.map((id) => `<span class="uat-badge">${escapeHtml(id)}</span>`).join(" ")} — ${escapeHtml(m.note || "")}</li>`
  ).join("");
  return `<div class="uat-sidebar"><details><summary>UAT 対応</summary><ul>${rows}</ul></details></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\*\*/g, "").trim() : "操作マニュアル";
}

function addHeadingIds(html, headings) {
  let idx = 0;
  return html.replace(/<h([23])>/g, (match, level) => {
    const h = headings[idx++];
    return h && String(h.level) === level ? `<h${level} id="${h.id}">` : match;
  });
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
  return html.replace(/(<h2[^>]*id="前提条件"[^>]*>)/, `${block}$1`);
}

function buildHeaderMeta(meta) {
  if (!meta?.flowRange) return "";
  const range = `${escapeHtml(meta.flowRange.from)} → ${escapeHtml(meta.flowRange.to)}`;
  const labels = meta.flowPhaseLabels ?? meta.flowPhases ?? [];
  const phases = labels.map((p) => `<span class="phase-tag">${escapeHtml(p)}</span>`).join("");
  return `<div class="header-meta"><span>${range}</span>${phases}</div>`;
}

/**
 * @param {string} md
 * @param {{ mode?: 'web'|'print', title?: string, meta?: object, siteRoot?: string }} options
 */
export async function renderManualHtml(md, options = {}) {
  const mode = options.mode ?? "web";
  const title = options.title ?? options.meta?.title ?? extractTitle(md);
  const meta = options.meta ?? null;
  const siteRoot = options.siteRoot ?? "../../";

  const bodyHtml = await marked.parse(md, { async: true });

  if (mode === "print") {
    return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`;
  }

  const headings = extractHeadings(md);
  let contentHtml = addHeadingIds(bodyHtml, headings);
  contentHtml = injectFlowOverview(contentHtml, meta);
  contentHtml = injectReferenceVideo(contentHtml, meta);
  contentHtml = wrapStepCards(contentHtml);
  contentHtml = injectBranchTips(contentHtml, meta);
  contentHtml = injectUatBadges(contentHtml, meta);

  const tocHtml = buildTocHtml(headings);
  const uatSidebar = buildUatSidebar(meta);
  const headerMeta = buildHeaderMeta(meta);

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
    <h1>${escapeHtml(title)}</h1>
    ${headerMeta}
    <p>操作マニュアル · ${escapeHtml(meta?.environment || "ExtUAT")}</p>
  </header>
  <nav class="sidebar" aria-label="目次">
    <a class="sidebar-back" href="${siteRoot}">← マニュアル一覧</a>
    ${tocHtml}
    ${uatSidebar}
  </nav>
  <main class="main">${contentHtml}</main>
</div>
<dialog id="lightbox" class="lightbox"><img id="lightbox-img" src="" alt=""></dialog>
<script>${LIGHTBOX_SCRIPT}</script>
</body>
</html>`;
}
