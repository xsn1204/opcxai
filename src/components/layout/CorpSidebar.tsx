"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/corp/market", label: "OPC能力市场", icon: "🛍️" },
  { href: "/corp/new", label: "发布新需求", icon: "＋" },
  { href: "/corp/requirements", label: "需求管理", icon: "📋" },
  { href: "/corp/projects", label: "项目协作", icon: "💼" },
  { href: "/corp/settings", label: "企业设置", icon: "⚙️" },
];

export function CorpSidebar({ companyName }: { companyName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [submissions, setSubmissions] = useState(0);
  const [messages, setMessages] = useState(0);
  const [intents, setIntents] = useState(0);
  const [collabResponses, setCollabResponses] = useState(0);
  const [newProjects, setNewProjects] = useState(0);

  useEffect(() => {
    function fetchCounts() {
      fetch("/api/corp/badge-counts")
        .then((r) => r.json())
        .then((data: { submissions: number; messages: number; intents: number; collabResponses: number; newProjects: number }) => {
          setSubmissions(data.submissions ?? 0);
          setMessages(data.messages ?? 0);
          setIntents(data.intents ?? 0);
          setCollabResponses(data.collabResponses ?? 0);
          setNewProjects(data.newProjects ?? 0);
        })
        .catch(() => {});
    }

    fetchCounts();
    // re-fetch on route change to keep counts fresh
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/corp/new") return pathname === href;
    return pathname.startsWith(href);
  }

  function getDot(href: string) {
    if (href === "/corp/requirements" && (submissions > 0 || intents > 0 || collabResponses > 0))
      return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />;
    if (href === "/corp/projects" && newProjects > 0)
      return <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white leading-none">New</span>;
    if (href === "/corp/projects" && messages > 0)
      return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />;
    return null;
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
      <div className="p-6">
        <Link href="/corp/market" className="text-2xl font-bold italic text-indigo-600">OPC x AI</Link>
        <p className="text-xs text-slate-400 mt-0.5">企业端</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn("sidebar-link", isActive(item.href) && "active")}>
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {getDot(item.href)}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <Link href="/corp/settings" className="flex items-center gap-3 p-2 mb-2 rounded-lg hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center text-indigo-600 text-xs font-bold transition-colors">
            {companyName?.[0] ?? "C"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{companyName ?? "企业账户"}</p>
            <p className="text-[10px] text-slate-400">企业账户</p>
          </div>
        </Link>
        <button onClick={handleLogout} className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors text-left px-2 py-1">
          退出登录
        </button>
      </div>
    </aside>
  );
}
