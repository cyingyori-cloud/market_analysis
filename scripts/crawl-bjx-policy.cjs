/**
 * 北极星电力网政策数据爬虫
 * 爬取 https://news.bjx.com.cn/zc/ 的所有政策文章
 */

const fs = require('fs');
const https = require('https');

const BASE_URL = 'https://news.bjx.com.cn/zc/';
const TOTAL_PAGES = 79;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

function fetchPage(pageNum) {
  return new Promise((resolve, reject) => {
    const url = pageNum === 1 ? BASE_URL : `${BASE_URL}index_${pageNum}.shtml`;
    console.log(`  爬取第 ${pageNum}/${TOTAL_PAGES} 页...`);
    
    https.get(url, { headers: HEADERS }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf-8');
        
        // 提取文章列表
        const articles = [];
        const regex = /<a[^>]+href="(https:\/\/news\.bjx\.com\.cn\/html\/\d+\/\d+\.shtml)"[^>]*>([^<]+)<\/a>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          articles.push({
            url: match[1],
            title: match[2].trim()
          });
        }
        
        // 提取日期
        const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
        const dates = [];
        while ((match = dateRegex.exec(html)) !== null) {
          dates.push(match[1]);
        }
        
        // 组合
        const result = articles.map((a, i) => ({
          ...a,
          publishedAt: dates[i] || dates[0] || new Date().toISOString().split('T')[0]
        }));
        
        resolve(result);
      });
    }).on('error', reject);
  });
}

async function crawlAll() {
  console.log('🚀 开始爬取北极星电力网政策数据...\n');
  
  const allPolicies = [];
  
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      const articles = await fetchPage(page);
      allPolicies.push(...articles);
      
      if (page % 10 === 0) {
        console.log(`\n  已爬取 ${page} 页，共 ${allPolicies.length} 条\n`);
      }
      
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`  第 ${page} 页失败: ${e.message}`);
    }
  }
  
  console.log(`\n\n✅ 共爬取 ${allPolicies.length} 条政策\n`);
  
  // 去重
  const seen = new Set();
  const unique = allPolicies.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
  
  // 转换格式
  const policies = unique.map((p, i) => ({
    id: `policy_${Date.now()}_${i}`,
    title: p.title,
    source: '北极星电力网',
    sourceUrl: 'https://news.bjx.com.cn/zc/',
    publishedAt: p.publishedAt,
    content: `【政策摘要】${p.title}\n\n来源：北极星电力网\n原文链接：${p.url}`,
    impactLevel: 'medium',
    impactAnalysis: '该政策对电力新能源行业有一定影响，请查阅原文了解详情。',
    affectedProducts: ['电力系统', '新能源设备'],
    opportunities: ['政策支持新能源发展'],
    threats: [],
    recommendation: '建议关注政策具体内容，评估对业务的影响。',
    industryRelated: true
  }));
  
  // 保存
  const output = {
    updatedAt: new Date().toISOString(),
    total: policies.length,
    policies: policies
  };
  
  fs.writeFileSync('public/policies-data.json', JSON.stringify(output, null, 2));
  console.log(`💾 已保存到 public/policies-data.json`);
  
  // 显示样例
  console.log('\n📋 样例（前10条）:\n');
  policies.slice(0, 10).forEach((p, i) => {
    console.log(`${i+1}. ${p.title}`);
    console.log(`   📅 ${p.publishedAt} | 🔗 ${p.url}\n`);
  });
  
  return policies;
}

crawlAll().catch(console.error);
