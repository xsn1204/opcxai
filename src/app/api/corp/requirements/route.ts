import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const corp = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!corp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const requirements = await prisma.requirement.findMany({
    where: { corp_id: corp.id, status: { in: ["draft", "active"] } },
    select: { id: true, title: true, status: true },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(requirements);
}
