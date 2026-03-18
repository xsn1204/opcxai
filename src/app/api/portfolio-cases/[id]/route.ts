import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "talent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const profile = await prisma.talentProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const portfolioCase = await prisma.portfolioCase.findUnique({ where: { id } });
  if (!portfolioCase || portfolioCase.talent_id !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.portfolioCase.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
