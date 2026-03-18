import nodemailer from "nodemailer";

// ─── In-memory verification code store ───────────────────────────────────────
// Maps email → { code, expiresAt }
// Note: this is process-level memory; works for single-instance deployments.

interface CodeEntry {
  code: string;
  expiresAt: number; // Unix ms
}

const codeStore = new Map<string, CodeEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of codeStore.entries()) {
    if (entry.expiresAt < now) codeStore.delete(email);
  }
}, 60_000);

// ─── Generate & store a 6-digit code ─────────────────────────────────────────
export function generateVerifyCode(email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codeStore.set(email, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  return code;
}

// ─── Verify a code ────────────────────────────────────────────────────────────
export function checkVerifyCode(email: string, input: string): boolean {
  const entry = codeStore.get(email);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    codeStore.delete(email);
    return false;
  }
  if (entry.code !== input) return false;
  codeStore.delete(email); // consume code on success
  return true;
}

// ─── Mark email as verified (after successful check) ─────────────────────────
// We reuse the store: successful verification sets a special marker valid 10 min
const verifiedStore = new Map<string, number>(); // email → expiresAt

export function markEmailVerified(email: string) {
  verifiedStore.set(email, Date.now() + 10 * 60 * 1000);
}

export function isEmailVerified(email: string): boolean {
  const exp = verifiedStore.get(email);
  if (!exp) return false;
  if (exp < Date.now()) {
    verifiedStore.delete(email);
    return false;
  }
  return true;
}

export function consumeEmailVerified(email: string) {
  verifiedStore.delete(email);
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
