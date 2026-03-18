import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateVerifyCode, sendResetPasswordEmail } from "@/lib/email";

// ─── Per-user rate limit: 3 sends per 10 minutes ─────────────────────────────
const sendRateMap = new Map<string, { count: number; resetAt: number }>();
const SEND_LIMIT = 3;
const SEND_WINDOW = 10 * 60 * 1000; // 10 minutes

function checkSendRate(userId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = sendRateMap.get(userId);
  if (!entry || now >= entry.resetAt) {
    sendRateMap.set(userId, { count: 1, resetAt: now + SEND_WINDOW });
    return { ok: true, retryAfter: 0 };
  }
  if (entry.count >= SEND_LIMIT) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { ok, retryAfter } = checkSendRate(session.sub);
  if (!ok) {
    return NextResponse.json(
      { error: `发送过于频繁，请 ${retryAfter} 秒后再试` },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  try {
    const code = generateVerifyCode(user.email);
    await sendResetPasswordEmail(user.email, code);
    // Return masked email so client can display it
    const [local, domain] = user.email.split("@");
    const masked = local.slice(0, 2) + "***@" + domain;
    return NextResponse.json({ success: true, maskedEmail: masked });
  } catch (err) {
    console.error("[send-reset-code]", err);
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }
}
