import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { CAPABILITY_MODULES } from "@/types";
import { NoExamIntentActions } from "@/components/corp/NoExamIntentActions";
import { MarkSubmissionsRead } from "@/components/corp/MarkSubmissionsRead";

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "面议";
  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}w` : `¥${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)} — ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `${fmt(max!)} 以内`;
}

function getExamMode(qt: string): string {
  try {
    const types: string[] = JSON.parse(qt || "[]");
    if (types.includes("interactive") || types.includes("roleplay") || types.includes("stress_test")) return "长效陪跑式";
    if (types.includes("prompt") || types.includes("solution")) return "结果交付式";
  } catch { /* ignore */ }
  return "—";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const [req, submissions, questions, assessmentInvites, noExamIntents, collabInvites] = await Promise.all([
    prisma.requirement.findUnique({
      where: { id },
      select: {
        title: true,
        status: true,
        intent_desc: true,
        budget_min: true,
        budget_max: true,
        deadline: true,
        question_types: true,
        req_modules: true,
        ai_tags: true,
        created_at: true,
        corp_profile: { select: { user_id: true } },
      },
    }),
    prisma.submission.findMany({
      where: { requirement_id: id },
      include: {
        talent_profile: { select: { username: true, specialty: true, avg_score: true } },
      },
      orderBy: { ai_total_score: "desc" },
    }),
    prisma.examQuestion.findMany({
      where: { requirement_id: id },
      orderBy: { seq: "asc" },
    }),
    prisma.collaboration.findMany({
      where: { requirement_id: id, type: "assessment" },
      select: { talent_id: true },
    }),
    prisma.collaboration.findMany({
      where: { requirement_id: id, type: "no_exam_intent" },
      include: {
        talent_profile: { select: { username: true, specialty: true, avg_score: true, collab_count: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.collaboration.findMany({
      where: { requirement_id: id, type: "collaboration" },
      select: { submission_id: true, status: true },
    }),
  ]);

  if (!req) notFound();
  if (req.corp_profile?.user_id !== session.sub) redirect("/corp/requirements");

  const assessmentInvitedTalentIds = new Set(assessmentInvites.map((c) => c.talent_id));
  // Map submission_id -> collaboration status for type="collaboration"
  const collabStatusBySubmission = new Map(
    collabInvites.filter((c) => c.submission_id).map((c) => [c.submission_id!, c.status])
  );
  const isNoExam = (() => {
    try { return (JSON.parse(req.question_types || "[]") as string[]).includes("no_exam"); }
    catch { return false; }
  })();

  // Maps
  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft:     { label: "草稿",  bg: "bg-slate-100",   text: "text-slate-500" },
    active:    { label: "进行中", bg: "bg-emerald-100", text: "text-emerald-700" },
    closed:    { label: "已关闭", bg: "bg-slate-100",   text: "text-slate-400" },
    completed: { label: "已完成", bg: "bg-indigo-100",  text: "text-indigo-600" },
  };
  const subStatusMap: Record<string, { label: string; dot: string; text: string }> = {
    pending:   { label: "评分中", dot: "bg-orange-400", text: "text-orange-500" },
    evaluated: { label: "已评分", dot: "bg-indigo-500", text: "text-indigo-600" },
    invited:   { label: "已邀请", dot: "bg-emerald-500", text: "text-emerald-600" },
    rejected:  { label: "已淘汰", dot: "bg-slate-300",  text: "text-slate-400" },
    // collab-level statuses (OPC response)
    collab_accepted:  { label: "已接受", dot: "bg-emerald-500", text: "text-emerald-600" },
    collab_rejected:  { label: "已拒绝", dot: "bg-red-400",     text: "text-red-500" },
    collab_active:    { label: "协作中",    dot: "bg-indigo-500",  text: "text-indigo-600" },
    collab_completed: { label: "已完成",    dot: "bg-slate-400",   text: "text-slate-500" },
  };

  const reqStatus = statusConfig[req.status] ?? statusConfig.draft;
  const descSections = parseIntentDesc(req.intent_desc);
  const budget = formatBudget(req.budget_min, req.budget_max);
  const examMode = getExamMode(req.question_types);
  const reqModuleIds: string[] = JSON.parse(req.req_modules || "[]");
  const moduleLabels = Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, { label: m.label, icon: m.icon }]));

  // Key-value display sections (exclude 项目, 核心任务, 考核模式 — shown separately)
  const configSections = descSections.filter(
    (s) => !["项目", "核心任务", "考核模式", "交付物清单", "里程碑节点", "协作模式"].includes(s.key)
  );
  const coreTask = descSections.find((s) => s.key === "核心任务")?.value ?? req.intent_desc;

  // Fixed fields to always show per exam mode (empty value shown as "—")
  const find = (key: string) => descSections.find((s) => s.key === key)?.value || "—";
  const examModeFixedFields: Array<{ label: string; value: string; color: string }> =
    examMode === "结果交付式"
      ? [
          { label: "背景信息", value: find("背景信息"), color: "text-slate-600" },
        ]
      : examMode === "长效陪跑式"
      ? [
          { label: "业务现状/痛点", value: find("业务现状/痛点"), color: "text-slate-600" },
          { label: "业务目标",     value: find("业务目标"),     color: "text-slate-600" },
          { label: "考查要点",     value: find("考查要点"),     color: "text-slate-600" },
        ]
      : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <MarkSubmissionsRead requirementId={id} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/corp/requirements" className="hover:text-slate-600 transition-colors">需求管理</Link>
        <span>›</span>
        <span className="text-slate-600 font-medium">{req.title}</span>
      </div>

      {/* ── Title bar ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800">{req.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", reqStatus.bg, reqStatus.text)}>
            {reqStatus.label}
          </span>
          <span className="text-xs text-slate-400">{formatDate(req.created_at.toISOString())} 发布</span>
          {!isNoExam && (
            <>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{submissions.length} 份方案</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{questions.length} 道题目</span>
            </>
          )}
          {isNoExam && (
            <>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">{noExamIntents.length} 份意向</span>
            </>
          )}
        </div>
      </div>

     <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8 flex flex-col divide-y divide-slate-100">


  {/* ① 需求行 - 允许垂直伸展 */}
  <div className="flex bg-white">
    {/* 侧边标题：使用 flex items-stretch 保证背景色填满整行高度 */}
    <div className="w-24 bg-slate-50/50 flex-shrink-0 border-r border-slate-100 flex items-center justify-center p-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] lg:[writing-mode:horizontal-tb]">需求</p>
    </div>
    
    <div className="flex-1 p-4 min-h-0">
      <div className="flex flex-col gap-3 h-full">
        <div className="min-h-0 flex flex-col">
          <p className="text-[10px] text-slate-400 mb-1 shrink-0">核心任务</p>
          <div className="text-[12px] text-slate-700 leading-normal whitespace-pre-line max-h-32 overflow-y-auto pr-1">
            {coreTask}
          </div>
        </div>
        {reqModuleIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reqModuleIds.map((id) => {
              const m = moduleLabels[id];
              return m ? (
                <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100 whitespace-nowrap">
                  {m.label}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  </div>

  {/* ② 考核行 */}
  {!isNoExam && (
  <div className="flex group">
    <div className="w-24 bg-slate-50/50 p-4 flex-shrink-0 border-r border-slate-100 flex items-center justify-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] lg:[writing-mode:horizontal-tb]">考核</p>
    </div>
    <div className="flex-1 p-4 lg:p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-4">
        {[
          { label: "协作模式", value: find("协作模式"), color: "text-slate-600 font-bold" },
          { label: "考核模式", value: examMode, color: "text-indigo-600 font-bold" },
          { label: "费用范围", value: budget, color: "text-emerald-600 font-bold" },
          ...(req.deadline ? [{ label: "交付截至", value: formatDate(req.deadline.toISOString()), color: "text-slate-600" }] : []),
          { label: "发布时间", value: formatDate(req.created_at.toISOString()), color: "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="min-w-0">
            <p className="text-[10px] text-slate-400 mb-1 truncate">{label}</p>
            <p className={`text-[12px] truncate ${color}`}>{value}</p>
          </div>
        ))}
        {examModeFixedFields.map(({ label, value, color }) => (
          <div key={label} className="min-w-0 col-span-2 md:col-span-4 lg:col-span-5">
            <p className="text-[10px] text-slate-400 mb-1">{label}</p>
            <p className={`text-[12px] leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto pr-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
  )}

  {/* ② 无考核模式 - 仅显示预算等基础信息 */}
  {isNoExam && (
  <div className="flex group">
    <div className="w-24 bg-slate-50/50 p-4 flex-shrink-0 border-r border-slate-100 flex items-center justify-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] lg:[writing-mode:horizontal-tb]">合作</p>
    </div>
    <div className="flex-1 p-4 lg:p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-4">
        {[
            { label: "协作模式", value: find("协作模式"), color: "text-slate-600 font-bold" },
          { label: "合作模式", value: "无前置考核", color: "text-indigo-600 font-bold" },

          { label: "费用范围", value: budget, color: "text-emerald-600 font-bold" },
          ...(req.deadline ? [{ label: "交付截至", value: formatDate(req.deadline.toISOString()), color: "text-slate-600" }] : []),
          { label: "发布时间", value: formatDate(req.created_at.toISOString()), color: "text-slate-400" },
          ...configSections.map((s) => ({ label: s.key, value: s.value, color: "text-slate-600" })),
        ].map(({ label, value, color }) => (
          <div key={label} className="min-w-0">
            <p className="text-[10px] text-slate-400 mb-1 truncate">{label}</p>
            <p className={`text-[12px] truncate ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
  )}

  {/* ③ 考题行 - 有考核模式时显示 */}
 {!isNoExam && (
 <div className="flex bg-white group">
  {/* 左侧标题：自适应内容高度 */}
  <div className="w-24 bg-slate-50/50 flex-shrink-0 border-r border-slate-100 flex items-center justify-center p-3">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest [writing-mode:vertical-lr] lg:[writing-mode:horizontal-tb]">
      考题
    </p>
  </div>

  {/* 内容区：垂直排列 */}
  <div className="flex-1 p-4 lg:p-5 flex flex-col md:flex-row gap-6">
    <div className="flex-1">
      {questions.length === 0 ? (
        <p className="text-[12px] text-slate-400 italic font-light tracking-wide">暂无题目内容</p>
      ) : (
        /* 使用 space-y 确保每道题占一行，且有垂直间距 */
        <div className="flex flex-col space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-3 group/item">
              {/* 编号：固定宽度，保持对齐 */}
              <span className="mt-0.5 text-[10px] font-mono font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                #{q.seq}
              </span>
              
              {/* 题目内容：移除 truncate，允许自然换行 */}
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[12px] text-slate-700 font-medium leading-relaxed">
                    {q.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    权重 {q.weight}%
                  </span>
                </div>
                {/* 如果有描述也可以在这里显示，同样不截断 */}
                {q.description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    {q.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    
    {/* 按钮部分：垂直置顶或居中，视需求而定 */}

  </div>
</div>
)}

</div>

      {/* ── Submissions list ── */}
      {!isNoExam && (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">候选人方案</h2>
            <p className="text-xs text-slate-400 mt-0.5">按 AI 综合分排列</p>
          </div>
          {submissions.length > 0 && (
            <span className="text-xs text-slate-400">{submissions.length} 份方案</span>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">⏳</p>
            <p className="text-slate-500 text-sm mb-1">还没有收到方案</p>
            <p className="text-slate-400 text-xs">需求发布后，人才将看到此挑战并参与考核</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submissions.map((sub, index) => {
              const collabStatus = collabStatusBySubmission.get(sub.id);
              const statusKey = collabStatus === "accepted" ? "collab_accepted"
                : collabStatus === "rejected" ? "collab_rejected"
                : collabStatus === "active" ? "collab_active"
                : collabStatus === "completed" ? "collab_completed"
                : sub.status;
              const ss = subStatusMap[statusKey] ?? { label: sub.status, dot: "bg-slate-300", text: "text-slate-400" };
              const rankColors = [
                "bg-amber-400 text-white",
                "bg-slate-300 text-white",
                "bg-amber-700 text-white",
              ];
              const rankColor = rankColors[index] ?? "bg-slate-100 text-slate-500";
              return (
                <div key={sub.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                  {/* Rank */}
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0", rankColor)}>
                    {index + 1}
                  </div>

                  {/* Talent info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">
                        {sub.talent_profile?.username ?? "匿名用户"}
                      </span>
                      {assessmentInvitedTalentIds.has(sub.talent_id) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                          受邀
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatRelativeTime(sub.submitted_at.toISOString())} 提交
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-center w-20 shrink-0">
                    {sub.ai_total_score != null ? (
                      <>
                        <p className="text-xl font-black text-indigo-600 font-mono leading-none">
                          {Number(sub.ai_total_score).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">AI 综合分</p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">评分中…</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full", ss.dot)} />
                    <span className={cn("text-xs font-semibold", ss.text)}>{ss.label}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/corp/submissions/${sub.id}`}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      查看报告
                    </Link>
                    {sub.status === "evaluated" && (
                      <Link
                        href={`/corp/invite/${sub.id}`}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        发起邀请
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
      {/* ── No-exam intent list ── */}
      {isNoExam && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">合作意向</h2>
              <p className="text-xs text-slate-400 mt-0.5">人才主动发起的无考核合作意向</p>
            </div>
            {noExamIntents.length > 0 && (
              <span className="text-xs text-slate-400">{noExamIntents.length} 份意向</span>
            )}
          </div>

          {noExamIntents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-3xl mb-3">🤝</p>
              <p className="text-slate-500 text-sm mb-1">还没有收到合作意向</p>
              <p className="text-slate-400 text-xs">人才浏览此需求后可直接发起意向</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {noExamIntents.map((intent) => {
                const intentStatusMap: Record<string, { label: string; dot: string; text: string }> = {
                  invited:   { label: "待回应", dot: "bg-amber-400",   text: "text-amber-600" },
                  accepted:  { label: "已接受", dot: "bg-emerald-500", text: "text-emerald-600" },
                  rejected:  { label: "已拒绝", dot: "bg-slate-300",   text: "text-slate-400" },
                  active:    { label: "进行中", dot: "bg-indigo-500",  text: "text-indigo-600" },
                  completed: { label: "已完成", dot: "bg-slate-400",   text: "text-slate-500" },
                };
                const ss = intentStatusMap[intent.status] ?? { label: intent.status, dot: "bg-slate-300", text: "text-slate-400" };
                return (
                  <div key={intent.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-sm">
                          {intent.talent_profile?.username ?? "匿名用户"}
                        </span>
                        {intent.talent_profile?.specialty && (
                          <span className="text-xs text-slate-400">{intent.talent_profile.specialty}</span>
                        )}
                        {(intent.talent_profile?.collab_count ?? 0) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-indigo-100">
                            {intent.talent_profile!.collab_count} 次协作
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatRelativeTime(intent.created_at.toISOString())} 发起意向
                      </p>
                    </div>

                    {!isNoExam && intent.talent_profile?.avg_score != null && Number(intent.talent_profile.avg_score) > 0 && (
                      <div className="text-center w-20 shrink-0">
                        <p className="text-xl font-black text-indigo-600 font-mono leading-none">
                          {Number(intent.talent_profile.avg_score).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">平均评分</p>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 w-16 shrink-0">
                      <div className={cn("w-1.5 h-1.5 rounded-full", ss.dot)} />
                      <span className={cn("text-xs font-semibold", ss.text)}>{ss.label}</span>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {intent.status === "invited" && (
                        <NoExamIntentActions collabId={intent.id} />
                      )}
                      {(intent.status === "accepted" || intent.status === "active" || intent.status === "completed") && (
                        <Link
                          href={`/corp/projects/${intent.id}/chat`}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          进入协作 →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
