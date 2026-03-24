"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function CorpTopBar({ companyName }: { companyName?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="md:hidden sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
      <Link href="/corp/market" className="text-xl font-bold italic text-indigo-600">
        OPC x AI
        <span className="ml-1.5 text-[10px] font-normal not-italic text-slate-400">企业端</span>
      </Link>
      <div className="flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          退出
        </button>
        <Link
          href="/corp/settings"
          className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold hover:bg-indigo-200 transition-colors"
        >
          {companyName?.[0] ?? "C"}
        </Link>
      </div>
    </header>
  );
}
