import Link from "next/link";
import ContactForm from "@/components/ContactForm";

const CAPABILITY_MODULES = [
  { id: "ai_products", label: "AI产品原型与开发", icon: "🔧", desc: "快速搭建 MVP，AI 编程全链路交付" },
  { id: "ai_tools", label: "AI工作流与自动化", icon: "🤖", desc: "n8n / Dify / Coze 搭建企业级自动化" },
  { id: "content_marketing", label: "AIGC全媒介创作", icon: "📝", desc: "图文视频一站式 AI 内容生产" },
  { id: "short_video", label: "短视频与数字人运营", icon: "🎬", desc: "AI 数字人、矩阵账号批量运营" },
  { id: "brand_overseas", label: "全球化品牌与出海", icon: "🌍", desc: "AI 辅助多语言品牌营销与出海策略" },
  { id: "growth", label: "AI驱动增长与获客", icon: "📈", desc: "用 AI 跑通 SEO / 投放 / 私域全链路" },
  { id: "data_analysis", label: "智能决策与业务洞察", icon: "📊", desc: "AI 数据分析，让决策有据可依" },
  { id: "other", label: "复杂业务定制", icon: "✨", desc: "企业级 AI 落地方案定制与交付" },
];

// 样例 OPC 认证卡片数据
const SAMPLE_INDIVIDUAL = {
  name: "陈浩然",
  specialty: "AI 工作流架构师",
  score: 4.8,
  collab: 12,
  tags: ["🤖 AI工作流与自动化", "📊 智能决策与业务洞察", "🔧 AI产品原型与开发"],
  tools: ["Claude", "Dify", "n8n", "LangChain"],
  bio: "独立数据顾问，服务过 12 家 B 轮以上企业，曾将报告产出效率提升 5 倍。",
};

const SAMPLE_ENTERPRISE = {
  name: "QuantFlow 智能运营团队",
  teamSize: "6–20 人团队",
  score: 4.6,
  collab: 28,
  infra: ["🖥️ 自有算力资源", "🤖 自动化分发工具", "🔄 标准SOP协作平台"],
  bizTags: ["支持合同签订", "支持对公结算", "支持后期维护"],
  bio: "专注企业级 AI 流程自动化，交付过 40+ 落地案例，平均提效 3 倍。",
};

function StarRow({ score }: { score: number }) {
  const full = Math.round(score);
  return (
    <span className="text-amber-400/60 text-[10px]">
      {"★".repeat(full)}{"☆".repeat(5 - full)}
    </span>
  );
}

// 1. 抽离公共样式，确保容器一致
const CARD_CONTAINER_CLASS = "rounded-3xl p-6 w-80 min-h-[460px] flex flex-col shadow-2xl transition-all hover:scale-[1.02]";

