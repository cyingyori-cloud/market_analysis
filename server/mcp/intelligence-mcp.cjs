/**
 * 4S竞品情报系统 - MCP Server
 * 基于 Model Context Protocol 的 AI 集成接口
 * 
 * 启动：npm run mcp
 */

const { randomUUID } = require('node:crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const path = require('path');

const LEGACY_PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: '4s-intelligence-mcp',
  version: '1.0.0',
};

const TOOLS = [
  {
    name: 'list_competitors',
    description: '查询竞品列表，返回所有竞品的基本信息',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_competitor',
    description: '根据竞品ID查询单个竞品详情',
    inputSchema: {
      type: 'object',
      properties: {
        competitorId: { type: 'string', description: '竞品ID，例如 comp_001' },
      },
      required: ['competitorId'],
    },
  },
  {
    name: 'list_competitor_news',
    description: '查询竞品动态列表，支持按日期和竞品筛选',
    inputSchema: {
      type: 'object',
      properties: {
        competitorId: { type: 'string', description: '竞品ID，可选' },
        date: { type: 'string', description: '日期，格式 YYYY-MM-DD，可选，默认今天' },
        tag: { type: 'string', description: '标签筛选，如 major/new/bid 等，可选' },
        limit: { type: 'number', description: '返回数量限制，默认 20' },
      },
    },
  },
  {
    name: 'get_competitor_news',
    description: '根据动态ID查询单条竞品动态详情',
    inputSchema: {
      type: 'object',
      properties: {
        newsId: { type: 'string', description: '动态ID，例如 news_001' },
      },
      required: ['newsId'],
    },
  },
  {
    name: 'list_major_signals',
    description: '查询今日重大信号预警列表',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_policies',
    description: '查询行业政策列表，支持按影响级别筛选',
    inputSchema: {
      type: 'object',
      properties: {
        impactLevel: { type: 'string', enum: ['high', 'medium', 'low'], description: '影响级别筛选' },
      },
    },
  },
  {
    name: 'get_policy',
    description: '根据政策ID查询政策详情及解读',
    inputSchema: {
      type: 'object',
      properties: {
        policyId: { type: 'string', description: '政策ID，例如 policy_001' },
      },
      required: ['policyId'],
    },
  },
  {
    name: 'list_bid_results',
    description: '查询中标结果记录，支持按竞品和项目类型筛选',
    inputSchema: {
      type: 'object',
      properties: {
        competitorId: { type: 'string', description: '竞品ID，可选' },
        projectType: { type: 'string', description: '项目类型，如 国网配网/南网，可选' },
      },
    },
  },
  {
    name: 'create_bid_package',
    description: '为指定投标项目生成竞品情报包',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: '项目ID' },
        projectName: { type: 'string', description: '项目名称' },
      },
      required: ['projectName'],
    },
  },
  {
    name: 'get_bid_package',
    description: '根据情报包ID查询投标情报包详情',
    inputSchema: {
      type: 'object',
      properties: {
        packageId: { type: 'string', description: '情报包ID，例如 pkg_xxx' },
      },
      required: ['packageId'],
    },
  },
  {
    name: 'generate_report',
    description: '生成竞品分析报告',
    inputSchema: {
      type: 'object',
      properties: {
        reportType: { 
          type: 'string', 
          enum: ['daily', 'weekly', 'monthly'],
          description: '报告类型：daily日报/weekly周报/monthly月报' 
        },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'get_competitor_profile',
    description: '获取竞品深度档案，包含动态、中标记录、SWOT分析',
    inputSchema: {
      type: 'object',
      properties: {
        competitorId: { type: 'string', description: '竞品ID' },
      },
      required: ['competitorId'],
    },
  },
  {
    name: 'get_alerts',
    description: '获取今日预警列表',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['high', 'medium', 'low'], description: '预警级别' },
      },
    },
  },
];

// 加载数据库
function loadDb() {
  const fs = require('fs');
  const dbPath = path.join(__dirname, '../db/db.json');
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load db:', e.message);
    return { competitors: [], competitorNews: [], policies: [], bidResults: [], bidPackages: [], reports: [], alerts: [] };
  }
}

