"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ModuleTags } from "@/components/ui/module-tags";

type Requirement = {
  id: string;
  title: string;
  intent_desc: string;
  question_types: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: Date | string | null;
  req_modules: string;
  corp_profile?: { company_name: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCoreTask(intentDesc: string): string {
  const match = intentDesc.match(/【核心任务】([^\n【]+)/);
  if (match) return match[1].trim();
  return intentDesc.replace(/【[^】]+】/g, "").trim().slice(0, 80);
}

function getExamMode(questionTypes: string): string {
  try {
    const types: string[] = JSON.parse(questionTypes || "[]");
    if (types.includes("roleplay") || types.includes("stress_test")) return "长效陪跑式";
    if (types.includes("prompt") || types.includes("solution")) return "结果交付式";
    if (types.includes("no_exam")) return "无前置考核";
  } catch { /* ignore */ }
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

function formatDeadline(deadline: Date | string | null): string {
  if (!deadline) return "不限";
  const d = new Date(deadline);
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "已截止";
  if (diff === 1) return "明天";
  if (diff <= 7) return `${diff} 天后`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " 日";
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ChallengeCard({ req }: { req: Requirement }) {
  const examMode = getExamMode(req.question_types);
  const coreTask = extractCoreTask(req.intent_desc);
  const budget = formatBudget(req.budget_min, req.budget_max);
  const deadline = formatDeadline(req.deadline);
  const companyInitial = req.corp_profile?.company_name?.[0] ?? "C";
  const companyName = req.corp_profile?.company_name ?? "企业";
  const modules: string[] = JSON.parse(req.req_modules || "[]");

  const arrowColor = examMode === "长效陪跑式"
    ? "bg-violet-500/15 border-violet-500/25 text-violet-400 group-hover:bg-violet-500/35 group-hover:border-violet-500/50"
    : examMode === "无前置考核"
    ? "bg-teal-500/15 border-teal-500/25 text-teal-400 group-hover:bg-teal-500/35 group-hover:border-teal-500/50"
    : "bg-amber-500/15 border-amber-500/25 text-amber-400 group-hover:bg-amber-500/35 group-hover:border-amber-500/50";

  return (
    <Link
      href={`/talent/challenges/${req.id}`}
      className="group flex flex-col h-[250px] bg-slate-800/40 border border-slate-800 rounded-3xl overflow-hidden hover:bg-slate-800/70 transition-all"
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
        <div className={cn("ml-auto shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-sm transition-all", arrowColor)}>
          →
        </div>
      </div>
    </Link>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ROTATION_INTERVAL = 15000;

export function RecommendedChallenges({
  requirements,
}: {
  requirements: Requirement[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (requirements.length <= 2) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 2) % requirements.length);
      setCountdown(15);
    }, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [requirements.length]);

  useEffect(() => {
    if (requirements.length <= 2) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 15 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [requirements.length]);

  const displayed =
    requirements.length > 2
      ? [
          requirements[currentIndex % requirements.length],
          requirements[(currentIndex + 1) % requirements.length],
        ]
      : requirements;

  return (
    <>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold">推荐挑战</h2>
          <p className="text-slate-500 text-sm mt-1">根据你的能力倾向推荐的企业挑战</p>
        </div>
        <div className="flex items-center gap-4">
          {requirements.length > 2 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400">
                {countdown}
              </span>
              <span>秒后切换</span>
            </div>
          )}
          <Link
            href="/talent/challenges"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            查看全部 →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-16">
        {/* Fixed entry card */}
        <div
          className="rounded-3xl p-6 flex flex-col justify-between shadow-lg shadow-indigo-500/20 h-[250px]"
          style={{ backgroundImage: "radial-gradient(ellipse at top right, #6366f1 0%, #4338ca 60%, #3730a3 100%)" }}
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl mb-4">⚡</div>
            <h3 className="font-bold text-white text-base mb-2">进入任务大厅</h3>
            <p className="text-indigo-100 text-xs leading-relaxed">
              参与企业发布的真实业务挑战，完成考核即可被 500+ 企业检索。
            </p>
          </div>
          <Link
            href="/talent/challenges"
            className="mt-5 block w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm text-center hover:bg-indigo-50 transition-colors"
          >
            浏览任务大厅 →
          </Link>
        </div>

        {/* Rotating challenge cards */}
        {displayed.length > 0 ? (
          displayed.map((req) => (
            <ChallengeCard key={req.id} req={req} />
          ))
        ) : (
          <div className="col-span-2 text-center py-16 text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-lg mb-2">暂无活跃挑战</p>
            <p className="text-sm">企业发布的挑战将显示在这里</p>
          </div>
        )}
      </div>
    </>
  );
}
