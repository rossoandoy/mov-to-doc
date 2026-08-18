/**
 * Site map page
 */
import { renderContentPage, PRODUCT_NAME } from "./site-chrome.mjs";
import { moduleLabel } from "./catalog-utils.mjs";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXTRA_CSS = `
.sitemap-section{margin-bottom:32px}
.sitemap-section h2{font-size:1rem;color:var(--brand);margin:0 0 12px;border-bottom:1px solid var(--border);padding-bottom:8px}
.sitemap-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
@media(min-width:640px){.sitemap-list{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}}
.sitemap-list a{color:var(--brand);text-decoration:none;font-size:.875rem}
.sitemap-list a:hover{text-decoration:underline}
.sitemap-meta{font-size:.75rem;color:var(--muted);margin-left:6px}
.sitemap-links{list-style:none;padding:0;margin:0}
.sitemap-links li{margin:8px 0}
.sitemap-links a{color:var(--brand)}
`;

/**
 * @param {{ catalog: object, manuals: object[], terms: object[], environment?: string }} opts
 */
export function renderSitemap({ catalog = {}, manuals = [], terms = [], environment }) {
  const modules = [...(catalog.modules ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const manualSections = modules
    .map((mod) => {
      const feats = (mod.features ?? []).filter((f) =>
        manuals.some((m) => m.slug === f.manualSlug)
      );
      if (!feats.length) return "";
      const items = feats
        .map(
          (f) =>
            `<li><a href="/manuals/${escapeHtml(f.manualSlug)}/">${escapeHtml(f.label)}</a></li>`
        )
        .join("");
      return `<section class="sitemap-section"><h2>${escapeHtml(mod.label)}</h2><ul class="sitemap-list">${items}</ul></section>`;
    })
    .join("");

  const termItems = terms
    .map(
      (t) =>
        `<li><a href="/glossary/terms/${escapeHtml(t.id)}/">${escapeHtml(t.canonical)}</a><span class="sitemap-meta">${escapeHtml(moduleLabel(catalog, t.moduleId))}</span></li>`
    )
    .join("");

  const body = `
${manualSections}
<section class="sitemap-section">
  <h2>用語集（${terms.length} 語）</h2>
  <ul class="sitemap-list">${termItems}</ul>
  <p style="margin-top:12px"><a href="/glossary/">用語集トップへ</a></p>
</section>
<section class="sitemap-section">
  <h2>その他</h2>
  <ul class="sitemap-links">
    <li><a href="/search/">サイト全体検索</a></li>
    <li><a href="/about/">このマニュアルについて</a></li>
  </ul>
</section>`;

  return renderContentPage({
    pageTitle: "サイトマップ",
    headerTitle: "サイトマップ",
    headerSubtitle: `${catalog?.product ?? PRODUCT_NAME}ポータル`,
    breadcrumbs: [
      { href: "/", label: "機能マニュアル" },
      { label: "サイトマップ", current: true },
    ],
    body,
    extraCss: EXTRA_CSS,
    showBackPortal: true,
    environment,
  });
}
