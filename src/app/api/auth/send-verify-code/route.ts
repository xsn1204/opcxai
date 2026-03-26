import { NextResponse } from "next/server";
import { generateVerifyCode, sendVerifyEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const code = await generateVerifyCode(email);
    await sendVerifyEmail(email, code);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-verify-code]", err);
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }
}
