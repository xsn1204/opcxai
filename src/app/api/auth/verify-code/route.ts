import { NextResponse } from "next/server";
import { checkVerifyCode, markEmailVerified } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "参数缺失" }, { status: 400 });
    }

    const valid = checkVerifyCode(email, String(code).trim());
    if (!valid) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    markEmailVerified(email);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[verify-code]", err);
    return NextResponse.json({ error: "验证失败，请稍后重试" }, { status: 500 });
  }
}
