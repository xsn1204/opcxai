import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RequirementsList } from "@/components/corp/RequirementsList";
import { CAPABILITY_MODULES } from "@/types";

export const dynamic = "force-dynamic";

export default async function CorpRequirementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const corpProfile = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });

  const requirements = await prisma.requirement.findMany({
    where: { corp_id: corpProfile?.id },
    include: {
      submissions: { select: { status: true, read_by_corp: true } },
      collaborations: {
        where: { type: "no_exam_intent", status: "invited", invitation_message: { not: null } },
        select: { id: true },
      },
      _count: {
        select: {
          collaborations: {
            where: {
              type: { in: ["collaboration", "no_exam_intent"] },
              unread_for_corp: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const statusConfig = {
    draft: { label: "草稿", bg: "bg-slate-100", text: "text-slate-500" },
    active: { label: "进行中", bg: "bg-emerald-100", text: "text-emerald-600" },
    closed: { label: "已关闭", bg: "bg-slate-100", text: "text-slate-400" },
    completed: { label: "已完成", bg: "bg-indigo-100", text: "text-indigo-600" },
  };

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap gap-3 justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">需求管理</h1>
          <p className="text-slate-400 text-sm mt-1">管理你发布的所有考核需求</p>
        </div>
        <Link href="/corp/new" className="px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
          + 发布新需求
        </Link>
      </header>

      <RequirementsList
        requirements={requirements.map((r) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          intent_desc: r.intent_desc,
          deadline: r.deadline?.toISOString() ?? null,
          created_at: r.created_at.toISOString(),
          req_modules: r.req_modules,
          submission_count: r.submissions.length,
          pending_count: r.submissions.filter((s) => !s.read_by_corp && ["pending", "evaluated"].includes(s.status)).length,
          intent_count: r.collaborations.length,
          unread_collab_count: r._count.collaborations,
        }))}
        statusConfig={statusConfig}
        moduleLabels={Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, { label: m.label, icon: m.icon }]))}
      />
    </div>
  );
}

