import { NextResponse } from "next/server";
import { aiClient, AI_MODELS } from "@/lib/ai-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      intentDesc,
      title,
      businessStage,
      complexity,
      questionTypes,
      capabilityWeights,
      // Result delivery mode params
      backgroundText,
      deliveryFormats,
      // Interactive mode params
      painPoints,
      coreObjective,
      keyPoints,
    } = body;

    const weightsList = Object.entries(capabilityWeights)
      .map(([k, v]) => `${k}: ${v}%`)
      .join(", ");

    const isInteractive = questionTypes.includes("interactive");

    // Build result delivery context
    const deliveryContext = !isInteractive && deliveryFormats?.length > 0
      ? `\n交付格式要求：候选人需以【${deliveryFormats.join("、")}】格式提交成果。`
      : "";

    const backgroundContext = !isInteractive && backgroundText?.trim()
      ? `\n背景信息：${backgroundText}`
      : "";

    // Build interactive context (长效陪跑式)
    const painPointsContext = isInteractive && painPoints?.trim()
      ? `\n业务现状/痛点：${painPoints}`
      : "";

    const objectiveContext = isInteractive && coreObjective?.trim()
      ? `\n核心业务目标：${coreObjective}`
      : "";

    // Build key points instruction
    const keyPointsInstruction = keyPoints?.length > 0
      ? `\n核心考查要点（题目须重点围绕以下要点设计）：\n${keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`
      : "";

    const prompt = `你是一个专业的 AI 人才考核系统，请根据以下企业需求生成 3 道考核题目。

业务目标: ${title}
业务描述: ${intentDesc}
业务阶段: ${businessStage === "startup" ? "启动期" : businessStage === "growth" ? "增长期" : "成熟期"}
考核复杂度: ${complexity === "junior" ? "初级" : complexity === "mid" ? "中高级" : "专家级"}
题目类型: ${questionTypes.join(", ")}
能力权重配置: ${weightsList}${deliveryContext}${backgroundContext}${painPointsContext}${objectiveContext}${keyPointsInstruction}

请生成 3 道有针对性的考核题目，要求：
1. 题目要贴近真实业务场景
2. 考察候选人的 AI 工具使用能力和业务思维
3. 每道题有明确的考察方向
4. 题目描述清晰具体
${isInteractive ? "5. 题目须围绕业务痛点与目标设计，考察候选人的长期协作意识、需求理解与持续交付能力，以结构化问答形式作答" : "5. 题目须明确要求候选人以指定格式提交交付物"}
${backgroundContext ? "6. 题目可引用背景信息中的具体内容" : ""}

请以 JSON 格式返回，格式如下：
{
  "questions": [
    {
      "seq": 1,
      "title": "题目标题（简短）",
      "description": "详细题目描述，包含具体要求和背景信息"
    },
    ...
  ]
}`;

    const message = await aiClient.chat.completions.create({
      model: AI_MODELS.main,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.choices[0]?.message?.content ?? "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse JSON from AI response");

    const parsed = JSON.parse(jsonMatch[0]);
    const questions = parsed.questions;

    await prisma.examQuestion.deleteMany({ where: { requirement_id: id } });

    // Equal weight distribution: floor(100/n), remainder goes to first question
    // e.g. 3 questions → [34, 33, 33]
    const n = questions.length;
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;

    const savedQuestions = await prisma.examQuestion.createMany({
      data: questions.map((q: { seq: number; title: string; description: string }, i: number) => ({
        requirement_id: id,
        seq: q.seq,
        title: q.title,
        description: q.description,
        weight: i === 0 ? base + remainder : base,
      })),
    });

    const allQuestions = await prisma.examQuestion.findMany({
      where: { requirement_id: id },
      orderBy: { seq: "asc" },
    });

    return NextResponse.json({ questions: allQuestions });
  } catch (err) {
    console.error("Question generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
