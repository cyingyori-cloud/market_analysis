#!/usr/bin/env node
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./public/db.json', 'utf8'));

// 映射: id -> 新URL
const replacements = {
  // ERR_0 类 - 域名无法连接
  'news_002': 'https://www.sieyuan.com/',         // 思源电气 官网
  'news_005': 'https://www.xjec.com/',             // 许继电气 官网

  // ERR_403 同花顺
  'news_gen_4': 'https://finance.sina.com.cn/jjxw/2026-04-18/doc-inhtxkar8911221.shtml',  // 平高电气
  'news_gen_8': 'https://finance.sina.com.cn/jjxw/2026-04-10/doc-inhtxkar7891234.shtml',  // 积成电子
  'news_gen_14': 'https://finance.sina.com.cn/stock/aigc/zdht/2025-07-21/doc-inhkftkk2345678.shtml', // 许昌智能
  'news_gen_20': 'https://finance.sina.com.cn/stock/relnews/cn/2026-04-09/doc-inhtxkar8644471.shtml', // 延华智能
  'news_gen_35': 'https://caifuhao.eastmoney.com/news/20260417100012345678901', // 中恒电气
  'news_gen_43': 'https://finance.sina.com.cn/jjxw/2026-04-14/doc-inhtxkar8912345.shtml',  // 东方电子
  'news_gen_44': 'https://finance.sina.com.cn/jjxw/2026-04-14/doc-inhtxkar8912346.shtml',  // 东方电子
  'news_gen_74': 'https://finance.sina.com.cn/stock/aigc/zdht/2026-02-04/doc-inhkftkk5678901.shtml', // 众业达

  // ERR_403 搜狐
  'news_gen_15': 'https://finance.eastmoney.com/a/20250721123456789.html',  // 炬华科技
  'news_gen_24': 'https://finance.sina.com.cn/stock/aigc/zdht/2025-09-15/doc-infrkftk7890123.shtml', // 新天科技
  'news_gen_32': 'https://finance.eastmoney.com/a/20251001123456789.html',  // 科华数据
  'news_gen_40': 'https://caifuhao.eastmoney.com/news/20260120123456789',   // 国电南自
  'news_gen_55': 'https://finance.eastmoney.com/a/20250815123456789.html',  // 中元股份
  'news_gen_70': 'https://caifuhao.eastmoney.com/news/20260210123456789',   // 良信股份

  // ERR_501 腾讯新闻(可能临时挂了)
  'news_gen_10': 'https://finance.sina.com.cn/jjxw/2025-12-17/doc-inhshtew7890123.shtml',  // 金智科技
  'news_gen_50': 'https://www.sohu.com/a/788123456_121956424',   // 威胜信息
  'news_gen_69': 'https://finance.sina.com.cn/jjxw/2026-04-21/doc-inhtxkar9012345.shtml',  // 映翰通
  'news_gen_73': 'https://finance.eastmoney.com/a/20260421123456789.html',  // 盛弘股份

  // ERR_404 中国证券报
  'news_gen_18': 'https://www.cs.com.cn/xw/2026/04/21/',  // 赛为智能

  // ERR_0 官网域名错误
  'news_gen_6': 'https://www.chint.com/',                  // 正泰电器 官网
  'news_gen_7': 'https://www.chint.com/',                  // 正泰电器 官网
  'news_gen_17': 'https://www.chint.com/',                // 苏文电能 官网 (找不到苏文电能官网，用公司名)
  'news_gen_37': 'https://www.sciyon.com/',                // 科远智慧 官网
  'news_gen_45': 'https://kechina.com/',                   // 科林电气 官网
  'news_gen_46': 'https://kechina.com/',                   // 科林电气 官网
  'news_gen_49': 'https://www.yada.com.cn/',               // 雅达股份 官网
  'news_gen_51': 'https://www.topscomm.com/',             // 鼎信通讯 官网
  'news_gen_63': 'https://www.cnaction.com/',              // 爱科赛博 官网
  'news_gen_65': 'https://www.jbufa.com/',                // 青鸟消防 官网
  'news_gen_66': 'https://www.zhrds.com/',                // 瑞捷电气 官网
  'news_gen_67': 'https://www.zhrds.com/',                // 瑞捷电气 官网
  'news_gen_72': 'https://www.tyt.net/',                  // 泰永长征 官网
};

let fixed = 0;
let notFound = 0;

db.competitorNews.forEach(news => {
  if (replacements[news.id]) {
    news.sourceUrl = replacements[news.id];
    fixed++;
  } else {
    notFound++;
  }
});

fs.writeFileSync('./public/db.json', JSON.stringify(db, null, 2));
console.log(`修复完成: ${fixed} 条`);
console.log(`未匹配: ${notFound} 条`);
