import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CAPABILITY_MODULES,
  ENTERPRISE_INFRA,
  ENTERPRISE_BUSINESS_TAGS,
  TOOL_STACK,
  parseEnterpriseBio,
} from "@/types";
import { safeJsonParse } from "@/lib/json-utils";

export const dynamic = "force-dynamic";

export default async function PublicTalentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const talent = await prisma.talentProfile.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      specialty: true,
      bio: true,
      capability_modules: true,
      tool_stack: true,
      avg_score: true,
      collab_count: true,
      portfolio_cases: {
        orderBy: { created_at: "desc" },
        take: 3,
        select: { id: true, title: true, description: true, images: true },
      },
    },
  });

  if (!talent) notFound();

  const enterpriseBio = parseEnterpriseBio(talent.bio);
  const isEnterprise = !!enterpriseBio;

  const moduleLabels = Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, `${m.icon} ${m.label}`]));
  const toolLabels = Object.fromEntries(TOOL_STACK.map((t) => [t.id, t.label]));
  const toolStack = safeJsonParse<string[]>(talent.tool_stack, []);
  const infraLabels = Object.fromEntries(ENTERPRISE_INFRA.map((i) => [i.id, `${i.icon} ${i.label}`]));
  const bizTagLabels = Object.fromEntries(ENTERPRISE_BUSINESS_TAGS.map((t) => [t.value, t.label]));

  const capMods = safeJsonParse<string[]>(talent.capability_modules, []);

  const displayName = isEnterprise ? (enterpriseBio.enterprise_name || talent.username) : talent.username;
  const teamSizeMap: Record<string, string> = {
    solo: "独立操盘",
    "2-5": "2–5 人团队",
    "6-20": "6–20 人团队",
    "21-100": "21–100 人团队",
  };
  const teamSizeLabel = teamSizeMap[enterpriseBio?.team_size ?? ""] ?? "专业交付机构";

  const infraIds = enterpriseBio?.infra ?? [];
  const bizTagIds = enterpriseBio?.business_tags ?? [];

  const score = talent.avg_score ?? 0;
  const starFull = Math.round(score);

  // Theme colors
  const accent = isEnterprise ? "amber" : "indigo";
  const accentBorder = isEnterprise ? "border-amber-500/30" : "border-indigo-500/30";
  const accentText = isEnterprise ? "text-amber-400" : "text-indigo-400";
  const accentBg10 = isEnterprise ? "bg-amber-500/10" : "bg-indigo-500/10";
  const accentBorder20 = isEnterprise ? "border-amber-500/20" : "border-indigo-500/20";
  const accentShadow = isEnterprise ? "shadow-amber-900/40" : "shadow-indigo-900/40";
  const ctaBg = isEnterprise ? "bg-amber-500 hover:bg-amber-400" : "bg-indigo-600 hover:bg-indigo-500";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* 顶部品牌 */}
        <div className="flex items-center mb-8">
          <span className="text-white font-black text-lg tracking-tight italic">OPC</span>
          <span className={`${accentText} font-black text-lg italic -ml-0.5`}>x AI</span>
          <span className="ml-4 text-[10px] text-slate-500 border border-slate-700 rounded-full px-2 py-0.5 font-normal">
            {isEnterprise ? "机构 OPC 认证" : "个人 OPC 认证"}
          </span>
        </div>

        {/* 主卡片 */}
        <div
          className={`rounded-3xl p-8 border ${isEnterprise ? "border-amber-500/20" : "border-slate-700"}`}
          style={{
            background: isEnterprise
              ? "linear-gradient(145deg, #1c1a14 0%, #0f0d08 100%)"
              : "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          }}
        >
          {/* 身份 */}
          <div className="mb-6">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-4 ${
                isEnterprise
                  ? "bg-gradient-to-tr from-amber-500 to-orange-400"
                  : "bg-gradient-to-tr from-indigo-500 to-purple-500"
              }`}
            >
              {displayName[0]?.toUpperCase()}
            </div>
            <h1 className="text-white text-2xl font-bold leading-tight">{displayName}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isEnterprise ? teamSizeLabel : (talent.specialty || "")}
            </p>
          </div>

          {/* 数据指标 */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-slate-800/60 rounded-2xl px-4 py-3 text-center">
              <p className="text-amber-400 text-xl font-bold leading-none">
                {score > 0 ? score.toFixed(1) : "—"}
              </p>
              <p className="text-slate-500 text-[10px] mt-1">综合评分</p>
              {score > 0 && (
                <p className="text-amber-400/60 text-[10px] mt-0.5">
                  {"★".repeat(starFull)}{"☆".repeat(5 - starFull)}
                </p>
              )}
            </div>
            <div className="flex-1 bg-slate-800/60 rounded-2xl px-4 py-3 text-center">
              <p className={`${accentText} text-xl font-bold leading-none`}>
                {talent.collab_count}
              </p>
              <p className="text-slate-500 text-[10px] mt-1">合作次数</p>
            </div>
          </div>

          {/* OPC介绍 / 企业案例摘要 */}
          {isEnterprise ? (
            enterpriseBio.past_cases && (
              <p className={`text-slate-400 text-xs leading-relaxed mb-6 border-l-2 ${accentBorder} pl-3`}>
                {enterpriseBio.past_cases.slice(0, 100)}{enterpriseBio.past_cases.length > 100 ? "…" : ""}
              </p>
            )
          ) : (
            talent.bio && (
              <p className={`text-slate-400 text-xs leading-relaxed mb-6 border-l-2 ${accentBorder} pl-3`}>
                {talent.bio.slice(0, 100)}{talent.bio.length > 100 ? "…" : ""}
              </p>
            )
          )}

          {/* 企业：基础设施标签 */}
          {isEnterprise && infraIds.length > 0 && (
            <div className="mb-4">
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-2">基础设施</p>
              <div className="flex flex-wrap gap-1.5">
                {infraIds.map((id) => (
                  <span
                    key={id}
                    className={`px-2.5 py-1 ${accentBg10} ${accentText} border ${accentBorder20} rounded-full text-[11px]`}
                  >
                    {infraLabels[id] ?? id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 企业：支持服务（方框样式） */}
          {isEnterprise && bizTagIds.length > 0 && (
            <div className="mb-2">
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-2">支持服务</p>
              <div className={`rounded-2xl px-4 py-3 bg-amber-500/8 border border-amber-500/15`}>
                <div className="flex flex-wrap gap-1.5">
                  {bizTagIds.map((id) => (
                    <span
                      key={id}
                      className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[11px]"
                    >
                      {bizTagLabels[id] ?? id}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 个人：能力模块 */}
          {!isEnterprise && capMods.length > 0 && (
            <div className="mb-4">
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-2">能力模块</p>
              <div className="flex flex-wrap gap-1.5">
                {capMods.map((mod) => (
                  <span
                    key={mod}
                    className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[11px]"
                  >
                    {moduleLabels[mod] ?? mod}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 个人：工具栈 */}
          {!isEnterprise && toolStack.length > 0 && (
            <div>
              <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-2">工具栈</p>
              <div className="rounded-2xl px-4 py-3 bg-slate-800/40 border border-slate-700/60">
                <div className="flex flex-wrap gap-1.5">
                  {toolStack.map((tool) => (
                    <span
                      key={tool}
                      className="px-2.5 py-1 bg-slate-700/60 text-slate-400 border border-slate-600/40 rounded-md text-[11px]"
                    >
                      {toolLabels[tool] ?? tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        
      

        {/* CTA 按钮 */}
        <div className="flex gap-3 mt-6">
          <Link
            href="/register/talent"
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-2xl text-center transition-colors border border-slate-700"
          >
            立刻加入
          </Link>
          <Link
            href="/register/corp"
            className={`flex-1 py-3 ${ctaBg} text-white text-sm font-bold rounded-2xl text-center transition-colors shadow-lg ${accentShadow}`}
          >
            与TA协作
          </Link>
        </div>

        {/* 底部 */}
        <p className="text-center text-slate-600 text-xs mt-6">
          OPCXAI.COM | 来 OPC x AI，定义未来工作方式
        </p>
      </div>
    </div>
  );
}
