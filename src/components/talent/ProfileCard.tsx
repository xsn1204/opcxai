"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { ShareCardModal } from "@/components/talent/ShareCardModal";
import { parseEnterpriseBio, ENTERPRISE_INFRA, ENTERPRISE_BUSINESS_TAGS, TOOL_STACK, CAPABILITY_MODULES } from "@/types";

// 单行 tag 行：只显示能完整放下的 tag，超出部分 +n
function TagRowFit({ items, className }: { items: string[]; className: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const GAP = 6; // gap-1.5 = 6px
    const PLUS_W = 28; // 预留 +n 宽度
    const containerW = container.offsetWidth;
    const spans = Array.from(container.querySelectorAll<HTMLElement>("span[data-tag]"));

    let used = 0;
    let count = 0;
    for (let i = 0; i < spans.length; i++) {
      const w = spans[i].offsetWidth;
      const isLast = i === spans.length - 1;
      const needed = used + (i > 0 ? GAP : 0) + w + (isLast ? 0 : GAP + PLUS_W);
      if (needed <= containerW) {
        used += (i > 0 ? GAP : 0) + w;
        count = i + 1;
      } else {
        break;
      }
    }
    setVisibleCount(count);
  }, [items]);

  // 首次渲染全量（用于测量），测完后只渲染可见部分
  const showAll = visibleCount === null;
  const visible = showAll ? items : items.slice(0, visibleCount);
  const extra = showAll ? 0 : items.length - (visibleCount ?? 0);

  return (
    <div ref={containerRef} className={`flex flex-nowrap gap-1.5 ${showAll ? "overflow-hidden" : "overflow-hidden"}`}>
      {(showAll ? items : visible).map((item) => (
        <span key={item} data-tag className={`shrink-0 ${className}`}>
          {item}
        </span>
      ))}
      {extra > 0 && (
        <span className="shrink-0 text-[10px] text-slate-700 self-center">+{extra}</span>
      )}
    </div>
  );
}

const toolLabels = Object.fromEntries(TOOL_STACK.map((t) => [t.id, t.label]));
const capModMap = Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, m.label]));
const MAX_TAGS = 2;

interface ProfileCardProps {
  profileId: string;
  username: string;
  specialty?: string;
  bio?: string;
  avgScore: number;
  collabCount: number;
  capMods: string[];
  moduleLabels: Record<string, string>;
  toolStack: string[];
}

