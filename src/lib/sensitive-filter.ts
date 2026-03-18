/**
 * sensitive-filter.ts
 *
 * 通用敏感词过滤工具，前后端共用（Node.js & 浏览器均可运行）。
 *
 * 用法：
 *   import { checkSensitive } from "@/lib/sensitive-filter";
 *   const { ok, hits } = checkSensitive(userInput);
 *   if (!ok) return 400 / 显示前端提示;
 *
 * 扩展词库：
 *   直接编辑 src/lib/sensitive_words.json 中对应 category 数组，
 *   并同步到顶层 words 数组即可，无需改动本文件。
 */

import wordData from "./sensitive_words.json";

export interface FilterResult {
  /** true = 内容干净，false = 命中违禁词 */
  ok: boolean;
  /** 命中的违禁词列表（去重） */
  hits: string[];
}

const WORDS: string[] = wordData.words;

/**
 * 检查单段文本是否包含违禁词。
 * 匹配不区分大小写。
 */
export function checkSensitive(text: string): FilterResult {
  if (!text || !text.trim()) return { ok: true, hits: [] };

  const lower = text.toLowerCase();
  const hits: string[] = [];

  for (const word of WORDS) {
    if (word && lower.includes(word.toLowerCase())) {
      if (!hits.includes(word)) hits.push(word);
    }
  }

  return { ok: hits.length === 0, hits };
}

/**
 * 检查多段文本（如多道题答案），合并命中结果。
 */
export function checkSensitiveMultiple(texts: string[]): FilterResult {
  const seen = new Set<string>();
  const hits: string[] = [];

  for (const text of texts) {
    const result = checkSensitive(text);
    for (const w of result.hits) {
      if (!seen.has(w)) {
        seen.add(w);
        hits.push(w);
      }
    }
  }

  return { ok: hits.length === 0, hits };
}

/**
 * 格式化命中词列表为用户可读的提示文本。
 */
export function formatHitMessage(hits: string[]): string {
  return `内容包含违禁词：${hits.map((w) => `"${w}"`).join("、")}，请修改后重试`;
}
