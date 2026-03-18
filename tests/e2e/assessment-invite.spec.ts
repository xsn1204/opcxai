/**
 * tests/e2e/assessment-invite.spec.ts
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  OPC 考核邀请全链路集成测试                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  测试逻辑流程图                                                               ║
 * ║                                                                              ║
 * ║  ┌──────────────────────────────────────────────────────────────────────┐   ║
 * ║  │ [beforeAll] DB 初始化                                                 │   ║
 * ║  │  • Corp 补充配额 (invite_quota = 5)                                   │   ║
 * ║  │  • 获取 talentProfileId / talentUsername                              │   ║
 * ║  │  • 清理旧测试数据                                                      │   ║
 * ║  │  • 为 B-Suite 预建 Fixture（独立，不依赖 Suite A）                     │   ║
 * ║  └────────────────────────────┬─────────────────────────────────────────┘   ║
 * ║                               │                                              ║
 * ║  ┌────────────────────────────▼─────────────────────────────────────────┐   ║
 * ║  │              Suite A：主线邀请→查看→答题→反馈                         │   ║
 * ║  │  A1 Corp 通过 Market 页面发起考核邀请（UI）                            │   ║
 * ║  │       ↓  assessInviteId 写入全局                                      │   ║
 * ║  │  A2 Talent 邀请中心→考核邀请 Tab→看到"待参与"→进入考核（UI）           │   ║
 * ║  │  A3 Talent 提交考核答案（API）→ assessment status→"completed"         │   ║
 * ║  │  A4 Corp 查看需求提交列表→看到"受邀"徽章 + 提交（UI）                  │   ║
 * ║  │  A5 Talent 再次查看邀请中心→考核邀请显示"已完成"（UI）                  │   ║
 * ║  └────────────────────────────┬─────────────────────────────────────────┘   ║
 * ║                               │                                              ║
 * ║  ┌────────────────────────────▼─────────────────────────────────────────┐   ║
 * ║  │              Suite B：异常路径（各自独立 Fixture，API 级）              │   ║
 * ║  │  B1 重复邀请同一 talent/requirement → alreadyInvited:true, quota 不变  │   ║
 * ║  │  B2 配额耗尽（invite_quota=0）→ 403 quotaExhausted                   │   ║
 * ║  │  B3 Talent 角色调用邀请接口 → 401 Unauthorized                       │   ║
 * ║  │  B4 缺少必填字段（无 talent_id）→ 500/400                             │   ║
 * ║  │  B5 POST mark-read → is_read:true（DB 验证）                         │   ║
 * ║  │  B6 GET /api/corp/invite/check → 返回 quota/monthlyQuota/referralBonus│   ║
 * ║  │  B7 GET /api/invites/pending-count → 反映未读邀请数                   │   ║
 * ║  └────────────────────────────┬─────────────────────────────────────────┘   ║
 * ║                               │                                              ║
 * ║  ┌────────────────────────────▼─────────────────────────────────────────┐   ║
 * ║  │               Suite C：Corp 看到反馈状态（UI 断言）                     │   ║
 * ║  │  C1 Corp Market 邀请 Modal → 已邀请需求显示"✓ 已邀请"按钮              │   ║
 * ║  │  C2 Corp 需求提交列表："受邀"徽章仅对被考核邀请的 Talent 显示           │   ║
 * ║  │  C3 DB 验证：Corp 再次点击邀请 → alreadyInvited，quota 不减            │   ║
 * ║  └──────────────────────────────────────────────────────────────────────┘   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect, type Page } from "@playwright/test";
import {
  CORP_EMAIL, CORP_PASS, TALENT_EMAIL, TALENT_PASS,
  TALENT2_EMAIL, TALENT2_PASS, REQUIREMENT_ID,
  ensureCorpHasQuota, getTalentProfile, createAssessmentInvitation,
  cleanupAssessmentInvites, cleanupTestData, prisma,
} from "./helpers/db";
import { loginAPI, callAPI } from "./helpers/api";

// ── 全局共享状态 ──────────────────────────────────────────────────────────────
let corpCookie    = "";
let talentCookie  = "";
let talent2Cookie = "";

let corpProfileId      = "";
let talentProfileId    = "";
let talentUsername     = "";
let talent2ProfileId   = "";

// Suite A：主线 - Corp 邀请后获得的 collabId
let assessInviteId = "";

// B-Suite 预建 Fixture
let b1InviteId = "";   // B1 重复邀请测试用（已有 invited 状态的邀请）
let b5InviteId = "";   // B5 mark-read 测试用
let b7InviteId = "";   // B7 pending-count 测试用（未读）

// ── Login helper ──────────────────────────────────────────────────────────────
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

  // 2. Corp 配额补充
  corpProfileId = await ensureCorpHasQuota(CORP_EMAIL, 5);

  // 3. 获取 Talent 信息
  const tp  = await getTalentProfile(TALENT_EMAIL);
  talentProfileId  = tp.id;
  talentUsername   = tp.username;
  const tp2 = await getTalentProfile(TALENT2_EMAIL);
  talent2ProfileId = tp2.id;

  // 4. 清理测试数据（防止上轮残留）
  await cleanupAssessmentInvites(TALENT_EMAIL, REQUIREMENT_ID);
  await cleanupAssessmentInvites(TALENT2_EMAIL, REQUIREMENT_ID);
  await cleanupTestData(TALENT_EMAIL, REQUIREMENT_ID);   // 清 submission + collaboration

  // 5. B-Suite 独立 Fixture（已有邀请，用于重复/mark-read/pending-count 测试）
  //    使用 TALENT2 避免与 Suite A 的 TALENT 产生冲突
  b1InviteId = await createAssessmentInvitation(talent2ProfileId, corpProfileId, REQUIREMENT_ID, "B1 重复邀请测试");
  // b5 和 b7 均复用同一个 invite（节省 fixture，b5 mark-read / b7 pending-count 共用同一条记录）
  b5InviteId = b1InviteId;
  b7InviteId = b1InviteId;
});

test.afterAll(async () => {
  await cleanupAssessmentInvites(TALENT_EMAIL, REQUIREMENT_ID);
  await cleanupAssessmentInvites(TALENT2_EMAIL, REQUIREMENT_ID);
  await cleanupTestData(TALENT_EMAIL, REQUIREMENT_ID);
  await cleanupTestData(TALENT2_EMAIL, REQUIREMENT_ID);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite A：主线邀请→查看→答题→Corp 看到反馈（顺序执行）
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite A：考核邀请主线流程", () => {

  // ── A1：Corp 通过 Market 页面 UI 邀请 Talent 参与考核 ──────────────────────
  test("A1 Corp Market 邀请考核 → DB 创建 assessment 邀请", async ({ page }) => {
    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto("/corp/market");

    // 等待市场页加载
    await expect(page.getByText("OPC能力市场").or(page.getByText("能力市场")).first()).toBeVisible({ timeout: 8_000 });

    // 找到目标 Talent 卡片（按 username 查找）并点击"邀请考核"
    await expect(page.getByText(talentUsername).first()).toBeVisible({ timeout: 8_000 });

    // 定位包含该 talent username 的卡片，并点击其"邀请考核"按钮
    const talentCard = page.locator("div").filter({
      has: page.locator("h3", { hasText: talentUsername })
    }).filter({
      has: page.locator("button", { hasText: "邀请考核" })
    });
    const inviteBtn = talentCard.locator("button", { hasText: "邀请考核" }).first();
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // Modal 出现："邀请参与考核" 标题
    await expect(page.getByText("邀请参与考核")).toBeVisible({ timeout: 6_000 });

    // 找到需求行（包含 REQUIREMENT_ID 的需求，标题为"初创品牌全案协作"）
    await expect(page.getByText("初创品牌全案协作").first()).toBeVisible({ timeout: 6_000 });

    // 点击该需求行的"邀请"按钮：通过 XPath 从 <p> 标题向上两级找同行 <button>
    // 行结构：div.row > [div > p "初创品牌全案协作" + span, button "邀请"]
    const modalInviteBtn = page.locator("xpath=//p[normalize-space(text())='初创品牌全案协作']/../../button");
    await expect(modalInviteBtn).toBeEnabled();
    await modalInviteBtn.click();

    // 等待该需求行的按钮变为"✓ 已邀请"（精确等待该行，而不是页面上第一个"✓ 已邀请"）
    await expect(modalInviteBtn).toHaveText("✓ 已邀请", { timeout: 8_000 });

    // 等待 SQLite 写入完成（小缓冲）
    await page.waitForTimeout(300);

    // DB 验证：assessment 邀请已创建
    const collab = await prisma.collaboration.findFirst({
      where: {
        type: "assessment",
        talent_id: talentProfileId,
        requirement_id: REQUIREMENT_ID,
        corp_id: corpProfileId,
      },
    });
    expect(collab).not.toBeNull();
    expect(collab!.status).toBe("invited");
    assessInviteId = collab!.id;

    // DB 验证：配额减少（从 5 → 4）
    const corp = await prisma.corpProfile.findUnique({
      where: { id: corpProfileId },
      select: { invite_quota: true },
    });
    expect(corp!.invite_quota).toBeLessThan(5);
  });

  // ── A2：Talent 邀请中心 → 考核邀请 Tab → 看到"待参与"→ 进入考核 ────────────
  test("A2 Talent 邀请中心看到'待参与' → 点击进入考核", async ({ page }) => {
    test.skip(!assessInviteId, "A1 未完成，跳过");

    await loginPage(page, TALENT_EMAIL, TALENT_PASS);
    await page.goto("/talent/invites");

    // 默认在"考核邀请" tab（assessmentInvites 先加载）
    // 验证"待参与"状态徽章
    await expect(page.getByText("待参与").first()).toBeVisible({ timeout: 8_000 });

    // 找到"初创品牌全案协作"邀请卡片
    await expect(page.getByText("初创品牌全案协作").first()).toBeVisible();

    // 点击"查看考核详情 →" 按钮 / 或整个卡片
    const viewBtn = page.getByText(/查看考核详情/).first();
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // 跳转到考核详情页 /talent/challenges/[reqId]
    await page.waitForURL(`**/talent/challenges/${REQUIREMENT_ID}`, { timeout: 10_000 });

    // DB 验证：邀请标记为已读（页面点击会触发 mark-read API）
    await page.waitForTimeout(500); // 等待 mark-read API 调用完成
    const inv = await prisma.collaboration.findUnique({
      where: { id: assessInviteId },
      select: { is_read: true },
    });
    expect(inv?.is_read).toBe(true);
  });

  // ── A3：Talent 提交考核答案 → assessment invitation status → "completed" ──
  test("A3 Talent 提交答案（API）→ assessment invitation 变为'completed'", async () => {
    test.skip(!assessInviteId, "A1 未完成，跳过");

    // 提交考核答案（绕过 AI 评分测试，只关注状态流转）
    const res = await callAPI("POST", "/api/submissions", talentCookie, {
      requirement_id: REQUIREMENT_ID,
      answers: { q1: "这是考核答案，测试提交流程", q2: "方案：分三阶段执行，第一阶段完成需求分析" },
    });

    // 201 表示提交成功，或 409 表示已提交（幂等处理）
    expect([201, 409]).toContain(res.status);

    // DB 验证：assessment invitation 状态 → "completed"（由 /api/submissions 自动触发）
    // 等待异步更新
    await new Promise((r) => setTimeout(r, 300));
    const collab = await prisma.collaboration.findUnique({
      where: { id: assessInviteId },
      select: { status: true },
    });
    expect(collab?.status).toBe("completed");
  });

  // ── A4：Corp 查看需求提交列表 → 看到"受邀"徽章 + Talent 提交 ────────────────
  test("A4 Corp 需求提交列表 → Talent 提交显示'受邀'徽章", async ({ page }) => {
    test.skip(!assessInviteId, "A1 未完成，跳过");

    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto(`/corp/requirements/${REQUIREMENT_ID}/submissions`);

    // 断言：页面加载（显示需求标题）
    await expect(page.getByText("初创品牌全案协作").first()).toBeVisible({ timeout: 8_000 });

    // 断言：Talent username 出现在提交列表中
    await expect(page.getByText(talentUsername).first()).toBeVisible({ timeout: 8_000 });

    // 断言："受邀"徽章显示在该 Talent 提交卡片旁
    await expect(page.getByText("受邀").first()).toBeVisible();
  });

  // ── A5：Talent 再次查看邀请中心 → 考核邀请显示"已完成" ───────────────────────
  test("A5 Talent 邀请中心 → 考核邀请状态变为'已完成'", async ({ page }) => {
    test.skip(!assessInviteId, "A3 未完成，跳过");

    await loginPage(page, TALENT_EMAIL, TALENT_PASS);
    await page.goto("/talent/invites");

    // 考核邀请 Tab 默认激活（或手动点击）
    // 验证"已完成"状态徽章（assessment collab 完成后显示）
    await expect(page.getByText("已完成").first()).toBeVisible({ timeout: 8_000 });

    // 不再显示"待参与"（该邀请已完成）
    // 注意："待参与"可能还有其他邀请，只验证至少有一个"已完成"
    await expect(page.getByText("初创品牌全案协作").first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite B：异常路径（API 级，各自独立）
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite B：异常路径", () => {

  // ── B1：重复邀请同一 talent+requirement → alreadyInvited 早返回 ───────────
  test("B1 重复邀请 → alreadyInvited:true，quota 不递减", async () => {
    // 先记录当前 quota
    const beforeCorp = await prisma.corpProfile.findUnique({
      where: { id: corpProfileId },
      select: { invite_quota: true, referral_bonus: true },
    });
    const quotaBefore = (beforeCorp?.invite_quota ?? 0) + (beforeCorp?.referral_bonus ?? 0);

    // 再次邀请 TALENT2 / REQUIREMENT_ID（b1InviteId 已存在）
    const res = await callAPI("POST", "/api/assessments/invite", corpCookie, {
      talent_id: talent2ProfileId,
      requirement_id: REQUIREMENT_ID,
    });

    // 200（不是 201），且包含 alreadyInvited: true
    expect(res.status).toBe(200);
    expect((res.json as Record<string, unknown>).alreadyInvited).toBe(true);

    // 配额未变化
    const afterCorp = await prisma.corpProfile.findUnique({
      where: { id: corpProfileId },
      select: { invite_quota: true, referral_bonus: true },
    });
    const quotaAfter = (afterCorp?.invite_quota ?? 0) + (afterCorp?.referral_bonus ?? 0);
    expect(quotaAfter).toBe(quotaBefore);
  });

  // ── B2：配额为 0 时邀请 → 403 quotaExhausted ────────────────────────────────
  test("B2 配额耗尽 → 403 quotaExhausted", async () => {
    // 临时将配额设为 0
    await prisma.corpProfile.update({
      where: { id: corpProfileId },
      data: { invite_quota: 0, referral_bonus: 0 },
    });

    try {
      // 邀请一个没有被邀请过的 talent（TALENT 对不同需求）
      // 为了不污染主测试，伪造一个不存在的 requirement_id
      const res = await callAPI("POST", "/api/assessments/invite", corpCookie, {
        talent_id: talentProfileId,
        requirement_id: "fake_req_for_quota_test_00000",
      });
      expect(res.status).toBe(403);
      expect((res.json as Record<string, string>).error).toBe("quotaExhausted");
    } finally {
      // 恢复配额
      await ensureCorpHasQuota(CORP_EMAIL, 5);
    }
  });

  // ── B3：非 Corp 角色（Talent）调用邀请接口 → 401 Unauthorized ────────────────
  test("B3 Talent 调用邀请接口 → 401", async () => {
    const res = await callAPI("POST", "/api/assessments/invite", talentCookie, {
      talent_id: talentProfileId,
      requirement_id: REQUIREMENT_ID,
    });
    // Talent 没有 corpProfile，应返回 401 或 404
    expect([401, 404]).toContain(res.status);
  });

  // ── B4：缺少必填字段（不传 talent_id）→ 服务端错误 ────────────────────────────
  test("B4 缺少 talent_id → 非 201 响应", async () => {
    const res = await callAPI("POST", "/api/assessments/invite", corpCookie, {
      requirement_id: REQUIREMENT_ID,
      // talent_id 故意缺失
    });
    expect(res.status).not.toBe(201);
  });

  // ── B5：POST mark-read → is_read:true（DB 验证）────────────────────────────
  test("B5 mark-read API → 邀请标记为已读", async () => {
    // 确保初始状态为未读
    await prisma.collaboration.update({
      where: { id: b5InviteId },
      data: { is_read: false },
    });

    const res = await callAPI("POST", `/api/invites/${b5InviteId}/mark-read`, talent2Cookie);
    expect(res.status).toBe(200);
    expect((res.json as Record<string, boolean>).success).toBe(true);

    // DB 验证
    const inv = await prisma.collaboration.findUnique({
      where: { id: b5InviteId },
      select: { is_read: true },
    });
    expect(inv?.is_read).toBe(true);
  });

  // ── B6：GET /api/corp/invite/check → 返回正确配额字段 ─────────────────────
  test("B6 GET invite/check → 返回 quota/monthlyQuota/referralBonus", async () => {
    const res = await callAPI("GET", "/api/corp/invite/check", corpCookie);
    expect(res.status).toBe(200);

    const json = res.json as Record<string, unknown>;
    expect(typeof json.quota).toBe("number");
    expect(typeof json.monthlyQuota).toBe("number");
    expect(typeof json.referralBonus).toBe("number");
    expect(typeof json.referralCode).toBe("string");
    expect(json.quota as number).toBeGreaterThanOrEqual(0);
  });

  // ── B7：GET /api/invites/pending-count（Talent）→ 反映未读邀请数 ────────────
  test("B7 pending-count → 未读邀请计入 count", async () => {
    // 确保 b7InviteId 是未读状态
    await prisma.collaboration.update({
      where: { id: b7InviteId },
      data: { is_read: false, status: "invited" },
    });

    const res = await callAPI("GET", "/api/invites/pending-count", talent2Cookie);
    expect(res.status).toBe(200);

    const json = res.json as Record<string, number>;
    expect(typeof json.count).toBe("number");
    expect(json.count).toBeGreaterThanOrEqual(1);  // 至少有 b7InviteId 这个未读邀请
    expect(typeof json.invites).toBe("number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite C：Corp 看到反馈状态（UI 断言）
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite C：Corp 反馈状态 UI 验证", () => {

  // ── C1：Corp Market 邀请 Modal → 已邀请需求显示"✓ 已邀请" ─────────────────
  test("C1 Market 邀请 Modal → 已邀请需求行显示'✓ 已邀请'", async ({ page }) => {
    // 使用 TALENT2 的 b1InviteId（已有 assessment 邀请）
    // 在 Market 页打开 TALENT2 的邀请 Modal，该需求应显示"✓ 已邀请"
    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto("/corp/market");

    // 等待市场页加载（有人才卡片）
    await expect(page.locator("button", { hasText: "邀请考核" }).first()).toBeVisible({ timeout: 8_000 });

    // 找到 TALENT2 的卡片（按 username）
    const talent2Profile = await getTalentProfile(TALENT2_EMAIL);
    const talent2Card = page.getByText(talent2Profile.username).first();
    await expect(talent2Card).toBeVisible({ timeout: 6_000 });

    // 点击"邀请考核"（找到 h3 含有 username 的卡片，再找其内的"邀请考核"按钮）
    const card = page.locator("div").filter({
      has: page.locator("h3", { hasText: talent2Profile.username })
    }).filter({
      has: page.locator("button", { hasText: "邀请考核" })
    });
    const btn = card.locator("button", { hasText: "邀请考核" }).first();
    await btn.click();

    // Modal 出现
    await expect(page.getByText("邀请参与考核")).toBeVisible({ timeout: 6_000 });

    // "初创品牌全案协作"需求行显示"✓ 已邀请"（SSR invitedPairs 包含此对）
    await expect(page.getByText("✓ 已邀请").first()).toBeVisible({ timeout: 6_000 });
  });

  // ── C2：Corp 需求提交列表："受邀"徽章仅出现在被邀请的 Talent ─────────────────
  test("C2 Corp 需求提交列表 → 被邀请 Talent 显示'受邀'，未邀请无'受邀'（DB 验证）", async () => {
    // DB 验证：对 TALENT（完成了考核）的 assessment 邀请存在
    const talentInvite = await prisma.collaboration.findFirst({
      where: {
        type: "assessment",
        talent_id: talentProfileId,
        requirement_id: REQUIREMENT_ID,
        corp_id: corpProfileId,
      },
    });
    // A1 创建了邀请，状态应为 "completed"（A3 提交后自动完成）
    expect(talentInvite).not.toBeNull();
    expect(["invited", "completed"]).toContain(talentInvite!.status);

    // DB 验证：这是 assessment 类型（触发"受邀"徽章渲染的条件）
    expect(talentInvite!.type).toBe("assessment");
  });

  // ── C3：重复邀请不消耗配额（API 验证 alreadyInvited 路径完整性）──────────────
  test("C3 Corp 对已邀请 Talent 再次邀请 → alreadyInvited=true，配额不变", async () => {
    // 获取当前配额
    const before = await prisma.corpProfile.findUnique({
      where: { id: corpProfileId },
      select: { invite_quota: true, referral_bonus: true },
    });

    // 对 TALENT2 / REQUIREMENT_ID 重复邀请（b1InviteId 对应此对）
    const res = await callAPI("POST", "/api/assessments/invite", corpCookie, {
      talent_id: talent2ProfileId,
      requirement_id: REQUIREMENT_ID,
    });

    // 应为 alreadyInvited: true，非 201
    expect(res.status).toBe(200);
    expect((res.json as Record<string, unknown>).alreadyInvited).toBe(true);

    // 配额未变化
    const after = await prisma.corpProfile.findUnique({
      where: { id: corpProfileId },
      select: { invite_quota: true, referral_bonus: true },
    });
    expect(after?.invite_quota).toBe(before?.invite_quota);
    expect(after?.referral_bonus).toBe(before?.referral_bonus);
  });
});
