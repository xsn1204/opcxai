"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConversationMessage } from "@/types";
import { cn } from "@/lib/utils";
import { checkSensitive, checkSensitiveMultiple, formatHitMessage } from "@/lib/sensitive-filter";

interface ExamClientProps {
  requirementId: string;
  questions: Array<{
    id: string;
    seq: number;
    title: string;
    description: string;
    weight: number;
  }>;
  missionBrief: string;
  submissionId: string | null;
}

export function ExamClient({ requirementId, questions, missionBrief }: ExamClientProps) {
  const router = useRouter();

  // Per-question message history
  const [allMessages, setAllMessages] = useState<Record<number, ConversationMessage[]>>(() => {
    const init: Record<number, ConversationMessage[]> = {};
    questions.forEach((q, i) => {
      init[i] = [
        {
          role: "assistant",
          content: `📋 Q${q.seq}: ${q.title}\n\n${q.description}\n\n---\n请输入你对本题的解题思路，OPC.Agent 全程辅助。`,
          timestamp: new Date().toISOString(),
        },
      ];
    });
    return init;
  });

  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAnswers, setConfirmedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [portfolioFiles, setPortfolioFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterError, setFilterError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMessages = allMessages[currentQ] ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, currentQ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function switchQuestion(idx: number) {
    setCurrentQ(idx);
    setInput("");
    // Each question keeps its own message history
  }

  function confirmAnswer() {
    const userMsgs = currentMessages.filter((m) => m.role === "user");
    const lastUserMsg = userMsgs[userMsgs.length - 1]?.content ?? "";
    if (!lastUserMsg) return;

    setConfirmedAnswers((prev) => ({ ...prev, [currentQ]: lastUserMsg }));
    setAllMessages((prev) => ({
      ...prev,
      [currentQ]: [
        ...(prev[currentQ] ?? []),
        {
          role: "assistant",
          content: `✅ 第 ${questions[currentQ]?.seq} 题回答已确认。可继续切换其他题目或补充完善。`,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      setPortfolioFiles((prev) => [...prev, { name: file.name, url: data.url }]);
    } catch {
      alert("文件上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const filter = checkSensitive(input.trim());
    if (!filter.ok) {
      setFilterError(formatHitMessage(filter.hits));
      return;
    }
    setFilterError("");

    const userMsg: ConversationMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...currentMessages, userMsg];
    setAllMessages((prev) => ({ ...prev, [currentQ]: newMessages }));
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: { missionBrief, questions, currentQuestion: questions[currentQ] },
        }),
      });
      if (!response.ok) throw new Error("AI 服务暂时不可用");
      const data = await response.json();
      setAllMessages((prev) => ({
        ...prev,
        [currentQ]: [
          ...(prev[currentQ] ?? []),
          { role: "assistant", content: data.content, timestamp: new Date().toISOString() },
        ],
      }));
    } catch {
      setAllMessages((prev) => ({
        ...prev,
        [currentQ]: [
          ...(prev[currentQ] ?? []),
          { role: "assistant", content: "抱歉，AI 服务出现问题，请稍后重试。", timestamp: new Date().toISOString() },
        ],
      }));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleSubmit() {
    if (submitting) return;

    // 提交前检查所有已确认/已作答的内容
    const allUserTexts: string[] = [];
    questions.forEach((_, i) => {
      const confirmed = confirmedAnswers[i];
      if (confirmed) {
        allUserTexts.push(confirmed);
      } else {
        const msgs = allMessages[i] ?? [];
        msgs.filter((m) => m.role === "user").forEach((m) => allUserTexts.push(m.content));
      }
    });
    const filter = checkSensitiveMultiple(allUserTexts);
    if (!filter.ok) {
      setFilterError(formatHitMessage(filter.hits));
      return;
    }
    setFilterError("");
    setSubmitting(true);

    // Collect answers: confirmed first, fall back to last user message
    const answers: Record<string, string> = {};
    questions.forEach((q, i) => {
      const confirmed = confirmedAnswers[i];
      if (confirmed) {
        answers[q.id] = confirmed;
      } else {
        const msgs = allMessages[i] ?? [];
        const lastUser = [...msgs].reverse().find((m) => m.role === "user");
        if (lastUser) answers[q.id] = lastUser.content;
      }
    });

    // Flatten all conversations tagged by question
    const fullLog: ConversationMessage[] = [];
    questions.forEach((q, i) => {
      (allMessages[i] ?? []).forEach((m) =>
        fullLog.push({ ...m, content: `[Q${q.seq}] ${m.content}` })
      );
    });

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement_id: requirementId,
          conversation_log: fullLog,
          answers: { ...answers, portfolio_files: portfolioFiles.map((f) => f.url) },
        }),
      });
      if (!response.ok) throw new Error("提交失败");
      const data = await response.json();
      router.push(`/talent/submitted/${data.id}`);
    } catch {
      alert("提交失败，请重试");
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const confirmedCount = Object.keys(confirmedAnswers).length;
  const currentQuestion = questions[currentQ];
  const hasUserInput = currentMessages.some((m) => m.role === "user");
  const isCurrentConfirmed = confirmedAnswers[currentQ] !== undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-900">
      {/* Header */}
      <header
        className="px-6 py-3 flex justify-between items-center flex-shrink-0"
        style={{ background: "rgba(30, 41, 59, 0.5)", borderBottom: "1px solid rgba(51, 65, 85, 0.8)" }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-green-500">拟真环境: 联机中</span>
          </div>
          <div className="text-xs text-slate-500 border-l border-slate-700 pl-6">
            当前题目:{" "}
            <span className="text-slate-300">
              {currentQuestion?.title ?? "总体作答"} ({currentQ + 1}/{questions.length})
            </span>
          </div>
          <div className="text-xs text-emerald-400 border-l border-slate-700 pl-6">
            已确认: {confirmedCount}/{questions.length} 题
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">剩余时间</p>
            <p className={cn("text-xl font-mono font-bold", timeLeft < 600 ? "text-red-400" : "text-orange-400")}>
              {formatTime(timeLeft)}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-colors"
          >
            {submitting ? "提交中..." : "提交全部成果"}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left: Mission Brief + Questions + Upload */}
        <div className="col-span-3 overflow-y-auto">
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex flex-col gap-4" style={{ minHeight: "100%" }}>
            {/* Mission brief */}
            <div>
              <h3 className="text-indigo-400 text-[10px] font-bold mb-2 uppercase tracking-tighter italic"># Mission_Brief</h3>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                <p className="text-xs leading-relaxed text-slate-400">{missionBrief}</p>
              </div>
            </div>

            {/* Question list */}
            <div>
              <h3 className="text-orange-400 text-[10px] font-bold mb-2 uppercase tracking-tighter italic"># 题目列表</h3>
              <div className="space-y-1.5">
                {questions.map((q, i) => {
                  const msgs = allMessages[i] ?? [];
                  const userCount = msgs.filter((m) => m.role === "user").length;
                  const confirmed = confirmedAnswers[i] !== undefined;
                  return (
                    <button
                      key={q.id}
                      onClick={() => switchQuestion(i)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl border text-xs transition-colors",
                        currentQ === i
                          ? "bg-indigo-600/20 border-indigo-500/60 text-indigo-200"
                          : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-mono text-indigo-400 font-bold text-[10px]">Q{q.seq}</span>
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full",
                            confirmed
                              ? "bg-emerald-500/20 text-emerald-400"
                              : userCount > 0
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-slate-700 text-slate-500"
                          )}
                        >
                          {confirmed ? "✓ 已确认" : userCount > 0 ? `作答中` : "未开始"}
                        </span>
                      </div>
                      <p className="leading-snug text-[11px] font-medium">{q.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current question detail */}
            {currentQuestion && (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-indigo-500/20">
                <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1.5">当前题目详情</p>
                <p className="text-xs font-bold text-slate-200 mb-1.5">
                  Q{currentQuestion.seq}: {currentQuestion.title}
                </p>
                <p className="text-xs leading-relaxed text-slate-400">{currentQuestion.description}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">权重: {currentQuestion.weight}%</p>
              </div>
            )}

            {/* Portfolio upload */}
            <div className="border-t border-slate-700 pt-3">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">📎 上传过往作品</p>
              <p className="text-[10px] text-slate-600 mb-2 leading-relaxed">
                支持 PDF、图片、视频、压缩包等，将随答题内容一并提交给企业方
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.zip,.docx,.xlsx,.pptx"
                className="hidden"
                onChange={(e) => {
                  Array.from(e.target.files ?? []).forEach(uploadFile);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 text-xs transition-colors disabled:opacity-50"
              >
                {uploading ? "上传中..." : "+ 选择文件"}
              </button>
              {portfolioFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {portfolioFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800 rounded px-2 py-1">
                      <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{f.name}</span>
                      <button
                        onClick={() => setPortfolioFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-slate-600 hover:text-red-400 ml-1 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Terminal */}
        <div className="col-span-6 flex flex-col overflow-hidden">
          <div
            className="rounded-2xl border border-indigo-500/30 flex-1 flex flex-col overflow-hidden glow-indigo"
            style={{ backgroundColor: "#0b1120" }}
          >
            {/* Terminal header with per-question confirm button */}
            <div className="bg-slate-800 p-3 flex items-center justify-between border-b border-slate-700 flex-shrink-0">
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60"></span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Q{currentQuestion?.seq} · {currentQuestion?.title}
              </span>
              <button
                onClick={confirmAnswer}
                disabled={!hasUserInput || isCurrentConfirmed}
                className={cn(
                  "text-xs px-3 py-1 rounded-lg border transition-colors",
                  isCurrentConfirmed
                    ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 cursor-default"
                    : "bg-slate-700 border-slate-600 text-slate-400 hover:bg-emerald-600/20 hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
                )}
              >
                {isCurrentConfirmed ? "✓ 已确认此题" : "确认此题回答"}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-6 font-mono text-sm overflow-y-auto space-y-5">
              {currentMessages.map((msg, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {msg.role === "user" ? (
                    <>
                      <span className="text-indigo-400 text-xs">Human@User:~$</span>
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-slate-200 text-xs leading-relaxed">
                        {msg.content}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-purple-400 text-xs">AI_Copilot@OPC:~$</span>
                      <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-800/40 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex flex-col gap-1">
                  <span className="text-purple-400 text-xs">AI_Copilot@OPC:~$</span>
                  <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-800/40">
                    <span className="text-indigo-400 text-xs flex items-center gap-2">
                      <span className="animate-pulse">▋</span>
                      正在生成回复...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-slate-900 border-t border-slate-700 flex-shrink-0">
              {filterError && (
                <p className="px-4 pt-2 text-xs text-red-400 font-medium">{filterError}</p>
              )}
              <div className="p-4 flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); if (filterError) setFilterError(""); }}
                onKeyDown={handleKeyDown}
                className="bg-transparent flex-1 outline-none text-indigo-400 font-mono text-sm placeholder:text-slate-600"
                placeholder={`针对 Q${currentQuestion?.seq} 输入思路... (Enter 发送)`}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="text-indigo-500 hover:text-indigo-300 disabled:text-slate-700 transition-colors"
              >
                ↵
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Progress tracking */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl flex-1 overflow-y-auto">
            <h3 className="text-orange-400 text-xs font-bold mb-4 uppercase tracking-widest italic">
              // 答题进度
            </h3>
            <div className="space-y-2.5 mb-6">
              {questions.map((q, i) => {
                const msgs = allMessages[i] ?? [];
                const userMsgCount = msgs.filter((m) => m.role === "user").length;
                const isConfirmed = confirmedAnswers[i] !== undefined;
                const isActive = i === currentQ;
                return (
                  <button
                    key={q.id}
                    onClick={() => switchQuestion(i)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-colors",
                      isActive
                        ? "border-indigo-500/50 bg-indigo-600/10"
                        : "border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className={cn("text-xs font-bold", isActive ? "text-indigo-300" : "text-slate-400")}>
                        Q{q.seq}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          isConfirmed
                            ? "bg-emerald-500/20 text-emerald-400"
                            : userMsgCount > 0
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-slate-700 text-slate-500"
                        )}
                      >
                        {isConfirmed ? "✓ 已确认" : userMsgCount > 0 ? `${userMsgCount} 条对话` : "未开始"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">{q.title}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">权重 {q.weight}%</p>
                  </button>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="border-t border-slate-700 pt-4">
              <p className="text-[10px] text-slate-500 mb-2 uppercase">整体进度</p>
              <div className="flex gap-1.5 mb-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => switchQuestion(i)}
                    className={cn(
                      "flex-1 h-2 rounded-full transition-colors",
                      i === currentQ
                        ? "bg-indigo-500"
                        : confirmedAnswers[i] !== undefined
                        ? "bg-emerald-500"
                        : (allMessages[i] ?? []).filter((m) => m.role === "user").length > 0
                        ? "bg-orange-400"
                        : "bg-slate-700"
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-600">
                {confirmedCount}/{questions.length} 题已确认
                {portfolioFiles.length > 0 && ` · ${portfolioFiles.length} 份作品`}
              </p>
            </div>

            <div className="mt-4 bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-xl">
              <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">操作说明</p>
              <ul className="text-[11px] leading-relaxed text-slate-500 space-y-1">
                <li>· 左侧点击题目可自由切换</li>
                <li>· 每题对话独立保存</li>
                <li>· 点击"确认此题回答"锁定答案</li>
                <li>· 左下角可上传过往作品</li>
                <li>· "提交全部成果"一键发送</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
