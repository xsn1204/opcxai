import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CorpSettingsClient } from "@/components/corp/CorpSettingsClient";

export default async function CorpSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, user] = await Promise.all([
    prisma.corpProfile.findUnique({ where: { user_id: session.sub }, select: {
      company_name: true, company_desc: true, website_url: true,
      contact_name: true, contact_info: true, business_tracks: true,
      is_verified: true, company_size: true,
    } }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { email: true } }),
  ]);

  if (!profile) redirect("/register/corp");

  return (
    <CorpSettingsClient
      initialData={{
        company_name: profile.company_name ?? "",
        company_desc: profile.company_desc ?? "",
        website_url: profile.website_url ?? "",
        contact_name: profile.contact_name ?? "",
        contact_info: profile.contact_info ?? "",
        business_tracks: JSON.parse(profile.business_tracks || "[]"),
        is_verified: profile.is_verified,
        company_size: profile.company_size ?? "startup",
      }}
      email={user?.email ?? ""}
    />
  );
}
