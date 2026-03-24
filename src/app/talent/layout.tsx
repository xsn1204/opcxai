import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TalentNav } from "@/components/layout/TalentNav";
import { TalentBottomNav } from "@/components/layout/TalentBottomNav";
import { prisma } from "@/lib/db";

export default async function TalentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "talent") redirect("/corp/market");

  const profile = await prisma.talentProfile.findUnique({
    where: { user_id: session.sub },
    select: { username: true, is_student: true },
  });

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-white">
      <TalentNav username={profile?.username} isStudent={profile?.is_student ?? false} />
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-16 md:pb-0">{children}</main>
      <TalentBottomNav />
    </div>
  );
}
