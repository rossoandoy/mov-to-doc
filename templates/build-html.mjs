/**
 * Markdown + ./images → Web HTML（業務ユーザー向け）
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { renderManualHtml } from "./lib/render-manual.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manualDir = process.env.MOV_TO_DOC_CWD ? resolve(process.env.MOV_TO_DOC_CWD) : __dirname;

const rawArgs = process.argv.slice(2);
const forceOverwrite = rawArgs.includes("--force");
const args = rawArgs.filter((a) => a !== "--force");
const mdFile = args[0] ?? "operation_manual.md";
const htmlFile = args[1] ?? "index.html";

const mdPath = join(manualDir, mdFile);
const htmlPath = join(manualDir, htmlFile);
const metaPath = join(manualDir, "manual.meta.json");

if (!existsSync(mdPath)) {
  console.error("入力 Markdown が見つかりません:", mdPath);
  process.exit(1);
}

if (existsSync(htmlPath) && process.env.MANUAL_HTML_STRICT_OVERWRITE === "1" && !forceOverwrite) {
  console.error("出力先 HTML が既に存在します:", htmlPath);
  process.exit(1);
}
if (existsSync(htmlPath)) console.warn("[mov-to-doc] 既存の HTML を上書きします:", htmlPath);

const md = readFileSync(mdPath, "utf8");
let meta = null;
if (existsSync(metaPath)) {
  meta = JSON.parse(readFileSync(metaPath, "utf8"));
}

const PHASE_LABELS = {
  master: "マスタ・初期設定",
  enrollment: "入会・面談",
  contract: "契約・受講枠",
  timetable: "時間割・コマ組",
  teacher: "講師管理",
  reschedule: "振替・キャンセル",
  closing: "校舎締め",
};
if (meta?.flowPhases) {
  meta.flowPhaseLabels = meta.flowPhases.map((id) => PHASE_LABELS[id] ?? id);
}

const html = await renderManualHtml(md, { mode: "web", meta, siteRoot: "../../" });
writeFileSync(htmlPath, html, "utf8");
console.log("HTML を出力しました:", htmlPath);
