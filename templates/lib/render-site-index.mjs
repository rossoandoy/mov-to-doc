/**
 * Site index page — business flow navigation + manual cards + UAT table
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadManualMeta(manualsRoot, slug) {
  const p = join(manualsRoot, slug, "manual.meta.json");
  return readJson(p);
}

function phaseLabel(phases, id) {
  return phases.find((p) => p.id === id)?.label ?? id;
}

/**
 * @param {{ siteDir: string, repoRoot: string }} opts
 */
export function renderSiteIndex(opts) {
  const { siteDir, repoRoot } = opts;
  const businessFlow = readJson(join(repoRoot, "data", "business-flow.json")) ?? { phases: [] };
  const uatData = readJson(join(repoRoot, "data", "uat-cases.json")) ?? { cases: [] };
  const manualsRoot = join(repoRoot, "manuals");
  const siteManualsRoot = join(siteDir, "manuals");

  const slugs = existsSync(siteManualsRoot)
    ? readdirSync(siteManualsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];

  const manuals = slugs.map((slug) => {
    const meta = loadManualMeta(manualsRoot, slug) ?? { slug, title: slug };
    const mdPath = join(manualsRoot, slug, "operation_manual.md");
    if (!meta.title && existsSync(mdPath)) {
      const m = readFileSync(mdPath, "utf8").match(/^#\s+(.+)$/m);
      if (m) meta.title = m[1].replace(/\*\*/g, "").trim();
    }
    return meta;
  });

  const coveredPhases = new Set(manuals.flatMap((m) => m.flowPhases ?? []));

  const flowStrip = businessFlow.phases.map((phase) => {
    const covered = coveredPhases.has(phase.id);
    const count = manuals.filter((m) => (m.flowPhases ?? []).includes(phase.id)).length;
    const cls = covered ? "flow-phase covered" : "flow-phase pending";
    const badge = covered ? `${count} 件` : "準備中";
    return `<button type="button" class="${cls}" data-phase="${escapeHtml(phase.id)}" aria-pressed="false">
      <span class="flow-phase-order">${phase.order}</span>
      <span class="flow-phase-label">${escapeHtml(phase.label)}</span>
      <span class="flow-phase-badge">${badge}</span>
    </button>`;
  }).join("\n");

  const manualCards = manuals.map((m) => {
    const uatIds = m.uatCaseIds ?? [...new Set((m.uatMapping ?? []).flatMap((x) => x.ids))];
    const uatChips = uatIds.map((id) => `<span class="uat-chip">${escapeHtml(id)}</span>`).join("");
    const range = m.flowRange ? `${escapeHtml(m.flowRange.from)} → ${escapeHtml(m.flowRange.to)}` : "";
    const phases = (m.flowPhases ?? []).map((id) =>
      `<span class="phase-chip" data-phase="${escapeHtml(id)}">${escapeHtml(phaseLabel(businessFlow.phases, id))}</span>`
    ).join("");
    return `<article class="manual-card" data-phases="${escapeHtml((m.flowPhases ?? []).join(" "))}">
  <div class="manual-card-phases">${phases}</div>
  <h2><a href="./manuals/${escapeHtml(m.slug)}/">${escapeHtml(m.title ?? m.slug)}</a></h2>
  <p class="flow-range">${range}</p>
  <div class="uat-chips">${uatChips}</div>
</article>`;
  }).join("\n");

  const relevantUat = uatData.cases.filter((c) =>
    ["入会・面談", "契約・受講枠", "時間割・コマ組"].includes(c.category)
  );

  const uatRows = relevantUat.map((c) => {
    const linked = manuals.filter((m) => (m.uatCaseIds ?? []).includes(c.id));
    const link = linked.length
      ? linked.map((m) => `<a href="./manuals/${escapeHtml(m.slug)}/">${escapeHtml(m.slug)}</a>`).join(", ")
      : "—";
    return `<tr data-category="${escapeHtml(c.category)}">
      <td><code>${escapeHtml(c.id)}</code></td>
      <td>${escapeHtml(c.category)}</td>
      <td>${escapeHtml(String(c.scene ?? "").slice(0, 80))}${String(c.scene ?? "").length > 80 ? "…" : ""}</td>
      <td>${link}</td>
    </tr>`;
  }).join("\n");

  const project = businessFlow.project ?? "TOMAS 操作マニュアル";
  const env = businessFlow.environment ?? "ExtUAT";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project)} — マニュアル一覧</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root { --brand:#2954c2; --brand-bg:#eef4ff; --brand-border:#c5d7f5; --bg:#f3f3f3; --surface:#fff; --border:#e0e0e0; --muted:#706e6b; --radius:8px; }
*{box-sizing:border-box} body{margin:0;font-family:"Noto Sans JP",sans-serif;background:var(--bg);color:#181818;font-size:15px;line-height:1.6}
header{background:var(--brand);color:#fff;padding:24px 32px} header h1{margin:0;font-size:1.4rem} header p{margin:6px 0 0;opacity:.9;font-size:.875rem}
main{max-width:960px;margin:0 auto;padding:24px 24px 64px}
section{margin-bottom:32px} section h2{font-size:1rem;color:var(--brand);margin:0 0 12px}
.flow-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(124px,1fr));gap:8px;overflow:visible;padding:4px 0 8px}
.flow-phase{min-width:0;min-height:72px;background:var(--surface);border:2px solid var(--border);border-radius:var(--radius);padding:12px 8px;text-align:center;cursor:pointer;font:inherit;color:inherit;transition:border-color .15s,background .15s}
.flow-phase.covered{border-color:var(--brand-border)} .flow-phase.pending{opacity:.65}
.flow-phase.active,.flow-phase:hover{border-color:var(--brand);background:var(--brand-bg)}
.flow-phase-order{display:block;font-size:.6875rem;font-weight:700;color:var(--brand)} .flow-phase-label{display:block;font-size:.8125rem;font-weight:600;margin:4px 0} .flow-phase-badge{font-size:.6875rem;color:var(--muted)}
@media (max-width:520px){.flow-strip{display:flex;overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:10px}.flow-phase{flex:0 0 132px;scroll-snap-align:start}}
.manual-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
.manual-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.05);display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"phase phase" "title uat" "range uat";gap:4px 16px}
.manual-card.hidden{display:none} .manual-card-phases{grid-area:phase;display:flex;flex-wrap:wrap;gap:4px}
.manual-card h2{grid-area:title;margin:0;font-size:1.05rem;line-height:1.45} .manual-card h2 a{color:var(--brand);text-decoration:none}
.manual-card h2 a:hover{text-decoration:underline} .flow-range{grid-area:range;margin:0;font-size:.8125rem;color:var(--muted)}
.uat-chips{grid-area:uat;display:flex;flex-wrap:wrap;gap:4px;max-width:180px;justify-content:flex-end;align-content:start}
.phase-chip,.uat-chip{font-size:.6875rem;padding:2px 8px;border-radius:4px;background:var(--brand-bg);color:var(--brand);border:1px solid var(--brand-border)}
.uat-table-wrap{overflow-x:auto} table{width:100%;border-collapse:collapse;background:var(--surface);border-radius:var(--radius);font-size:.8125rem;table-layout:fixed}
th:nth-child(1),td:nth-child(1){width:6.5rem;white-space:nowrap} th:nth-child(2),td:nth-child(2){width:8rem} th:nth-child(4),td:nth-child(4){width:11rem}
th,td{border:1px solid var(--border);padding:10px 12px;text-align:left} th{background:var(--brand-bg);color:var(--brand)}
details summary{cursor:pointer;color:var(--brand);font-weight:600;padding:8px 0}
.filter-hint{font-size:.8125rem;color:var(--muted);margin:0 0 12px}
@media (max-width:640px){.manual-card{display:block;padding:16px}.uat-table-wrap{overflow:visible} table,thead,tbody,tr,th,td{display:block} thead{display:none} tr{border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);margin:8px 0;padding:8px 10px} td{border:0;padding:3px 0} td:nth-child(1),td:nth-child(2),td:nth-child(4){display:inline-block;margin-right:8px}}
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(project)}</h1>
  <p>操作マニュアル · ${escapeHtml(env)}</p>
