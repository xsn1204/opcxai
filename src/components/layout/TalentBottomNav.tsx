"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const tabs = [
  { href: "/talent/dashboard",  label: "首页",     icon: "⚡" },
  { href: "/talent/challenges", label: "任务大厅", icon: "🎯" },
  { href: "/talent/invites",    label: "邀请",     icon: "📬", dot: "invite" },
  { href: "/talent/projects",   label: "项目",     icon: "🗂️", dot: "project" },
  { href: "/talent/profile",    label: "我的",     icon: "⚙️" },
];

export function TalentBottomNav() {
  const pathname = usePathname();
  const [inviteDot, setInviteDot] = useState(false);
  const [projectDot, setProjectDot] = useState(false);

  useEffect(() => {
    function fetchCounts() {
      fetch("/api/invites/pending-count")
        .then((r) => r.json())
        .then((data: { invites: number; projects: number }) => {
          setInviteDot((data.invites ?? 0) > 0);
          setProjectDot((data.projects ?? 0) > 0);
        })
        .catch(() => {});
    }
    function handleInvitesUpdate(e: Event) {
      const count = (e as CustomEvent<{ count: number }>).detail?.count;
      if (typeof count === "number") setInviteDot(count > 0);
    }
    fetchCounts();
    window.addEventListener("invites-updated", fetchCounts);
    window.addEventListener("invites-count-update", handleInvitesUpdate);
    return () => {
      window.removeEventListener("invites-updated", fetchCounts);
      window.removeEventListener("invites-count-update", handleInvitesUpdate);
    };
  }, [pathname]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
      style={{
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        const hasDot =
          (tab.dot === "invite" && inviteDot) ||
          (tab.dot === "project" && projectDot);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative",
              isActive ? "text-indigo-400" : "text-slate-500"
            )}
          >
            <span className="text-lg leading-none relative">
              {tab.icon}
              {hasDot && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </span>
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-400 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
