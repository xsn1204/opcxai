/**
 * tests/e2e/helpers/db.ts
 * DB 工具：通过 Prisma 直接操作测试数据（绕过 AI 评分，mock 数据初始化）
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── 测试账号常量 ──────────────────────────────────────────────────────────────
export const CORP_EMAIL    = "shanshanhe0722@gmail.com";
export const CORP_PASS     = "12345678";
export const TALENT_EMAIL  = "chen.haoran@opc.test";   // 用于主流程测试
export const TALENT_PASS   = "Test1234!";
export const TALENT2_EMAIL = "lin.ruoxi@opc.test";     // 用于拒绝流程测试
export const TALENT2_PASS  = "Test1234!";

// 已有的需求（初创品牌全案协作）
export const REQUIREMENT_ID = "cmmdo1c3g0005ksvcyi98hxe6";

export interface TestFixture {
  submissionId: string;
  collabId?: string;
  corpProfileId: string;
  talentProfileId: string;
}

/**
 * 创建测试用"已评分"Submission（Mock AI 评分环节）
 */
export async function createEvaluatedSubmission(
  talentEmail: string,
  requirementId: string
): Promise<{ submissionId: string; talentProfileId: string }> {
  const user = await prisma.user.findUnique({ where: { email: talentEmail } });
  if (!user) throw new Error(`User not found: ${talentEmail}`);

  const talentProfile = await prisma.talentProfile.findUnique({ where: { user_id: user.id } });
  if (!talentProfile) throw new Error(`TalentProfile not found for ${talentEmail}`);

  // 确保该 talent 对该需求没有已有提交
  await prisma.submission.deleteMany({
    where: { talent_id: talentProfile.id, requirement_id: requirementId },
  });

  const submission = await prisma.submission.create({
    data: {
      requirement_id: requirementId,
      talent_id: talentProfile.id,
      answers: JSON.stringify({ mock: "已评分测试数据，跳过AI评分环节" }),
      conversation_log: JSON.stringify([{ role: "user", content: "Mock答案", timestamp: new Date().toISOString() }]),
      status: "evaluated",                          // ← Mock：直接跳过 AI 评分
      ai_total_score: 82.5,
      ai_score_breakdown: JSON.stringify({
        keyword_match: 85, logic_consistency: 80,
        compliance_check: 88, completeness: 77,
      }),
      ai_diagnosis: JSON.stringify({
        strengths: ["方案结构清晰", "技术选型合理", "交付物完整"],
        suggestions: ["可补充更多数据支撑", "风险预案略显不足"],
      }),
    },
  });

  return { submissionId: submission.id, talentProfileId: talentProfile.id };
}

/**
 * 给企业账号补充邀请配额（确保测试可以发起邀请）
 */
export async function ensureCorpHasQuota(corpEmail: string, quota = 5): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: corpEmail } });
  if (!user) throw new Error(`Corp user not found: ${corpEmail}`);

  const corp = await prisma.corpProfile.update({
    where: { user_id: user.id },
    data: { invite_quota: quota },
  });

  return corp.id;
}

/**
 * 创建协作 Collaboration（跳过 UI 邀请流程，直接 DB 建立）
 * 用于专注测试后续流程（接受→聊天→完成→评分）
 */
export async function createCollaboration(
  submissionId: string,
  corpProfileId: string,
  talentProfileId: string,
  requirementId: string
): Promise<string> {
  const collab = await prisma.collaboration.create({
    data: {
      submission_id: submissionId,
      requirement_id: requirementId,
      talent_id: talentProfileId,
      corp_id: corpProfileId,
      status: "invited",
      invitation_message: "您的方案出色，期待合作！",
    },
  });
  // 更新 submission 状态
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "invited" },
  });
  return collab.id;
}

/**
 * 清理测试数据（删除 collaboration 及关联 messages、submission）
 */
