"use client";

import { useState } from "react";

export function IntentButton({ reqId }: { reqId: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleIntent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/talent/intent/${reqId}`, { method: "POST" });
      if (res.ok) setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full py-3 bg-white/20 text-white/60 rounded-xl font-bold text-sm text-center">
        ✓ 合作意向已发送
      </div>
    );
  }

  return (
    <button
      onClick={handleIntent}
      disabled={loading}
      className="block w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm text-center hover:bg-indigo-50 transition-colors disabled:opacity-50"
    >
      {loading ? "发送中..." : "🤝 意向合作"}
    </button>
  );
}
