import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "talent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { userType } = body;

  try {
    if (userType === "enterprise") {
      const { enterprise_name, team_size, opc_intro, opc_bio, infra, business_tags, specialties, past_cases, contact_info, website_url } = body;
      if (!enterprise_name?.trim()) {
        return NextResponse.json({ error: "企业名称不能为空" }, { status: 400 });
      }

      // Read current bio to preserve fields not in the form (e.g. license_url)
      const current = await prisma.talentProfile.findUnique({
        where: { user_id: session.sub },
        select: { bio: true },
      });
      let currentBio: Record<string, unknown> = {};
      try { currentBio = JSON.parse(current?.bio || "{}"); } catch { /* ignore */ }

      const updatedBio = {
        ...currentBio,
        user_type: "enterprise",
        enterprise_name: enterprise_name.trim(),
        credit_code: currentBio.credit_code ?? "",  // immutable after registration
        team_size: team_size ?? currentBio.team_size ?? "2-5",
        opc_intro: opc_intro?.trim() ?? currentBio.opc_intro ?? "",
        opc_bio: opc_bio?.trim() ?? currentBio.opc_bio ?? "",
        infra: infra ?? currentBio.infra ?? [],
        business_tags: business_tags ?? currentBio.business_tags ?? [],
        specialties: specialties ?? currentBio.specialties ?? [],
        past_cases: past_cases?.trim() ?? "",
      };

      await prisma.talentProfile.update({
        where: { user_id: session.sub },
        data: {
          username: enterprise_name.trim(),
          bio: JSON.stringify(updatedBio),
          contact_info: contact_info?.trim() || "",
          website_url: website_url?.trim() || "",
        },
      });
    } else {
      const { username, specialty, bio, contact_info, website_url, capability_modules, tool_stack, delivery_pref, is_student, edu_email, student_metadata } = body;
      if (!username?.trim()) {
        return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
      }

      await prisma.talentProfile.update({
        where: { user_id: session.sub },
        data: {
          username: username.trim(),
          specialty: specialty?.trim() || "",
          bio: bio?.trim() || "",
          contact_info: contact_info?.trim() || "",
          website_url: website_url?.trim() || "",
          capability_modules: JSON.stringify(capability_modules ?? []),
          tool_stack: JSON.stringify(tool_stack ?? []),
          delivery_pref: delivery_pref ?? "result_bet",
          is_student: is_student ?? false,
          edu_email: is_student ? (edu_email?.trim() ?? "") : "",
          student_metadata: is_student ? (student_metadata ?? "{}") : "{}",
          tags: JSON.stringify(is_student ? ["Student"] : []),
        },
      });
    }
  } catch (err) {
    console.error("[profile/talent PATCH]", err);
    return NextResponse.json({ error: "保存失败，请稍后重试" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