export async function cleanupTestData(
  talentEmail: string,
  requirementId: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: talentEmail } });
  if (!user) return;
  const talentProfile = await prisma.talentProfile.findUnique({ where: { user_id: user.id } });
  if (!talentProfile) return;

  // 删除消息 → 协作 → 提交（顺序很重要）
  const collabs = await prisma.collaboration.findMany({
    where: { talent_id: talentProfile.id, requirement_id: requirementId },
  });
  for (const c of collabs) {
    await prisma.message.deleteMany({ where: { collaboration_id: c.id } });
  }
  await prisma.collaboration.deleteMany({
    where: { talent_id: talentProfile.id, requirement_id: requirementId },
  });
  await prisma.submission.deleteMany({
    where: { talent_id: talentProfile.id, requirement_id: requirementId },
  });
}

/**
 * 查询 Collaboration 当前状态（DB 验证用）
 */
export async function getCollabStatus(collabId: string) {
  return prisma.collaboration.findUnique({
    where: { id: collabId },
    select: {
      status: true,
      corp_confirmed_complete: true,
      talent_confirmed_complete: true,
      corp_star_rating: true,
    },
  });
}

/**
 * 查询消息数量（DB 验证用）
 */
export async function getMessageCount(collabId: string): Promise<number> {
  return prisma.message.count({ where: { collaboration_id: collabId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// 考核邀请 Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取 Talent 的 Profile ID 和 username（用于考核邀请测试）
 */
export async function getTalentProfile(email: string): Promise<{ id: string; username: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found: ${email}`);
  const profile = await prisma.talentProfile.findUnique({ where: { user_id: user.id } });
  if (!profile) throw new Error(`TalentProfile not found for ${email}`);
  return { id: profile.id, username: profile.username };
}

/**
 * 直接 DB 创建考核邀请（type: "assessment"，status: "invited"）
 * 用于 B-Suite 异常测试的前置 fixture
 */
export async function createAssessmentInvitation(
  talentProfileId: string,
  corpProfileId: string,
  requirementId: string,
  message?: string
): Promise<string> {
  const collab = await prisma.collaboration.create({
    data: {
      type: "assessment",
      talent_id: talentProfileId,
      corp_id: corpProfileId,
      requirement_id: requirementId,
      status: "invited",
      invitation_message: message ?? null,
    },
  });
  return collab.id;
}

/**
 * 清理指定 Talent 对指定 Requirement 的所有考核邀请
 */
export async function cleanupAssessmentInvites(
  talentEmail: string,
  requirementId: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: talentEmail } });
  if (!user) return;
  const profile = await prisma.talentProfile.findUnique({ where: { user_id: user.id } });
  if (!profile) return;
  await prisma.collaboration.deleteMany({
    where: { type: "assessment", talent_id: profile.id, requirement_id: requirementId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// misc-interactions Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 创建 no_exam 类型的需求（用于意向合作测试）
 */
export async function createNoExamRequirement(corpProfileId: string): Promise<string> {
  const req = await prisma.requirement.create({
    data: {
      corp_id: corpProfileId,
      title: "测试无考核需求",
      intent_desc: "这是一个用于测试无考核意向合作流程的需求。",
      question_types: '["no_exam"]',
      status: "active",
    },
  });
  return req.id;
}

/**
 * 清理指定 Talent 对指定 Requirement 的所有 no_exam_intent 协作
 */
export async function cleanupNoExamIntents(
  talentEmail: string,
  requirementId: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: talentEmail } });
  if (!user) return;
  const profile = await prisma.talentProfile.findUnique({ where: { user_id: user.id } });
  if (!profile) return;
  await prisma.collaboration.deleteMany({
    where: { type: "no_exam_intent", talent_id: profile.id, requirement_id: requirementId },
  });
}

/**
 * 直接 DB 创建通知（用于通知系统 B-Suite fixture）
 * @param userId  User.id（非 profile id）
 */
export async function createTestNotification(
  userId: string,
  type: string,
  payload: object
): Promise<string> {
  const n = await prisma.notification.create({
    data: {
      user_id: userId,
      type,
      payload: JSON.stringify(payload),
      is_read: false,
    },
  });
  return n.id;
}

export { prisma };
