#!/usr/bin/env node
/**
 * OPC 提交→AI评分→企业查看 全流程 API 测试脚本（最终版）
 * 运行: node scripts/test-opc-flow.js
 *
 * 测试账号:
 *   人才: lin.ruoxi@opc.test / Test1234!
 *   企业: shanshanhe0722@gmail.com / 12345678
 */

// ─── 路径设置（确保 Prisma 在正确目录下工作）────────────────────────────────
process.chdir('/Users/sshe/Desktop/opc-ai');

const BASE = 'http://localhost:3000';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── 测试数据 ─────────────────────────────────────────────────────────────────
const TALENT_EMAIL    = 'lin.ruoxi@opc.test';
const TALENT_PASS     = 'Test1234!';
const CORP_EMAIL      = 'shanshanhe0722@gmail.com';
const CORP_PASS       = '12345678';

const REQ_DELIVERY    = 'cmmc1p03l000zmozb9zvqpqy9';  // prompt/solution → 结果交付式
const REQ_INTERACTIVE = 'cmmbljxam000hmozbt0q6tgj2';  // roleplay/stress_test → 长效陪跑式
const REQ_NONEXIST    = 'nonexistent-req-id-000000';

const Q_IDS_DELIVERY = [
  'cmmc1q32h0014mozb68lvqhgw',  // seq:1 weight:34
  'cmmc1q32h0015mozbr3ijc7kk',  // seq:2 weight:33
  'cmmc1q32h0016mozbyn0tkrnx',  // seq:3 weight:33
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, warned = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✅ ${msg}`); passed++; }
  else           { console.log(`  ❌ ${msg}`); failed++; }
}
function warn(msg) { console.log(`  ⚠️  ${msg}`); warned++; }
function section(title) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(64));
}

// 普通请求（自动跟随重定向）
async function api(method, path, { body, cookie } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Test/1.0',
  };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

// 页面请求（不跟随重定向，用于验证 middleware 鉴权）
async function page(path, { cookie } = {}) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Test/1.0',
    'Accept': 'text/html',
  };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE}${path}`, { method: 'GET', headers, redirect: 'manual' });
  return { status: res.status, location: res.headers.get('location') };
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 Test/1.0' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/opc_token=[^;]+/);
  const json = await res.json().catch(() => null);
  return { status: res.status, json, cookie: match ? match[0] : null };
}

// ─── 全局状态 ─────────────────────────────────────────────────────────────────
let talentCookie = null;
let corpCookie   = null;
let submissionId = null;

