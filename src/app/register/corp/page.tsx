"use client";

import { useState, useEffect, useRef, Suspense } from "react"; // 注入 Suspense
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Steps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- 常量定义移到组件外部 ---
const BUSINESS_TRACKS = [
  { id: "ai_products", label: "AI产品原型与开发", icon: "🔧" },
  { id: "ai_tools", label: "AI工作流与自动化", icon: "🤖" },
  { id: "content_marketing", label: "AIGC全媒介创作", icon: "📝" },
  { id: "short_video", label: "短视频与数字人运营", icon: "🎬" },
  { id: "brand_overseas", label: "全球化品牌与出海", icon: "🌍" },
  { id: "growth", label: "AI驱动增长与获客", icon: "📈" },
  { id: "data_analysis", label: "智能决策与业务洞察", icon: "📊" },
  { id: "other", label: "其他", icon: "✨" },
];

const COMPANY_SIZES = [
  { id: "startup",    label: "初创企业",   desc: "30人以内，探索期，快速验证" },
  { id: "growth",     label: "成长期企业", desc: "31-150人，融资发展，规模扩张" },
  { id: "scale",      label: "规模化企业", desc: "151-1000人，成熟运营，持续增长" },
  { id: "enterprise", label: "大型企业",   desc: "1000人以上，集团或上市公司" },
];

// --- 实际业务组件 ---
function RegisterCorpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [companySize, setCompanySize] = useState("startup");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);

  const [verifyCode, setVerifyCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown]);

  useEffect(() => {
    setEmailVerified(false);
    setCodeSent(false);
    setVerifyCode("");
  }, [email]);

  function toggleTrack(id: string) {
    setSelectedTracks((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  }

  async function handleSendCode() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("请输入有效的企业邮箱地址");
      return;
    }
    setError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "发送失败，请重试"); return; }
      setCodeSent(true);
      setCountdown(60);
    } catch {
      setError("发送失败，请检查网络");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (!verifyCode.trim()) { setError("请输入验证码"); return; }
    setError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verifyCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "验证失败"); return; }
      setEmailVerified(true);
    } catch {
      setError("验证失败，请重试");
    } finally {
      setSendingCode(false);
    }
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !companyName || !contactName) { setError("请填写所有必填项"); return; }
    if (password.length < 8) { setError("密码至少需要8位"); return; }
    if (!emailVerified) { setError("请先完成邮箱验证"); return; }
    setError("");
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, role: "corp",
          company_name: companyName, contact_name: contactName,
          business_tracks: selectedTracks,
          company_size: companySize,
          ...(referralCode && { referral_code: referralCode }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "注册失败，请重试");
        return;
      }
      track("corp_registered", {
        company_size: companySize,
        business_tracks: selectedTracks,
        via_referral: !!referralCode,
      });
      router.push("/corp/market");
    } catch {
      setError("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="text-2xl font-bold italic tracking-tighter text-indigo-600 mb-8">OPC x AI</Link>

      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Steps current={step} total={2} labels={["企业信息", "业务需求"]} />
        </div>

        <div className="mb-5 relative px-5 py-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <span className="absolute top-3 right-3 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">✦ 限时</span>
          <p className="text-sm font-bold text-indigo-700 mb-2">🚀 首批企业专属权益</p>
          <ul className="space-y-1">
            <li className="text-xs text-indigo-600 flex items-center gap-1.5"><span className="text-indigo-400">✓</span> 极简 2 步完成入驻</li>
            <li className="text-xs text-indigo-600 flex items-center gap-1.5"><span className="text-indigo-400">✓</span> 免费期内无任何费用</li>
            <li className="text-xs text-indigo-600 flex items-center gap-1.5"><span className="text-indigo-400">✓</span> 优先获得 OPC 推荐资源</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          {referralCode && step === 1 && (
            <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-emerald-500 text-base">🎁</span>
                <p className="text-sm font-bold text-emerald-700">通过邀请链接注册，双方各得奖励</p>
              </div>
              <ul className="space-y-0.5 pl-7">
                <li className="text-xs text-emerald-600">· 你：完成注册后立即获得 <strong>+3 次</strong>永久邀约机会</li>
                <li className="text-xs text-emerald-600">· 邀请方：同步获得 <strong>+3 次</strong>额外邀约机会</li>
              </ul>
            </div>
          )}
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">企业入驻</h1>
              <p className="text-slate-400 text-sm mb-8">填写企业信息，开始精准筛选 AI 超级个体</p>
              <form onSubmit={handleStep1} className="space-y-5">
                <Input label="企业名称" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="你的企业或品牌名称" required />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">企业规模</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_SIZES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCompanySize(s.id)}
                        className={cn(
                          "flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all",
                          companySize === s.id
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className={cn("text-sm font-semibold", companySize === s.id ? "text-indigo-700" : "text-slate-700")}>
                          {s.label}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="联系人姓名" type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="HR 或负责人姓名" required />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    企业邮箱 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hr@company.com"
                      required
                      disabled={emailVerified}
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0 || emailVerified}
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                        emailVerified
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default"
                          : countdown > 0
                          ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-500"
                      )}
                    >
                      {emailVerified ? "✓ 已验证" : countdown > 0 ? `${countdown}s` : sendingCode ? "发送中..." : "获取验证码"}
                    </button>
                  </div>
                </div>

                {codeSent && !emailVerified && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">验证码</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="请输入 6 位验证码"
                        maxLength={6}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={sendingCode || verifyCode.length < 6}
                        className="px-4 py-3 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        {sendingCode ? "验证中..." : "验证"}
                      </button>
                    </div>
                  </div>
                )}

                <Input label="账户密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" hint="至少包含 8 个字符" required />
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
                <Button type="submit" className="w-full py-4">下一步：选择业务需求</Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">业务需求方向</h1>
              <p className="text-slate-400 text-sm mb-8">你需要哪方面的业务支持（可多选）</p>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {BUSINESS_TRACKS.map((track) => (
                    <button key={track.id} type="button" onClick={() => toggleTrack(track.id)}
                      className={cn("flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                        selectedTracks.includes(track.id) ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300")}>
                      <span className="text-xl">{track.icon}</span>
                      <span className="text-sm font-medium">{track.label}</span>
                    </button>
                  ))}
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1 py-4">返回修改</Button>
                  <Button type="submit" loading={loading} className="flex-1 py-4">完成入驻</Button>
                </div>
              </form>
            </>
          )}

          <p className="text-center text-slate-400 text-sm mt-6">
            已有账号？<Link href="/login" className="text-indigo-600 hover:text-indigo-700 ml-1">直接登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// --- 最终导出的页面入口 ---
export default function RegisterCorpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">正在加载注册页面...</div>}>
      <RegisterCorpContent />
    </Suspense>
  );
}