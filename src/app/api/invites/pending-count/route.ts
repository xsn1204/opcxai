import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ count: 0, invites: 0, projects: 0 });

    const talentProfile = await prisma.talentProfile.findUnique({
      where: { user_id: session.sub },
      select: { id: true },
    });
    if (!talentProfile) return NextResponse.json({ count: 0, invites: 0, projects: 0 });

    const [invites, projects, intentResponses, corpPendingInvites, rejectedIntents, assessmentRejected] = await Promise.all([
      prisma.collaboration.count({
        where: {
          talent_id: talentProfile.id,
          status: "invited",
          is_read: false,
          type: { in: ["collaboration", "assessment"] },
        },
      }),
      prisma.collaboration.count({
        where: {
          talent_id: talentProfile.id,
          unread_for_talent: true,
          status: { in: ["accepted", "active", "completed"] },
        },
      }),
      // no-exam intents that corp accepted but talent hasn't seen yet
      prisma.collaboration.count({
        where: {
          talent_id: talentProfile.id,
          type: "no_exam_intent",
          status: "accepted",
          is_read: false,
        },
      }),
      // Corp-invited no_exam_intent that talent hasn't responded to yet
      prisma.collaboration.count({
        where: {
          talent_id: talentProfile.id,
          type: "no_exam_intent",
          status: "invited",
          invitation_message: null,
          is_read: false,
        },
      }),
      // Corp-rejected talent's confirmed intent that talent hasn't seen yet
      prisma.collaboration.count({
        where: {
          talent_id: talentProfile.id,
          type: "no_exam_intent",
          status: "rejected",
          unread_for_talent: true,
        },
      }),
      // Corp dismissed talent after assessment — assessment collab set to rejected+unread
      prisma.collaboration.count({
        where: {
          talent_id: talentProfile.id,
          type: "assessment",
          status: "rejected",
          is_read: false,
        },
      }),
    ]);

    return NextResponse.json({ count: invites + intentResponses + corpPendingInvites + rejectedIntents + assessmentRejected, invites: invites + intentResponses + corpPendingInvites + rejectedIntents + assessmentRejected, projects });
  } catch {
    return NextResponse.json({ count: 0, invites: 0, projects: 0 });
  }
}
