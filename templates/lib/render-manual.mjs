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
body {
  margin: 0;
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.65;
  color: var(--text);
  background: var(--bg);
}
.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: static !important; height: auto !important; }
}
.header {
  grid-column: 1 / -1;
  background: var(--brand);
  color: #fff;
  padding: 16px 24px;
  box-shadow: var(--shadow);
}
.header h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
}
.header p {
  margin: 4px 0 0;
  font-size: 0.875rem;
  opacity: 0.9;
}
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
}
.sidebar-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin: 0 0 12px;
}
.toc { list-style: none; padding: 0; margin: 0; }
.toc li { margin: 0; }
.toc a {
  display: block;
  padding: 6px 10px;
  color: var(--text);
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.4;
}
.toc a:hover { background: var(--brand-bg); color: var(--brand); }
.toc .toc-h3 { padding-left: 18px; font-size: 0.8125rem; color: var(--text-muted); }
.main {
  padding: 32px 40px 64px;
  max-width: 900px;
}
.main h2 {
  font-size: 1.25rem;
  margin: 2rem 0 1rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid var(--brand-border);
  color: var(--brand);
  scroll-margin-top: 16px;
}
.main h3 {
  font-size: 1.05rem;
  margin: 1.5rem 0 0.75rem;
  scroll-margin-top: 16px;
}
.main p { margin: 0.6em 0; }
.main ul, .main ol { padding-left: 1.4em; margin: 0.6em 0; }
.main li { margin: 0.35em 0; }
.main strong { font-weight: 600; }
.main hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
.step-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin: 1.25rem 0;
  box-shadow: var(--shadow);
}
.step-card > ol > li,
.step-card > ul > li {
  list-style: none;
  margin: 0;
  padding: 0;
}
.step-card img,
.main img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  cursor: zoom-in;
}
.main img:hover { border-color: var(--brand-border); }
.tip {
  background: var(--brand-bg);
  border-left: 4px solid var(--brand);
  padding: 12px 16px;
  margin: 1em 0;
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 0.9375rem;
}
dialog.lightbox {
  border: none;
  padding: 0;
  background: transparent;
  max-width: 95vw;
  max-height: 95vh;
}
dialog.lightbox::backdrop { background: rgba(0,0,0,.75); }
dialog.lightbox img {
  max-width: 95vw;
  max-height: 90vh;
  display: block;
  border-radius: var(--radius);
}
@media print {
  .sidebar, .header { display: none; }
  .layout { display: block; }
  .main { padding: 0; max-width: none; }
  .step-card { break-inside: avoid; box-shadow: none; }
  img { break-inside: avoid; }
}
`;

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 14mm; }
  body {
    font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #222;
  }
  h1 { font-size: 18pt; border-bottom: 2px solid #333; padding-bottom: 0.25em; }
  h2 { font-size: 13pt; margin-top: 1.3em; border-bottom: 1px solid #bbb; padding-bottom: 0.2em; }
  h3 { font-size: 11pt; margin-top: 1em; }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0.6em 0;
    page-break-inside: avoid;
  }
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

/**
 * Extract h2/h3 headings from markdown for TOC.
 */
export function extractHeadings(md) {
  const headings = [];
  for (const line of md.split("\n")) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      headings.push({ level: 2, text: h2[1].replace(/\*\*/g, ""), id: slugify(h2[1]) });
    } else if (h3) {
      headings.push({ level: 3, text: h3[1].replace(/\*\*/g, ""), id: slugify(h3[1]) });
    }
  }
  return headings;
}

function slugify(text) {
  return text
    .replace(/\*\*/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u3000-\u9fff\u3040-\u309f\u30a0-\u30ff]+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

/**
 * Wrap numbered procedure sections in step cards.
 */
function wrapStepCards(html) {
  return html.replace(
    /<h2([^>]*)>([^<]*操作手順[^<]*)<\/h2>([\s\S]*?)(?=<h2|$)/i,
    (match, attrs, title, content) => {
      const wrapped = content.replace(
        /<ol>([\s\S]*?)<\/ol>/,
        (_, ol) => `<div class="step-card"><ol>${ol}</ol></div>`
      );
      return `<h2${attrs}>${title}</h2>${wrapped}`;
    }
  );
}

function buildTocHtml(headings) {
  if (headings.length === 0) return "<p class=\"sidebar-title\">目次</p><p style=\"font-size:0.875rem;color:var(--text-muted)\">—</p>";
  const items = headings
    .map((h) => {
      const cls = h.level === 3 ? ' class="toc-h3"' : "";
      return `<li${cls}><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`;
    })
    .join("\n");
  return `<p class="sidebar-title">目次</p><ul class="toc">${items}</ul>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\*\*/g, "").trim() : "操作マニュアル";
}

function addHeadingIds(html, headings) {
  let idx = 0;
  return html.replace(/<h([23])>/g, (match, level) => {
    const h = headings[idx];
    idx++;
    if (h && String(h.level) === level) {
      return `<h${level} id="${h.id}">`;
    }
    return match;
  });
}

/**
 * @param {string} md - Markdown source
 * @param {{ mode?: 'web' | 'print', title?: string }} options
 */
export async function renderManualHtml(md, options = {}) {
  const mode = options.mode ?? "web";
  const title = options.title ?? extractTitle(md);

  const bodyHtml = await marked.parse(md, { async: true });

  if (mode === "print") {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }

  const headings = extractHeadings(md);
  let contentHtml = addHeadingIds(bodyHtml, headings);
  contentHtml = wrapStepCards(contentHtml);
  const tocHtml = buildTocHtml(headings);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${WEB_CSS}</style>
</head>
<body>
<div class="layout">
  <header class="header">
    <h1>${escapeHtml(title)}</h1>
    <p>操作マニュアル</p>
  </header>
  <nav class="sidebar" aria-label="目次">
    ${tocHtml}
  </nav>
  <main class="main">
    ${contentHtml}
  </main>
</div>
<dialog id="lightbox" class="lightbox">
  <img id="lightbox-img" src="" alt="">
</dialog>
<script>${LIGHTBOX_SCRIPT}</script>
</body>
</html>`;
}
