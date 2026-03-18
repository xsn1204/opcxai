"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

interface InviteClientProps {
  submissionId: string;
  talentName: string;
  requirementTitle: string;
}

export function InviteClient({ submissionId, talentName, requirementTitle }: InviteClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("请填写邀请留言");
      return;
    }

    const filter = checkSensitive(message);
    if (!filter.ok) {
      setError(formatHitMessage(filter.hits));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/collaborations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId, invitation_message: message }),
      });

      if (!res.ok) throw new Error("发送失败");
      track("invite_sent", { submission_id: submissionId });
      router.push("/corp/requirements");
    } catch {
      setError("发送失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSendInvite} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm max-w-2xl">
      <div className="mb-6">
        <p className="text-xs text-slate-500 mb-1">邀请对象</p>
        <p className="text-xl font-bold text-slate-800">{talentName}</p>
        <p className="text-sm text-slate-400 mt-0.5">参与项目：{requirementTitle}</p>
      </div>

      <Textarea
        label="邀请留言"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="例如：你的方案非常契合我们的需求，希望邀请你正式加入这个项目..."
        className="h-36"
        required
      />

      <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
        <strong>📌 协作说明：</strong>邀请发出后，人才可以在「协作邀请」页面看到你的邀请，并选择接受或拒绝。接受后双方将开启项目协作留言板。
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          ✉️ 发送协作邀请
        </Button>
      </div>
    </form>
  );
}
