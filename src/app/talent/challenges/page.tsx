import { prisma } from "@/lib/db";
import { ChallengesClient } from "@/components/talent/ChallengesClient";

export const dynamic = "force-dynamic";

export default async function TalentChallengesPage() {
  const requirements = await prisma.requirement.findMany({
    where: { status: "active" },
    include: {
      corp_profile: { select: { company_name: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const serialized = requirements.map((req) => ({
    id: req.id,
    title: req.title,
    intent_desc: req.intent_desc,
    question_types: req.question_types,
    budget_min: req.budget_min,
    budget_max: req.budget_max,
    deadline: req.deadline?.toISOString() ?? null,
    req_modules: req.req_modules,
    corp_profile: req.corp_profile ?? null,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">任务大厅</h1>
        <p className="text-slate-500 text-sm mt-2">
          来自真实企业的 AI 业务挑战，完成考核建立可信胜任力档案
        </p>
      </div>

      <ChallengesClient requirements={serialized} />
    </div>
  );
}
