"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }) + " 日";
}

interface Requirement {
  id: string;
  title: string;
  status: string;
  intent_desc: string;
  deadline: string | null;
  created_at: string;
  req_modules: string;
  submission_count: number;
  pending_count: number;
  intent_count: number;
  unread_collab_count: number;
}

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

interface Props {
  requirements: Requirement[];
  statusConfig: Record<string, StatusConfig>;
  moduleLabels: Record<string, { label: string; icon: string }>;
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

export function RequirementsList({ requirements: initial, statusConfig, moduleLabels }: Props) {
  const [requirements, setRequirements] = useState(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmTarget = requirements.find((r) => r.id === confirmId);

  async function doDelete() {
    if (!confirmId || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/requirements/${confirmId}`, { method: "DELETE" });
      if (res.ok) {
        setRequirements((prev) => prev.filter((r) => r.id !== confirmId));
        setConfirmId(null);
      } else {
        alert("删除失败，请重试");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  }

  if (!requirements.length) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-lg text-slate-500 mb-2">还没有发布任何需求</p>
        <Link href="/corp/new" className="mt-4 inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold">
          发布第一个需求
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requirements.map((req) => {
          const status = statusConfig[req.status] ?? statusConfig.draft;
          const coreTask = parseIntentDesc(req.intent_desc).find((s) => s.key === "核心任务")?.value ?? req.intent_desc;
          const modules: string[] = JSON.parse(req.req_modules || "[]");
          return (
            <div key={req.id} className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-6 shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("text-xs px-3 py-1 rounded-full font-medium", status.bg, status.text)}>
                      {status.label}
                    </span>
                    {req.deadline && (
                      <span className="text-xs text-slate-400">截至 {formatDate(req.deadline)}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{req.title}</h3>
                  {modules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {modules.map((id) => {
                        const m = moduleLabels[id];
                        return m ? (
                          <span key={id} className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                            {m.icon} {m.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <p className="text-sm text-slate-500 line-clamp-2">{coreTask}</p>
                </div>
                <div className="ml-8 flex flex-col items-end justify-between gap-2 self-stretch">
                  <div className="relative">
                    <Link
                      href={`/corp/requirements/${req.id}/submissions`}
                      className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                    >
                      查看方案 →
                    </Link>
                    {(req.pending_count > 0 || req.intent_count > 0 || req.unread_collab_count > 0) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">
                        {req.intent_count > 0
                          ? `${req.intent_count} 份意向待回应`
                          : req.unread_collab_count > 0
                          ? `${req.unread_collab_count} 条协作状态更新`
                          : `已收到 ${req.submission_count} 份方案`}
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmId(req.id)}
                      className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm delete modal */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">确认删除需求</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                删除后，该需求及相关的考核题目、候选人方案将全部移除，且无法恢复。
              </p>
            </div>
            {confirmTarget && (
              <div className="px-6 py-4 bg-red-50 border-b border-red-100">
                <p className="text-sm font-medium text-red-700 truncate">「{confirmTarget.title}」</p>
              </div>
            )}
            <div className="px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
