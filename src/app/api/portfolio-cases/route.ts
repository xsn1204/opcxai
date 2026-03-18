import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "talent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.talentProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const cases = await prisma.portfolioCase.findMany({
    where: { talent_id: profile.id },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "talent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.talentProfile.findUnique({
    where: { user_id: session.sub },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const body = await request.json();
  const { title, description, images, files } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "案例标题不能为空" }, { status: 400 });
  }

  const portfolioCase = await prisma.portfolioCase.create({
    data: {
      talent_id: profile.id,
      title: title.trim(),
      description: description?.trim() ?? "",
      images: JSON.stringify(images ?? []),
      files: JSON.stringify(files ?? []),
    },
  });

  return NextResponse.json(portfolioCase);
}
