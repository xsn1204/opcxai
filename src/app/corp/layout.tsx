import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CorpSidebar } from "@/components/layout/CorpSidebar";
import { CorpTopBar } from "@/components/layout/CorpTopBar";
import { CorpBottomNav } from "@/components/layout/CorpBottomNav";
import { prisma } from "@/lib/db";

export default async function CorpLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "corp") redirect("/talent/dashboard");

  const profile = await prisma.corpProfile.findUnique({
    where: { user_id: session.sub },
    select: { company_name: true },
  });

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row">
      <CorpTopBar companyName={profile?.company_name} />
      <CorpSidebar companyName={profile?.company_name} />
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto pb-16 md:pb-0">{children}</main>
      <CorpBottomNav />
    </div>
  );
}
