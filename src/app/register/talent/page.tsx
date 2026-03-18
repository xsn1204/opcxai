"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAPABILITY_MODULES, TOOL_STACK } from "@/types";
import { cn } from "@/lib/utils";

type UserType = "individual" | "enterprise";
type Step = 0 | 1 | 2;

const TEAM_SIZES = [
  { value: "solo", label: "独立操盘（仅我自己）" },
  { value: "2-5", label: "2–5 人" },
  { value: "6-20", label: "6–20 人" },
  { value: "21-100", label: "21–100 人" },
];


const INFRA_OPTIONS = [
  { id: "server_cluster", label: "自有算力资源", icon: "🖥️" }, // 原: 服务器集群
  { id: "premium_tools", label: "主流AI工具包", icon: "🧰" }, // 原: 服务器集群
  { id: "gpu_matrix", label: "多模态创作中心", icon: "🎬" },   // 侧重视频/图像生产力
   { id: "data_analytics", label: "私有知识库", icon: "📊" }, // 原: 数据分析
    { id: "automation", label: "自动化分发工具", icon: "🤖" },  // 原: 自动化发布
  { id: "workflow", label: "标准SOP协作平台", icon: "🔄" } ,    // 侧重管理与交付

];

const BUSINESS_TAGS = [
      { value: "biz_entity", label: "支持合同签订"},
      { value: "biz_invoice", label: "支持对公结算"},
      { value: "biz_maintenance", label: "支持后期维护" }, // 解决"坏了找谁"的问题
       { value: "biz_consulting", label: "支持方案咨询"}, // 解决"怎么做更好"的问题
      { value: "biz_security", label: "自研工具/平台"}, // 解决"AI产物归谁"的问题
  { value: "biz_case", label: "实证落地案例"}    // 解决"做没做过"的问题
];

const SPECIALTIES = [

  { value: "ai_products", label: "AI产品原型与开发", icon: "🔧" },
  { value: "ai_tools", label: "AI工作流与自动化", icon: "🤖" },
  { value: "content_marketing", label: "AIGC全媒介创作", icon: "📝" },
  { value: "short_video", label: "短视频与数字人运营", icon: "🎬" },
  { value: "brand_overseas", label: "全球化品牌与出海", icon: "🌍" },
  { value: "growth", label: "AI驱动增长与获客", icon: "📈" },
  { value: "data_analysis", label: "智能决策与业务洞察", icon: "📊" },
  { value: "other", label: "复杂业务定制及其他", icon: "✨" },

];
// ─── Sub-components ───────────────────────────────────────────────────────────

