import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyResetToken, consumeResetToken } from "@/lib/email";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "参数缺失" }, { status: 400 });
  }

  const email = verifyResetToken(token);
  if (!email) {
    return NextResponse.json({ error: "链接无效或已过期" }, { status: 400 });
  }

  const hash = await hashPassword(password);
  await prisma.user.update({ where: { email }, data: { password: hash } });

  consumeResetToken(token);

  return NextResponse.json({ ok: true });
}
