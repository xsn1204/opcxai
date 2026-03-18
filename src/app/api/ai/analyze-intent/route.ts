import { NextResponse } from "next/server";
import { aiClient, AI_MODELS } from "@/lib/ai-client";

export async function POST(request: Request) {
  try {
    const { intent } = await request.json();

    const prompt = `分析以下企业业务需求描述，提取核心领域标签，并建议一个简洁的任务标题。

需求描述: "${intent}"

请以 JSON 格式返回：
{
  "tags": ["标签1", "标签2", "标签3"],
  "suggestedTitle": "简洁的任务标题（15字以内）"
}

标签规则：
- 提取 3-5 个最相关的领域标签（如：TikTok美区、AI脚本、冷启动、跨境电商等）
- 标签要简短精准
- 标题要概括业务目标`;

    const response = await aiClient.chat.completions.create({
      model: AI_MODELS.fast,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Parse error");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ tags: [], suggestedTitle: "" }, { status: 200 });
  }
}
