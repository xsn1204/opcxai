import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedEnterpriseCorps() {
  const csvPath = path.join(process.cwd(), "seed-enterprise-corps.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",");

  console.log("🚀 开始导入机构 OPC...\n");

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const name = values[0]?.trim();
    const business = values[1]?.trim();
    const capabilities = values[2]?.trim();

    if (!name) continue;

    // 生成临时邮箱
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `temp-${slug}@opc.placeholder`;
    const tempPassword = "TempPass123!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    console.log(`📦 导入: ${name}`);

    try {
      // 检查是否已存在
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        console.log(`   ⚠️  已存在，跳过\n`);
        continue;
      }

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "corp",
          is_placeholder: true,
        },
      });

      // 创建机构 OPC
      await prisma.corp.create({
        data: {
          user_id: user.id,
          company_name: name,
          business_scope: business || "",
          capabilities: capabilities || "",
          is_enterprise: true,
        },
      });

      console.log(`   ✅ 成功 (临时邮箱: ${email})\n`);
    } catch (error) {
      console.error(`   ❌ 失败: ${error}\n`);
    }
  }

  console.log("✨ 导入完成！");
  console.log("\n📝 后续转正步骤：");
  console.log("   1. 企业认领时更新邮箱和密码");
  console.log("   2. 设置 is_placeholder = false");
}

seedEnterpriseCorps()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
