"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

interface ProjectChatProps {
  collaborationId: string;
  initialMessages: Message[];
  currentUserId: string;
  currentUserRole: "talent" | "corp";
  requirement: { title: string; intent_desc: string; deadline: string | null; budget_min: number | null; budget_max: number | null } | null;
  partnerName: string;
  corpContactInfo?: string;
  talentContactInfo?: string;
  theme?: "dark" | "light";
  collabStatus: string;
  corpConfirmed: boolean;
  talentConfirmed: boolean;
  corpStarRating: number | null;
  hideSidebarOnMobile?: boolean;
}

// Theme token map — all variant-specific Tailwind classes live here
const themes = {
  dark: {
    // Sidebar / info panel
    sidebar: "border-r border-slate-700 bg-slate-800/30",
    sidebarLabel: "text-slate-500",
    sidebarValue: "text-slate-200 font-medium",
    sidebarDesc: "text-slate-400",
    sidebarDivider: "border-slate-700",
    sidebarStatusDot: "bg-emerald-500",
    sidebarStatusText: "text-emerald-400",
    // Chat header
    header: "border-b border-slate-700 bg-slate-800/20",
    headerTitle: "text-white",
    headerSub: "text-slate-500",
    headerAvatar: "bg-indigo-600 text-white",
    // Messages area
    messagesArea: "",
    emptyText: "text-slate-600",
    // Bubbles
    myBubble: "bg-indigo-600 text-white rounded-tr-sm",
    myTime: "text-indigo-200",
    myAvatar: "bg-indigo-600 text-white",
    theirBubble: "bg-slate-700/80 text-slate-200 rounded-tl-sm",
    theirTime: "text-slate-500",
    theirAvatar: "bg-slate-700 text-slate-300",
    // Input area
    inputArea: "border-t border-slate-200 bg-white pb-safe",
    input:
      "bg-slate-700/50 border border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500",
    hint: "text-slate-600",
  },
  light: {
    // Sidebar / info panel
    sidebar: "border-r border-slate-200 bg-slate-50",
    sidebarLabel: "text-slate-400",
    sidebarValue: "text-slate-800 font-semibold",
    sidebarDesc: "text-slate-500",
    sidebarDivider: "border-slate-200",
    sidebarStatusDot: "bg-emerald-500",
    sidebarStatusText: "text-emerald-600",
    // Chat header
    header: "border-b border-slate-200 bg-white",
    headerTitle: "text-slate-800",
    headerSub: "text-slate-400",
    headerAvatar: "bg-indigo-600 text-white",
    // Messages area
    messagesArea: "bg-slate-50/60",
    emptyText: "text-slate-400",
    // Bubbles
    myBubble: "bg-indigo-600 text-white rounded-tr-sm",
    myTime: "text-indigo-200",
    myAvatar: "bg-indigo-600 text-white",
    theirBubble: "bg-white text-slate-700 rounded-tl-sm border border-slate-200 shadow-sm",
    theirTime: "text-slate-400",
    theirAvatar: "bg-slate-200 text-slate-600",
    // Input area
    inputArea: "border-t border-slate-200 bg-white",
    input:
      "bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-indigo-400",
    hint: "text-slate-400",
  },
} as const;

