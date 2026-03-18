/**
 * tests/e2e/misc-interactions.spec.ts
 *
 * 覆盖 4 个未测试的 Corp↔Talent 交互模块：
 *
 *   Suite A — 无考核意向流程 (no_exam intent)
 *   Suite B — 通知系统全链路 (notifications GET/PATCH)
 *   Suite C — Corp 提交列表操作 (dismiss submission)
 *   Suite D — 文件上传 & 作品集 (upload + portfolio-cases)
 */

import { test, expect, type Page } from "@playwright/test";
import {
  CORP_EMAIL, CORP_PASS, TALENT_EMAIL, TALENT_PASS,
  TALENT2_EMAIL, TALENT2_PASS, REQUIREMENT_ID,
  ensureCorpHasQuota, getTalentProfile,
  createEvaluatedSubmission, createNoExamRequirement,
  cleanupNoExamIntents, createTestNotification, prisma,
} from "./helpers/db";
import { loginAPI, callAPI, callAPIFormData } from "./helpers/api";

// ── 全局共享状态 ──────────────────────────────────────────────────────────────
let corpCookie    = "";
let talentCookie  = "";
let talent2Cookie = "";

let corpProfileId    = "";
let talentProfileId  = "";
let talent2ProfileId = "";
let talentUserId     = "";   // User.id（用于创建 notification）

let noExamReqId        = "";  // Suite A：no_exam 类型需求
let dismissSubmissionId  = "";  // Suite C API 测试
let dismissSubmissionId2 = "";  // Suite C UI 测试（独立）
let notificationId     = "";  // Suite B fixture

// Suite D：上传后在测试间传递 URL / case ID
let uploadedUrl      = "";
let portfolioCaseId  = "";

// ── Login helper ───────────────────────────────────────────────────────────────
async function loginPage(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/邮箱|Email/i)
    .or(page.getByPlaceholder(/邮箱|Email/i))
    .fill(email);
  await page.getByLabel(/密码|Password/i)
    .or(page.getByPlaceholder(/密码|Password/i))
    .fill(password);
  await page.getByRole("button", { name: /登录|Login/i }).click();
  await page.waitForURL(/\/(talent|corp)/, { timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 全局 Setup / Teardown
// ─────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  // 1. API Cookies
  corpCookie    = await loginAPI(CORP_EMAIL, CORP_PASS);
  talentCookie  = await loginAPI(TALENT_EMAIL, TALENT_PASS);
  talent2Cookie = await loginAPI(TALENT2_EMAIL, TALENT2_PASS);

  // 2. Corp 配额 + profile ID
  corpProfileId = await ensureCorpHasQuota(CORP_EMAIL, 5);

  // 3. Talent profiles
  const tp  = await getTalentProfile(TALENT_EMAIL);
  talentProfileId = tp.id;
  const tp2 = await getTalentProfile(TALENT2_EMAIL);
  talent2ProfileId = tp2.id;

  // 4. Talent User.id（通知系统用）
  const talentUser = await prisma.user.findUnique({ where: { email: TALENT_EMAIL } });
  if (!talentUser) throw new Error(`User not found: ${TALENT_EMAIL}`);
  talentUserId = talentUser.id;

  // 5. 创建 no_exam 需求（Suite A）
  noExamReqId = await createNoExamRequirement(corpProfileId);

  // 6. 清理 no_exam_intent 残留（新需求刚创建，理论上无，but 防止重跑污染）
  await cleanupNoExamIntents(TALENT_EMAIL,  noExamReqId);
  await cleanupNoExamIntents(TALENT2_EMAIL, noExamReqId);

  // 7. 创建已评分提交（Suite C）
  const r1 = await createEvaluatedSubmission(TALENT_EMAIL,  REQUIREMENT_ID);
  dismissSubmissionId  = r1.submissionId;
  const r2 = await createEvaluatedSubmission(TALENT2_EMAIL, REQUIREMENT_ID);
  dismissSubmissionId2 = r2.submissionId;

  // 8. 创建通知 fixture（Suite B）
  notificationId = await createTestNotification(talentUserId, "invitation", {
    message: "B-Suite notification fixture",
    requirementId: REQUIREMENT_ID,
  });
});

