import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function SubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      requirement: {
        include: { corp_profile: { select: { company_name: true } } },
      },
    },
  });

  if (!submission) notFound();

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "AI 评分中", color: "text-orange-400" },
    evaluated: { label: "评分完成", color: "text-emerald-400" },
    invited: { label: "已收到邀请", color: "text-indigo-400" },
    rejected: { label: "未通过", color: "text-red-400" },
  };
  const statusInfo = statusLabels[submission.status] ?? { label: submission.status, color: "text-slate-400" };

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-8 text-4xl">✓</div>
      <h1 className="text-3xl font-bold text-white mb-2">方案已提交！</h1>
      <p className="text-slate-400 text-sm mb-10 text-center max-w-md">你的考核方案已成功提交至企业。AI 将根据配置的权重维度对你的方案进行综合评分。</p>

      <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 w-full max-w-md mb-8">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">提交详情</h2>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">考核任务</span>
            <span className="text-slate-200 text-sm font-medium text-right max-w-[60%]">{submission.requirement?.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">发布企业</span>
            <span className="text-slate-200 text-sm font-medium">{submission.requirement?.corp_profile?.company_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">提交时间</span>
            <span className="text-slate-200 text-sm">{formatDate(submission.submitted_at.toISOString())}</span>
          </div>
          
        </div>
      </div>

      <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-2xl p-6 w-full max-w-md mb-8">
        <h3 className="text-indigo-400 font-bold text-sm mb-3">接下来会发生什么？</h3>
        <ol className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-3"><span className="text-indigo-500 font-mono text-xs pt-0.5">01</span>AI 将对你的对话记录进行多维度评分</li>
          <li className="flex gap-3"><span className="text-indigo-500 font-mono text-xs pt-0.5">02</span>企业查看评分报告，决定是否发起协作邀请</li>
          <li className="flex gap-3"><span className="text-indigo-500 font-mono text-xs pt-0.5">03</span>如有邀请，你将在「协作邀请」页面收到通知</li>
        </ol>
      </div>

      <div className="flex gap-4">
        <Link href="/talent/challenges" className="px-6 py-3 bg-slate-700 text-slate-200 rounded-xl text-sm font-bold hover:bg-slate-600 transition-colors">继续挑战其他任务</Link>
        <Link href="/talent/invites" className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">查看我的邀请</Link>
      </div>
    </div>
  );
}
