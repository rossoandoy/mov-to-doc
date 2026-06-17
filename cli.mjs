#!/usr/bin/env node
/**
 * mov-to-doc CLI — global entry point
 */
import { cpSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "templates");

const [, , command, ...rest] = process.argv;

function usage() {
  console.log(`mov-to-doc — 画面録画から操作マニュアルを生成

Usage:
  mov-to-doc init [dir]              作業ディレクトリに templates/ を展開
  mov-to-doc skill install           SKILL.md を ~/.cursor/skills/mov-to-doc/ へ配置
  mov-to-doc build html [md] [out]   Markdown → Web HTML
  mov-to-doc build pdf [md] [out]    Markdown → PDF（Chrome 必須）
  mov-to-doc build site [dir] [site] [slug]  HTML+images を site/ へ配置

Examples:
  mov-to-doc init ./manuals/my-topic
  mov-to-doc build html operation_manual.md index.html
  mov-to-doc build site ./manuals/my-topic ./site my-topic
`);
}

function resolveScript(name, cwd) {
  const local = join(cwd, name);
  if (existsSync(local)) return local;
  return join(templatesDir, name);
}

function runNode(scriptName, args, cwd) {
  const script = resolveScript(scriptName, cwd);
  if (!existsSync(script)) {
    console.error("スクリプトが見つかりません:", scriptName);
    console.error("先に mov-to-doc init を実行してください。");
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
    env: { ...process.env, MOV_TO_DOC_CWD: cwd },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function cmdInit() {
  const target = resolve(rest[0] ?? ".");
  mkdirSync(target, { recursive: true });
  for (const name of ["build-pdf.mjs", "build-html.mjs", "prepare-site.mjs", "package.json", ".gitignore"]) {
    const src = join(templatesDir, name);
    if (existsSync(src)) copyFileSync(src, join(target, name));
  }
  const libSrc = join(templatesDir, "lib");
  const libDest = join(target, "lib");
  if (existsSync(libSrc)) {
    mkdirSync(libDest, { recursive: true });
    cpSync(libSrc, libDest, { recursive: true });
  }
  const diagramsSrc = join(templatesDir, "diagrams");
  if (existsSync(diagramsSrc)) {
    mkdirSync(join(target, "diagrams"), { recursive: true });
    cpSync(diagramsSrc, join(target, "diagrams"), { recursive: true });
  }
  mkdirSync(join(target, "images"), { recursive: true });
  console.log("初期化しました:", target);
  console.log("次: cd", target, "&& npm install");
}

function cmdSkillInstall() {
  const dst = join(homedir(), ".cursor", "skills", "mov-to-doc");
  mkdirSync(dst, { recursive: true });
  for (const name of ["SKILL.md", "reference.md"]) {
    copyFileSync(join(__dirname, name), join(dst, name));
    console.log("OK:", join(dst, name));
  }
}

function cmdBuild(sub) {
  const cwd = resolve(process.cwd());
  if (sub === "html") {
    runNode("build-html.mjs", rest, cwd);
  } else if (sub === "pdf") {
    runNode("build-pdf.mjs", rest, cwd);
  } else if (sub === "site") {
    runNode("prepare-site.mjs", rest, cwd);
  } else {
    console.error("Unknown build target:", sub);
    console.error("Use: html | pdf | site");
    process.exit(1);
  }
}

if (!command || command === "help" || command === "--help" || command === "-h") {
  usage();
  process.exit(command ? 0 : 1);
}

switch (command) {
  case "init":
    cmdInit();
    break;
  case "skill":
    if (rest[0] === "install") cmdSkillInstall();
    else {
      console.error("Unknown skill command:", rest[0]);
      process.exit(1);
    }
    break;
  case "build":
    cmdBuild(rest[0]);
    break;
  default:
    console.error("Unknown command:", command);
    usage();
    process.exit(1);
}
