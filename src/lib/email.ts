import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

// ─── Generate & store a 6-digit code ─────────────────────────────────────────
export async function generateVerifyCode(email: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.emailVerification.upsert({
    where: { email },
    create: { email, code, expires_at: expiresAt },
    update: { code, expires_at: expiresAt, verified: false },
  });

  return code;
}

// ─── Verify a code ────────────────────────────────────────────────────────────
export async function checkVerifyCode(email: string, input: string): Promise<boolean> {
  const entry = await prisma.emailVerification.findUnique({ where: { email } });
  if (!entry || entry.verified) return false;
  if (entry.expires_at < new Date()) return false;
  if (entry.code !== input) return false;

  await prisma.emailVerification.update({
    where: { email },
    data: { verified: true },
  });

  return true;
}

// ─── Mark email as verified ─────────────────────────────────────────────────
export async function markEmailVerified(email: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.emailVerification.upsert({
    where: { email },
    create: { email, code: "", verified: true, expires_at: expiresAt },
    update: { verified: true, expires_at: expiresAt },
  });
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const entry = await prisma.emailVerification.findUnique({ where: { email } });
  if (!entry || !entry.verified) return false;
  if (entry.expires_at < new Date()) return false;
  return true;
}

export async function consumeEmailVerified(email: string): Promise<void> {
  await prisma.emailVerification.delete({ where: { email } }).catch(() => {});
}

