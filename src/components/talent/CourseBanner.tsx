"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

// ─── Banner item types ────────────────────────────────────────────────────────

type ImageBanner = {
  type: "image";
  url: string;
  src: string;
  alt: string;
  dot: string;
};

type CourseBanner = {
  type: "course";
  url: string;
  tag: string;
  title: string;
  desc: string;
  icon: string;
  gradient: string;
  dot: string;
  glow: string;
  ring: string;
  lessons: string;
  level: string;
};

type BannerItem = ImageBanner | CourseBanner;

// ─── Data ─────────────────────────────────────────────────────────────────────

const BANNERS: BannerItem[] = [
  {
    type: "image",
    url: "https://opc.sisdc.com.cn/",
    src: "/banner.png",
    alt: "OPC 能力提升推送",
    dot: "bg-white",
  },
  {
    type: "image",
    url: "https://maker.taptap.cn/",
    src: "/banner2.png",
    alt: "OPC 能力提升推送 2",
    dot: "bg-slate-300",
  },
  {
    type: "image",
    url: "https://hifly.cc",
    src: "/banner3.png",
    alt: "OPC 能力提升推送 3",
    dot: "bg-slate-300",
  },
  {
    type: "course",
    url: "#",
    tag: "内容创作",
    title: "AI 爆款短视频脚本生成",
    desc: "结合 TikTok 算法与 AI，批量输出高转化率短视频脚本与分镜",
    icon: "🎬",
    gradient: "from-pink-600 to-red-700",
    dot: "bg-pink-300",
    glow: "bg-pink-300/20",
    ring: "border-pink-300/25",
    lessons: "10 节课",
    level: "实战",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CourseBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (animating) return;
      setAnimating(true);
      setCurrent((prev) => (prev + dir + BANNERS.length) % BANNERS.length);
      setTimeout(() => setAnimating(false), 280);
    },
    [animating]
  );

  function jumpTo(i: number) {
    if (animating || i === current) return;
    setAnimating(true);
    setCurrent(i);
    setTimeout(() => setAnimating(false), 280);
  }

  // Auto-advance every 7 s; resets when user navigates manually
  useEffect(() => {
    const id = setInterval(() => go(1), 7000);
    return () => clearInterval(id);
  }, [go]);

  const item = BANNERS[current];

  return (
    <div className="relative rounded-3xl overflow-hidden h-full select-none">
      {/* ── Slide content (fades on change) ── */}
      <div
        className={`h-full transition-opacity duration-[280ms] ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        {item.type === "image" ? (
          // ── Image banner ──
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full relative cursor-pointer bg-white"
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
      
              className="object-cover object-center rounded-3xl"
              priority
            />
          </a>
        ) : (
          // ── Course banner ──
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full relative overflow-hidden cursor-pointer group"
          >
            {/* Gradient bg */}
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
            {/* Ambient glow */}
            <div
              className={`absolute right-6 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full ${item.glow} blur-3xl pointer-events-none`}
            />

            <div className="relative z-10 h-full flex gap-0">
              {/* Left: text (~62%) */}
              <div className="flex-1 flex flex-col justify-between px-6 py-5 min-w-0">
                {/* Label + tag + index */}
                <div className="flex items-center gap-2">
                 
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-white font-semibold">
                    {item.tag}
                  </span>
                  <span className="ml-auto font-mono text-[10px] font-bold text-white/30 tabular-nums">
                    {String(current + 1).padStart(2, "0")}&thinsp;/&thinsp;
                    {String(BANNERS.length).padStart(2, "0")}
                  </span>
                </div>

                {/* Title + desc */}
                <div>
                  <h3 className="text-[21px] font-black text-white leading-[1.2] tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-white/55 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-3">
                  <span className="text-xs px-4 py-2 bg-white text-slate-800 rounded-xl font-black shadow-md shadow-black/25 group-hover:bg-white/90 transition-colors">
                    开始学习 →
                  </span>
                </div>
              </div>

              {/* Right: visual accent (~38%) */}
              <div className="w-[38%] shrink-0 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute left-0 top-8 bottom-8 w-px bg-white/10" />
                <span className="absolute bottom-1 right-3 font-black text-[72px] leading-none text-white/[0.07] pointer-events-none select-none">
                  {String(current + 1).padStart(2, "0")}
                </span>
                <div
                  className={`relative w-20 h-20 rounded-full border-2 ${item.ring} bg-white/10 flex items-center justify-center mb-3 backdrop-blur-sm`}
                >
                  <span className="text-[36px] drop-shadow-lg">{item.icon}</span>
                </div>
                <p className="relative z-10 text-[11px] font-bold text-white/70">{item.lessons}</p>
                <p className="relative z-10 text-[10px] text-white/35 mt-0.5 font-medium">{item.level}</p>
              </div>
            </div>
          </a>
        )}
      </div>

      {/* ── Unified dot nav + arrows (always on top) ── */}
      <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between z-20 pointer-events-none">
        {/* Dots */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {BANNERS.map((b, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? `w-5 ${b.dot}` : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {/* Arrows */}
        <div className="flex gap-1 pointer-events-auto">
          <button
            onClick={() => go(-1)}
            className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center transition-colors text-base leading-none"
          >
            ‹
          </button>
          <button
            onClick={() => go(1)}
            className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center transition-colors text-base leading-none"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
