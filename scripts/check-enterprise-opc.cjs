const { PrismaClient } = require("../node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.talentProfile.findFirst({
    where: { bio: { contains: '"user_type":"enterprise"' } },
    select: { bio: true, specialty: true, capability_modules: true, tool_stack: true },
  });
  const bio = JSON.parse(t.bio || "{}");
  console.log("=== bio 完整字段 ===");
  console.log(JSON.stringify(bio, null, 2));

  const regFields = ["enterprise_name","credit_code","license_url","team_size","matrix_accounts","infra","past_cases","business_tags","specialties","concurrent_capacity"];
  console.log("\n=== 注册字段覆盖情况 ===");
  regFields.forEach(f => {
    const val = bio[f];
    const status = val !== undefined ? "✅" : "❌ 缺失";
    console.log(f + ": " + status, val !== undefined ? JSON.stringify(val) : "");
  });

  console.log("\n=== capability_modules / tool_stack ===");
  console.log("capability_modules:", t.capability_modules);
  console.log("tool_stack:", t.tool_stack);
  console.log("specialty:", t.specialty);
}
main().catch(console.error).finally(() => prisma.$disconnect());
