import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CAPABILITY_MODULES } from "@/types";
import { CourseBanner } from "@/components/talent/CourseBanner";
import { ClassicQuestions } from "@/components/talent/ClassicQuestions";
import { RecommendedChallenges } from "@/components/talent/RecommendedChallenges";
import { ProfileCard } from "@/components/talent/ProfileCard";
import { FreeSimCard } from "@/components/talent/FreeSimCard";
import { StudentZoneCard } from "@/components/talent/StudentZoneCard";

export default async function TalentDashboard() {
  const session = await getSession();

  const [profile, requirements] = await Promise.all([
    prisma.talentProfile.findUnique({ where: { user_id: session!.sub } }),
    prisma.requirement.findMany({
      where: { status: "active" },
      include: { corp_profile: { select: { company_name: true } } },
      orderBy: { created_at: "desc" },
      take: 10,
    }),
  ]);

  const moduleLabels = Object.fromEntries(CAPABILITY_MODULES.map((m) => [m.id, m.label]));
  const capMods: string[] = JSON.parse(profile?.capability_modules || "[]");
  const toolStack: string[] = JSON.parse(profile?.tool_stack || "[]");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* Top row: 4 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-10 items-stretch">
        {/* 能力提升推送 banner - spans 2 columns on lg */}
        <div className="sm:col-span-2 h-64">
          <CourseBanner />
        </div>

        {/* 操盘手名片 */}
        <ProfileCard
          profileId={profile?.id ?? ""}
          username={profile?.username ?? ""}
          specialty={profile?.specialty ?? undefined}
          bio={profile?.bio ?? undefined}
          avgScore={profile?.avg_score ?? 0}
          collabCount={profile?.collab_count ?? 0}
          capMods={capMods}
          moduleLabels={moduleLabels}
          toolStack={toolStack}
        />

        {/* 自由拟真模式 / 学生能力专区 */}
        {profile?.is_student ? <StudentZoneCard /> : <FreeSimCard />}
      </div>

      {/* Recommended Challenges with rotation */}
      <RecommendedChallenges
        requirements={requirements}
      />

      {/* Classic AI Questions */}
      <div className="border-t border-slate-800 pt-12">
        <ClassicQuestions talentId={profile?.id ?? session!.sub} />
      </div>
    </div>
  );
}
