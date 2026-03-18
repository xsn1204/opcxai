"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type HighlightCard = {
  title: string;
  corpLabel: string;
  displayTags: { label: string; icon: string }[];
  budgetLabel: string;
  starRating: number | null;
  daysLabel: string;
  executorRole: string;
  executorType: "individual" | "enterprise";
  isCompleted: boolean;
  prefillTags: string[];
};

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  const filled = Math.min(Math.max(Math.round(n), 0), 5);
  return (
    <span className="text-amber-300 text-[11px] tracking-[1px] leading-none">
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
    </span>
  );
}

// ─── Single card ──────────────────────────────────────────────────────────────
function BannerCard({ card }: { card: HighlightCard }) {
  const initial = card.executorRole[0]?.toUpperCase() ?? "O";
  const ctaHref = `/corp/new?tags=${card.prefillTags.join(",")}`;
  const isEnterprise = card.executorType === "enterprise";

  return (
    <div className={cn(
      // gap-4 = 16px × 2 gaps = 32px total → (100% - 32px) / 3
      "flex-none w-[calc((100%-32px)/3)] rounded-2xl flex flex-col relative overflow-hidden",
      "transition-all duration-200 hover:-translate-y-1",
      isEnterprise
        ? "bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 shadow-[0_6px_20px_rgba(245,158,11,0.22)]"
        : "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-[0_6px_20px_rgba(79,70,229,0.22)]"
    )}>
      {/* glass highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/25" />

      {/* ── Main body ── */}
      <div className="flex flex-col gap-3 px-5 pt-4 pb-3 flex-1">

        {/* Row 1: status + time + stars */}
        <div className="flex items-center justify-between">
          {card.isCompleted ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/90 bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              已完成
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white/90 bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse shrink-0" />
              合作中
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/50">{card.daysLabel}</span>
            {card.starRating != null && <Stars n={card.starRating} />}
          </div>
        </div>

        {/* Row 2: project title — THE HERO */}
        <div>
          <p className="text-[10px] font-medium text-white/45 uppercase tracking-wider mb-1.5">
            {card.corpLabel}
          </p>
          <h3 className="text-[17px] font-black text-white leading-[1.35] line-clamp-3">
            {card.title}
          </h3>
        </div>

        {/* Row 3: capability tags + budget */}
        <div className="flex flex-wrap gap-1.5">
          {card.displayTags.map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-white/90 bg-white/10 border border-white/10 rounded-md px-2 py-0.5"
            >
              {t.icon} {t.label}
            </span>
          ))}
          {card.budgetLabel && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-200 bg-emerald-500/20 border border-emerald-400/25 rounded-md px-2 py-0.5">
              💰 {card.budgetLabel}
            </span>
          )}
        </div>

      </div>

      {/* ── Footer: executor + CTA ── */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-white/10 bg-black/10">
        {/* avatar */}
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
          isEnterprise ? "bg-white text-orange-600" : "bg-white text-indigo-700"
        )}>
          {initial}
        </div>

        {/* role */}
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-semibold text-white leading-none truncate">
            {card.executorRole}
          </p>
          <p className="text-[9.5px] text-white/40 mt-0.5">
            {isEnterprise ? "机构 OPC" : "个人 OPC"}
          </p>
        </div>

        {/* CTA */}
        <Link
          href={ctaHref}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 text-[11px] font-bold rounded-lg px-3 py-1.5",
            "border transition-all duration-150 group",
            "bg-white/15 border-white/20 text-white hover:bg-white hover:border-white",
            isEnterprise ? "hover:text-orange-600" : "hover:text-indigo-600"
          )}
        >
          发布相似需求
          <svg
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex-none w-[calc((100%-32px)/3)] bg-slate-200/60 rounded-2xl px-5 py-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-slate-300/60 rounded-full" />
        <div className="h-3 w-20 bg-slate-300/60 rounded" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="h-2.5 w-14 bg-slate-300/60 rounded" />
        <div className="h-5 w-full bg-slate-300/60 rounded" />
        <div className="h-5 w-4/5 bg-slate-300/60 rounded" />
        <div className="h-4 w-3/5 bg-slate-300/60 rounded" />
      </div>
      <div className="flex gap-1.5 pt-1">
        <div className="h-5 w-24 bg-slate-300/60 rounded-md" />
        <div className="h-5 w-20 bg-slate-300/60 rounded-md" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-300/40">
        <div className="w-6 h-6 rounded-full bg-slate-300/60 shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-28 bg-slate-300/60 rounded" />
          <div className="h-2 w-12 bg-slate-300/60 rounded" />
        </div>
        <div className="h-6 w-24 bg-slate-300/60 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Main banner ──────────────────────────────────────────────────────────────
export function MarketBanner() {
  const [cards, setCards]     = useState<HighlightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const pausedRef  = useRef(false);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/market/highlights")
      .then((r) => r.ok ? r.json() : [])
      .then((data: HighlightCard[]) => setCards(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const VISIBLE  = 3;
  const maxIndex = Math.max(0, cards.length - VISIBLE);

  // Sync track position
  useEffect(() => {
    const track = trackRef.current;
    if (!track || cards.length === 0) return;
    const cardEl = track.children[0] as HTMLElement | undefined;
    if (!cardEl) return;
    const cardW = cardEl.getBoundingClientRect().width + 16; // gap-4 = 16px
    track.style.transform = `translateX(-${current * cardW}px)`;
  }, [current, cards.length]);

  // Auto-play
  useEffect(() => {
    if (cards.length <= VISIBLE) return;
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setCurrent((c) => (c < maxIndex ? c + 1 : 0));
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cards.length, maxIndex]);

  function goTo(idx: number) {
    const clamped = Math.max(0, Math.min(idx, maxIndex));
    setCurrent(clamped);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setCurrent((c) => (c < maxIndex ? c + 1 : 0));
    }, 4000);
  }

  if (!loading && cards.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 text-[14px] font-bold text-slate-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-100 text-[12px]">🔥</span>
          近期热门合作案例
        </div>

        {/* Right side: pagination controls + trust badge */}
        <div className="flex items-center gap-3">
          {/* Pagination controls (only when data loaded and has pages) */}
          {!loading && cards.length > VISIBLE && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="w-6 h-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-25 transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>

              <div className="flex items-center gap-1">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 border-none p-0",
                    i === current ? "w-5 bg-indigo-400" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                  )}
                />
              ))}
              </div>

              <button
                onClick={() => goTo(current + 1)}
                disabled={current === maxIndex}
                className="w-6 h-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-25 transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            官方实名认证 · 数据已脱敏
          </div>
        </div>
      </div>

      {/* Carousel wrap */}
      <div
        ref={wrapRef}
        className="bg-slate-100/70 border border-slate-200/60 rounded-3xl p-4"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-4 transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]"
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : cards.map((card, i) => <BannerCard key={i} card={card} />)
            }
          </div>
        </div>
      </div>
    </div>
  );
}
