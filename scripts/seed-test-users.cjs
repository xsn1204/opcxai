// Seed script: 2 individual OPCs + 2 enterprise OPCs + 3 corp users
// Run: node scripts/seed-test-users.cjs

const { PrismaClient } = require("../node_modules/@prisma/client");
const bcrypt = require("../node_modules/bcryptjs");

const prisma = new PrismaClient();

const CAPABILITY_MODULES = [
  "ai_tools", "ai_products", "content_marketing", "short_videon",
  "brand_overseas", "growth", "data_analysis", "other"
];


const TOOL_STACKS = [
  ["ChatGPT", "Notion AI", "Cursor", "Figma"],
  ["Claude", "Perplexity", "GitHub Copilot", "Zapier"],
  ["Midjourney", "RunwayML", "Adobe Firefly", "CapCut AI"],
  ["n8n", "Make", "Airtable AI", "Lark"],
  ["Dify", "LangChain", "Supabase", "Vercel AI"],
];

const BUSINESS_TRACKS = [
  ["product", "ai_application"],
  ["marketing", "content"],
  ["engineering", "ai_infra"],
  ["data", "analytics"],
  ["design", "branding"],
];

const talents = [
  {
    email: "lin.ruoxi@opc.test",
    username: "林若曦",
    specialty: "AI产品策略与智能体设计",
    bio: "前字节产品经理，主导过3款AI SaaS产品从0到1，擅长用AI重构工作流，PMF 验证周期缩短40%。",
    capability_modules: ["ai_tools", "content_marketing"],
    tool_stack: ["ChatGPT", "Cursor", "Notion AI", "Figma"],
    delivery_pref: "result_bet",
  },
  {
    email: "chen.haoran@opc.test",
    username: "陈浩然",
    specialty: "数据分析与AI增长实验",
    bio: "独立数据顾问，服务过12家B轮以上企业，精通用Claude + Python搭建自动化数据管道，曾将报告产出效率提升5倍。",
    capability_modules: ["data_analysis", "ai_tools"],
    tool_stack: ["Claude", "GitHub Copilot", "Perplexity", "Zapier"],
    delivery_pref: "result_bet",
  },
];

// Enterprise OPC talent accounts — bio stored as JSON with user_type: "enterprise"
const enterpriseOPCs = [
  {
    email: "team@aistudio-x.test",
    username: "AIStudio-X",
    specialty: "AI内容量产与多平台分发",
    bio: JSON.stringify({
      user_type: "enterprise",
      enterprise_name: "AIStudio-X 内容工厂",
      team_size: "10",
      matrix_accounts: "80+",
      concurrent_capacity: "20项/月",
      business_tags: ["内容营销", "AI生成", "短视频"],
      infra: ["Midjourney", "RunwayML", "CapCut AI", "Notion AI"],
    }),
    capability_modules: ["content_creation", "marketing", "ai_tools", "workflow_automation"],
    tool_stack: ["Midjourney", "RunwayML", "CapCut AI", "Notion AI"],
    delivery_pref: "result_bet",
  },
  {
    email: "ops@quantflow.test",
    username: "QuantFlow",
    specialty: "AI自动化工作流与数据工程",
    bio: JSON.stringify({
      user_type: "enterprise",
      enterprise_name: "QuantFlow 智能运营团队",
      team_size: "20",
      matrix_accounts: "30+",
      concurrent_capacity: "15项/月",
      business_tags: ["流程自动化", "数据工程", "AI基础设施"],
      infra: ["n8n", "Dify", "LangChain", "Supabase"],
    }),
    capability_modules: ["workflow_automation", "data_analysis", "code_assist", "ai_tools"],
    tool_stack: ["n8n", "Dify", "LangChain", "Supabase"],
    delivery_pref: "result_bet",
  },
];

const corps = [
  {
    email: "hr@nexgen-tech.test",
    company_name: "NexGen Technology",
    contact_name: "赵晨曦",
    business_tracks: ["engineering", "ai_infra"],
  },
  {
    email: "recruit@lumina-brand.test",
    company_name: "流明品牌咨询",
    contact_name: "吴思涵",
    business_tracks: ["marketing", "content"],
  },
  {
    email: "ops@datalens.test",
    company_name: "DataLens Analytics",
    contact_name: "周子轩",
    business_tracks: ["data", "analytics"],
  },
];

async function main() {
  const password = await bcrypt.hash("Test@2024", 10);

  console.log("\n── Upserting talent accounts ──");
  for (const t of [...talents, ...enterpriseOPCs]) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { email: t.email, password, role: "talent" },
    });
    await prisma.talentProfile.upsert({
      where: { user_id: user.id },
      update: {
        username: t.username,
        specialty: t.specialty,
        bio: t.bio,
        capability_modules: JSON.stringify(t.capability_modules),
        tool_stack: JSON.stringify(t.tool_stack),
        delivery_pref: t.delivery_pref,
      },
      create: {
        user_id: user.id,
        username: t.username,
        specialty: t.specialty,
        bio: t.bio,
        capability_modules: JSON.stringify(t.capability_modules),
        tool_stack: JSON.stringify(t.tool_stack),
        delivery_pref: t.delivery_pref,
      },
    });
    console.log(`  ✓ ${t.username} <${t.email}>`);
  }

  console.log("\n── Upserting corp accounts ──");
  for (const c of corps) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { email: c.email, password, role: "corp" },
    });
    await prisma.corpProfile.upsert({
      where: { user_id: user.id },
      update: {
        company_name: c.company_name,
        contact_name: c.contact_name,
        business_tracks: JSON.stringify(c.business_tracks),
      },
      create: {
        user_id: user.id,
        company_name: c.company_name,
        contact_name: c.contact_name,
        business_tracks: JSON.stringify(c.business_tracks),
      },
    });
    console.log(`  ✓ ${c.company_name} / 联系人: ${c.contact_name} <${c.email}>`);
  }

  console.log("\n── Verification ──");
  const talentCount = await prisma.talentProfile.count();
  const corpCount = await prisma.corpProfile.count();
  console.log(`  TalentProfile total: ${talentCount}`);
  console.log(`  CorpProfile total:   ${corpCount}`);
  console.log("\n  统一登录密码: Test@2024\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
