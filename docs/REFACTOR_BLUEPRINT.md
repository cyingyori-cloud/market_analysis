# 4S竞品情报系统重构蓝图

## 1. 目标

把当前项目从“可演示的混合系统”重构为“可持续开发、可追踪、可运维的业务系统”。

本次重构优先解决 4 个问题：

1. 只保留一条主运行链路，不再同时维护两套后端。
2. 只保留一个主数据源，不再维护多份 `db.json` 副本。
3. 让扫描、分析、标签、分享、报告生成全部可落库、可追踪。
4. 让前端、API、采集、AI 分析、MCP 各自职责清晰。

## 2. 当前系统的主要问题

### 2.1 架构分叉

- `server/index.ts`：`Express + Mongo + AI 分析` 思路
- `server/index.cjs`：`json-server + db.json` 思路
- 两套服务都提供 `/api/*`，但数据来源、鉴权、写入逻辑不同

结果：

- 接口行为不可预测
- 新功能不知道该加在哪一套后端
- 部署和排障成本很高

### 2.2 数据源分叉

当前存在多份业务数据：

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/db.json`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/public/db.json`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/db/db.json`

结果：

- 修改一份数据后，其他副本不会自动同步
- 前端看到的数据和后端处理的数据可能不一致
- 后续做“已处理”“已推送”“人工修订”会越来越难

### 2.3 展示链路与采集链路脱节

- 前端大量依赖静态 JSON
- “立即扫描”会调用后端
- 但后端扫描结果不一定能进入前端当前正在使用的那份数据

结果：

- 用户点了“扫描”，但看不到稳定一致的结果
- 系统很难证明“这条数据何时采集、何时分析、何时入库”

### 2.4 业务动作未持久化

以下动作目前偏前端内存态：

- 重新打标签
- 分享渠道勾选
- 待跟进状态
- 预警确认

结果：

- 刷新后丢失
- 无法审计
- 无法接 CRM、日报、任务流转

### 2.5 配置和文档漂移

- 文档描述和代码实现不一致
- `.env.example` 中存在疑似敏感配置
- 一次性修数脚本和正式流程混在一起

结果：

- 新人接手成本高
- 存在安全风险
- 很难判断哪些脚本是“临时修补”，哪些是“正式链路”

## 3. 重构原则

### 3.1 单后端

保留 TypeScript 后端，统一走 `Express` 主服务。

建议保留并重构：

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/index.ts`

建议冻结并最终删除：

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/index.cjs`

### 3.2 单数据源

只保留一个主数据库，前端和后端都从它读写。

推荐目标：

- 生产：PostgreSQL
- 本地开发：同样使用 PostgreSQL，避免开发/生产行为不一致

说明：

- 当前数据天然是关系型模型，更适合 PostgreSQL
- 后续需要任务表、操作日志、推送记录、报表快照，关系型更稳
- Mongo 并非不能做，但这套业务并不依赖文档型数据库的优势

### 3.3 前端只消费 API

前端不再把 `public/db.json` 作为业务真源。

静态文件仅允许两种用途：

- 演示环境的数据快照
- 构建产物导出

### 3.4 扫描改成异步任务

“立即扫描”不应直接等待整套抓取完成。

应改为：

1. 前端提交扫描请求
2. API 创建 `crawl_job`
3. Worker 异步执行抓取、去重、分析、入库
4. 前端轮询任务状态或接收通知

### 3.5 一切业务动作可追踪

标签修订、推送、确认、人工备注都要落库，并带操作时间和操作人。

## 4. 目标架构

```text
前端 Web
  -> API 服务
      -> PostgreSQL
      -> Worker 任务执行器
          -> 爬虫采集
          -> AI 分析
          -> 数据清洗/去重
      -> MCP Server（只读/受控写）
