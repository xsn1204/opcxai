import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.collaboration.update({
      where: { id },
      data: { status: "accepted", unread_for_corp: true },
    });

    // Notify corp
    const collab = await prisma.collaboration.findUnique({
      where: { id },
      include: { corp_profile: { select: { user_id: true } } },
    });

    if (collab) {
      if (collab.type === "no_exam_intent") {
        // Corp accepted talent's intent — is_read stays false (default) so intentResponses picks it up
        // Do NOT set unread_for_talent=true here; that field is reserved for new chat messages only
        const talentProfile = await prisma.talentProfile.findUnique({
          where: { id: collab.talent_id },
          select: { user_id: true },
        });
        if (talentProfile) {
          await prisma.notification.create({
            data: {
              user_id: talentProfile.user_id,
              type: "intent_accepted",
              payload: JSON.stringify({ collaboration_id: id }),
            },
          });
        }
      } else {
        // Talent accepted corp's invitation — notify corp
        await prisma.notification.create({
          data: {
            user_id: collab.corp_profile.user_id,
            type: "invitation_accepted",
            payload: JSON.stringify({ collaboration_id: id }),
          },
        });

        // Mark the talent's invitation notification as read
        const talentProfile = await prisma.talentProfile.findUnique({
          where: { id: collab.talent_id },
          select: { user_id: true },
        });
        if (talentProfile) {
          await prisma.notification.updateMany({
            where: {
              user_id: talentProfile.user_id,
              type: "invitation",
              is_read: false,
              payload: { contains: id },
            },
            data: { is_read: true },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Accept Collaboration Error]', {
      collaborationId: id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to accept collaboration",
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}
