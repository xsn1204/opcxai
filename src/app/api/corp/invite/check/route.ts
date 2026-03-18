import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCorpQuota } from "@/lib/invite-quota";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const corpProfile = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!corpProfile) {
    return NextResponse.json({ error: "Corp profile not found" }, { status: 404 });
  }

  const { quota, monthlyQuota, referralBonus, referralCode } = await getCorpQuota(corpProfile.id);

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://OPC x AI"
      : "http://localhost:3002");

  return NextResponse.json({
    quota,
    monthlyQuota,
    referralBonus,
    referralCode,
    referralUrl: `${base}/register/corp?ref=${referralCode}`,
  });
}
