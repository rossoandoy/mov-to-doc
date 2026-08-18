/**
 * About page — scope and usage
 *
 * 掲載範囲の文言は data/feature-catalog.json の `about` から差し替える:
 *   { "product": "...", "environment": "...",
 *     "about": { "lead": "...", "includes": ["..."], "excludes": ["..."] } }
 */
import { renderContentPage, PRODUCT_NAME } from "./site-chrome.mjs";

const ABOUT_CSS = `
.about-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px 24px;margin-bottom:20px}
.about-card h2{margin:0 0 10px;font-size:1.05rem;color:var(--brand)}
.about-card p{margin:0 0 10px;font-size:.875rem}
.about-card ul{margin:0;padding-left:1.2em;font-size:.875rem}
.about-card li{margin:6px 0}
`;

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const DEFAULT_INCLUDES = [
  "機能単位の操作マニュアル",
  "システム関連用語集",
  "サイト全体検索（マニュアル本文 + 用語）",
];

const DEFAULT_EXCLUDES = [
  "複数機能をまたぐ横断業務シナリオ（別ドキュメント想定）",
  "テストケース一覧",
];

function list(items) {
  return items.map((i) => `    <li>${escapeHtml(i)}</li>`).join("\n");
}

/**
 * @param {{ catalog?: object, environment?: string }} opts
 */
export function renderAboutPage({ catalog = null, environment = "" } = {}) {
  const product = catalog?.product ?? PRODUCT_NAME;
  const env = environment || catalog?.environment || "";
  const about = catalog?.about ?? {};
  const lead = about.lead
    ?? `本サイトは ${product} です。画面・機能ごとに操作手順と項目説明を掲載しています。`;
  const includes = about.includes ?? DEFAULT_INCLUDES;
  const excludes = about.excludes ?? DEFAULT_EXCLUDES;
  const envBlock = env
    ? `  <p>対象環境: <strong>${escapeHtml(env)}</strong></p>\n`
    : "";

  const body = `
<section class="about-card">
  <h2>このサイトについて</h2>
  <p>${escapeHtml(lead)}</p>
${envBlock}</section>
<section class="about-card">
  <h2>掲載範囲</h2>
  <ul>
${list(includes)}
  </ul>
</section>
<section class="about-card">
  <h2>掲載しないもの</h2>
  <ul>
${list(excludes)}
  </ul>
</section>
<section class="about-card">
  <h2>使い方</h2>
  <ul>
    <li><a href="/">機能マニュアル一覧</a> — モジュール別に機能を選ぶ</li>
    <li><a href="/glossary/">用語集</a> — 画面名・オブジェクト・ステータス等の定義</li>
    <li><a href="/search/">サイト全体検索</a> — キーワードでマニュアルと用語を横断検索</li>
  </ul>
</section>`;

  return renderContentPage({
    pageTitle: "このマニュアルについて",
    headerTitle: "このマニュアルについて",
    headerSubtitle: "掲載範囲と使い方",
    breadcrumbs: [
      { href: "/", label: "機能マニュアル" },
      { label: "このマニュアルについて", current: true },
    ],
    body,
    extraCss: ABOUT_CSS,
    showBackPortal: true,
    environment: env,
  });
}
