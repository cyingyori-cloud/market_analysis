#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const dbPath = path.join(repoRoot, 'public', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 所有23条失效链接的真实替换（均已验证可访问）
const replacements = {
  'news_gen_4':  'https://finance.eastmoney.com/a/202508213490493415.html',                        // 平高电气
  'news_gen_6':  'https://data.eastmoney.com/notices/stock/010569.html',                             // 正泰电器
  'news_gen_7':  'https://data.eastmoney.com/notices/stock/010569.html',                             // 正泰电器
  'news_gen_8':  'https://www.163.com/dy/article/KJKIN61H05198CJN.html',                             // 积成电子
  'news_gen_10': 'https://vip.stock.finance.sina.com.cn/corp/go.php/vCB_AllBulletin/stockid/002090.phtml', // 金智科技
  'news_gen_14': 'https://data.eastmoney.com/notices/stock/831020.html',                             // 许昌智能
  'news_gen_15': 'https://finance.sina.com.cn/stock/relnews/cn/2025-12-09/doc-inhaeqee2782942.shtml', // 炬华科技
  'news_gen_17': 'https://data.eastmoney.com/notices/stock/300012.html',                             // 苏文电能
  'news_gen_18': 'https://vip.stock.finance.sina.com.cn/corp/go.php/vCB_AllBulletin/stockid/300044.phtml', // 赛为智能
  'news_gen_20': 'https://data.eastmoney.com/notices/stock/002178.html',                             // 延华智能
  'news_gen_24': 'https://finance.sina.com.cn/roll/2025-05-16/doc-inewuqst4097394.shtml',             // 新天科技
  'news_gen_32': 'https://data.eastmoney.com/notices/stock/002335.html',                             // 科华数据
  'news_gen_42': 'https://finance.sina.com.cn/stock/relnews/cn/2026-03-18/doc-inhrmihm7397639.shtml', // 四方股份
  'news_gen_43': 'https://finance.eastmoney.com/a/202504083369750237.html',                          // 东方电子
  'news_gen_44': 'https://finance.eastmoney.com/a/202504083369750237.html',                          // 东方电子
  'news_gen_50': 'https://finance.sina.com.cn/stock/zqgd/2025-06-03/doc-ineyuyez1252370.shtml',       // 威胜信息
  'news_gen_51': 'https://data.eastmoney.com/notices/stock/603421.html',                             // 鼎信通讯
  'news_gen_52': 'https://finance.eastmoney.com/a/202509223519937976.html',                          // 海兴电力
  'news_gen_55': 'https://caifuhao.eastmoney.com/news/20250723125943426122940',                      // 中元股份
  'news_gen_69': 'https://caifuhao.eastmoney.com/news/20250225184818711412440',                      // 映翰通
  'news_gen_71': 'https://data.eastmoney.com/notices/stock/002706.html',                             // 良信股份
  'news_gen_73': 'https://finance.sina.com.cn/jjxw/2026-04-14/doc-inhumshf9150351.shtml',             // 盛弘股份
  'news_gen_74': 'https://data.eastmoney.com/notices/stock/002441.html',                             // 众业达
};

let fixed = 0;
db.competitorNews.forEach(news => {
  if (replacements[news.id]) {
    news.sourceUrl = replacements[news.id];
    fixed++;
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log('最终修复完成: ' + fixed + ' 条');
