/**
 * check-smtp.js — Aliyun SMTP connectivity & send test
 * Usage: node check-smtp.js
 */

const nodemailer = require("nodemailer");

const TARGET_EMAIL = "vsshaj@163.com";

const config = {
  host: process.env.EMAIL_HOST || "smtpdm.aliyun.com",
  port: 80,       // Aliyun DirectMail: port 80 with STARTTLS
  secure: false,  // STARTTLS negotiated automatically after EHLO
  auth: {
    user: process.env.EMAIL_USER || "noreply@mail.opcxai.com",
    pass: process.env.EMAIL_PASS || "Smtp970722",
  },
};

async function main() {
  console.log("\n========================================");
  console.log("  OPC x AI — SMTP Connectivity Check");
  console.log("========================================");
  console.log(`  Host  : ${config.host}:${config.port} (SSL)`);
  console.log(`  User  : ${config.auth.user}`);
  console.log(`  Target: ${TARGET_EMAIL}`);
  console.log("----------------------------------------\n");

  const transporter = nodemailer.createTransport(config);

  // Step 1: verify connection
  process.stdout.write("[1/2] Verifying SMTP connection... ");
  try {
    await transporter.verify();
    console.log("✅ Connected successfully");
  } catch (err) {
    console.log("❌ Connection FAILED");
    console.error(`    Error: ${err.message}`);
    console.error(`    Code : ${err.code || "N/A"}`);
    process.exit(1);
  }

  // Step 2: send test email
  process.stdout.write(`[2/2] Sending test email to ${TARGET_EMAIL}... `);
  try {
    const info = await transporter.sendMail({
      from: `"OPC x AI Test" <${config.auth.user}>`,
      to: TARGET_EMAIL,
      subject: "【OPC x AI】SMTP 连通性测试邮件",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#4f46e5;margin-bottom:8px">OPC x AI SMTP 测试</h2>
          <p style="color:#374151">这是一封由 <strong>check-smtp.js</strong> 发出的连通性测试邮件。</p>
          <p style="color:#374151">如果你收到这封邮件，说明阿里云 SMTP 配置完全正常。</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
          <p style="color:#9ca3af;font-size:12px">
            发送时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}<br/>
            SMTP Host：${config.host}
          </p>
        </div>
      `,
    });
    console.log("✅ Email sent");
    console.log(`    Message ID : ${info.messageId}`);
    console.log(`    Response   : ${info.response}`);
  } catch (err) {
    console.log("❌ Send FAILED");
    console.error(`    Error: ${err.message}`);
    console.error(`    Code : ${err.code || "N/A"}`);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("  All checks passed. SMTP is operational.");
  console.log("========================================\n");
}

main();
