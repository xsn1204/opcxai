import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { scoreSubmission } from "@/lib/score-submission";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { submission_id } = await request.json();
    await scoreSubmission(submission_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Scoring error:", err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
