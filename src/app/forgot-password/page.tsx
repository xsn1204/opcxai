"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "请求失败，请重试");
        return;
      }
      setSent(true);
    } catch {
      setError("请求失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4">
      <Link href="/" className="text-2xl font-bold italic tracking-tighter text-white mb-10">
        OPC x AI
      </Link>

      <div className="w-full max-w-md bg-slate-800/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">邮件已发送</h1>
            <p className="text-slate-400 text-sm mb-6">
              如果该邮箱已注册，你将收到一封包含重置链接的邮件，链接1小时内有效。
            </p>
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm">
              返回登录
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">忘记密码</h1>
            <p className="text-slate-400 text-sm mb-8">输入注册邮箱，我们将发送重置链接</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="邮箱"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                theme="dark"
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full py-4 text-base mt-2">
                发送重置邮件
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                返回登录
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
