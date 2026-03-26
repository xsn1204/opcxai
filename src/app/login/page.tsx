"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败，请重试");
        return;
      }

      if (data.role === "talent") {
        router.push("/talent/dashboard");
      } else if (data.role === "corp") {
        router.push("/corp/market");
      } else {
        router.push("/");
      }
    } catch {
      setError("登录失败，请重试");
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
        <h1 className="text-2xl font-bold text-white mb-1">欢迎回来</h1>
        <p className="text-slate-400 text-sm mb-8">登录你的 OPC x AI 账户</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required theme="dark" />
          <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" required theme="dark" />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <Button type="submit" loading={loading} className="w-full py-4 text-base mt-2">登录</Button>
        </form>

        <div className="mt-6 text-center space-y-3">
         
          <p className="text-slate-500 text-sm">
            没有账户？
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 ml-1">立即注册</Link>
          </p>
           <p className="text-slate-500 text-sm">
            <Link href="/forgot-password" className="text-slate-400 hover:text-slate-300">忘记密码？</Link>
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/register/talent" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">OPC入驻 →</Link>
        <span className="text-slate-700">|</span>
        <Link href="/register/corp" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">企业入驻 →</Link>
      </div>
    </div>
  );
}
