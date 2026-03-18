import OpenAI from "openai";

// 通义千问 DashScope OpenAI 兼容模式
export const aiClient = new OpenAI({
  apiKey: process.env.ALI_API_KEY!,
  baseURL: process.env.ALI_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

// 模型配置
export const AI_MODELS = {
  // 主力模型：通义千问 Max，能力最强，用于出题/评分/Copilot
  main: "qwen-max",
  // 快速模型：通义千问 Turbo，速度快，用于轻量任务（意图分析）
  fast: "qwen-turbo",
  // 长文本模型：用于评分（对话记录可能很长）
  long: "qwen-long",
} as const;