function IndividualCard() {
  const s = SAMPLE_INDIVIDUAL;
  return (
    <div className={CARD_CONTAINER_CLASS}
      style={{
        background: "linear-gradient(160deg, #0f0720 0%, #1a0a3d 40%, #2d1060 75%, #4c1d95 100%)",
        border: "1px solid rgba(139,92,246,0.35)",
      }}
    >
      {/* 头部：固定高度防止因标签长短抖动 */}
      <div className="h-14 mb-4">
        <div className="flex items-center  mb-2">
          <span className="text-white font-black text-sm italic">OPC</span>
          <span className="text-violet-400 font-black text-sm italic"> x AI</span>
          <span className="ml-2 text-[9px] text-violet-300 border border-violet-500/30 rounded-full px-2 py-0.5 whitespace-nowrap">个人 OPC 认证</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-base shrink-0">
            {s.name[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm truncate">{s.name}</p>
            <p className="text-violet-300/80 text-[10px] truncate">{s.specialty}</p>
          </div>
        </div>
      </div>

      {/* 简介：固定 3 行高度，确保下方数据条对齐 */}
      <div className="h-12 mb-4">
        <p className="text-violet-200/60 text-[10px] leading-relaxed border-l-2 border-violet-500/30 pl-2.5 line-clamp-2">
          {s.bio}
        </p>
      </div>

      {/* 数据条：高度固定 */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-xl py-2 text-center bg-white/5 border border-violet-500/15">
          <p className="text-amber-400 text-lg font-bold leading-none">{s.score.toFixed(1)}</p>
          <p className="text-violet-300/60 text-[9px] mt-1 mb-1">综合评分</p>
          <StarRow score={s.score} />
        </div>
        <div className="flex-1 rounded-xl py-2 text-center bg-white/5 border border-violet-500/15 flex flex-col justify-center">
          <p className="text-violet-400 text-lg font-bold leading-none">{s.collab}</p>
          <p className="text-violet-300/60 text-[9px] mt-1">合作次数</p>
        </div>
      </div>

      {/* 中间自适应区：存放标签 */}
      <div className="flex-1 mb-4">
        <p className="text-[9px] text-violet-400/50 mb-2 uppercase tracking-wider">能力图谱</p>
        <div className="flex flex-wrap gap-1">
          {s.tags.slice(0, 3).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[9px] text-violet-300 border border-violet-500/20 bg-violet-500/10">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 底部工具：使用 mt-auto 强制触底 */}
      <div className="mt-auto rounded-xl px-3 py-2 bg-white/5 border border-violet-500/15">
        <p className="text-[9px] text-slate-500 mb-1.5">技术栈</p>
        <div className="flex flex-wrap gap-1">
          {s.tools.map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded text-[9px] text-slate-400 bg-white/5 border border-slate-600/40">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnterpriseCard() {
  const s = SAMPLE_ENTERPRISE;
  return (
    <div className={CARD_CONTAINER_CLASS}
      style={{
        background: "linear-gradient(160deg, #1c1208 0%, #2d1a04 40%, #3d2408 75%, #78350f 100%)",
        border: "1px solid rgba(245,158,11,0.3)",
      }}
    >
      {/* 头部：与个人卡片高度一致 */}
      <div className="h-14 mb-4">
        <div className="flex items-center mb-2">
          <span className="text-white font-black text-sm italic">OPC </span>
          <span className="text-amber-400 font-black text-sm italic">x AI</span>
          <span className="ml-2 text-[9px] text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 whitespace-nowrap">机构 OPC 认证</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white font-black text-base shrink-0">
            {s.name[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm truncate">{s.name}</p>
            <p className="text-amber-300/80 text-[10px] truncate">{s.teamSize}</p>
          </div>
        </div>
      </div>

      {/* 简介：高度一致 */}
      <div className="h-12 mb-4">
        <p className="text-amber-200/60 text-[10px] leading-relaxed border-l-2 border-amber-500/30 pl-2.5 line-clamp-2">
          {s.bio}
        </p>
      </div>

      {/* 数据条：高度一致 */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-xl py-2 text-center bg-white/5 border border-amber-500/15">
          <p className="text-amber-400 text-lg font-bold leading-none">{s.score.toFixed(1)}</p>
          <p className="text-amber-300/60 text-[9px] mt-1 mb-1">综合评分</p>
          <StarRow score={s.score} />
        </div>
        <div className="flex-1 rounded-xl py-2 text-center bg-white/5 border border-amber-500/15 flex flex-col justify-center">
          <p className="text-amber-400 text-lg font-bold leading-none">{s.collab}</p>
          <p className="text-amber-300/60 text-[9px] mt-1">交付案例</p>
        </div>
      </div>

      {/* 中间自适应区 */}
      <div className="flex-1 mb-4">
        <p className="text-[9px] text-amber-400/50 mb-2 uppercase tracking-wider">基础设施</p>
        <div className="flex flex-wrap gap-1">
          {s.infra.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[9px] text-amber-300 border border-amber-500/20 bg-amber-500/10">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 底部服务：mt-auto 确保和左边工具栏对齐 */}
      <div className="mt-auto rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/15">
        <p className="text-[9px] text-amber-500/70 mb-1.5">业务保障</p>
        <div className="flex flex-wrap gap-1">
          {s.bizTags.map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-slate-950 text-white min-h-screen">

      {/* ① 顶部公告条 */}
      <div className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 px-4 text-center">
        <p className="text-white text-sm font-medium flex items-center justify-center gap-2 flex-wrap">
          <span>🎉 首批限时免费入驻</span>
          <span className="text-indigo-200">·</span>
          <span className="text-indigo-100">极简 2 步完成注册，现已开放</span>
          <Link href="/register" className="ml-2 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-white text-xs font-semibold transition-colors border border-white/30">
            立即入驻 →
          </Link>
        </p>
      </div>

      {/* ── Nav ── */}
      <nav className="flex justify-between items-center px-6 py-5 max-w-7xl mx-auto border-b border-slate-800/60">
        <div className="flex items-center">
  <span className="text-white font-black text-xl tracking-tight italic">OPC</span>
<span className="text-indigo-400 font-black text-xl italic tracking-wide ml-1">x AI</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#how" className="hover:text-indigo-400 transition-colors">平台介绍</a>
          <a href="#capabilities" className="hover:text-indigo-400 transition-colors">能力图谱</a>
         
          <Link href="/corp/market" className="hover:text-indigo-400 transition-colors">浏览OPC市场</Link>
           <a href="#contact" className="hover:text-indigo-400 transition-colors">联系我们</a>
          <Link href="/login" className="text-white hover:text-indigo-400 transition-colors">登录</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative py-28 px-6 text-center overflow-hidden">
        {/* bg glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, #6366f1 0%, transparent 70%)" }} />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            首个 AI 实战胜任力认证与匹配平台
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            不看简历，看实战<br />
            <span className="text-indigo-400">AI 出题 · 业务模拟 · 一键合作</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-14 leading-relaxed">
            立足真实业务场景，筛选全球AI超级个体<br />
            开启 OPC 与企业的高效协作范式
          </p>

          {/* Role Cards */}
          <div className="flex flex-col md:flex-row justify-center gap-5 max-w-2xl mx-auto">
            <div className="bg-white p-7 rounded-3xl flex-1 text-left shadow-2xl shadow-indigo-900/20">
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">🏢</div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">✦ 首批体验 · 限时免费</span>
              </div>
              <h3 className="text-slate-900 text-lg font-bold mb-1.5">我是企业</h3>
              <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                描述业务目标，AI 自动出题筛选，一键锁定高分超级个体。
              </p>
              <Link href="/register/corp"
                className="block w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors text-center text-sm">
                免费入驻，发布需求 →
              </Link>
            </div>

            <div className="bg-slate-800 p-7 rounded-3xl flex-1 text-left border border-slate-700 shadow-2xl">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-5 text-xl">⚡</div>
              <h3 className="text-white text-lg font-bold mb-1.5">我是 OPC（超级个体）</h3>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                完成 AI 实战考核，获得胜任力认证卡片，让企业主动找上门。
              </p>
              <Link href="/register/talent"
                className="block w-full py-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors text-center text-sm">
                开启合作 →
              </Link>
            </div>
          </div>

          <p className="mt-7 text-slate-600 text-sm">
            已有账号？
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 ml-1">直接登录</Link>
          </p>
        </div>
      </section>

      {/* ── OPC 是什么 ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="rounded-3xl px-10 py-10 flex flex-col md:flex-row items-center gap-8"
            style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="flex-1">
              <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold mb-3">什么是 OPC（One Person Company）？</p>
              <h2 className="text-white text-2xl font-bold leading-snug mb-4">
                OPC = AI + 超级个体<br />
                <span className="text-indigo-300">用实战胜任力，替代一切简历</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                传统外包靠报价和案例截图决策，信息不对称、质量无法验证。
                OPC x AI 让每位 AI 操盘手在真实业务场景中接受考核，
                由 AI 按能力维度评分，生成可信的胜任力报告与认证卡片。
              </p>
            </div>
      <div className="flex gap-6 shrink-0 text-center items-start">
  {[
    { label: "传统外包", items: ["简历 / 报价", "自我介绍", "案例截图", "无标准评估"], bad: true },
    { label: "OPC x AI", items: ["AI 实战考核", "能力维度评分", "胜任力认证", "精准场景匹配"], bad: false },
  ].map((col) => (
    <div key={col.label} className="w-36 flex flex-col">
      {/* 标题部分 */}
      <p className={`text-xs font-bold mb-4 h-4 flex items-center justify-center ${col.bad ? "text-slate-500" : "text-indigo-300"}`}>
        {col.label}
      </p>
      
      {/* 列表部分 */}
      <div className="flex flex-col gap-2">
        {col.items.map((item) => (
          <div
            key={item}
            className={`text-[11px] h-9 px-2 rounded-xl flex items-center justify-center transition-all ${
              col.bad
                ? "bg-slate-800/50 text-slate-600 line-through opacity-60"
                : "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  ))}
</div>
          </div>
        </div>
      </section>

      {/* ── 双侧流程 ── */}
      <section id="how" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-800">
        <p className="text-center text-slate-500 text-xs uppercase tracking-widest mb-3">平台运作方式</p>
        <h2 className="text-3xl font-bold text-center mb-12">企业与 OPC 如何在平台协作</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 企业侧 */}
          <div className="rounded-3xl p-7 border border-indigo-500/20" style={{ background: "linear-gradient(145deg, #1e1b4b20, #0f0a2a)" }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">🏢</span>
              <h3 className="text-white font-bold text-lg">企业侧</h3>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { step: "01", title: "描述业务目标", desc: "告诉我们你的需求方向、预算和时间线，AI 理解意图。", color: "text-indigo-400" },
                { step: "02", title: "AI 生成考核场景", desc: "系统自动出题，配置能力权重维度，无需人工设计题库。", color: "text-indigo-400" },
                { step: "03", title: "浏览评分报告，锁定合作", desc: "查看 OPC 完整实战报告与认证卡片，一键发起合作邀请。", color: "text-indigo-400" },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <span className={`text-2xl font-black font-mono ${item.color} opacity-50 w-8 shrink-0`}>{item.step}</span>
                  <div>
                    <p className="text-white font-semibold text-sm mb-0.5">{item.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OPC 侧 */}
          <div className="rounded-3xl p-7 border border-violet-500/20" style={{ background: "linear-gradient(145deg, #2d1b6920, #0f0a2a)" }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">⚡</span>
              <h3 className="text-white font-bold text-lg">OPC 侧</h3>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { step: "01", title: "完善能力画像", desc: "选择你的专长方向、工具栈，展示过往案例。", color: "text-violet-400" },
                { step: "02", title: "参加 AI 实战考核", desc: "在 OPC.Agent 协同下完成真实业务场景任务，记录完整操作轨迹。", color: "text-violet-400" },
                { step: "03", title: "获得认证，接项目", desc: "拿到 OPC 认证卡片，生成专属主页，企业主动找上门。", color: "text-violet-400" },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <span className={`text-2xl font-black font-mono ${item.color} opacity-50 w-8 shrink-0`}>{item.step}</span>
                  <div>
                    <p className="text-white font-semibold text-sm mb-0.5">{item.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 能力图谱 ── */}
      <section id="capabilities" className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-800">
        <p className="text-center text-slate-500 text-xs uppercase tracking-widest mb-3">覆盖场景</p>
        <h2 className="text-3xl font-bold text-center mb-3">八大 AI + 协作方向</h2>
        <p className="text-center text-slate-500 text-sm mb-10">平台覆盖企业 AI 转型的全部核心场景，按能力维度精准匹配</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CAPABILITY_MODULES.map((m) => (
            <div key={m.id}
              className="rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/30 transition-colors group"
              style={{ background: "linear-gradient(145deg, #1e293b, #0f172a)" }}>
              <span className="text-2xl mb-3 block">{m.icon}</span>
              <p className="text-white font-semibold text-sm mb-1.5 group-hover:text-indigo-300 transition-colors">{m.label}</p>
              <p className="text-slate-600 text-xs leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OPC 认证卡片 Showcase ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <p className="text-center text-slate-500 text-xs uppercase tracking-widest mb-3">认识真实的 OPC</p>
          <h2 className="text-3xl font-bold text-center mb-3">每位 OPC 都有专属认证主页</h2>
          <p className="text-center text-slate-500 text-sm mb-10">实战评分、能力标签、过往案例，一页看清真实实力</p>

          <div className="flex justify-center gap-8 flex-wrap items-stretch">
            <div className="flex flex-col items-center gap-3">
              <IndividualCard />
              <span className="text-slate-600 text-xs">个人 OPC · 紫色认证</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <EnterpriseCard />
              <span className="text-slate-600 text-xs">机构 OPC · 橙金认证</span>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/corp/market"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors border border-slate-700">
              浏览全部 OPC 人才市场 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { num: "8", label: "核心能力评估维度" },
              { num: "3 天", label: "企业平均完成首次匹配" },
              { num: "个人 + 机构", label: "双类型 OPC 认证体系" },
              { num: "AI 全程", label: "出题 · 评分 · 报告生成" },
            ].map((s) => (
              <div key={s.label}
                className="rounded-2xl p-6 border border-slate-800"
                style={{ background: "linear-gradient(145deg, #1e293b, #0f172a)" }}>
                <div className="text-2xl font-black text-white mb-1">{s.num}</div>
                <div className="text-slate-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 底部 CTA ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
            准备好了吗？<br />
            <span className="text-indigo-400">用实战定义你的价值</span>
          </h2>
          <p className="text-slate-500 text-sm mb-10">来 OPC x AI，定义未来协作方式</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register/corp"
              className="px-8 py-3.5 rounded-2xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors text-sm">
              🏢 企业发布需求
            </Link>
            <Link href="/register/talent"
              className="px-8 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors text-sm shadow-lg shadow-indigo-900/40">
              ⚡ 成为入驻 OPC
            </Link>
          </div>
          <p className="mt-5 text-slate-600 text-xs">⏳ 名额有限，先到先得</p>
        </div>
      </section>

      {/* ── 联系我们 ── */}
      <section id="contact" className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Left: copy */}
            <div>
              <p className="text-indigo-400 text-xs uppercase tracking-widest font-semibold mb-3">联系我们</p>
              <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                有想法？<br />
                <span className="text-indigo-400">和我们聊聊</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                无论您是寻找 AI 人才的企业、希望获得认证的超级个体，
                还是对平台感兴趣的合作伙伴，都欢迎留下您的信息，
                我们将在 1–2 个工作日内与您联系。
              </p>

              <div className="flex flex-col gap-4">
                {[
                  { icon: "📧", label: "联系方式", value: "手机号 · 邮箱" },
                  { icon: "⏰", label: "响应时间", value: "1–2 个工作日" },
                           { icon: "🌏", label: "服务范围", value: "企业方 · 超级个体 · OPC社区 · 媒体" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xl w-8 shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-slate-500 text-xs">{item.label}</p>
                      <p className="text-slate-300 text-sm font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div className="rounded-3xl p-7 border border-slate-700/50"
              style={{ background: "linear-gradient(145deg, #1e293b, #0f172a)" }}>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-slate-600 text-xs">
          <div className="flex items-center">
         <span className="text-slate-400 font-black text-base italic tracking-wide">
  OPC <span className="text-indigo-400">x AI</span>
</span>
          </div>
          <div>© 2026 OPC x AI · 基于 AI 实战胜任力认证的 OPC 能力匹配平台</div>
        </div>
      </footer>
    </div>
  );
}
