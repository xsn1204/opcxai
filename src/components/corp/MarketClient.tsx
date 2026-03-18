"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { safeJsonParse } from "@/lib/json-utils";
import { CAPABILITY_MODULES, ENTERPRISE_INFRA, ENTERPRISE_TEAM_SIZES, ENTERPRISE_BUSINESS_TAGS } from "@/types";
import { MarketBanner } from "@/components/corp/MarketBanner";

const INFRA_LABEL = Object.fromEntries(ENTERPRISE_INFRA.map((i) => [i.id, `${i.icon} ${i.label}`]));
const BIZ_TAG_LABEL = Object.fromEntries(ENTERPRISE_BUSINESS_TAGS.map((t) => [t.value, t.label]));
const TEAM_SIZE_LABEL = Object.fromEntries(ENTERPRISE_TEAM_SIZES.map((t) => [t.value, t.label]));

type TalentRow = {
  id: string;
  username: string;
  bio: string | null;
  specialty: string | null;
  capability_modules: string | null;
  tool_stack: string | null;
  delivery_pref: string | null;
  avg_score: number;
  collab_count: number;
};

type RequirementRow = {
  id: string;
  title: string;
  status: string;
  question_types: string;
};

type ModuleLabel = { label: string; icon: string };

interface Props {
  talents: TalentRow[];
  requirements: RequirementRow[];
  moduleLabels: Record<string, ModuleLabel>;
  invitedPairs: string[]; // "talentId:reqId"
}

interface BioParsed {
  user_type?: "individual" | "enterprise";
  enterprise_name?: string;
  team_size?: string;
  business_tags?: string[];
  infra?: string[];
  [key: string]: unknown;
}

function parseBio(bioStr: string | null): BioParsed {
  if (!bioStr || !bioStr.trimStart().startsWith("{")) return {};
  return safeJsonParse<BioParsed>(bioStr, {});
}

