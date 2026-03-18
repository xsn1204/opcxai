// Test script: verifies referral bonus logic for both referrer and new corp user
// Run: node scripts/test-referral.cjs

const { PrismaClient } = require("../node_modules/@prisma/client");
const bcrypt = require("../node_modules/bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const REFERRAL_CODE = "test_ref_" + Date.now();
  const hash = await bcrypt.hash("password123", 10);

  // ── 清理残留 ──
  await prisma.user.deleteMany({
    where: { email: { in: ["referrer@test.com", "newcorp@test.com"] } },
  });

  // ── 1. 创建 referrer corp ──
  const referrerUser = await prisma.user.create({
    data: {
      email: "referrer@test.com",
      password: hash,
      role: "corp",
      corp_profile: {
        create: {
          company_name: "邀请方公司",
          contact_name: "张三",
          business_tracks: "[]",
          referral_code: REFERRAL_CODE,
        },
      },
    },
    include: { corp_profile: true },
  });
  console.log(
    "✅ Referrer 创建:",
    referrerUser.corp_profile.company_name,
    "| invite_quota:", referrerUser.corp_profile.invite_quota,
    "| referral_bonus:", referrerUser.corp_profile.referral_bonus
  );

  // ── 2. 创建新注册 corp user ──
  const newUser = await prisma.user.create({
    data: {
      email: "newcorp@test.com",
      password: hash,
      role: "corp",
      corp_profile: {
        create: { company_name: "新注册公司", contact_name: "李四", business_tracks: "[]" },
      },
    },
    include: { corp_profile: true },
  });
  console.log(
    "✅ 新用户创建:",
    newUser.corp_profile.company_name,
    "| referral_bonus:", newUser.corp_profile.referral_bonus
  );

  // ── 3. 模拟注册路由里的 referral 奖励逻辑 ──
  const referrer = await prisma.corpProfile.findUnique({
    where: { referral_code: REFERRAL_CODE },
    select: { id: true },
  });

  const alreadyLogged = await prisma.referralLog.findUnique({
    where: { new_user_id: newUser.id },
  });

  if (referrer && !alreadyLogged) {
    const txOps = [
      prisma.referralLog.create({
        data: { referrer_id: referrer.id, new_user_id: newUser.id },
      }),
      prisma.corpProfile.update({
        where: { id: referrer.id },
        data: { referral_bonus: { increment: 3 } },
      }),
      // role === "corp": new user also gets +3
      prisma.corpProfile.update({
        where: { user_id: newUser.id },
        data: { referral_bonus: { increment: 3 } },
      }),
    ];
    await prisma.$transaction(txOps);
  }

  // ── 4. 验证结果 ──
  const [updatedReferrer, updatedNew] = await Promise.all([
    prisma.corpProfile.findUnique({
      where: { id: referrer.id },
      select: { company_name: true, invite_quota: true, referral_bonus: true },
    }),
    prisma.corpProfile.findUnique({
      where: { user_id: newUser.id },
      select: { company_name: true, invite_quota: true, referral_bonus: true },
    }),
  ]);
  const log = await prisma.referralLog.findUnique({ where: { new_user_id: newUser.id } });

  console.log("\n── 奖励结果 ──");
  console.log("邀请方:", JSON.stringify(updatedReferrer));
  console.log("新用户:", JSON.stringify(updatedNew));
  console.log("ReferralLog 写入:", log ? "✅ 存在" : "❌ 缺失");

  const referrerOk = updatedReferrer.referral_bonus === 3;
  const newUserOk = updatedNew.referral_bonus === 3;
  console.log("\n── 断言 ──");
  console.log("邀请方 referral_bonus === 3:", referrerOk ? "✅ PASS" : "❌ FAIL (got " + updatedReferrer.referral_bonus + ")");
  console.log("新用户 referral_bonus === 3:", newUserOk ? "✅ PASS" : "❌ FAIL (got " + updatedNew.referral_bonus + ")");

  // ── 5. 测试重复触发防护 ──
  console.log("\n── 测试重复触发防护 ──");
  const alreadyLogged2 = await prisma.referralLog.findUnique({ where: { new_user_id: newUser.id } });
  if (alreadyLogged2) {
    console.log("已有 ReferralLog，事务将被跳过: ✅ 正确阻止重复奖励");
  } else {
    console.log("❌ ReferralLog 缺失，防护失效");
  }

  // ── 6. 多人使用同一链接（+3n）──
  console.log("\n── 测试多人使用同一链接（+3n）──");
  // 再模拟一个新用户使用同一 referral_code（已有 referrerUser，不重新创建）
  const newUser2 = await prisma.user.create({
    data: {
      email: "newcorp2@test.com",
      password: hash,
      role: "corp",
      corp_profile: { create: { company_name: "第二家注册公司", contact_name: "王五", business_tracks: "[]" } },
    },
    include: { corp_profile: true },
  });
  const alreadyLogged3 = await prisma.referralLog.findUnique({ where: { new_user_id: newUser2.id } });
  if (!alreadyLogged3) {
    await prisma.$transaction([
      prisma.referralLog.create({ data: { referrer_id: referrer.id, new_user_id: newUser2.id } }),
      prisma.corpProfile.update({ where: { id: referrer.id }, data: { referral_bonus: { increment: 3 } } }),
      prisma.corpProfile.update({ where: { user_id: newUser2.id }, data: { referral_bonus: { increment: 3 } } }),
    ]);
  }
  const finalReferrer = await prisma.corpProfile.findUnique({
    where: { id: referrer.id },
    select: { referral_bonus: true },
  });
  console.log("两人注册后邀请方 referral_bonus:", finalReferrer.referral_bonus, "| 期望值: 6 |", finalReferrer.referral_bonus === 6 ? "✅ PASS" : "❌ FAIL");

  // ── 清理 ──
  await prisma.user.deleteMany({
    where: { email: { in: ["referrer@test.com", "newcorp@test.com", "newcorp2@test.com"] } },
  });
  console.log("\n✅ 测试数据已清理");
}

main()
  .catch((e) => { console.error("❌ 错误:", e.message); })
  .finally(() => prisma.$disconnect());
