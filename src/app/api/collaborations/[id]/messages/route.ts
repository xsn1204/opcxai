import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const messages = await prisma.message.findMany({
      where: { collaboration_id: id },
      orderBy: { sent_at: "asc" },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await request.json();

    const filter = checkSensitive(content);
    if (!filter.ok) {
      return NextResponse.json(
        { error: formatHitMessage(filter.hits), words: filter.hits },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        collaboration_id: id,
        sender_id: session.sub,
        sender_role: session.role,
        content,
      },
    });

    // Update collaboration status to active if still "accepted"
    await prisma.collaboration.updateMany({
      where: { id, status: "accepted" },
      data: { status: "active" },
    });

    // Notify the other party
    const collab = await prisma.collaboration.findUnique({
      where: { id },
      include: {
        talent_profile: { select: { user_id: true } },
        corp_profile: { select: { user_id: true } },
      },
    });

    if (collab) {
      const isTalent = collab.talent_profile.user_id === session.sub;
      const receiverUserId = isTalent
        ? collab.corp_profile.user_id
        : collab.talent_profile.user_id;

      // 标记对方未读
      await prisma.collaboration.update({
        where: { id },
        data: isTalent ? { unread_for_corp: true } : { unread_for_talent: true },
      });

      await prisma.notification.create({
        data: {
          user_id: receiverUserId,
          type: "message",
          payload: JSON.stringify({ collaboration_id: id, sender_id: session.sub }),
        },
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
