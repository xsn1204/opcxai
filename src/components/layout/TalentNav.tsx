"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/talent/dashboard", label: "首页", icon: "⚡" },
  { href: "/talent/challenges", label: "任务大厅", icon: "🎯" },
  { href: "/talent/invites", label: "邀请中心", icon: "📬" },
  { href: "/talent/projects", label: "我的项目", icon: "🗂️" },
  { href: "/talent/profile", label: "账户设置", icon: "⚙️" },
];

export function TalentNav({ username, isStudent }: { username?: string; isStudent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function getDot(href: string) {
    if (href === "/talent/invites" && inviteDot)
      return <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full" />;
    if (href === "/talent/projects" && projectDot)
      return <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full" />;
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 px-8 py-4 flex justify-between items-center"
      style={{ background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-8">
        <Link href="/talent/dashboard" className="text-xl font-bold italic tracking-tighter text-indigo-400">OPC x AI</Link>
        <div className="hidden md:flex gap-6 text-sm text-slate-400">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn("hover:text-white transition-colors relative", pathname === item.href && "text-white")}>
              {item.label}
              {getDot(item.href)}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isStudent && (
          <span className="text-xs text-emerald-400 font-medium px-2 leading-tight">
            学生身份已激活
          </span>
        )}
        <Link
          href="/register"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-300 border border-amber-500/40 hover:border-amber-400/80 hover:bg-amber-500/10 hover:text-amber-200 transition-all"
          title="作为企业入驻，寻找OPC服务"
        >
          <span>作为企业入驻，寻找OPC服务</span>
          <span className="px-1 py-0.5 text-[10px] font-bold bg-amber-500/25 text-amber-400 rounded leading-none tracking-wide">
            限时免费
          </span>
        </Link>
        <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">退出</button>
        <Link
          href="/talent/profile"
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-slate-700 hover:border-indigo-500 flex items-center justify-center text-xs font-bold text-white transition-colors"
          title="个人资料"
        >
          {username?.[0]?.toUpperCase() ?? "U"}
        </Link>
      </div>
    </nav>
  );
}
