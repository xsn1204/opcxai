import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "corp") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { company_name, company_desc, website_url, contact_name, contact_info, business_tracks, company_size } = body;

  if (!company_name?.trim()) {
    return NextResponse.json({ error: "企业名称不能为空" }, { status: 400 });
  }

  await prisma.corpProfile.update({
    where: { user_id: session.sub },
    data: {
      company_name: company_name.trim(),
      company_desc: company_desc?.trim() || "",
      website_url: website_url?.trim() || "",
      contact_name: contact_name?.trim() || "",
      contact_info: contact_info?.trim() || "",
      business_tracks: JSON.stringify(business_tracks ?? []),
      ...(company_size && { company_size }),
    },
  });

  return NextResponse.json({ success: true });
}