export function ProfileCard({
  profileId,
  username,
  specialty,
  bio,
  avgScore,
  collabCount,
  capMods,
  moduleLabels,
  toolStack,
}: ProfileCardProps) {
  const [showShare, setShowShare] = useState(false);
  const enterpriseBio = parseEnterpriseBio(bio);
  const isEnterprise = !!enterpriseBio;

  const displayName = isEnterprise ? (enterpriseBio.enterprise_name || username) : username;
  const initial = displayName?.[0]?.toUpperCase() || "?";

  const infraLabels = Object.fromEntries(ENTERPRISE_INFRA.map((i) => [i.id, { label: i.label, icon: i.icon }]));
  const bizTagLabels = Object.fromEntries(ENTERPRISE_BUSINESS_TAGS.map((t) => [t.value, t.label]));
  const infraIds: string[] = enterpriseBio?.infra ?? [];
  const bizTagIds: string[] = enterpriseBio?.business_tags ?? [];

  const teamSizeMap: Record<string, string> = {
    solo: "独立操盘",
    "2-5": "2–5 人团队",
    "6-20": "6–20 人团队",
    "21-100": "21–100 人团队",
  };

  // Individual tags: capMods, show max 3, +n for rest
  const MAX_CAP_MODS = 3;
  const capModExtra = capMods.length - MAX_CAP_MODS;

  return (
    <>
      <div
        onClick={() => setShowShare(true)}
        className="p-5 rounded-3xl flex flex-col gap-4 h-64 transition-all cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-900/20"
        style={{
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          border: "1px solid #334155",
        }}
      >
        {/* ① 头像 + 身份 */}
        <div className="flex items-center gap-3">
          <div
            className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg ${
              isEnterprise
                ? "bg-gradient-to-tr from-amber-500 to-orange-400"
                : "bg-gradient-to-tr from-indigo-500 to-purple-500"
            }`}
          >
            {initial}
          </div>

          <a href="/talent/profile" onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1 group/name">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-semibold text-base leading-tight truncate group-hover/name:text-indigo-300 transition-colors">
                {displayName || "未设置名称"}
              </p>
          
            </div>
            <p className="text-[11px] mt-0.5 truncate">
              {isEnterprise ? (
                <span className="text-amber-400 font-semibold">
             机构 OPC · {teamSizeMap[enterpriseBio.team_size ?? ""] ?? "专业交付机构"}
</span>
) : (
<span className="text-indigo-400 font-semibold">
  个人 OPC
                </span>
              )}
            </p>
          </a>

          <span className="shrink-0 text-[10px] text-slate-600 whitespace-nowrap">生成名片 ↗</span>
        </div>

        {/* ② 数据指标 */}
        <div className="grid grid-cols-2 gap-2 ">
          <div className="gt-1 h-16 bg-slate-800/60 rounded-xl px-3 py-2.5 text-center flex flex-col items-center justify-center">
            <p className="text-amber-400 text-base font-bold leading-none">
              {avgScore > 0 ? avgScore.toFixed(1) : "—"}
            </p>
            <p className="text-slate-600 text-[9px] mt-1">综合评分</p>
            <p className="text-amber-400/50 text-[9px] mt-0.5 tracking-tight">
              {avgScore > 0
                ? "★".repeat(Math.round(avgScore)) + "☆".repeat(5 - Math.round(avgScore))
                : "☆☆☆☆☆"}
            </p>
          </div>
          <div className="h-16 bg-slate-800/60 rounded-xl px-3 py-2.5 text-center flex flex-col items-center justify-center">
            <p className="text-indigo-400 text-base font-bold leading-none">{collabCount}</p>
            <p className="text-slate-600 text-[9px] mt-1">合作次数</p>
          </div>
        </div>



{(isEnterprise ? infraIds.length > 0 : capMods.length > 0) && (
  <div className="flex flex-nowrap overflow-hidden items-center gap-1.5 pt-4 border-t border-slate-800">
    {isEnterprise ? (
      <>
        {infraIds.slice(0, MAX_TAGS).map((id) => (
          <span key={id} className="shrink-0 px-2 py-0.5 rounded-full text-[10px] text-amber-400 border border-amber-500/25 bg-amber-500/10">
            {infraLabels[id]?.label ?? id}
          </span>
        ))}
        {infraIds.length > MAX_TAGS && (
          <span className="shrink-0 text-[10px] text-slate-600 self-center">+{infraIds.length - MAX_TAGS}</span>
        )}
      </>
    ) : (
      <>
        {capMods.slice(0, MAX_TAGS).map((modId) => (
          <span key={modId} className="shrink-0 px-2 py-0.5 rounded-full text-[10px] text-indigo-400 border border-indigo-500/25 bg-indigo-500/10">
            {capModMap[modId] ?? modId}
          </span>
        ))}
        {capMods.length > MAX_TAGS && (
          <span className="shrink-0 text-[10px] text-slate-600 self-center">+{capMods.length - MAX_TAGS}</span>
        )}
      </>
    )}
  </div>
)}

        {/* ④ Tool stack / 支持服务 */}
        {(isEnterprise ? bizTagIds.length > 0 : toolStack.length > 0) && (
          isEnterprise ? (
            <TagRowFit
              items={bizTagIds.map((id) => bizTagLabels[id] ?? id)}
              className="px-2 py-0.5  rounded-md text-[10px] text-slate-500 border border-slate-700/60 bg-slate-800/40"
            />
          ) : (
            <TagRowFit
              items={toolStack.map((t) => toolLabels[t] ?? t)}
              className="px-2 py-0.5 rounded-md text-[10px] text-slate-500 border border-slate-700/60 bg-slate-800/40"
            />
          )
        )}
        
      </div>
      

      {showShare && (
        <ShareCardModal
          id={profileId}
          username={username}
          specialty={specialty}
          bio={bio}
          avgScore={avgScore}
          collabCount={collabCount}
          capMods={capMods}
          moduleLabels={moduleLabels}
          toolStack={toolStack}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
