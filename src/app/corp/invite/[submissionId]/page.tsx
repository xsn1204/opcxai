import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { InviteClient } from "@/components/corp/InviteClient";
import { getSession } from "@/lib/auth";

export default async function CorpInvitePage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      talent_profile: { select: { username: true } },
      requirement: {
        select: {
          title: true,
          corp_profile: { select: { user_id: true } }
        }
      },
    },
  });

  if (!sub) notFound();

  // 验证资源所有权
  if (sub.requirement?.corp_profile?.user_id !== session.sub) {
    redirect("/corp/requirements");
  }

return (
    // 关键点：添加 mx-auto
    <div className="p-8 max-w-3xl mx-auto"> 
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">发起协作邀请</h1>
        <p className="text-slate-400 text-sm mt-1">向候选人发送邀请，开启正式项目合作</p>
      </div>
      <InviteClient
        submissionId={submissionId}
        talentName={sub.talent_profile?.username ?? "候选人"}
        requirementTitle={sub.requirement?.title ?? "项目"}
      />
    </div>
  );
}