function saveDb(db) {
  const fs = require('fs');
  const dbPath = path.join(__dirname, '../db/db.json');
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to save db:', e.message);
  }
}

// 数据访问函数
function listCompetitors() {
  const db = loadDb();
  return db.competitors || [];
}

function getCompetitor(args) {
  const db = loadDb();
  return db.competitors.find(c => c.id === args.competitorId) || null;
}

function listCompetitorNews(args = {}) {
  const db = loadDb();
  let news = db.competitorNews || [];
  
  if (args.competitorId) {
    news = news.filter(n => n.competitorId === args.competitorId);
  }
  
  if (args.date) {
    news = news.filter(n => n.publishedAt.startsWith(args.date));
  } else if (!args.competitorId) {
    // 默认返回今天的
    const today = new Date().toISOString().split('T')[0];
    news = news.filter(n => n.publishedAt.startsWith(today));
  }
  
  if (args.tag) {
    news = news.filter(n => n.tag === args.tag);
  }
  
  const limit = args.limit || 20;
  return news.slice(0, limit);
}

function getCompetitorNews(args) {
  const db = loadDb();
  return db.competitorNews.find(n => n.id === args.newsId) || null;
}

function listMajorSignals() {
  const db = loadDb();
  const today = new Date().toISOString().split('T')[0];
  return (db.competitorNews || [])
    .filter(n => n.tag === 'major' && n.publishedAt.startsWith(today))
    .slice(0, 10);
}

function listPolicies(args = {}) {
  const db = loadDb();
  let policies = db.policies || [];
  
  if (args.impactLevel) {
    policies = policies.filter(p => p.impactLevel === args.impactLevel);
  }
  
  return policies;
}

function getPolicy(args) {
  const db = loadDb();
  return db.policies.find(p => p.id === args.policyId) || null;
}

function listBidResults(args = {}) {
  const db = loadDb();
  let results = db.bidResults || [];
  
  if (args.competitorId) {
    results = results.filter(r => r.competitorId === args.competitorId);
  }
  
  if (args.projectType) {
    results = results.filter(r => r.projectType === args.projectType);
  }
  
  return results.slice(0, 50);
}

function createBidPackage(args) {
  const db = loadDb();
  const { projectId, projectName } = args;
  
  // 获取历史中标记录
  const bidHistory = (db.bidResults || [])
    .filter(r => r.projectType === '国网配网' || r.projectType === '南网')
    .slice(0, 20);
  
  // 获取竞品动态
  const competitorNews = (db.competitorNews || [])
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 20);
  
  // 计算市场份额
  const total = bidHistory.reduce((sum, r) => sum + (r.amount || 0), 0);
  const shareMap = {};
  bidHistory.forEach(r => {
    shareMap[r.competitorName] = (shareMap[r.competitorName] || 0) + (r.amount || 0);
  });
  const marketShare = Object.entries(shareMap).map(([name, amount]) => ({
    name,
    amount,
    share: total > 0 ? (amount / total * 100).toFixed(2) + '%' : '0%',
  }));
  
  const packageData = {
    id: `pkg_${Date.now()}`,
    createdAt: new Date().toISOString(),
    projectId,
    projectName,
    bidHistory,
    competitorNews,
    marketShare,
    recommendations: generateRecommendations(bidHistory, competitorNews),
  };
  
  db.bidPackages = db.bidPackages || [];
  db.bidPackages.unshift(packageData);
  saveDb(db);
  
  return packageData;
}

function getBidPackage(args) {
  const db = loadDb();
  return (db.bidPackages || []).find(p => p.id === args.packageId) || null;
}

function generateRecommendations(bidHistory, competitorNews) {
  const recommendations = [];
  
  // 思源电气份额分析
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
  
  // 派诺科技产能扩张
  if (competitorNews.some(n => n.competitorName === '派诺科技' && (n.title.includes('投产') || n.title.includes('基地')))) {
    recommendations.push({
      type: 'opportunity',
      title: '派诺科技武汉基地投产',
      content: '华中区域竞争压力上升，建议华中区域组加强客户拜访频率',
      priority: 'high',
    });
  }
  
  return recommendations;
}

