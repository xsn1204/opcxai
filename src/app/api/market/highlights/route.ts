import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ─── Desensitization helpers ──────────────────────────────────────────────────

const STAGE_CORP_LABEL: Record<string, string> = {
  startup:    "某初创企业",
  growth:     "某成长期企业",
  scale:      "某规模化企业",
  enterprise: "某大型企业",
};

// Map first capability module → role description shown on card
const MODULE_ROLE: Record<string, string> = {
  ai_products:       "AI产品研发专家",
  ai_tools:          "AI工作流自动化专家",
  content_marketing: "AIGC内容创作专家",
  short_video:       "短视频运营专家",
  brand_overseas:    "品牌出海专家",
  growth:            "AI增长专家",
  data_analysis:     "数据分析专家",
  other:             "AI综合专家",
};

// Map capability module id → display label + icon (subset of CAPABILITY_MODULES)
const MODULE_TAG: Record<string, { label: string; icon: string }> = {
  ai_products:       { label: "AI产品原型",   icon: "🔧" },
  ai_tools:          { label: "AI工作流",      icon: "🤖" },
  content_marketing: { label: "AIGC全媒介",    icon: "📝" },
  short_video:       { label: "短视频与数字人", icon: "🎬" },
  brand_overseas:    { label: "全球化品牌",     icon: "🌍" },
  growth:            { label: "AI驱动增长",    icon: "📈" },
  data_analysis:     { label: "智能决策",       icon: "📊" },
  other:             { label: "其他",           icon: "✨" },
};

function budgetLabel(min: number | null, max: number | null): string {
  if (!min && !max) return "";
  const anchor = min ?? max ?? 0;
  if (anchor <= 5000)  return "¥5k 以下";
  if (anchor <= 10000) return "¥5k–1w";
  if (anchor <= 30000) return "¥1w–3w";
  if (anchor <= 50000) return "¥3w–5w";
  return "¥5w+";
}

function daysLabel(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 7)  return `近 ${Math.max(days, 1)} 天`;
  if (days < 14) return "近 1 周";
  if (days < 30) return "近 2 周";
  return "近 30 天";
}

function parseJsonSafe<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  const collabs = await prisma.collaboration.findMany({
    where: {
      OR: [
        // 优先：双方都确认完成
        { corp_confirmed_complete: true, talent_confirmed_complete: true },
        // 兜底：协作已达成（accepted = 双方同意合作）
        { status: "accepted" },
      ],
    },
    orderBy: { created_at: "desc" },
    take: 20,
    select: {
      created_at: true,
      corp_star_rating: true,
      corp_confirmed_complete: true,
      talent_confirmed_complete: true,
      status: true,
      requirement: {
        select: {
          title: true,
          ai_tags: true,
          budget_min: true,
          budget_max: true,
          corp_profile: {
            select: { company_size: true },
          },
        },
      },
      talent_profile: {
        select: {
          capability_modules: true,
          bio: true,
        },
      },
    },
  });

  const cards = collabs
    .filter((c) => c.requirement && c.talent_profile)
    .map((c) => {
      const req  = c.requirement!;
      const tp   = c.talent_profile!;

      const aiTags   = parseJsonSafe<string[]>(req.ai_tags, []);
      const capMods  = parseJsonSafe<string[]>(tp.capability_modules, []);
      const bioData  = parseJsonSafe<{ user_type?: string }>(tp.bio, {});

      const isEnterprise = bioData.user_type === "enterprise";
      const executorRole = MODULE_ROLE[capMods[0]] ?? "AI专业执行方";

      // Map up to 2 ai_tags to display tags (fall back to capMods if no valid module IDs)
      let displayTags = aiTags
        .slice(0, 2)
        .map((id) => MODULE_TAG[id])
        .filter(Boolean) as { label: string; icon: string }[];
      if (displayTags.length === 0) {
        displayTags = capMods
          .slice(0, 2)
          .map((id) => MODULE_TAG[id])
          .filter(Boolean) as { label: string; icon: string }[];
      }

      const isCompleted = c.corp_confirmed_complete && c.talent_confirmed_complete;

      return {
        title:         req.title,
        corpLabel:     STAGE_CORP_LABEL[req.corp_profile?.company_size ?? ""] ?? "某企业",
        displayTags,
        budgetLabel:   budgetLabel(req.budget_min, req.budget_max),
        starRating:    c.corp_star_rating ?? null,
        daysLabel:     daysLabel(c.created_at),
        executorRole,
        executorType:  isEnterprise ? "enterprise" : "individual",
        isCompleted,
        prefillTags:   aiTags.some((id) => MODULE_TAG[id]) ? aiTags : capMods,
      };
    });

  return NextResponse.json(cards);
}
