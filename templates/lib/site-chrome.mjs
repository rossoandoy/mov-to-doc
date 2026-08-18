/**
 * Shared site chrome — feature manual portal
 *
 * サイト名は data/feature-catalog.json の `product` から setProductName() で上書きする。
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export let PRODUCT_NAME = "機能マニュアル";

/** サイト名を差し替える（build 時に catalog.product を渡す） */
export function setProductName(name) {
  if (name) PRODUCT_NAME = name;
}

export const SITE_CHROME_CSS = `
.site-header{background:var(--brand);color:#fff;padding:20px 28px}
.site-header h1{margin:0;font-size:1.25rem;font-weight:700}
.site-header .site-subtitle{margin:6px 0 0;opacity:.9;font-size:.875rem}
.site-nav{margin-top:14px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.site-nav a{color:#fff;font-size:.875rem;text-decoration:none;padding:4px 0;border-bottom:2px solid transparent}
.site-nav a:hover,.site-nav a.active{border-bottom-color:#fff;font-weight:600}
.site-search{margin-left:auto;display:flex;gap:6px}
.site-search input[type=search]{padding:6px 10px;border:0;border-radius:var(--radius);font:inherit;font-size:.8125rem;min-width:160px;max-width:220px}
.site-search button{padding:6px 12px;border:0;border-radius:var(--radius);background:rgba(255,255,255,.2);color:#fff;font:inherit;font-size:.8125rem;cursor:pointer}
.site-search button:hover{background:rgba(255,255,255,.35)}
.site-breadcrumb{margin:0 0 16px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px;font-size:.8125rem;color:var(--muted)}
.site-breadcrumb li{display:flex;align-items:center;gap:4px}
.site-breadcrumb li+li::before{content:"›";color:var(--muted);margin-right:4px}
.site-breadcrumb a{color:var(--brand);text-decoration:none}
.site-breadcrumb a:hover{text-decoration:underline}
.site-breadcrumb [aria-current=page]{color:var(--text);font-weight:600}
.back-portal{display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;color:var(--brand);font-size:.875rem;font-weight:600;text-decoration:none}
.back-portal:hover{text-decoration:underline}
.site-footer{margin-top:48px;padding:24px 28px;border-top:1px solid var(--border);background:var(--surface);font-size:.8125rem;color:var(--muted)}
.site-footer nav{display:flex;flex-wrap:wrap;gap:12px 20px}
.site-footer a{color:var(--brand);text-decoration:none}
.site-footer a:hover{text-decoration:underline}
.manual-chrome-links{display:flex;flex-wrap:wrap;gap:8px 14px;margin-bottom:16px;font-size:.8125rem}
.manual-chrome-links a{color:var(--brand);text-decoration:none}
.manual-chrome-links a:hover{text-decoration:underline}
@media(max-width:640px){
  .site-nav{flex-direction:column;align-items:flex-start;gap:10px}
  .site-search{margin-left:0;width:100%}
  .site-search input[type=search]{flex:1;min-width:0;max-width:none;width:100%}
}
`;

export const NAV_ITEMS = [
  { id: "portal", href: "/", label: "機能マニュアル" },
  { id: "glossary", href: "/glossary/", label: "用語集" },
];

export function renderSiteHeader({ activeNav, title, subtitle, searchQuery = "" }) {
  const nav = NAV_ITEMS.map((item) =>
    `<a href="${item.href}"${activeNav === item.id ? ' class="active" aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`
  ).join("");
  const sub = subtitle ? `<p class="site-subtitle">${escapeHtml(subtitle)}</p>` : "";
  const q = escapeHtml(searchQuery);
  const searchForm = `<form class="site-search" action="/search/" method="get" role="search">
    <input type="search" name="q" value="${q}" placeholder="マニュアル・用語を検索…" aria-label="サイト全体検索">
    <button type="submit">検索</button>
  </form>`;
  return `<header class="site-header">
  <h1>${escapeHtml(title)}</h1>
  ${sub}
  <nav class="site-nav" aria-label="サイト全体">${nav}${searchForm}</nav>
</header>`;
}

export function renderBreadcrumbs(crumbs) {
  if (!crumbs?.length) return "";
  const items = crumbs
    .map((c) => {
      if (c.current || !c.href) {
        return `<li><span aria-current="page">${escapeHtml(c.label)}</span></li>`;
      }
      return `<li><a href="${c.href}">${escapeHtml(c.label)}</a></li>`;
    })
    .join("");
  return `<nav aria-label="パンくず"><ol class="site-breadcrumb">${items}</ol></nav>`;
}

export function renderBackToPortal() {
  return `<a class="back-portal" href="/">← 機能マニュアル一覧</a>`;
}

export function renderSiteFooter({ environment = "" } = {}) {
  const envSuffix = environment ? ` · ${escapeHtml(environment)}` : "";
  return `<footer class="site-footer">
  <nav aria-label="フッター">
    <a href="/sitemap/">サイトマップ</a>
    <a href="/glossary/">用語集</a>
    <a href="/search/">サイト全体検索</a>
    <a href="/about/">このマニュアルについて</a>
  </nav>
  <p style="margin:12px 0 0">${escapeHtml(PRODUCT_NAME)}${envSuffix}</p>
</footer>`;
}

export function renderManualChromeLinks() {
  return `<nav class="manual-chrome-links" aria-label="サイトナビ">
  <a href="/search/">サイト全体検索</a>
  <a href="/glossary/">用語集</a>
  <a href="/sitemap/">サイトマップ</a>
</nav>`;
}

export function renderContentPage({
  pageTitle,
  headerTitle,
  headerSubtitle,
  activeNav,
  breadcrumbs = [],
  body,
  extraCss = "",
  extraHead = "",
  showBackPortal = false,
  environment = "",
}) {
  const bc = renderBreadcrumbs(breadcrumbs);
  const back = showBackPortal ? renderBackToPortal() : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)} — ${escapeHtml(PRODUCT_NAME)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root { --brand:#2954c2; --brand-bg:#eef4ff; --brand-border:#c5d7f5; --bg:#f3f3f3; --surface:#fff; --border:#e0e0e0; --muted:#706e6b; --text:#181818; --radius:8px; }
*{box-sizing:border-box} body{margin:0;font-family:"Noto Sans JP",sans-serif;background:var(--bg);color:var(--text);font-size:15px;line-height:1.6}
main{max-width:1040px;margin:0 auto;padding:24px 24px 0}
${SITE_CHROME_CSS}
${extraCss}
</style>
${extraHead}
</head>
<body>
${renderSiteHeader({ activeNav, title: headerTitle, subtitle: headerSubtitle })}
<main>
${bc}
${back}
${body}
${renderSiteFooter({ environment })}
</main>
</body>
</html>`;
}