// ─── Send code via SMTP ───────────────────────────────────────────────────────
export async function sendVerifyEmail(email: string, code: string): Promise<void> {
  const emailPass = process.env.EMAIL_PASS;

  // Fallback: print to console when no password is configured
  if (!emailPass) {
    console.log(`[EMAIL-DEV] Verify code for ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtpdm.aliyun.com",
    port: 80,      // Aliyun DirectMail: port 80 with STARTTLS (465 SSL blocked locally)
    secure: false, // STARTTLS upgrade happens automatically after EHLO
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: `"OPC x AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "【OPC x AI】邮箱验证码",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">OPC x AI 邮箱验证</h2>
        <p>您好，感谢注册 OPC x AI 平台。</p>
        <p>您的验证码为：</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;padding:16px 0">${code}</div>
        <p style="color:#888;font-size:13px">验证码 5 分钟内有效，请勿泄露给他人。</p>
      </div>
    `,
  });
}

// ─── Reset token store (forgot-password flow) ────────────────────────────────
import crypto from "crypto";

interface TokenEntry {
  email: string;
  expiresAt: number;
}

const resetTokenStore = new Map<string, TokenEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of resetTokenStore.entries()) {
    if (entry.expiresAt < now) resetTokenStore.delete(token);
  }
}, 60_000);

export function generateResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  resetTokenStore.set(token, { email, expiresAt: Date.now() + 60 * 60 * 1000 });
  return token;
}

export function verifyResetToken(token: string): string | null {
  const entry = resetTokenStore.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    resetTokenStore.delete(token);
    return null;
  }
  return entry.email;
}

export function consumeResetToken(token: string): string | null {
  const email = verifyResetToken(token);
  if (email) resetTokenStore.delete(token);
  return email;
}

export async function sendForgotPasswordEmail(email: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/reset-password?token=${token}`;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass) {
    console.log(`[EMAIL-DEV] Password reset link for ${email}: ${link}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtpdm.aliyun.com",
    port: 80,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: `"OPC x AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "【OPC x AI】重置密码",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">OPC x AI 密码重置</h2>
        <p>您好，我们收到了您的密码重置请求。</p>
        <p>请点击下方链接重置密码（1小时内有效）：</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">重置密码</a>
        <p style="color:#888;font-size:13px">如果按钮无法点击，请复制以下链接到浏览器：<br/>${link}</p>
        <p style="color:#e53e3e;font-size:13px;margin-top:8px">⚠️ 如果这不是您本人的操作，请忽略此邮件，您的密码不会被修改。</p>
      </div>
    `,
  });
}

// ─── Contact form emails ──────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtpdm.aliyun.com",
    port: 80,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const IDENTITY_LABELS: Record<string, string> = {
  enterprise: "企业方（寻找AI人才）",
  individual: "超级个体（寻求合作）",
  investor: "OPC社区 / 孵化器",
  media: "媒体 / 合作伙伴",
};

export interface ContactData {
  name: string;
  contact: string;
  identityType: string;
  message: string;
  submittedAt: string;
}

/** Notify admin that a new contact message has arrived */
export async function sendContactNotification(data: ContactData): Promise<void> {
  const adminEmail = process.env.CONTACT_NOTIFY_EMAIL;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass || !adminEmail) {
    console.log("[EMAIL-DEV] New contact message:", data);
    return;
  }

  const identityLabel = IDENTITY_LABELS[data.identityType] ?? data.identityType;

  await createTransporter().sendMail({
    from: `"OPC x AI 留言通知" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `【OPC x AI】新客户留言 — ${data.name}（${identityLabel}）`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:12px">
        <div style="background:#4f46e5;color:#fff;padding:16px 24px;border-radius:8px;margin-bottom:24px">
          <h2 style="margin:0;font-size:18px">📬 新留言通知</h2>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:10px 0;color:#64748b;width:100px">姓名</td>
            <td style="padding:10px 0;font-weight:bold;color:#1e293b">${data.name}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:10px 0;color:#64748b">联系方式</td>
            <td style="padding:10px 0;font-weight:bold;color:#1e293b">${data.contact}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:10px 0;color:#64748b">身份类型</td>
            <td style="padding:10px 0;color:#4f46e5;font-weight:600">${identityLabel}</td>
          </tr>
          <tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:10px 0;color:#64748b;vertical-align:top">需求说明</td>
            <td style="padding:10px 0;color:#1e293b;line-height:1.6">${data.message.replace(/\n/g, "<br/>")}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#64748b">提交时间</td>
            <td style="padding:10px 0;color:#94a3b8;font-size:12px">${data.submittedAt}</td>
          </tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#94a3b8">此邮件由 OPC x AI 平台自动发送</p>
      </div>
    `,
  });
}

/** Auto-reply thank-you email to the person who submitted the contact form */
export async function sendContactAutoReply(toEmail: string, name: string): Promise<void> {
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass) {
    console.log(`[EMAIL-DEV] Would send auto-reply to ${toEmail}`);
    return;
  }

  await createTransporter().sendMail({
    from: `"OPC x AI" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "【OPC x AI】感谢您的留言，我们已收到！",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 32px;border-radius:12px 12px 0 0;text-align:center">
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase">OPC x AI</p>
          <h1 style="color:#fff;font-size:24px;margin:0;font-weight:800">感谢您的留言 ✨</h1>
        </div>

        <!-- Body -->
        <div style="background:#fff;padding:36px 32px;border:1px solid #e2e8f0;border-top:none">
          <p style="font-size:16px;color:#1e293b;margin:0 0 16px">您好，<strong>${name}</strong>！</p>
          <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 24px">
            我们已收到您的留言，感谢您对 <strong>OPC x AI</strong> 的关注与信任。<br/>
            我们的团队将在 <strong style="color:#4f46e5">1–2 个工作日内</strong> 与您联系，请留意您的手机或邮箱。
          </p>

          <div style="background:#f1f5f9;border-left:4px solid #4f46e5;border-radius:4px;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0;font-size:13px;color:#475569;line-height:1.7">
              🚀 <strong>OPC x AI</strong> 是首个基于 AI 实战考核的双边匹配平台，让企业与超级个体之间告别简历筛选，用真实业务能力说话。
            </p>
          </div>

          <p style="font-size:13px;color:#94a3b8;margin:0">
            期待与您开启新的合作可能，<br/>
            OPC x AI 团队
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center">
          <p style="margin:0;font-size:11px;color:#cbd5e1">
            © 2026 OPC x AI · 此邮件为系统自动发送，请勿直接回复
          </p>
        </div>
      </div>
    `,
  });
}

// ─── Send password-reset code via SMTP ───────────────────────────────────────
export async function sendResetPasswordEmail(email: string, code: string): Promise<void> {
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass) {
    console.log(`[EMAIL-DEV] Password reset code for ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtpdm.aliyun.com",
    port: 80,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: `"OPC x AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "【OPC x AI】修改密码验证码",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">OPC x AI 密码修改验证</h2>
        <p>您好，我们收到了您的密码修改请求。</p>
        <p>您的验证码为：</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;padding:16px 0">${code}</div>
        <p style="color:#888;font-size:13px">验证码 5 分钟内有效。</p>
        <p style="color:#e53e3e;font-size:13px;margin-top:8px">⚠️ 如果这不是您本人的操作，请勿将验证码告知任何人，您的账户密码不会被修改。</p>
      </div>
    `,
  });
}
