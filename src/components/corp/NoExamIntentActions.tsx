"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NoExamIntentActions({ collabId }: { collabId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function handleAccept() {
    setLoading("accept");
    try {
      const res = await fetch(`/api/collaborations/${collabId}/accept`, { method: "POST" });
      if (res.ok) router.push(`/corp/projects/${collabId}/chat`);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await fetch(`/api/collaborations/${collabId}/reject`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleAccept}
        disabled={!!loading}
        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading === "accept" ? "处理中…" : "✓ 接受"}
      </button>
      <button
        onClick={handleReject}
        disabled={!!loading}
        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
      >
        {loading === "reject" ? "处理中…" : "拒绝"}
      </button>
    </div>
  );
}