export function ProjectChat({
  collaborationId,
  initialMessages,
  currentUserId,
  currentUserRole,
  requirement,
  partnerName,
  corpContactInfo,
  talentContactInfo,
  theme = "dark",
  collabStatus: initialCollabStatus,
  corpConfirmed: initialCorpConfirmed,
  talentConfirmed: initialTalentConfirmed,
  corpStarRating: initialCorpStarRating,
  hideSidebarOnMobile = false,
}: ProjectChatProps) {
  const router = useRouter();
  const t = themes[theme];
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [collabStatus, setCollabStatus] = useState(initialCollabStatus);
  const [corpConfirmed, setCorpConfirmed] = useState(initialCorpConfirmed);
  const [talentConfirmed, setTalentConfirmed] = useState(initialTalentConfirmed);
  const [corpStarRating, setCorpStarRating] = useState(initialCorpStarRating);
  const [confirming, setConfirming] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // 进入聊天即标记已读，并通知导航栏更新红点
  useEffect(() => {
    fetch(`/api/collaborations/${collaborationId}/mark-read`, { method: "POST" })
      .then(() => window.dispatchEvent(new Event("invites-updated")))
      .catch(() => {});
  }, [collaborationId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    const filter = checkSensitive(content);
    if (!filter.ok) {
      setFilterError(formatHitMessage(filter.hits));
      return;
    }
    setFilterError("");
    setSending(true);
    setInput("");

    try {
      const res = await fetch(`/api/collaborations/${collaborationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        router.refresh();
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            collaboration_id: collaborationId,
            sender_id: currentUserId,
            content,
            sent_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  const isMyMessage = (msg: Message) => msg.sender_id === currentUserId;

  async function handleConfirmComplete() {
    if (confirming) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/collaborations/${collaborationId}/confirm-complete`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCorpConfirmed(data.corp_confirmed_complete);
        setTalentConfirmed(data.talent_confirmed_complete);
        if (data.status === "completed") setCollabStatus("completed");
        router.refresh();
      }
    } finally {
      setConfirming(false);
    }
  }

  async function handleRate(stars: number) {
    if (submittingRating) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/collaborations/${collaborationId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars }),
      });
      if (res.ok) {
        setCorpStarRating(stars);
        router.refresh();
      }
    } finally {
      setSubmittingRating(false);
    }
  }

  const myConfirmed = currentUserRole === "corp" ? corpConfirmed : talentConfirmed;
  const partnerConfirmed = currentUserRole === "corp" ? talentConfirmed : corpConfirmed;

  return (
    <div className="flex-1 h-full min-h-0 flex overflow-hidden">
      {/* ── Left: Project Info ── */}
      <div className={cn(hideSidebarOnMobile ? "hidden md:block" : "", "w-72 flex-shrink-0 p-5 overflow-y-auto", t.sidebar)}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-5">
          项目信息
        </p>

        <div className="space-y-5">
          <div>
            <p className={cn("text-[10px] uppercase tracking-wide mb-1", t.sidebarLabel)}>
              项目名称
            </p>
            <p className={cn("text-sm leading-snug", t.sidebarValue)}>
              {requirement?.title ?? "—"}
            </p>
          </div>

        

          {requirement?.intent_desc && (() => {
            const coreTask = parseIntentDesc(requirement.intent_desc).find((s) => s.key === "核心任务")?.value ?? "";
            const budgetStr =
              requirement.budget_min && requirement.budget_max
                ? `¥${requirement.budget_min.toLocaleString()} — ¥${requirement.budget_max.toLocaleString()}`
                : requirement.budget_min
                ? `¥${requirement.budget_min.toLocaleString()}+`
                : requirement.budget_max
                ? `¥${requirement.budget_max.toLocaleString()} 以内`
                : null;
            return (
              <>
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wide mb-1.5", t.sidebarLabel)}>
                    核心任务
                  </p>
                  <div className={cn("text-xs leading-relaxed whitespace-pre-line", t.sidebarDesc)}>
                    {coreTask}
                  </div>
                </div>
                {requirement.deadline && (
                  <div>
                    <p className={cn("text-[10px] uppercase tracking-wide mb-1", t.sidebarLabel)}>
                      交付截止
                    </p>
                    <p className={cn("text-sm", t.sidebarValue)}>
                      {new Date(requirement.deadline).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                )}
                {budgetStr && (
                  <div>
                    <p className={cn("text-[10px] uppercase tracking-wide mb-1", t.sidebarLabel)}>
                      项目预算
                    </p>
                    <p className="text-sm font-black text-emerald-500">{budgetStr}</p>
                  </div>
                )}
              </>
            );
          })()}

          <div className={cn("pt-4 border-t", t.sidebarDivider)}>
            {collabStatus === "completed" ? (
              <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", theme === "light" ? "bg-emerald-50 text-emerald-600" : "text-emerald-400")}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                协作已完成
              </div>
            ) : (
              <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", theme === "light" ? "bg-emerald-50 text-emerald-600" : "text-emerald-400")}>
                <span className={cn("w-1.5 h-1.5 rounded-full", t.sidebarStatusDot)} />
                协作进行中
              </div>
            )}
          </div>

          {/* ── Completion confirmation ── */}
          {(collabStatus === "active" || collabStatus === "accepted") && (
            <div className={cn("pt-4 border-t space-y-2", t.sidebarDivider)}>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", t.sidebarLabel)}>确认完成</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", corpConfirmed ? "bg-emerald-500 text-white" : (theme === "light" ? "bg-slate-200 text-slate-400" : "bg-slate-700 text-slate-500"))}>
                    {corpConfirmed ? "✓" : "·"}
                  </span>
                  <span className={cn(corpConfirmed ? (theme === "light" ? "text-emerald-600" : "text-emerald-400") : t.sidebarLabel)}>
                    企业方{corpConfirmed ? "已确认" : "未确认"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", talentConfirmed ? "bg-emerald-500 text-white" : (theme === "light" ? "bg-slate-200 text-slate-400" : "bg-slate-700 text-slate-500"))}>
                    {talentConfirmed ? "✓" : "·"}
                  </span>
                  <span className={cn(talentConfirmed ? (theme === "light" ? "text-emerald-600" : "text-emerald-400") : t.sidebarLabel)}>
                    OPC方{talentConfirmed ? "已确认" : "未确认"}
                  </span>
                </div>
              </div>
              {!myConfirmed ? (
                <button
                  onClick={handleConfirmComplete}
                  disabled={confirming}
                  className={cn("w-full py-2 rounded-xl text-xs font-bold transition-colors mt-1", theme === "light" ? "bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50" : "bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50")}
                >
                  {confirming ? "确认中..." : "✓ 我方确认完成"}
                </button>
              ) : !partnerConfirmed ? (
                <p className={cn("text-[11px] mt-1", t.sidebarLabel)}>等待对方确认完成</p>
              ) : null}
            </div>
          )}

          {/* ── Corp rating (after completed) ── */}
          {collabStatus === "completed" && (
            <div className={cn("pt-4 border-t space-y-2", t.sidebarDivider)}>
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", t.sidebarLabel)}>项目评价</p>
              {corpStarRating !== null ? (
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={cn("text-lg", s <= corpStarRating ? "text-amber-400" : "text-slate-300")}>★</span>
                    ))}
                  </div>
                  <p className={cn("text-[11px] mt-1", t.sidebarLabel)}>
                    {currentUserRole === "corp" ? "你的评分" : "企业评分"} · {corpStarRating} 星
                  </p>
                </div>
              ) : currentUserRole === "corp" ? (
                <div>
                  <p className={cn("text-[11px] mb-2", t.sidebarLabel)}>请对本次合作进行评分</p>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverStar(s)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => handleRate(s)}
                        disabled={submittingRating}
                        className={cn("text-2xl transition-colors disabled:opacity-50", s <= (hoverStar || 0) ? "text-amber-400" : "text-slate-300 hover:text-amber-300")}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {submittingRating && <p className={cn("text-[11px]", t.sidebarLabel)}>提交中...</p>}
                </div>
              ) : (
                <p className={cn("text-[11px]", t.sidebarLabel)}>等待企业评分</p>
              )}
            </div>
          )}

          <div className={cn("pt-2 border-t", t.sidebarDivider)}>
            {corpContactInfo && currentUserRole === "talent" && (
              <div className="mb-3">
                <p className={cn("text-[10px] uppercase tracking-wide mb-1", t.sidebarLabel)}>联系方式</p>
                <p className={cn("text-xs font-medium break-all", t.sidebarValue)}>{corpContactInfo}</p>
              </div>
            )}
            {talentContactInfo && currentUserRole === "corp" && (
              <div className="mb-3">
                <p className={cn("text-[10px] uppercase tracking-wide mb-1", t.sidebarLabel)}>联系方式</p>
                <p className={cn("text-xs font-medium break-all", t.sidebarValue)}>{talentContactInfo}</p>
              </div>
            )}
            <p className={cn("text-[10px] leading-relaxed", t.sidebarLabel)}>
              留言将在对方下次查看时收到提醒
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className={cn("flex-shrink-0 px-3 sm:px-6 py-4", t.header)}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black",
                t.headerAvatar
              )}
            >
              {partnerName[0]}
            </div>
            <div>
              <p className={cn("text-sm font-bold", t.headerTitle)}>
                {partnerName}
              </p>
              <p className={cn("text-[11px]", t.headerSub)}>项目协作留言板</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          className={cn(
            "flex-1 overflow-y-auto p-3 sm:p-6 space-y-5",
            t.messagesArea
          )}
        >
          {messages.length === 0 && (
            <div className={cn("text-center py-16", t.emptyText)}>
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm font-medium">发送第一条消息，开始项目协作</p>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = isMyMessage(msg);
            return (
              <div
                key={msg.id}
                className={cn("flex gap-3", isMine ? "flex-row-reverse" : "flex-row")}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0",
                    isMine ? t.myAvatar : t.theirAvatar
                  )}
                >
                  {isMine ? "我" : partnerName[0]}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[68%] rounded-2xl px-4 py-3",
                    isMine ? t.myBubble : t.theirBubble
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p
                    className={cn(
                      "text-[10px] mt-1.5",
                      isMine ? t.myTime : t.theirTime
                    )}
                  >
                    {formatRelativeTime(msg.sent_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className={cn("flex-shrink-0 px-3 sm:px-6 py-4", t.inputArea)}>
          <form onSubmit={sendMessage} className="flex flex-col gap-2">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (filterError) setFilterError("");
                }}
                placeholder="发送留言给对方..."
                className={cn(
                  "flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-colors",
                  t.input
                )}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-md shadow-indigo-100"
              >
                {sending ? "···" : "发送"}
              </button>
            </div>
            {filterError && (
              <p className="text-xs text-red-500 font-medium">{filterError}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function parseIntentDesc(text: string): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  let current: { key: string; lines: string[] } | null = null;
  for (const line of text.split("\n")) {
    const m = line.match(/^【(.+?)】(.*)$/);
    if (m) {
      if (current) result.push({ key: current.key, value: current.lines.join("\n").trim() });
      current = { key: m[1], lines: m[2] ? [m[2]] : [] };
    } else if (current && line.trim()) {
      current.lines.push(line);
    }
  }
  if (current) result.push({ key: current.key, value: current.lines.join("\n").trim() });
  return result;
}