```

### 4.1 模块拆分

建议按职责拆成 5 个模块：

1. Web：用户界面、筛选、编辑、查看报表
2. API：权限、接口、业务编排
3. Worker：抓取、AI 分析、生成报告、定时任务
4. Storage：数据库、迁移、种子数据、审计日志
5. Integration：MCP、CRM 推送、消息通知

## 5. 建议目录结构

```text
.
├── src/                     # 前端
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── modules/
│   │   │   ├── competitors/
│   │   │   ├── news/
│   │   │   ├── policies/
│   │   │   ├── bid-results/
│   │   │   ├── reports/
│   │   │   └── jobs/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── crawl/
│   │   │   ├── report/
│   │   │   └── push/
│   │   ├── repositories/
│   │   ├── middleware/
│   │   └── lib/
│   └── package.json
├── worker/
│   └── src/
│       ├── index.ts
│       ├── jobs/
│       └── schedulers/
├── shared/
│   └── types/
├── prisma/ or db/
│   ├── schema
│   ├── migrations
│   └── seeds
├── scripts/
│   ├── import/
│   ├── repair/
│   └── export/
└── docs/
```

说明：

- 当前前端 `src/` 可以保留
- 当前后端建议从单文件入口改成模块化目录
- `worker/` 可以与 API 分离，避免扫描任务阻塞接口
- `shared/types` 用来统一前后端实体类型和枚举

## 6. 核心数据模型建议

### 6.1 competitors

- `id`
- `name`
- `short_name`
- `website`
- `industry`
- `threat_level`
- `status`
- `last_scanned_at`
- `created_at`
- `updated_at`

### 6.2 competitor_news

- `id`
- `competitor_id`
- `title`
- `content`
- `summary`
- `source_name`
- `source_url`
- `published_at`
- `tag`
- `sentiment`
- `impact_analysis`
- `action_required`
- `status`
- `created_at`
- `updated_at`

### 6.3 news_analysis

- `id`
- `news_id`
- `provider`
- `model`
- `importance`
- `opportunity`
- `recommendation`
- `keywords`
- `raw_response`
- `created_at`

### 6.4 policies

- `id`
- `title`
- `content`
- `source_name`
- `source_url`
- `published_at`
- `impact_level`
- `impact_analysis`
- `recommendation`
- `status`
- `created_at`
- `updated_at`

### 6.5 bid_results

- `id`
- `competitor_id`
- `project_name`
- `project_type`
- `amount`
- `market_share`
- `share_change`
- `bid_date`
- `status`

### 6.6 crawl_jobs

- `id`
- `job_type`
- `trigger_source`
- `status`
- `started_at`
- `finished_at`
- `error_message`
- `payload`

### 6.7 operation_logs

- `id`
- `entity_type`
- `entity_id`
- `action`
- `operator`
- `before_data`
- `after_data`
- `created_at`

### 6.8 push_records

- `id`
- `news_id`
- `channel`
- `status`
- `pushed_at`
- `response_snapshot`

## 7. 目标数据流

### 7.1 竞品新闻链路

1. 用户或定时任务创建扫描任务
2. Worker 按竞品配置抓取目标站点
3. 系统按标题、URL、发布时间做去重
4. 对新增数据调用 AI 分析
5. 分析结果和原文一起入库
6. API 提供查询、筛选、编辑、推送能力
7. 前端只从 API 读取展示

### 7.2 政策链路

1. Worker 抓取政策源
2. 清洗标题和正文
3. 规则引擎做初筛
4. AI 产出影响级别、业务机会、建议
5. 入库并生成政策列表

### 7.3 人工修订链路

1. 用户修改标签或分析结论
2. API 校验请求
3. 更新主表
4. 写入 `operation_logs`
5. 前端刷新展示新结果

## 8. 模块职责建议

### 8.1 Web

职责：

- 展示竞品、政策、报告、预警
- 提供筛选、查看详情、修改标签、触发扫描
- 显示任务状态和操作结果

不再负责：

- 业务真数据存储
- 业务规则最终判断

### 8.2 API

职责：

- 提供 REST 接口
- 参数校验、权限控制
- 封装业务规则
- 创建后台任务

不再负责：

- 长时间阻塞式抓取
- 一次性修数脚本执行

### 8.3 Worker

职责：

- 抓取
- 清洗
- AI 分析
- 生成日报/周报
- 同步 CRM/消息渠道

### 8.4 MCP

职责：

- 给外部 Agent 暴露稳定工具接口
- 从 API 或数据库服务层取数

不建议继续：

- 直接读 `db.json`
- 自己维护一套独立业务逻辑

## 9. 文件保留/重构/删除建议

### 9.1 建议保留

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/src/`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/index.ts`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/ai/analyzer.ts`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/crawler/scraper.ts`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/mcp/intelligence-mcp.cjs`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/`

说明：

- 这些文件更多是“资产”和“能力积累”，值得重用
- 但需要迁移到新结构，不建议保持现状直接继续叠代码

### 9.2 建议重构

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/src/store/appStore.ts`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/src/pages/CompetitorMonitor.tsx`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/src/pages/PolicyAnalysis.tsx`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/DEPLOY.md`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/.env.example`

