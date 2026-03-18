import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkVerifyCode } from "@/lib/email";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { code?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { code, newPassword } = body;

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "请输入6位验证码" }, { status: 400 });
  }
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "新密码不能少于8位" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const valid = checkVerifyCode(user.email, code);
  if (!valid) {
    return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.sub },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
