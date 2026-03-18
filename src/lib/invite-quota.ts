import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

/** Returns true if now is in a later calendar-month than resetAt */
function isNewMonth(resetAt: Date): boolean {
  const now = new Date();
  return (
    now.getFullYear() > resetAt.getFullYear() ||
    (now.getFullYear() === resetAt.getFullYear() &&
      now.getMonth() > resetAt.getMonth())
  );
}

/**
 * Reads the corp's current invite quota, auto-resets monthly quota on new
 * calendar month, and lazy-generates a referral code if needed.
 *
 * - invite_quota: resets to 3 each month (monthly allocation)
 * - referral_bonus: permanent, accumulated from referrals, never reset
 * - total quota = invite_quota + referral_bonus
 */
export async function getCorpQuota(corpId: string): Promise<{
  quota: number;        // total usable = monthly + bonus
  monthlyQuota: number; // invite_quota after reset
  referralBonus: number; // permanent bonus
  referralCode: string;
}> {
  const corp = await prisma.corpProfile.findUnique({
    where: { id: corpId },
    select: { invite_quota: true, referral_bonus: true, quota_reset_at: true, referral_code: true },
  });
  if (!corp) throw new Error("Corp not found");

  const needsReset = isNewMonth(corp.quota_reset_at);
  const needsCode = !corp.referral_code;

  if (needsReset || needsCode) {
    const updated = await prisma.corpProfile.update({
      where: { id: corpId },
      data: {
        // Only reset the monthly portion; referral_bonus is untouched
        ...(needsReset && { invite_quota: 3, quota_reset_at: new Date() }),
        ...(needsCode && { referral_code: randomBytes(6).toString("hex") }),
      },
    });
    const monthly = updated.invite_quota;
    const bonus = updated.referral_bonus;
    return {
      quota: monthly + bonus,
      monthlyQuota: monthly,
      referralBonus: bonus,
      referralCode: updated.referral_code!,
    };
  }

  return {
    quota: corp.invite_quota + corp.referral_bonus,
    monthlyQuota: corp.invite_quota,
    referralBonus: corp.referral_bonus,
    referralCode: corp.referral_code!,
  };
}

/**
 * Atomically decrements the quota by 1.
 * Uses monthly quota first; falls back to referral_bonus.
 * Throws "QUOTA_EXHAUSTED" if both are 0.
 */
export async function decrementQuota(
  corpId: string,
  tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
): Promise<void> {
  const db = tx ?? prisma;
  const corp = await (db as typeof prisma).corpProfile.findUnique({
    where: { id: corpId },
    select: { invite_quota: true, referral_bonus: true, quota_reset_at: true },
  });
  if (!corp) throw new Error("Corp not found");

  // Apply virtual monthly reset if needed (without persisting separately here —
  // getCorpQuota handles persistence; here we just compute effective values)
  const effectiveMonthly = isNewMonth(corp.quota_reset_at) ? 3 : corp.invite_quota;
  const effectiveBonus = corp.referral_bonus;
  const totalQuota = effectiveMonthly + effectiveBonus;

  if (totalQuota <= 0) throw new Error("QUOTA_EXHAUSTED");

  if (effectiveMonthly > 0) {
    // Consume from monthly quota first (it resets anyway)
    await (db as typeof prisma).corpProfile.update({
      where: { id: corpId },
      data: isNewMonth(corp.quota_reset_at)
        ? { invite_quota: 2, quota_reset_at: new Date() }   // reset to 3, then use 1
        : { invite_quota: { decrement: 1 } },
    });
  } else {
    // Monthly exhausted — consume from permanent referral bonus
    await (db as typeof prisma).corpProfile.update({
      where: { id: corpId },
      data: { referral_bonus: { decrement: 1 } },
    });
  }
}