function DarkInput({
  label, value, onChange, type = "text", placeholder, required, hint, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; hint?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-slate-300">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RegisterTalentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);

  // Step 1 — shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1 — individual
  const [username, setUsername] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Step 1 — enterprise
  const [enterpriseName, setEnterpriseName] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [licenseFileName, setLicenseFileName] = useState("");
  const [teamSize, setTeamSize] = useState("2-5");

  // Step 2 — individual
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [deliveryPref, setDeliveryPref] = useState<"result_bet" | "hourly">("result_bet");

  // Student identity (individual only, captured in Step 1)
  const [isStudent, setIsStudent] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [studentEduEmail, setStudentEduEmail] = useState("");
  const [studentMajor, setStudentMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 4);


  // Step 2 — enterprise
  const [selectedInfra, setSelectedInfra] = useState<string[]>([]);
  const [pastCases, setPastCases] = useState("");
  const [selectedBusinessTags, setSelectedBusinessTags] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  // ── Email verification state ──────────────────────────────────────────────
  const [verifyCode, setVerifyCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The actual email used for verification & registration depends on identity
  const effectiveEmail = isStudent ? studentEduEmail : email;

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(countdownRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown]);

  // Reset verification when effective email changes
  useEffect(() => {
    setEmailVerified(false);
    setCodeSent(false);
    setVerifyCode("");
  }, [effectiveEmail]);

  // Reset verification when toggling student mode
  useEffect(() => {
    setEmailVerified(false);
    setCodeSent(false);
    setVerifyCode("");
    setCountdown(0);
  }, [isStudent]);

  const isEnterprise = userType === "enterprise";
  const accentColor = isEnterprise ? "violet" : "indigo";

  async function handleSendCode() {
    if (!effectiveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (isStudent && !/\.edu(\.cn)?$/i.test(effectiveEmail)) {
      setError("教育邮箱须以 .edu 或 .edu.cn 结尾");
      return;
    }
    setError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: effectiveEmail }),
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
        body: JSON.stringify({ email: effectiveEmail, code: verifyCode.trim() }),
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

  const toolsByCategory = TOOL_STACK.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof TOOL_STACK>);

  function toggleModule(id: string) {
    setSelectedModules((p) => p.includes(id) ? p.filter((m) => m !== id) : [...p, id]);
  }
  function toggleTool(id: string) {
    setSelectedTools((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);
  }
  function toggleInfra(id: string) {
    setSelectedInfra((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  }
  function toggleBusinessTag(value: string) {
    setSelectedBusinessTags((p) => p.includes(value) ? p.filter((v) => v !== value) : [...p, value]);
  }
  function toggleSpecialty(value: string) {
    setSelectedSpecialties((p) => p.includes(value) ? p.filter((v) => v !== value) : [...p, value]);
  }

  function selectUserType(type: UserType) {
    setUserType(type);
    setError("");
    setTimeout(() => setStep(1), 120);
  }

  async function uploadLicense(file: File) {
    setLicenseUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      setLicenseUrl(data.url);
      setLicenseFileName(file.name);
    } catch {
      setError("执照上传失败，请重试");
    } finally {
      setLicenseUploading(false);
    }
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (userType === "individual") {
      if (!username) { setError("请填写昵称"); return; }
      if (isStudent) {
        if (!schoolName.trim()) { setError("请填写学校名称"); return; }
        if (!studentEduEmail) { setError("请填写教育邮箱"); return; }
        if (!/\.edu(\.cn)?$/i.test(studentEduEmail)) { setError("教育邮箱须以 .edu 或 .edu.cn 结尾"); return; }
      } else {
        if (!email) { setError("请填写邮箱"); return; }
      }
    } else {
      if (!email || !password || !enterpriseName || !creditCode) { setError("请填写所有必填项"); return; }
    }
    if (!password) { setError("请填写密码"); return; }
    if (password.length < 8) { setError("密码至少需要 8 位"); return; }
    if (!emailVerified) { setError("请先完成邮箱验证"); return; }
    setError("");
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (userType === "individual" && selectedModules.length === 0) {
      setError("请至少选择一个能力模块");
      return;
    }
    setError("");
    setLoading(true);

    const bioData = userType === "individual"
      ? { user_type: "individual" }
      : {
          user_type: "enterprise",
          enterprise_name: enterpriseName,
          credit_code: creditCode,
          license_url: licenseUrl,
          team_size: teamSize,
          infra: selectedInfra,
          past_cases: pastCases,
          business_tags: selectedBusinessTags,
          specialties: selectedSpecialties,
        };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: effectiveEmail,
          password,
          role: "talent",
          username: userType === "individual" ? username : enterpriseName,
          specialty: userType === "individual" ? specialty : "enterprise_opc",
          bio: JSON.stringify(bioData),
          capability_modules: selectedModules,
          tool_stack: selectedTools,
          delivery_pref: deliveryPref,
          is_student: isStudent,
          edu_email: isStudent ? studentEduEmail : "",
          student_metadata: isStudent
            ? JSON.stringify({ school_name: schoolName, major: studentMajor, graduation_year: graduationYear })
            : "{}",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "注册失败，请重试"); return; }
      router.push("/talent/dashboard");
    } catch {
      setError("注册失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = isEnterprise
    ? ["选择身份", "企业信息"]
    : ["选择身份", "个人信息"];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #0f172a 55%)" }}
    >
      {/* Logo */}
      <Link href="/" className="text-2xl font-bold italic tracking-tighter text-white mb-8 select-none">
        OPC x AI
      </Link>

      {/* Step indicator */}
      {step > 0 && (
        <div className="flex items-center gap-1.5 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300",
                i + 1 <= step
                  ? isEnterprise ? "bg-violet-600 text-white" : "bg-indigo-600 text-white"
                  : "bg-slate-800/60 text-slate-500 border border-slate-700"
              )}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                  {i + 1 < step ? "✓" : i + 1}
                </span>
                {label}
              </div>
              {i < stepLabels.length - 1 && (
                <div className="w-5 h-px bg-slate-700" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════ STEP 0: Identity Selection ══════ */}
      {step === 0 && (
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">你是哪种 OPC？</h1>
            <p className="text-slate-400 text-sm">选择你的身份，我们将为你精准对接业务需求</p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* 个人OPC */}
            <button
              onClick={() => selectUserType("individual")}
              className={cn(
                "group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 overflow-hidden",
                "bg-slate-900/70 backdrop-blur-xl",
                userType === "individual"
                  ? "border-indigo-500 shadow-[0_0_48px_rgba(99,102,241,0.4)]"
                  : "border-slate-700/60 hover:border-indigo-500/40 hover:shadow-[0_0_24px_rgba(99,102,241,0.15)]"
              )}
            >
              {/* Hover glow fill */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
              {/* Selected pulse ring */}
              {userType === "individual" && (
                <div className="absolute inset-0 rounded-3xl border border-indigo-400/30 animate-pulse pointer-events-none" />
              )}

              <div className="relative space-y-4">

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xl font-bold text-white">个人 OPC</h3>
                    {userType === "individual" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600/40 text-indigo-300 border border-indigo-500/30">已选择</span>
                    )}
                  </div>
                  <p className="text-indigo-400 text-xs font-bold">超级个体</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  以个人身份入驻，建立超级个体信用档案，承接单点项目需求。
                </p>
                <ul className="space-y-1.5">
                  {["个人工具熟练度评估", "单项目深度交付", "实战经验认证"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </button>

            {/* 机构OPC */}
            <button
              onClick={() => selectUserType("enterprise")}
              className={cn(
                "group relative p-8 rounded-3xl border-2 text-left transition-all duration-300 overflow-hidden",
                "bg-slate-900/70 backdrop-blur-xl",
                userType === "enterprise"
                  ? "border-violet-500 shadow-[0_0_48px_rgba(139,92,246,0.4)]"
                  : "border-slate-700/60 hover:border-violet-500/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)]"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
              {userType === "enterprise" && (
                <div className="absolute inset-0 rounded-3xl border border-violet-400/30 animate-pulse pointer-events-none" />
              )}

              <div className="relative space-y-4">

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xl font-bold text-white">机构 OPC</h3>
                    {userType === "enterprise" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/40 text-violet-300 border border-violet-500/30">已选择</span>
                    )}
                  </div>
                  <p className="text-violet-400 text-xs font-bold">已注册公司实体</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  以机构身份入驻，展示规模化交付能力，承接多项目并发的复杂需求。
                </p>
                <ul className="space-y-1.5">
                  {["团队账号矩阵规模背书", "多项目并发交付能力", "过往企业案例认证"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            已有账号？
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 ml-1 transition-colors">直接登录</Link>
          </p>
        </div>
      )}

      {/* ══════ STEP 1: Basic Info ══════ */}
      {step === 1 && (
        <div
          className="w-full max-w-lg transition-all duration-300"
          style={{ animation: "fadeSlideIn 0.25s ease" }}
        >
          <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div className={cn(
            "bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border",
            isEnterprise ? "border-violet-500/20" : "border-indigo-500/15"
          )}>
            {!isEnterprise ? (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">创建个人账号</h1>
                <p className="text-slate-400 text-sm mb-6">填写基本信息，开始你的 AI 超级个体之旅</p>
                <form onSubmit={handleStep1} className="space-y-5">

                  {/* ── 学生身份开关（最顶部） ── */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700">
                    <div>
                      <p className="text-sm font-bold text-slate-200">我是学生</p>
                      <p className="text-xs text-emerald-400 mt-0.5">学生 OPC 身份可获得额外奖励</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStudent(!isStudent)}
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none",
                        isStudent ? "bg-emerald-500" : "bg-slate-600"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300",
                        isStudent ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                   {/* 邮箱 / 教育邮箱 + 验证码 */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-300">
                        {isStudent ? "教育邮箱" : "邮箱"} <span className="text-red-400">*</span>
                        {isStudent && <span className="text-slate-500 font-normal text-xs ml-1">（须以 .edu 或 .edu.cn 结尾）</span>}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={isStudent ? studentEduEmail : email}
                          onChange={(e) => isStudent ? setStudentEduEmail(e.target.value) : setEmail(e.target.value)}
                          placeholder={isStudent ? "your@university.edu.cn" : "your@email.com"}
                          required
                          disabled={emailVerified}
                          className={cn(
                            "flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none transition-colors placeholder:text-slate-600 disabled:opacity-50",
                            isStudent ? "focus:border-emerald-500" : "focus:border-indigo-500"
                          )}
                        />
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={sendingCode || countdown > 0 || emailVerified}
                          className={cn(
                            "px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                            emailVerified
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default"
                              : countdown > 0
                              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                              : isStudent
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "bg-indigo-600 text-white hover:bg-indigo-500"
                          )}
                        >
                          {emailVerified ? "✓ 已验证" : countdown > 0 ? `${countdown}s` : sendingCode ? "发送中..." : "获取验证码"}
                        </button>
                      </div>
                    </div>

                    {codeSent && !emailVerified && (
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-slate-300">验证码</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value)}
                            placeholder="请输入 6 位验证码"
                            maxLength={6}
                            className={cn(
                              "flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none transition-colors placeholder:text-slate-600",
                              isStudent ? "focus:border-emerald-500" : "focus:border-indigo-500"
                            )}
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={sendingCode || verifyCode.length < 6}
                            className={cn(
                              "px-4 py-3 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors",
                              isStudent ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
                            )}
                          >
                            {sendingCode ? "验证中..." : "验证"}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">验证码已发送至 {effectiveEmail}，5 分钟内有效</p>
                      </div>
                    )}
                                        <DarkInput label="密码" type="password" value={password} onChange={setPassword} placeholder="至少 8 位" hint="至少包含 8 个字符" required />
                  {/* ── 动态表单区 ── */}
                  <div
                    key={isStudent ? "student" : "regular"}
                    className="space-y-5"
                    style={{ animation: "fadeSlideIn 0.2s ease" }}
                  >
                    <DarkInput label="昵称" value={username} onChange={setUsername} placeholder="你的专业身份名称" required />

                    {isStudent && (
                      <>
                        <DarkInput label="学校名称" value={schoolName} onChange={setSchoolName} placeholder="如：北京大学" required />
                        <DarkInput label="专业方向" value={studentMajor} onChange={setStudentMajor} placeholder="如：计算机科学" />
                        <div className="space-y-1.5">
                          <label className="block text-sm font-bold text-slate-300">预计毕业年份</label>
                          <select
                            value={graduationYear}
                            onChange={(e) => setGraduationYear(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 transition-colors"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                              <option key={y} value={y}>{y} 年</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

 


                  </div>

                  {error && <ErrorMsg>{error}</ErrorMsg>}
                  <button
                    type="submit"
                    className={cn(
                      "w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors",
                      isStudent ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
                    )}
                  >
                    下一步：配置能力画像 →
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-white">机构入驻</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 border border-violet-500/30">机构 OPC</span>
                </div>
                <p className="text-slate-400 text-sm mb-8">填写机构信息，建立规模化交付资质</p>
                <form onSubmit={handleStep1} className="space-y-5">
                  <DarkInput label="机构全称" value={enterpriseName} onChange={setEnterpriseName} placeholder="营业执照上的机构全称" required />

                  {/* Email + send code */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-300">
                      登录邮箱 <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@company.com"
                        required
                        disabled={emailVerified}
                        className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={sendingCode || countdown > 0 || emailVerified}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                          emailVerified
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : countdown > 0
                            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                            : "bg-violet-600 text-white hover:bg-violet-500"
                        )}
                      >
                        {emailVerified ? "✓ 已验证" : countdown > 0 ? `${countdown}s` : sendingCode ? "发送中..." : "获取验证码"}
                      </button>
                    </div>
                  </div>

                  {/* Verification code input */}
                  {codeSent && !emailVerified && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-slate-300">验证码</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value)}
                          placeholder="请输入 6 位验证码"
                          maxLength={6}
                          className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-violet-500 transition-colors placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={sendingCode || verifyCode.length < 6}
                          className="px-4 py-3 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
                        >
                          {sendingCode ? "验证中..." : "验证"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">验证码已发送至 {email}，5 分钟内有效</p>
                    </div>
                  )}

                  <DarkInput label="账户密码" type="password" value={password} onChange={setPassword} placeholder="至少 8 位" required />
                  <DarkInput label="统一社会信用代码" value={creditCode} onChange={setCreditCode} placeholder="18 位统一社会信用代码" required />

                  {/* License upload */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-300">
                      营业执照上传 <span className="text-slate-500 font-normal text-xs">（选填）</span>
                    </label>
                    <input
                      ref={licenseInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadLicense(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => licenseInputRef.current?.click()}
                      className="w-full px-4 py-3 bg-slate-800/60 border-2 border-dashed border-slate-600 hover:border-violet-500 text-sm transition-colors rounded-xl text-left"
                    >
                      {licenseUploading ? (
                        <span className="text-slate-400 animate-pulse">上传中...</span>
                      ) : licenseFileName ? (
                        <span className="text-emerald-400">✓ {licenseFileName}</span>
                      ) : (
                        <span className="text-slate-500">点击上传营业执照 (PDF / JPG / PNG)</span>
                      )}
                    </button>
                  </div>

                  {error && <ErrorMsg>{error}</ErrorMsg>}
                  <button type="submit" className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors">
                    下一步：配置企业画像 →
                  </button>
                </form>
              </>
            )}

            <button
              onClick={() => { setStep(0); setUserType(null); setError(""); }}
              className="w-full text-center text-slate-600 hover:text-slate-400 text-xs mt-5 transition-colors"
            >
              ← 重新选择身份
            </button>
          </div>
        </div>
      )}

      {/* ══════ STEP 2: Profile Config ══════ */}
      {step === 2 && (
        <div
          className="w-full max-w-lg transition-all duration-300"
          style={{ animation: "fadeSlideIn 0.25s ease" }}
        >
          <div className={cn(
            "bg-slate-900/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border",
            isEnterprise ? "border-violet-500/20" : "border-indigo-500/15"
          )}>
            {!isEnterprise ? (
              /* ── Individual Profile ── */
              <>
                <h1 className="text-2xl font-bold text-white mb-1">配置能力画像</h1>
                <p className="text-slate-400 text-sm mb-8">告诉企业你擅长什么，提升被检索和匹配的概率</p>
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Capability modules */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-3">
                      能力模块 <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CAPABILITY_MODULES.map((mod) => (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModule(mod.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
                            selectedModules.includes(mod.id)
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                              : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500"
                          )}
                        >
                          <span>{mod.icon}</span>
                          <span>{mod.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tool stack */}

                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-3">
                      常用工具
                    </label>
                    {Object.entries(toolsByCategory).map(([category, tools]) => (
                      <div key={category} className="mb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {tools.map((tool) => (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => toggleTool(tool.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                                selectedTools.includes(tool.id)
                                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                  : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500"
                              )}
                            >
                              {tool.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {error && <ErrorMsg>{error}</ErrorMsg>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition-colors">
                      返回修改
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                      {loading ? "提交中..." : "完成注册"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* ── Enterprise Profile ── */
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-white">配置企业画像</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/30 text-violet-400 border border-violet-500/30">机构 OPC</span>
                </div>
                <p className="text-slate-400 text-sm mb-8">展示规模化交付能力，吸引更多高价值项目</p>
                <form onSubmit={handleSubmit} className="space-y-7">
                  {/* Matrix accounts */}
              <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">团队规模 <span className="text-red-400">*</span></label>
                    <div className="flex flex-wrap gap-2">
                      {TEAM_SIZES.map((ts) => (
                        <button
                          key={ts.value}
                          type="button"
                          onClick={() => setTeamSize(ts.value)}
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl border text-sm text-left transition-all",
                            teamSize === ts.value
                              ? "bg-violet-600/20 border-violet-500 text-violet-300"
                              : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          {ts.label}
                        </button>
                      ))}
                    </div>
                  </div>
               {/* Specialties */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                      能力模块
                      <span className="text-slate-500 font-normal text-xs ml-1">（可多选）</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SPECIALTIES.map((spec) => (
                        <button
                          key={spec.value}
                          type="button"
                          onClick={() => toggleSpecialty(spec.value)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all",
                            selectedSpecialties.includes(spec.value)
                              ? "bg-violet-600/20 border-violet-500 text-violet-300"
                              : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          <span>{spec.icon}</span>
                          <span>{spec.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Infrastructure */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">基础设施
                        <span className="text-slate-500 font-normal text-xs ml-1">（可多选）</span>
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {INFRA_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleInfra(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                            selectedInfra.includes(opt.id)
                              ? "bg-violet-600/20 border-violet-500 text-violet-300"
                              : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business tags */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">
                      支持服务
                      <span className="text-slate-500 font-normal text-xs ml-1">（可多选）</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUSINESS_TAGS.map((tag) => (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() => toggleBusinessTag(tag.value)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all",
                            selectedBusinessTags.includes(tag.value)
                              ? "bg-violet-600/20 border-violet-500 text-violet-300"
                              : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}
                        >
                          <span>{tag.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

   

                  {/* Past cases */}

                  {error && <ErrorMsg>{error}</ErrorMsg>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition-colors">
                      返回修改
                    </button>
                    <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                      {loading ? "提交中..." : "完成入驻"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