// ─── 个人OPC Card ────────────────────────────────────────────────────
function IndividualCard({
  talent,
  moduleLabels,
  onInvite,
}: {
  talent: TalentRow & { bioData: BioParsed };
  moduleLabels: Record<string, ModuleLabel>;
  onInvite: (id: string, name: string) => void;
}) {
  const capMods = safeJsonParse<string[]>(talent.capability_modules, []);
  const tools = safeJsonParse<string[]>(talent.tool_stack, []);
  const initial = talent.username?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-200 group flex flex-col">
      {/* Header: avatar + name + tags side by side */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
            {initial}
          </div>
          {talent.avg_score > 0 && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </div>

        {/* Right: name + specialty + score/collab badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug truncate">
              {talent.username}
            </h3>
            <span className="shrink-0 px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg uppercase tracking-tighter border border-indigo-100">
              个人OPC
            </span>
          </div>
          {talent.specialty && (
            <p className="text-[11px] text-slate-400 font-medium mb-2">
              ⚡ {talent.specialty}
            </p>
          )}
          {/* Score + collab badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 rounded-lg">
            {talent.avg_score > 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                ★ {talent.avg_score.toFixed(1)}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">暂无评分</span>
            )}
            <span className="text-slate-300 text-[10px]">·</span>
            <span className="text-[10px] text-indigo-500 font-bold">{talent.collab_count} 次合作</span>
          </div>
        </div>
      </div>

      {/* Capability tags */}
      {capMods.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {capMods.slice(0, 3).map((modId) => {
            const mod = moduleLabels[modId];
            return (
              <span
                key={modId}
                className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100"
              >
                {mod?.icon} {mod?.label ?? modId}
              </span>
            );
          })}
          {capMods.length > 3 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{capMods.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Tool stack */}
      {tools.length > 0 && (
        <div className="bg-slate-50/80 rounded-xl p-3 mb-4">
          <p className="text-[9px] text-slate-400 font-bold uppercase mb-2">
            工具栈
          </p>
          <div className="flex flex-wrap gap-1">
            {tools.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200"
              >
                {t}
              </span>
            ))}
            {tools.length > 4 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{tools.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions: 查看详情(1) : 邀请考核(2) */}
<div className="flex gap-2 mt-auto pt-2 w-full">
  <Link
    href={`/corp/talent/${talent.id}`}
    className="flex-1 py-2.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors text-center"
  >
    查看详情
  </Link>

  <button
    onClick={() => onInvite(talent.id, talent.username)}
    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-colors"
  >
    邀请考核
  </button>
</div>
    </div>
  );
}

// ─── 机构OPC Card ─────────────────────────────────────────────────────
function EnterpriseCard({
  talent,
  bioData,
  onInvite,
}: {
  talent: TalentRow;
  bioData: BioParsed;
  onInvite: (id: string, name: string) => void;
}) {
  const displayName = bioData.enterprise_name || talent.username;
  const initial = displayName?.[0]?.toUpperCase() ?? "E";

  return (
    <div className="bg-white border-2 border-amber-50 rounded-[2rem] p-6 hover:shadow-xl hover:border-amber-200 transition-all duration-200 relative overflow-hidden group flex flex-col">
      {/* Award badge */}
      <div className="absolute top-4 right-4 text-amber-400 text-lg">🏅</div>

      {/* Header: avatar + name + tags side by side */}
      <div className="flex items-start gap-4 mb-4 pr-6">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-100 shrink-0">
          {initial}
        </div>

        {/* Right: name + team size + type badge + score/collab badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="text-base font-bold text-slate-800 group-hover:text-amber-600 transition-colors leading-snug truncate">
              {displayName}
            </h3>
            <span className="shrink-0 px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-lg uppercase tracking-tighter border border-amber-100">
              机构OPC
            </span>
          </div>
          {bioData.team_size && (
            <p className="text-[11px] text-slate-400 font-medium mb-2">
              👥 {TEAM_SIZE_LABEL[bioData.team_size] ?? bioData.team_size} · 专业交付机构
            </p>
          )}
          {/* Score + collab badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-50 rounded-lg">
            {talent.avg_score > 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                ★ {talent.avg_score.toFixed(1)}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">暂无评分</span>
            )}
            <span className="text-amber-200 text-[10px]">·</span>
            <span className="text-[10px] text-amber-600 font-bold">{talent.collab_count} 次合作</span>
          </div>
        </div>
      </div>

      {/* Infra — like capability tags */}
      {Array.isArray(bioData.infra) && bioData.infra.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {bioData.infra.slice(0, 3).map((chip) => (
            <span
              key={chip}
              className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-100"
            >
              {INFRA_LABEL[chip] ?? chip}
            </span>
          ))}
          {bioData.infra.length > 3 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{bioData.infra.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Business tags — like tool stack */}
      {Array.isArray(bioData.business_tags) && bioData.business_tags.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-3 mb-4">
          <p className="text-[9px] text-amber-400 font-bold uppercase mb-2">支持服务</p>
          <div className="flex flex-wrap gap-1">
            {bioData.business_tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono bg-white text-amber-700 px-1.5 py-0.5 rounded border border-amber-100"
              >
                {BIZ_TAG_LABEL[tag] ?? tag}
              </span>
            ))}
            {bioData.business_tags.length > 4 && (
              <span className="text-[10px] text-amber-400 self-center">
                +{bioData.business_tags.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2">
        <Link
          href={`/corp/talent/${talent.id}`}
          className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors text-center"
        >
          查看详情
        </Link>
        <button
          onClick={() => onInvite(talent.id, displayName)}
          className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 shadow-lg shadow-amber-100 transition-colors"
        >
          邀请考核
        </button>
      </div>
    </div>
  );
}

// ─── Referral Share Modal ────────────────────────────────────────────────────
function ReferralShareModal({
  referralUrl,
  monthlyQuota,
  referralBonus,
  onClose,
}: {
  referralUrl: string;
  monthlyQuota: number;
  referralBonus: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h3 className="font-bold text-slate-800 text-base">分享邀请链接</h3>
            <p className="text-xs text-slate-400 mt-0.5">邀请企业好友注册，每成功 1 人 <span className="text-indigo-600 font-bold">永久得 +3 次</span>邀约机会</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none mt-0.5">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quota breakdown card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-4">当前邀约配额明细</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-2xl font-black">{monthlyQuota}</p>
                <p className="text-[11px] opacity-80 mt-0.5">月度配额</p>
                <p className="text-[10px] opacity-60 mt-0.5">每月自动重置</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-2xl font-black">{referralBonus}</p>
                <p className="text-[11px] opacity-80 mt-0.5">邀请奖励</p>
                <p className="text-[10px] opacity-60 mt-0.5">永久保留 · 不重置</p>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold opacity-90">合计可用</span>
              <span className="text-xl font-black">{monthlyQuota + referralBonus} 次</span>
            </div>
          </div>

          {/* How it works */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <span className="text-xl mt-0.5">🎁</span>
            <div>
              <p className="text-sm font-bold text-amber-800">每邀请 1 位新用户注册</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                你立即获得 <strong>+3 次</strong>邀约机会，<strong>永久拥有，不随月度重置</strong>，可无限累积。
              </p>
            </div>
          </div>

          {/* Link copy */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">你的专属邀请链接</p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <span className="flex-1 text-xs text-slate-600 font-mono truncate">{referralUrl}</span>
              <button
                onClick={copy}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {copied ? "✓ 已复制" : "复制链接"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              对方通过此链接完成企业注册后，你将立即收到奖励
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({
  target,
  requirements,
  quota,
  monthlyQuota,
  referralBonus,
  referralUrl,
  invitedPairs,
  onClose,
  onInvited,
  onQuotaChange,
}: {
  target: { id: string; name: string };
  requirements: RequirementRow[];
  quota: number;
  monthlyQuota: number;
  referralBonus: number;
  referralUrl: string;
  invitedPairs: Set<string>;
  onClose: () => void;
  onInvited: (talentId: string, reqId: string) => void;
  onQuotaChange: (next: number) => void;
}) {
  const statusConfig: Record<string, { label: string; style: string }> = {
    draft: { label: "草稿", style: "text-slate-400 bg-slate-100" },
    active: { label: "进行中", style: "text-emerald-600 bg-emerald-50" },
    closed: { label: "已关闭", style: "text-slate-400 bg-slate-100" },
    completed: { label: "已完成", style: "text-indigo-600 bg-indigo-50" },
  };
  const [sending, setSending] = useState<string | null>(null);
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set());
  const [showShare, setShowShare] = useState(false);

  async function handleInvite(reqId: string, questionTypes: string) {
    if (sentReqs.has(reqId) || sending) return;
    setSending(reqId);
    const isNoExam = (() => { try { return (JSON.parse(questionTypes || "[]") as string[]).includes("no_exam"); } catch { return false; } })();
    const endpoint = isNoExam ? "/api/corp/no-exam-invite" : "/api/assessments/invite";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talent_id: target.id, requirement_id: reqId }),
      });
      const data = await res.json();
      if (data.alreadyInvited || res.ok) {
        setSentReqs((prev) => new Set([...prev, reqId]));
        onInvited(target.id, reqId);
        if (res.ok && !data.alreadyInvited) onQuotaChange(quota - 1);
      } else if (res.status === 403 && data.error === "quotaExhausted") {
        onQuotaChange(0);
      }
    } finally {
      setSending(null);
    }
  }

  const exhausted = quota <= 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Modal header */}
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
            <div>
              <h3 className="font-bold text-slate-800 text-base">邀请参与考核</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                选择需求，邀请{" "}
                <span className="text-indigo-600 font-bold">{target.name}</span>{" "}
                完成拟真考核
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Quota badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                exhausted
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : quota <= 1
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                剩余次数：{quota}
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none">✕</button>
            </div>
          </div>

          {/* Quota exhausted overlay */}
          {exhausted ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto text-3xl">🔒</div>
              <div>
                <p className="font-bold text-slate-800 text-base">本月邀约次数已用完</p>
                <p className="text-sm text-slate-500 mt-1">邀请好友注册 OPC，每成功邀请 1 人立得 3 次机会</p>
              </div>
              <button
                onClick={() => setShowShare(true)}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                分享邀请链接，获取机会
              </button>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold hover:bg-slate-200 transition-colors">
                暂时关闭
              </button>
            </div>
          ) : (
            <>
              {/* Requirements list */}
              <div className="p-4 max-h-72 overflow-y-auto space-y-2">
                {requirements.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-sm mb-3 text-slate-500">暂无已发布的需求</p>
                    <Link
                      href="/corp/new"
                      className="text-xs text-indigo-600 font-bold hover:text-indigo-700"
                      onClick={onClose}
                    >
                      去创建需求 →
                    </Link>
                  </div>
                ) : (
                  requirements.map((req) => {
                    const sc = statusConfig[req.status] ?? statusConfig.draft;
                    const isSent = sentReqs.has(req.id) || invitedPairs.has(`${target.id}:${req.id}`);
                    const isLoading = sending === req.id;
                    return (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/60 transition-all"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                          <p className="text-sm font-semibold text-slate-700 line-clamp-1">{req.title}</p>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.style}`}>
                            {sc.label}
                          </span>
                        </div>
                        <button
                          onClick={() => handleInvite(req.id, req.question_types)}
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

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-between items-center">
                <button
                  onClick={() => setShowShare(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  邀请好友获取更多机会
                </button>
                <Link
                  href={`/corp/new?talent=${target.id}`}
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  ＋ 为 TA 新建专属需求
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {showShare && (
        <ReferralShareModal referralUrl={referralUrl} monthlyQuota={monthlyQuota} referralBonus={referralBonus} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export function MarketClient({ talents, requirements, moduleLabels, invitedPairs }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "enterprise">("all");
  const [moduleFilters, setModuleFilters] = useState<string[]>([]);
  const [inviteTarget, setInviteTarget] = useState<{ id: string; name: string } | null>(null);
  // Set of "talentId:reqId" pairs that have been invited
  const [localInvited, setLocalInvited] = useState<Set<string>>(new Set(invitedPairs));
  const [quota, setQuota] = useState<number>(3);
  const [monthlyQuota, setMonthlyQuota] = useState<number>(3);
  const [referralBonus, setReferralBonus] = useState<number>(0);
  const [referralUrl, setReferralUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  // Fetch quota on mount
  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/corp/invite/check");
      if (res.ok) {
        const data = await res.json();
        setQuota(data.quota ?? 3);
        setMonthlyQuota(data.monthlyQuota ?? 3);
        setReferralBonus(data.referralBonus ?? 0);
        setReferralUrl(data.referralUrl ?? "");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchQuota(); }, [fetchQuota]);

  function handleInvited(talentId: string, reqId: string) {
    setLocalInvited((prev) => new Set([...prev, `${talentId}:${reqId}`]));
  }

  function toggleModule(id: string) {
    setModuleFilters((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  // Enrich talents with parsed bio
  const enriched = useMemo(
    () =>
      talents.map((t) => {
        const bioData = parseBio(t.bio);
        return { ...t, bioData, userType: bioData.user_type ?? "individual" };
      }),
    [talents]
  );

  // Filter talents
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((t) => {
      if (typeFilter !== "all" && t.userType !== typeFilter) return false;
      if (moduleFilters.length > 0) {
        const capMods = safeJsonParse<string[]>(t.capability_modules, []);
        if (!moduleFilters.some((m) => capMods.includes(m))) return false;
      }
      if (!q) return true;
      const capMods = safeJsonParse<string[]>(t.capability_modules, []);
      const tools = safeJsonParse<string[]>(t.tool_stack, []);
      const haystack = [
        t.username,
        t.specialty,
        t.bioData.enterprise_name,
        ...capMods,
        ...tools,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [enriched, query, typeFilter, moduleFilters]);

  const typeButtons: { value: "all" | "individual" | "enterprise"; label: string }[] = [
    { value: "all", label: "全部" },
    { value: "individual", label: "个人 OPC" },
    { value: "enterprise", label: "机构 OPC" },
  ];

  return (
    <div className="p-8 min-h-screen bg-slate-50">
      {/* Page header */}
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">OPC能力市场</h1>
            <p className="text-slate-400 text-sm mt-1">
              浏览经过拟真考核验证的 AI 超级个体与专业交付机构
            </p>
          </div>
          {/* Quota + share */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${
              quota <= 0
                ? "bg-red-50 text-red-500 border-red-200"
                : quota <= 1
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-indigo-50 text-indigo-600 border-indigo-100"
            }`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>剩余邀约 {quota} 次</span>
              {referralBonus > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-400 text-white rounded-md text-[10px] font-black">
                  +{referralBonus} 永久
                </span>
              )}
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              邀请新用户注册
            </button>
          </div>
        </div>
      </header>

      {/* ── Banner: 热门合作案例轮播 ── */}
      <MarketBanner />

      {/* Search + type filter bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-1/2">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索关键词：能力模块、工具栈或项目经验..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition text-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          {typeButtons.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                typeFilter === value
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Module filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-1.5">
          {CAPABILITY_MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleModule(m.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                moduleFilters.includes(m.id)
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
          {moduleFilters.length > 0 && (
            <button
              onClick={() => setModuleFilters([])}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-3 mb-6">
        <p className="text-xs text-slate-400">
          共{" "}
          <span className="text-slate-700 font-bold">{filtered.length}</span>{" "}
          位 OPC
        </p>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((talent) =>
          talent.userType === "enterprise" ? (
            <EnterpriseCard
              key={talent.id}
              talent={talent}
              bioData={talent.bioData}
              onInvite={(id, name) => setInviteTarget({ id, name })}
            />
          ) : (
            <IndividualCard
              key={talent.id}
              talent={talent}
              moduleLabels={moduleLabels}
              onInvite={(id, name) => setInviteTarget({ id, name })}
            />
          )
        )}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-20 text-slate-400">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-lg font-semibold text-slate-500 mb-1">
              {query ? "未找到匹配的 OPC" : "暂无可用 OPC"}
            </p>
            <p className="text-sm">
              {query
                ? "换个关键词试试，或清空筛选条件"
                : "OPC入驻并完成考核后将显示在这里"}
            </p>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {inviteTarget && (
        <InviteModal
          target={inviteTarget}
          requirements={requirements}
          quota={quota}
          monthlyQuota={monthlyQuota}
          referralBonus={referralBonus}
          referralUrl={referralUrl}
          invitedPairs={localInvited}
          onClose={() => setInviteTarget(null)}
          onInvited={handleInvited}
          onQuotaChange={setQuota}
        />
      )}

      {/* Standalone share modal (from header button) */}
      {showShareModal && (
        <ReferralShareModal
          referralUrl={referralUrl}
          monthlyQuota={monthlyQuota}
          referralBonus={referralBonus}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
