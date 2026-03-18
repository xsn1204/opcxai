import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aiClient, AI_MODELS } from "@/lib/ai-client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  let businessInput = "";
  try {
    const body = await request.json();
    businessInput = body.businessInput ?? "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 });
  }

  if (!businessInput.trim()) {
    return new Response(JSON.stringify({ error: "业务描述不能为空" }), { status: 400 });
  }

  const prompt = `你是一位企业业务协同顾问，专注于帮助企业识别哪些业务可以通过 OPC（One Person Company，一人公司）+ AI 工具进行高效协同外包。

以下是企业提供的业务背景与组织结构描述：
${businessInput}

请根据以下四个维度，对描述中出现的各个业务部门或功能板块进行评估：
1. **AI协同度**（0-100）：该业务能否有效利用 AI 工具（ChatGPT、Claude、Midjourney 等）显著提升效率
2. **业务独立性**（0-100）：该业务是否可以相对独立地由外部 OPC 承接，不依赖深度内部资源或机密信息
3. **标准化程度**（0-100）：该业务的交付流程与输出成果是否可被模块化、标准化定义
4. **结果导向性**（0-100）：该业务是否以明确可验收的交付物为核心，便于按成果结算

评分规则：综合得分 = (AI协同度 + 业务独立性 + 标准化程度 + 结果导向性) / 4，综合得分 ≥ 70 则判定为「适合OPC+AI协同」。

请直接输出以下 JSON 数据块（严格按此格式，不得省略，不要输出 JSON 以外的内容）：

<RESULT_JSON>
{
  "summary": "一句话总结核心诊断结论（30字以内）",
  "dimensions": [
    {
      "business": "业务板块名称",
      "ai_collaboration": 数字,
      "independence": 数字,
      "standardization": 数字,
      "result_orientation": 数字,
      "overall": 数字,
      "suitable": true或false,
      "reason": "适合或不适合的核心原因（30字以内）",
      "project_name": "基于该业务板块建议发布的考核项目名称（20字以内，简洁有力）",
      "core_task_description": "该项目的任务描述（100字以内，说明交付物要求、AI工具使用偏好、验收标准等）"
    }
  ],
  "recommended": ["适合OPC协同的业务1", "适合OPC协同的业务2"],
  "brd": {
    "title": "业务需求文档标题（20字以内）",
    "background": "需求背景说明（60字以内）",
    "objectives": ["核心目标1", "核心目标2", "核心目标3"],
    "deliverables": ["交付物1", "交付物2", "交付物3"],
    "requirements": "核心能力与工具要求（80字以内）",
    "timeline": "建议执行周期（如：2-4周）",
    "budget": "建议预算区间（CNY，如：5000-15000）"
  }
}
</RESULT_JSON>`;

  const encoder = new TextEncoder();

  // Use SSE streaming to keep the HTTP connection alive during the long AI call.
  // The AI response is accumulated server-side; only the final result is sent to the client.
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const aiStream = await aiClient.chat.completions.create({
          model: AI_MODELS.main,
          stream: true,
          max_tokens: 3000,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const chunk of aiStream) {
          fullText += chunk.choices[0]?.delta?.content ?? "";
        }

        // Parse structured result
        const jsonMatch = fullText.match(/<RESULT_JSON>([\s\S]*?)<\/RESULT_JSON>/);
        let resultJson: Record<string, unknown> = {};
        if (jsonMatch) {
          try {
            resultJson = JSON.parse(jsonMatch[1].trim());
          } catch { /* ignore */ }
        } else {
          try {
            resultJson = JSON.parse(fullText.trim());
          } catch { /* ignore */ }
        }

        // Save to database
        const corpProfile = await prisma.corpProfile.findUnique({
          where: { user_id: session.sub },
        });
        if (corpProfile) {
          await prisma.diagnosisRecord.create({
            data: {
              corp_id: corpProfile.id,
              business_input: businessInput,
              diagnosis_text: "",
              result_json: JSON.stringify(resultJson),
            },
          });
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ t: "done", r: resultJson })}\n\n`)
        );
        controller.close();
      } catch (err) {
        console.error("Diagnose error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ t: "error" })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