test.afterAll(async () => {
  // no_exam 需求（协作会 cascade 删除）
  if (noExamReqId) {
    await prisma.requirement.delete({ where: { id: noExamReqId } }).catch(() => {});
  }

  // dismiss 提交
  await prisma.submission.deleteMany({
    where: { id: { in: [dismissSubmissionId, dismissSubmissionId2].filter(Boolean) } },
  });

  // 作品集（D3 可能未被 D5 删除）
  await prisma.portfolioCase.deleteMany({ where: { talent_id: talentProfileId } });

  // 通知 fixture
  if (notificationId) {
    await prisma.notification.deleteMany({ where: { id: notificationId } });
  }

  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite A：无考核意向流程
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite A：无考核意向流程", () => {

  test("A1 Talent 发送意向 → DB 创建 no_exam_intent", async () => {
    const res = await callAPI("POST", `/api/talent/intent/${noExamReqId}`, talentCookie);
    expect(res.status).toBe(200);
    expect((res.json as Record<string, unknown>).ok).toBe(true);

    await new Promise((r) => setTimeout(r, 300));
    const collab = await prisma.collaboration.findFirst({
      where: { talent_id: talentProfileId, requirement_id: noExamReqId },
    });
    expect(collab).not.toBeNull();
    expect(collab?.type).toBe("no_exam_intent");
    expect(collab?.status).toBe("invited");
  });

  test("A2 重复发送意向 → 幂等，DB 只有 1 条记录", async () => {
    const res = await callAPI("POST", `/api/talent/intent/${noExamReqId}`, talentCookie);
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 300));
    const count = await prisma.collaboration.count({
      where: { talent_id: talentProfileId, requirement_id: noExamReqId },
    });
    expect(count).toBe(1);
  });

  test("A3 UI：Talent2 点击[意向合作] → 显示[合作意向已发送]", async ({ page }) => {
    await loginPage(page, TALENT2_EMAIL, TALENT2_PASS);
    await page.goto(`/talent/challenges/${noExamReqId}`);

    // 等待意向按钮出现（no_exam 需求专属）
    await page.waitForSelector("button:has-text('意向合作')", { timeout: 10_000 });
    await page.locator("button", { hasText: "意向合作" }).click();

    // 等待按钮文字变为已发送状态
    await expect(page.getByText("合作意向已发送")).toBeVisible({ timeout: 8_000 });

    await page.waitForTimeout(300);
    const collab = await prisma.collaboration.findFirst({
      where: { talent_id: talent2ProfileId, requirement_id: noExamReqId },
    });
    expect(collab?.type).toBe("no_exam_intent");
  });

  test("A4 非 no_exam 需求发送意向 → 400", async () => {
    // REQUIREMENT_ID 是普通考核需求，不含 no_exam
    const res = await callAPI("POST", `/api/talent/intent/${REQUIREMENT_ID}`, talentCookie);
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).error).toMatch(/exam/i);
  });

  test("A5 Corp 账号调用意向接口 → 404（无 talent profile）", async () => {
    const res = await callAPI("POST", `/api/talent/intent/${noExamReqId}`, corpCookie);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite B：通知系统全链路
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite B：通知系统", () => {

  test("B1 GET /api/notifications → 返回数组含 fixture 通知", async () => {
    const res = await callAPI("GET", "/api/notifications", talentCookie);
    expect(res.status).toBe(200);
    const list = res.json as Array<{ id: string; type: string; is_read: boolean }>;
    expect(Array.isArray(list)).toBe(true);
    const found = list.find((n) => n.id === notificationId);
    expect(found).toBeDefined();
    expect(found?.type).toBe("invitation");
    expect(found?.is_read).toBe(false);
  });

  test("B2 PATCH /api/notifications {ids:[notificationId]} → success:true", async () => {
    const res = await callAPI("PATCH", "/api/notifications", talentCookie, { ids: [notificationId] });
    expect(res.status).toBe(200);
    expect((res.json as Record<string, unknown>).success).toBe(true);
  });

  test("B3 GET 再次查询 → 对应通知 is_read=true", async () => {
    const res = await callAPI("GET", "/api/notifications", talentCookie);
    expect(res.status).toBe(200);
    const list = res.json as Array<{ id: string; is_read: boolean }>;
    const found = list.find((n) => n.id === notificationId);
    expect(found?.is_read).toBe(true);

    // DB 双重验证
    await new Promise((r) => setTimeout(r, 300));
    const n = await prisma.notification.findUnique({ where: { id: notificationId } });
    expect(n?.is_read).toBe(true);
  });

  test("B4 无 session 访问通知 → 401", async () => {
    const res = await callAPI("GET", "/api/notifications", "opc_token=invalid");
    expect(res.status).toBe(401);
  });

  test("B5 Corp 调用 GET → 不含 talent 的 fixture 通知", async () => {
    const res = await callAPI("GET", "/api/notifications", corpCookie);
    expect(res.status).toBe(200);
    const list = res.json as Array<{ id: string }>;
    const found = list.find((n) => n.id === notificationId);
    expect(found).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite C：Corp 提交列表 Dismiss 操作
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite C：Corp 提交 Dismiss", () => {

  test("C1 POST /api/submissions/[id]/dismiss → 200, DB status=dismissed", async () => {
    const res = await callAPI("POST", `/api/submissions/${dismissSubmissionId}/dismiss`, corpCookie);
    expect(res.status).toBe(200);
    expect((res.json as Record<string, unknown>).success).toBe(true);

    await new Promise((r) => setTimeout(r, 300));
    const sub = await prisma.submission.findUnique({ where: { id: dismissSubmissionId } });
    expect(sub?.status).toBe("dismissed");
  });

  test("C2 Talent 调用 dismiss → 403", async () => {
    // dismissSubmissionId2 属于 TALENT2，TALENT 调用也会被 403（corp 校验）
    const res = await callAPI("POST", `/api/submissions/${dismissSubmissionId2}/dismiss`, talentCookie);
    expect(res.status).toBe(403);
  });

  test("C3 UI：Corp 在提交详情页点击[不考虑] → 确认 → 显示[已标记不考虑]", async ({ page }) => {
    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto(`/corp/submissions/${dismissSubmissionId2}`);

    // 等待 "不考虑" 按钮（提交详情页加载完毕）
    await page.waitForSelector("button:has-text('不考虑')", { timeout: 10_000 });
    await page.locator("button", { hasText: "不考虑" }).click();

    // 出现确认对话框
    await page.waitForSelector("button:has-text('确认不考虑')", { timeout: 5_000 });
    await page.locator("button", { hasText: "确认不考虑" }).click();

    // 等待页面刷新后显示已标记状态
    await expect(page.getByText("已标记不考虑")).toBeVisible({ timeout: 8_000 });

    await page.waitForTimeout(300);
    const sub = await prisma.submission.findUnique({ where: { id: dismissSubmissionId2 } });
    expect(sub?.status).toBe("dismissed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite D：文件上传 & 作品集管理
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite D：文件上传 & 作品集", () => {

  test("D1 POST /api/uploads（文本文件）→ 200, {url, name}", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["test content"], { type: "text/plain" }), "test.txt");

    const res = await callAPIFormData("POST", "/api/uploads", talentCookie, formData);
    expect(res.status).toBe(200);

    const body = res.json as Record<string, string>;
    expect(body.url).toMatch(/^\/uploads\//);
    expect(body.name).toBe("test.txt");

    // 供 D3 使用
    uploadedUrl = body.url;
  });

  test("D2 POST /api/uploads（空 FormData）→ 400", async () => {
    const res = await callAPIFormData("POST", "/api/uploads", talentCookie, new FormData());
    expect(res.status).toBe(400);
  });

  test("D3 POST /api/portfolio-cases with uploaded URL → 200, DB 创建记录", async () => {
    const res = await callAPI("POST", "/api/portfolio-cases", talentCookie, {
      title: "E2E 测试作品集案例",
      description: "自动化测试创建",
      images: [],
      files: [{ url: uploadedUrl, name: "test.txt" }],
    });
    expect(res.status).toBe(200);

    const body = res.json as Record<string, unknown>;
    expect(body.id).toBeDefined();
    portfolioCaseId = body.id as string;

    await new Promise((r) => setTimeout(r, 300));
    const pc = await prisma.portfolioCase.findUnique({ where: { id: portfolioCaseId } });
    expect(pc).not.toBeNull();
    expect(pc?.talent_id).toBe(talentProfileId);
  });

  test("D4 GET /api/portfolio-cases → 包含 D3 创建的 case", async () => {
    const res = await callAPI("GET", "/api/portfolio-cases", talentCookie);
    expect(res.status).toBe(200);

    const list = res.json as Array<{ id: string; title: string }>;
    expect(Array.isArray(list)).toBe(true);
    const found = list.find((c) => c.id === portfolioCaseId);
    expect(found).toBeDefined();
    expect(found?.title).toBe("E2E 测试作品集案例");
  });

  test("D5 DELETE /api/portfolio-cases/[id] → 200, DB 记录消失", async () => {
    const res = await callAPI("DELETE", `/api/portfolio-cases/${portfolioCaseId}`, talentCookie);
    expect(res.status).toBe(200);
    expect((res.json as Record<string, unknown>).success).toBe(true);

    await new Promise((r) => setTimeout(r, 300));
    const pc = await prisma.portfolioCase.findUnique({ where: { id: portfolioCaseId } });
    expect(pc).toBeNull();
  });

  test("D6 POST /api/portfolio-cases 无 title → 400", async () => {
    const res = await callAPI("POST", "/api/portfolio-cases", talentCookie, {
      description: "没有标题的案例",
    });
    expect(res.status).toBe(400);
  });
});
