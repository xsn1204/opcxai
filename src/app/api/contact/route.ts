import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  sendContactNotification,
  sendContactAutoReply,
  type ContactData,
} from "@/lib/email";

const MESSAGES_FILE = path.join(process.cwd(), "messages.json");

function loadMessages(): ContactData[] {
  if (!fs.existsSync(MESSAGES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveMessages(messages: ContactData[]) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf-8");
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, contact, identityType, message } = body;

  if (!name?.trim() || !contact?.trim() || !identityType || !message?.trim()) {
    return NextResponse.json({ error: "请填写所有必填项" }, { status: 400 });
  }

  const data: ContactData = {
    name: name.trim(),
    contact: contact.trim(),
    identityType,
    message: message.trim(),
    submittedAt: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
  };

  // 1. Save to messages.json
  const messages = loadMessages();
  messages.push(data);
  saveMessages(messages);

  // 2. Notify admin (fire-and-forget, don't fail the request on email error)
  sendContactNotification(data).catch((e) =>
    console.error("[contact] admin notification failed:", e)
  );

  // 3. Auto-reply if contact looks like an email
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact);
  if (isEmail) {
    sendContactAutoReply(data.contact, data.name).catch((e) =>
      console.error("[contact] auto-reply failed:", e)
    );
  }

  return NextResponse.json({ success: true });
}
