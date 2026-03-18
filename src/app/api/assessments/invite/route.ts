import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCorpQuota, decrementQuota } from "@/lib/invite-quota";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const corpProfile = await prisma.corpProfile.findUnique({
      where: { user_id: session.sub },
    });
    if (!corpProfile) return NextResponse.json({ error: "Corp profile not found" }, { status: 404 });

    const { talent_id, requirement_id, message } = await request.json();

    // Check if already invited this talent to this requirement
    const existing = await prisma.collaboration.findFirst({
      where: { type: "assessment", talent_id, requirement_id, corp_id: corpProfile.id },
    });
    if (existing) return NextResponse.json({ alreadyInvited: true, id: existing.id });

    // ── Quota gate ──────────────────────────────────────────────────────
    const { quota } = await getCorpQuota(corpProfile.id);
    if (quota <= 0) {
      return NextResponse.json(
        { error: "quotaExhausted", message: "本月邀约次数已用完，邀请好友注册可获得额外机会" },
        { status: 403 }
      );
    }

    // Decrement quota and create invitation atomically
    const collab = await prisma.$transaction(async (tx) => {
      await decrementQuota(corpProfile.id, tx);
      return tx.collaboration.create({
        data: {
          type: "assessment",
          talent_id,
          requirement_id,
          corp_id: corpProfile.id,
          status: "invited",
          invitation_message: message ?? null,
        },
      });
    });

    // Notify talent (outside transaction — non-critical)
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { id: talent_id },
      select: { user_id: true },
    });
    if (talentProfile) {
      await prisma.notification.create({
        data: {
          user_id: talentProfile.user_id,
          type: "assessment_invitation",
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
    return NextResponse.json({ error: "Failed to create assessment invitation" }, { status: 500 });
  }
}
