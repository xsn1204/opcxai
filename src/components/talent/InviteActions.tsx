"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteActions({ collabId, onRejected }: { collabId: string; onRejected?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  async function handleAccept() {
    setLoading("accept");
    try {
      const res = await fetch(`/api/collaborations/${collabId}/accept`, { method: "POST" });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent("invites-updated"));
        router.push(`/talent/projects/${collabId}/chat`);
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    try {
      await fetch(`/api/collaborations/${collabId}/reject`, { method: "POST" });
      window.dispatchEvent(new CustomEvent("invites-updated"));
      onRejected?.();
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={handleAccept}
        disabled={!!loading}
        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading === "accept" ? "处理中..." : "✓ 接受邀请"}
      </button>
      <button
        onClick={handleReject}
        disabled={!!loading}
        className="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors"
      >
        {loading === "reject" ? "处理中..." : "拒绝"}
      </button>
    </div>
  );
}
