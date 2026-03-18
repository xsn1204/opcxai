import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [users, corpProfiles, requirements, collaborations] = await Promise.all([
    prisma.user.findMany({ select: { id: true, role: true, created_at: true } }),
    prisma.corpProfile.findMany({
      select: { id: true, company_size: true, business_tracks: true, created_at: true },
    }),
    prisma.requirement.findMany({
      select: { id: true, corp_id: true, req_modules: true, status: true, created_at: true },
    }),
    prisma.collaboration.findMany({
      select: { id: true, status: true, requirement_id: true, created_at: true },
    }),
  ]);

  // 用户增长（按天）
  const userGrowth = bucketByDay(users.map((u) => ({ date: u.created_at, role: u.role })));

  // 企业规模分布
  const sizeMap: Record<string, number> = {};
  for (const c of corpProfiles) {
    sizeMap[c.company_size] = (sizeMap[c.company_size] ?? 0) + 1;
  }

  // 企业业务方向分布
  const trackMap: Record<string, number> = {};
  for (const c of corpProfiles) {
    const tracks: string[] = JSON.parse(c.business_tracks || "[]");
    for (const t of tracks) trackMap[t] = (trackMap[t] ?? 0) + 1;
  }

  // 需求模块分布
  const moduleMap: Record<string, number> = {};
  for (const r of requirements) {
    const mods: string[] = JSON.parse(r.req_modules || "[]");
    for (const m of mods) moduleMap[m] = (moduleMap[m] ?? 0) + 1;
  }

  // 需求状态分布
  const reqStatusMap: Record<string, number> = {};
  for (const r of requirements) {
    reqStatusMap[r.status] = (reqStatusMap[r.status] ?? 0) + 1;
  }

  // 成交漏斗
  const invited = collaborations.filter((c) => c.status === "invited").length;
  const completed = collaborations.filter((c) => c.status === "completed").length;
  const total = collaborations.length;

  // 每个需求的邀请数 & 完成数
  const reqFunnel: Record<string, { invited: number; completed: number }> = {};
  for (const c of collaborations) {
    if (!reqFunnel[c.requirement_id]) reqFunnel[c.requirement_id] = { invited: 0, completed: 0 };
    if (c.status === "invited") reqFunnel[c.requirement_id].invited++;
    if (c.status === "completed") reqFunnel[c.requirement_id].completed++;
  }

  return NextResponse.json({
    summary: {
      total_users: users.length,
      total_corp: corpProfiles.length,
      total_talent: users.filter((u) => u.role === "talent").length,
      total_requirements: requirements.length,
      total_collaborations: total,
      invite_to_complete_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    userGrowth,
    corpSize: sizeMap,
    corpTracks: trackMap,
    reqModules: moduleMap,
    reqStatus: reqStatusMap,
    funnel: { total, invited, completed },
  });
}

function bucketByDay(items: { date: Date; role: string }[]) {
  const map: Record<string, { talent: number; corp: number }> = {};
  for (const item of items) {
    const day = item.date.toISOString().slice(0, 10);
    if (!map[day]) map[day] = { talent: 0, corp: 0 };
    if (item.role === "talent") map[day].talent++;
    else if (item.role === "corp") map[day].corp++;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}
