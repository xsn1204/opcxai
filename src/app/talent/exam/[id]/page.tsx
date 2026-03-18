import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { ExamClientDelivery } from "@/components/talent/ExamClientDelivery";
import { ExamClientInteractive } from "@/components/talent/ExamClientInteractive";

function parseField(text: string, field: string): string {
  const regex = new RegExp(`【${field}】([^【]*)`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [req, questions, talentProfile] = await Promise.all([
    prisma.requirement.findFirst({ where: { id, status: "active" } }),
    prisma.examQuestion.findMany({ where: { requirement_id: id }, orderBy: { seq: "asc" } }),
    prisma.talentProfile.findUnique({ where: { user_id: session.sub }, select: { id: true } }),
  ]);

  if (!req) notFound();

  const existing = talentProfile
    ? await prisma.submission.findFirst({
        where: { requirement_id: id, talent_id: talentProfile.id },
        select: { id: true },
      })
    : null;

  if (existing) redirect(`/talent/submitted/${existing.id}`);

  const questionTypes: string[] = JSON.parse(req.question_types || "[]");
  const isInteractive =
    questionTypes.includes("interactive") || questionTypes.includes("roleplay") || questionTypes.includes("stress_test");

  const aiPersonaId = parseField(req.intent_desc, "AI角色").trim() || "expert_advisor";
  const positionName = parseField(req.intent_desc, "项目");
  const coreTasks = parseField(req.intent_desc, "核心任务");

  if (isInteractive) {
    return (
      <ExamClientInteractive
        requirementId={id}
        questions={questions}
        missionBrief={req.intent_desc}
        aiPersonaId={aiPersonaId}
        positionName={positionName}
        coreTasks={coreTasks}
      />
    );
  }

  return (
    <ExamClientDelivery
      requirementId={id}
      questions={questions}
      missionBrief={req.intent_desc}
      positionName={positionName}
      coreTasks={coreTasks}
    />
  );
}
