import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "corp") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const corpProfile = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!corpProfile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify this requirement belongs to the corp
  const req = await prisma.requirement.findUnique({
    where: { id, corp_id: corpProfile.id },
    select: { id: true },
  });
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.submission.updateMany({
    where: { requirement_id: id, read_by_corp: false },
    data: { read_by_corp: true },
  });

  await prisma.collaboration.updateMany({
    where: { requirement_id: id, corp_id: corpProfile.id, unread_for_corp: true },
    data: { unread_for_corp: false },
  });

  return NextResponse.json({ ok: true });
}
