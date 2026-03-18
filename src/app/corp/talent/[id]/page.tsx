import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CAPABILITY_MODULES, parseEnterpriseBio, ENTERPRISE_INFRA, ENTERPRISE_BUSINESS_TAGS, ENTERPRISE_SPECIALTIES } from "@/types";
import { safeJsonParse } from "@/lib/json-utils";
import { TalentInviteButton } from "@/components/corp/TalentInviteButton";

export const dynamic = "force-dynamic";

const capModLabels = Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, { label: m.label, icon: m.icon }]));
const infraLabels = Object.fromEntries(ENTERPRISE_INFRA.map((i) => [i.id, { label: i.label, icon: i.icon }]));
const bizTagLabels = Object.fromEntries(ENTERPRISE_BUSINESS_TAGS.map((t) => [t.value, t.label]));
const specialtyLabels = Object.fromEntries(ENTERPRISE_SPECIALTIES.map((s) => [s.value, { label: s.label, icon: s.icon }]));
const teamSizeMap: Record<string, string> = {
  solo: "独立操盘（仅我自己）",
  "2-5": "2–5 人",
  "6-20": "6–20 人",
  "21-100": "21–100 人",
};

export default async function TalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const talent = await prisma.talentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      portfolio_cases: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!talent) notFound();

  const enterpriseBio = parseEnterpriseBio(talent.bio);
  const isEnterprise = !!enterpriseBio;
  const capMods = safeJsonParse<string[]>(talent.capability_modules, []);
  const toolStack = safeJsonParse<string[]>(talent.tool_stack, []);
  const displayName = isEnterprise ? (enterpriseBio.enterprise_name || talent.username) : talent.username;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/corp/market" className="hover:text-slate-600">OPC市场</Link>
        <span>›</span>
        <span className="text-slate-600">{displayName}</span>
      </div>

      {/* 主信息卡 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 mb-6 shadow-sm">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-3xl font-black"
              style={{
                background: isEnterprise
                  ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
                  : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              }}
            >
              {displayName[0]?.toUpperCase()}
            </div>
            {(talent.avg_score > 0 || talent.collab_count > 0) && (
              <div className="flex flex-col items-center gap-1">
                {talent.avg_score > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-amber-500 font-black text-sm">★ {talent.avg_score.toFixed(1)}</span>
                    <span className="text-slate-400 text-xs">评分</span>
                  </div>
                )}
                {talent.collab_count > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-indigo-600 font-black text-sm">{talent.collab_count}</span>
                    <span className="text-slate-400 text-xs">次合作</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-800">{displayName}</h1>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                isEnterprise
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-indigo-50 text-indigo-600 border-indigo-100"
              }`}>
                {isEnterprise ? "机构OPC" : "个人OPC"}
              </span>
              {isEnterprise && (
                <span className="text-xs text-slate-500">
                  👥 {teamSizeMap[enterpriseBio.team_size ?? ""] ?? enterpriseBio.team_size ?? "专业交付机构"}
                </span>
              )}
              <div className="ml-auto">
                <TalentInviteButton talentId={talent.id} talentName={displayName} isEnterprise={isEnterprise} />
              </div>
            </div>

            {/* 副标题：opc_intro（企业）/ specialty（个人） */}
            {isEnterprise
              ? enterpriseBio.opc_intro && <p className="text-slate-700 font-medium mb-3">{enterpriseBio.opc_intro}</p>
              : talent.specialty && <p className="text-slate-700 font-medium mb-3">{talent.specialty}</p>
            }

            {/* 业务简介 */}
            {isEnterprise
              ? (enterpriseBio.opc_bio || enterpriseBio.past_cases) && (
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">
                    {enterpriseBio.opc_bio || enterpriseBio.past_cases}
                  </p>
                )
              : talent.bio && (
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">{talent.bio}</p>
                )
            }

            {/* OPC介绍（评分下方） */}
            {isEnterprise ? (
              <>
                {(enterpriseBio.specialties ?? []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">能力模块</p>
                    <div className="flex flex-wrap gap-2">
                      {(enterpriseBio.specialties ?? []).map((id) => {
                        const s = specialtyLabels[id];
                        return (
                          <span key={id} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                            {s ? `${s.icon} ${s.label}` : id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(enterpriseBio.infra ?? []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">基础设施</p>
                    <div className="flex flex-wrap gap-2">
                      {(enterpriseBio.infra ?? []).map((id) => {
                        const info = infraLabels[id];
                        return (
                          <span key={id} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
                            {info ? `${info.icon} ${info.label}` : id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(enterpriseBio.business_tags ?? []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">支持服务</p>
                    <div className="flex flex-wrap gap-2">
                      {(enterpriseBio.business_tags ?? []).map((id) => (
                        <span key={id} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">
                          {bizTagLabels[id] ?? id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {capMods.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">能力模块</p>
                    <div className="flex flex-wrap gap-2">
                      {capMods.map((id) => {
                        const m = capModLabels[id];
                        return (
                          <span key={id} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                            {m ? `${m.icon} ${m.label}` : id}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {toolStack.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">工具栈</p>
                    <div className="flex flex-wrap gap-2">
                      {toolStack.map((tool) => (
                        <span key={tool} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">{tool}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 过往合作案例 */}
      {talent.portfolio_cases.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6">过往合作案例</h2>
          <div className="space-y-5">
            {talent.portfolio_cases.map((c) => {
              const imgs = safeJsonParse<{ url: string; name: string }[]>(c.images, []);
              const fls = safeJsonParse<{ url: string; name: string }[]>(c.files, []);
              return (
                <div key={c.id} className="border border-slate-100 rounded-2xl p-5 bg-slate-50">
                  <p className="font-semibold text-slate-800 mb-1">{c.title}</p>
                  {c.description && (
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">{c.description}</p>
                  )}
                  {imgs.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {imgs.map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-24 h-24 object-cover rounded-xl border border-slate-200 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {fls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fls.map((f, i) => (
                        <a
                          key={i}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        >
                          <span>📎</span>
                          <span className="max-w-[140px] truncate">{f.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">💼</div>
          <p className="text-slate-400">该 OPC 暂无过往案例展示</p>
        </div>
      )}
    </div>
  );
}
