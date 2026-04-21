#!/usr/bin/env python3
"""
4S竞品情报系统 - 爬虫脚本
定时任务，每天早上8点运行
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json
import os

# API 基础地址
API_BASE = os.environ.get('API_BASE', 'http://localhost:3001')

# 竞品列表
COMPETITORS = [
    {'id': 'comp_001', 'name': '思源电气', 'url': 'https://www.sieyuan.com/news'},
    {'id': 'comp_002', 'name': '安科瑞', 'url': 'https://www.acrel.cn/news'},
    {'id': 'comp_003', 'name': '正泰电器', 'url': 'https://www.chint.com/news'},
    # ... 添加更多竞品
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

def scrape_competitor(comp: dict) -> list:
    """抓取单个竞品的新闻"""
    news_list = []
    try:
        resp = requests.get(comp['url'], headers=HEADERS, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 提取新闻列表（需要根据实际网站结构调整）
        for item in soup.select('.news-item, .article-list li'):
            title_elem = item.select_one('h3, .title, a')
            if title_elem:
                news_list.append({
                    'competitorId': comp['id'],
                    'competitorName': comp['name'],
                    'title': title_elem.get_text(strip=True),
                    'source': item.select_one('a').get('href', '') if item.select_one('a') else '',
                    'publishedAt': datetime.now().isoformat()
                })
    except Exception as e:
        print(f"抓取 {comp['name']} 失败: {e}")
    
    return news_list

def trigger_scan():
    """触发后端扫描"""
    try:
        resp = requests.post(f'{API_BASE}/api/scan', timeout=60)
        return resp.json()
    except Exception as e:
        print(f"触发扫描失败: {e}")
        return None

def main():
    print(f"[{datetime.now()}] 开始竞品情报扫描...")
    
    # 方法1: 直接抓取并保存
    all_news = []
    for comp in COMPETITORS:
        news = scrape_competitor(comp)
        all_news.extend(news)
        print(f"  {comp['name']}: {len(news)} 条")
    
    # 方法2: 触发后端处理
    result = trigger_scan()
    if result:
        print(f"扫描完成: {result.get('message', '')}")
    
    print(f"[{datetime.now()}] 扫描完成，共获取 {len(all_news)} 条原始数据")

if __name__ == '__main__':
    main()
