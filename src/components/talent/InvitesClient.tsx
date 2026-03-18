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
};

interface Props {
  collabInvites: Invite[];
  assessmentInvites: Invite[];
}

export function InvitesClient({ collabInvites, assessmentInvites }: Props) {
  const [activeTab, setActiveTab] = useState<"assessment" | "collaboration">("assessment");
  const [readInvites, setReadInvites] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
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

  const collabStatusMap: Record<string, { label: string; variant: string }> = {
    invited: { label: "等待回应", variant: "text-orange-400 bg-orange-400/10" },
    accepted: { label: "已接受", variant: "text-emerald-400 bg-emerald-400/10" },
    active: { label: "进行中", variant: "text-indigo-400 bg-indigo-400/10" },
    completed: { label: "已完成", variant: "text-slate-400 bg-slate-400/10" },
    rejected: { label: "已拒绝", variant: "text-red-400 bg-red-400/10" },
  };

  const assessmentStatusMap: Record<string, { label: string; variant: string }> = {
    invited: { label: "待参与", variant: "text-amber-400 bg-amber-400/10" },
    completed: { label: "已完成", variant: "text-emerald-400 bg-emerald-400/10" },
  };

  const assessmentPendingCount = assessmentInvites.filter((c) => c.status === "invited" && !c.is_read && !readInvites.has(c.id)).length;
  const collabPendingCount = collabInvites.filter((c) => {
    if (c.type === "no_exam_intent") return c.status === "accepted" && !c.is_read;
    return c.status === "invited" && !c.is_read && !readInvites.has(c.id);
  }).length;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("invites-count-update", { detail: { count: assessmentPendingCount + collabPendingCount } }));
  }, [assessmentPendingCount, collabPendingCount]);

  return (
    <div className="w-2xl mx-auto px-8 py-10">


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
                const status = collabStatusMap[collab.status] ?? { label: collab.status, variant: "text-slate-400" };
                const isRejected = collab.status === "rejected" || rejectedIds.has(collab.id);
                const hasRedDot = collab.type === "no_exam_intent"
                  ? collab.status === "accepted" && !collab.is_read
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
                        {collab.status === "invited" && collab.type === "no_exam_intent" && (
                          <p className="text-sm text-slate-500">等待企业回应…</p>
                        )}
                        {(collab.status === "accepted" || collab.status === "active") && (
                          <span className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold inline-block">
                            进入项目协作 →
                          </span>
                        )}
                        {isRejected && (
                          <p className="text-sm text-slate-600">已拒绝此邀请</p>
                        )}
                        {collab.status === "completed" && (
                          <p className="text-sm text-slate-500">✓ 项目已完成</p>
                        )}
                      </div>
                    </div>
                  </>
                );
                const canNavigate = !isRejected && collab.status !== "invited" && collab.type !== "no_exam_intent";
                const isCollabInvited = collab.status === "invited" && collab.type === "collaboration";
                return canNavigate ? (
                  <Link
                    key={collab.id}
                    href={`/talent/projects/${collab.id}/chat`}
                    className="block bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 transition-colors"
                  >
                    {cardContent}
                  </Link>
                ) : isCollabInvited && collab.requirement?.id ? (
                  <div
                    key={collab.id}
                    onClick={() => router.push(`/talent/challenges/${collab.requirement!.id}`)}
                    className="block bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-2xl p-6 transition-colors cursor-pointer"
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
