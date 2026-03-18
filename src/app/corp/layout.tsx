import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CorpSidebar } from "@/components/layout/CorpSidebar";
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
    <div className="h-screen bg-slate-50 flex">
      <CorpSidebar companyName={profile?.company_name} />
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
