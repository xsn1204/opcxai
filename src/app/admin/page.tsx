"use client";

import { useEffect, useState } from "react";

const CORP_SIZE_LABELS: Record<string, string> = {
  startup: "初创企业",
  growth: "成长期",
  scale: "规模化",
  enterprise: "大型企业",
};

const TRACK_LABELS: Record<string, string> = {
  ai_products: "AI产品原型",
  ai_tools: "AI工作流",
  content_marketing: "AIGC创作",
  short_video: "短视频/数字人",
  brand_overseas: "全球化/出海",
  growth: "AI增长获客",
  data_analysis: "智能决策",
  other: "其他",
};

const REQ_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  active: "进行中",
  closed: "已关闭",
};

interface StatsData {
  summary: {
    total_users: number;
    total_corp: number;
    total_talent: number;
    total_requirements: number;
    total_collaborations: number;
    invite_to_complete_rate: number;
  };
  userGrowth: { date: string; talent: number; corp: number }[];
  corpSize: Record<string, number>;
  corpTracks: Record<string, number>;
  reqModules: Record<string, number>;
  reqStatus: Record<string, number>;
  funnel: { total: number; invited: number; completed: number };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-800/60 rounded-2xl px-5 py-4">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, labelMap }: { data: Record<string, number>; labelMap?: Record<string, string> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const max = entries[0]?.[1] ?? 1;
  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-slate-400 text-xs w-24 shrink-0 truncate">{labelMap?.[key] ?? key}</span>
          <div className="flex-1 bg-slate-700/40 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${(val / max) * 100}%` }}
            />
          </div>
          <span className="text-slate-400 text-xs w-6 text-right">{val}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
      <p className="text-slate-300 text-sm font-semibold mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
        <p className="text-slate-500 text-sm">加载中...</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, userGrowth, corpSize, corpTracks, reqModules, reqStatus, funnel } = data;

  // 用户增长：最近 14 天
  const recentGrowth = userGrowth.slice(-14);

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto" style={{ background: "#0f172a" }}>
      <div className="mb-8">
        <p className="text-white text-xl font-bold">运营面板</p>
        <p className="text-slate-500 text-xs mt-1">数据库实时数据 · PostHog 行为数据请前往 posthog.com 查看</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="总用户数" value={summary.total_users} sub={`Talent ${summary.total_talent} · Corp ${summary.total_corp}`} />
        <StatCard label="企业数" value={summary.total_corp} />
        <StatCard label="需求数" value={summary.total_requirements} />
        <StatCard label="协作总数" value={summary.total_collaborations} />
        <StatCard label="邀请→完成转化率" value={`${summary.invite_to_complete_rate}%`} />
        <StatCard label="完成协作数" value={funnel.completed} sub={`邀请中 ${funnel.invited}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* 成交漏斗 */}
        <Section title="成交漏斗">
          <div className="space-y-3">
            {[
              { label: "企业注册", val: summary.total_corp, color: "bg-indigo-500" },
              { label: "发布需求", val: summary.total_requirements, color: "bg-violet-500" },
              { label: "发出邀请", val: funnel.total, color: "bg-purple-500" },
              { label: "完成合作", val: funnel.completed, color: "bg-emerald-500" },
            ].map((step, i, arr) => {
              const pct = i === 0 ? 100 : Math.round((step.val / arr[0].val) * 100);
              return (
                <div key={step.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{step.label}</span>
                    <span className="text-slate-300 font-medium">{step.val} <span className="text-slate-600">({pct}%)</span></span>
                  </div>
                  <div className="bg-slate-700/40 rounded-full h-2">
                    <div className={`${step.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 需求状态 */}
        <Section title="需求状态分布">
          <BarChart data={reqStatus} labelMap={REQ_STATUS_LABELS} />
        </Section>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* 企业规模 */}
        <Section title="企业规模分布">
          <BarChart data={corpSize} labelMap={CORP_SIZE_LABELS} />
        </Section>

        {/* 企业业务方向 */}
        <Section title="企业业务方向">
          <BarChart data={corpTracks} labelMap={TRACK_LABELS} />
        </Section>
      </div>

      {/* 需求模块 */}
      <div className="mb-4">
        <Section title="需求模块分布">
          <BarChart data={reqModules} />
        </Section>
      </div>

      {/* 用户增长（最近14天） */}
      <Section title="用户增长（最近 14 天）">
        {recentGrowth.length === 0 ? (
          <p className="text-slate-600 text-xs">暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2 font-normal">日期</th>
                  <th className="text-right py-2 font-normal">Talent</th>
                  <th className="text-right py-2 font-normal">Corp</th>
                  <th className="text-right py-2 font-normal">合计</th>
                </tr>
              </thead>
              <tbody>
                {recentGrowth.map((row) => (
                  <tr key={row.date} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 text-slate-400">{row.date}</td>
                    <td className="py-2 text-right text-indigo-400">{row.talent}</td>
                    <td className="py-2 text-right text-amber-400">{row.corp}</td>
                    <td className="py-2 text-right text-slate-300 font-medium">{row.talent + row.corp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* PostHog 提示 */}
      <div className="mt-6 px-4 py-3 rounded-xl border border-slate-700/50 bg-slate-800/30">
        <p className="text-slate-500 text-xs">
          页面访问量、用户流失步骤、功能点击行为 → 前往{" "}
          <a href="https://app.posthog.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
            PostHog Dashboard
          </a>{" "}
          查看埋点数据（需配置 NEXT_PUBLIC_POSTHOG_KEY）
        </p>
      </div>
    </div>
  );
}
