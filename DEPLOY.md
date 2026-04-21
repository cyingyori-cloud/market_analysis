# 4S竞品情报系统 - 自动化部署指南

## 架构概览

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Railway Cron Job   │────▶│  Python 爬虫脚本    │────▶│    MongoDB      │
│  (每天早8点触发)     │     │  (数据采集)          │     │    (存储)       │
└─────────────────────┘     └──────────────────────┘     └────────┬────────┘
                                                                    │
┌─────────────────────┐     ┌──────────────────────┐              │
│  Railway API Server │◀────│  Claude AI 分析     │◀─────────────┘
│  (Node.js Express)   │     │  (自动打标签/分析)   │
└──────────┬──────────┘     └──────────────────────┘
           │
           ▼
┌─────────────────────┐
│  GitHub Pages       │
│  (前端展示)          │
└─────────────────────┘
```

## 部署步骤

### 1. 创建 MongoDB Atlas 数据库

1. 注册 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 创建免费集群 (M0 Sandbox)
3. 创建数据库用户
4. 获取连接字符串:
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/4s-intelligence
   ```

### 2. 获取 Claude API Key

1. 注册 [Anthropic Console](https://console.anthropic.com/)
2. 创建 API Key
3. 注意: 有免费额度限制，生产环境建议设置用量限制

### 3. 部署后端到 Railway

1. 在 [Railway](https://railway.app/) 创建新项目
2. 连接 GitHub 仓库
3. 添加环境变量:
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/4s-intelligence
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   PORT=3001
   NODE_ENV=production
   ```
4. Railway 会自动检测并部署

### 4. 配置 Cron Job (Railway)

1. 在 Railway 项目中添加定时任务
2. 设置: `0 8 * * *` (每天早上8点)
3. 命令: `python3 server/crawler/scheduler.py`
4. 环境变量: `API_BASE=https://your-api.railway.app`

### 5. 更新前端配置

创建 `.env.production`:
```bash
VITE_USE_STATIC_DATA=false
VITE_API_BASE_URL=https://your-api.railway.app
```

### 6. 自动部署前端

GitHub Actions 会自动构建并部署到 GitHub Pages。

---

## 本地开发

```bash
# 克隆项目
git clone git@github.com:cyingyori-cloud/market_analysis.git
cd market_analysis

# 安装依赖
npm install

# 启动前端 (默认静态模式)
npm run dev

# 启动后端 (需要 MongoDB)
cp .env.example .env
# 编辑 .env 填入你的配置
npm run api

# 同时启动前后端
npm run api:dev
```

---

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/competitors` | GET | 获取竞品列表 |
| `/api/news` | GET | 获取竞品动态 (支持筛选) |
| `/api/scan` | POST | 触发扫描 |
| `/api/stats` | GET | 获取统计 |

### 参数说明

`GET /api/news`:
- `competitorId`: 竞品ID
- `tag`: 标签 (major/new/bid/strategy/personnel/report)
- `timeRange`: 时间范围 (today/week/month/all)
- `page`: 页码
- `limit`: 每页数量

---

## 竞品管理

系统启动时会自动初始化55个竞品。如需添加新的竞品:

```javascript
// 通过 API 添加
POST /api/competitors
{
  "name": "新竞品名称",
  "website": "https://example.com",
  "newsUrls": [
    { "name": "官网", "url": "https://example.com/news", "type": "website" }
  ]
}
```

---

## 数据流

1. **爬虫** 每天定时抓取竞品官网/公众号/新闻
2. **去重** 检查标题是否已存在
3. **AI分析** Claude 自动识别:
   - 标签分类
   - 重要性评分
   - 商机线索
   - 行动建议
4. **存储** MongoDB 保存原始数据+分析结果
5. **展示** 前端实时查询展示

---

## 费用估算

| 服务 | 方案 | 月费用 |
|------|------|--------|
| MongoDB Atlas | M0 免费集群 | $0 |
| Railway | Hobby 套餐 | $5 |
| Claude API | 根据用量 | $0-20 |
| **总计** | | **$5-25/月** |
