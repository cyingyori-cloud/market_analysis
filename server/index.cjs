/**
 * Legacy API server kept only for reference during the refactor.
 *
 * Canonical backend entrypoint:
 * - server/index.ts
 *
 * Freeze policy:
 * - Do not add new features here
 * - Do not treat this file as the production API path
 * - Remove after the TypeScript backend fully replaces it
 */

// 加载环境变量
require('dotenv').config();

const jsonServer = require('json-server');
const path = require('path');
const { requireAuth } = require('./middleware/auth.cjs');
const { validateCompetitorParams } = require('./middleware/validator.cjs');

console.warn('[legacy] server/index.cjs is frozen. Use server/index.ts as the primary backend.');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db/db.json'));
const middlewares = jsonServer.defaults();

// 解析 JSON body
server.use(jsonServer.bodyParser);

// CORS 已由 middlewares 默认启用

// ============================================================
// 公开路由（无需认证）
// ============================================================

// 健康检查
server.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: '4S Competitive Intelligence API',
  });
});

// 获取竞品列表
server.get('/api/competitors', (req, res) => {
  const db = router.db;
  const competitors = db.get('competitors').value();
  res.json(competitors);
});

// 获取单个竞品详情
server.get('/api/competitors/:id', (req, res) => {
  const db = router.db;
  const competitor = db.get('competitors').find({ id: req.params.id }).value();
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  res.json(competitor);
});

// 获取竞品动态列表
server.get('/api/competitor-news', (req, res) => {
  const db = router.db;
  const news = db.get('competitorNews').value();
  res.json(news);
});

// 获取今日动态
server.get('/api/competitor-news/today', (req, res) => {
  const db = router.db;
  const today = new Date().toISOString().split('T')[0];
  const news = db.get('competitorNews').filter(n => n.publishedAt.startsWith(today)).value();
  res.json(news);
});

// 获取政策列表
server.get('/api/policies', (req, res) => {
  const db = router.db;
  const policies = db.get('policies').value();
  res.json(policies);
});

// 获取中标记录
server.get('/api/bid-results', (req, res) => {
  const db = router.db;
  const results = db.get('bidResults').value();
  res.json(results);
});

// 获取竞品列表（支持 BU / customerGroup / threatLevel 筛选）
server.get('/api/competitors/filter', (req, res) => {
  const db = router.db;
  const { bu, customerGroup, threatLevel } = req.query;
  let competitors = db.get('competitors').value();
  if (bu) {
    competitors = competitors.filter(c => Array.isArray(c.bu) ? c.bu.includes(bu) : c.bu === bu);
  }
  if (customerGroup) {
    competitors = competitors.filter(c =>
      Array.isArray(c.customerGroup)
        ? c.customerGroup.some(g => g.includes(customerGroup))
        : String(c.customerGroup).includes(customerGroup)
    );
  }
  if (threatLevel) {
    competitors = competitors.filter(c => c.threatLevel === threatLevel);
  }
  res.json(competitors);
});

// 获取信息源列表
server.get('/api/intel-sources', (req, res) => {
  const db = router.db;
  const sources = db.get('intelSources').value();
  if (!sources) return res.json({ national_gov: [], local_gov: [], industry_sites: [] });
  const { category } = req.query;
  if (category === 'national_gov') return res.json(sources.national_gov || []);
  if (category === 'local_gov') return res.json(sources.local_gov || []);
  if (category === 'industry_sites') return res.json(sources.industry_sites || []);
  // 返回全量 + 统计
  const all = [
    ...(sources.national_gov || []),
    ...(sources.local_gov || []),
    ...(sources.industry_sites || []),
  ];
  res.json({
    total: all.length,
    national_gov: sources.national_gov || [],
    local_gov: sources.local_gov || [],
    industry_sites: sources.industry_sites || [],
  });
});

// 获取信息源统计
server.get('/api/intel-sources/stats', (req, res) => {
  const db = router.db;
  const sources = db.get('intelSources').value() || {};
  res.json({
    national_gov: (sources.national_gov || []).length,
    local_gov: (sources.local_gov || []).length,
    industry_sites: (sources.industry_sites || []).length,
    total: Object.values(sources).flat().length,
    high_priority: Object.values(sources).flat().filter(s => s.priority === 'high').length,
  });
});

// ============================================================
// 受保护路由（需要 API Key）
// ============================================================

