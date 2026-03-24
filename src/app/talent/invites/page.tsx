import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InvitesClient } from "@/components/talent/InvitesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TalentInvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await getSession();

  const talentProfile = await prisma.talentProfile.findUnique({
    where: { user_id: session!.sub },
    select: { id: true },
  });

  const collaborations = await prisma.collaboration.findMany({
    where: { talent_id: talentProfile?.id },
    include: {
      requirement: { select: { id: true, title: true } },
      corp_profile: { select: { company_name: true, company_desc: true, website_url: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const collabInvites = collaborations.filter(
    (c) => c.type === "collaboration" || c.type === "no_exam_intent"
  );
  const assessmentInvites = collaborations.filter((c) => c.type === "assessment");

  // Find dismissed submissions so old data (dismissed before the auto-reject code) also shows correctly
  if (assessmentInvites.length > 0) {
    const dismissedReqIds = new Set(
      (await prisma.submission.findMany({
        where: {
          talent_id: talentProfile!.id,
          requirement_id: { in: assessmentInvites.map((c) => c.requirement_id).filter(Boolean) as string[] },
          status: "dismissed",
        },
        select: { requirement_id: true },
      })).map((s) => s.requirement_id)
    );

    // Fix stale collab records that weren't updated when dismissed (one-time migration on page load)
    const staleIds = assessmentInvites
      .filter((c) => c.status !== "rejected" && c.requirement_id && dismissedReqIds.has(c.requirement_id))
      .map((c) => c.id);
    if (staleIds.length > 0) {
      await prisma.collaboration.updateMany({
        where: { id: { in: staleIds } },
        data: { status: "rejected", is_read: false },
      });
      // Reflect the fix in memory so this render is also correct
      for (const c of assessmentInvites) {
        if (staleIds.includes(c.id)) {
          c.status = "rejected";
          c.is_read = false;
        }
      }
    }
  }

  return (
    <InvitesClient
      defaultTab={tab === "collaboration" ? "collaboration" : undefined}
      collabInvites={collabInvites.map((c) => ({
        id: c.id,
        type: c.type,
        status: c.status,
        created_at: c.created_at.toISOString(),
        invitation_message: c.invitation_message,
        requirement: c.requirement,
        corp_profile: c.corp_profile,
        is_read: c.is_read,
        unread_for_talent: c.unread_for_talent,
      }))}
      assessmentInvites={assessmentInvites.map((c) => ({
        id: c.id,
        type: c.type,
        status: c.status,
        created_at: c.created_at.toISOString(),
        invitation_message: c.invitation_message,
        requirement: c.requirement,
        corp_profile: c.corp_profile,
        is_read: c.is_read,
        unread_for_talent: c.unread_for_talent,
      }))}
    />
  );
}
