import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreSubmission } from "@/lib/score-submission";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const talentProfile = await prisma.talentProfile.findUnique({
      where: { user_id: session.sub },
    });
    if (!talentProfile) {
      return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { requirement_id, conversation_log, answers } = body;

    // Reject empty answers
    const answerKeys = Object.keys(answers ?? {}).filter((k) => k !== "question_files");
    if (answerKeys.length === 0) {
      return NextResponse.json({ error: "答案不能为空" }, { status: 400 });
    }

    // Prevent duplicate submission for the same talent + requirement
    const existing = await prisma.submission.findFirst({
      where: { talent_id: talentProfile.id, requirement_id },
    });
    if (existing) {
      return NextResponse.json({ error: "已提交过此需求" }, { status: 409 });
    }

    const submission = await prisma.submission.create({
      data: {
        requirement_id,
        talent_id: talentProfile.id,
        conversation_log: JSON.stringify(conversation_log ?? []),
        answers: JSON.stringify(answers ?? {}),
        status: "pending",
      },
    });

    // Trigger async AI scoring directly (no HTTP self-call)
    scoreSubmission(submission.id).catch((err) =>
      console.error("Scoring failed for", submission.id, err)
    );

    // Mark any pending assessment invitation as completed (fire-and-forget)
    prisma.collaboration.updateMany({
      where: { type: "assessment", talent_id: talentProfile.id, requirement_id, status: "invited" },
      data: { status: "completed" },
    }).catch(() => {});

    return NextResponse.json(submission, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
