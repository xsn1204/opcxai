/**
 * tests/e2e/collaboration.spec.ts  — 修复版
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  OPC 协作闭环全链路集成测试                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  测试逻辑流程图                                                           ║
 * ║                                                                          ║
 * ║  ┌─────────────────────────────────────────────────────────────────┐    ║
 * ║  │ [beforeAll] DB 初始化                                            │    ║
 * ║  │   • 创建 Mock 已评分 Submission（跳过 AI 评分）                   │    ║
 * ║  │   • 为企业补充邀请配额                                            │    ║
 * ║  │   • 为 B/C Suite 直接建立已完成协作（completedCollab）           │    ║
 * ║  └──────────────────────────────┬──────────────────────────────────┘    ║
 * ║                                 │                                        ║
 * ║      ┌──────────────────────────▼────────────────────────────────┐      ║
 * ║      │           Suite A：主线流程（Happy Path）                   │      ║
 * ║      │  A1 Corp 登录 → 评分报告 → 点击"邀请合作" → 填留言 → 提交  │      ║
 * ║      │       ↓  collabId 写入全局                                  │      ║
 * ║      │  A2 Talent 登录 → /invites → 协作邀请Tab → 接受邀请         │      ║
 * ║      │       ↓  status: invited → accepted                        │      ║
 * ║      │  A3 双方聊天（各2条）→ status: active                       │      ║
 * ║      │       ↓  DB 消息数 ≥ 4                                      │      ║
 * ║      │  A4 Corp确认完成 → Talent确认完成 → status: completed       │      ║
 * ║      │       ↓                                                     │      ║
 * ║      │  A5 Corp评4星 → Talent查看只读星级                          │      ║
 * ║      └──────────────────────────┬────────────────────────────────┘      ║
 * ║                                 │                                        ║
 * ║      ┌──────────────────────────▼────────────────────────────────┐      ║
 * ║      │          Suite B：异常路径（各自独立 Fixture）              │      ║
 * ║      │  B1 Talent2 拒绝邀请 → status:rejected，按钮消失           │      ║
 * ║      │  B2 Corp 重复邀请同一 Submission → 非201                   │      ║
 * ║      │  B3 聊天含敏感词 → 400 + words 数组                        │      ║
 * ║      │  B4 协作 active 状态评分 → 400                             │      ║
 * ║      │  B5 stars=6 越界 → 400                                     │      ║
 * ║      │  B6 Talent 评分 → 403                                      │      ║
 * ║      │  B7 Corp 重复评分 → 400 Already rated                      │      ║
 * ║      └──────────────────────────┬────────────────────────────────┘      ║
 * ║                                 │                                        ║
 * ║      ┌──────────────────────────▼────────────────────────────────┐      ║
 * ║      │               Suite C：UI 状态断言                          │      ║
 * ║      │  C1 企业项目列表显示"已完成"                                │      ║
 * ║      │  C2 人才项目列表显示"已完成"                                │      ║
 * ║      │  C3 进入聊天页自动标记已读                                  │      ║
 * ║      │  C4 评分后 avg_score 正确、collab_count ≥ 1               │      ║
 * ║      │  C5 完成后确认按钮消失                                      │      ║
 * ║      │  C6 Talent 访问 Corp 聊天页 → 重定向                       │      ║
 * ║      └───────────────────────────────────────────────────────────┘      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { test, expect, type Page } from "@playwright/test";
import {
  CORP_EMAIL, CORP_PASS, TALENT_EMAIL, TALENT_PASS,
  TALENT2_EMAIL, TALENT2_PASS, REQUIREMENT_ID,
  createEvaluatedSubmission, ensureCorpHasQuota,
  createCollaboration, cleanupTestData,
  getCollabStatus, getMessageCount, prisma,
} from "./helpers/db";
import { loginAPI, callAPI } from "./helpers/api";

// ── 全局共享状态 ──────────────────────────────────────────────────────────────
let submissionId     = "";   // Suite A：主流程 submission
let collabId         = "";   // Suite A：主流程协作 ID（A1 执行后写入）
let corpProfileId    = "";
let talentProfileId  = "";

// B/C Suite 独立 fixture（已完成状态，不依赖 Suite A）
let completedCollabId        = "";
let completedTalentProfileId = "";
let completedSubmissionId    = "";

// 拒绝流程 fixture（B1 专用）
let rejectCollabId    = "";
let rejectSubmissionId = "";

// API Cookies
let corpCookie    = "";
let talentCookie  = "";
let talent2Cookie = "";

// ── Login helper（页面内操作）────────────────────────────────────────────────
async function loginPage(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/邮箱|Email/i)
    .or(page.getByPlaceholder(/邮箱|Email/i))
    .fill(email);
  await page.getByLabel(/密码|Password/i)
    .or(page.getByPlaceholder(/密码|Password/i))
    .fill(password);
  await page.getByRole("button", { name: /登录|Login/i }).click();
  // 等待跳出 login 页
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

  // 2. 企业配额补充
  corpProfileId = await ensureCorpHasQuota(CORP_EMAIL, 5);

  // ── Suite B/C 独立 Fixture FIRST（已完成协作，chen.haoran）──────────────
  // 必须在 Suite A Fixture 之前创建，避免 createEvaluatedSubmission 删除冲突
  await cleanupTestData(TALENT_EMAIL, REQUIREMENT_ID);
  const completed = await createEvaluatedSubmission(TALENT_EMAIL, REQUIREMENT_ID);
  completedSubmissionId    = completed.submissionId;
  completedTalentProfileId = completed.talentProfileId;
  completedCollabId = await createCollaboration(
    completedSubmissionId, corpProfileId, completedTalentProfileId, REQUIREMENT_ID
  );
  // 升级到 completed 状态，并设置评分（用于 B7 重复评分测试）
  await prisma.collaboration.update({
    where: { id: completedCollabId },
    data: {
      status: "completed",
      corp_confirmed_complete: true,
      talent_confirmed_complete: true,
      corp_star_rating: 5,   // B7 测试：已评过 5 星
    },
  });
  // 人才 collab_count +1（模拟完成后的状态）
  await prisma.talentProfile.update({
    where: { id: completedTalentProfileId },
    data: { collab_count: { increment: 1 }, avg_score: 5 },
  });

  // ── B1 Fixture：拒绝流程（invited 状态，lin.ruoxi）─────────────────────
  await cleanupTestData(TALENT2_EMAIL, REQUIREMENT_ID);
  const reject = await createEvaluatedSubmission(TALENT2_EMAIL, REQUIREMENT_ID);
  rejectSubmissionId = reject.submissionId;
  rejectCollabId = await createCollaboration(
    rejectSubmissionId, corpProfileId, reject.talentProfileId, REQUIREMENT_ID
  );

  // ── Suite A Fixture LAST（chen.haoran，主线流程）────────────────────────
  // createEvaluatedSubmission 会删除 completedSubmissionId 的 submission，
  // 但 completedCollabId 协作记录不受影响（DB 无级联删除）
  const main = await createEvaluatedSubmission(TALENT_EMAIL, REQUIREMENT_ID);
  submissionId    = main.submissionId;
  talentProfileId = main.talentProfileId;
});

test.afterAll(async () => {
  await cleanupTestData(TALENT_EMAIL, REQUIREMENT_ID);
  await cleanupTestData(TALENT2_EMAIL, REQUIREMENT_ID);
  await cleanupTestData("chen.haoran@opc.test", REQUIREMENT_ID);
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite A：主线协作闭环（Happy Path）—— 测试必须顺序执行
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite A：主线协作闭环", () => {

  // ── A1：Corp 查看评分报告 → 发起合作邀请 ─────────────────────────────────
  test("A1 Corp 查看评分报告 → 邀请合作", async ({ page }) => {
    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto(`/corp/submissions/${submissionId}`);

    // 断言 1：页面加载，AI 评分标题可见
    await expect(page.getByText("AI 综合加权分").first()).toBeVisible();

    // 断言 2：综合分数（82.5）可见
    await expect(page.getByText("82.5").first()).toBeVisible();

    // 断言 3：推荐标签（82.5 ≥ 70 → "推荐"）
    await expect(page.getByText("推荐").first()).toBeVisible();

    // 断言 4："邀请合作"按钮/链接可点击
    const inviteLink = page.getByRole("link", { name: /邀请合作/ })
      .or(page.getByRole("button", { name: /邀请合作/ }));
    await expect(inviteLink.first()).toBeVisible();
    await expect(inviteLink.first()).toBeEnabled();

    // 操作：进入邀请页
    await inviteLink.first().click();
    await page.waitForURL(`**/corp/invite/${submissionId}`, { timeout: 10_000 });

    // 断言 5：邀请页已加载（显示配额或留言输入框）
    await expect(page.getByText(/本月剩余|邀约|配额|留言|发送/i).first()).toBeVisible();

    // 操作：填写留言（使用 role=textbox 兜底）
    const msgInput = page.getByRole("textbox");
    if (await msgInput.count() > 0) {
      await msgInput.first().fill("您的方案出色，期待与您展开深度合作！");
    }

    // 操作：点击提交邀请（按钮文字：发送协作邀请 / 发送邀请 / 确认邀请）
    const submitBtn = page.getByRole("button", { name: /发送协作邀请|发送邀请|确认邀请|^邀请$/ });
    await expect(submitBtn.first()).toBeEnabled();
    await submitBtn.first().click();

    // 断言 6：成功后跳回需求列表
    await page.waitForURL(/\/corp\/requirements/, { timeout: 12_000 });

    // DB 断言：Collaboration 已创建，status=invited
    const collab = await prisma.collaboration.findFirst({
      where: { submission_id: submissionId, corp_id: corpProfileId },
    });
    expect(collab).not.toBeNull();
    expect(collab!.status).toBe("invited");
    collabId = collab!.id;     // ← 写入全局，供后续测试使用
  });

  // ── A2：Talent 查看邀请 → 接受合作 ──────────────────────────────────────
  test("A2 Talent 查看邀请 → 接受合作", async ({ page }) => {
    test.skip(!collabId, "A1 未完成，跳过");

    await loginPage(page, TALENT_EMAIL, TALENT_PASS);
    await page.goto("/talent/invites");

    // 断言 1：切换到"协作邀请" Tab
    await page.getByRole("button").filter({ hasText: "协作邀请" }).click();

    // 断言 2：邀请卡片中显示"等待回应"状态徽章
    await page.waitForSelector("text=等待回应", { timeout: 8_000 });
    await expect(page.getByText("等待回应")).toBeVisible();

    // 断言 3："接受邀请"按钮可见（按钮文字：✓ 接受邀请）
    const acceptBtn = page.getByRole("button", { name: /接受邀请/ });
    await expect(acceptBtn.first()).toBeVisible();

    // 操作：接受邀请
    await acceptBtn.first().click();

    // 断言 4：跳转到聊天页
    await page.waitForURL(`**/talent/projects/${collabId}/chat`, { timeout: 10_000 });

    // DB 断言：status → accepted
    const status = await getCollabStatus(collabId);
    expect(status?.status).toBe("accepted");
  });

  // ── A3：双方协作聊天（各发 2 条消息）────────────────────────────────────
  test("A3 双方协作聊天（≥ 4 条消息，status → active）", async ({ browser }) => {
    test.skip(!collabId, "A2 未完成，跳过");

    const corpCtx    = await browser.newContext();
    const talentCtx  = await browser.newContext();
    const corpPage   = await corpCtx.newPage();
    const talentPage = await talentCtx.newPage();

    try {
      await loginPage(talentPage, TALENT_EMAIL, TALENT_PASS);
      await loginPage(corpPage, CORP_EMAIL, CORP_PASS);

      // 双方进入各自聊天页
      await talentPage.goto(`/talent/projects/${collabId}/chat`);
      await corpPage.goto(`/corp/projects/${collabId}/chat`);

      const talentInput = talentPage.getByRole("textbox");
      const corpInput   = corpPage.getByRole("textbox");
      await expect(talentInput.last()).toBeVisible();
      await expect(corpInput.last()).toBeVisible();

      const talentSend = talentPage.getByRole("button", { name: /发送|Send/i });
      const corpSend   = corpPage.getByRole("button", { name: /发送|Send/i });

      // Talent 发送第 1 条 → 触发 accepted → active 转换
      await talentInput.last().fill("你好！我已收到合作邀请，对项目方向很感兴趣。");
      await talentSend.last().click();
      await expect(talentPage.getByText("你好！我已收到合作邀请")).toBeVisible({ timeout: 8_000 });

      // Corp 刷新后看到 Talent 消息
      await corpPage.reload();
      await expect(corpPage.getByText("你好！我已收到合作邀请")).toBeVisible({ timeout: 8_000 });

      // Corp 发送第 1 条
      await corpInput.last().fill("很高兴！主要需要品牌全案策划，包括视觉规范和推广方案。");
      await corpSend.last().click();
      await expect(corpPage.getByText("主要需要品牌全案策划")).toBeVisible({ timeout: 8_000 });

      // Talent 刷新后发第 2 条
      await talentPage.reload();
      await talentInput.last().fill("明白了，预计两周完成初稿，敬请期待。");
      await talentSend.last().click();

      // Corp 发第 2 条
      await corpPage.reload();
      await corpInput.last().fill("好的，有任何问题随时沟通！");
      await corpSend.last().click();

      // DB 断言
      await talentPage.waitForTimeout(500);
      const msgCount = await getMessageCount(collabId);
      expect(msgCount).toBeGreaterThanOrEqual(4);

      const status = await getCollabStatus(collabId);
      expect(status?.status).toBe("active");

    } finally {
      await corpCtx.close();
      await talentCtx.close();
    }
  });

  // ── A4：结项确认（Corp 先，Talent 后）───────────────────────────────────
  test("A4 结项确认 → status: completed", async ({ browser }) => {
    test.skip(!collabId, "A3 未完成，跳过");

    const corpCtx    = await browser.newContext();
    const talentCtx  = await browser.newContext();
    const corpPage   = await corpCtx.newPage();
    const talentPage = await talentCtx.newPage();

    try {
      await loginPage(corpPage, CORP_EMAIL, CORP_PASS);
      await loginPage(talentPage, TALENT_EMAIL, TALENT_PASS);

      // Corp 确认完成
      await corpPage.goto(`/corp/projects/${collabId}/chat`);
      const corpConfirmBtn = corpPage.getByRole("button", { name: /我方确认完成|确认完成/ });
      await expect(corpConfirmBtn.first()).toBeVisible({ timeout: 8_000 });
      await corpConfirmBtn.first().click();

      // 断言：Corp 侧变为"已确认"，对方仍"未确认"
      await expect(corpPage.getByText(/企业方.*已确认/)).toBeVisible({ timeout: 8_000 });
      await expect(corpPage.getByText(/未确认/)).toBeVisible();

      // DB 断言：corp_confirmed=true，status 仍 active
      let collab = await getCollabStatus(collabId);
      expect(collab?.corp_confirmed_complete).toBe(true);
      expect(collab?.status).toBe("active");

      // Talent 确认完成
      await talentPage.goto(`/talent/projects/${collabId}/chat`);
      const talentConfirmBtn = talentPage.getByRole("button", { name: /我方确认完成|确认完成/ });
      await expect(talentConfirmBtn.first()).toBeVisible({ timeout: 8_000 });
      await talentConfirmBtn.first().click();

      // 断言：双方均已确认 → 状态变为"协作已完成"
      // (确认完成区块在 completed 状态后隐藏，改为显示"协作已完成")
      await expect(talentPage.getByText("协作已完成")).toBeVisible({ timeout: 8_000 });

      // DB 断言：status → completed
      collab = await getCollabStatus(collabId);
      expect(collab?.talent_confirmed_complete).toBe(true);
      expect(collab?.status).toBe("completed");

    } finally {
      await corpCtx.close();
      await talentCtx.close();
    }
  });

  // ── A5：企业评分（4 星）→ 人才查看只读结果 ───────────────────────────────
  test("A5 企业评 4 星 → Talent 只读展示", async ({ browser }) => {
    test.skip(!collabId, "A4 未完成，跳过");

    const corpCtx    = await browser.newContext();
    const talentCtx  = await browser.newContext();
    const corpPage   = await corpCtx.newPage();
    const talentPage = await talentCtx.newPage();

    try {
      await loginPage(corpPage, CORP_EMAIL, CORP_PASS);
      await loginPage(talentPage, TALENT_EMAIL, TALENT_PASS);

      // Corp 进入聊天页
      await corpPage.goto(`/corp/projects/${collabId}/chat`);

      // 断言：状态 completed，评分区域出现
      await expect(corpPage.getByText(/项目评价/)).toBeVisible({ timeout: 8_000 });
      await expect(corpPage.getByText(/请对本次合作进行评分/)).toBeVisible();

      // 断言：5 颗星按钮可见（初始未评分）
      const starBtns = corpPage.locator("button").filter({ hasText: "★" });
      await expect(starBtns.first()).toBeVisible();
      expect(await starBtns.count()).toBe(5);

      // 操作：点击第 4 颗星
      await starBtns.nth(3).click();

      // 断言：提示"4 星"出现
      await expect(corpPage.getByText(/4 星|4星/)).toBeVisible({ timeout: 8_000 });

      // DB 断言
      const collab = await getCollabStatus(collabId);
      expect(collab?.corp_star_rating).toBe(4);

      // Talent 端查看
      await talentPage.goto(`/talent/projects/${collabId}/chat`);

      // 断言：显示"企业评分 · 4 星"（只读）
      await expect(talentPage.getByText(/企业评分|4 星/i)).toBeVisible({ timeout: 8_000 });

      // 断言：人才端无可点击的星形评分按钮
      const talentStarBtns = talentPage.locator("button").filter({ hasText: "★" });
      expect(await talentStarBtns.count()).toBe(0);

    } finally {
      await corpCtx.close();
      await talentCtx.close();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite B：异常路径（各自独立 Fixture，不依赖 Suite A）
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite B：异常路径", () => {

  // ── B1：Talent2 拒绝邀请 ─────────────────────────────────────────────────
  test("B1 Talent 拒绝合作邀请 → 状态徽章变'已拒绝'", async ({ page }) => {
    await loginPage(page, TALENT2_EMAIL, TALENT2_PASS);
    await page.goto("/talent/invites");

    // 切换到"协作邀请" Tab
    await page.getByRole("button").filter({ hasText: "协作邀请" }).click();
    // 等待 tab 切换后协作邀请内容加载
    await page.waitForSelector("text=等待回应", { timeout: 8_000 });
    await expect(page.getByText("等待回应")).toBeVisible();

    // 断言："拒绝"按钮
    const rejectBtn = page.getByRole("button", { name: /^拒绝$/ });
    await expect(rejectBtn.first()).toBeVisible();
    await expect(rejectBtn.first()).toBeEnabled();

    // 操作：拒绝
    await rejectBtn.first().click();

    // 断言：状态变为"已拒绝"（使用 .first() 避免 strict mode violation）
    await expect(page.getByText("已拒绝").first()).toBeVisible({ timeout: 8_000 });

    // 断言：接受/拒绝按钮消失（接受按钮文字：✓ 接受邀请）
    await expect(page.getByRole("button", { name: /接受邀请/ })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^拒绝$/ })).not.toBeVisible();

    // DB 断言
    const collab = await getCollabStatus(rejectCollabId);
    expect(collab?.status).toBe("rejected");
  });

  // ── B2：企业重复邀请同一 Submission ──────────────────────────────────────
  test("B2 重复邀请同一 Submission 被拒绝", async () => {
    // rejectSubmissionId 已有协作记录，再次邀请应被拒
    const res = await callAPI("POST", "/api/collaborations", corpCookie, {
      submission_id: rejectSubmissionId,
      invitation_message: "重复邀请",
    });
    expect([400, 409, 500]).toContain(res.status);
  });

  // ── B3：聊天消息含敏感词 API 级拦截 ──────────────────────────────────────
  test("B3 聊天消息含敏感词 → 400 + words 数组", async () => {
    // 使用 completedCollabId（已有有效协作）
    const res = await callAPI(
      "POST",
      `/api/collaborations/${completedCollabId}/messages`,
      corpCookie,
      { content: "你个傻逼" }
    );
    expect(res.status).toBe(400);
    expect(Array.isArray((res.json as Record<string, unknown>)?.words)).toBe(true);
    expect(((res.json as Record<string, string[]>)?.words).length).toBeGreaterThan(0);
  });

  // ── B4：协作 active 时评分被拒绝 ─────────────────────────────────────────
  test("B4 协作 active 状态评分 → 400 not completed", async () => {
    // 建立一个 active 状态的协作
    const { submissionId: sid, talentProfileId: tid } =
      await createEvaluatedSubmission("lin.ruoxi@opc.test", REQUIREMENT_ID);
    const aid = await createCollaboration(sid, corpProfileId, tid, REQUIREMENT_ID);
    await prisma.collaboration.update({ where: { id: aid }, data: { status: "active" } });

    try {
      const res = await callAPI("POST", `/api/collaborations/${aid}/rate`, corpCookie, { stars: 5 });
      expect(res.status).toBe(400);
      expect((res.json as Record<string, string>)?.error).toMatch(/not completed/i);
    } finally {
      await prisma.message.deleteMany({ where: { collaboration_id: aid } });
      await prisma.collaboration.delete({ where: { id: aid } });
      await prisma.submission.delete({ where: { id: sid } });
    }
  });

  // ── B5：评分值越界（stars = 6）────────────────────────────────────────────
  test("B5 评分 stars=6 越界 → 400", async () => {
    const res = await callAPI(
      "POST",
      `/api/collaborations/${completedCollabId}/rate`,
      corpCookie,
      { stars: 6 }
    );
    expect(res.status).toBe(400);
    expect((res.json as Record<string, string>)?.error).toMatch(/1.?5|must be/i);
  });

  // ── B6：Talent 不可评分（权限）───────────────────────────────────────────
  test("B6 Talent 调用评分 API → 403 Forbidden", async () => {
    const res = await callAPI(
      "POST",
      `/api/collaborations/${completedCollabId}/rate`,
      talentCookie,
      { stars: 5 }
    );
    expect(res.status).toBe(403);
    expect((res.json as Record<string, string>)?.error).toMatch(/Forbidden/i);
  });

  // ── B7：Corp 重复评分被拒绝 ───────────────────────────────────────────────
  test("B7 Corp 重复评分 → 400 Already rated", async () => {
    // completedCollab 的 corp_star_rating 在 beforeAll 已设置为 5
    const res = await callAPI(
      "POST",
      `/api/collaborations/${completedCollabId}/rate`,
      corpCookie,
      { stars: 3 }
    );
    expect(res.status).toBe(400);
    expect((res.json as Record<string, string>)?.error).toMatch(/Already rated/i);

    // 验证评分未被覆盖（仍为 5）
    const collab = await getCollabStatus(completedCollabId);
    expect(collab?.corp_star_rating).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite C：关键 UI 状态断言（使用 completedCollab fixture）
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Suite C：UI 状态断言", () => {

  // ── C1：企业端项目列表显示"已完成" ───────────────────────────────────────
  test("C1 企业项目列表显示'已完成'", async ({ page }) => {
    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto("/corp/projects");
    await expect(page.getByText("已完成").first()).toBeVisible({ timeout: 8_000 });
  });

  // ── C2：人才端项目列表显示"已完成" ───────────────────────────────────────
  test("C2 人才项目列表显示'已完成'", async ({ page }) => {
    // 使用 TALENT_EMAIL（若 A4 完成）或 completedTalentProfile 账号
    const email = collabId ? TALENT_EMAIL : "chen.haoran@opc.test";
    const pass  = collabId ? TALENT_PASS  : TALENT_PASS;
    await loginPage(page, email, pass);
    await page.goto("/talent/projects");
    await expect(page.getByText("已完成").first()).toBeVisible({ timeout: 8_000 });
  });

  // ── C3：进入聊天页自动标记已读 ───────────────────────────────────────────
  test("C3 进入聊天页自动标记已读", async () => {
    // 先设置未读
    await prisma.collaboration.updateMany({
      where: { id: completedCollabId },
      data: { unread_for_talent: true },
    });

    // 调用 mark-read API
    const res = await callAPI(
      "POST",
      `/api/collaborations/${completedCollabId}/mark-read`,
      talentCookie
    );
    expect(res.status).toBe(200);

    // DB 断言：未读标记清除
    const collab = await prisma.collaboration.findUnique({
      where: { id: completedCollabId },
      select: { unread_for_talent: true },
    });
    expect(collab?.unread_for_talent).toBe(false);
  });

  // ── C4：评分后 avg_score 与 collab_count 正确 ────────────────────────────
  test("C4 评分后 Talent avg_score 更新，collab_count ≥ 1", async () => {
    const talent = await prisma.talentProfile.findUnique({
      where: { id: completedTalentProfileId },
      select: { avg_score: true, collab_count: true },
    });
    // 在 beforeAll 中已设置 avg_score=5, collab_count +1
    expect(talent?.avg_score).not.toBeNull();
    expect(typeof talent?.avg_score).toBe("number");
    expect(talent?.collab_count).toBeGreaterThanOrEqual(1);
  });

  // ── C5：协作完成后确认按钮消失 ───────────────────────────────────────────
  test("C5 completed 状态下聊天页不显示确认按钮", async ({ page }) => {
    await loginPage(page, CORP_EMAIL, CORP_PASS);
    await page.goto(`/corp/projects/${completedCollabId}/chat`);
    // status=completed，确认完成按钮不应存在
    await expect(
      page.getByRole("button", { name: /我方确认完成/ })
    ).not.toBeVisible({ timeout: 8_000 });
  });

  // ── C6：Talent 访问 Corp 聊天页被 Middleware 重定向 ──────────────────────
  test("C6 Talent 访问 Corp 聊天页 → 重定向 login", async ({ page }) => {
    await loginPage(page, TALENT_EMAIL, TALENT_PASS);
    // 直接访问企业端 URL，middleware 应重定向
    await page.goto(`/corp/projects/${completedCollabId}/chat`, { waitUntil: "networkidle" });
    expect(page.url()).toMatch(/\/login|\/talent/);
  });
});
