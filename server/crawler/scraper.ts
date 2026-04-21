import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScraperResult {
  title: string;
  content: string;
  source: string;
  sourceName: string;
  publishedAt: Date;
  url: string;
}

// 模拟爬虫 - 实际部署时需要配置真实的URL
const COMPETITOR_SOURCES = [
  { name: '思源电气', urls: ['https://www.sieyuan.com/news'] },
  { name: '安科瑞', urls: ['https://www.acrel.cn/news'] },
  { name: '正泰电器', urls: ['https://www.chint.com/news'] },
  { name: '德力西', urls: ['https://www.delixi.com/news'] },
];

export async function scrapeCompetitorNews(competitorId: string, competitorName: string, urls: string[]): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        }
      });

      const $ = cheerio.load(response.data);
      // 提取新闻列表 - 具体选择器需要根据目标网站调整
      $('.news-item, .article-item, .news-list li').each((_, elem) => {
        const title = $(elem).find('h3, .title, a').first().text().trim();
        const link = $(elem).find('a').attr('href');
        const date = $(elem).find('.date, .time').first().text().trim();
        
        if (title && link) {
          results.push({
            title,
            content: '',
            source: link.startsWith('http') ? link : new URL(link, url).href,
            sourceName: competitorName,
            publishedAt: parseDate(date) || new Date(),
            url: link
          });
        }
      });
    } catch (error) {
      console.log(`抓取 ${competitorName} 失败: ${url}`);
    }
  }

  return results;
}

// 日期解析
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // 尝试解析常见日期格式
  const patterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    /(\d{2})-(\d{1,2})-(\d{1,2})/
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const year = match[1].length === 2 ? 2000 + parseInt(match[1]) : parseInt(match[1]);
      return new Date(year, parseInt(match[2]) - 1, parseInt(match[3]));
    }
  }

  return null;
}

// 模拟生成测试数据（开发阶段使用）
export function generateMockNews(competitorId: string, competitorName: string): ScraperResult[] {
  const newsTemplates = [
    { title: `与XX集团签署战略合作协议`, tag: 'strategy' },
    { title: `成功中标XX项目`, tag: 'bid' },
    { title: `发布新一代智能配电产品`, tag: 'new' },
    { title: `2025年营收同比增长XX%`, tag: 'report' },
    { title: `任命新任CEO`, tag: 'personnel' },
  ];

  const randomTemplate = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
  
  return [{
    title: `${competitorName}${randomTemplate.title}`,
    content: `${competitorName}近日宣布，${randomTemplate.title}。这是公司在行业内的重要布局。`,
    source: `https://example.com/news/${Date.now()}`,
    sourceName: competitorName,
    publishedAt: new Date(),
    url: `https://example.com/news/${Date.now()}`
  }];
}
