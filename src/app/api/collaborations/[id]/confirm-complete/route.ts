import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    include: {
      corp_profile: { select: { user_id: true } },
      talent_profile: { select: { user_id: true, id: true } },
    },
  });
  if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collab.status !== "active" && collab.status !== "accepted") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const isCorp = collab.corp_profile.user_id === session.sub;
  const isTalent = collab.talent_profile.user_id === session.sub;
  if (!isCorp && !isTalent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const corpConfirmed = isCorp ? true : collab.corp_confirmed_complete;
  const talentConfirmed = isTalent ? true : collab.talent_confirmed_complete;
  const bothConfirmed = corpConfirmed && talentConfirmed;

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.collaboration.update({
      where: { id },
      data: {
        ...(isCorp && { corp_confirmed_complete: true, unread_for_talent: true }),
        ...(isTalent && { talent_confirmed_complete: true, unread_for_corp: true }),
        ...(bothConfirmed && { status: "completed" }),
      },
    });
    if (bothConfirmed) {
      await tx.talentProfile.update({
        where: { id: collab.talent_profile.id },
        data: { collab_count: { increment: 1 } },
      });
    }
    return c;
  });

  return NextResponse.json({
    status: updated.status,
    corp_confirmed_complete: updated.corp_confirmed_complete,
    talent_confirmed_complete: updated.talent_confirmed_complete,
  });
}
