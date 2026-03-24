import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "corp") return NextResponse.json({ submissions: 0, messages: 0, intents: 0 });

    const corpProfile = await prisma.corpProfile.findUnique({
      where: { user_id: session.sub },
      select: { id: true },
    });
    if (!corpProfile) return NextResponse.json({ submissions: 0, messages: 0, intents: 0 });

    const [submissions, messages, intents, collabResponses, newProjects] = await Promise.all([
      // unread submissions (pending AI scoring or already evaluated, not yet viewed by corp)
      prisma.submission.count({
        where: {
          requirement: { corp_id: corpProfile.id },
          read_by_corp: false,
          status: { in: ["pending", "evaluated"] },
        },
      }),
      // unread chat messages (active/completed collabs only — not "accepted" which has no messages yet)
      prisma.collaboration.count({
        where: {
          corp_id: corpProfile.id,
          unread_for_corp: true,
          status: { in: ["active", "completed"] },
          type: { in: ["collaboration", "no_exam_intent"] },
        },
      }),
      // pending no-exam intents awaiting corp response (talent-confirmed only)
      prisma.collaboration.count({
        where: {
          corp_id: corpProfile.id,
          type: "no_exam_intent",
          status: "invited",
          invitation_message: { not: null },
        },
      }),
      // Talent accepted/rejected corp invites (unread by corp)
      prisma.collaboration.count({
        where: {
          corp_id: corpProfile.id,
          unread_for_corp: true,
          status: { in: ["accepted", "rejected"] },
          type: { in: ["collaboration", "no_exam_intent"] },
        },
      }),
      // newly accepted collabs (OPC accepted, corp hasn't visited yet)
      prisma.collaboration.count({
        where: {
          corp_id: corpProfile.id,
          unread_for_corp: true,
          status: "accepted",
          type: { in: ["collaboration", "no_exam_intent"] },
        },
      }),
    ]);

    return NextResponse.json({ submissions, messages, intents, collabResponses, newProjects });
  } catch {
    return NextResponse.json({ submissions: 0, messages: 0, intents: 0 });
  }
}
