import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { News } from './models/News';
import { Competitor } from './models/Competitor';
import { analyzeNews } from './ai/analyzer';
import { generateMockNews } from './crawler/scraper';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// 读取本地 db.json 作为数据源
const dbData = JSON.parse(readFileSync(join(__dirname, 'db', 'db.json'), 'utf-8'));

// 连接MongoDB（备用）
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/4s-intelligence';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ============ API 路由 ============

// 获取竞争对手列表（从 db.json）
app.get('/api/competitors', async (req, res) => {
  try {
    const competitors = dbData.competitors;
    res.json(competitors.map((c: any) => ({ ...c, id: c.id || c._id })));
  } catch (error) {
    res.status(500).json({ error: '获取竞争对手列表失败' });
  }
});

// 获取竞争对手动态（从 db.json）
app.get('/api/news', async (req, res) => {
  try {
    const { competitorId, tag, timeRange, page = 1, limit = 50 } = req.query;
    let news = [...dbData.competitorNews];

    if (competitorId && competitorId !== 'all') {
      news = news.filter((n: any) => n.competitorId === competitorId);
    }
    if (tag && tag !== 'all') {
      news = news.filter((n: any) => n.tag === tag);
    }
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      const start = new Date();
      switch (timeRange) {
        case 'today': start.setHours(0, 0, 0, 0); break;
        case 'week': start.setDate(now.getDate() - 7); break;
        case 'month': start.setDate(now.getDate() - 30); break;
      }
      news = news.filter((n: any) => new Date(n.publishedAt) >= start);
    }

    news.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const total = news.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const paged = news.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      data: paged.map((n: any) => ({ ...n, id: n.id || n._id })),
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('获取竞争对手动态失败:', error);
    res.status(500).json({ error: '获取竞争对手动态失败' });
  }
});

// 获取政策列表
app.get('/api/policies', async (req, res) => {
  try {
    const { impactLevel } = req.query;
    let policies = [...(dbData.policies || [])];
    
    if (impactLevel && impactLevel !== 'all') {
      policies = policies.filter((p: any) => p.impactLevel === impactLevel);
    }
    
    res.json(policies);
  } catch (error) {
    console.error('获取政策列表失败:', error);
    res.status(500).json({ error: '获取政策列表失败' });
  }
});

// 别名：competitor-news -> news
app.get('/api/competitor-news', async (req, res) => {
  try {
    const { competitorId, tag, date, page = 1, limit = 50 } = req.query;
    
    const filter: any = {};
    
    if (competitorId && competitorId !== 'all') {
      filter.competitorId = competitorId;
    }
    
    if (tag && tag !== 'all') {
      filter.tag = tag;
    }
    
    if (date && date !== 'all') {
      const now = new Date();
      const start = new Date();
      
      switch (date) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setDate(now.getDate() - 30);
          break;
      }
      
      filter.publishedAt = { $gte: start };
    }
    
    const news = await News.find(filter)
      .sort({ publishedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    
    const total = await News.countDocuments(filter);
    
    res.json(news);
  } catch (error) {
    console.error('获取竞品动态失败:', error);
    res.status(500).json({ error: '获取竞品动态失败' });
  }
});

// 触发扫描（手动）- 别名
app.post('/api/crawler/run', async (req, res) => {
  req.url = '/api/scan';
});

// /api/competitor-news 兼容路由
app.get('/api/competitor-news', async (req, res) => {
  req.url = '/api/news';
  const originalSend = res.send.bind(res);
  (res as any).send = function(body: any) {
    if (body && body.data) {
      body = {
        data: body.data.map((n: any) => ({ ...n, id: n.id || n._id })),
        total: body.total,
        page: body.page,
        limit: body.limit
      };
    }
    return originalSend(body);
  };
});

// 触发扫描（手动）
app.post('/api/scan', async (req, res) => {
  try {
    const competitors = await Competitor.find();
    const results = [];
    
    for (const competitor of competitors) {
      // 生成模拟数据（实际部署时替换为真实爬虫）
      const mockNews = generateMockNews(competitor._id.toString(), competitor.name);
      
      for (const newsData of mockNews) {
        // 检查是否已存在（根据标题去重）
        const exists = await News.findOne({ 
          title: newsData.title,
          competitorId: competitor._id.toString()
        });
        
        if (!exists) {
          // AI分析
          const analysis = await analyzeNews(
            newsData.title,
            newsData.content,
            competitor.name
          );
          
          // 保存
          const news = await News.create({
            competitorId: competitor._id.toString(),
            competitorName: competitor.name,
            title: newsData.title,
            content: newsData.content,
            source: newsData.source,
            sourceName: newsData.sourceName,
            publishedAt: newsData.publishedAt,
            tag: analysis.tag,
            summary: analysis.summary,
            aiAnalysis: {
              importance: analysis.importance,
              opportunity: analysis.opportunity,
              recommendation: analysis.recommendation,
              keywords: analysis.keywords
            },
            status: analysis.importance >= 4 ? 'draft' : 'published'
          });
          
          results.push(news);
        }
      }
      
      // 更新最后扫描时间
      await Competitor.updateOne(
        { _id: competitor._id },
        { lastScannedAt: new Date() }
      );
    }
    
    res.json({
      success: true,
      message: `扫描完成，新增 ${results.length} 条动态`,
      data: results
    });
  } catch (error) {
    console.error('扫描失败:', error);
    res.status(500).json({ error: '扫描失败' });
  }
});

// 获取统计
app.get('/api/stats', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const [todayCount, weekCount, majorCount, draftCount, competitorCount] = await Promise.all([
      News.countDocuments({ publishedAt: { $gte: today } }),
      News.countDocuments({ publishedAt: { $gte: weekAgo } }),
      News.countDocuments({ tag: 'major' }),
      News.countDocuments({ status: 'draft' }),
      Competitor.countDocuments()
    ]);
    
    res.json({
      today: todayCount,
      week: weekCount,
      major: majorCount,
      draft: draftCount,
      competitors: competitorCount
    });
  } catch (error) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ============ 初始化竞品数据 ============
async function initCompetitors() {
  const count = await Competitor.countDocuments();
  if (count > 0) return;
  
  const competitors = [
    { name: '思源电气', industry: '电力设备', website: 'https://www.sieyuan.com' },
    { name: '安科瑞', industry: '电力设备', website: 'https://www.acrel.cn' },
    { name: '正泰电器', industry: '电力设备', website: 'https://www.chint.com' },
    { name: '德力西', industry: '电力设备', website: 'https://www.delixi.com' },
    { name: '施耐德电气', industry: '电力设备', website: 'https://www.schneider-electric.com' },
    { name: 'ABB', industry: '电力设备', website: 'https://new.abb.com' },
    { name: '西门子', industry: '电力设备', website: 'https://www.siemens.com' },
    { name: '良信电器', industry: '电力设备', website: 'https://www.liangxin.com.cn' },
    { name: '人民电器', industry: '电力设备', website: 'https://www.rddq.com' },
    { name: '天正电气', industry: '电力设备', website: 'https://www.tengreen.com' },
    // ... 从 db.json 读取完整的55个竞品
  ];
  
  await Competitor.insertMany(competitors);
  console.log(`初始化了 ${competitors.length} 个竞品`);
}

// 启动
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`4S Intelligence API running on port ${PORT}`);
  initCompetitors();
});
