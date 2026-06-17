/**
 * Markdown + ./images → Web HTML（業務ユーザー向け）
 *
 * Usage:
 *   npm run html
 *   node build-html.mjs [入力.md] [出力.html]
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { renderManualHtml } from "./lib/render-manual.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manualDir = process.env.MOV_TO_DOC_CWD
  ? resolve(process.env.MOV_TO_DOC_CWD)
  : __dirname;

const rawArgs = process.argv.slice(2);
const forceOverwrite = rawArgs.includes("--force");
const args = rawArgs.filter((a) => a !== "--force");
const mdFile = args[0] ?? "operation_manual.md";
const htmlFile = args[1] ?? "index.html";

const mdPath = join(manualDir, mdFile);
const htmlPath = join(manualDir, htmlFile);

if (!existsSync(mdPath)) {
  console.error("入力 Markdown が見つかりません:", mdPath);
  process.exit(1);
}

const strictOverwrite =
  process.env.MANUAL_HTML_STRICT_OVERWRITE === "1" ||
  process.env.MANUAL_HTML_STRICT_OVERWRITE === "true";

if (existsSync(htmlPath)) {
  if (strictOverwrite && !forceOverwrite) {
    console.error("出力先 HTML が既に存在します（MANUAL_HTML_STRICT_OVERWRITE=1 のため上書きしません）:", htmlPath);
    process.exit(1);
  }
  console.warn("[mov-to-doc] 既存の HTML を上書きします:", htmlPath);
}

const md = readFileSync(mdPath, "utf8");
const html = await renderManualHtml(md, { mode: "web" });

writeFileSync(htmlPath, html, "utf8");
console.log("HTML を出力しました:", htmlPath);
