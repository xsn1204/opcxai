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

  const [requirements, assessmentInvitations, existingSubmissions] = corpProfile
    ? await Promise.all([
        prisma.requirement.findMany({
          where: { corp_id: corpProfile.id, status: { in: ["draft", "active"] } },
          select: { id: true, title: true, status: true, question_types: true },
          orderBy: { created_at: "desc" },
        }),
        // All assessment/no_exam_intent collabs regardless of status — any prior contact blocks re-invite
        prisma.collaboration.findMany({
          where: { corp_id: corpProfile.id, type: { in: ["assessment", "no_exam_intent"] } },
          select: { talent_id: true, requirement_id: true, invitation_message: true },
        }),
        // Talents who already submitted for the corp's requirements (self-initiated or post-invite)
        prisma.submission.findMany({
          where: { requirement: { corp_id: corpProfile.id } },
          select: { talent_id: true, requirement_id: true },
        }),
      ])
    : [[], [], []];

  type CollabRow = { talent_id: string; requirement_id: string; invitation_message: string | null };
  const collabs = assessmentInvitations as CollabRow[];

  // Corp-initiated invites (invitation_message: null) → "✓ 已邀请"
  const corpInvitedPairs = collabs
    .filter((c) => c.invitation_message === null)
    .map((c) => `${c.talent_id}:${c.requirement_id}`);

  // Talent-initiated intents (invitation_message: not null) → "✓ OPC 已发意向"
  const talentIntentPairs = collabs
    .filter((c) => c.invitation_message !== null)
    .map((c) => `${c.talent_id}:${c.requirement_id}`);

  const submittedPairs = new Set(
    (existingSubmissions as { talent_id: string; requirement_id: string }[])
      .map((s) => `${s.talent_id}:${s.requirement_id}`)
  );

  const moduleLabels = Object.fromEntries(
    CAPABILITY_MODULES.map((m) => [m.id, { label: m.label, icon: m.icon }])
  );

  return (
    <MarketClient
      talents={talents}
      requirements={requirements}
      moduleLabels={moduleLabels}
      invitedPairs={corpInvitedPairs}
      talentIntentPairs={talentIntentPairs}
      submittedPairs={[...submittedPairs]}
    />
  );
}
