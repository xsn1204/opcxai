import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-4">
      <Link href="/" className="text-2xl font-bold italic tracking-tighter text-white mb-10">
        OPC x AI
      </Link>
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-white text-center mb-2">选择你的角色</h1>
        <p className="text-slate-400 text-center text-sm mb-10">
          不同角色拥有对应功能和体验
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


          <Link href="/register/corp" className="group">
            <div className="feature-card bg-white hover:border-indigo-200 border border-slate-200 p-8 rounded-3xl h-full transition-all shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-200 transition-colors">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-slate-900 text-xl font-bold mb-2">我是企业</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                发布业务挑战，AI 自动出题考核，精准匹配真正懂 AI 的超级个体。
              </p>
              <span className="text-indigo-600 text-sm font-bold group-hover:text-indigo-700 transition-colors">
                企业入驻 →
              </span>
            </div>
          </Link>
                    <Link href="/register/talent" className="group">
            <div className="feature-card bg-slate-800/50 border border-slate-700 hover:border-indigo-500 p-8 rounded-3xl h-full transition-all">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">我是 OPC</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                创建能力档案，参与拟真考核，建立可信的 AI 超级个体身份。
              </p>
            
              <span className="text-indigo-400 text-sm font-bold group-hover:text-indigo-300 transition-colors">
                OPC 入驻 →
              </span>
            </div>
          </Link>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          已有账号？
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 ml-1">
            直接登录
          </Link>
        </p>
      </div>
    </div>
  );
}
