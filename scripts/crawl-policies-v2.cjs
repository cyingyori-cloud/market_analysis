/**
 * 政策数据爬虫 v2 - 针对各网站的政策公告子页面
 */

const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');
const fs = require('fs');

// 数据源配置 - 针对政策公告子页面
const SOURCES = {
  national: [
    { name: '国务院政策文件', url: 'http://www.gov.cn/zhengce/xxgk/xxgk.htm', policy: true },
    { name: '国务院最新政策', url: 'http://www.gov.cn/zhengce/xxgk/notice.htm', policy: true },
    { name: '国家发改委政策发布', url: 'http://www.ndrc.gov.cn/xxgk/zcfb/', policy: true },
    { name: '国家能源局通知公告', url: 'http://www.nea.gov.cn/policy.htm', policy: true },
    { name: '生态环境部政策', url: 'http://www.mee.gov.cn/xxgk/xxgk10/', policy: true },
    { name: '工信部政策文件', url: 'https://www.miit.gov.cn/zwgk/zcwj/', policy: true },
    { name: '住建部政策', url: 'http://www.mohurd.gov.cn/xxgk/', policy: true },
    { name: '国家统计局公告', url: 'http://www.stats.gov.cn/tjgz/', policy: true },
    { name: '市场监管总局政策', url: 'http://www.samr.gov.cn/zwgk/zcwj/', policy: true },
  ],
  provincial: [
    { name: '广东省政策文件', url: 'http://www.gd.gov.cn/zwgk/wjk/zcwj/', policy: true },
    { name: '江苏省政策文件', url: 'http://www.jiangsu.gov.cn/col/col70907/', policy: true },
    { name: '山东省政策文件', url: 'http://www.shandong.gov.cn/col/col93788/', policy: true },
    { name: '浙江省政策文件', url: 'http://www.zj.gov.cn/col/col1521/', policy: true },
    { name: '河南省政策文件', url: 'https://www.henan.gov.cn/zwgk/zt/shengzheng/', policy: true },
    { name: '四川省政策文件', url: 'http://www.sc.gov.cn/zt/sczt/shengzheng/', policy: true },
    { name: '上海市政策文件', url: 'http://www.shanghai.gov.cn/zwgk/zwgk.htm', policy: true },
    { name: '北京市政策文件', url: 'http://www.beijing.gov.cn/zhengce/zcjd/', policy: true },
    { name: '河北省政策文件', url: 'http://www.hebei.gov.cn/hebei/govpublish/', policy: true },
    { name: '湖北省政策文件', url: 'http://www.hubei.gov.cn/zwgk/zt/shengzheng/', policy: true },
    { name: '湖南省政策文件', url: 'http://www.hunan.gov.cn/zwgk/zt/shengzheng/', policy: true },
  ],
  industry: [
    { name: '北极星电力政策', url: 'https://www.bjx.com.cn/policy/', policy: true },
    { name: '中国能源网政策', url: 'http://www.china5e.com/news/policy', policy: true },
    { name: '中国节能服务网', url: 'http://www.emca.cn/policy/', policy: true },
    { name: '电力需求侧管理', url: 'http://www.dsm.gov.cn/xxgk/', policy: true },
    { name: '中国通信标准化协会', url: 'http://www.ccsa.org.cn/', policy: true },
  ]
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, { headers: HEADERS, timeout }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(res.headers.location, timeout));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parsePolicyList(html, sourceName) {
  const policies = [];
  try {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // 通用政策列表选择器
    const selectors = [
      // 通用列表
      'ul.newsList li a, ul.article-list li a, ul.news-list li a',
      'div.list-item a, div.news-item a, div.article-item a',
      // 表格形式
      'table tr td a, table.list tr td a',
      // 链接容器
      'div[class*="list"] a, div[class*="news"] a, div[class*="article"] a',
      // 政策专有
      'div.zcwj_list a, div.policy-list a, div.doc-list a',
      // 通用链接
      '.main a, .content a, .container a',
    ];
    
    for (const selector of selectors) {
      try {
        const links = doc.querySelectorAll(selector);
        if (links.length > 0) {
          links.forEach(link => {
            const href = link.href?.trim();
            const text = link.textContent?.trim().replace(/\s+/g, ' ');
            
            if (href && text && text.length > 8 && text.length < 200) {
              // 过滤非政策链接
              if (!href.match(/\.(jpg|png|gif|pdf|docx?|xlsx?|zip|rar)$/i) &&
                  !href.includes('javascript:') &&
                  !href.includes('login') &&
                  !href.includes('logout')) {
                
                // 获取时间（如果有）
                let date = new Date().toISOString().split('T')[0];
                const parent = link.closest('tr, li, div[class*="item"]');
                if (parent) {
                  const dateMatch = parent.textContent.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
                  if (dateMatch) {
                    date = dateMatch[1].replace(/\//g, '-');
                  }
                }
                
                policies.push({
                  title: text,
                  url: href.startsWith('http') ? href : (href.startsWith('/') ? new URL(href, sourceName).href : href),
                  source: sourceName,
                  publishedAt: date,
                  type: '政策文件'
                });
              }
            }
          });
          
          if (policies.length > 0) {
            console.log(`    选择器 ${selector} 匹配到 ${links.length} 个链接`);
            break;
          }
        }
      } catch (e) {}
    }
  } catch (e) {
    console.log(`    解析失败: ${e.message}`);
  }
  
  return policies;
}

async function crawlPolicies() {
  console.log('政策数据爬虫 v2\n');
  console.log('=' .repeat(60));
  
  const allPolicies = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const category of Object.keys(SOURCES)) {
    const catName = category === 'national' ? '国家政策' : category === 'provincial' ? '地方政府' : '行业网站';
    console.log(`\n【${catName}】`);
    
    for (const source of SOURCES[category]) {
      try {
        process.stdout.write(`  ${source.name}...`);
        const html = await fetchUrl(source.url);
        const policies = parsePolicyList(html, source.name);
        
        if (policies.length > 0) {
          console.log(` ✓ 找到 ${policies.length} 条`);
          allPolicies.push(...policies);
          successCount++;
        } else {
          console.log(' ○ 无数据');
        }
        
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        console.log(` ✗ ${e.message}`);
        failCount++;
      }
    }
  }
  
  // 去重
  const seen = new Set();
  const unique = allPolicies.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n完成！成功: ${successCount}, 失败: ${failCount}`);
  console.log(`共爬取 ${unique.length} 条唯一政策\n`);
  
  // 保存到文件
  const output = {
    updatedAt: new Date().toISOString(),
    total: unique.length,
    policies: unique.slice(0, 100) // 限制100条
  };
  
  fs.writeFileSync('public/policies-data.json', JSON.stringify(output, null, 2));
  console.log('已保存到 public/policies-data.json');
  
  return unique;
}

// 显示样例
function showSample(policies) {
  console.log('\n政策样例（前20条）:\n');
  policies.slice(0, 20).forEach((p, i) => {
    const title = p.title.length > 45 ? p.title.substring(0, 42) + '...' : p.title;
    console.log(`${String(i+1).padStart(2, '0')}. [${p.source}] ${p.publishedAt}`);
    console.log(`    ${title}\n`);
  });
}

crawlPolicies()
  .then(showSample)
  .catch(console.error);
