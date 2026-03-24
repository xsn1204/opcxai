"use client";

import { useState } from "react";
import Link from "next/link";
import { CAPABILITY_MODULES } from "@/types";
import { cn } from "@/lib/utils";
import { ModuleTags } from "@/components/ui/module-tags";

interface Req {
  id: string;
  title: string;
  intent_desc: string;
  question_types: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  req_modules: string;
  corp_profile: { company_name: string | null } | null;
}

interface Props {
  requirements: Req[];
}

export function ChallengesClient({ requirements }: Props) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const filtered = requirements.filter((req) => {
    if (activeModule) {
      const modules: string[] = JSON.parse(req.req_modules || "[]");
      if (!modules.includes(activeModule)) return false;
    }
    if (activeMode) {
      if (getExamMode(req.question_types) !== activeMode) return false;
    }
    return true;
  });

  const modeChipClass = (mode: string) => cn(
    "px-4 py-1.5 rounded-full text-xs font-medium border transition-colors",
    activeMode === mode
      ? mode === "长效陪跑式"
        ? "border-violet-500 text-violet-400 bg-violet-500/10"
        : mode === "无前置考核"
        ? "border-teal-500 text-teal-400 bg-teal-500/10"
        : "border-amber-500 text-amber-400 bg-amber-500/10"
      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
  );

  return (
    <>
          {/* Exam mode filter */}
      <div className="flex flex-wrap gap-1 mb-3">
      
        <button onClick={() => setActiveMode(activeMode === "结果交付式" ? null : "结果交付式")} className={modeChipClass("结果交付式")}>
          结果交付式
        </button>
        <button onClick={() => setActiveMode(activeMode === "长效陪跑式" ? null : "长效陪跑式")} className={modeChipClass("长效陪跑式")}>
          长效陪跑式
        </button>
        <button onClick={() => setActiveMode(activeMode === "无前置考核" ? null : "无前置考核")} className={modeChipClass("无前置考核")}>
          无前置考核
        </button>
      </div>
      {/* Module filter */}
      <div className="flex flex-wrap gap-1 mb-6">
  
        {CAPABILITY_MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveModule(activeModule === m.id ? null : m.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activeModule === m.id
                ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                : "border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400"
            )}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((req) => {
          const examMode = getExamMode(req.question_types);
          const coreTask = extractCoreTask(req.intent_desc);
          const budget = formatBudget(req.budget_min, req.budget_max);
          const deadline = formatDeadline(req.deadline);
          const companyInitial = req.corp_profile?.company_name?.[0] ?? "C";
          const companyName = req.corp_profile?.company_name ?? "企业";
          const modules: string[] = JSON.parse(req.req_modules || "[]");

          const borderColor = "border border-slate-800";

          const arrowColor = examMode === "长效陪跑式"
            ? "bg-violet-500/15 border-violet-500/25 text-violet-400 group-hover:bg-violet-500/35 group-hover:border-violet-500/50"
            : examMode === "无前置考核"
            ? "bg-teal-500/15 border-teal-500/25 text-teal-400 group-hover:bg-teal-500/35 group-hover:border-teal-500/50"
            : "bg-amber-500/15 border-amber-500/25 text-amber-400 group-hover:bg-amber-500/35 group-hover:border-amber-500/50";

          return (
            <Link
              key={req.id}
              href={`/talent/challenges/${req.id}`}
              className={cn("group flex flex-col h-[250px] bg-slate-800/40 rounded-3xl overflow-hidden hover:bg-slate-800/70 transition-all", borderColor)}
            >
              {/* Main content */}
              <div className="flex-1 p-5 overflow-hidden flex flex-col">
                {/* Top — module chips */}
                {modules.length > 0 && (
                  <div className="mb-3">
                    <ModuleTags ids={modules} />
                  </div>
                )}

                {/* Project name — big title, 1 line max */}
                <h4 className="text-[17px] font-black text-white leading-snug mb-2.5 truncate shrink-0">
                  {req.title}
                </h4>

                {/* Core task — 3 lines max */}
                {coreTask && (
                  <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-3 flex-1">
                    {coreTask}
                  </p>
                )}

                {/* Bottom — exam mode badge */}
                {examMode && (
                  <div className="flex items-center gap-1.5 mt-3 shrink-0">
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                      examMode === "长效陪跑式"
                        ? "bg-violet-500/15 text-violet-400 border-violet-500/20"
                        : examMode === "无前置考核"
                        ? "bg-teal-500/15 text-teal-400 border-teal-500/20"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/20"
                    )}>
                      {examMode}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom info bar — one row with arrow */}
              <div className="border-t border-slate-700/60 px-5 py-3 flex items-center gap-2.5">
                {/* Company */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">
                    {companyInitial}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate max-w-[72px]">{companyName}</span>
                </div>

                {deadline !== "不限" && (
                  <>
                    <span className="text-slate-700 text-xs shrink-0">·</span>
                    <span className="text-[11px] text-slate-500 shrink-0">截至 {deadline}</span>
                  </>
                )}

                {budget !== "面议" ? (
                  <>
                    <span className="text-slate-700 text-xs shrink-0">·</span>
                    <span className="text-[11px] font-semibold text-emerald-400 shrink-0">{budget}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-700 text-xs shrink-0">·</span>
                    <span className="text-[11px] text-slate-600 shrink-0">面议</span>
                  </>
                )}

                {/* Arrow with circle — pushed to right */}
                <div className={cn("ml-auto shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all", arrowColor)}>
                  →
                </div>
              </div>
            </Link>
          );
        })}

        {!filtered.length && (
          <div className="col-span-full text-center py-20 text-slate-600">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-lg mb-1">暂无匹配挑战</p>
            <p className="text-sm">{(activeModule || activeMode) ? "尝试调整筛选条件" : "企业发布需求后将在此显示"}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCoreTask(intentDesc: string): string {
  const match = intentDesc.match(/【核心任务】([^\n【]+)/);
  if (match) return match[1].trim();
  return intentDesc.replace(/【[^】]+】/g, "").trim().slice(0, 80);
}

function getExamMode(questionTypes: string): string {
  try {
    const types: string[] = JSON.parse(questionTypes || "[]");
    if (types.includes("interactive") || types.includes("roleplay") || types.includes("stress_test")) return "长效陪跑式";
    if (types.includes("prompt") || types.includes("solution")) return "结果交付式";
    if (types.includes("no_exam")) return "无前置考核";
  } catch {
    // ignore
  }
  return "";
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "面议";
  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}w` : `¥${n.toLocaleString()}`;
  if (min && max) return `${fmt(min)} — ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `${fmt(max!)} 以内`;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "不限";
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "已截止";
  if (diff === 1) return "明天";
  if (diff <= 7) return `${diff} 天后`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " 日";
}
