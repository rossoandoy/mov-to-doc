/**
 * Extract plain text from markdown for search indexing.
 */
import { existsSync, readFileSync } from "fs";

const MAX_INDEX_CHARS = 4000;
const MAX_EXCERPT_CHARS = 120;

export function stripMarkdown(md) {
  let text = md;
  text = text.replace(/^---[\s\S]*?---\n/m, "");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`]+`/g, " ");
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, " ");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * @param {string} mdPath
 */
export function extractMdText(mdPath) {
  if (!existsSync(mdPath)) return { text: "", excerpt: "" };
  const raw = readFileSync(mdPath, "utf8");
  const text = stripMarkdown(raw).slice(0, MAX_INDEX_CHARS);
  const excerpt = text.slice(0, MAX_EXCERPT_CHARS);
  return { text, excerpt };
}
