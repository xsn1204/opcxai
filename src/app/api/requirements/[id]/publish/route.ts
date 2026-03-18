import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const questions: { seq: number; title: string; description: string }[] = body.questions ?? [];

    await prisma.$transaction(async (tx) => {
      // Re-save questions with user's edits (add/remove/modify)
      if (questions.length > 0) {
        await tx.examQuestion.deleteMany({ where: { requirement_id: id } });

        const n = questions.length;
        const base = Math.floor(100 / n);
        const remainder = 100 - base * n;

        await tx.examQuestion.createMany({
          data: questions.map((q, i) => ({
            requirement_id: id,
            seq: q.seq,
            title: q.title,
            description: q.description,
            weight: i === 0 ? base + remainder : base,
          })),
        });
      }

      await tx.requirement.update({
        where: { id },
        data: { status: "active" },
      });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
