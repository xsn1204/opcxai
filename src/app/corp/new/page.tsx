"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAPABILITY_MODULES } from "@/types";
import { track } from "@/lib/analytics";

// ─── OPC Diagnosis Types ──────────────────────────────────────────────────────

interface DiagDimension {
  business: string;
  ai_collaboration: number;
  independence: number;
  standardization: number;
  result_orientation: number;
  overall: number;
  suitable: boolean;
  reason: string;
  project_name: string;
  core_task_description: string;
}

interface DiagBrd {
  title: string;
  background: string;
  objectives: string[];
  deliverables: string[];
  requirements: string;
  timeline: string;
  budget: string;
}

interface DiagResult {
  summary: string;
  dimensions: DiagDimension[];
  recommended: string[];
  brd: DiagBrd;
}

interface DiagRecord {
  id: string;
  business_input: string;
  diagnosis_text: string;
  result_json: string;
  created_at: string;
}

type FormStep = 1 | 2 | 3;
type ExamMode = "result_delivery" | "interactive" | "no_exam";

interface ExamQuestion {
  title: string;
  description: string;
  weight: number;
  seq: number;
}

// ─── Mock report visuals ─────────────────────────────────────────────────────

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CorpNewRequirementPage() {
  const router = useRouter();
  const [step, setStep] = useState<FormStep>(1);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  // Clear loading states on mount to avoid stale state from prior navigation
  useEffect(() => {
    setPublishing(false);
    setGeneratingQuestions(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1 — Business Definition
  const [positionName, setPositionName] = useState("");
  const [coreTasks, setCoreTasks] = useState("");
  const [reqModules, setReqModules] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [budgetNegotiable, setBudgetNegotiable] = useState(false);
  const [deadline, setDeadline] = useState("");

  // Step 2 — Smart Recommendation
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    mode: ExamMode;
    reason: string;
    confidence: number;
    keyword: string;
  } | null>(null);

  // Step 3 — Refinement
  const [examMode, setExamMode] = useState<ExamMode>("result_delivery");
  const [businessStage, setBusinessStage] = useState("growth");
  const [complexity, setComplexity] = useState("mid");
  const [collaborationMode, setCollaborationMode] = useState<"offline" | "hosted">("offline");
  // Result delivery config
  const [deliveryFormats, setDeliveryFormats] = useState<string[]>(["文本文档"]);
  const [backgroundText, setBackgroundText] = useState("");
  // Interactive config
  const [painPoints, setPainPoints] = useState("");
  const [coreObjective, setCoreObjective] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>(["识别候选人是否了解并懂得搭建智能体"]);
  const [newKeyPoint, setNewKeyPoint] = useState("");

  // Step 4 — Questions
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [polishingTask, setPolishingTask] = useState(false);

  // ── OPC Diagnosis Panel ──
  const [showDiag, setShowDiag] = useState(false);
  const [diagView, setDiagView] = useState<"menu" | "input" | "running" | "result">("menu");
  const [diagInput, setDiagInput] = useState("");
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null);
  const [diagHistory, setDiagHistory] = useState<DiagRecord[]>([]);
  const [diagHistoryLoading, setDiagHistoryLoading] = useState(false);
  const [diagHistoryRecord, setDiagHistoryRecord] = useState<DiagRecord | null>(null);
  const [diagSelectedCard, setDiagSelectedCard] = useState<DiagDimension | null>(null);

  // ── AI 润色核心任务 ──
  async function polishTask() {
    if (!coreTasks.trim() || polishingTask) return;
    setPolishingTask(true);
    try {
      const res = await fetch("/api/ai/polish-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreTask: coreTasks, projectName: positionName }),
      });
      const data = await res.json();
      if (res.ok && data.polished) {
        setCoreTasks(data.polished);
      }
    } catch { /* ignore */ } finally {
      setPolishingTask(false);
    }
  }

  // ── Step 1 submit ──
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!positionName.trim() || !coreTasks.trim()) {
      setError("请填写项目名称与任务描述");
      return;
    }
    if (reqModules.length === 0) {
      setError("请至少选择 1 个所需能力模块");
      return;
    }
    if (!deadline) {
      setError("请填写交付截止日期");
      return;
    }
    if (!budgetNegotiable) {
      if (!budgetMin || !budgetMax) {
        setError("请填写项目预算范围（最低与最高）");
        return;
      }
      if (Number(budgetMin) <= 0 || Number(budgetMax) <= 0) {
        setError("项目预算必须为正数");
        return;
      }
      if (Number(budgetMin) > Number(budgetMax)) {
        setError("预算最低值不能大于最高值");
        return;
      }
    }
    setError("");
    setStep(2);
    setRecommendation(null);
    setTimeout(() => runAnalysis(), 300);
  }

  async function runAnalysis() {
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1800));

    const text = (positionName + " " + coreTasks).toLowerCase();
    let mode: ExamMode = "result_delivery";
    let keyword = "";
    let reason = "";
    let confidence = 78;

    if (
      text.includes("维护") || text.includes("调试") || text.includes("沟通") ||
      text.includes("需求变更") || text.includes("迭代") || text.includes("测试") ||
      text.includes("配合") || text.includes("协作")|| text.includes("合作") || text.includes("持续")
    ) {
      mode = "interactive";
      keyword = text.includes("维护") ? "存量代码维护" : text.includes("沟通") ? "跨团队沟通协作" : "需求动态迭代";
      reason = `检测到项目涉及「${keyword}」场景，此类岗位更注重候选人的合作协同能力，建议开启【长效陪跑式】模式，匹配度更高。`;
      confidence = 91;
    } else if (
      text.includes("文案") || text.includes("内容") || text.includes("报告") ||
      text.includes("方案") || text.includes("策略") || text.includes("分析") ||
      text.includes("数据") || text.includes("产品")
    ) {
      mode = "result_delivery";
      keyword = text.includes("文案") ? "内容创作输出" : text.includes("数据") ? "数据分析报告" : "产品方案交付";
      reason = `检测到项目为「${keyword}」类型，候选人需提交具体交付物，建议使用【结果交付式】模式，可量化评估输出质量。`;
      confidence = 88;
    } else {
      keyword = "结构化任务执行";
      reason = `根据岗位描述，项目以「结构化产出」为核心交付，【结果交付式】模式能更精准衡量候选人的完成度与专业性。`;
      confidence = 60;
    }

    setRecommendation({ mode, reason, confidence, keyword });
    setExamMode(mode);
    setAnalyzing(false);
  }

  // ── Step 2 submit → move to step 3, generate questions client-side ──
  function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep(3);
    if (examMode !== "no_exam") {
      generateQuestions();
    }
  }

  async function generateQuestions() {
    setGeneratingQuestions(true);
    const intentDesc = `【项目】${positionName}\n【核心任务】${coreTasks}\n【考核模式】${examMode === "result_delivery" ? "结果交付式" : examMode === "interactive" ? "长效陪跑式" : "无前置考核"}\n【协作模式】${collaborationMode === "offline" ? "深度定制模式" : "平台交付模式"}\n${
      examMode === "result_delivery"
        ? `【交付格式】${deliveryFormats.join("、")}${backgroundText?.trim() ? `\n【背景信息】${backgroundText}` : ""}`
        : examMode === "interactive"
        ? `【业务现状/痛点】${painPoints}\n【业务目标】${coreObjective}\n【考查要点】${keyPoints.join("；")}`
        : ""
    }`;
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentDesc,
          title: positionName,
          businessStage,
          complexity,
          questionTypes: examMode === "result_delivery" ? ["prompt", "solution"] : ["interactive"],
          capabilityWeights: { execution: 40, strategy: 30, communication: 30 },
          ...(examMode === "result_delivery" && { backgroundText, deliveryFormats }),
          ...(examMode === "interactive" && { painPoints, coreObjective, keyPoints }),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } catch {
      setError("AI 出题失败，请重试");
    } finally {
      setGeneratingQuestions(false);
    }
  }

  async function handlePublish() {
    if (examMode !== "no_exam" && questions.length === 0) return;
    setPublishing(true);
    try {
      const intentDesc = `【项目】${positionName}\n【核心任务】${coreTasks}\n【考核模式】${examMode === "result_delivery" ? "结果交付式" : examMode === "interactive" ? "长效陪跑式" : "无前置考核"}\n【协作模式】${collaborationMode === "offline" ? "深度定制模式" : "平台交付模式"}\n${
        examMode === "result_delivery"
          ? `【交付格式】${deliveryFormats.join("、")}${backgroundText?.trim() ? `\n【背景信息】${backgroundText}` : ""}`
          : examMode === "interactive"
          ? `【业务现状/痛点】${painPoints}\n【业务目标】${coreObjective}\n【考查要点】${keyPoints.join("；")}`
          : ""
      }`;

      // 1. Create requirement (will be immediately published, so draft is transient)
      const createRes = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: positionName,
          intent_desc: intentDesc,
          ai_tags: [examMode === "result_delivery" ? "结果交付" : examMode === "interactive" ? "长效陪跑" : "无前置考核", positionName],
          business_stage: businessStage,
          complexity,
          budget_min: budgetNegotiable ? null : (budgetMin ? Number(budgetMin) : null),
          budget_max: budgetNegotiable ? null : (budgetMax ? Number(budgetMax) : null),
          deadline: deadline || null,
          question_types: examMode === "result_delivery" ? ["prompt", "solution"] : examMode === "interactive" ? ["interactive"] : ["no_exam"],
          capability_weights: { execution: 40, strategy: 30, communication: 30 },
          req_modules: reqModules,
        }),
      });
      if (!createRes.ok) throw new Error("创建失败");
      const { id } = await createRes.json();

      // 2. Publish (save questions + set active)
      const publishRes = await fetch(`/api/requirements/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      if (!publishRes.ok) throw new Error("发布失败");

      track("requirement_created", { requirement_id: id, exam_mode: examMode });
      router.push("/corp/requirements");
    } catch {
      setError("发布失败，请重试");
    } finally {
      setPublishing(false);
    }
  }

  function updateQuestion(index: number, field: keyof ExamQuestion, value: string | number) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)));
  }

  const STEP_LABELS = ["业务定义", "智能配置", "确认题目"];

  // ── OPC Diagnosis handlers ──
  const loadDiagHistory = useCallback(async () => {
    setDiagHistoryLoading(true);
    try {
      const res = await fetch("/api/ai/diagnose/history");
      if (res.ok) {
        const data = await res.json();
        setDiagHistory(data.records ?? []);
      }
    } finally {
      setDiagHistoryLoading(false);
    }
  }, []);

  function openDiagPanel() {
    setShowDiag(true);
    setDiagView("menu");
    setDiagHistoryRecord(null);
    loadDiagHistory();
  }

  function startNewDiag() {
    setDiagInput("");
    setDiagResult(null);
    setDiagSelectedCard(null);
    setDiagView("input");
  }

  async function runDiagnosis() {
    if (!diagInput.trim()) return;
    setDiagView("running");
    setDiagResult(null);
    setDiagSelectedCard(null);

    try {
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessInput: diagInput }),
      });

      if (!res.ok || !res.body) {
        setDiagView("input");
        return;
      }

      // Read SSE stream — server keeps connection alive during the AI call,
      // then sends a single "done" event with the full result.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: DiagResult | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const msg = JSON.parse(raw);
            if (msg.t === "done") finalResult = (msg.r as DiagResult) ?? null;
            if (msg.t === "error") { setDiagView("input"); return; }
          } catch { /* ignore malformed lines */ }
        }
      }

      setDiagResult(finalResult);
      setDiagView("result");
      loadDiagHistory();
    } catch {
      setDiagView("input");
    }
  }

  function applyBrdToForm(brd: DiagBrd) {
    setPositionName(brd.title);
    const tasks = [
      `【需求背景】${brd.background}`,
      `【核心目标】${brd.objectives.join("、")}`,
      `【交付物】${brd.deliverables.join("、")}`,
      `【核心要求】${brd.requirements}`,
      `【建议周期】${brd.timeline}`,
    ].join("\n");
    setCoreTasks(tasks);
    // Auto-set budget from BRD hint
    const budgetMatch = brd.budget.match(/(\d+)[^0-9]*[-~–至到]?[^0-9]*(\d+)/);
    if (budgetMatch) {
      setBudgetMin(budgetMatch[1]);
      setBudgetMax(budgetMatch[2]);
    }
    setShowDiag(false);
    setStep(1);
  }

  function applyCardToForm(card: DiagDimension) {
    setPositionName(card.project_name || card.business);
    setCoreTasks(card.core_task_description || "");
    setShowDiag(false);
    setStep(1);
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 w-full max-w-7xl mx-auto">
      {/* Header + step indicator */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-3 items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">新建需求</h1>
            <p className="text-slate-400 text-sm mt-1">三步完成智能拟真考核配置</p>
          </div>
          <button
            type="button"
            onClick={openDiagPanel}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            用OPC.Agent 自动生成业务需求
          </button>
        </div>
        <div className="flex items-center gap-0 mt-6">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            const done = step > s;
            const active = step === s;
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      done ? "bg-indigo-600 text-white" : active ? "bg-indigo-600 text-white ring-4 ring-indigo-100" : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {done ? "✓" : s}
                  </div>
                  <span className={cn("text-xs font-medium", active ? "text-indigo-600" : done ? "text-slate-500" : "text-slate-400")}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={cn("w-12 h-px mx-3", step > s ? "bg-indigo-400" : "bg-slate-200")} />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* ═══ STEP 1: Business Definition ═══ */}
      {step === 1 && (
        <form onSubmit={handleStep1}>
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-7">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">1</div>
              <div>
                <h2 className="text-base font-bold text-slate-800">业务定义</h2>
                <p className="text-xs text-slate-400">定义项目基本信息与考核要求</p>
              </div>
            </div>

            {/* 基本信息 */}
          <div className="space-y-6">
  {/* 标题部分：更轻盈的样式 */}
  <div className="flex items-center gap-2 mb-2">
    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
    <h3 className="text-sm font-bold text-slate-700">基本需求定义</h3>
  </div>

  <div className="space-y-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
    {/* 第一行：名称 + 截止日期 (2:1 比例) */}
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase ml-1">项目名称 <span className="text-red-400">*</span></label>
        <input
          type="text"
          value={positionName}
          onChange={(e) => setPositionName(e.target.value)}
          placeholder="如：企业数字化转型"
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-500 uppercase ml-1">交付截至 <span className="text-red-400">*</span></label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 h-[42px]"
          required
        />
      </div>
      <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase ml-1">项目预算 (CNY) <span className="text-red-400">*</span></label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-indigo-400 transition-colors",
                      budgetNegotiable && "opacity-40 pointer-events-none"
                    )}>
                      <span className="text-slate-400 text-sm">¥</span>
                      <input
                        type="number"
                        min="1"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="最低"
                        className="w-full px-2 py-0.5 bg-transparent text-sm outline-none text-center"
                        disabled={budgetNegotiable}
                      />
                      <span className="text-slate-300 mx-1">—</span>
                      <input
                        type="number"
                        min="1"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="最高"
                        className="w-full px-2 py-0.5 bg-transparent text-sm outline-none text-center"
                        disabled={budgetNegotiable}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetNegotiable(!budgetNegotiable);
                        if (!budgetNegotiable) { setBudgetMin(""); setBudgetMax(""); }
                      }}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                        budgetNegotiable
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                      )}
                    >
                      面议
                    </button>
                  </div>
                </div>
    </div>

    {/* 第二行：核心任务 (全宽) */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-1 mr-1">
        <label className="text-xs font-bold text-slate-500 uppercase">任务描述 <span className="text-red-400">*</span></label>
        <button
          type="button"
          onClick={polishTask}
          disabled={!coreTasks.trim() || polishingTask}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {polishingTask ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              润色中...
            </>
          ) : (
            <>✨ AI润色</>
          )}
        </button>
      </div>
      <textarea
        value={coreTasks}
        onChange={(e) => setCoreTasks(e.target.value)}
        rows={polishingTask ? 6 : 4}
        placeholder="请描述具体的交付物要求、AI工具使用偏好等..."
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
        required
      />
    </div>

    {/* 第三行：所需能力模块 */}
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 ml-1">
        <label className="text-xs font-bold text-slate-500 uppercase">能力需求 <span className="text-red-400">*</span></label>
        <span className="text-[10px] text-slate-400">最多选 3 个</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {CAPABILITY_MODULES.map((m) => {
          const selected = reqModules.includes(m.id);
          const maxed = !selected && reqModules.length >= 3;
          return (
            <button
              key={m.id}
              type="button"
              disabled={maxed}
              onClick={() =>
                setReqModules((prev) =>
                  selected ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                )
              }
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                selected
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : maxed
                  ? "bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              {m.icon} {m.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
</div>
        

            {/* 协作模式 */}
            <div className="space-y-5 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                协作模式
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Mode A — 平台交付（即将上线） */}
                <div className="relative p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed select-none">
                  <div className="absolute top-3 right-3">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 uppercase tracking-wider">
                      即将上线
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-sm flex-shrink-0">
                      🔒
                    </div>
                    <p className="text-sm font-bold text-slate-400">平台交付模式</p>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    资金预存，验收付尾。平台担保，让每笔交易都安全落地。
                  </p>
                </div>

                {/* Mode B — 深度定制（当前默认） */}
                <button
                  type="button"
                  onClick={() => setCollaborationMode("offline")}
                  className={cn(
                    "relative p-4 rounded-2xl border-2 text-left transition-all",
                    collaborationMode === "offline"
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  {collaborationMode === "offline" && (
                    <div className="absolute bottom-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0",
                      collaborationMode === "offline" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                    )}>
                      💼
                    </div>
                    <p className={cn(
                      "text-sm font-bold",
                      collaborationMode === "offline" ? "text-indigo-700" : "text-slate-600"
                    )}>
                      深度定制模式
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    直连对接，深度协同。自主定义，满足复杂业务的深度战略对齐。
                  </p>
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg">下一步，智能配置 →</Button>
            </div>
          </section>
        </form>
      )}

      {/* ═══ STEP 2: Smart Configuration (整合智能推荐+细节配置) ═══ */}
      {step === 2 && (
        <form onSubmit={handleStep3} className="space-y-5">
          {/* Summary card */}
          <section className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">已提交信息</p>
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">项目</p>
                <p className="text-sm font-bold text-slate-700">{positionName}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 mb-0.5">核心任务</p>
                <p className="text-sm text-slate-600 line-clamp-1">{coreTasks}</p>
              </div>
              {(budgetNegotiable || budgetMax) && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">预算</p>
                  <p className="text-sm font-bold text-slate-700">
                    {budgetNegotiable ? "面议" : `¥${budgetMin}–${budgetMax}`}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Main configuration card */}
          <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">2</div>
              <div>
                <h2 className="text-base font-bold text-slate-800">智能配置</h2>
                <p className="text-xs text-slate-400">AI 推荐考核模式并完善评估细节</p>
              </div>
            </div>

            {analyzing && (
              <div className="flex flex-col items-center py-12 gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">AI 正在分析业务特征...</p>
                  <p className="text-xs text-slate-400 mt-1">识别任务类型 · 匹配考核模式</p>
                </div>
              </div>
            )}

            {!analyzing && recommendation && (
              <div className="space-y-6">
                {/* Mode selector with AI recommendation integrated */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700">考核模式</p>
                  </div>

                  {/* Mode selector with integrated recommendation */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { mode: "result_delivery" as ExamMode, icon: "📄", title: "结果交付式", sub: "聚焦快速交付与任务完成度" },
                      { mode: "interactive" as ExamMode, icon: "💬", title: "长效陪跑式", sub: "聚焦全周期赋能与持续性增长" },
                      { mode: "no_exam" as ExamMode, icon: "🤝", title: "无前置考核", sub: "无需考核，直接发起合作邀请" },
                    ].map((opt) => {
                      const isRecommended = recommendation.mode === opt.mode;
                      const isSelected = examMode === opt.mode;
                      return (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => setExamMode(opt.mode)}
                          className={cn(
                            "relative flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all text-left",
                            isSelected
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {/* AI推荐标签 */}
                          {isRecommended && opt.mode !== "no_exam" && (
                            <div className="absolute top-3 right-3">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                                AI推荐 {recommendation.confidence}%
                              </span>
                            </div>
                          )}

                          {/* 选中标记 - 右下角 */}
                          {isSelected && (
                            <div className="absolute bottom-3 right-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            </div>
                          )}

                          {/* 模式图标和标题 */}
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{opt.icon}</span>
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{opt.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                            </div>
                          </div>

                          {/* AI推荐理由 - 只在推荐的卡片上显示，无前置考核除外 */}
                          {isRecommended && opt.mode !== "no_exam" && (
                            <div className="pt-3 border-t border-indigo-200">
                              <p className="text-xs text-indigo-700 leading-relaxed">
                                {recommendation.reason}
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mode-specific config */}
                <div className="pt-4 border-t border-slate-100">
                  {examMode === "result_delivery" ? (
                    <ResultDeliveryConfig
                      deliveryFormats={deliveryFormats}
                      setDeliveryFormats={setDeliveryFormats}
                      backgroundText={backgroundText}
                      setBackgroundText={setBackgroundText}
                    />
                  ) : examMode === "interactive" ? (
                    <InteractiveConfig
                      painPoints={painPoints}
                      setPainPoints={setPainPoints}
                      coreObjective={coreObjective}
                      setCoreObjective={setCoreObjective}
                      keyPoints={keyPoints}
                      setKeyPoints={setKeyPoints}
                      newKeyPoint={newKeyPoint}
                      setNewKeyPoint={setNewKeyPoint}
                    />
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <p className="text-sm font-bold text-slate-700 mb-2">🤝 无前置考核模式</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        此模式下无需出题。OPC 人才可直接在任务大厅查看需求后选择【意向合作】，系统将自动发送合作邀请，企业确认后建立协作关系。
                      </p>
                    </div>
                  )}
                </div>

                {/* Report preview - hidden for no_exam */}
                {examMode !== "no_exam" && (
                <div className="pt-6 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-700 mb-1">
                    {examMode === "result_delivery" ? "📊 交付式考核报告" : "📈 陪跑式考核报告"}
                    <span className="text-xs font-normal text-slate-400 ml-2">企业将获得以下评估维度</span>
                  </p>
                  <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                    {examMode === "result_delivery" ? (
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { icon: "🔍", label: "关键词匹配", desc: "检测输出中的核心词汇覆盖率" },
                          { icon: "🔗", label: "逻辑一致性", desc: "检验方案内部逻辑是否自洽" },
                          { icon: "✅", label: "规范性检查", desc: "格式与行业规范符合度检测" },
                          { icon: "📐", label: "完整度评估", desc: "任务要求各项是否逐一覆盖" },
                        ].map((item) => (
                          <div key={item.label} className="flex gap-2">
                            <span className="text-sm mt-0.5 shrink-0">{item.icon}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-600">{item.label}</p>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { icon: "🏛️", label: "业务专业度", desc: "对行业背景与业务逻辑的理解深度" },
                          { icon: "🎯", label: "目标拆解度", desc: "将宏观目标拆解为可执行子任务的能力" },
                          { icon: "⚙️", label: "方法可行性", desc: "所提方案在实际场景中的落地可操作性" },
                          { icon: "💡", label: "价值溢出值", desc: "超出预期的创新思路或额外业务价值" },
                        ].map((item) => (
                          <div key={item.label} className="flex gap-2">
                            <span className="text-sm mt-0.5 shrink-0">{item.icon}</span>
                            <div>
                              <p className="text-xs font-bold text-slate-600">{item.label}</p>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
            )}
          </section>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="flex gap-4 justify-between">
            <Button type="button" variant="secondary" onClick={() => { setAnalyzing(false); setStep(1); }}>← 返回修改</Button>
            <Button type="submit" size="lg">保存并 AI 生成题目 →</Button>
          </div>
        </form>
      )}

      {/* ═══ STEP 3: Question Confirm ═══ */}
      {step === 3 && (
        <div className="space-y-5">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">3</div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-800">确认考核题目</h2>
                <p className="text-xs text-slate-400">AI 已根据你的配置自动生成题目，可直接编辑修改</p>
              </div>
              {generatingQuestions && (
                <span className="text-sm text-indigo-600 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI 正在出题...
                </span>
              )}
            </div>

            {examMode === "no_exam" ? (
              <div className="py-14 text-center space-y-3">
                <div className="text-5xl">🤝</div>
                <p className="text-base font-bold text-slate-700">无需前置考核题目</p>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  此模式下 OPC 人才可直接在任务大厅选择【意向合作】，系统将自动发出合作邀请，企业确认后正式建立协作关系。
                </p>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Q{q.seq}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i).map((q, j) => ({ ...q, seq: j + 1 })))}
                          className="text-slate-300 hover:text-rose-400 transition-colors text-lg leading-none"
                          title="删除此题"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => updateQuestion(i, "title", e.target.value)}
                        className="w-full font-bold text-slate-800 bg-transparent outline-none border-b border-transparent hover:border-slate-200 focus:border-indigo-400 transition-colors py-1"
                      />
                      <textarea
                        value={q.description}
                        onChange={(e) => updateQuestion(i, "description", e.target.value)}
                        className="w-full text-sm text-slate-500 bg-transparent outline-none resize-y leading-relaxed min-h-[72px]"
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
                {questions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => [...prev, { seq: prev.length + 1, title: "新增题目", description: "请填写题目描述", weight: 0 }])}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                  >
                    + 添加题目（{questions.length}/4）
                  </button>
                )}
              </div>
            ) : (
              !generatingQuestions && (
                <div className="text-center py-10 text-slate-400">
                  <p className="mb-4">题目生成失败，请重试</p>
                  <Button onClick={() => generateQuestions()}>重新生成</Button>
                </div>
              )
            )}
          </section>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="flex gap-4 justify-between">
            <Button type="button" variant="secondary" onClick={() => { setPublishing(false); setGeneratingQuestions(false); setStep(2); }}>
              ← 返回配置
            </Button>
            <Button
              onClick={handlePublish}
              loading={publishing}
              disabled={generatingQuestions || (examMode !== "no_exam" && questions.length === 0)}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              🚀 确认发布
            </Button>
          </div>
        </div>
      )}

      {/* ═══ OPC.Agent Modal ═══ */}
      {showDiag && (
        <div className="fixed inset-0 z-50 flex items-stretch">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDiag(false)} />

          {/* Panel — right drawer style */}
          <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">OPC.Agent</h2>
                  <p className="text-[11px] text-slate-400">识别适合 OPC+AI 协同的业务板块</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiag(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── VIEW: Menu ── */}
              {diagView === "menu" && (
                <div className="p-6 space-y-5">
                  <button
                    type="button"
                    onClick={startNewDiag}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-indigo-700">开始新诊断</p>
                      <p className="text-xs text-indigo-500 mt-0.5">描述您的组织结构或当前需求，OPC.Agent将识别适合协作的业务板块</p>
                    </div>
                  </button>

                  {/* History */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">历史诊断记录</h3>
                      {diagHistoryLoading && (
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    {!diagHistoryLoading && diagHistory.length === 0 && (
                      <div className="text-center py-10 text-slate-400">
                        <p className="text-sm">暂无历史记录</p>
                        <p className="text-xs mt-1">完成首次诊断后将在此显示</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {diagHistory.map((rec) => {
                        let result: DiagResult | null = null;
                        try { result = JSON.parse(rec.result_json); } catch { /* ignore */ }
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => { setDiagHistoryRecord(rec); setDiagResult(result); setDiagSelectedCard(null); setDiagView("result"); }}
                            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">
                                  {result?.summary ?? "诊断记录"}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{rec.business_input}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                                {new Date(rec.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            {result?.recommended && result.recommended.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {result.recommended.slice(0, 3).map((b) => (
                                  <span key={b} className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW: Input ── */}
              {diagView === "input" && (
                <div className="p-6 space-y-6">
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-700 mb-1">如何填写？</p>
                    <p className="text-xs text-indigo-600 leading-relaxed">
                      请说明您的组织架构与职能模块，并备注您当前的业务挑战。填写越详细，诊断越精确。
                    </p>
                  </div>
<div className="space-y-2">
  <label className="block text-xs font-bold text-slate-500 uppercase">
    业务背景描述 <span className="text-red-400">*</span>
  </label>
  <textarea
    value={diagInput}
    onChange={(e) => setDiagInput(e.target.value)}
    rows={10}
    placeholder={`请向我介绍您的业务拼图：

核心架构： 您的公司规模及主要职能部门（如：运营、设计、数据分析、仓储等）。

当前痛点： 您目前面临的具体业务需求或棘手的挑战。

例如：「我们是一家中型跨境电商，目前设有客服与物流部，但在跨部门数据流转上遇到了瓶颈...」.`}
    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none leading-relaxed"
  />
  <p className="text-xs text-slate-400 text-right">{diagInput.length} 字</p>
</div>
                </div>
              )}

              {/* ── VIEW: Running ── */}
              {diagView === "running" && (
                <div className="p-6 flex flex-col items-center justify-center min-h-[360px] gap-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🔍</div>
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-base font-bold text-slate-800">AI 正在分析您的业务结构...</p>
                    <p className="text-sm text-slate-400">评估 AI协同度 · 业务独立性 · 标准化程度 · 结果导向性</p>
                  </div>
                </div>
              )}

              {/* ── VIEW: Result ── */}
              {diagView === "result" && diagResult && (
                <div className="p-6 space-y-5">
                  {/* Summary banner */}
                  <div className="p-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl text-white">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">诊断结论</p>
                    <p className="font-bold text-base leading-snug">{diagResult.summary}</p>
                  </div>

                  {/* Card grid */}
                  {diagResult.dimensions?.length > 0 && (() => {
                    const sorted = [...diagResult.dimensions].sort((a, b) => b.overall - a.overall);
                    return (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">点击选择业务板块，新建需求</h3>
                        <div className="space-y-2">
                          {sorted.map((dim, idx) => {
                            const isTop = idx < 2 && dim.suitable;
                            const isSelected = diagSelectedCard?.business === dim.business;
                            return (
                              <button
                                key={dim.business}
                                type="button"
                                onClick={() => setDiagSelectedCard(isSelected ? null : dim)}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100"
                                    : isTop
                                    ? "border-emerald-300 bg-emerald-50 hover:border-emerald-400"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isTop && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white">
                                        ⭐ 置顶推荐
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                      dim.suitable ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                                    )}>
                                      {dim.suitable ? "适合 OPC" : "暂不建议"}
                                    </span>
                                    <span className="text-sm font-bold text-slate-800">{dim.business}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "text-sm font-mono font-bold",
                                      dim.overall >= 70 ? "text-emerald-600" : "text-slate-400"
                                    )}>
                                      {dim.overall}
                                    </span>
                                    {isSelected && (
                                      <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">✓</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                  {[
                                    { label: "AI协同", val: dim.ai_collaboration },
                                    { label: "独立性", val: dim.independence },
                                    { label: "标准化", val: dim.standardization },
                                    { label: "结果导向", val: dim.result_orientation },
                                  ].map(({ label, val }) => (
                                    <div key={label}>
                                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                        <span>{label}</span>
                                        <span className="font-mono font-bold">{val}</span>
                                      </div>
                                      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                          className={cn("h-full rounded-full", val >= 70 ? "bg-emerald-500" : val >= 50 ? "bg-amber-400" : "bg-slate-300")}
                                          style={{ width: `${val}%` }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {dim.reason && (
                                  <p className="text-[11px] text-slate-500">{dim.reason}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="border-t border-slate-100 px-6 py-4 bg-white">
              {diagView === "menu" && (
                <button
                  type="button"
                  onClick={startNewDiag}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  开始新诊断
                </button>
              )}
              {diagView === "input" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDiagView("menu")}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    ← 返回
                  </button>
                  <button
                    type="button"
                    onClick={runDiagnosis}
                    disabled={!diagInput.trim()}
                    className="flex-[2] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    开始 AI 诊断 →
                  </button>
                </div>
              )}
              {diagView === "running" && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <div className="w-3 h-3 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  AI 分析中，请稍候...
                </div>
              )}
              {diagView === "result" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setDiagHistoryRecord(null); setDiagSelectedCard(null); setDiagView("menu"); }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    ← 返回记录
                  </button>
                  {diagSelectedCard && (
                    <button
                      type="button"
                      onClick={() => applyCardToForm(diagSelectedCard)}
                      className="flex-[2] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      新建需求
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const OUTPUT_FORMATS = [
  { id: "文本文档", label: "文本文档", icon: "📝" },
  { id: "代码/脚本", label: "代码/脚本", icon: "💻" },
  { id: "图片", label: "图片", icon: "🎨" },
  { id: "视频", label: "视频", icon: "🎬" },
    { id: "外部链接", label: "外部链接", icon: "🔗" },
  { id: "压缩包", label: "压缩包", icon: "📦" },
];

function ResultDeliveryConfig({
  deliveryFormats, setDeliveryFormats, backgroundText, setBackgroundText,
}: {
  deliveryFormats: string[]; setDeliveryFormats: (v: string[]) => void;
  backgroundText: string; setBackgroundText: (v: string) => void;
}) {
  const [bgMode, setBgMode] = useState<"text" | "file">("text");

  function toggleFormat(val: string) {
    setDeliveryFormats(deliveryFormats.includes(val) ? deliveryFormats.filter((x) => x !== val) : [...deliveryFormats, val]);
  }

  return (
    <div className="space-y-7">
      {/* Background info — text or file */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">背景信息</p>
        <p className="text-xs text-slate-400 mb-3">提供完成任务需参考的背景信息</p>
        <div className="flex gap-2 mb-3">
         
        </div>
        {bgMode === "text" ? (
          <textarea
            value={backgroundText}
            onChange={(e) => setBackgroundText(e.target.value)}
            rows={4}
            placeholder="输入候选人需了解的背景信息、业务背景、技术要求等..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
          />
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</div>
            <p className="text-sm text-slate-500 font-medium">点击或拖拽上传文件</p>
            <p className="text-xs text-slate-400 mt-1">支持 PDF、DOCX、ZIP、CSV、代码包，最大 50MB</p>
          </div>
        )}
      </div>

      {/* Delivery formats */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">交付格式</p>
        <p className="text-xs text-slate-400 mb-3">候选人需以下列格式提交成果</p>
        <div className="grid grid-cols-6 gap-2.5">
          {OUTPUT_FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => toggleFormat(fmt.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all",
                deliveryFormats.includes(fmt.id)
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
              )}
            >
              <span className="text-xl">{fmt.icon}</span>
              <span className="text-xs text-center leading-tight">{fmt.label}</span>
              {deliveryFormats.includes(fmt.id) && (
                <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-white text-[9px]">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Config Sub-component ────────────────────────────────────────

function InteractiveConfig({
  painPoints, setPainPoints, coreObjective, setCoreObjective,
  keyPoints, setKeyPoints, newKeyPoint, setNewKeyPoint,
}: {
  painPoints: string; setPainPoints: (v: string) => void;
  coreObjective: string; setCoreObjective: (v: string) => void;
  keyPoints: string[]; setKeyPoints: (v: string[]) => void;
  newKeyPoint: string; setNewKeyPoint: (v: string) => void;
}) {
  return (
    <div className="space-y-7">

      {/* 业务现状/痛点描述 */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">业务现状</p>
        <p className="text-xs text-slate-400 mb-3">描述当前业务中存在的核心挑战或待解决问题</p>
        <textarea
          value={painPoints}
          onChange={(e) => setPainPoints(e.target.value)}
          rows={3}
          placeholder="如：现有客户转化流程过长，缺乏系统化的 AI 辅助跟进机制，导致销售周期拉长、线索流失率高..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
        />
      </div>

      {/* 业务目标 */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">业务目标</p>
        <p className="text-xs text-slate-400 mb-3">明确本次合作希望达成的具体业务成果</p>
        <textarea
          value={coreObjective}
          onChange={(e) => setCoreObjective(e.target.value)}
          rows={3}
          placeholder="如：在 3 个月内搭建并落地一套 AI 驱动的销售自动化工作流，将线索跟进效率提升 40% 以上..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
        />
      </div>

      {/* 考查要点 */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">考查要点</p>
        <p className="text-xs text-slate-400 mb-3">AI 将重点围绕以下要点展开考核</p>
        <div className="space-y-2 mb-3">
          {keyPoints.map((pt, i) => (
            <div key={i} className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-sm">🎯</span>
              <span className="flex-1 text-xs text-indigo-800">{pt}</span>
              <button type="button" onClick={() => setKeyPoints(keyPoints.filter((_, j) => j !== i))} className="text-indigo-300 hover:text-indigo-500 text-xs">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyPoint}
            onChange={(e) => setNewKeyPoint(e.target.value)}
            placeholder="如：候选人是否懂得如何运用AI工具批量剪辑..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-400 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newKeyPoint.trim()) {
                e.preventDefault();
                setKeyPoints([...keyPoints, newKeyPoint.trim()]);
                setNewKeyPoint("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => { if (newKeyPoint.trim()) { setKeyPoints([...keyPoints, newKeyPoint.trim()]); setNewKeyPoint(""); } }}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            + 添加
          </button>
        </div>
      </div>

    </div>
  );
}