</header>
<main>
  <section aria-label="全体業務フロー">
    <h2>全体業務フロー</h2>
    <p class="filter-hint">フェーズをクリックすると、該当するマニュアルだけ表示されます（もう一度クリックで解除）。</p>
    <div class="flow-strip" role="tablist">${flowStrip}</div>
  </section>
  <section aria-label="マニュアル一覧">
    <h2>マニュアル</h2>
    <div class="manual-grid" id="manual-grid">
      ${manualCards || '<p class="filter-hint">マニュアルがまだありません。</p>'}
    </div>
  </section>
  <section aria-label="UAT対応">
    <details>
      <summary>UAT テストケース早見表（入会・契約・時間割）</summary>
      <div class="uat-table-wrap">
        <table>
          <thead><tr><th>ID</th><th>カテゴリ</th><th>確認内容</th><th>マニュアル</th></tr></thead>
          <tbody>${uatRows}</tbody>
        </table>
      </div>
    </details>
  </section>
</main>
<script>
(function(){
  const buttons = document.querySelectorAll('.flow-phase');
  const cards = document.querySelectorAll('.manual-card');
  let active = null;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const phase = btn.dataset.phase;
      if (active === phase) {
        active = null;
        buttons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
        cards.forEach(c => c.classList.remove('hidden'));
        return;
      }
      active = phase;
      buttons.forEach(b => {
        const on = b.dataset.phase === phase;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach(c => {
        const phases = (c.dataset.phases || '').split(' ');
        c.classList.toggle('hidden', !phases.includes(phase));
      });
    });
  });
})();
</script>
</body>
</html>`;
}
