"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { CAPABILITY_MODULES, TOOL_STACK, ENTERPRISE_TEAM_SIZES, ENTERPRISE_INFRA, ENTERPRISE_BUSINESS_TAGS, ENTERPRISE_SPECIALTIES, StudentMetadata } from "@/types";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type IndividualData = {
  username: string;
  specialty: string;
  bio: string;
  contact_info: string;
  website_url: string;
  capability_modules: string[];
  tool_stack: string[];
  is_student: boolean;
  edu_email: string;
  student_metadata: StudentMetadata | null;
};

type EnterpriseData = {
  enterprise_name: string;
  credit_code: string;
  team_size: string;
  opc_intro: string;
  opc_bio: string;
  infra: string[];
  business_tags: string[];
  specialties: string[];
  past_cases: string;
  contact_info: string;
  website_url: string;
};

type Props =
  | { userType: "individual"; initialData: IndividualData; email: string }
  | { userType: "enterprise"; initialData: EnterpriseData; email: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

const TOOL_CATEGORIES = Array.from(new Set(TOOL_STACK.map((t) => t.category)));

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-slate-300">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
    />
  );
}

type FormRef = { handleSave(): void };

// ─── Individual Form ──────────────────────────────────────────────────────────

const IndividualForm = forwardRef<FormRef, {
  data: IndividualData;
  email: string;
  onSuccess: () => void;
  onSavingChange: (s: boolean) => void;
  onError: (msg: string) => void;
}>(function IndividualForm({ data, email, onSuccess, onSavingChange, onError }, ref) {
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState(data.username);
  const [specialty, setSpecialty] = useState(data.specialty);
  const [bio, setBio] = useState(data.bio);
  const [contactInfo, setContactInfo] = useState(data.contact_info);
  const [websiteUrl, setWebsiteUrl] = useState(data.website_url);
  const [capMods, setCapMods] = useState(data.capability_modules);
  const [toolStack, setToolStack] = useState(data.tool_stack);
  const [isStudent, setIsStudent] = useState(data.is_student);
  const [schoolName, setSchoolName] = useState(data.student_metadata?.school_name ?? "");
  const [eduEmail, setEduEmail] = useState(data.edu_email);
  const [studentMajor, setStudentMajor] = useState(data.student_metadata?.major ?? "");
  const [graduationYear, setGraduationYear] = useState(data.student_metadata?.graduation_year ?? new Date().getFullYear() + 4);

  function toggle<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  async function handleSave() {
    if (!username.trim()) { onError("姓名不能为空"); return; }
    onError("");
    setSaving(true);
    onSavingChange(true);
    try {
      const res = await fetch("/api/profile/talent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "individual",
          username: username.trim(),
          specialty: specialty.trim(),
          bio: bio.trim(),
          contact_info: contactInfo.trim(),
          website_url: websiteUrl.trim(),
          capability_modules: capMods,
          tool_stack: toolStack,
          is_student: isStudent,
          edu_email: isStudent ? eduEmail.trim() : "",
          student_metadata: isStudent
            ? JSON.stringify({ school_name: schoolName, major: studentMajor, graduation_year: graduationYear })
            : "{}",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "保存失败");
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  useImperativeHandle(ref, () => ({ handleSave }));

  return (
    <div className="space-y-5">
      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">基本信息</h2>

        <Field label="姓名 / 昵称 *">
          <TextInput value={username} onChange={setUsername} placeholder="你的名字或昵称" />
        </Field>



        <Field label={`业务简介 ${specialty.length}/20`}>
          <TextInput value={specialty} onChange={setSpecialty} placeholder="如：TikTok 出海运营 + AI 内容矩阵" maxLength={20} />
        </Field>

        <Field label="OPC介绍">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="介绍个人背景、核心优势或过往成果..."
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-y"
          />
        </Field>
                <Field label="个人网页 / 作品链接">
          <TextInput value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://your-portfolio.com" />
        </Field>

        <Field label="联系方式" hint="仅在双方建立协作关系后，企业可见">
          <TextInput value={contactInfo} onChange={setContactInfo} placeholder="手机号或邮箱，协作建立后对方可查看" />
        </Field>


                {isStudent ? (
          <>
            <Field label="教育邮箱">
              <div className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800 text-slate-500 rounded-xl text-sm cursor-not-allowed select-none">
                {eduEmail || <span className="text-slate-600">未填写</span>}
              </div>
              <p className="text-[11px] text-slate-600">教育邮箱不可更改</p>
            </Field>
            <Field label="学校名称 *">
              <TextInput value={schoolName} onChange={setSchoolName} placeholder="如：北京大学" />
            </Field>
            <Field label="专业方向">
              <TextInput value={studentMajor} onChange={setStudentMajor} placeholder="如：计算机科学" />
            </Field>
            <Field label="预计毕业年份">
             <select
                            value={graduationYear}
                            onChange={(e) => setGraduationYear(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 transition-colors"
                          >
           {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                              <option key={y} value={y}>{y} 年</option>
                            ))}
              </select>
            </Field>
          </>
        ) : (
          <Field label="账户邮箱">
            <div className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800 text-slate-500 rounded-xl text-sm cursor-not-allowed select-none">
              {email}
            </div>
            <p className="text-[11px] text-slate-600">邮箱不可更改</p>
          </Field>
        )}
      </section>

      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">能力模块</h2>
          <p className="text-[11px] text-slate-600 mt-1">选择擅长的 AI 应用领域</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CAPABILITY_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setCapMods(toggle(capMods, m.id))}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all text-left",
                capMods.includes(m.id)
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              <span className="text-base shrink-0">{m.icon}</span>
              <span className="font-medium leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">工具栈</h2>
          <p className="text-[11px] text-slate-600 mt-1">选择你熟练使用的 AI 工具</p>
        </div>
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {TOOL_STACK.filter((t) => t.category === cat).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setToolStack(toggle(toolStack, t.id))}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    toolStack.includes(t.id)
                      ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                      : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      

    </div>
  );
});

// ─── Enterprise Form ──────────────────────────────────────────────────────────

const EnterpriseForm = forwardRef<FormRef, {
  data: EnterpriseData;
  email: string;
  onSuccess: () => void;
  onSavingChange: (s: boolean) => void;
  onError: (msg: string) => void;
}>(function EnterpriseForm({ data, email, onSuccess, onSavingChange, onError }, ref) {
  const [saving, setSaving] = useState(false);
  const [enterpriseName, setEnterpriseName] = useState(data.enterprise_name);
  const [creditCode, setCreditCode] = useState(data.credit_code);
  const [teamSize, setTeamSize] = useState(data.team_size || "2-5");
  const [opcIntro, setOpcIntro] = useState(data.opc_intro ?? "");
  const [opcBio, setOpcBio] = useState(data.opc_bio ?? "");
  const [infra, setInfra] = useState(data.infra);
  const [businessTags, setBusinessTags] = useState(data.business_tags);
  const [specialties, setSpecialties] = useState(data.specialties);
  const [pastCases, setPastCases] = useState(data.past_cases);
  const [contactInfo, setContactInfo] = useState(data.contact_info);
  const [websiteUrl, setWebsiteUrl] = useState(data.website_url);

  function toggle(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  async function handleSave() {
    if (!enterpriseName.trim()) { onError("企业名称不能为空"); return; }
    onError("");
    setSaving(true);
    onSavingChange(true);
    try {
      const res = await fetch("/api/profile/talent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: "enterprise",
          enterprise_name: enterpriseName.trim(),
          team_size: teamSize,
          opc_intro: opcIntro.trim(),
          opc_bio: opcBio.trim(),
          infra,
          business_tags: businessTags,
          specialties,
          past_cases: pastCases.trim(),
          contact_info: contactInfo.trim(),
          website_url: websiteUrl.trim(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "保存失败");
      onSuccess();
    } catch (e) {
      onError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  useImperativeHandle(ref, () => ({ handleSave }));

  return (
    <div className="space-y-5">
      {/* Enterprise badge */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg">
          🏅 机构 OPC
        </span>
      </div>

      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">企业信息</h2>

        <Field label="机构全称 *">
          <TextInput value={enterpriseName} onChange={setEnterpriseName} placeholder="营业执照上的机构全称" />
        </Field>

        <Field label={`业务简介 ${opcIntro.length}/20`}>
          <TextInput value={opcIntro} onChange={setOpcIntro} placeholder="如：AI 出海品牌全案交付 + 内容矩阵运营" maxLength={20} />
        </Field>

        <Field label="OPC介绍">
          <textarea
            value={opcBio}
            onChange={(e) => setOpcBio(e.target.value)}
            rows={3}
            placeholder="介绍企业背景、核心优势或交付理念..."
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-y"
          />
        </Field>

        <Field label="官网 / 作品链接">
          <TextInput value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://your-company.com" />
        </Field>

        <Field label="联系方式" hint="仅在双方建立协作关系后，企业可见">
          <TextInput value={contactInfo} onChange={setContactInfo} placeholder="手机号或邮箱，协作建立后对方可查看" />
        </Field>
                <Field label="账户邮箱">
          <div className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800 text-slate-500 rounded-xl text-sm cursor-not-allowed select-none">
            {email}
          </div>
          <p className="text-[11px] text-slate-600">邮箱不可更改</p>
        </Field>

        <Field label="统一社会信用代码">
          <div className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800 text-slate-500 rounded-xl text-sm cursor-not-allowed select-none">
            {data.credit_code || "未填写"}
          </div>
          <p className="text-[11px] text-slate-600">注册后不可更改</p>
        </Field>
      </section>
          <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">团队规模</h2>
        <div className="flex flex-col gap-2">
          {ENTERPRISE_TEAM_SIZES.map((ts) => (
            <button
              key={ts.value}
              type="button"
              onClick={() => setTeamSize(ts.value)}
              className={cn(
                "px-4 py-2.5 rounded-xl border text-sm text-left transition-all",
                teamSize === ts.value
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {ts.label}
            </button>
          ))}
        </div>
      </section>
       <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">能力模块</h2>
          <p className="text-[11px] text-slate-600 mt-1">选择擅长的 AI 应用领域</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ENTERPRISE_SPECIALTIES.map((spec) => (
            <button
              key={spec.value}
              type="button"
              onClick={() => setSpecialties(toggle(specialties, spec.value))}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all",
                specialties.includes(spec.value)
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              <span>{spec.icon}</span>
              <span>{spec.label}</span>
            </button>
          ))}
        </div>
      </section>

  


      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">基础设施</h2>
          <p className="text-[11px] text-slate-600 mt-1">选择企业拥有的关键资源</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ENTERPRISE_INFRA.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setInfra(toggle(infra, opt.id))}
              className={cn(
                "px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                infra.includes(opt.id)
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">支持服务</h2>
          <p className="text-[11px] text-slate-600 mt-1">选择可提供的企业服务</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ENTERPRISE_BUSINESS_TAGS.map((tag) => (
            <button
              key={tag.value}
              type="button"
              onClick={() => setBusinessTags(toggle(businessTags, tag.value))}
              className={cn(
                "px-3 py-2.5 rounded-xl border text-sm text-left transition-all",
                businessTags.includes(tag.value)
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-slate-900/40 border-slate-700 text-slate-400 hover:border-slate-600"
              )}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </section>

     

    </div>
  );
});

// ─── Portfolio Cases Section ──────────────────────────────────────────────────

type PortfolioFile = { url: string; name: string };
type PortfolioCaseItem = {
  id: string;
  title: string;
  description: string;
  images: string; // JSON
  files: string;  // JSON
  created_at: string;
};

function PortfolioCasesSection() {
  const [cases, setCases] = useState<PortfolioCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<PortfolioFile[]>([]);
  const [files, setFiles] = useState<PortfolioFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/portfolio-cases")
      .then((r) => r.json())
      .then((data) => { setCases(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function uploadFile(file: File): Promise<PortfolioFile> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!res.ok) throw new Error("上传失败");
    return res.json();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setImages((prev) => [...prev, result]);
    } catch {
      setError("图片上传失败，请重试");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFiles((prev) => [...prev, result]);
    } catch {
      setError("文件上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError("案例标题不能为空"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/portfolio-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), images, files }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setCases((prev) => [data, ...prev]);
      setTitle(""); setDescription(""); setImages([]); setFiles([]);
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/portfolio-cases/${id}`, { method: "DELETE" });
    setCases((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <section className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">过往合作案例</h2>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-amber-400">👁</span>
            企业在查看您的主页时会看到这些案例，展示真实项目有助于建立信任
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setError(""); }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            + 添加案例
          </button>
        )}
      </div>

      {/* 添加表单 */}
      {adding && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="案例标题 *（如：为某品牌搭建TikTok内容矩阵）"
            className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="案例描述：项目背景、你的角色、交付成果、量化结果..."
            className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 text-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-y"
          />

          {/* 图片上传 */}
          <div>
            <p className="text-[11px] text-slate-500 mb-2">配图（可选，支持 JPG/PNG/GIF）</p>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-700">
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-lg transition-opacity"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-lg flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 transition-colors text-xs gap-1"
              >
                <span className="text-xl">{uploading ? "⏳" : "🖼"}</span>
                <span>上传图片</span>
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          {/* 文件上传 */}
          <div>
            <p className="text-[11px] text-slate-500 mb-2">附件（可选，支持 PDF/DOCX/XLSX 等）</p>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">
                  <span>📎</span>
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400">×</button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 border border-dashed border-slate-700 hover:border-slate-500 rounded-lg text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                {uploading ? "上传中…" : "+ 上传文件"}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
            >
              {saving ? "保存中…" : "保存案例"}
            </button>
            <button
              onClick={() => { setAdding(false); setTitle(""); setDescription(""); setImages([]); setFiles([]); setError(""); }}
              className="px-4 py-2 text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 已有案例列表 */}
      {loading ? (
        <p className="text-xs text-slate-600">加载中…</p>
      ) : cases.length === 0 && !adding ? (
        <div className="text-center py-6 text-slate-600 text-sm">
          <div className="text-3xl mb-2">💼</div>
          <p>还没有添加案例，添加真实项目经历让企业更信任你</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const imgs: PortfolioFile[] = JSON.parse(c.images || "[]");
            const fls: PortfolioFile[] = JSON.parse(c.files || "[]");
            return (
              <div key={c.id} className="bg-slate-900/40 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-200 text-sm">{c.title}</p>
                    {c.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{c.description}</p>}
                    {imgs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {imgs.map((img, i) => (
                          <a key={i} href={img.url} target="_blank" rel="noopener noreferrer">
                            <img src={img.url} alt={img.name} className="w-16 h-16 object-cover rounded-lg border border-slate-700 hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                    {fls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {fls.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-indigo-400 transition-colors">
                            <span>📎</span><span className="max-w-[100px] truncate">{f.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-slate-600 hover:text-red-400 text-xs shrink-0 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProfileEditClient({ userType, initialData, email }: Props) {
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const formRef = useRef<FormRef>(null);

  const onSuccess = () => {
    setFormError("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">账户设置</h1>
        <p className="text-slate-400 text-sm mt-1">管理信息与能力配置</p>
      </div>

      {userType === "enterprise" ? (
        <EnterpriseForm
          ref={formRef}
          data={initialData as EnterpriseData}
          email={email}
          onSuccess={onSuccess}
          onSavingChange={setFormSaving}
          onError={setFormError}
        />
      ) : (
        <IndividualForm
          ref={formRef}
          data={initialData as IndividualData}
          email={email}
          onSuccess={onSuccess}
          onSavingChange={setFormSaving}
          onError={setFormError}
        />
      )}

      <div className="mt-5">
        <PortfolioCasesSection />
      </div>

      {/* Account security */}
      <div className="mt-5 bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-300">登录密码</p>
          <p className="text-[11px] text-slate-600 mt-0.5">定期修改密码有助于保护账户安全</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPwdModal(true)}
          className="px-4 py-2 text-sm font-semibold text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/10 transition-colors"
        >
          修改密码
        </button>
      </div>

      <div className="flex items-center justify-end gap-4 mt-5">
        {success && (
          <span className="text-emerald-400 text-sm">✓ 保存成功</span>
        )}
        {formError && !success && (
          <span className="text-red-400 text-sm">{formError}</span>
        )}
        <button
          onClick={() => formRef.current?.handleSave()}
          disabled={formSaving}
          className={`px-8 py-3 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors ${
            userType === "enterprise"
              ? "bg-amber-500 hover:bg-amber-600"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {formSaving ? "保存中…" : "保存设置"}
        </button>
      </div>

      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
    </div>
  );
}
