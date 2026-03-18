import { aiClient, AI_MODELS } from "@/lib/ai-client";
import { prisma } from "@/lib/db";

// 固定评分维度（按模式）
const DELIVERY_DIMS = {
  keyword_match:      { label: "关键词匹配", weight: 25 },
  logic_consistency:  { label: "逻辑一致性", weight: 25 },
  compliance_check:   { label: "规范性检查", weight: 25 },
  completeness:       { label: "完整度评估", weight: 25 },
};

const INTERACTIVE_DIMS = {
  business_expertise: { label: "业务专业度", weight: 25 },
  goal_decomposition: { label: "目标拆解度", weight: 25 },
  method_feasibility: { label: "方法可行性", weight: 25 },
  value_overflow:     { label: "价值溢出值", weight: 25 },
};

const DELIVERY_DIM_KEYS = Object.keys(DELIVERY_DIMS) as Array<keyof typeof DELIVERY_DIMS>;
const INTERACTIVE_DIM_KEYS = Object.keys(INTERACTIVE_DIMS) as Array<keyof typeof INTERACTIVE_DIMS>;

export async function scoreSubmission(submission_id: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submission_id },
    include: {
      requirement: {
        select: { title: true, intent_desc: true, corp_id: true, question_types: true },
      },
    },
  });

  if (!submission) throw new Error("Submission not found");

  const examQuestions = await prisma.examQuestion.findMany({
    where: { requirement_id: submission.requirement_id },
    orderBy: { seq: "asc" },
  });

  const submittedAnswers: Record<string, any> = JSON.parse(submission.answers || "{}");

  const questionTypes: string[] = JSON.parse(submission.requirement?.question_types ?? "[]");
  const isInteractive =
    questionTypes.includes("interactive") ||
    questionTypes.includes("roleplay") ||
    questionTypes.includes("stress_test");

  const dims = isInteractive ? INTERACTIVE_DIMS : DELIVERY_DIMS;
  const dimKeys = isInteractive ? INTERACTIVE_DIM_KEYS : DELIVERY_DIM_KEYS;

  const questionsText = examQuestions
    .map((q) => {
      const answer = submittedAnswers[q.id] || "";
      return `
【题目 ${q.seq}】（权重 ${q.weight}%）
标题：${q.title}
要求：${q.description}
候选人答案：
${typeof answer === "string" ? answer || "（未作答）" : JSON.stringify(answer)}`;
    })
    .join("\n---\n");

  const dimInstructions = isInteractive
    ? `
评分维度说明（长效陪跑式，各占 25%）：
- business_expertise（业务专业度）：候选人对业务领域的专业认知深度，体现在分析框架、行业洞察、术语运用等方面
- goal_decomposition（目标拆解度）：候选人将大目标拆解为可执行子任务的能力，层次是否清晰、优先级是否合理
- method_feasibility（方法可行性）：提出的方案在现实中能否落地，资源约束、执行路径、时间线是否合理
- value_overflow（价值溢出值）：方案是否超出基本要求，创造额外商业价值、长期复用价值或生态协同价值`
    : `
评分维度说明（结果交付式，各占 25%）：
- keyword_match（关键词匹配）：答案是否覆盖题目要求的核心关键词、概念和知识点
- logic_consistency（逻辑一致性）：论点是否自洽、推理链条是否完整、结论与依据是否一致
- compliance_check（规范性检查）：格式、结构、表达是否符合专业规范，有无明显错误或不规范之处
- completeness（完整度评估）：是否完整回答了题目所有要求，有无遗漏关键部分`;

  const prompt = `你是 OPC x AI 的 AI 阅卷评分系统。请对以下人才的考核答案按照指定维度进行专业评分。

任务标题: ${submission.requirement?.title ?? ""}
任务背景: ${submission.requirement?.intent_desc ?? ""}
考核模式: ${isInteractive ? "【长效陪跑式】" : "【结果交付式】"}

考核题目及候选人答案：
${questionsText}
${dimInstructions}

请仔细阅读每道题目的要求和候选人的答案，对 4 个维度各自打分（0-100），计算总分（四项平均），并提供诊断建议。

以 JSON 格式返回（key 必须与下方完全一致）：
{
  "score_breakdown": {
    ${dimKeys.map((k) => `"${k}": <0-100的整数>`).join(",\n    ")}
  },
  "diagnosis": {
    "strengths": ["核心优势1", "核心优势2", "核心优势3"],
    "suggestions": ["表现不足1", "表现不足2", "表现不足3"]
  }
}

评分标准：
- 90+: 出色，明显超出预期
- 75-89: 良好，达到要求
- 60-74: 合格，基本达标
- <60: 未达标`;

  const response = await aiClient.chat.completions.create({
    model: AI_MODELS.long,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`AI response parse error: ${text.slice(0, 200)}`);

  const result = JSON.parse(jsonMatch[0]);

  // 自己计算加权总分，确保与四个维度一致（各 25%）
  const breakdown: Record<string, number> = result.score_breakdown ?? {};
  const totalScore = dimKeys.reduce((sum, k) => sum + (breakdown[k] ?? 0), 0) / dimKeys.length;

  await prisma.submission.update({
    where: { id: submission_id },
    data: {
      status: "evaluated",
      ai_total_score: Math.round(totalScore * 10) / 10,
      ai_score_breakdown: JSON.stringify(result.score_breakdown),
      ai_diagnosis: JSON.stringify(result.diagnosis),
    },
  });

  // Notify corp
  const req = await prisma.requirement.findUnique({
    where: { id: submission.requirement_id },
    include: { corp_profile: { select: { user_id: true } } },
  });

  if (req?.corp_profile) {
    await prisma.notification.create({
      data: {
        user_id: req.corp_profile.user_id,
        type: "new_submission",
        payload: JSON.stringify({
          submission_id,
          requirement_id: submission.requirement_id,
          score: Math.round(totalScore * 10) / 10,
        }),
      },
    });
  }
}
