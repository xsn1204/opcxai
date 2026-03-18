import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const corpProfile = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
  });

  if (!corpProfile) {
    return NextResponse.json({ records: [] });
  }

  const records = await prisma.diagnosisRecord.findMany({
    where: { corp_id: corpProfile.id },
    orderBy: { created_at: "desc" },
    take: 20,
    select: {
      id: true,
      business_input: true,
      diagnosis_text: true,
      result_json: true,
      created_at: true,
    },
  });

  return NextResponse.json({ records });
}
