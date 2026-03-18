/**
 * 安全的JSON解析工具
 * 防止格式错误的JSON导致页面崩溃
 */

export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  fallback: T
): T {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('[JSON Parse Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      input: jsonString.substring(0, 100), // 只记录前100个字符
    });
    return fallback;
  }
}
