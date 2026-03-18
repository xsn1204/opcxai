import { NextResponse } from "next/server";
import { aiClient, AI_MODELS } from "@/lib/ai-client";
import { checkSensitive, formatHitMessage } from "@/lib/sensitive-filter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, desc, userInput } = body;

    if (!title?.trim() || !desc?.trim() || !userInput?.trim()) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const filter = checkSensitive(userInput);
    if (!filter.ok) {
      return NextResponse.json(
        { error: formatHitMessage(filter.hits), words: filter.hits },
        { status: 400 }
      );
    }

    const prompt = `你是一名 AI 协作能力评审官。

用户提交了一道 AI 实战题的解题思路，给出专业、直接的点评。

【题目】${title}
【要求】${desc}
【用户思路】${userInput}

点评规则：
- 用“你的解题思路”指代用户的输入内容，避免直接复制用户原话
- 先肯定思路中 1 个有效点，进行概括性重述，让用户知道哪些地方是对的
- 再指出 1 个最关键的缺失或改进方向（具体到 Prompt 写法 / 工具选择 / 流程设计）
- 最后给出 1 句可直接执行的改进建议
- 全文 ≤ 200 字，不用分点标题，口吻专业但不说教`;

    const response = await aiClient.chat.completions.create({
      model: AI_MODELS.fast,
      max_tokens: 250,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "";
    return NextResponse.json({ content });
  } catch (err) {
    console.error("Practice feedback error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}
