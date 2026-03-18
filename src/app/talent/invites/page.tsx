import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InvitesClient } from "@/components/talent/InvitesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TalentInvitesPage() {
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
    (c) =>
      c.type === "collaboration" ||
      (c.type === "no_exam_intent" && c.status !== "rejected")
  );
  const assessmentInvites = collaborations.filter((c) => c.type === "assessment");

  return (
    <InvitesClient
      collabInvites={collabInvites.map((c) => ({
        id: c.id,
        type: c.type,
        status: c.status,
        created_at: c.created_at.toISOString(),
        invitation_message: c.invitation_message,
        requirement: c.requirement,
        corp_profile: c.corp_profile,
        is_read: c.is_read,
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
      }))}
    />
  );
}
