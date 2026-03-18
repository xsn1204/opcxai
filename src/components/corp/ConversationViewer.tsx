"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  seq: number;
  title: string;
}

interface Message {
  role: string;
  content: string;
}

interface Props {
  questions: Question[];
  questionLogsMap: Record<string, Message[]>;
}

export function ConversationViewer({ questions, questionLogsMap }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (questions.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">暂无题目数据</p>;
  }

  const activeQ = questions[activeIdx];
  const logs = questionLogsMap[activeQ.id] ?? [];
  const userCount = logs.filter((m) => m.role === "user").length;

  return (
    <div>
      {/* Question header with prev/next arrows */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full shrink-0">
            Q{activeQ.seq} / {questions.length}
          </span>
          <p className="text-sm font-medium text-slate-700 truncate">{activeQ.title}</p>
        </div>

        <button
          onClick={() => setActiveIdx((i) => i - 1)}
          disabled={activeIdx === 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          ←
        </button>

        <span className="text-[10px] text-slate-400 shrink-0">{userCount} 轮对话</span>

        <button
          onClick={() => setActiveIdx((i) => i + 1)}
          disabled={activeIdx === questions.length - 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          →
        </button>
      </div>

      {/* Messages */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 italic">暂无对话记录</p>
          ) : (
            logs.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-xl text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-slate-50 border border-slate-200 text-slate-700"
                    : "bg-indigo-50 border border-indigo-100 text-indigo-800"
                )}
              >
                <span className="font-bold mr-2 text-[10px] uppercase tracking-wide">
                  {msg.role === "user" ? "候选人" : "OPC.Agent"}
                </span>
                {msg.content.slice(0, 500)}{msg.content.length > 500 && "…"}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
