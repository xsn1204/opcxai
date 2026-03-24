import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CAPABILITY_MODULES } from "@/types";
import { safeJsonParse } from "@/lib/json-utils";
import { getSession } from "@/lib/auth";
import { DismissButton } from "@/components/corp/DismissButton";
import { AnswerPager } from "@/components/corp/AnswerPager";
import { parseEnterpriseBio } from "@/types";

export const dynamic = "force-dynamic";

// 维度名称中英映射
const DIM_LABEL_MAP: Record<string, string> = {
  // 结果交付式
  keyword_match:      "关键词匹配",
  logic_consistency:  "逻辑一致性",
  compliance_check:   "规范性检查",
  completeness:       "完整度评估",
  // 长效陪跑式
  business_expertise: "业务专业度",
  goal_decomposition: "目标拆解度",
  method_feasibility: "方法可行性",
  value_overflow:     "价值溢出值",
};

// 各模式固定维度顺序
const DELIVERY_DIM_KEYS = ["keyword_match", "logic_consistency", "compliance_check", "completeness"];
const INTERACTIVE_DIM_KEYS = ["business_expertise", "goal_decomposition", "method_feasibility", "value_overflow"];

export default async function SubmissionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      talent_profile: { select: { username: true, specialty: true, capability_modules: true, tool_stack: true, bio: true, id: true } },
      requirement: {
        select: {
          title: true,
          corp_id: true,
          question_types: true,
          corp_profile: { select: { user_id: true } }
        }
      },
      collaboration: { select: { id: true, status: true } },
    },
  });

  if (!sub) notFound();

  // 验证资源所有权
  if (sub.requirement?.corp_profile?.user_id !== session.sub) {
    redirect("/corp/requirements");
  }

  const questionTypes = safeJsonParse<string[]>(sub.requirement?.question_types, []);
  const isInteractiveMode = questionTypes.includes("interactive") || questionTypes.includes("roleplay") || questionTypes.includes("stress_test");

  const modeLabel = isInteractiveMode ? "长效陪跑式" : "结果交付式";
  const modeBg = isInteractiveMode
    ? "bg-violet-50 text-violet-600 border-violet-100"
    : "bg-sky-50 text-sky-600 border-sky-100";

  const questions = await prisma.examQuestion.findMany({
    where: { requirement_id: sub.requirement_id },
    orderBy: { seq: "asc" },
    select: { id: true, seq: true, title: true },
  });

  const scoreBreakdown = safeJsonParse<Record<string, number>>(sub.ai_score_breakdown, {});
  const aiDiagnosis = safeJsonParse<{ strengths?: string[]; suggestions?: string[] }>(sub.ai_diagnosis, {});
  const capMods = safeJsonParse<string[]>(sub.talent_profile?.capability_modules, []);
  const toolStack = safeJsonParse<string[]>(sub.talent_profile?.tool_stack, []);
  const enterpriseBio = parseEnterpriseBio(sub.talent_profile?.bio ?? "");
  const isEnterprise = !!enterpriseBio;
  const talentId = sub.talent_profile?.id;

  const submissionAnswers = safeJsonParse<Record<string, unknown>>(sub.answers, {});
  const questionFilesMap = (submissionAnswers.question_files ?? {}) as Record<string, { name: string; url: string }[]>;

  const totalScore = sub.ai_total_score ?? 0;
  const recommendation = totalScore >= 85 ? "强烈推荐" : totalScore >= 70 ? "推荐" : totalScore >= 55 ? "可考虑" : "暂不推荐";
  const recColor = totalScore >= 85 ? "text-emerald-600 bg-emerald-100" : totalScore >= 70 ? "text-indigo-600 bg-indigo-100" : totalScore >= 55 ? "text-orange-600 bg-orange-100" : "text-red-600 bg-red-100";
  const collabStatus = sub.collaboration?.status ?? null;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/corp/requirements" className="hover:text-slate-600">需求管理</Link>
        <span>›</span>
        <Link href={`/corp/requirements/${sub.requirement_id}/submissions`} className="hover:text-slate-600">{sub.requirement?.title}</Link>
        <span>›</span>
        <span className="text-slate-600">AI 评估报告</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl px-8 py-6 mb-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white text-xl font-black ${isEnterprise ? "bg-gradient-to-tr from-amber-500 to-orange-400" : "bg-slate-900"}`}>
            {sub.talent_profile?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              {sub.talent_profile?.username}
              {sub.ai_total_score !== null && (
                <span className={`ml-3 text-[10px] px-3 py-1 rounded-full uppercase tracking-tighter font-bold ${recColor}`}>{recommendation}</span>
              )}
            </h1>
            {talentId && (
              <Link
                href={`/corp/talent/${talentId}`}
                className="inline-block mt-2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
              >
                查看主页 →
              </Link>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">AI 综合加权分</p>
          {sub.ai_total_score !== null ? (
            <p className="text-4xl font-black text-indigo-600 font-mono tracking-tighter">
              {Number(sub.ai_total_score).toFixed(1)}<span className="text-lg text-slate-300">/100</span>
            </p>
          ) : (
            <p className="text-slate-400 text-sm">评分中...</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          

          {aiDiagnosis && (aiDiagnosis.strengths?.length || aiDiagnosis.suggestions?.length) ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4">AI 综合诊断</h2>
              {aiDiagnosis.strengths?.length ? (
                <div className="mb-4">
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">核心优势</p>
                  <ul className="space-y-2">
                    {aiDiagnosis.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-emerald-500 mt-0.5">✓</span>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {aiDiagnosis.suggestions?.length ? (
                <div>
                  <p className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-2">表现不足</p>
                  <ul className="space-y-2">
                    {aiDiagnosis.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-orange-400 mt-0.5">→</span>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {Object.keys(scoreBreakdown).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-1">AI 评分维度</h2>
              <p className="text-xs text-slate-500 mb-5">{isInteractiveMode ? "长效陪跑式 · 各维度权重均等 25%" : "结果交付式 · 各维度权重均等 25%"}</p>
              <div className="space-y-4">
                {(isInteractiveMode ? INTERACTIVE_DIM_KEYS : DELIVERY_DIM_KEYS).map((dimId) => {
                  const score = scoreBreakdown[dimId] ?? 0;
                  const pct = Math.round(score);
                  return (
                    <div key={dimId}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm  text-slate-600">{DIM_LABEL_MAP[dimId] ?? dimId}</span>
                        <span className="text-sm font-bold font-mono" style={{ color: pct >= 80 ? "#10b981" : pct >= 60 ? "#ffd641" : "#f51f0b" }}>{pct}/100</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 80 ? "#10b981" : pct >= 60 ? "#6366f1" : "#f59e0b" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-5">
              {isInteractiveMode ? "候选人答题内容" : "候选人作答内容"}
            </h2>
            <AnswerPager
              questions={questions}
              submissionAnswers={submissionAnswers}
              questionFilesMap={questionFilesMap}
              isInteractiveMode={isInteractiveMode}
            />
          </div>
        </div>

        <div className="col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">操作</h3>
            <div className="space-y-3">
              {collabStatus === "rejected" ? (
                <button disabled className="w-full py-3 bg-red-50 text-red-400 text-sm font-bold rounded-xl cursor-not-allowed border border-red-100">
                  ✗ OPC 已拒绝邀请
                </button>
              ) : collabStatus === "accepted" || collabStatus === "active" || collabStatus === "completed" ? (
                <button disabled className="w-full py-3 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl cursor-not-allowed border border-emerald-100">
                  ✓ OPC 已接受邀请
                </button>
              ) : collabStatus === "invited" ? (
                <button disabled className="w-full py-3 bg-slate-100 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed">
                  ✉️ 邀请已发送，等待回应
                </button>
              ) : sub.status === "dismissed" ? (
                <button
                  disabled
                  className="w-full py-3 bg-slate-100 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed"
                >
                  已标记不考虑
                </button>
              ) : sub.status === "evaluated" ? (
                <Link
                  href={`/corp/invite/${sub.id}`}
                  className="block w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl text-center hover:bg-indigo-700 transition-colors"
                >
                  ✉️ 邀请合作
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-slate-100 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed"
                >
                  评分完成后可邀请
                </button>
              )}
              {!collabStatus && sub.status !== "dismissed" && (
                <DismissButton submissionId={sub.id} />
              )}
              <Link href={`/corp/requirements/${sub.requirement_id}/submissions`} className="block w-full py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl text-center hover:bg-slate-200 transition-colors">
                查看其他候选人
              </Link>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}
