"use client";

import { useState, useEffect } from "react";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

const ALL_QUESTIONS = [
  {
    id: "q1",
    title: "如何用 AI 快速构建用户旅程地图？",
    difficulty: 2,
    maxDifficulty: 3,
    tags: ["产品设计", "用户研究"],
    desc: "使用 ChatGPT 等 AI 工具，在 30 分钟内为一款 SaaS 产品生成完整的用户旅程地图，包含关键触点和情感曲线。",
  },
  {
    id: "q2",
    title: "Prompt 优化：让 AI 生成可落地的产品方案",
    difficulty: 3,
    maxDifficulty: 3,
    tags: ["Prompt 工程", "产品"],
    desc: "通过迭代 Prompt，让 AI 输出一份包含功能列表、优先级评分、技术可行性分析的完整产品方案。",
  },
  {
    id: "q3",
    title: "用 AI 进行用户反馈的批量分类与总结",
    difficulty: 2,
    maxDifficulty: 3,
    tags: ["数据处理", "NLP"],
    desc: "将 100 条用户评论输入 AI，通过 Prompt 设计实现自动分类（Bug/建议/体验/夸赞）并输出结构化总结报告。",
  },
  {
    id: "q4",
    title: "AI 辅助产品原型的快速生成技巧",
    difficulty: 4,
    maxDifficulty: 4,
    tags: ["产品", "原型设计"],
    desc: "结合 AI 对话和 Figma 插件，在 2 小时内完成从需求描述到低保真原型的全流程，并输出可交互页面。",
  },
  {
    id: "q5",
    title: "用 AI 生成竞品深度分析报告",
    difficulty: 3,
    maxDifficulty: 4,
    tags: ["竞品分析", "策略"],
    desc: "设计多轮对话 Prompt，让 AI 从功能、定价、用户体验、增长策略四个维度深度对比三款竞品并输出报告。",
  },
  {
    id: "q6",
    title: "AI 辅助 OKR 目标拆解与执行计划",
    difficulty: 3,
    maxDifficulty: 4,
    tags: ["管理", "规划"],
    desc: "输入公司季度目标，通过 AI 拆解为可执行的 KR 指标，并为每个 KR 生成具体的周计划和里程碑节点。",
  },
  {
    id: "q7",
    title: "AI 驱动的增长实验设计",
    difficulty: 4,
    maxDifficulty: 4,
    tags: ["增长", "A/B 测试"],
    desc: "用 AI 快速生成 5 个可测试的增长假设，设计 A/B 测试方案，并预测每个实验的预期影响与成本。",
  },
  {
    id: "q8",
    title: "用 AI 撰写 TikTok 商品详情页文案",
    difficulty: 2,
    maxDifficulty: 4,
    tags: ["内容创作", "跨境"],
    desc: "给定一款出海产品，通过 Prompt 工程让 AI 生成符合 TikTok 用户习惯的商品描述、卖点提炼和 CTA 文案。",
  },
];

const PAGE_SIZE = 2;
const TOTAL_PAGES = Math.ceil(ALL_QUESTIONS.length / PAGE_SIZE);
const DAILY_LIMIT = 2;

function StarRow({ filled, max }: { filled: number; max: number }) {
  return (
    <span className="text-xs tracking-tight">
      {Array.from({ length: max }).map((_, i) =>
        i < filled
          ? <span key={i} className="text-yellow-400">★</span>
          : <span key={i} className="text-slate-700">★</span>
      )}
    </span>
  );
}

