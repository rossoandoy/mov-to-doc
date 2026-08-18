/**
 * Glossary index page — module-grouped term table with filter.
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

const GLOSSARY_CSS = `
.glossary-intro{margin:0 0 20px;font-size:.875rem;color:var(--muted)}
.filter{margin-bottom:20px;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius);width:100%;max-width:420px;font:inherit}
.module-section{margin-bottom:36px}
.module-section h2{font-size:1.05rem;color:var(--brand);margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid var(--brand-border)}
table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:var(--radius);font-size:.875rem}
th,td{border:1px solid var(--border);padding:10px 12px;text-align:left;vertical-align:top}
th{background:var(--brand-bg);color:var(--brand)}
.term-link{color:var(--brand);font-weight:600;text-decoration:none}
.term-link:hover{text-decoration:underline}
.variant-chip{display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:4px;background:#f5f5f5;border:1px solid var(--border);font-size:.75rem}
.object-api{font-size:.75rem;color:var(--muted);font-family:monospace}
tr.hidden{display:none}
`;

const FILTER_SCRIPT = `<script>
(function(){
  const input = document.getElementById('glossary-filter');
  const rows = document.querySelectorAll('[data-search]');
  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach(row => {
      const hay = (row.getAttribute('data-search') || '').toLowerCase();
      row.classList.toggle('hidden', q && !hay.includes(q));
    });
  });
})();
<\/script>`;

function groupByModule(terms, catalog) {
  const groups = new Map();
  for (const t of terms) {
    const id = t.moduleId ?? "other";
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(t);
  }
  return [...groups.entries()]
    .map(([id, items]) => ({
      id,
      label: moduleLabel(catalog, id),
      items: items.sort((a, b) => a.canonical.localeCompare(b.canonical, "ja")),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ja"));
}

/**
 * @param {{ terms: object[], catalog: object, environment?: string }} opts
 */
export function renderGlossaryIndex({ terms = [], catalog = {}, environment }) {
  const groups = groupByModule(terms, catalog);
  const sections = groups
    .map((g) => {
      const rows = g.items
        .map((t) => {
          const variants = (t.variants ?? [])
            .filter((v) => v !== t.canonical)
            .map((v) => `<span class="variant-chip">${escapeHtml(v)}</span>`)
            .join("");
          const search = [t.id, t.canonical, t.definition, ...(t.variants ?? []), t.objectApiName]
            .filter(Boolean)
            .join(" ");
          const api = t.objectApiName
            ? `<div class="object-api">${escapeHtml(t.objectApiName)}</div>`
            : "";
          return `<tr data-search="${escapeHtml(search)}">
  <td><a class="term-link" href="/glossary/terms/${escapeHtml(t.id)}/">${escapeHtml(t.canonical)}</a>${api}</td>
  <td>${escapeHtml(t.definition ?? "")}</td>
  <td>${variants || "—"}</td>
</tr>`;
        })
        .join("");
      return `<section class="module-section" id="module-${escapeHtml(g.id)}">
  <h2>${escapeHtml(g.label)}</h2>
  <table>
    <thead><tr><th>用語</th><th>説明</th><th>別名・表記</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
    })
    .join("");

  const body = `
<p class="glossary-intro">${escapeHtml(catalog?.product ?? PRODUCT_NAME)}で使うシステム関連用語です。</p>
<label for="glossary-filter" class="visually-hidden">用語を絞り込む</label>
<input type="search" id="glossary-filter" class="filter" placeholder="用語名・説明で絞り込み…" aria-label="用語を絞り込む">
${sections || "<p>用語が登録されていません。</p>"}
${FILTER_SCRIPT}`;

  return renderContentPage({
    pageTitle: "用語集",
    headerTitle: "用語集",
    headerSubtitle: `${terms.length} 語 · システム用語`,
    activeNav: "glossary",
    breadcrumbs: [
      { href: "/", label: "機能マニュアル" },
      { label: "用語集", current: true },
    ],
    body,
    extraCss: GLOSSARY_CSS + `.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}`,
    showBackPortal: true,
    environment,
  });
}
