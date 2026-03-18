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
      data: { status: "rejected", unread_for_corp: true },
    });

    // Mark the talent's invitation notification as read
    const collab = await prisma.collaboration.findUnique({
      where: { id },
      include: { talent_profile: { select: { user_id: true } } },
    });
    if (collab?.talent_profile) {
      if (collab.type === "no_exam_intent") {
        // Corp rejected talent's intent — is_read stays false so intentResponses picks it up
        // Do NOT set unread_for_talent=true; that field is reserved for new chat messages only
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
