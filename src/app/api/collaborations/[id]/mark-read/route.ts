import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    include: {
      talent_profile: { select: { user_id: true } },
      corp_profile: { select: { user_id: true } },
    },
  });
  if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isTalent = collab.talent_profile.user_id === session.sub;
  const isCorp = collab.corp_profile.user_id === session.sub;
  if (!isTalent && !isCorp) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.collaboration.update({
    where: { id },
    data: isTalent ? { unread_for_talent: false, is_read: true } : { unread_for_corp: false },
  });

  return NextResponse.json({ ok: true });
}
