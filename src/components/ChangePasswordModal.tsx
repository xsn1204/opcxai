"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
}

type Step = "send" | "verify";

const RESEND_COOLDOWN = 60; // seconds

export function ChangePasswordModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>("send");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-reset-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "发送失败");
      setMaskedEmail(data.maskedEmail);
      setStep("verify");
      startCountdown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-reset-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "发送失败");
      startCountdown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    setError("");
    if (!code || code.length !== 6) {
      setError("请输入6位验证码");
      return;
    }
    if (newPassword.length < 8) {
      setError("新密码不能少于8位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "修改失败");
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "修改失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">修改密码</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-emerald-700 font-semibold text-lg mb-2">密码修改成功</p>
            <p className="text-slate-400 text-sm mb-6">请使用新密码重新登录</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              完成
            </button>
          </div>
        ) : step === "send" ? (
          <div className="space-y-5">
            <p className="text-slate-500 text-sm">
              系统将向您的绑定邮箱发送一个 6 位验证码，用于验证身份后设置新密码。
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {loading ? "发送中…" : "发送验证码"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">
              验证码已发送至 <span className="font-semibold text-slate-700">{maskedEmail}</span>，5 分钟内有效。
            </p>

            {/* Code input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-600">验证码</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="请输入6位验证码"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400 tracking-widest"
              />
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-600">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少8位"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-600">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
            >
              {loading ? "修改中…" : "确认修改"}
            </button>

            {/* Resend */}
            <p className="text-center text-xs text-slate-400">
              没有收到？{" "}
              {countdown > 0 ? (
                <span className="text-slate-400">{countdown}s 后可重新发送</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                >
                  重新发送
                </button>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
