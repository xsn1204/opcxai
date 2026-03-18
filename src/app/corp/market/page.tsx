import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CAPABILITY_MODULES } from "@/types";
import { MarketClient } from "@/components/corp/MarketClient";

export const dynamic = "force-dynamic";

export default async function CorpMarketPage() {
  const session = await getSession();

  const [talents, corpProfile] = await Promise.all([
    prisma.talentProfile.findMany({
      orderBy: { avg_score: "desc" },
      select: {
        id: true,
        username: true,
        bio: true,
        specialty: true,
        capability_modules: true,
        tool_stack: true,
        delivery_pref: true,
        avg_score: true,
        collab_count: true,
      },
    }),
    session
      ? prisma.corpProfile.findUnique({
          where: { user_id: session.sub },
          select: { id: true },
        })
      : null,
  ]);

  const [requirements, assessmentInvitations] = corpProfile
    ? await Promise.all([
        prisma.requirement.findMany({
          where: { corp_id: corpProfile.id, status: { in: ["draft", "active"] } },
          select: { id: true, title: true, status: true, question_types: true },
          orderBy: { created_at: "desc" },
        }),
        prisma.collaboration.findMany({
          where: { corp_id: corpProfile.id, type: { in: ["assessment", "no_exam_intent"] }, status: "invited" },
          select: { talent_id: true, requirement_id: true },
        }),
      ])
    : [[], []];

  const invitedPairs = (assessmentInvitations as { talent_id: string; requirement_id: string }[])
    .map((c) => `${c.talent_id}:${c.requirement_id}`);

  const moduleLabels = Object.fromEntries(
    CAPABILITY_MODULES.map((m) => [m.id, { label: m.label, icon: m.icon }])
  );

  return (
    <MarketClient
      talents={talents}
      requirements={requirements}
      moduleLabels={moduleLabels}
      invitedPairs={invitedPairs}
    />
  );
}
