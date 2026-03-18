import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "corp") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const corpProfile = await prisma.corpProfile.findUnique({
      where: { user_id: session.sub },
    });
    if (!corpProfile) {
      return NextResponse.json({ error: "Corp profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { submission_id, invitation_message } = body;

    if (invitation_message) {
      const filter = checkSensitive(invitation_message);
      if (!filter.ok) {
        return NextResponse.json(
          { error: formatHitMessage(filter.hits), words: filter.hits },
          { status: 400 }
        );
      }
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submission_id },
      select: { requirement_id: true, talent_id: true },
    });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Create collaboration and update submission in one transaction
    const collab = await prisma.$transaction(async (tx) => {
      const newCollab = await tx.collaboration.create({
        data: {
          submission_id,
          requirement_id: submission.requirement_id,
          talent_id: submission.talent_id,
          corp_id: corpProfile.id,
          invitation_message,
          status: "invited",
        },
      });

      await tx.submission.update({
        where: { id: submission_id },
        data: { status: "invited" },
      });

      return newCollab;
    });

    // Notify talent (non-critical, outside transaction)
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: submission.talent_id },
      select: { user_id: true },
    });
    if (talentProfile) {
      await prisma.notification.create({
        data: {
          user_id: talentProfile.user_id,
          type: "invitation",
          payload: JSON.stringify({
            collaboration_id: collab.id,
            corp_id: corpProfile.id,
            requirement_id: submission.requirement_id,
          }),
        },
      });
    }

    return NextResponse.json(collab, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create collaboration" }, { status: 500 });
  }
}
