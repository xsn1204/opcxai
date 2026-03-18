import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResetToken, sendForgotPasswordEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = generateResetToken(email);
    await sendForgotPasswordEmail(email, token);
  }

  // Always return success to prevent user enumeration
  return NextResponse.json({ ok: true });
}