说明：

- `appStore.ts` 要拆分“状态管理”和“API 请求”
- 页面层要改成真正的读写接口，而不是本地假动作
- 文档和环境变量要与新架构保持一致

### 9.3 建议冻结后删除

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/index.cjs`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/db.json`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/public/db.json`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/server/db/db.json`

说明：

- 这几份内容的核心问题不是“格式不对”，而是“重复主数据源”

### 9.4 建议归档到 `scripts/repair/`

- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/repair/fix_urls.cjs`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/repair/fix2.cjs`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/repair/fix3.cjs`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/repair/check_urls.cjs`
- `/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/repair/update_real_news.cjs`

说明：

- 这些脚本是一次性修复资产，不应继续和正式业务链路混放

## 10. 分阶段实施方案

### Phase 0：止血

目标：先稳定住边界，不再继续扩散技术债。

任务：

1. 冻结 `server/index.cjs`，不再往里面加功能
2. 清理 `.env.example` 中的敏感信息
3. 补文档，明确“当前唯一主后端”
4. 把一次性修数脚本归档

交付标准：

- 团队内对“从哪里开发”没有歧义

### Phase 1：统一数据源

目标：建立唯一主数据库。

任务：

1. 设计 PostgreSQL 表结构
2. 写迁移脚本，把三份 JSON 合并入库
3. 新增种子数据导入脚本
4. 停止前端直接读 `public/db.json`

交付标准：

- 前后端读写都基于数据库

### Phase 2：统一 API

目标：API 成为唯一业务入口。

任务：

1. 拆分 `server/index.ts`
2. 建立 `competitors/news/policies/reports/jobs` 模块
3. 为标签编辑、分享、预警确认补写接口
4. 前端调用真实写接口

交付标准：

- 页面上的所有关键操作均可落库

### Phase 3：引入 Worker

目标：把耗时任务从 API 中剥离。

任务：

1. 新建 `worker/`
2. 把抓取、AI 分析、报告生成迁移到 Worker
3. API 只负责创建任务和查询任务状态
4. 支持定时扫描

交付标准：

- 扫描和分析不阻塞 API

### Phase 4：整合 MCP 与外部推送

目标：让集成能力建立在稳定主链路之上。

任务：

1. MCP 改成只读 API 服务层
2. 推送 CRM、飞书、钉钉改成标准化 `push_records`
3. 增加审计日志和失败重试

交付标准：

- 外部集成不再直接依赖文件

## 11. 建议的首批改造清单

如果按最小风险启动，建议第一批只做以下 6 件事：

1. 明确 `server/index.ts` 为唯一主后端
2. 清理 `.env.example` 的敏感内容
3. 建立数据库 schema 和导入脚本
4. 把 `appStore` 改成通过 API 服务层访问数据
5. 给“重新打标签”“分享”补后端写接口
6. 给“立即扫描”补任务状态接口

## 12. 暂不建议现在做的事

- 不建议先做 UI 大改版
- 不建议先接更多采集源
- 不建议先扩展更多页面
- 不建议继续在 `db.json` 上做人工修修补补
- 不建议在后端未收敛前先做复杂 MCP 工具集

原因：

- 当前瓶颈不是功能不够，而是主链路不稳

## 13. 成功标准

重构完成后，系统至少要满足以下条件：

1. 开发者只需要启动一套后端
2. 所有业务数据只有一个真源
3. 前端所有关键操作刷新后不丢失
4. 扫描、分析、推送都有任务状态和日志
5. 新增一个功能时，团队知道应该改哪一层

## 14. 一句话结论

这套系统最合适的重构方向不是“继续补脚本”，而是尽快收敛为：

`React 前端 + TypeScript API + Worker + PostgreSQL + 可追踪任务流`

先把主链路拉直，再继续加爬虫、AI 和 CRM 集成，后面每一步都会轻很多。
