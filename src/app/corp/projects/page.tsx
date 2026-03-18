import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function CorpProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const corpProfile = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });

  const collaborations = await prisma.collaboration.findMany({
    where: {
      corp_id: corpProfile?.id,
      type: { in: ["collaboration", "no_exam_intent"] },
      status: { in: ["accepted", "active", "completed"] },
    },
    include: {
      requirement: { select: { title: true, intent_desc: true } },
      talent_profile: { select: { username: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return (
    <div className="p-8 w-7xl mx-auto">
      <header className="mb-8 ">
        <h1 className="text-2xl font-bold text-slate-800">项目协作</h1>
        <p className="text-slate-400 text-sm mt-1">正在进行和已完成的协作项目</p>
      </header>

      {!collaborations.length ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">💼</p>
          <p className="text-lg text-slate-500 mb-2">暂无进行中的项目</p>
          <p className="text-sm text-slate-400">录用OPC后，项目将出现在这里</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collaborations.map((c) => {
            return (
            <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-slate-800">{c.requirement?.title}</p>
                    {c.unread_for_corp && c.status === "accepted" && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white leading-none">New</span>
                    )}
                    {c.unread_for_corp && c.status !== "accepted" && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{c.talent_profile?.username}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 font-medium">
                    {c.status === "active" ? "进行中" : c.status === "accepted" ? "待开始" : "已完成"}
                  </span>
                  <Link href={`/corp/projects/${c.id}/chat`} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                    进入协作看板 →
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
