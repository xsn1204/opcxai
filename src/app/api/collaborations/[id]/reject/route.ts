import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Fetch first to determine type — corp rejects no_exam_intent (no self-notification needed),
    // talent rejects collaboration (corp needs to know via unread_for_corp)
    const collab = await prisma.collaboration.findUnique({
      where: { id },
      include: { talent_profile: { select: { user_id: true } } },
    });
    if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isCorpRejectingIntent = collab.type === "no_exam_intent" && collab.invitation_message !== null;
    await prisma.collaboration.update({
      where: { id },
      data: {
        status: "rejected",
        // Corp rejecting talent's confirmed intent → talent needs to see the rejection
        // Talent rejecting corp's invite (collaboration OR no_exam_intent with null message) → corp needs notification
        unread_for_corp: !isCorpRejectingIntent,
        unread_for_talent: isCorpRejectingIntent,
      },
    });

    if (collab.talent_profile) {
      if (collab.type === "no_exam_intent" && collab.invitation_message !== null) {
        // Corp rejected talent's confirmed intent — talent sees "对方拒绝意向" via is_read staying false
      } else {
        await prisma.notification.updateMany({
          where: {
            user_id: collab.talent_profile.user_id,
            type: "invitation",
            is_read: false,
            payload: { contains: id },
          },
          data: { is_read: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reject Collaboration Error]', {
      collaborationId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to reject collaboration",
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}
