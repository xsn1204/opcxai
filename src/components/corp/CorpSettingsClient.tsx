"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

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

type InitialData = {
  company_name: string;
  company_desc: string;
  website_url: string;
  contact_name: string;
  contact_info: string;
  business_tracks: string[];
  is_verified: boolean;
  company_size: string;
};

export function CorpSettingsClient({
  initialData,
  email,
}: {
  initialData: InitialData;
  email: string;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);

  const [companyName, setCompanyName] = useState(initialData.company_name);
  const [companyDesc, setCompanyDesc] = useState(initialData.company_desc);
  const [websiteUrl, setWebsiteUrl] = useState(initialData.website_url);
  const [contactName, setContactName] = useState(initialData.contact_name);
  const [contactInfo, setContactInfo] = useState(initialData.contact_info);
  const [tracks, setTracks] = useState<string[]>(initialData.business_tracks);
  const [companySize, setCompanySize] = useState(initialData.company_size || "startup");

  function toggleTrack(id: string) {
    setTracks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!companyName.trim()) {
      setError("企业名称不能为空");
      return;
    }
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/profile/corp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName.trim(),
          company_desc: companyDesc.trim(),
          website_url: websiteUrl.trim(),
          contact_name: contactName.trim(),
          contact_info: contactInfo.trim(),
          business_tracks: tracks,
          company_size: companySize,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">企业设置</h1>
        <p className="text-slate-400 text-sm mt-1">管理企业信息与能力模块配置</p>
      </div>

      <div className="space-y-5">
        {/* Company info */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-1">
           
            {initialData.is_verified && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold">
                ✓ 已认证
              </span>
            )}
          </div>

          {/* Company name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-600">
              企业名称 <span className="text-red-500">*</span>
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="你的机构全称"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Company size */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-600">企业规模</label>
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

          {/* Company desc */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-600">企业介绍</label>
            <textarea
              value={companyDesc}
              onChange={(e) => setCompanyDesc(e.target.value)}
              rows={3}
              placeholder="具体介绍企业背景、能力模块或核心优势，让人才更了解你…"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400 resize-y"
            />
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-600">官网 / 主页链接</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://your-company.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Contact name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-600">负责人姓名</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="招聘负责人姓名"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Contact info */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-600">联系方式</label>
            <input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="手机号或邮箱，协作建立后对方可查看"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400">仅在双方建立协作关系后，OPC人才可见</p>
          </div>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-600">账户邮箱</label>
            <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-sm cursor-not-allowed select-none">
              {email}
            </div>
            <p className="text-[11px] text-slate-400">邮箱不可更改</p>
          </div>

          {/* Change password */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-semibold text-slate-600">登录密码</p>
              <p className="text-[11px] text-slate-400">定期修改密码有助于保护账户安全</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPwdModal(true)}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              修改密码
            </button>
          </div>
        </section>

        {/* Business tracks */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-700">合作能力模块</h2>
            <p className="text-xs text-slate-400 mt-1">选择你需要 OPC 人才支持的业务领域（可多选）</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TRACKS.map((track) => {
              const active = tracks.includes(track.id);
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all text-left",
                    active
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <span className="text-lg shrink-0">{track.icon}</span>
                  <span className="font-medium leading-tight">{track.label}</span>
                </button>
              );
            })}
          </div>
          {tracks.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">请至少选择一个能力模块</p>
          )}
        </section>

        {/* Error / success */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
            ✓ 保存成功
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      </div>

      {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
    </div>
  );
}