function generateReport(args) {
  const db = loadDb();
  const { reportType } = args;
  
  const today = new Date().toISOString().split('T')[0];
  const todayNews = (db.competitorNews || []).filter(n => n.publishedAt.startsWith(today));
  const majorSignals = (db.competitorNews || []).filter(n => n.tag === 'major');
  
  const report = {
    id: `report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    reportType,
    period: reportType === 'daily' ? today : reportType === 'weekly' ? `${today.slice(0, 7)}-W` : today.slice(0, 7),
    summary: {
      totalNews: todayNews.length,
      majorSignals: majorSignals.length,
      topCompetitors: getTopActiveCompetitors(db.competitors, db.competitorNews),
      summary: `今日共采集${todayNews.length}条竞品动态，其中${majorSignals.length}条为重大信号`,
    },
    details: {
      competitorActivity: analyzeCompetitorActivity(db.competitors, db.competitorNews),
      marketShareChanges: analyzeMarketShareChanges(db.bidResults),
      swot: generateSWOT(),
    },
    recommendations: generateOverallRecommendations(db.competitorNews),
  };
  
  db.reports = db.reports || [];
  db.reports.unshift(report);
  saveDb(db);
  
  return report;
}

function getTopActiveCompetitors(competitors, news) {
  const activityMap = {};
  news.forEach(n => {
    activityMap[n.competitorId] = (activityMap[n.competitorId] || 0) + 1;
  });
  
  return (competitors || [])
    .map(c => ({
      id: c.id,
      name: c.name,
      activityScore: activityMap[c.id] || 0,
    }))
    .filter(c => c.activityScore > 0)
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 5);
}

function analyzeCompetitorActivity(competitors, news) {
  const activityMap = {};
  const recentNews = (news || []).filter(n => {
    const date = new Date(n.publishedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  });
  
  recentNews.forEach(n => {
    activityMap[n.competitorId] = (activityMap[n.competitorId] || 0) + 1;
  });
  
  return (competitors || []).map(c => ({
    ...c,
    recentActivity: activityMap[c.id] || 0,
    activityTrend: activityMap[c.id] > 5 ? 'high' : activityMap[c.id] > 2 ? 'medium' : 'low',
  }));
}

function analyzeMarketShareChanges(bidResults) {
  if (!bidResults || bidResults.length === 0) return [];
  
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

function generateSWOT() {
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

function generateOverallRecommendations(competitorNews) {
  const recs = [];
  
  if (competitorNews.some(n => n.competitorName === '派诺科技' && n.title.includes('投产'))) {
    recs.push({
      area: '华中区域',
      priority: 'high',
      recommendation: '派诺武汉基地投产后，需重点关注湖北、湖南、江西三省投标动向',
      action: '建议华中区域组加强客户拜访频率，本周内完成重点客户沟通',
    });
  }
  
  recs.push({
    area: '配网自动化',
    priority: 'high',
    recommendation: '思源电气份额持续上升，需调整报价策略',
    action: '在开关柜和互感器标段适当调整报价，同时强调整体方案优势',
  });
  
  return recs;
}

function getCompetitorProfile(args) {
  const db = loadDb();
  const competitor = db.competitors.find(c => c.id === args.competitorId);
  if (!competitor) return null;
  
  const recentNews = (db.competitorNews || [])
    .filter(n => n.competitorId === args.competitorId)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 20);
  
  const bidRecords = (db.bidResults || [])
    .filter(r => r.competitorId === args.competitorId)
    .slice(0, 10);
  
  return {
    ...competitor,
    recentNews,
    bidRecords,
    analysis: {
      activityScore: recentNews.length * 10,
      recentFocus: recentNews.slice(0, 3).map(n => ({ tag: n.tag, title: n.title })),
    },
  };
}

function getAlerts(args = {}) {
  const db = loadDb();
  const today = new Date().toISOString().split('T')[0];
  let alerts = [];
  
  // 从重大动态生成预警
  (db.competitorNews || [])
    .filter(n => n.tag === 'major' && n.publishedAt.startsWith(today))
    .forEach(n => {
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
  (db.policies || [])
    .filter(p => p.impactLevel === 'high')
    .forEach(p => {
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
  
  if (args.level) {
    alerts = alerts.filter(a => a.level === args.level);
  }
  
  return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// MCP Server 创建
function createMcpServer() {
  const mcpServer = new McpServer(SERVER_INFO, {
    capabilities: {
      logging: {},
    },
  });

  // 注册所有工具
  mcpServer.registerTool('list_competitors', {
    description: '查询竞品列表',
  }, async () => {
    return { content: [{ type: 'text', text: JSON.stringify(listCompetitors(), null, 2) }] };
  });

  mcpServer.registerTool('get_competitor', {
    description: '查询单个竞品详情',
    inputSchema: { competitorId: { type: 'string' } },
  }, async ({ competitorId }) => {
    const result = getCompetitor({ competitorId });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  mcpServer.registerTool('list_competitor_news', {
    description: '查询竞品动态列表',
  }, async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(listCompetitorNews(args), null, 2) }] };
  });

  mcpServer.registerTool('list_major_signals', {
    description: '查询今日重大信号',
  }, async () => {
    return { content: [{ type: 'text', text: JSON.stringify(listMajorSignals(), null, 2) }] };
  });

  mcpServer.registerTool('list_policies', {
    description: '查询行业政策列表',
  }, async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(listPolicies(args), null, 2) }] };
  });

  mcpServer.registerTool('list_bid_results', {
    description: '查询中标结果',
  }, async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(listBidResults(args), null, 2) }] };
  });

  mcpServer.registerTool('create_bid_package', {
    description: '生成投标情报包',
    inputSchema: { projectName: { type: 'string' } },
  }, async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(createBidPackage(args), null, 2) }] };
  });

  mcpServer.registerTool('generate_report', {
    description: '生成竞品分析报告',
    inputSchema: { reportType: { type: 'string', enum: ['daily', 'weekly', 'monthly'] } },
  }, async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(generateReport(args), null, 2) }] };
  });

  mcpServer.registerTool('get_competitor_profile', {
    description: '获取竞品深度档案',
    inputSchema: { competitorId: { type: 'string' } },
  }, async ({ competitorId }) => {
    return { content: [{ type: 'text', text: JSON.stringify(getCompetitorProfile({ competitorId }), null, 2) }] };
  });

  mcpServer.registerTool('get_alerts', {
    description: '获取预警列表',
  }, async (args) => {
    return { content: [{ type: 'text', text: JSON.stringify(getAlerts(args), null, 2) }] };
  });

  return mcpServer;
}

// HTTP Transport 处理
const sessions = new Map();

async function handleRequest(req, res) {
  const sessionId = req.headers['mcp-session-id'];
  
  try {
    let entry = sessionId ? sessions.get(sessionId) : undefined;
    let transport;

    if (entry) {
      transport = entry.transport;
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server, cleanedUp: false });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
        }
      };

      await server.connect(transport);
    } else {
      res.status(sessionId ? 404 : 400).json({ error: 'Bad request' });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error' });
    }
  }
}

// 路由注册
function registerMcpRoutes(server) {
  server.get('/mcp/health', (req, res) => {
    res.json({ status: 'ok', ...SERVER_INFO });
  });

  server.get('/mcp/tools', (req, res) => {
    res.json({ tools: TOOLS });
  });

  server.all('/mcp', async (req, res) => {
    await handleRequest(req, res);
  });

  server.get('/mcp/sse', async (req, res) => {
    const server = createMcpServer();
    const transport = new SSEServerTransport('/mcp/messages', res);
    await server.connect(transport);
  });

  server.post('/mcp/messages', async (req, res) => {
    res.status(501).json({ error: 'Not implemented' });
  });
}

module.exports = { registerMcpRoutes, createMcpServer };
