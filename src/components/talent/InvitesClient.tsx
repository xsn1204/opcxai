"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { InviteActions } from "@/components/talent/InviteActions";

type Invite = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  invitation_message: string | null;
  requirement: { id: string; title: string } | null;
  corp_profile: { company_name: string | null; company_desc: string | null; website_url: string | null } | null;
  is_read: boolean;
  unread_for_talent: boolean;
};

interface Props {
  collabInvites: Invite[];
  assessmentInvites: Invite[];
  defaultTab?: "assessment" | "collaboration";
}

export function InvitesClient({ collabInvites, assessmentInvites, defaultTab }: Props) {
  const [readInvites, setReadInvites] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [confirmedIntentIds, setConfirmedIntentIds] = useState<Set<string>>(new Set());
  const [activeConfirmedIds, setActiveConfirmedIds] = useState<Set<string>>(new Set());
  const [sendingIntentIds, setSendingIntentIds] = useState<Set<string>>(new Set());
  const [clearedRejectedIds, setClearedRejectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  function handleAssessmentClick(inviteId: string, requirementId: string, isRead: boolean) {
    if (!isRead && !readInvites.has(inviteId)) {
      setReadInvites((prev) => new Set(prev).add(inviteId));
      fetch(`/api/invites/${inviteId}/mark-read`, { method: "POST" })
        .then(() => {
          // Trigger event to update nav badge
          window.dispatchEvent(new Event("invites-updated"));
        })
        .catch((error) => {
          console.error("Failed to mark as read:", error);
        });
    }
    router.push(`/talent/challenges/${requirementId}`);
  }

  async function handleSendIntent(collabId: string, reqId: string, isCorpInvite?: boolean) {
    setSendingIntentIds((prev) => new Set(prev).add(collabId));
    try {
      const res = await fetch(`/api/talent/intent/${reqId}`, { method: "POST" });
      if (res.ok) {
        if (isCorpInvite) {
          setActiveConfirmedIds((prev) => new Set(prev).add(collabId));
        } else {
          setConfirmedIntentIds((prev) => new Set(prev).add(collabId));
        }
        window.dispatchEvent(new Event("invites-updated"));
      }
    } finally {
      setSendingIntentIds((prev) => { const s = new Set(prev); s.delete(collabId); return s; });
    }
  }

  const collabStatusMap: Record<string, { label: string; variant: string }> = {
    invited: { label: "等待回应", variant: "text-orange-400 bg-orange-400/10" },
    accepted: { label: "进行中", variant: "text-indigo-400 bg-indigo-400/10" },
    active: { label: "进行中", variant: "text-indigo-400 bg-indigo-400/10" },
    completed: { label: "已完成", variant: "text-slate-400 bg-slate-400/10" },
    rejected: { label: "已拒绝", variant: "text-red-400 bg-red-400/10" },
  };

  const assessmentStatusMap: Record<string, { label: string; variant: string }> = {
    invited: { label: "待参与", variant: "text-amber-400 bg-amber-400/10" },
    completed: { label: "已完成", variant: "text-emerald-400 bg-emerald-400/10" },
    rejected: { label: "对方已拒绝", variant: "text-red-400 bg-red-400/10" },
  };

  const assessmentPendingCount = assessmentInvites.filter((c) =>
    (c.status === "invited" && !c.is_read && !readInvites.has(c.id)) ||
    (c.status === "rejected" && !c.is_read && !readInvites.has(c.id))
  ).length;
  const collabPendingCount = collabInvites.filter((c) => {
    // Corp-invited unconfirmed: talent needs to respond
    if (c.type === "no_exam_intent" && c.invitation_message === null)
      return c.status === "invited" && !c.is_read && !confirmedIntentIds.has(c.id) && !rejectedIds.has(c.id);
    // Talent-initiated intent: badge only on status CHANGES (accepted / rejected), not while waiting
    if (c.type === "no_exam_intent")
      return (c.status === "accepted" && !c.is_read) || (c.status === "rejected" && c.unread_for_talent && !clearedRejectedIds.has(c.id));
    return c.status === "invited" && !c.is_read && !readInvites.has(c.id);
  }).length;

  // Default to collaboration tab if there are pending collab items but no pending assessment items
  const [activeTab, setActiveTab] = useState<"assessment" | "collaboration">(() => {
    if (defaultTab) return defaultTab;
    const hasPendingAssessment = assessmentInvites.some((c) => c.status === "invited" && !c.is_read);
    const hasPendingCollab = collabInvites.some((c) => {
      if (c.type === "no_exam_intent" && c.invitation_message === null) return c.status === "invited" && !c.is_read;
      if (c.type === "no_exam_intent") return (c.status === "accepted" && !c.is_read) || (c.status === "rejected" && c.unread_for_talent);
      return c.status === "invited" && !c.is_read;
    });
    return hasPendingCollab && !hasPendingAssessment ? "collaboration" : "assessment";
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("invites-count-update", { detail: { count: assessmentPendingCount + collabPendingCount } }));
  }, [assessmentPendingCount, collabPendingCount]);


  return (
    <div className="w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">


      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">邀请中心</h1>
        <p className="text-slate-500 text-sm mt-2">管理你的考核邀请与协作邀请</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("assessment")}
          className={cn(
            "px-5 py-3 text-sm font-bold transition-colors relative",
            activeTab === "assessment"
              ? "text-amber-400"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <div className="flex items-center gap-2">
            <span>考核邀请</span>
            {assessmentPendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-[10px] font-black text-white flex items-center justify-center">
                {assessmentPendingCount}
              </span>
            )}
          </div>
          {activeTab === "assessment" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("collaboration")}
          className={cn(
            "px-5 py-3 text-sm font-bold transition-colors relative",
            activeTab === "collaboration"
              ? "text-indigo-400"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <div className="flex items-center gap-2">
            <span>协作邀请</span>
            {collabPendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-[10px] font-black text-white flex items-center justify-center">
                {collabPendingCount}
              </span>
            )}
          </div>
          {activeTab === "collaboration" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />
          )}
        </button>
      </div>

      {/* Assessment invites */}
      {activeTab === "assessment" && (
        <div>
          {assessmentInvites.length === 0 ? (
            <div className="text-center py-16 border border-slate-800 rounded-2xl">
              <p className="text-slate-600 text-sm">暂无考核邀请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessmentInvites.map((collab) => {
                const status = assessmentStatusMap[collab.status] ?? { label: collab.status, variant: "text-slate-400 bg-slate-400/10" };
                return (
                  <div
                    key={collab.id}
                    onClick={() => collab.requirement?.id && handleAssessmentClick(collab.id, collab.requirement.id, collab.is_read)}
                    className="block bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 transition-colors cursor-pointer"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
                            {collab.corp_profile?.company_name?.[0] ?? "C"}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-300">{collab.corp_profile?.company_name}</span>
                            <span className="ml-2 text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wide">
                              考核邀请
                            </span>
                          </div>
                        </div>
                        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                          {collab.requirement?.title}
                          {!collab.is_read && !readInvites.has(collab.id) && (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">{formatRelativeTime(collab.created_at)}</p>
                      </div>
                      <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium shrink-0", status.variant)}>
                        {status.label}
                      </span>
                    </div>

                    {/* Corp desc */}
                    {collab.corp_profile?.company_desc && (
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4">
                        <p className="text-xs text-slate-500 mb-2">企业介绍</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{collab.corp_profile.company_desc}</p>
                        {collab.corp_profile.website_url && (
                          <a
                            href={collab.corp_profile.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                          >
                            {collab.corp_profile.website_url}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Invitation message */}
                    {collab.invitation_message && (
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4">
                        <p className="text-xs text-slate-500 mb-2">邀请留言</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{collab.invitation_message}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/50">
                      <div className="ml-auto">
                        {collab.status === "invited" && collab.requirement?.id && (
                          <span className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold inline-block">
                            查看考核详情 →
                          </span>
                        )}
                        {collab.status === "completed" && (
                          <p className="text-sm text-slate-500">✓ 已完成考核</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Collaboration invites */}
      {activeTab === "collaboration" && (
        <div>
          {collabInvites.length === 0 ? (
            <div className="text-center py-16 border border-slate-800 rounded-2xl">
              <p className="text-slate-600 text-sm mb-3">暂无协作邀请</p>
              <Link href="/talent/challenges" className="inline-block text-xs text-indigo-400 hover:text-indigo-300">
                去参与考核，获得合作机会 →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {collabInvites.map((collab) => {
                const isCorpRejectedIntent = collab.type === "no_exam_intent"
                  && collab.status === "rejected"
                  && collab.invitation_message !== null; // corp rejected talent's confirmed intent
                // Corp invited talent (unconfirmed): talent needs to respond
                const isCorpInvitedPending = collab.type === "no_exam_intent"
                  && collab.invitation_message === null
                  && collab.status === "invited"
                  && !confirmedIntentIds.has(collab.id)
                  && !activeConfirmedIds.has(collab.id)
                  && !rejectedIds.has(collab.id);
                // After talent confirms corp invite in this session → goes active directly
                const isJustActivated = activeConfirmedIds.has(collab.id);
                // After talent sends fresh intent in this session → waiting for corp
                const isJustConfirmed = confirmedIntentIds.has(collab.id);

                const isTalentRejected = (collab.status === "rejected" && !isCorpRejectedIntent) || rejectedIds.has(collab.id);
                // talent declined a corp-initiated no_exam invite (invitation_message was null)
                const isTalentDeclinedCorpInvite = isTalentRejected
                  && (collab.invitation_message === null || (rejectedIds.has(collab.id) && collab.invitation_message === null));
                const isRejected = isCorpRejectedIntent || isTalentRejected;

                const status = isCorpRejectedIntent
                  ? { label: "对方拒绝意向", variant: "text-red-400 bg-red-400/10" }
                  : isTalentDeclinedCorpInvite
                  ? { label: "已拒绝", variant: "text-slate-400 bg-slate-400/10" }
                  : isCorpInvitedPending
                  ? { label: "待你回应", variant: "text-teal-400 bg-teal-400/10" }
                  : isJustActivated
                  ? { label: "进行中", variant: "text-indigo-400 bg-indigo-400/10" }
                  : isJustConfirmed
                  ? { label: "等待企业回应", variant: "text-orange-400 bg-orange-400/10" }
                  : (collabStatusMap[collab.status] ?? { label: collab.status, variant: "text-slate-400" });

                const hasRedDot = isCorpInvitedPending
                  ? !collab.is_read
                  : collab.type === "no_exam_intent"
                  ? (collab.status === "accepted" && !collab.is_read) || (collab.status === "rejected" && collab.unread_for_talent && !clearedRejectedIds.has(collab.id))
                  : collab.status === "invited" && !collab.is_read && !readInvites.has(collab.id) && !rejectedIds.has(collab.id);
                const cardContent = (
                  <>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
                            {collab.corp_profile?.company_name?.[0] ?? "C"}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-300">{collab.corp_profile?.company_name}</span>
                            <span className="ml-2 text-[9px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase tracking-wide">
                              协作邀请
                            </span>
                          </div>
                        </div>
                        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                          {collab.requirement?.title}
                          {hasRedDot && (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">{formatRelativeTime(collab.created_at)}</p>
                      </div>
                      <span className={cn("text-xs px-3 py-1.5 rounded-full font-medium shrink-0", status.variant)}>
                        {status.label}
                      </span>
                    </div>

            

                    {/* Invitation message */}
                    {collab.invitation_message && (
                      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-4">
                        <p className="text-xs text-slate-500 mb-2">邀请留言</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{collab.invitation_message}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/50">
                      <div className="flex gap-3 items-center ml-auto">
                        {/* Corp invited talent — talent needs to confirm or decline */}
                        {isCorpInvitedPending && collab.requirement?.id && (
                          <>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRejectedIds((prev) => new Set(prev).add(collab.id)); fetch(`/api/collaborations/${collab.id}/reject`, { method: "POST" }); }}
                              className="px-4 py-2 text-sm text-slate-400 border border-slate-600 rounded-xl hover:border-red-500/50 hover:text-red-400 transition-colors"
                            >
                              暂不感兴趣
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendIntent(collab.id, collab.requirement!.id, true); }}
                              disabled={sendingIntentIds.has(collab.id)}
                              className="px-5 py-2 text-sm font-bold bg-teal-600 text-white rounded-xl hover:bg-teal-500 transition-colors disabled:opacity-50"
                            >
                              {sendingIntentIds.has(collab.id) ? "发送中…" : "🤝 发送意向"}
                            </button>
                          </>
                        )}
                        {/* Just activated (corp-invited, talent confirmed) → go to project directly */}
                        {isJustActivated && (
                          <span
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/talent/projects/${collab.id}/chat`); }}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold inline-block cursor-pointer hover:bg-indigo-500 transition-colors"
                          >
                            进入项目协作 →
                          </span>
                        )}
                        {/* Just confirmed fresh intent in this session */}
                        {isJustConfirmed && (
                          <p className="text-sm text-teal-400">✓ 意向已发送，等待企业回应</p>
                        )}
                        {/* Talent-initiated intent waiting for corp */}
                        {!isCorpInvitedPending && !isJustConfirmed && collab.status === "invited" && collab.type === "no_exam_intent" && (
                          <p className="text-sm text-slate-500"></p>
                        )}
                        {collab.status === "invited" && collab.type !== "no_exam_intent" && (
                          <span
                            onClick={(e) => e.preventDefault()}
                            className="inline-block"
                          >
                            <InviteActions
                              collabId={collab.id}
                              onRejected={() => setRejectedIds((prev) => new Set(prev).add(collab.id))}
                            />
                          </span>
                        )}
                        {(collab.status === "accepted" || collab.status === "active") && (
                          <span
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/talent/projects/${collab.id}/chat`); }}
                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold inline-block cursor-pointer hover:bg-indigo-500 transition-colors"
                          >
                            进入项目协作 →
                          </span>
                        )}
                        {isCorpRejectedIntent && (
                          <p className="text-sm text-slate-500">对方已拒绝你的合作意向</p>
                        )}
                        {isTalentRejected && (
                          <p className="text-sm text-slate-600">{isTalentDeclinedCorpInvite ? "你已拒绝此邀请" : "已拒绝此邀请"}</p>
                        )}
                        {collab.status === "completed" && (
                          <p className="text-sm text-slate-500">✓ 项目已完成</p>
                        )}
                      </div>
                    </div>
                  </>
                );
                const reqId = collab.requirement?.id;
                // When clicking a corp-rejected intent card, clear the unread notification
                function handleCardClick() {
                  if (collab.type === "no_exam_intent" && collab.status === "rejected" && collab.unread_for_talent && !clearedRejectedIds.has(collab.id)) {
                    setClearedRejectedIds((prev) => new Set(prev).add(collab.id));
                    fetch(`/api/collaborations/${collab.id}/mark-read`, { method: "POST" })
                      .then(() => window.dispatchEvent(new Event("invites-updated")))
                      .catch(() => {});
                  }
                  if (reqId) router.push(`/talent/challenges/${reqId}`);
                }
                // All cards with a requirement navigate to challenge detail on click.
                // "进入项目协作" button inside stops propagation and goes to project chat instead.
                return reqId ? (
                  <div
                    key={collab.id}
                    onClick={handleCardClick}
                    className={cn(
                      "block bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 transition-colors cursor-pointer",
                      isRejected && "opacity-60"
                    )}
                  >
                    {cardContent}
                  </div>
                ) : (
                  <div
                    key={collab.id}
                    className={cn(
                      "block bg-slate-800/50 border border-slate-700 rounded-2xl p-6",
                      isRejected ? "opacity-60" : ""
                    )}
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
