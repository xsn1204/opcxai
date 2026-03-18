import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkSensitiveMultiple, formatHitMessage } from "@/lib/sensitive-filter";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "active";

    const requirements = await prisma.requirement.findMany({
      where: { status },
      include: { corp_profile: { select: { company_name: true } } },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(
      requirements.map((r) => ({
        ...r,
        ai_tags: JSON.parse(r.ai_tags),
        question_types: JSON.parse(r.question_types),
        capability_weights: JSON.parse(r.capability_weights),
      }))
    );
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corpProfile = await prisma.corpProfile.findUnique({
      where: { user_id: session.sub },
    });
    if (!corpProfile) {
      return NextResponse.json({ error: "Corp profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      intent_desc,
      ai_tags,
      business_stage,
      complexity,
      budget_min,
      budget_max,
      deadline,
      question_types,
      capability_weights,
      req_modules,
    } = body;

    const filter = checkSensitiveMultiple([title ?? "", intent_desc ?? ""]);
    if (!filter.ok) {
      return NextResponse.json(
        { error: formatHitMessage(filter.hits), words: filter.hits },
        { status: 400 }
      );
    }

    const req = await prisma.requirement.create({
      data: {
        corp_id: corpProfile.id,
        title,
        intent_desc,
        ai_tags: JSON.stringify(ai_tags ?? []),
        business_stage,
        complexity,
        budget_min,
        budget_max,
        deadline: deadline ? new Date(deadline) : null,
        question_types: JSON.stringify(question_types ?? []),
        capability_weights: JSON.stringify(capability_weights ?? {}),
        req_modules: JSON.stringify(req_modules ?? []),
        status: "draft",
      },
    });

    return NextResponse.json(req, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
