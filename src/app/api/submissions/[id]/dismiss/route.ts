import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { requirement: { select: { corp_profile: { select: { user_id: true } } } } },
  });

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sub.requirement?.corp_profile?.user_id !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.submission.update({
    where: { id },
    data: { status: "dismissed" },
  });

  return NextResponse.json({ success: true });
}
