import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileEditClient } from "@/components/talent/ProfileEditClient";
import { parseEnterpriseBio, parseStudentMetadata } from "@/types";

export default async function TalentProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, user] = await Promise.all([
    prisma.talentProfile.findUnique({ where: { user_id: session.sub } }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { email: true } }),
  ]);

  if (!profile) redirect("/register/talent");

  const enterpriseBio = parseEnterpriseBio(profile.bio);

  if (enterpriseBio) {
    return (
      <ProfileEditClient
        userType="enterprise"
        initialData={{
          enterprise_name: enterpriseBio.enterprise_name ?? "",
          credit_code: enterpriseBio.credit_code ?? "",
          team_size: enterpriseBio.team_size ?? "2-5",
          opc_intro: enterpriseBio.opc_intro ?? "",
          opc_bio: enterpriseBio.opc_bio ?? "",
          infra: enterpriseBio.infra ?? [],
          business_tags: enterpriseBio.business_tags ?? [],
          specialties: enterpriseBio.specialties ?? [],
          past_cases: enterpriseBio.past_cases ?? "",
          contact_info: profile.contact_info ?? "",
          website_url: profile.website_url ?? "",
        }}
        email={user?.email ?? ""}
      />
    );
  }

  return (
    <ProfileEditClient
      userType="individual"
      initialData={{
        username: profile.username ?? "",
        specialty: profile.specialty ?? "",
        bio: profile.bio ?? "",
        contact_info: profile.contact_info ?? "",
        website_url: profile.website_url ?? "",
        capability_modules: JSON.parse(profile.capability_modules || "[]"),
        tool_stack: JSON.parse(profile.tool_stack || "[]"),
        is_student: profile.is_student ?? false,
        edu_email: profile.edu_email ?? "",
        student_metadata: parseStudentMetadata(profile.student_metadata),
      }}
      email={user?.email ?? ""}
    />
  );
}
