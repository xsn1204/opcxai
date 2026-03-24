import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ reqId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reqId } = await params;

  const talentProfile = await prisma.talentProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!talentProfile) return NextResponse.json({ error: "Talent profile not found" }, { status: 404 });

  const requirement = await prisma.requirement.findFirst({
    where: { id: reqId, status: "active" },
    select: { id: true, corp_id: true, question_types: true },
  });
  if (!requirement) return NextResponse.json({ error: "Requirement not found" }, { status: 404 });

  const questionTypes: string[] = JSON.parse(requirement.question_types || "[]");
  if (!questionTypes.includes("no_exam")) {
    return NextResponse.json({ error: "This requirement requires an exam" }, { status: 400 });
  }

  // Idempotent — active (non-rejected) confirmed intent already exists
  const activeIntent = await prisma.collaboration.findFirst({
    where: {
      requirement_id: reqId,
      talent_id: talentProfile.id,
      invitation_message: { not: null },
      status: { not: "rejected" },
    },
    select: { id: true },
  });
  if (activeIntent) return NextResponse.json({ ok: true });

  // One chance only — any rejected record (either side rejected) terminates this opportunity
  const terminatedRecord = await prisma.collaboration.findFirst({
    where: { requirement_id: reqId, talent_id: talentProfile.id, type: "no_exam_intent", status: "rejected" },
    select: { id: true },
  });
  if (terminatedRecord) return NextResponse.json({ error: "Opportunity closed" }, { status: 400 });

  // Unconfirmed corp invite (not rejected) — talent is confirming it, re-activate in place
  const pendingCorpInvite = await prisma.collaboration.findFirst({
    where: {
      requirement_id: reqId,
      talent_id: talentProfile.id,
      invitation_message: null,
      status: { not: "rejected" },
    },
    select: { id: true },
  });
  if (pendingCorpInvite) {
    await prisma.collaboration.update({
      where: { id: pendingCorpInvite.id },
      data: {
        status: "active",
        invitation_message: "无前置考核通道发起合作意向",
        unread_for_corp: true,
      },
    });
    const corpProfile = await prisma.corpProfile.findUnique({
      where: { id: requirement.corp_id },
      select: { user_id: true },
    });
    if (corpProfile) {
      await prisma.notification.create({
        data: {
          user_id: corpProfile.user_id,
          type: "no_exam_intent",
          payload: JSON.stringify({
            collaboration_id: pendingCorpInvite.id,
            talent_id: talentProfile.id,
            requirement_id: reqId,
          }),
        },
      });
    }
    return NextResponse.json({ ok: true });
  }
  // Rejected records are left in place as history — fall through to create a fresh record

  const collab = await prisma.collaboration.create({
    data: {
      type: "no_exam_intent",
      requirement_id: reqId,
      talent_id: talentProfile.id,
      corp_id: requirement.corp_id,
      status: "invited",
      invitation_message: "无前置考核通道发起合作意向",
    },
  });

  // Notify corp
  const corpProfile = await prisma.corpProfile.findUnique({
    where: { id: requirement.corp_id },
    select: { user_id: true },
  });
  if (corpProfile) {
    await prisma.notification.create({
      data: {
        user_id: corpProfile.user_id,
        type: "no_exam_intent",
        payload: JSON.stringify({
          collaboration_id: collab.id,
          talent_id: talentProfile.id,
          requirement_id: reqId,
        }),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