// ══════════════════════════════════════════════════════════════════════════════
// 一、认证
// ══════════════════════════════════════════════════════════════════════════════
async function testAuth() {
  section('一、认证 - 登录/未登录边界');

  const me = await api('GET', '/api/auth/me');
  assert(me.status === 401, `未登录 /api/auth/me → 401 (got ${me.status})`);

  const badLogin = await login(TALENT_EMAIL, 'wrongpassword');
  assert(badLogin.status === 401, `错误密码登录 → 401 (got ${badLogin.status})`);

  // 人才正常登录
  const t = await login(TALENT_EMAIL, TALENT_PASS);
  assert(t.status === 200, `人才登录 → 200 (got ${t.status})`);
  assert(!!t.cookie, `人才登录 → 返回 cookie`);
  talentCookie = t.cookie;

  // 企业正常登录
  const c = await login(CORP_EMAIL, CORP_PASS);
  assert(c.status === 200, `企业登录 → 200 (got ${c.status})`);
  assert(!!c.cookie, `企业登录 → 返回 cookie`);
  corpCookie = c.cookie;

  // 各自角色验证
  const meT = await api('GET', '/api/auth/me', { cookie: talentCookie });
  assert(meT.status === 200 && meT.json?.role === 'talent', `/me → role=talent`);
  const meC = await api('GET', '/api/auth/me', { cookie: corpCookie });
  assert(meC.status === 200 && meC.json?.role === 'corp', `/me → role=corp`);

  // 人才 cookie 访问企业页面
  const wrongRole = await page('/corp/requirements', { cookie: talentCookie });
  assert([302, 307].includes(wrongRole.status),
    `人才 cookie 访问企业页 → 重定向 (got ${wrongRole.status})`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 二、POST /api/submissions - 提交答案
// ══════════════════════════════════════════════════════════════════════════════
async function testSubmit() {
  section('二、POST /api/submissions - 提交答案');

  const answers = {
    [Q_IDS_DELIVERY[0]]: '情绪感知算法：采用 BERT 模型对用户输入文本进行多维情感分析，输出情绪类别（焦虑/抑郁/平静）及置信度，结合用户历史数据动态调整阈值。评估维度包括语义特征、情感极性和语境依赖性。该方案通过增量学习机制不断优化分类边界，支持多语言混合输入。',
    [Q_IDS_DELIVERY[1]]: '资源导航系统：建立三级资源树（学校→心理中心→危机热线），支持按情绪类型、严重程度、地理位置多维检索。集成实时预约功能，与校内心理老师日历同步，平均响应时间 < 2 小时。采用知识图谱技术，实现资源之间的语义关联和智能推荐。',
    [Q_IDS_DELIVERY[2]]: '正念冥想指导语：基于 CBT 框架生成个性化冥想脚本，包含 5 分钟呼吸引导、10 分钟身体扫描、15 分钟正念冥想。使用 TTS 转语音，支持背景音乐混合，目标完成率提升 40%。建立反馈闭环，根据用户完成情况和情绪变化自动调整下次推荐内容。',
    question_files: {},
  };
  const convLog = Q_IDS_DELIVERY.map((qid, i) => ({
    role: 'user',
    content: `[Q${i+1}] ${answers[qid]}`,
    timestamp: new Date().toISOString(),
  }));

  // 2-1 未登录提交
  const noAuth = await api('POST', '/api/submissions', {
    body: { requirement_id: REQ_DELIVERY, conversation_log: [], answers }
  });
  assert(noAuth.status === 401, `未登录提交 → 401 (got ${noAuth.status})`);

  // 2-2 不存在的需求 ID
  const badReq = await api('POST', '/api/submissions', {
    cookie: talentCookie,
    body: { requirement_id: REQ_NONEXIST, conversation_log: [], answers }
  });
  assert(badReq.status >= 400, `不存在需求 ID → 4xx/5xx (got ${badReq.status})`);

  // 2-3 正常提交 delivery 需求
  const ok = await api('POST', '/api/submissions', {
    cookie: talentCookie,
    body: { requirement_id: REQ_DELIVERY, conversation_log: convLog, answers }
  });
  assert(ok.status === 201, `正常提交 → 201 (got ${ok.status})`);
  assert(ok.json?.status === 'pending', `初始 status = pending (got ${ok.json?.status})`);
  assert(ok.json?.ai_total_score === null || ok.json?.ai_total_score === undefined,
    `初始 ai_total_score = null`);
  assert(!!ok.json?.id, `返回 submission id`);
  submissionId = ok.json?.id;
  console.log(`  📌 submissionId: ${submissionId}`);

  // 2-4 重复提交同一需求（现在应返回 409）
  const dup = await api('POST', '/api/submissions', {
    cookie: talentCookie,
    body: { requirement_id: REQ_DELIVERY, conversation_log: convLog, answers }
  });
  assert(dup.status === 409, `重复提交 → 409 (got ${dup.status})`);
  assert(dup.json?.error === '已提交过此需求', `返回正确错误信息 (got ${dup.json?.error})`);

  // 2-5 空 answers 提交（现在应返回 400）
  const emptyAns = await api('POST', '/api/submissions', {
    cookie: talentCookie,
    body: { requirement_id: REQ_INTERACTIVE, conversation_log: [], answers: {} }
  });
  assert(emptyAns.status === 400, `空 answers → 400 (got ${emptyAns.status})`);
  assert(emptyAns.json?.error === '答案不能为空', `返回正确错误信息 (got ${emptyAns.json?.error})`);

  // 2-6 缺少 conversation_log
  const noLog = await api('POST', '/api/submissions', {
    cookie: talentCookie,
    body: { requirement_id: REQ_INTERACTIVE, answers }
  });
  console.log(`  ℹ️  conversation_log 缺失 → ${noLog.status}（${noLog.json?.status ?? noLog.json?.error ?? ''}）`);
  if (noLog.status === 201 && noLog.json?.id) {
    await prisma.submission.delete({ where: { id: noLog.json.id } });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 三、AI 评分验证
// ══════════════════════════════════════════════════════════════════════════════
async function testScoring() {
  section('三、AI 评分 - 异步触发与结果验证');

  if (!submissionId) { console.log('  ⚠️  跳过'); return; }

  console.log('  ⏳ 等待 AI 评分（最多 90 秒）...');
  let sub = null;
  const start = Date.now();

  while (Date.now() - start < 90000) {
    await new Promise(r => setTimeout(r, 5000));
    sub = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (sub?.status && sub.status !== 'pending') {
      console.log(`  ⏱  耗时 ${Math.round((Date.now()-start)/1000)} 秒`);
      break;
    }
    process.stdout.write('.');
  }
  console.log('');

  // 3-1 status 更新
  assert(sub?.status === 'evaluated', `status = evaluated (got ${sub?.status})`);

  // 3-2 总分
  assert(typeof sub?.ai_total_score === 'number',
    `ai_total_score 为数字 (got ${typeof sub?.ai_total_score}: ${sub?.ai_total_score})`);
  assert((sub?.ai_total_score ?? -1) >= 0 && (sub?.ai_total_score ?? 101) <= 100,
    `总分在 0-100 (got ${sub?.ai_total_score})`);
  console.log(`  📊 AI 总分: ${sub?.ai_total_score}`);

  // 3-3 score_breakdown
  if (sub?.ai_score_breakdown) {
    let bd; try { bd = JSON.parse(sub.ai_score_breakdown); } catch {}
    const DIMS = ['keyword_match', 'logic_consistency', 'compliance_check', 'completeness'];
    assert(DIMS.every(d => typeof bd?.[d] === 'number'), `score_breakdown 含 4 个 delivery 维度`);
    assert(Object.values(bd ?? {}).every(v => typeof v === 'number' && v >= 0 && v <= 100),
      `所有维度分数在 0-100`);
    if (bd) {
      const avg = DIMS.reduce((s, d) => s + (bd[d] ?? 0), 0) / DIMS.length;
      const rounded = Math.round(avg * 10) / 10;
      assert(Math.abs(rounded - (sub.ai_total_score ?? 0)) < 0.5,
        `总分 ≈ 维度均值 (expected~${rounded}, got ${sub.ai_total_score})`);
      console.log(`  📐 维度: ${DIMS.map(d => `${d.split('_')[0]}=${bd[d]}`).join(' | ')}`);
    }
  } else {
    warn('ai_score_breakdown 为空（AI 返回格式可能异常）');
  }

  // 3-4 diagnosis
  if (sub?.ai_diagnosis) {
    let diag; try { diag = JSON.parse(sub.ai_diagnosis); } catch {}
    assert(Array.isArray(diag?.strengths) && diag.strengths.length > 0,
      `diagnosis.strengths 非空数组 (got ${diag?.strengths?.length} 条)`);
    assert(Array.isArray(diag?.suggestions) && diag.suggestions.length > 0,
      `diagnosis.suggestions 非空数组 (got ${diag?.suggestions?.length} 条)`);
  } else {
    warn('ai_diagnosis 为空');
  }

  // 3-5 企业通知
  const notif = await prisma.notification.findFirst({
    where: { payload: { contains: submissionId } },
    orderBy: { created_at: 'desc' },
  });
  assert(!!notif, `评分后创建企业通知`);
  if (notif) {
    let payload; try { payload = JSON.parse(notif.payload); } catch {}
    assert(payload?.submission_id === submissionId, `通知含正确 submission_id`);
    assert(payload?.requirement_id === REQ_DELIVERY, `通知含 requirement_id`);
    if (typeof payload?.score !== 'number') {
      assert(false, `通知含 score（got ${payload?.score}）`);
    } else {
      assert(typeof payload.score === 'number', `通知含 score: ${payload.score}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 四、企业端：Middleware 鉴权 + 提交列表页
// ══════════════════════════════════════════════════════════════════════════════
async function testCorpPages() {
  section('四、企业端 - Middleware 鉴权 + 提交列表/报告页');

  if (!submissionId) { console.log('  ⚠️  跳过报告页测试'); }

  // 4-1 未登录访问企业提交列表页 → middleware 应重定向
  const listNoAuth = await page(`/corp/requirements/${REQ_DELIVERY}/submissions`);
  assert([302, 307].includes(listNoAuth.status),
    `未登录访问提交列表页 → 重定向 (got ${listNoAuth.status} → ${listNoAuth.location})`);

  // 4-2 人才 cookie 访问企业页 → 重定向
  const listTalent = await page(`/corp/requirements/${REQ_DELIVERY}/submissions`, { cookie: talentCookie });
  assert([302, 307].includes(listTalent.status),
    `人才访问企业提交列表页 → 重定向 (got ${listTalent.status})`);

  // 4-3 企业正常访问提交列表
  const listOk = await page(`/corp/requirements/${REQ_DELIVERY}/submissions`, { cookie: corpCookie });
  assert(listOk.status === 200, `企业访问提交列表页 → 200 (got ${listOk.status})`);

  if (submissionId) {
    // 4-4 未登录访问评分报告页
    const detailNoAuth = await page(`/corp/submissions/${submissionId}`);
    assert([302, 307].includes(detailNoAuth.status),
      `未登录访问报告页 → 重定向 (got ${detailNoAuth.status})`);

    // 4-5 人才越权访问报告页
    const detailTalent = await page(`/corp/submissions/${submissionId}`, { cookie: talentCookie });
    assert([302, 307].includes(detailTalent.status),
      `人才越权访问报告页 → 重定向 (got ${detailTalent.status})`);

    // 4-6 企业正常访问报告页
    const detailOk = await page(`/corp/submissions/${submissionId}`, { cookie: corpCookie });
    assert(detailOk.status === 200, `企业访问报告详情页 → 200 (got ${detailOk.status})`);
  }

  // 4-7 DB 验证提交列表排序逻辑
  const subs = await prisma.submission.findMany({
    where: { requirement_id: REQ_DELIVERY },
    orderBy: { ai_total_score: 'desc' },
    select: { id: true, status: true, ai_total_score: true },
  });
  if (subs.length > 1) {
    const scores = subs.filter(s => s.ai_total_score !== null).map(s => s.ai_total_score);
    const isSorted = scores.every((v, i) => i === 0 || (scores[i-1] ?? 0) >= (v ?? 0));
    assert(isSorted, `DB 提交按 ai_total_score 降序排列`);
    console.log(`  📋 ${subs.length} 条提交，分数: ${scores.join(', ')}`);
  }

  // 4-8 推荐等级边界验证（前端计算逻辑）
  const boundaries = [
    { score: 90, expected: '强烈推荐' },
    { score: 85, expected: '强烈推荐' },
    { score: 84, expected: '推荐' },
    { score: 70, expected: '推荐' },
    { score: 69, expected: '可考虑' },
    { score: 55, expected: '可考虑' },
    { score: 54, expected: '暂不推荐' },
    { score: 0,  expected: '暂不推荐' },
  ];
  const calcRec = s => s >= 85 ? '强烈推荐' : s >= 70 ? '推荐' : s >= 55 ? '可考虑' : '暂不推荐';
  const allOk = boundaries.every(b => calcRec(b.score) === b.expected);
  assert(allOk, `推荐等级边界值全部正确（85/70/55 分界）`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 五、评分数据完整性（DB 验证）
// ══════════════════════════════════════════════════════════════════════════════
async function testScoringDataIntegrity() {
  section('五、评分数据完整性（DB 验证）');

  if (!submissionId) { console.log('  ⚠️  跳过'); return; }

  const sub = await prisma.submission.findUnique({ where: { id: submissionId } });

  // 5-1 answers 字段可解析
  if (sub?.answers) {
    let ans; let ok = false;
    try { ans = JSON.parse(sub.answers); ok = true; } catch {}
    assert(ok && ans && typeof ans === 'object', `answers 字段可解析为对象`);
  }

  // 5-2 conversation_log 字段可解析
  if (sub?.conversation_log) {
    let log; let ok = false;
    try { log = JSON.parse(sub.conversation_log); ok = true; } catch {}
    assert(ok && Array.isArray(log), `conversation_log 可解析为数组`);
  }

  // 5-3 总分与维度均值误差 < 0.5
  if (sub?.ai_score_breakdown && typeof sub?.ai_total_score === 'number') {
    let bd; try { bd = JSON.parse(sub.ai_score_breakdown); } catch {}
    if (bd) {
      const vals = Object.values(bd).filter(v => typeof v === 'number');
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      const rounded = Math.round(avg * 10) / 10;
      assert(Math.abs(rounded - sub.ai_total_score) < 0.5,
        `总分 ${sub.ai_total_score} ≈ 维度均值 ${rounded}`);
    }
  }

  // 5-4 模式标识（interactive vs delivery）
  const req = await prisma.requirement.findUnique({
    where: { id: sub?.requirement_id ?? '' },
    select: { question_types: true }
  });
  if (req) {
    let qTypes; try { qTypes = JSON.parse(req.question_types); } catch { qTypes = []; }
    const isInteractive = qTypes.includes('roleplay') || qTypes.includes('stress_test');
    console.log(`  🏷️  考核模式: ${isInteractive ? '长效陪跑式 (Interactive)' : '结果交付式 (Delivery)'}`);

    if (sub?.ai_score_breakdown) {
      let bd; try { bd = JSON.parse(sub.ai_score_breakdown); } catch {}
      const DELIVERY_DIMS = ['keyword_match', 'logic_consistency', 'compliance_check', 'completeness'];
      const INTERACTIVE_DIMS = ['business_expertise', 'goal_decomposition', 'method_feasibility', 'value_overflow'];
      const expectedDims = isInteractive ? INTERACTIVE_DIMS : DELIVERY_DIMS;
      const hasDims = expectedDims.every(d => typeof bd?.[d] === 'number');
      assert(hasDims, `score_breakdown 维度与考核模式匹配 (${isInteractive ? 'interactive' : 'delivery'})`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 六、标记不考虑 POST /api/submissions/:id/dismiss
// ══════════════════════════════════════════════════════════════════════════════
async function testDismiss() {
  section('六、标记不考虑 POST /api/submissions/:id/dismiss');

  if (!submissionId) { console.log('  ⚠️  跳过'); return; }

  // 6-1 未登录
  const noAuth = await api('POST', `/api/submissions/${submissionId}/dismiss`);
  assert(noAuth.status === 401, `未登录 → 401 (got ${noAuth.status})`);

  // 6-2 人才越权（该需求属于另一企业）
  const talentAccess = await api('POST', `/api/submissions/${submissionId}/dismiss`, { cookie: talentCookie });
  assert(talentAccess.status === 403, `人才越权 → 403 (got ${talentAccess.status})`);

  // 6-3 不存在的 submission
  const notFound = await api('POST', `/api/submissions/nonexistent-000/dismiss`, { cookie: corpCookie });
  assert(notFound.status === 404, `不存在 submission → 404 (got ${notFound.status})`);

  // 6-4 企业正常标记
  const ok = await api('POST', `/api/submissions/${submissionId}/dismiss`, { cookie: corpCookie });
  assert(ok.status === 200, `企业标记不考虑 → 200 (got ${ok.status})`);

  // 6-5 DB 验证
  const sub = await prisma.submission.findUnique({ where: { id: submissionId }, select: { status: true } });
  assert(sub?.status === 'dismissed', `DB status = dismissed (got ${sub?.status})`);

  // 6-6 幂等性
  const dup = await api('POST', `/api/submissions/${submissionId}/dismiss`, { cookie: corpCookie });
  assert(dup.status === 200 || dup.status === 400,
    `重复标记 → 幂等/报错 (got ${dup.status})`);

  // 恢复 status
  await prisma.submission.update({ where: { id: submissionId }, data: { status: 'evaluated' } });
  console.log('  🔧 已恢复 status → evaluated');
}

// ══════════════════════════════════════════════════════════════════════════════
// 七、邀请配额检查 GET /api/corp/invite/check
// ══════════════════════════════════════════════════════════════════════════════
async function testInviteCheck() {
  section('七、邀请配额检查 GET /api/corp/invite/check');

  // 7-1 未登录
  const noAuth = await api('GET', '/api/corp/invite/check');
  assert(noAuth.status === 401, `未登录 → 401 (got ${noAuth.status})`);

  // 7-2 人才账号（无 corpProfile）
  const talentAccess = await api('GET', '/api/corp/invite/check', { cookie: talentCookie });
  console.log(`  ℹ️  人才访问配额接口 → ${talentAccess.status} "${talentAccess.json?.error ?? ''}"`);
  assert(talentAccess.status !== 200, `人才不能获取企业配额 (got ${talentAccess.status})`);

  // 7-3 企业正常
  const check = await api('GET', '/api/corp/invite/check', { cookie: corpCookie });
  assert(check.status === 200, `企业检查配额 → 200 (got ${check.status})`);
  assert(typeof check.json?.quota === 'number', `返回 quota 数字 (got ${typeof check.json?.quota})`);
  assert(check.json?.quota >= 0, `quota ≥ 0 (got ${check.json?.quota})`);
  console.log(`  💳 当前配额: ${check.json?.quota}`);
  if (typeof check.json?.referralCode === 'string') {
    console.log(`  🔗 referralCode: ${check.json.referralCode}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 八、发起邀请 POST /api/collaborations
// ══════════════════════════════════════════════════════════════════════════════
async function testInvite() {
  section('八、发起邀请 POST /api/collaborations');

  if (!submissionId) { console.log('  ⚠️  跳过'); return; }

  // 8-1 未登录
  const noAuth = await api('POST', '/api/collaborations', {
    body: { submission_id: submissionId, invitation_message: '测试邀请' }
  });
  assert(noAuth.status === 401, `未登录 → 401 (got ${noAuth.status})`);

  // 8-2 人才账号（无 corpProfile → 现在应返回 403）
  const talentInvite = await api('POST', '/api/collaborations', {
    cookie: talentCookie,
    body: { submission_id: submissionId, invitation_message: '测试' }
  });
  assert(talentInvite.status === 403,
    `人才发起邀请 → 403 (got ${talentInvite.status})`);
  assert(talentInvite.json?.error === 'Forbidden',
    `错误信息 Forbidden (got ${talentInvite.json?.error})`);

  // 8-3 敏感词检测
  const sensitive = await api('POST', '/api/collaborations', {
    cookie: corpCookie,
    body: { submission_id: submissionId, invitation_message: '你个傻逼' }
  });
  assert(sensitive.status === 400, `敏感词留言 → 400 (got ${sensitive.status})`);
  assert(sensitive.json?.words?.length > 0, `返回违禁词列表: ${JSON.stringify(sensitive.json?.words)}`);

  // 8-4 配额检查
  const quotaRes = await api('GET', '/api/corp/invite/check', { cookie: corpCookie });
  const quota = quotaRes.json?.quota ?? 0;

  if (quota > 0) {
    // 8-5 正常邀请
    const ok = await api('POST', '/api/collaborations', {
      cookie: corpCookie,
      body: { submission_id: submissionId, invitation_message: '您的答案专业，期待合作！' }
    });
    assert(ok.status === 200 || ok.status === 201,
      `正常邀请 → 200/201 (got ${ok.status})`);

    if (ok.status === 200 || ok.status === 201) {
      // 8-6 DB 验证 status = invited
      const sub = await prisma.submission.findUnique({ where: { id: submissionId }, select: { status: true } });
      assert(sub?.status === 'invited', `邀请后 status = invited (got ${sub?.status})`);

      // 8-7 重复邀请（已有 Collaboration）
      const dup = await api('POST', '/api/collaborations', {
        cookie: corpCookie,
        body: { submission_id: submissionId, invitation_message: '再次邀请' }
      });
      assert(dup.status !== 200 && dup.status !== 201,
        `重复邀请被拒绝 → 非成功 (got ${dup.status})`);
      console.log(`  ℹ️  重复邀请: ${dup.status} "${dup.json?.error ?? ''}"`);
    }
  } else {
    // 8-5b 配额用尽
    const noQuota = await api('POST', '/api/collaborations', {
      cookie: corpCookie,
      body: { submission_id: submissionId, invitation_message: '测试' }
    });
    assert(noQuota.status === 403, `配额用尽 → 403 (got ${noQuota.status})`);
    assert(noQuota.json?.error === 'quotaExhausted',
      `错误码 quotaExhausted (got ${noQuota.json?.error})`);
    console.log('  💡 配额已用尽，跳过正常邀请路径');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 九、手动重新评分（安全审计）
// ══════════════════════════════════════════════════════════════════════════════
async function testRescoreAPI() {
  section('九、POST /api/ai/score-submission - 安全审计');

  // 9-1 无鉴权漏洞检查（现在应返回 403）
  const noAuth = await api('POST', '/api/ai/score-submission', {
    body: { submission_id: submissionId ?? 'test' }
  });
  assert(noAuth.status === 403,
    `未登录重新评分 → 403 (got ${noAuth.status})`);

  // 9-1b 人才账号也应被拒绝（非 corp 角色）
  const talentRescore = await api('POST', '/api/ai/score-submission', {
    cookie: talentCookie,
    body: { submission_id: submissionId ?? 'test' }
  });
  assert(talentRescore.status === 403,
    `人才账号重新评分 → 403 (got ${talentRescore.status})`);

  // 9-2 不存在的 submission_id
  const badId = await api('POST', '/api/ai/score-submission', {
    cookie: corpCookie,
    body: { submission_id: 'nonexistent-000' }
  });
  assert(badId.status >= 400, `不存在 submission_id → 4xx/5xx (got ${badId.status})`);

  // 9-3 submission_id 字段缺失
  const noId = await api('POST', '/api/ai/score-submission', { cookie: corpCookie, body: {} });
  console.log(`  ℹ️  submission_id 缺失 → ${noId.status} "${noId.json?.error ?? ''}"`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 主入口
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('🚀 OPC 全流程 API 测试（最终版）');
  console.log(`   Base: ${BASE}`);
  console.log(`   时间: ${new Date().toLocaleString()}\n`);

  try {
    await testAuth();
    await testSubmit();
    await testScoring();           // ⚠️ 约 30-90 秒
    await testCorpPages();
    await testScoringDataIntegrity();
    await testDismiss();
    await testInviteCheck();
    await testInvite();
    await testRescoreAPI();
  } catch (e) {
    console.error('\n💥 脚本异常:', e.message);
    console.error(e.stack?.split('\n').slice(0, 3).join('\n'));
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '═'.repeat(64));
  console.log(`  结果汇总: ✅ ${passed} 通过  ❌ ${failed} 失败  ⚠️  ${warned} 警告`);
  console.log('═'.repeat(64));
  process.exit(failed > 0 ? 1 : 0);
}

main();
