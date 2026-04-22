/**
 * 政策数据爬虫 v3 - 优化版，只保留真正的政策文件
 */

const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');
const fs = require('fs');

// 排除关键词
const EXCLUDE_KEYWORDS = [
  '备案', '版权', '声明', '隐私', '使用帮助', '联系我们',
  '京ICP备', '公网安备', '微博', '微信', '小程序', '客户端',
  '网站地图', '无障碍', 'RSS', '收藏本站', '设为首页',
  '建议分辨率', '最佳浏览', 'copyright', 'Copyright',
  '网站标识码', '标识码'
];

// 政策标题关键词（优先保留）
const POLICY_KEYWORDS = [
  '政策', '意见', '通知', '方案', '办法', '规定', '条例',
  '规划', '纲要', '决定', '批复', '函', '规范', '标准',
  '关于推进', '关于促进', '关于加强', '关于规范',
  '管理办法', '实施细则', '工作方案', '实施方案'
];

// 行业相关政策
const INDUSTRY_KEYWORDS = [
  '电力', '能源', '新能源', '光伏', '风电', '储能',
  '碳达峰', '碳中和', '绿色', '节能', '减排', '环保',
  '智能制造', '工业互联网', '数字化', '信息化',
  '建筑', '建材', '地产', '物业', '数据中心', 'IDC'
];

function isValidPolicy(title) {
  const t = title.toLowerCase();
  
  // 排除
  for (const kw of EXCLUDE_KEYWORDS) {
    if (t.includes(kw.toLowerCase())) return false;
  }
  
  // 必须包含政策类关键词
  const hasPolicyKeyword = POLICY_KEYWORDS.some(kw => t.includes(kw));
  if (!hasPolicyKeyword) return false;
  
  // 标题长度合适
  if (title.length < 10 || title.length > 100) return false;
  
  return true;
}

function getIndustryRelevance(title) {
  const t = title;
  for (const kw of INDUSTRY_KEYWORDS) {
    if (t.includes(kw)) return true;
  }
  return false;
}