export function ClassicQuestions({ talentId }: { talentId: string }) {
  const [page, setPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [todayDone, setTodayDone] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeQ, setActiveQ] = useState<(typeof ALL_QUESTIONS)[0] | null>(null);
  const [userInput, setUserInput] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [filterError, setFilterError] = useState("");

  const todayKey = `classic_${talentId}_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    setMounted(true);
    const saved = JSON.parse(localStorage.getItem(todayKey) || "[]");
    setTodayDone(saved);
  }, [todayKey]);

  function goPage(dir: 1 | -1) {
    if (animating) return;
    setAnimating(true);
    setPage((p) => (p + dir + TOTAL_PAGES) % TOTAL_PAGES);
    setTimeout(() => setAnimating(false), 260);
  }

  const displayed = ALL_QUESTIONS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const remaining = DAILY_LIMIT - todayDone.length;

  function openQuestion(q: (typeof ALL_QUESTIONS)[0]) {
    if (remaining <= 0 && !todayDone.includes(q.id)) return;
    setActiveQ(q);
    setUserInput("");
    setAiReply("");
    setSubmitted(false);
    setFilterError("");
  }

  async function submitAnswer() {
    if (!userInput.trim() || !activeQ) return;

    const filter = checkSensitive(userInput);
    if (!filter.ok) {
      setFilterError(formatHitMessage(filter.hits));
      return;
    }
    setFilterError("");
    setLoadingAi(true);

    if (!todayDone.includes(activeQ.id)) {
      const next = [...todayDone, activeQ.id];
      setTodayDone(next);
      localStorage.setItem(todayKey, JSON.stringify(next));
    }

    try {
      const res = await fetch("/api/ai/practice-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeQ.title,
          desc: activeQ.desc,
          userInput,
        }),
      });
      const data = await res.json();
      setAiReply(data.content || "AI 暂时无法响应，请稍后再试。");
      setSubmitted(true);
    } catch {
      setAiReply("AI 服务暂不可用，请稍后再试。");
      setSubmitted(true);
    } finally {
      setLoadingAi(false);
    }
  }

  const statusText = !mounted
    ? ""
    : todayDone.length === 0
    ? "今日未进行 AI 协作练习"
    : todayDone.length >= DAILY_LIMIT
    ? "🎉 今日练习已完成！明日再来挑战新题目"
    : `已完成 ${todayDone.length} 题，还可练习 ${remaining} 题`;

  return (
    <>
      <div>
        {/* Header with inline progress */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-white">每日一练</h2>
              {/* Progress bars inline */}
              <div className="flex gap-1.5">
                {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-1.5 rounded-full transition-colors ${
                      mounted && i < todayDone.length ? "bg-sky-500" : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-600 tabular-nums">
                {mounted ? todayDone.length : 0}/{DAILY_LIMIT}
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              每日限选 2 题体验，AI 实时评估你的解题思路
              {mounted && todayDone.length === 0 && (
                <span className="text-sky-400 ml-2">· 立即打卡</span>
              )}
              {mounted && todayDone.length >= DAILY_LIMIT && (
                <span className="text-emerald-400 ml-2">· 今日已完成 🎉</span>
              )}
            </p>
          </div>

          {/* Compact pagination control */}
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-full px-3 py-1.5 border border-slate-700">
            <button
              onClick={() => goPage(-1)}
              className="w-6 h-6 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            >
              ‹
            </button>
            <span className="text-xs text-slate-400 font-mono px-1">
              {page + 1}/{TOTAL_PAGES}
            </span>
            <button
              onClick={() => goPage(1)}
              className="w-6 h-6 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>

        {/* 2 cards with fixed height */}
        <div
          className={`grid grid-cols-2 gap-4 transition-opacity duration-260 ${
            animating ? "opacity-0" : "opacity-100"
          }`}
        >
          {displayed.map((q) => {
            const isDone = mounted && todayDone.includes(q.id);
            const isLocked = mounted && remaining <= 0 && !isDone;
            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition-all h-48 flex flex-col ${
                  isDone
                    ? "bg-sky-900/10 border-sky-500/20"
                    : isLocked
                    ? "bg-slate-800/20 border-slate-800 opacity-40"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {q.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <StarRow filled={q.difficulty} max={q.maxDifficulty} />
                </div>

                <h4 className="font-bold text-white text-sm mb-2 leading-snug line-clamp-2">{q.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-4 h-8 line-clamp-2 overflow-hidden">{q.desc}</p>

                <div className="flex items-center justify-end mt-auto">
                  <button
                    onClick={() => !isLocked && openQuestion(q)}
                    disabled={isLocked}
                    className={`text-xs px-5 py-2 rounded-lg font-bold transition-all ${
                      isDone
                        ? "bg-slate-700/50 text-slate-400 cursor-default"
                        : isLocked
                        ? "bg-slate-700 text-slate-600 cursor-not-allowed"
                        : "bg-white text-slate-900 hover:bg-slate-100 shadow-sm"
                    }`}
                  >
                    {isDone ? "✓ 已练习" : isLocked ? "今日已达上限" : "开始练习"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice modal */}
      {activeQ && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
          onClick={(e) => e.target === e.currentTarget && !submitted && setActiveQ(null)}
        >
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
            <div
              className="px-6 py-5 border-b border-slate-700 flex justify-between items-start"
              style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                    经典 AI 协作题
                  </span>
                  <StarRow filled={activeQ.difficulty} max={activeQ.maxDifficulty} />
                </div>
                <h3 className="font-bold text-white text-base leading-snug">{activeQ.title}</h3>
              </div>
              <button
                onClick={() => setActiveQ(null)}
                className="text-slate-500 hover:text-white transition-colors text-lg ml-4 mt-0.5"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 uppercase mb-1.5">题目背景</p>
                <p className="text-sm text-slate-300 leading-relaxed">{activeQ.desc}</p>
              </div>

              {!submitted ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">你的解题思路</label>
                    <textarea
                      value={userInput}
                      onChange={(e) => { setUserInput(e.target.value); if (filterError) setFilterError(""); }}
                      rows={5}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-600 font-mono"
                      placeholder="描述你会如何用 AI 解决这道题，包括使用哪些工具、如何设计 Prompt、预期输出是什么..."
                    />
                    {filterError && (
                      <p className="mt-1.5 text-xs text-red-400 font-medium">{filterError}</p>
                    )}
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setActiveQ(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={submitAnswer}
                      disabled={!userInput.trim() || loadingAi}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingAi ? "AI 评估中..." : "提交并获取 AI 反馈"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase mb-1.5">你的作答</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{userInput}</p>
                  </div>
                  <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase mb-2">OPC.Agent 反馈</p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{aiReply}</p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setActiveQ(null)}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                    >
                      完成练习 ✓
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
