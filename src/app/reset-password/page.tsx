"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("链接无效，请重新申请密码重置");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 8) {
      setError("密码至少8位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "重置失败，请重试");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("重置失败，请重试");
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
        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">密码已重置</h1>
            <p className="text-slate-400 text-sm">正在跳转到登录页…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">重置密码</h1>
            <p className="text-slate-400 text-sm mb-8">请输入你的新密码</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="新密码"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少8位"
                required
                theme="dark"
              />
              <Input
                label="确认新密码"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                required
                theme="dark"
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} disabled={!token} className="w-full py-4 text-base mt-2">
                确认重置
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
