"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const tabs = [
  { href: "/corp/market",       label: "市场",   icon: "🛍️" },
  { href: "/corp/new",          label: "发布",   icon: "＋" },
  { href: "/corp/requirements", label: "需求",   icon: "📋", dot: "requirements" },
  { href: "/corp/projects",     label: "项目",   icon: "💼", dot: "projects" },
  { href: "/corp/settings",     label: "设置",   icon: "⚙️" },
];

export function CorpBottomNav() {
  const pathname = usePathname();
  const [reqDot, setReqDot] = useState(false);
  const [projDot, setProjDot] = useState(false);

  useEffect(() => {
    function fetchCounts() {
      fetch("/api/corp/badge-counts")
        .then((r) => r.json())
        .then((data: { submissions: number; messages: number; intents: number; collabResponses: number; newProjects: number }) => {
          setReqDot((data.submissions ?? 0) > 0 || (data.intents ?? 0) > 0 || (data.collabResponses ?? 0) > 0);
          setProjDot((data.messages ?? 0) > 0 || (data.newProjects ?? 0) > 0);
        })
        .catch(() => {});
    }
    fetchCounts();
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/corp/new") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-slate-200">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const hasDot =
          (tab.dot === "requirements" && reqDot) ||
          (tab.dot === "projects" && projDot);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative",
              active ? "text-indigo-600" : "text-slate-400"
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />
            )}
            <span className="text-lg leading-none relative">
              {tab.icon}
              {hasDot && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
