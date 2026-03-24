import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CAPABILITY_MODULES } from "@/types";
import { getSession } from "@/lib/auth";
import { IntentButton } from "@/components/talent/IntentButton";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const req = await prisma.requirement.findFirst({
    where: { id, status: "active" },
    include: { corp_profile: { select: { company_name: true, company_desc: true, website_url: true, contact_name: true, business_tracks: true } } },
  });
  if (!req) notFound();

  const questions = await prisma.examQuestion.findMany({
    where: { requirement_id: id },
    orderBy: { seq: "asc" },
  });

  const descSections = parseIntentDesc(req.intent_desc);
  const coreTask = descSections.find((s) => s.key === "核心任务")?.value ?? req.intent_desc;
  const reqModules: string[] = JSON.parse(req.req_modules || "[]");
  const questionTypes: string[] = JSON.parse(req.question_types || "[]");
  const isNoExam = questionTypes.includes("no_exam");
  const isInteractive = questionTypes.includes("interactive") || questionTypes.includes("roleplay") || questionTypes.includes("stress_test");
  const isDelivery = questionTypes.includes("prompt") || questionTypes.includes("solution");

  // Determine theme colors based on exam mode
  const themeColor = isNoExam ? "teal" : isInteractive ? "violet" : "amber";

  let alreadySubmitted = false;
  let alreadyIntented = false;
  let corpInvited = false;
  let intentTerminated = false; // any side has rejected — no further action possible
  if (session) {
    const talentProfile = await prisma.talentProfile.findUnique({
      where: { user_id: session.sub },
      select: { id: true },
    });
    if (talentProfile) {
      if (isNoExam) {
        // Talent has an active confirmed intent (not rejected)
        const confirmedIntent = await prisma.collaboration.findFirst({
          where: {
            requirement_id: id,
            talent_id: talentProfile.id,
            type: "no_exam_intent",
            invitation_message: { not: null },
            status: { not: "rejected" },
          },
          select: { id: true },
        });
        alreadyIntented = !!confirmedIntent;

        if (!alreadyIntented) {
          // Unconfirmed corp invite (invitation_message null, not rejected)
          const corpInvite = await prisma.collaboration.findFirst({
            where: {
              requirement_id: id,
              talent_id: talentProfile.id,
              invitation_message: null,
              type: "no_exam_intent",
              status: { not: "rejected" },
            },
            select: { id: true },
          });
          corpInvited = !!corpInvite;

          if (!corpInvited) {
            // Any rejected record means this opportunity is closed for both sides
            const rejected = await prisma.collaboration.findFirst({
              where: { requirement_id: id, talent_id: talentProfile.id, type: "no_exam_intent", status: "rejected" },
              select: { id: true },
            });
            intentTerminated = !!rejected;
          }
        }
      } else {
        const existing = await prisma.submission.findFirst({
          where: { requirement_id: id, talent_id: talentProfile.id },
          select: { id: true },
        });
        alreadySubmitted = !!existing;
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link href="/talent/challenges" className="hover:text-slate-300 transition-colors">任务大厅</Link>
        <span>›</span>
        <span className="text-slate-300">{req.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-3">{req.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>发布方：{req.corp_profile?.company_name}</span>
              {req.deadline && <span>截至：{new Date(req.deadline).toLocaleDateString("zh-CN")}</span>}
              <span className="text-[12px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {req.budget_min && req.budget_max
                  ? `¥${req.budget_min.toLocaleString()} — ¥${req.budget_max.toLocaleString()}`
                  : req.budget_min
                  ? `¥${req.budget_min.toLocaleString()}+`
                  : req.budget_max
                  ? `¥${req.budget_max.toLocaleString()} 以内`
                  : "面议"}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className={`text-sm font-bold mb-3 uppercase tracking-wider ${
              themeColor === "teal" ? "text-teal-400" : themeColor === "violet" ? "text-violet-400" : "text-amber-400"
            }`}>核心任务</h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{coreTask}</p>
          </div>

          {(() => {
            const tags: string[] = JSON.parse(req.ai_tags || "[]");
            return tags.length > 0 ? (
              <div>
                <p className="text-xs text-slate-500 mb-2">核心标签</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant={themeColor === "teal" ? "teal" : themeColor === "violet" ? "indigo" : "amber"}>
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {reqModules.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">能力模块</p>
              <div className="flex flex-wrap gap-2">
                {reqModules.map((id) => {
                  const m = CAPABILITY_MODULES.find((x) => x.id === id);
                  return m ? (
                    <span key={id} className={`text-[11px] px-2.5 py-1 rounded-lg font-medium border ${
                      themeColor === "teal"
                        ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                        : themeColor === "violet"
                        ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {m.icon} {m.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {questions.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">题目预览</h2>
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-mono pt-0.5 ${
                        themeColor === "teal" ? "text-teal-400" : themeColor === "violet" ? "text-violet-400" : "text-amber-400"
                      }`}>Q{q.seq}.</span>
                      <div>
                        <p className="text-sm font-medium text-white">{q.title}</p>
                        <p className="text-xs text-slate-400 mt-1">权重 {q.weight}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 order-first lg:order-last">
          {/* Corp profile card */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center text-base font-black text-slate-300 shrink-0">
                {req.corp_profile?.company_name?.[0] ?? "C"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-snug truncate">
                  {req.corp_profile?.company_name ?? "—"}
                </p>
                {req.corp_profile?.contact_name && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{req.corp_profile.contact_name}</p>
                )}
              </div>
            </div>

            {req.corp_profile?.company_desc && (
              <p className="text-xs text-slate-400 leading-relaxed">{req.corp_profile.company_desc}</p>
            )}

            {req.corp_profile?.website_url && (
              <a
                href={req.corp_profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 truncate max-w-full"
              >
                {req.corp_profile.website_url}
              </a>
            )}

            {(() => {
              const TRACK_LABELS: Record<string, string> = {
                ai_products: "AI产品原型与开发",
                ai_tools: "AI工作流与自动化",
                content_marketing: "AIGC全媒介创作",
                short_video: "短视频与数字人运营",
                brand_overseas: "全球化品牌与出海",
                growth: "AI驱动增长与获客",
                data_analysis: "智能决策与业务洞察",
                other: "其他",
              };
              const tracks: string[] = JSON.parse(req.corp_profile?.business_tracks || "[]");
              return tracks.length > 0 ? (
                
               /* 将 flex-wrap 改为 flex-col，并移除无用的 gap-1.5（或改为 row-gap） */
<div className="flex flex-col pt-1">
  {/* 文字部分：保留原样 */}
  <p className="text-[9px] text-slate-500 mb-1.5 uppercase tracking-wider">
    业务需求方向
  </p>

  {/* Tags 容器：另起一行，并保持水平排列和间距 */}
  <div className="flex flex-wrap gap-1.5">
    {tracks.map((t) => (
      <span
        key={t}
        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 border border-slate-600"
      >
        {TRACK_LABELS[t] ?? t}
      </span>
    ))}
  </div>
</div>
              ) : null;
            })()}
          </div>

          {(req.budget_min || req.budget_max) && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">项目预算</h3>
              <p className="text-base font-black text-emerald-400">
                {req.budget_min && req.budget_max
                  ? `¥${req.budget_min.toLocaleString()} — ¥${req.budget_max.toLocaleString()}`
                  : req.budget_min
                  ? `¥${req.budget_min.toLocaleString()}+`
                  : `¥${req.budget_max!.toLocaleString()} 以内`}
              </p>
            </div>
          )}

          <div className={`rounded-2xl p-5 ${
            themeColor === "teal" ? "bg-teal-600" : themeColor === "violet" ? "bg-violet-600" : "bg-amber-500"
          }`}>
            <h3 className="font-bold text-white mb-2">{isNoExam ? "感兴趣？" : "准备好了吗？"}</h3>
            <p className={`text-xs mb-4 leading-relaxed ${
              themeColor === "teal" ? "text-teal-100" : themeColor === "violet" ? "text-violet-100" : "text-amber-100"
            }`}>
              {isNoExam
                ? "此项目无需考核，点击发送合作意向后，企业将审核并与你建立协作关系。"
                : "进入拟真考场，与 OPC.Agent 协作完成任务，建立可信的胜任力档案。"}
            </p>
            {isNoExam ? (
              corpInvited ? (
                <IntentButton reqId={req.id} corpInvited />
              ) : alreadyIntented ? (
                <div className="w-full py-3 bg-white/20 text-white/60 rounded-xl font-bold text-sm text-center cursor-not-allowed">
                  ✓ 已发送合作意向
                </div>
              ) : intentTerminated ? (
                <div className="w-full py-3 bg-white/10 text-white/40 rounded-xl font-bold text-sm text-center cursor-not-allowed">
                  此合作机会已关闭
                </div>
              ) : (
                <IntentButton reqId={req.id} />
              )
            ) : alreadySubmitted ? (
              <div className="w-full py-3 bg-white/20 text-white/50 rounded-xl font-bold text-sm text-center cursor-not-allowed">
                ✓ 已参与
              </div>
            ) : (
              <Link href={`/talent/exam/${req.id}`}
                className={`block w-full py-3 bg-white rounded-xl font-bold text-sm text-center transition-colors ${
                  themeColor === "teal"
                    ? "text-teal-600 hover:bg-teal-50"
                    : themeColor === "violet"
                    ? "text-violet-600 hover:bg-violet-50"
                    : "text-amber-600 hover:bg-amber-50"
                }`}>
                🚀 进入拟真考场
              </Link>
            )}
          </div>

          <div className="text-center">
            <Link href="/talent/challenges" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← 返回任务大厅</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseIntentDesc(text: string): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  let current: { key: string; lines: string[] } | null = null;
  for (const line of text.split("\n")) {
    const m = line.match(/^【(.+?)】(.*)$/);
    if (m) {
      if (current) result.push({ key: current.key, value: current.lines.join("\n").trim() });
      current = { key: m[1], lines: m[2] ? [m[2]] : [] };
    } else if (current && line.trim()) {
      current.lines.push(line);
    }
  }
  if (current) result.push({ key: current.key, value: current.lines.join("\n").trim() });
  return result;
}
