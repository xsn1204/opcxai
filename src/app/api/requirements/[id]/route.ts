import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const req = await prisma.requirement.findUnique({
    where: { id },
    include: { corp_profile: { select: { user_id: true } } },
  });

  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (req.corp_profile.user_id !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete in dependency order (Collaboration has no cascade from Requirement)
  await prisma.$transaction([
    prisma.message.deleteMany({
      where: { collaboration: { requirement_id: id } },
    }),
    prisma.collaboration.deleteMany({
      where: { requirement_id: id },
    }),
    prisma.requirement.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
