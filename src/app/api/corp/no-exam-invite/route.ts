import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "corp") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corpProfile = await prisma.corpProfile.findUnique({
      where: { user_id: session.sub },
    });
    if (!corpProfile) return NextResponse.json({ error: "Corp profile not found" }, { status: 404 });

    const { talent_id, requirement_id } = await request.json();

    // Idempotent check
    const existing = await prisma.collaboration.findFirst({
      where: { type: "no_exam_intent", talent_id, requirement_id, corp_id: corpProfile.id },
    });
    if (existing) return NextResponse.json({ alreadyInvited: true, id: existing.id });

    const collab = await prisma.collaboration.create({
      data: {
        type: "no_exam_intent",
        talent_id,
        requirement_id,
        corp_id: corpProfile.id,
        status: "invited",
        invitation_message: null, // corp-initiated, no message
      },
    });

    // Notify talent
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: talent_id },
      select: { user_id: true },
    });
    if (talentProfile) {
      await prisma.notification.create({
        data: {
          user_id: talentProfile.user_id,
          type: "no_exam_intent",
          payload: JSON.stringify({
            collaboration_id: collab.id,
            requirement_id,
            corp_id: corpProfile.id,
          }),
        },
      });
    }

    return NextResponse.json({ success: true, id: collab.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
