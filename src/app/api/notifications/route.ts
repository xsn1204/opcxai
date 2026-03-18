import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { user_id: session.sub },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return NextResponse.json(
      notifications.map((n) => ({ ...n, payload: JSON.parse(n.payload) }))
    );
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await request.json();

    await prisma.notification.updateMany({
      where: { id: { in: ids }, user_id: session.sub },
      data: { is_read: true },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
