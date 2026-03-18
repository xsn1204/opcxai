# OPC x AI 开发启动指南

## 项目结构

```
opc-ai/
├── src/
│   ├── app/                  # Next.js App Router 页面
│   │   ├── (公共)
│   │   │   ├── page.tsx      # 首页
│   │   │   ├── login/        # 登录
│   │   │   └── register/     # 注册（人才/企业）
│   │   ├── talent/           # 人才端（需登录）
│   │   │   ├── dashboard/    # 首页
│   │   │   ├── challenges/   # 任务大厅
│   │   │   ├── exam/[id]/    # 拟真考场（接入 Claude API）
│   │   │   ├── submitted/    # 提交成功
│   │   │   ├── invites/      # 协作邀请
│   │   │   └── projects/     # 我的项目
│   │   ├── corp/             # 企业端（需登录）
│   │   │   ├── market/       # 能力市场
│   │   │   ├── new/          # 发布需求（AI自动出题）
│   │   │   ├── requirements/ # 需求管理
│   │   │   ├── submissions/  # 候选人评估报告
│   │   │   ├── invite/       # 发起邀请
│   │   │   └── projects/     # 项目协作
│   │   └── api/              # API Routes
│   │       ├── auth/         # 认证
│   │       ├── requirements/ # 需求 CRUD + AI出题
│   │       ├── submissions/  # 方案提交
│   │       ├── collaborations/ # 协作管理
│   │       ├── notifications/ # 通知
│   │       └── ai/           # AI服务（Copilot/分析/评分）
│   ├── components/           # 可复用组件
│   │   ├── ui/               # 基础 UI（Button, Input, Badge...）
│   │   ├── layout/           # 布局（TalentNav, CorpSidebar）
│   │   ├── talent/           # 人才端组件（ExamClient, ProjectChat）
│   │   └── corp/             # 企业端组件（InviteClient）
│   ├── lib/                  # 工具库
│   │   ├── supabase.ts       # 浏览器端 Supabase 客户端
│   │   ├── supabase-server.ts # 服务端 Supabase 客户端
│   │   └── utils.ts          # 工具函数
│   ├── store/                # Zustand 状态管理
│   └── types/                # TypeScript 类型定义
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # 数据库 Schema
```

## 快速启动

### 1. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入真实值：

```bash
cp .env.example .env.local
```

需要填写：
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `ANTHROPIC_API_KEY` — Anthropic Claude API key

### 2. 初始化数据库

在 Supabase Dashboard > SQL Editor 中执行：
```
supabase/migrations/001_initial_schema.sql
```

### 3. 配置 Supabase Auth

在 Supabase Dashboard > Authentication > Settings：
- 启用邮箱/密码登录
- 设置站点 URL 为 `http://localhost:3000`

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 核心用户流程

### 企业端流程
1. 注册企业账号 (`/register/corp`)
2. 登录 → 自动跳转至能力市场 (`/corp/market`)
3. 发布需求 (`/corp/new`)：
   - 填写业务意图 → AI识别标签
   - 配置任务信息和能力权重（总计=100%）
   - AI自动生成3道考题
   - 确认发布
4. 等待候选方案 → 查看AI评分报告 (`/corp/requirements/[id]/submissions`)
5. 发起协作邀请 (`/corp/invite/[submissionId]`)
6. 项目协作看板 (`/corp/projects/[id]/chat`)

### 人才端流程
1. 注册人才账号 (`/register/talent`)
2. 登录 → 跳转至首页 (`/talent/dashboard`)
3. 浏览任务大厅 → 进入任务详情
4. 进入拟真考场 (`/talent/exam/[id]`)：
   - 与 OPC.Agent（Claude）交互完成考核
   - 实时胜任力追踪
5. 提交方案 → 等待AI评分
6. 查看协作邀请 (`/talent/invites`)
7. 接受邀请 → 项目聊天留言板 (`/talent/projects/[id]/chat`)

## 技术架构

- **前端**：Next.js 15 App Router + TypeScript + Tailwind CSS
- **认证**：Supabase Auth（JWT + RLS）
- **数据库**：Supabase PostgreSQL
- **AI**：Anthropic Claude API
  - OPC.Agent 终端（claude-sonnet-4-6）
  - AI自动出题（claude-sonnet-4-6）
  - AI智能评分（claude-sonnet-4-6）
  - 意图分析（claude-haiku-4-5）
- **状态管理**：Zustand + React Query
- **部署**：Vercel（推荐）

## 品牌规范

- 统一品牌名：**OPC x AI**
- 人才端主题：深色（#0f172a 背景，#6366f1 主色）
- 企业端主题：浅色（#f8fafc 背景，白色卡片）
- 字体：Inter（正文）+ Fira Code（终端/代码）
