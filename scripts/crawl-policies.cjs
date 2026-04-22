/**
 * 政策数据爬虫 - 从国家官网和地方政府网站爬取政策公告
 * 数据源：08 市场情报 国家官网及同行信息汇总表.xlsx
 */

const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');

// 数据源配置
const SOURCES = {
  national: [
    { name: '中国人民政府网', url: 'http://www.gov.cn/index.htm', type: 'gov' },
    { name: '国家发展和改革委员会', url: 'http://www.ndrc.gov.cn/', type: 'gov' },
    { name: '国家能源局', url: 'http://www.nea.gov.cn/', type: 'gov' },
    { name: '生态环境部', url: 'http://www.mee.gov.cn/', type: 'gov' },
    { name: '工业和信息化部', url: 'http://www.miit.gov.cn/', type: 'gov' },
    { name: '住房和城乡建设部', url: 'http://www.mohurd.gov.cn/', type: 'gov' },
    { name: '国家统计局', url: 'http://www.stats.gov.cn/', type: 'gov' },
    { name: '国家市场监督管理总局', url: 'http://www.samr.gov.cn/', type: 'gov' },
    { name: '国网新能源云', url: 'http://sgnec.esgcc.com.cn/', type: 'energy' },
  ],
  provincial: [
    { name: '广东省人民政府', url: 'http://www.gd.gov.cn/', type: 'provincial' },
    { name: '江苏省人民政府', url: 'http://www.jiangsu.gov.cn/', type: 'provincial' },
    { name: '山东省人民政府', url: 'http://www.shandong.gov.cn/', type: 'provincial' },
    { name: '浙江省人民政府', url: 'http://www.zj.gov.cn/', type: 'provincial' },
    { name: '河南省人民政府', url: 'https://www.henan.gov.cn/', type: 'provincial' },
    { name: '四川省人民政府', url: 'http://www.sc.gov.cn/', type: 'provincial' },
    { name: '上海市人民政府', url: 'http://www.shanghai.gov.cn/', type: 'provincial' },
    { name: '北京市人民政府', url: 'http://www.beijing.gov.cn/', type: 'provincial' },
  ],
  industry: [
    { name: '北极星电力网', url: 'http://www.bjx.com.cn/', type: 'industry' },
    { name: '能源观察网', url: 'http://www.chinaero.com.cn/', type: 'industry' },
    { name: '中国节能服务网', url: 'http://www.emca.cn/', type: 'industry' },
  ]
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

function fetchUrl(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: HEADERS,
      timeout,
    };
    
    client.get(url, options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf-8');
        resolve(html);
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

function parsePoliciesFromHTML(html, sourceName) {
  const policies = [];
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // 尝试多种选择器匹配政策链接
    const selectors = [
      'a[href*="policy"], a[href*="policy"], a[href*="zcfg"], a[href*="news"]',
      '.policy-list a, .news-list a, .article-list a',
      '[class*="policy"] a, [class*="news"] a, [class*="article"] a',
      '.zxbd a, .tzgg a, .ggsd a',
    ];
    
    for (const selector of selectors) {
      try {
        const links = doc.querySelectorAll(selector);
        links.forEach(link => {
          const href = link.href;
          const text = link.textContent?.trim();
          
          if (href && text && text.length > 5 && text.length < 100) {
            // 过滤掉非政策相关的链接
            if (!href.match(/\.(jpg|png|gif|pdf|doc|xls)/i) && 
                !href.includes('javascript:') &&
                text.length > 10) {
              policies.push({
                title: text,
                url: href,
                source: sourceName,
                publishedAt: new Date().toISOString(),
              });
            }
          }
        });
        
        if (policies.length > 0) break;
      } catch (e) {}
    }
  } catch (e) {
    console.log(`解析 ${sourceName} HTML失败: ${e.message}`);
  }
  
  return policies;
}

async function crawlPolicies() {
  console.log('开始爬取政策数据...\n');
  
  const allPolicies = [];
  
  for (const category of Object.keys(SOURCES)) {
    console.log(`\n=== 爬取 ${category === 'national' ? '国家政策' : category === 'provincial' ? '地方政府' : '行业网站'} ===`);
    
    for (const source of SOURCES[category]) {
      try {
        console.log(`  正在爬取: ${source.name}...`);
        const html = await fetchUrl(source.url);
        const policies = parsePoliciesFromHTML(html, source.name);
        
        console.log(`    找到 ${policies.length} 条`);
        allPolicies.push(...policies);
        
        // 避免请求过快
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.log(`    失败: ${e.message}`);
      }
    }
  }
  
  // 去重
  const uniquePolicies = [];
  const seenUrls = new Set();
  for (const p of allPolicies) {
    if (!seenUrls.has(p.url)) {
      seenUrls.add(p.url);
      uniquePolicies.push(p);
    }
  }
  
  console.log(`\n\n共爬取 ${uniquePolicies.length} 条唯一政策`);
  
  return uniquePolicies;
}

// 运行
crawlPolicies().then(policies => {
  console.log('\n前10条样例:');
  policies.slice(0, 10).forEach((p, i) => {
    console.log(`${i+1}. [${p.source}] ${p.title.substring(0, 50)}`);
  });
}).catch(console.error);
