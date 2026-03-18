import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { aiClient, AI_MODELS } from "@/lib/ai-client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let coreTask = "";
  let projectName = "";
  try {
    const body = await request.json();
    coreTask = body.coreTask ?? "";
    projectName = body.projectName ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!coreTask.trim()) {
    return NextResponse.json({ error: "任务描述不能为空" }, { status: 400 });
  }

  const prompt = `你是一位专业的项目需求顾问，帮助企业将模糊的任务描述转化为可落地、可验收的项目需求书。

项目名称：${projectName || "（未填写）"}
当前核心任务描述：
${coreTask}

请对上述任务描述进行专业润色与拆解，严格按照以下规则输出：

**规则：**
1. 交付物：列出 3-5 个具体、可量化的交付物，每个交付物必须配一条明确的验收标准
2. 里程碑：根据任务复杂度自动推算 3 个合理的里程碑节点（用"第X周"或"D+X天"表示相对时间）
3. 语言专业、简洁，避免空话
4. 直接输出结果，不要解释，不要输出 JSON
5. 严禁使用【】书名号作为标题，改用纯文本标题加冒号

**严格按照以下格式输出，不得更改格式：**

任务概述：
{一句话概括项目核心目标，30字以内}

交付物清单：
▸ 交付物1：{名称}
  验收标准：{具体可衡量的验收条件}

▸ 交付物2：{名称}
  验收标准：{具体可衡量的验收条件}

▸ 交付物3：{名称}
  验收标准：{具体可衡量的验收条件}

（如有必要可列 4-5 条，否则 3 条即可）

里程碑节点：
📍 里程碑1（{相对时间}）：{该节点的核心产出}
📍 里程碑2（{相对时间}）：{该节点的核心产出}
📍 里程碑3（{相对时间}）：{该节点的核心产出}`;

  try {
    const response = await aiClient.chat.completions.create({
      model: AI_MODELS.fast,
      stream: false,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const polished = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ polished });
  } catch (err) {
    console.error("Polish task error:", err);
    return NextResponse.json({ error: "AI 服务暂时不可用，请稍后重试" }, { status: 500 });
  }
}
