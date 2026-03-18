import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TalentProjectsPage() {
  const session = await getSession();

  const talentProfile = await prisma.talentProfile.findUnique({
    where: { user_id: session!.sub },
    select: { id: true },
  });

  const collaborations = await prisma.collaboration.findMany({
    where: {
      talent_id: talentProfile?.id,
      type: { in: ["collaboration", "no_exam_intent"] },
      status: { in: ["accepted", "active", "completed"] },
    },
    include: {
      requirement: { select: { title: true, intent_desc: true } },
      corp_profile: { select: { company_name: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const statusMap: Record<string, { label: string; variant: string }> = {
    accepted: { label: "待开始", variant: "text-sky-400 bg-sky-400/10" },
    active: { label: "进行中", variant: "text-indigo-400 bg-indigo-400/10" },
    completed: { label: "已完成", variant: "text-emerald-400 bg-emerald-400/10" },
  };

  return (
    <div className="w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">我的项目</h1>
        <p className="text-slate-500 text-sm mt-2">正在进行和已完成的协作项目</p>
      </div>

      {!collaborations.length ? (
        <div className="text-center py-16 border border-slate-800 rounded-2xl">
          <p className="text-4xl mb-4">🗂️</p>
          <p className="text-lg text-slate-500 mb-2">暂无项目</p>
          <p className="text-sm text-slate-600 mb-6">接受企业邀请后，项目将显示在这里</p>
          <Link href="/talent/invites" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
            查看邀请
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {collaborations.map((c) => {
            const status = statusMap[c.status] ?? { label: c.status, variant: "text-slate-400 bg-slate-400/10" };

            // Extract core task from intent_desc
            const coreTask = c.requirement?.intent_desc
              ? c.requirement.intent_desc.match(/【核心任务】([^\n【]+)/)?.[1]?.trim() ||
                c.requirement.intent_desc.replace(/【[^】]+】/g, "").trim().slice(0, 120)
              : "";

            return (
              <div
                key={c.id}
                className="bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 transition-colors"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
                        {c.corp_profile?.company_name?.[0] ?? "C"}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-300">{c.corp_profile?.company_name}</span>
                        <span className="ml-2 text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase tracking-wide">
                          协作项目
                        </span>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                      {c.requirement?.title}
                      {c.unread_for_talent && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">{formatRelativeTime(c.created_at.toISOString())}</p>
                  </div>
                  <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium shrink-0", status.variant)}>
                    {status.label}
                  </span>
                </div>

                {/* Corp rating */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                  <p className="text-xs text-slate-500 shrink-0">企业评分</p>
                  {c.corp_star_rating ? (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < c.corp_star_rating! ? "text-amber-400" : "text-slate-700"}>★</span>
                      ))}
                    </div>
                  ) : c.status === "completed" ? (
                    <span className="text-xs text-slate-600">待企业评分</span>
                  ) : (
                    <span className="text-xs text-slate-600">待合作完成</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-700/50">
                  <span className="text-xs text-slate-500">
                    {c.status === "active" && "协作进行中"}
                    {c.status === "accepted" && "等待开始"}
                    {c.status === "completed" && "项目已完成"}
                  </span>
                  <Link
                    href={`/talent/projects/${c.id}/chat`}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    {c.status === "completed" ? "查看项目记录" : "进入项目协作"} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
