/**
 * Individual glossary term detail page.
 */
import { renderContentPage } from "./site-chrome.mjs";
import { featureById, moduleLabel } from "./catalog-utils.mjs";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TERM_CSS = `
.term-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 24px;margin-bottom:20px}
.term-card h2{margin:0 0 8px;font-size:1.2rem;color:var(--brand)}
.term-meta{font-size:.8125rem;color:var(--muted);margin-bottom:12px}
.variant-chip{display:inline-block;margin:2px 6px 2px 0;padding:4px 10px;border-radius:4px;background:#f5f5f5;border:1px solid var(--border);font-size:.8125rem}
.manual-list{list-style:none;margin:0;padding:0}
.manual-list li{margin:8px 0}
.manual-list a{color:var(--brand)}
`;

/**
 * @param {{ term: object, catalog: object, environment?: string }} opts
 */
export function renderTermPage({ term, catalog = {}, environment }) {
  const mod = moduleLabel(catalog, term.moduleId);
  const variants = (term.variants ?? []).filter((v) => v !== term.canonical);

  const related = (term.relatedFeatures ?? [])
    .map((fid) => featureById(catalog, fid))
    .filter(Boolean);

  const manualList = related.length
    ? `<ul class="manual-list">${related
        .map(
          (f) =>
            `<li><a href="/manuals/${escapeHtml(f.manualSlug)}/">${escapeHtml(f.label)}</a></li>`
        )
        .join("")}</ul>`
    : `<p class="term-meta">関連機能マニュアルは未リンクです。</p>`;

  const body = `
<section class="term-card">
  <h2>${escapeHtml(term.canonical)}</h2>
  <p class="term-meta">${escapeHtml(mod)}${term.objectApiName ? ` · <code>${escapeHtml(term.objectApiName)}</code>` : ""}</p>
  <p>${escapeHtml(term.definition ?? "")}</p>
  ${variants.length ? `<p><strong>別名・表記:</strong> ${variants.map((v) => `<span class="variant-chip">${escapeHtml(v)}</span>`).join("")}</p>` : ""}
</section>
<section class="term-card">
  <h2>関連機能マニュアル</h2>
  ${manualList}
</section>`;

  return renderContentPage({
    pageTitle: term.canonical,
    headerTitle: term.canonical,
    headerSubtitle: "用語詳細",
    activeNav: "glossary",
    breadcrumbs: [
      { href: "/", label: "機能マニュアル" },
      { href: "/glossary/", label: "用語集" },
      { label: term.canonical, current: true },
    ],
    body,
    extraCss: TERM_CSS,
    showBackPortal: true,
    environment,
  });
}
