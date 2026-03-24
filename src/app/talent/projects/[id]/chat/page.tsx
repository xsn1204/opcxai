import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProjectChat } from "@/components/talent/ProjectChat";

export default async function TalentProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    include: {
      requirement: { select: { title: true, intent_desc: true, deadline: true, budget_min: true, budget_max: true } },
      corp_profile: { select: { company_name: true, contact_info: true } },
    },
  });
  if (!collab) notFound();

  const messages = await prisma.message.findMany({
    where: { collaboration_id: id },
    orderBy: { sent_at: "asc" },
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ProjectChat
      collaborationId={id}
      initialMessages={messages.map((m) => ({ ...m, sent_at: m.sent_at.toISOString() }))}
      currentUserId={session!.sub}
      currentUserRole="talent"
      requirement={collab.requirement ? { title: collab.requirement.title, intent_desc: collab.requirement.intent_desc, deadline: collab.requirement.deadline?.toISOString() ?? null, budget_min: collab.requirement.budget_min, budget_max: collab.requirement.budget_max } : null}
      partnerName={collab.corp_profile?.company_name ?? "企业"}
      corpContactInfo={collab.corp_profile?.contact_info || undefined}
      collabStatus={collab.status}
      corpConfirmed={collab.corp_confirmed_complete}
      talentConfirmed={collab.talent_confirmed_complete}
      corpStarRating={collab.corp_star_rating ?? null}
      hideSidebarOnMobile
      />
    </div>
  );
}
