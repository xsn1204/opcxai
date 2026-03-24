"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IntentButton({ reqId, corpInvited }: { reqId: string; corpInvited?: boolean }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const router = useRouter();

  async function handleIntent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/talent/intent/${reqId}`, { method: "POST" });
      if (res.ok) {
        setSent(true);
        setTimeout(() => router.push("/talent/invites?tab=collaboration"), 1200);
      } else if (res.status === 400) {
        setClosed(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (closed) {
    return (
      <div className="w-full py-3 bg-white/10 text-white/40 rounded-xl font-bold text-sm text-center cursor-not-allowed">
        此合作机会已关闭
      </div>
    );
  }

  if (sent) {
    return (
      <div className="w-full py-3 bg-white/20 text-white/60 rounded-xl font-bold text-sm text-center">
        ✓ 合作意向已发送，跳转中…
      </div>
    );
  }

  return (
    <button
      onClick={handleIntent}
      disabled={loading}
      className="block w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm text-center hover:bg-indigo-50 transition-colors disabled:opacity-50"
    >
      {loading ? "发送中..." : corpInvited ? "📩 企业邀请合作，确认发送意向" : "🤝 意向合作"}
    </button>
  );
}
