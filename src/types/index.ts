export type UserRole = "talent" | "corp";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface StudentMetadata {
  school_name: string;
  major?: string;
  graduation_year?: number;
}

export function parseStudentMetadata(meta?: string | null): StudentMetadata | null {
  try {
    const d = JSON.parse(meta ?? "{}");
    return d.school_name ? d : null;
  } catch { return null; }
}

export interface TalentProfile {
  id: string;
  user_id: string;
  username: string;
  bio?: string;
  specialty?: string;
  capability_modules: string[];
  tool_stack: string[];
  delivery_pref: "result_bet" | "hourly";
  avg_score?: number;
  updated_at: string;
  is_student?: boolean;
  edu_email?: string;
  student_metadata?: StudentMetadata;
  tags?: string[];
}

export interface CorpProfile {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  business_tracks: string[];
  is_verified: boolean;
  updated_at: string;
}

export interface Requirement {
  id: string;
  corp_id: string;
  title: string;
  intent_desc: string;
  ai_tags: string[];
  business_stage: "startup" | "growth" | "mature";
  complexity: "junior" | "mid" | "expert";
  budget_min?: number;
  budget_max?: number;
  currency: string;
  deadline?: string;
  question_types: string[];
  capability_weights: Record<string, number>;
  attachments: string[];
  status: "draft" | "active" | "closed" | "completed";
  created_at: string;
  corp_profiles?: CorpProfile;
}

export interface ExamQuestion {
  id: string;
  requirement_id: string;
  seq: number;
  title: string;
  description: string;
  weight: number;
  linked_attachment?: string;
  created_at: string;
}

export interface Submission {
  id: string;
  requirement_id: string;
  talent_id: string;
  conversation_log: ConversationMessage[];
  answers: Record<string, string>;
  status: "pending" | "evaluated" | "invited" | "rejected";
  ai_total_score?: number;
  ai_score_breakdown?: Record<string, number>;
  ai_diagnosis?: { strengths: string[]; suggestions: string[] };
  submitted_at: string;
  talent_profiles?: TalentProfile;
  requirements?: Requirement;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Collaboration {
  id: string;
  submission_id: string;
  requirement_id: string;
  talent_id: string;
  corp_id: string;
  invitation_message: string;
  kpi_terms?: Record<string, unknown>;
  status: "invited" | "accepted" | "active" | "completed" | "rejected";
  created_at: string;
  requirements?: Requirement;
  talent_profiles?: TalentProfile;
  corp_profiles?: CorpProfile;
}

export interface Message {
  id: string;
  collaboration_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  sent_at: string;
  sender?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "new_submission" | "invitation" | "message" | "invitation_accepted" | "invitation_rejected";
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export const CAPABILITY_MODULES = [
  { id: "ai_products", label: "AI产品原型与开发", icon: "🔧" },
  { id: "ai_tools", label: "AI工作流与自动化", icon: "🤖" },
  { id: "content_marketing", label: "AIGC全媒介创作", icon: "📝" },
  { id: "short_video", label: "短视频与数字人运营", icon: "🎬" },
  { id: "brand_overseas", label: "全球化品牌与出海", icon: "🌍" },
  { id: "growth", label: "AI驱动增长与获客", icon: "📈" },
  { id: "data_analysis", label: "智能决策与业务洞察", icon: "📊" },
  { id: "other", label: "其他", icon: "✨" },
];

export const ENTERPRISE_TEAM_SIZES = [
  { value: "solo", label: "独立操盘（仅我自己）" },
  { value: "2-5", label: "2–5 人" },
  { value: "6-20", label: "6–20 人" },
  { value: "21-100", label: "21–100 人" },
];

export const ENTERPRISE_INFRA = [
  { id: "server_cluster", label: "自有算力资源", icon: "🖥️" },
  { id: "premium_tools", label: "主流AI工具包", icon: "🧰" },
  { id: "gpu_matrix", label: "多模态创作中心", icon: "🎬" },
  { id: "data_analytics", label: "私有知识库", icon: "📊" },
  { id: "automation", label: "自动化分发工具", icon: "🤖" },
  { id: "workflow", label: "标准SOP协作平台", icon: "🔄" },
];

export const ENTERPRISE_BUSINESS_TAGS = [
  { value: "biz_entity", label: "支持合同签订" },
  { value: "biz_invoice", label: "支持对公结算" },
  { value: "biz_maintenance", label: "支持后期维护" },
  { value: "biz_consulting", label: "支持方案咨询" },
  { value: "biz_security", label: "自研工具/平台" },
  { value: "biz_case", label: "实证落地案例" },
];

export const ENTERPRISE_SPECIALTIES = [
  { value: "ai_products", label: "AI产品原型与开发", icon: "🔧" },
  { value: "ai_tools", label: "AI工作流与自动化", icon: "🤖" },
  { value: "content_marketing", label: "AIGC全媒介创作", icon: "📝" },
  { value: "short_video", label: "短视频与数字人运营", icon: "🎬" },
  { value: "brand_overseas", label: "全球化品牌与出海", icon: "🌍" },
  { value: "growth", label: "AI驱动增长与获客", icon: "📈" },
  { value: "data_analysis", label: "智能决策与业务洞察", icon: "📊" },
  { value: "other", label: "复杂业务定制及其他", icon: "✨" },
];

export interface EnterpriseBio {
  user_type: "enterprise";
  enterprise_name?: string;
  credit_code?: string;
  license_url?: string;
  team_size?: string;
  opc_intro?: string;
  opc_bio?: string;
  infra?: string[];
  business_tags?: string[];
  specialties?: string[];
  past_cases?: string;
}

export function parseEnterpriseBio(bio?: string | null): EnterpriseBio | null {
  if (!bio) return null;
  try {
    const parsed = JSON.parse(bio);
    if (parsed?.user_type === "enterprise") return parsed as EnterpriseBio;
  } catch { /* not JSON */ }
  return null;
}

export const TOOL_STACK = [
  // 1. 核心智能 (LLM) - 体现操盘手的“大脑”储备
  { id: "DeepSeek", label: "DeepSeek", category: "LLM / 基座模型" },
  { id: "豆包", label: "豆包", category: "LLM / 基座模型" },
  { id: "ChatGPT", label: "ChatGPT", category: "LLM / 基座模型" },
  { id: "Claude", label: "Claude", category: "LLM / 基座模型" },
  { id: "Gemini", label: "Gemini", category: "LLM / 基座模型" },

  // 2. AI 编程与架构 (Development) - 体现交付“硬工具”的能力
  { id: "OpenClaw", label: "OpenClaw", category: "工作流与自动化" },
  { id: "Cursor", label: "Cursor", category: "AI 编程与架构" },
  { id: "Claude Code", label: "Claude Code", category: "AI 编程与架构" },
  { id: "LangChain", label: "LangChain", category: "AI 编程与架构" },
    
  // 3. 多模态 AIGC (Creative) - 体现“声画表现力”
  { id: "Seedance", label: "Seedance", category: "多模态 AIGC" },
  { id: "Midjourney", label: "Midjourney", category: "多模态 AIGC" },
  { id: "Runway", label: "Runway ML", category: "多模态 AIGC" },
  
  // 4. 智能工作流 (Workflow) - 体现“自动化提效”的能力
  { id: "Dify", label: "Dify", category: "工作流与自动化" },
  { id: "Coze", label: "Coze/扣子", category: "工作流与自动化" },
  { id: "Zapier", label: "Zapier", category: "工作流与自动化" },
  { id: "n8n", label: "n8n", category: "工作流与自动化" }
]

     