// 数据源 - 针对政策公告页面
const SOURCES = {
  national: [
    { name: '国务院政策文件', url: 'http://www.gov.cn/zhengce/xxgk/xxgk.htm' },
    { name: '国家发改委政策发布', url: 'http://www.ndrc.gov.cn/xxgk/zcfb/' },
    { name: '国家能源局', url: 'http://www.nea.gov.cn/policy.htm' },
    { name: '生态环境部', url: 'http://www.mee.gov.cn/xxgk/xxgk10/' },
    { name: '工信部政策文件', url: 'https://www.miit.gov.cn/zwgk/zcwj/' },
    { name: '住建部政策', url: 'http://www.mohurd.gov.cn/xxgk/' },
    { name: '国家统计局', url: 'http://www.stats.gov.cn/tjgz/' },
  ],
  provincial: [
    { name: '山东省政策文件', url: 'http://www.shandong.gov.cn/col/col93788/' },
    { name: '北京市政策文件', url: 'http://www.beijing.gov.cn/zhengce/zcjd/' },
    { name: '广东省政策文件', url: 'http://www.gd.gov.cn/zwgk/wjk/zcwj/' },
    { name: '江苏省政策文件', url: 'http://www.jiangsu.gov.cn/col/col70907/' },
    { name: '浙江省政策文件', url: 'http://www.zj.gov.cn/col/col1521/' },
    { name: '河南省政策文件', url: 'https://www.henan.gov.cn/zwgk/zt/shengzheng/' },
    { name: '河北省政策文件', url: 'http://www.hebei.gov.cn/hebei/govpublish/' },
    { name: '湖北省政策文件', url: 'http://www.hubei.gov.cn/zwgk/zt/shengzheng/' },
  ],
  industry: [
    { name: '北极星电力网政策', url: 'https://www.bjx.com.cn/policy/' },
    { name: '中国能源网政策', url: 'https://www.china5e.com/news/policy' },
    { name: '中国节能服务网', url: 'http://www.emca.cn/policy/' },
    { name: '中国电力网', url: 'http://www.chinapower.com.cn/news/' },
  ]
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, { headers: HEADERS, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(res.headers.location, timeout));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
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
    
    const selectors = [
      'ul.newsList li a, ul.article-list li a, ul.news-list li a',
      'div.list-item a, div.news-item a',
      'table.list tr td a, table.zcwj tr td a',
      'div.zcwj_list a, div.policy-list a',
      '.main a, .content a, .container a',
      'div[class*="list"] a',
    ];
    
    for (const selector of selectors) {
      try {
        const links = doc.querySelectorAll(selector);
        if (links.length > 0) {
          links.forEach(link => {
            const href = link.href?.trim();
            let text = link.textContent?.trim().replace(/\s+/g, ' ');
            
            if (href && text) {
              // 清理文本
              text = text.replace(/^\d+[\.\)、\s]+/, '').trim();
              
              // 验证是否是有效政策
              if (isValidPolicy(text)) {
                // 提取日期
                let date = new Date().toISOString().split('T')[0];
                const dateMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
                if (dateMatch) {
                  date = dateMatch[1].replace(/\//g, '-');
                  text = text.replace(dateMatch[0], '').trim();
                }
                
                // 处理相对URL
                let fullUrl = href;
                if (!href.startsWith('http')) {
                  try {
                    fullUrl = new URL(href, sourceName.includes('http') ? sourceName : 'http://example.com').href;
                  } catch (e) {}
                }
                
                policies.push({
                  title: text,
                  url: fullUrl,
                  source: sourceName,
                  publishedAt: date,
                  industryRelated: getIndustryRelevance(text)
                });
              }
            }
          });
          
          if (policies.length > 0) break;
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return policies;
}

async function crawlPolicies() {
  console.log('🔍 政策数据爬虫 v3 - 智能过滤版\n');
  
  const allPolicies = [];
  let success = 0, fail = 0;
  
  for (const category of Object.keys(SOURCES)) {
    const catName = category === 'national' ? '🏛️ 国家政策' : category === 'provincial' ? '🏢 地方政府' : '🏭 行业网站';
    console.log(`\n${catName}\n`);
    
    for (const source of SOURCES[category]) {
      try {
        process.stdout.write(`  ${source.name}... `);
        const html = await fetchUrl(source.url);
        const policies = parsePolicyList(html, source.name);
        
        if (policies.length > 0) {
          console.log(`✓ ${policies.length}条`);
          allPolicies.push(...policies);
          success++;
        } else {
          console.log('○ 无数据');
        }
        
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        console.log(`✗ ${e.message}`);
        fail++;
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
  
  // 排序：行业相关优先，然后按日期
  unique.sort((a, b) => {
    if (b.industryRelated !== a.industryRelated) return b.industryRelated ? 1 : -1;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });
  
  console.log(`\n\n✅ 完成！成功: ${success}, 失败: ${fail}`);
  console.log(`📊 共 ${unique.length} 条政策\n`);
  
  // 保存
  const output = {
    updatedAt: new Date().toISOString(),
    total: unique.length,
    policies: unique
  };
  
  fs.writeFileSync('public/policies-data.json', JSON.stringify(output, null, 2));
  console.log('💾 已保存到 public/policies-data.json');
  
  return unique;
}

function showSample(policies) {
  console.log('\n📋 政策样例（前30条）:\n');
  const industry = policies.filter(p => p.industryRelated);
  const others = policies.filter(p => !p.industryRelated);
  
  console.log('【能源电力相关】\n');
  industry.slice(0, 15).forEach((p, i) => {
    console.log(`${i+1}. ${p.title}`);
    console.log(`   📅 ${p.publishedAt} | 🏛️ ${p.source}`);
    console.log(`   🔗 ${p.url.substring(0, 80)}...\n`);
  });
  
  console.log('\n【其他政策】\n');
  others.slice(0, 10).forEach((p, i) => {
    console.log(`${i+1}. ${p.title}`);
    console.log(`   📅 ${p.publishedAt} | 🏛️ ${p.source}\n`);
  });
}

crawlPolicies().then(showSample).catch(console.error);
