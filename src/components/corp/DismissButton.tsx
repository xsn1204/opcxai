"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DismissButton({ submissionId }: { submissionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDismiss() {
    setLoading(true);
    await fetch(`/api/submissions/${submissionId}/dismiss`, { method: "POST" });
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {loading ? "处理中..." : "确认不考虑"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-2.5 text-sm text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          取消
        </button>
      </div>
    );
  }

  return (
   <button
onClick={() => setConfirming(true)}
className="w-full py-2.5 bg-red-50 text-red-500 text-sm font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
>
不考虑
</button>
  );
}
