import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { ProjectChat } from "@/components/talent/ProjectChat";

export default async function CorpProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    include: {
      requirement: { select: { title: true, intent_desc: true, deadline: true, budget_min: true, budget_max: true } },
      talent_profile: { select: { username: true, contact_info: true } },
      corp_profile: { select: { user_id: true } },
    },
  });
  if (!collab) notFound();

  // 验证资源所有权
  if (collab.corp_profile?.user_id !== session.sub) {
    redirect("/corp/projects");
  }
  const messages = await prisma.message.findMany({
    where: { collaboration_id: id },
    orderBy: { sent_at: "asc" },
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ProjectChat
      collaborationId={id}
      initialMessages={messages.map((m) => ({ ...m, sent_at: m.sent_at.toISOString() }))}
      currentUserId={session.sub}
      currentUserRole="corp"
      requirement={collab.requirement ? { title: collab.requirement.title, intent_desc: collab.requirement.intent_desc, deadline: collab.requirement.deadline?.toISOString() ?? null, budget_min: collab.requirement.budget_min, budget_max: collab.requirement.budget_max } : null}
      partnerName={collab.talent_profile?.username ?? "超级个体"}
      talentContactInfo={collab.talent_profile?.contact_info || undefined}
      theme="light"
      collabStatus={collab.status}
      corpConfirmed={collab.corp_confirmed_complete}
      talentConfirmed={collab.talent_confirmed_complete}
      corpStarRating={collab.corp_star_rating ?? null}
      />
    </div>
  );
}
