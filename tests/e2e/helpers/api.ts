/**
 * tests/e2e/helpers/api.ts
 * HTTP 工具：登录、Cookie 管理、API 调用（无需浏览器）
 */

const BASE = "http://localhost:3000";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Playwright/1.0";

export type Cookie = string;

export async function loginAPI(email: string, password: string): Promise<Cookie> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${email} → ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/opc_token=[^;]+/);
  if (!match) throw new Error(`No cookie returned for ${email}`);
  return match[0];
}

export async function callAPI(
  method: string,
  path: string,
  cookie: Cookie,
  body?: Record<string, unknown>
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/**
 * FormData 版 callAPI（用于文件上传）
 * 不设 Content-Type，让 fetch 自动添加 multipart/form-data boundary
 */
export async function callAPIFormData(
  method: string,
  path: string,
  cookie: Cookie,
  formData: FormData
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "User-Agent": UA,
      Cookie: cookie,
    },
    body: formData,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
