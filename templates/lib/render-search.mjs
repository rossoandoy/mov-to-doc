/**
 * Site-wide search page — feature manuals + glossary terms.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { renderContentPage } from "./site-chrome.mjs";
import { loadNormalizationRules } from "./normalize-query.mjs";

const SEARCH_CSS = `
.search-hero{margin-bottom:24px}
.search-hero form{display:flex;gap:8px;flex-wrap:wrap}
.search-hero input[type=search]{flex:1;min-width:220px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius);font:inherit}
.search-hero button{padding:12px 20px;background:var(--brand);color:#fff;border:0;border-radius:var(--radius);cursor:pointer;font:inherit}
.search-hint{font-size:.8125rem;color:var(--muted);margin:8px 0 0}
.search-section{margin-bottom:28px}
.search-section h2{font-size:1rem;color:var(--brand);margin:0 0 12px}
.search-results{list-style:none;margin:0;padding:0}
.search-results li{margin:0 0 10px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}
.search-results a{color:var(--brand);font-weight:600;text-decoration:none}
.search-results a:hover{text-decoration:underline}
.search-meta{font-size:.75rem;color:var(--muted);margin-top:4px}
.search-snippet{font-size:.8125rem;color:var(--text);margin-top:6px;line-height:1.5}
.search-empty{color:var(--muted);font-size:.875rem}
.search-loading{color:var(--muted)}
`;

function normRulesJson(repoRoot) {
  try {
    return JSON.stringify(loadNormalizationRules(repoRoot));
  } catch {
    return "{}";
  }
}

const SEARCH_SCRIPT = `
(function(){
  const NORM_RULES = __NORM_RULES__;

  function normalizeForSearch(text) {
    if (!text) return '';
    let s = String(text);
    s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
    s = s.toLowerCase();
    (NORM_RULES.remove_chars || []).forEach(ch => { s = s.split(ch).join(''); });
    (NORM_RULES.strip_honorific_prefix || []).forEach(p => {
      if (s.startsWith(p)) s = s.slice(p.length);
    });
    s = s.replace(/ー/g, '');
    return s.trim();
  }

  function snippetFor(item, tokens) {
    if (!item.excerpt) return '';
    const text = item.excerpt;
    const norm = normalizeForSearch(text);
    for (const tok of tokens) {
      const i = norm.indexOf(tok);
      if (i >= 0) {
        const start = Math.max(0, i - 20);
        return (start > 0 ? '…' : '') + text.slice(start, start + 100) + (start + 100 < text.length ? '…' : '');
      }
    }
    return text.length > 80 ? text.slice(0, 80) + '…' : text;
  }

  const input = document.getElementById('q');
  const manualEl = document.getElementById('manual-results');
  const termEl = document.getElementById('term-results');
  const statusEl = document.getElementById('search-status');
  let index = [];

  fetch('/search-index.json').then(r => r.json()).then(data => {
    index = data;
    runSearch(input.value);
  }).catch(() => {
    statusEl.textContent = '検索インデックスを読み込めませんでした。';
  });

  function runSearch(q) {
    const raw = (q || '').trim();
    if (!raw) {
      manualEl.innerHTML = '';
      termEl.innerHTML = '';
      statusEl.textContent = 'キーワードを入力してください。';
      return;
    }
    const tokens = normalizeForSearch(raw).split(/\\s+/).filter(Boolean);
    function matches(item) {
      const haystack = item.keywords + ' ' + normalizeForSearch(item.title);
      return tokens.every(tok => haystack.includes(tok));
    }
    const hits = index.filter(matches);
    const manuals = hits.filter(h => h.type === 'manual');
    const terms = hits.filter(h => h.type === 'term');
    statusEl.textContent = hits.length === 0
      ? '0 件ヒット。'
      : hits.length + ' 件ヒット（機能マニュアル ' + manuals.length + ' · 用語 ' + terms.length + '）';

    manualEl.innerHTML = manuals.length
      ? manuals.map(m => {
          const snip = snippetFor(m, tokens);
          return '<li><a href="' + m.href + '">' + m.title + '</a><div class="search-meta">機能マニュアル</div>'
            + (snip ? '<div class="search-snippet">' + snip + '</div>' : '') + '</li>';
        }).join('')
      : '<li class="search-empty">該当マニュアルなし</li>';

    termEl.innerHTML = terms.length
      ? terms.map(t => '<li><a href="' + t.href + '">' + t.title + '</a><div class="search-meta">用語</div></li>').join('')
      : '<li class="search-empty">該当用語なし</li>';
  }

  const params = new URLSearchParams(location.search);
  const initial = params.get('q') || '';
  if (initial) input.value = initial;
  input.addEventListener('input', () => runSearch(input.value));
  document.getElementById('search-form').addEventListener('submit', e => {
    e.preventDefault();
    runSearch(input.value);
    const url = new URL(location.href);
    url.searchParams.set('q', input.value.trim());
    history.replaceState(null, '', url);
  });
  if (initial) runSearch(initial);
})();
`;

/**
 * @param {{ repoRoot: string, environment?: string }} opts
 */
export function renderSearchPage({ repoRoot, environment }) {
  const script = SEARCH_SCRIPT.replace("__NORM_RULES__", normRulesJson(repoRoot));
  const body = `
<section class="search-hero">
  <form id="search-form" role="search" action="/search/" method="get">
    <input type="search" id="q" name="q" placeholder="マニュアル・用語を検索…" aria-label="サイト全体検索" autocomplete="off">
    <button type="submit">検索</button>
  </form>
  <p class="search-hint">機能マニュアルの<strong>本文</strong>と用語集を横断検索します。複数語は空白区切り（すべて含む AND 検索）。</p>
</section>
<p id="search-status" class="search-loading">読み込み中…</p>
<section class="search-section" aria-label="マニュアル検索結果">
  <h2>機能マニュアル</h2>
  <ul class="search-results" id="manual-results"></ul>
</section>
<section class="search-section" aria-label="用語検索結果">
  <h2>用語</h2>
  <ul class="search-results" id="term-results"></ul>
</section>
<script>${script}<\/script>`;

  return renderContentPage({
    pageTitle: "検索",
    headerTitle: "サイト全体検索",
    headerSubtitle: "機能マニュアルと用語集を横断して探す",
    breadcrumbs: [
      { href: "/", label: "機能マニュアル" },
      { label: "検索", current: true },
    ],
    body,
    extraCss: SEARCH_CSS,
    showBackPortal: true,
    environment,
  });
}
