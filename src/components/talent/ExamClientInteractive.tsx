"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkSensitiveMultiple, formatHitMessage } from "@/lib/sensitive-filter";

interface Props {
  requirementId: string;
  questions: Array<{
    id: string;
    seq: number;
    title: string;
    description: string;
    weight: number;
  }>;
  missionBrief: string;
  aiPersonaId?: string;
  positionName?: string;
  coreTasks?: string;
}

function parseField(text: string, field: string): string {
  const regex = new RegExp(`【${field}】([^【]*)`, "s");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

export function ExamClientInteractive({ requirementId, questions, missionBrief, positionName, coreTasks }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>(
    () => Object.fromEntries(questions.map((_, i) => [i, ""]))
  );
  const [questionFiles, setQuestionFiles] = useState<Record<number, { name: string; url: string }[]>>(
    () => Object.fromEntries(questions.map((_, i) => [i, []]))
  );
  const [uploadingQ, setUploadingQ] = useState<number | null>(null);
  const [questionDragOver, setQuestionDragOver] = useState<number | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeQ, setActiveQ] = useState(0);
  const [filterError, setFilterError] = useState("");
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileFiles, setProfileFiles] = useState<{ name: string; url: string }[]>([]);
  const [profileNote, setProfileNote] = useState("");
  const [uploadingProfile, setUploadingProfile] = useState(false);

  const questionFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);

  const filledCount = Object.values(answers).filter((v) => v.trim()).length;
  const progress = Math.round((filledCount / questions.length) * 100);

  async function uploadFile(file: File, questionIdx: number) {
    setUploadingQ(questionIdx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      setQuestionFiles((prev) => ({
        ...prev,
        [questionIdx]: [...(prev[questionIdx] ?? []), { name: file.name, url: data.url }],
      }));
    } catch {
      alert("文件上传失败，请重试");
    } finally {
      setUploadingQ(null);
    }
  }

  function removeFile(questionIdx: number, fileIdx: number) {
    setQuestionFiles((prev) => ({
      ...prev,
      [questionIdx]: prev[questionIdx].filter((_, j) => j !== fileIdx),
    }));
  }

  async function uploadProfileFile(file: File) {
    if (profileFiles.length >= 2) {
      alert("最多上传2个附件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("文件大小不能超过2M");
      return;
    }
    setUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      setProfileFiles((prev) => [...prev, { name: file.name, url: data.url }]);
    } catch {
      alert("文件上传失败，请重试");
    } finally {
      setUploadingProfile(false);
    }
  }

  function removeProfileFile(fileIdx: number) {
    setProfileFiles((prev) => prev.filter((_, j) => j !== fileIdx));
  }

  function saveProfile() {
    setShowProfileDialog(false);
  }

  function openChecklist() {
    const allTexts = Object.values(answers).filter(Boolean);
    const filter = checkSensitiveMultiple(allTexts);
    if (!filter.ok) {
      setFilterError(formatHitMessage(filter.hits));
      return;
    }
    setFilterError("");
    const init: Record<string, boolean> = {};
    questions.forEach((q) => { init[`q_${q.id}`] = false; });
    init["check_format"] = false;
    init["check_complete"] = false;
    init["check_review"] = false;
    setChecked(init);
    setShowChecklist(true);
  }

  async function doSubmit() {
    if (submitting) return;
    setSubmitting(true);

    const answersMap: Record<string, string> = {};
    questions.forEach((q, i) => { answersMap[q.id] = answers[i] ?? ""; });

    const question_files: Record<string, { name: string; url: string }[]> = {};
    questions.forEach((q, i) => {
      if (questionFiles[i]?.length) {
        question_files[q.id] = questionFiles[i];
      }
    });

    const log = questions.map((q, i) => ({
      role: "user" as const,
      content: `[Q${q.seq}] ${answers[i] ?? ""}`,
      timestamp: new Date().toISOString(),
    }));

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirement_id: requirementId,
          conversation_log: log,
          answers: {
            ...answersMap,
            ...(Object.keys(question_files).length ? { question_files } : {}),
          },
        }),
      });
      const data = await res.json();
      router.push(`/talent/submitted/${data.id}`);
    } catch {
      alert("提交失败，请重试");
      setSubmitting(false);
    }
  }

  const allChecked = Object.values(checked).every(Boolean) && Object.keys(checked).length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top status bar */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">长效陪跑式考核</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-5 sm:border-l sm:border-slate-200">
            <div className="w-20 sm:w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 tabular-nums font-mono">{progress}%</span>
            <span className="hidden sm:inline text-xs text-slate-400">{filledCount}/{questions.length} 题</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {filterError && (
            <p className="text-xs text-red-500 font-medium text-right max-w-xs">{filterError}</p>
          )}
          <div className="flex gap-3">
    
            <button
              onClick={() => setShowExitDialog(true)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              退出
            </button>
            <button
              onClick={openChecklist}
              className="px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              确认提交 →
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Read-only task doc */}
        <div className="hidden md:block w-80 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-5 space-y-5">
            {positionName && (
              <div>
                <p className="text-[10px] font-bold text-violet-600 uppercase mb-1.5">▸ 项目名称</p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{positionName}</p>
              </div>
            )}

            {coreTasks && (
              <div>
                <p className="text-[10px] font-bold text-violet-600 uppercase mb-1.5">▸ 核心任务</p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{coreTasks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Workspace */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5">
          {questions.map((q, i) => (
            <div
              key={q.id}
              ref={(el) => { questionRefs.current[i] = el; }}
              className={`bg-white rounded-2xl border transition-all ${
                activeQ === i ? "border-violet-300 shadow-md shadow-violet-50" : "border-slate-200"
              }`}
            >
              {/* Question header */}
              <div
                className="px-5 py-4 border-b border-slate-100 cursor-pointer"
                onClick={() => setActiveQ(i)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {q.seq}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{q.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{q.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">权重 {q.weight}%</span>
                </div>
              </div>

              {/* Question body: textarea + file upload */}
              <div className="p-5 space-y-4">
                {/* Text answer */}
                <div>
                  <textarea
                    value={answers[i] ?? ""}
                    onChange={(e) => {
                      setAnswers((prev) => ({ ...prev, [i]: e.target.value }));
                      setActiveQ(i);
                    }}
                    rows={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 outline-none focus:border-violet-300 focus:bg-white transition-colors resize-none placeholder:text-slate-400"
                    placeholder={`针对"${q.title}"，输入你的解答思路和方案...`}
                  />
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] text-slate-400">{answers[i]?.length ?? 0} 字</span>
                    {answers[i]?.trim() && (
                      <span className="text-[10px] text-emerald-500 font-medium">✓ 已填写</span>
                    )}
                  </div>
                </div>

                {/* Per-question file upload */}
                <div className="border-t border-slate-100 pt-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-3 transition-colors cursor-pointer ${
                      questionDragOver === i
                        ? "border-violet-400 bg-violet-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => questionFileInputRefs.current[i]?.click()}
                    onDragOver={(e) => { e.preventDefault(); setQuestionDragOver(i); }}
                    onDragLeave={() => setQuestionDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setQuestionDragOver(null);
                      Array.from(e.dataTransfer.files).forEach((f) => uploadFile(f, i));
                    }}
                  >
                    <input
                      ref={(el) => { questionFileInputRefs.current[i] = el; }}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        Array.from(e.target.files ?? []).forEach((f) => uploadFile(f, i));
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400 text-base">📎</span>
                      <div>
                        <p className="text-xs font-medium text-slate-600">
                          {uploadingQ === i ? "上传中..." : "拖拽或点击上传附件"}
                        </p>
                        <p className="text-[10px] text-slate-400">PDF / 图片 / 文档，随本题一并提交</p>
                      </div>
                    </div>
                  </div>

                  {questionFiles[i]?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {questionFiles[i].map((f, j) => (
                        <div key={j} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1">
                          <span className="text-[11px] text-slate-600 max-w-[140px] truncate">{f.name}</span>
                          <button
                            onClick={() => removeFile(i, j)}
                            className="text-slate-400 hover:text-red-400 text-[10px] ml-0.5"
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
          ))}
          <div className="h-4" />
        </div>
      </div>

      {/* Self-check modal */}
      {showChecklist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">提交前自检</h3>
              <p className="text-xs text-slate-500 mt-1">完成所有勾选后，才可正式提交</p>
            </div>
            <div className="p-6 space-y-2.5 max-h-[55vh] overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">逐题检查</p>
              {questions.map((q) => (
                <label key={q.id} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[`q_${q.id}`]}
                    onChange={(e) => setChecked((prev) => ({ ...prev, [`q_${q.id}`]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-violet-500"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">
                    Q{q.seq}: {q.title} — 已完成作答
                  </span>
                </label>
              ))}
              <div className="pt-3 border-t border-slate-100 mt-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">通用检查</p>
                {[
                  { key: "check_format", label: "答案格式符合要求" },
                  { key: "check_complete", label: "答案内容完整，无明显遗漏" },
                  { key: "check_review", label: "已复查全部内容，确认无误" },
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group mb-2.5">
                    <input
                      type="checkbox"
                      checked={!!checked[item.key]}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-violet-500"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowChecklist(false)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                返回修改
              </button>
              <button
                onClick={doSubmit}
                disabled={!allChecked || submitting}
                className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? "提交中..." : "确认提交成果"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit confirmation dialog */}
      {showExitDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">确认退出考核？</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 leading-relaxed">
                退出后将不保留任何答案，需要重新开始作答。
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowExitDialog(false)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                继续作答
              </button>
              <button
                onClick={() => router.push("/talent/challenges")}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile upload dialog */}
      {showProfileDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">上传个人/机构OPC简介</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                可上传与该业务相关的过往案例资料，最多2个附件，每个不超过2M
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* File upload area */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">附件上传</p>
                <div
                  onClick={() => profileFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-xl p-4 transition-colors cursor-pointer"
                >
                  <input
                    ref={profileFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadProfileFile(file);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📎</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {uploadingProfile ? "上传中..." : "点击上传附件"}
                      </p>
                      <p className="text-xs text-slate-500">支持 PDF、Word、图片格式</p>
                    </div>
                  </div>
                </div>
                {profileFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {profileFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                        <span className="text-xs text-violet-700 max-w-[200px] truncate">{f.name}</span>
                        <button
                          onClick={() => removeProfileFile(i)}
                          className="text-violet-400 hover:text-red-500 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Note textarea */}
              <div>
                <p className="text-xs font-medium text-slate-700 mb-2">给考核企业的备注</p>
                <textarea
                  value={profileNote}
                  onChange={(e) => setProfileNote(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:border-violet-300 focus:bg-white transition-colors resize-none placeholder:text-slate-400"
                  placeholder="可以简单介绍自己的优势、经验或对项目的理解..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowProfileDialog(false)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveProfile}
                className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold transition-colors"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
