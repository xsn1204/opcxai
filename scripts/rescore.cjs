process.env.ALI_API_KEY = "sk-99f10c5ab8da406b90dd389e04218d09";
process.env.ALI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

const { PrismaClient } = require("../node_modules/@prisma/client");
const OpenAI = require("../node_modules/openai").default;

const prisma = new PrismaClient();
const aiClient = new OpenAI({
  apiKey: process.env.ALI_API_KEY,
  baseURL: process.env.ALI_BASE_URL,
});

const SUBMISSION_ID = process.argv[2];
if (!SUBMISSION_ID) { console.error("Usage: node rescore.cjs <submission_id>"); process.exit(1); }

async function main() {
  const submission = await prisma.submission.findUnique({
    where: { id: SUBMISSION_ID },
    include: { requirement: { select: { title: true, intent_desc: true, capability_weights: true } } },
  });
  if (!submission) { console.error("Submission not found"); process.exit(1); }
  console.log("Scoring:", submission.requirement?.title);

  const capWeights = JSON.parse(submission.requirement?.capability_weights ?? "{}");
  const conversationLog = JSON.parse(submission.conversation_log || "[]");
  const dimensionKeys = Object.keys(capWeights);
  const convSummary = conversationLog.slice(0, 20)
    .map((m) => (m.role === "user" ? "人才" : "AI") + ": " + m.content.slice(0, 200))
    .join("\n");

  const dimSection = dimensionKeys.length > 0
    ? dimensionKeys.map((k) => `${k}: ${capWeights[k]}%`).join("\n")
    : "综合表现: 100%";
  const dimJson = dimensionKeys.length > 0
    ? dimensionKeys.map((k) => `"${k}": <分数>`).join(",\n    ")
    : '"综合表现": <分数>';

  const prompt = `你是 OPC x AI 的 AI 阅卷评分系统。请对以下人才的考核方案进行专业评分。

任务标题: ${submission.requirement?.title}

人才对话记录摘要:
${convSummary}

提交答案:
${submission.answers.slice(0, 1000)}

评分维度及权重:
${dimSection}

以 JSON 格式返回：
{
  "score_breakdown": {
    ${dimJson}
  },
  "total_score": <加权总分>,
  "diagnosis": {
    "strengths": ["优势1", "优势2"],
    "suggestions": ["建议1", "建议2"]
  }
}`;

  console.log("Calling AI...");
  const response = await aiClient.chat.completions.create({
    model: "qwen-long",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? "";
  console.log("AI response preview:", text.slice(0, 200));
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Parse error: " + text.slice(0, 200));
  const result = JSON.parse(jsonMatch[0]);

  await prisma.submission.update({
    where: { id: SUBMISSION_ID },
    data: {
      status: "evaluated",
      ai_total_score: result.total_score,
      ai_score_breakdown: JSON.stringify(result.score_breakdown),
      ai_diagnosis: JSON.stringify(result.diagnosis),
    },
  });
  console.log("Done! Score:", result.total_score);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
