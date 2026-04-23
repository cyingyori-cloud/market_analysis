#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const dbPath = path.join(repoRoot, 'public', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const news = db.competitorNews;
const results = [];

for (let i = 0; i < news.length; i++) {
  const item = news[i];
  const url = item.sourceUrl;
  try {
    const output = execSync(`curl -sL -o /dev/null -w "%{http_code}" --max-time 8 "${url}" 2>/dev/null || echo "FAIL"`, {encoding: 'utf8'}).trim();
    const code = parseInt(output);
    if (isNaN(code) || output === 'FAIL') {
      results.push({ id: item.id, name: item.competitorName, url, status: 'FAIL' });
    } else if (code >= 200 && code < 400) {
      results.push({ id: item.id, name: item.competitorName, url, status: code === 200 ? 'OK' : 'REDIRECT_' + code });
    } else {
      results.push({ id: item.id, name: item.competitorName, url, status: 'ERR_' + code });
    }
  } catch (e) {
    results.push({ id: item.id, name: item.competitorName, url, status: 'TIMEOUT' });
  }
  process.stdout.write(`[${i+1}/${news.length}] ${results[results.length-1].status} ${url.substring(0,60)}\n`);
}

const ok = results.filter(r => r.status === 'OK');
const redirect = results.filter(r => r.status.startsWith('REDIRECT'));
const fail = results.filter(r => r.status.startsWith('ERR') || r.status === 'FAIL' || r.status === 'TIMEOUT');

console.log('\n=== 结果汇总 ===');
console.log('OK: ' + ok.length + ' | REDIRECT: ' + redirect.length + ' | FAIL: ' + fail.length);

if (fail.length > 0) {
  console.log('\n--- 失败的链接 ---');
  fail.forEach(f => console.log('[' + f.id + '] ' + f.name + ' | ' + f.url));
}
if (redirect.length > 0) {
  console.log('\n--- 重定向的链接 ---');
  redirect.forEach(r => console.log('[' + r.id + '] ' + r.name + ' | ' + r.url));
}
