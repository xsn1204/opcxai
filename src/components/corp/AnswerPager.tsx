"use client";

import { useState } from "react";

interface Question {
  id: string;
  seq: number;
  title: string;
}

interface Props {
  questions: Question[];
  submissionAnswers: Record<string, unknown>;
  questionFilesMap: Record<string, { name: string; url: string }[]>;
  isInteractiveMode: boolean;
}

export function AnswerPager({ questions, submissionAnswers, questionFilesMap, isInteractiveMode }: Props) {
  const [current, setCurrent] = useState(0);

  if (questions.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">暂无题目数据</p>;
  }

  const q = questions[current];
  const text = typeof submissionAnswers[q.id] === "string" ? submissionAnswers[q.id] as string : "";
  const files = questionFilesMap[q.id] ?? [];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1.5 mb-5">
        {questions.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setCurrent(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              idx === current
                ? isInteractiveMode
                  ? "bg-violet-600 text-white"
                  : "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Q{item.seq}
          </button>
        ))}
      </div>

      {/* Question */}
      <p className="text-sm font-semibold text-slate-700 mb-3">{q.title}</p>

      {/* Answer */}
      {text ? (
        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">{text}</p>
      ) : (
        <p className="text-xs text-slate-400 italic">未作答</p>
      )}

      {/* Attachments */}
      {files.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">附件</p>
          <div className="flex flex-wrap gap-2">
            {files.map((f, idx) => (
              <a
                key={idx}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                download={f.name}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
              >
                📎 {f.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Prev / Next */}
      {questions.length > 1 && (
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setCurrent((p) => Math.max(0, p - 1))}
            disabled={current === 0}
            className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
          >
            ← 上一题
          </button>
          <span className="text-xs text-slate-400">{current + 1} / {questions.length}</span>
          <button
            onClick={() => setCurrent((p) => Math.min(questions.length - 1, p + 1))}
            disabled={current === questions.length - 1}
            className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
          >
            下一题 →
          </button>
        </div>
      )}
    </div>
  );
}