// 创建竞品动态记录
server.post('/api/competitor-news', requireAuth, (req, res) => {
  const db = router.db;
  const news = {
    id: `news_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  db.get('competitorNews').unshift(news).write();
  res.json(news);
});

// 创建政策解读
server.post('/api/policies', requireAuth, (req, res) => {
  const db = router.db;
  const policy = {
    id: `policy_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  db.get('policies').unshift(policy).write();
  res.json(policy);
});

// 创建中标记录
server.post('/api/bid-results', requireAuth, (req, res) => {
  const db = router.db;
  const result = {
    id: `bid_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  db.get('bidResults').unshift(result).write();
  res.json(result);
});

// 创建投标情报包
server.post('/api/bid-packages', requireAuth, validateCompetitorParams, (req, res) => {
  const db = router.db;
  const { projectId, projectName } = req.body;
  
  // 获取历史中标记录
  const bidHistory = db.get('bidResults')
    .filter(r => r.projectType === '国网配网' || r.projectType === '南网')
    .value();
  
  // 获取竞品最新动态
  const competitorNews = db.get('competitorNews')
    .orderBy('publishedAt', 'desc')
    .slice(0, 20)
    .value();
  
  // 获取竞品信息
  const competitors = db.get('competitors').value();
  
  const packageData = {
    id: `pkg_${Date.now()}`,
    createdAt: new Date().toISOString(),
    projectId,
    projectName,
    bidHistory,
    competitorNews,
    competitors,
    analysis: {
      marketShare: calculateMarketShare(bidHistory),
      priceRange: analyzePriceRange(bidHistory),
      techTrends: analyzeTechTrends(competitorNews),
    },
    recommendations: generateRecommendations(bidHistory, competitorNews),
  };
  
  db.get('bidPackages').unshift(packageData).write();
  res.json(packageData);
});

// 获取投标情报包列表
server.get('/api/bid-packages', requireAuth, (req, res) => {
  const db = router.db;
  const packages = db.get('bidPackages').value();
  res.json(packages);
});

// 获取单个投标情报包
server.get('/api/bid-packages/:id', requireAuth, (req, res) => {
  const db = router.db;
  const pkg = db.get('bidPackages').find({ id: req.params.id }).value();
  if (!pkg) {
    return res.status(404).json({ error: 'Bid package not found' });
  }
  res.json(pkg);
});

// 创建竞品分析报告
server.post('/api/reports', requireAuth, (req, res) => {
  const db = router.db;
  const { reportType, period } = req.body;
  
  // 收集数据
  const competitors = db.get('competitors').value();
  const news = db.get('competitorNews').value();
  const bidResults = db.get('bidResults').value();
  const policies = db.get('policies').value();
  
  const report = {
    id: `report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    reportType,
    period,
    summary: generateReportSummary(reportType, competitors, news, bidResults, policies),
    details: {
      competitorActivity: analyzeCompetitorActivity(competitors, news),
      marketShareChanges: analyzeMarketShareChanges(bidResults),
      policyImpacts: analyzePolicyImpacts(policies),
      swot: generateSWOT(competitors, news, bidResults),
    },
    recommendations: generateOverallRecommendations(competitors, news, bidResults),
  };
  
  db.get('reports').unshift(report).write();
  res.json(report);
});

// 获取报告列表
server.get('/api/reports', requireAuth, (req, res) => {
  const db = router.db;
  const reports = db.get('reports').value();
  res.json(reports);
});

// 获取单个报告
server.get('/api/reports/:id', requireAuth, (req, res) => {
  const db = router.db;
  const report = db.get('reports').find({ id: req.params.id }).value();
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// 获取预警列表
server.get('/api/alerts', requireAuth, (req, res) => {
  const db = router.db;
  const news = db.get('competitorNews').value();
  const policies = db.get('policies').value();
  
  // 生成预警
  const alerts = [];
  
  // 从重大动态生成预警
  news.filter(n => n.tag === 'major').forEach(n => {
    alerts.push({
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level: 'high',
      title: n.title,
      content: n.impactAnalysis || '需关注此动态',
      source: n.source,
      competitorId: n.competitorId,
      createdAt: n.publishedAt,
      type: 'competitor',
    });
  });
  
  // 从政策生成预警
  policies.filter(p => p.impactLevel === 'high').forEach(p => {
    alerts.push({
      id: `alert_policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level: 'medium',
      title: p.title,
      content: p.impactAnalysis || '政策影响较大',
      source: p.source,
      createdAt: p.publishedAt,
      type: 'policy',
    });
  });
  
  res.json(alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// 竞品深度档案
server.get('/api/competitor-profile/:id', requireAuth, (req, res) => {
  const db = router.db;
  const competitor = db.get('competitors').find({ id: req.params.id }).value();
  
  if (!competitor) {
    return res.status(404).json({ error: 'Competitor not found' });
  }
  
  // 获取该竞品的动态
  const news = db.get('competitorNews')
    .filter(n => n.competitorId === req.params.id)
    .orderBy('publishedAt', 'desc')
    .slice(0, 50)
    .value();
  
  // 获取该竞品的中标记录
  const bidRecords = db.get('bidResults')
    .filter(r => r.competitorId === req.params.id)
    .value();
  
  res.json({
    ...competitor,
    recentNews: news,
    bidRecords,
    analysis: {
      activityScore: calculateActivityScore(news),
      marketShareTrend: analyzeShareTrend(bidRecords),
      recentFocus: analyzeRecentFocus(news),
    },
  });
});

// ============================================================
// 辅助函数
// ============================================================

function calculateMarketShare(bidHistory) {
  const total = bidHistory.reduce((sum, r) => sum + (r.amount || 0), 0);
  const shareMap = {};
  
  bidHistory.forEach(r => {
    shareMap[r.competitorName] = (shareMap[r.competitorName] || 0) + (r.amount || 0);
  });
  
  return Object.entries(shareMap).map(([name, amount]) => ({
    name,
    amount,
    share: total > 0 ? (amount / total * 100).toFixed(2) + '%' : '0%',
  }));
}

function analyzePriceRange(bidHistory) {
  const prices = bidHistory.map(r => r.unitPrice).filter(p => p);
  if (prices.length === 0) return null;
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2),
  };
}

function analyzeTechTrends(news) {
  const techKeywords = ['新品', '技术', '研发', '专利', 'GIL', 'AI', '数字化'];
  return techKeywords.map(keyword => ({
    keyword,
    count: news.filter(n => 
      (n.title + n.content + n.summary || '').includes(keyword)
    ).length,
  }));
}

function generateRecommendations(bidHistory, competitorNews) {
  const recommendations = [];
  
  // 分析思源电气份额上升
  const siyuanRecords = bidHistory.filter(r => r.competitorName === '思源电气');
  if (siyuanRecords.length > 0) {
    const latestShare = siyuanRecords[0].marketShare;
    if (parseFloat(latestShare) > 6) {
      recommendations.push({
        type: 'warning',
        title: '思源电气份额持续上升',
        content: '建议在开关柜和互感器标段适当调整报价策略，强调中电电力在配网自动化整体方案优势',
        priority: 'high',
      });
    }
  }
  
  // 分析派诺科技产能扩张
  const painuoNews = competitorNews.filter(n => n.competitorName === '派诺科技');
  if (painuoNews.some(n => n.title.includes('投产') || n.title.includes('基地'))) {
    recommendations.push({
      type: 'opportunity',
      title: '派诺科技武汉基地投产',
      content: '华中区域竞争压力上升，建议华中区域组加强客户拜访频率',
      priority: 'high',
    });
  }
  
  return recommendations;
}

function generateReportSummary(reportType, competitors, news, bidResults, policies) {
  const today = new Date().toISOString().split('T')[0];
  const todayNews = news.filter(n => n.publishedAt.startsWith(today));
  const majorSignals = news.filter(n => n.tag === 'major');
  
  if (reportType === 'daily') {
    return {
      totalNews: todayNews.length,
      majorSignals: majorSignals.length,
      topCompetitors: getTopActiveCompetitors(competitors, news, 5),
      summary: `今日共采集${todayNews.length}条竞品动态，其中${majorSignals.length}条为重大信号`,
    };
  }
  
  return {
    totalNews: news.length,
    majorSignals: majorSignals.length,
    bidResults: bidResults.length,
    policies: policies.length,
    summary: `本期共采集${news.length}条动态，${bidResults.length}条中标记录，${policies.length}条相关政策`,
  };
}

function getTopActiveCompetitors(competitors, news, limit) {
  const activityMap = {};
  
  news.forEach(n => {
    activityMap[n.competitorId] = (activityMap[n.competitorId] || 0) + 1;
  });
  
  return competitors
    .map(c => ({
      id: c.id,
      name: c.name,
      activityScore: activityMap[c.id] || 0,
    }))
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, limit);
}

function analyzeCompetitorActivity(competitors, news) {
  const activityMap = {};
  const recentNews = news.filter(n => {
    const date = new Date(n.publishedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  });
  
  recentNews.forEach(n => {
    activityMap[n.competitorId] = (activityMap[n.competitorId] || 0) + 1;
  });
  
  return competitors.map(c => ({
    ...c,
    recentActivity: activityMap[c.id] || 0,
    activityTrend: activityMap[c.id] > 5 ? 'high' : activityMap[c.id] > 2 ? 'medium' : 'low',
  }));
}

function analyzeMarketShareChanges(bidResults) {
  const changes = [];
  const grouped = {};
  
  bidResults.forEach(r => {
    if (!grouped[r.competitorName]) {
      grouped[r.competitorName] = [];
    }
    grouped[r.competitorName].push(r);
  });
  
  Object.entries(grouped).forEach(([name, records]) => {
    if (records.length >= 2) {
      const latest = records[0];
      const previous = records[1];
      const change = parseFloat(latest.marketShare || '0') - parseFloat(previous.marketShare || '0');
      
      changes.push({
        competitorName: name,
        latestShare: latest.marketShare,
        previousShare: previous.marketShare,
        change: change.toFixed(2) + '%',
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      });
    }
  });
  
  return changes;
}

function analyzePolicyImpacts(policies) {
  return policies.map(p => ({
    title: p.title,
    impactLevel: p.impactLevel,
    affectedProducts: p.affectedProducts || [],
    opportunities: p.opportunities || [],
    threats: p.threats || [],
  }));
}

function generateSWOT(competitors, news, bidResults) {
  return {
    strengths: [
      '配网自动化整体方案完整',
      '客户关系稳定，区域口碑好',
      '产品性价比优于部分竞品',
    ],
    weaknesses: [
      '特高压GIL产品线空白',
      '数字化平台IT能力弱于国电南瑞',
      '储能BMS领域刚起步',
    ],
    opportunities: [
      '配网改造5000亿投资计划',
      '新型工业化方案利好数字化',
      '储能市场高速增长',
    ],
    threats: [
      '思源份额持续上升',
      '派诺武汉基地投产压价',
      '安科瑞AI差异化威胁',
    ],
  };
}

function generateOverallRecommendations(competitors, news, bidResults) {
  return [
    {
      area: '华中区域',
      priority: 'high',
      recommendation: '派诺武汉基地投产后，需重点关注湖北、湖南、江西三省投标动向',
      action: '建议华中区域组加强客户拜访频率，本周内完成重点客户沟通',
    },
    {
      area: '配网自动化',
      priority: 'high',
      recommendation: '思源电气份额持续上升，需调整报价策略',
      action: '在开关柜和互感器标段适当调整报价，同时强调整体方案优势',
    },
    {
      area: '数字化赛道',
      priority: 'medium',
      recommendation: '国电南瑞南网8亿大单，市场份额进一步集中',
      action: '评估是否进入数字化平台市场，考虑与IT厂商合作的可能性',
    },
    {
      area: '储能BMS',
      priority: 'medium',
      recommendation: '安科瑞进军储能BMS，新业务线值得关注',
      action: '跟踪安科瑞储能BMS产品进展，评估中电电力自身储能产品竞争力',
    },
  ];
}

function calculateActivityScore(news) {
  const weekNews = news.filter(n => {
    const date = new Date(n.publishedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  });
  
  return weekNews.length * 10;
}

function analyzeShareTrend(bidRecords) {
  if (bidRecords.length < 2) return 'stable';
  
  const shares = bidRecords.map(r => parseFloat(r.marketShare || '0'));
  const avg = shares.reduce((a, b) => a + b, 0) / shares.length;
  
  if (shares[0] > avg * 1.1) return 'increasing';
  if (shares[0] < avg * 0.9) return 'decreasing';
  return 'stable';
}

function analyzeRecentFocus(news) {
  const tags = {};
  news.forEach(n => {
    tags[n.tag] = (tags[n.tag] || 0) + 1;
  });
  
  return Object.entries(tags)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// ============================================================
// 路由重写（JSON Server 标准路径）
// ============================================================
server.use(jsonServer.rewriter({
  '/api/competitors': '/competitors',
  '/api/competitors/:id': '/competitors/:id',
  '/api/competitor-news': '/competitorNews',
  '/api/competitor-news/today': '/competitorNews',
  '/api/policies': '/policies',
  '/api/bid-results': '/bidResults',
  '/api/bid-packages': '/bidPackages',
  '/api/bid-packages/:id': '/bidPackages/:id',
  '/api/reports': '/reports',
  '/api/reports/:id': '/reports/:id',
  '/api/alerts': '/alerts',
}));

// JSON Server 路由
server.use(router);

// 错误处理
server.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║       4S Competitive Intelligence API                 ║
║       竞品情报系统后端服务                             ║
╠═══════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                     ║
║  Health:   http://localhost:${PORT}/api/health           ║
║  Docs:     http://localhost:${PORT}/api                 ║
╠═══════════════════════════════════════════════════════╣
║  Auth:    ${process.env.AUTH_DISABLED === 'true' ? 'DISABLED (dev mode)' : 'API Key Required'}                    ║
╚═══════════════════════════════════════════════════════╝
  `);
});
