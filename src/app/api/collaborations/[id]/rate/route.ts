import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stars } = await req.json();
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be 1–5" }, { status: 400 });
  }

  const collab = await prisma.collaboration.findUnique({
    where: { id },
    select: {
      talent_id: true,
      status: true,
      corp_star_rating: true,
      corp_profile: { select: { user_id: true } },
    },
  });
  if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (collab.corp_profile.user_id !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (collab.status !== "completed") {
    return NextResponse.json({ error: "Collaboration not completed" }, { status: 400 });
  }
  if (collab.corp_star_rating !== null) {
    return NextResponse.json({ error: "Already rated" }, { status: 400 });
  }

  await prisma.collaboration.update({ where: { id }, data: { corp_star_rating: stars } });

  // Recalculate avg_score from all rated collaborations for this talent
  const rated = await prisma.collaboration.findMany({
    where: { talent_id: collab.talent_id, corp_star_rating: { not: null } },
    select: { corp_star_rating: true },
  });
  const avg = rated.reduce((sum, c) => sum + c.corp_star_rating!, 0) / rated.length;

  await prisma.talentProfile.update({
    where: { id: collab.talent_id },
    data: { avg_score: Math.round(avg * 10) / 10 },
  });

  return NextResponse.json({ success: true, avg_score: Math.round(avg * 10) / 10 });
}
