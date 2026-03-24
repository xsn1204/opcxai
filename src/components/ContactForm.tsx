"use client";

import { useState } from "react";

const IDENTITY_OPTIONS = [
  { value: "enterprise", label: "🏢 企业方（寻找AI人才）" },
  { value: "individual", label: "⚡ 超级个体（寻求合作）" },
  { value: "investor", label: "💼 OPC社区 / 孵化器" },
  { value: "media", label: "📣 媒体 / 其他" },
];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    identityType: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "提交失败，请稍后重试");
        setStatus("error");
        return;
      }

      setStatus("success");
      setForm({ name: "", contact: "", identityType: "", message: "" });
    } catch {
      setErrorMsg("网络错误，请检查连接后重试");
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-xl bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-slate-800 transition-colors";

  if (status === "success") {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-white font-bold text-xl mb-2">已成功提交！</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          感谢您的留言，我们的团队将在 1–2 个工作日内与您联系。
          <br />
          如您填写的是邮箱，稍后也会收到一封确认邮件。
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
        >
          再提交一条留言
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 font-medium">
            姓名 <span className="text-indigo-400">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="您的称呼"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1.5 font-medium">
            联系方式 <span className="text-indigo-400">*</span>
          </label>
          <input
            type="text"
            name="contact"
            value={form.contact}
            onChange={handleChange}
            placeholder="手机号或邮箱"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-slate-400 text-xs mb-1.5 font-medium">
          您的身份 <span className="text-indigo-400">*</span>
        </label>
        <select
          name="identityType"
          value={form.identityType}
          onChange={handleChange}
          required
          className={`${inputClass} appearance-none cursor-pointer`}
          style={{ colorScheme: "dark" }}
        >
          <option value="" disabled>
            请选择身份类型
          </option>
          {IDENTITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-slate-400 text-xs mb-1.5 font-medium">
          需求说明 <span className="text-indigo-400">*</span>
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="简要描述您的需求或想法，我们会尽快安排专人对接"
          required
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      {status === "error" && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-900/30"
      >
        {status === "loading" ? "提交中..." : "提交留言 →"}
      </button>
    </form>
  );
}
