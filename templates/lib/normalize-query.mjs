/**
 * Normalize search text using glossary normalization rules.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * @param {string} repoRoot
 */
export function loadNormalizationRules(repoRoot) {
  const path = join(repoRoot, "data", "glossary", "normalization.json");
  if (!existsSync(path)) return {};
  const data = JSON.parse(readFileSync(path, "utf8"));
  return data.normalization_rules ?? {};
}

/**
 * @param {string} text
 * @param {object} [rules]
 */
export function normalizeForSearch(text, rules = {}) {
  if (!text) return "";
  let s = String(text);
  if (rules.fullwidth_alnum_to_halfwidth) {
    s = s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
  }
  if (rules.english_casefold) {
    s = s.toLowerCase();
  }
  for (const ch of rules.remove_chars ?? []) {
    s = s.split(ch).join("");
  }
  for (const p of rules.strip_honorific_prefix ?? []) {
    if (s.startsWith(p)) s = s.slice(p.length);
  }
  if (rules.katakana_long_vowel_normalize) {
    s = s.replace(/ー/g, "");
  }
  return s.trim();
}
