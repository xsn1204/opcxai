"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RequirementRow {
  id: string;
  title: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  draft: { label: "草稿", style: "text-slate-400 bg-slate-100" },
  active: { label: "进行中", style: "text-emerald-600 bg-emerald-50" },
  closed: { label: "已关闭", style: "text-slate-400 bg-slate-100" },
  completed: { label: "已完成", style: "text-indigo-600 bg-indigo-50" },
};

export function TalentInviteButton({
  talentId,
  talentName,
  isEnterprise,
}: {
  talentId: string;
  talentName: string;
  isEnterprise: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [quota, setQuota] = useState(3);
  const [monthlyQuota, setMonthlyQuota] = useState(3);
  const [referralBonus, setReferralBonus] = useState(0);
  const [referralUrl, setReferralUrl] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    fetch("/api/corp/invite/check")
      .then((r) => r.json())
      .then((d) => {
        setQuota(d.quota ?? 3);
        setMonthlyQuota(d.monthlyQuota ?? 3);
        setReferralBonus(d.referralBonus ?? 0);
        setReferralUrl(d.referralUrl ?? "");
      })
      .catch(() => {});
    fetch("/api/corp/requirements")
      .then((r) => r.json())
      .then((d) => setRequirements(Array.isArray(d) ? d : (d.requirements ?? [])))
      .catch(() => {});
  }, [open]);

  async function handleInvite(reqId: string) {
    if (sentReqs.has(reqId) || sending) return;
    setSending(reqId);
    try {
      const res = await fetch("/api/assessments/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talent_id: talentId, requirement_id: reqId }),
      });
      const data = await res.json();
      if (data.alreadyInvited || res.ok) {
        setSentReqs((prev) => new Set([...prev, reqId]));
        if (res.ok && !data.alreadyInvited) setQuota((q) => q - 1);
      } else if (res.status === 403 && data.error === "quotaExhausted") {
        setQuota(0);
      }
    } finally {
      setSending(null);
    }
  }

  const exhausted = quota <= 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
          isEnterprise
            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-100"
            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
        }`}
      >
        邀请考核
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-800 text-base">邀请参与考核</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  选择需求，邀请 <span className="text-indigo-600 font-bold">{talentName}</span> 完成拟真考核
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  exhausted
                    ? "bg-red-50 text-red-500 border border-red-200"
                    : quota <= 1
                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}>
                  剩余次数：{quota}
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
              </div>
            </div>

            {exhausted ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto text-3xl">🔒</div>
                <div>
                  <p className="font-bold text-slate-800 text-base">本月邀约次数已用完</p>
                  <p className="text-sm text-slate-500 mt-1">邀请好友注册 OPC，每成功邀请 1 人立得 {monthlyQuota} 次机会</p>
                </div>
                {referralUrl && (
                  <a
                    href={referralUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    分享邀请链接，获取机会
                  </a>
                )}
                <button onClick={() => setOpen(false)} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold hover:bg-slate-200 transition-colors">
                  暂时关闭
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 max-h-72 overflow-y-auto space-y-2">
                  {requirements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <p className="text-2xl mb-2">📋</p>
                      <p className="text-sm mb-3 text-slate-500">暂无已发布的需求</p>
                      <Link href="/corp/new" className="text-xs text-indigo-600 font-bold hover:text-indigo-700" onClick={() => setOpen(false)}>
                        去创建需求 →
                      </Link>
                    </div>
                  ) : (
                    requirements.map((req) => {
                      const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.draft;
                      const isSent = sentReqs.has(req.id);
                      const isLoading = sending === req.id;
                      return (
                        <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/60 transition-all">
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                            <p className="text-sm font-semibold text-slate-700 line-clamp-1">{req.title}</p>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.style}`}>{sc.label}</span>
                          </div>
                          <button
                            onClick={() => handleInvite(req.id)}
                            disabled={isSent || !!sending}
                            className={isSent
                              ? "shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 cursor-default"
                              : "shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            }
                          >
                            {isSent ? "✓ 已邀请" : isLoading ? "发送中…" : "邀请"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                  <Link
                    href={`/corp/new?talent=${talentId}`}
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    ＋ 为 TA 新建专属需求
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
