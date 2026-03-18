import { NextResponse } from "next/server";
import { aiClient, AI_MODELS } from "@/lib/ai-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, context } = body;

    // 只检查最后一条用户消息，避免对历史消息重复拦截
    const lastUserMsg = [...(messages ?? [])]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    if (lastUserMsg) {
      const filter = checkSensitive(lastUserMsg.content);
      if (!filter.ok) {
        return NextResponse.json(
          { error: formatHitMessage(filter.hits), words: filter.hits },
          { status: 400 }
        );
      }
    }

    const systemPrompt = `你是 OPC x AI 拟真实战舱中的 OPC.Agent（专业名称：AI_Copilot@OPC）。

你的职责：
- 帮助 AI 超级个体完成业务考核任务
- 提供专业的 AI 工具使用建议、Prompt 工程思路、营销策略方向
- 基于真实业务场景给出可落地的方案
- 不直接给答案，而是引导用户深入思考和迭代

当前任务背景：
${context?.missionBrief ?? "完成业务考核任务"}

当前考核题目：
${context?.currentQuestion ? `Q${context.currentQuestion.seq}: ${context.currentQuestion.title}\n${context.currentQuestion.description}` : "请参考左侧题目列表"}

所有考核题目：
${(context?.questions ?? []).map((q: { seq: number; title: string; weight: number }) => `Q${q.seq}. ${q.title} (权重${q.weight}%)`).join("\n")}

回答规范：
- 使用简洁专业的中文
- 结合 AI 工具（如 ChatGPT、Claude、Midjourney 等）给出具体操作建议
- 适当引用数据和案例增强说服力
- 严格控制在 150 字以内，简洁有力，不废话
- 使用终端风格（技术感），但保持易读性
- 不要用 markdown 标题，直接分点说`;

    const response = await aiClient.chat.completions.create({
      model: AI_MODELS.main,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ content: text });
  } catch (err) {
    console.error("Copilot error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}
