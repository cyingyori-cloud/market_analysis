import express from 'express';
import cors from 'cors';
import { analyzeNews } from './ai/analyzer';
import { generateMockNews } from './crawler/scraper';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isPostgresReady, queryPostgres } from './db/postgres';

type FileDb = {
  competitors?: any[];
  competitorNews?: any[];
  policies?: any[];
  bidResults?: any[];
  alerts?: any[];
};

type NewsQueryParams = {
  competitorId?: string;
  tag?: string;
  timeRange?: string;
  date?: string;
  page?: number;
  limit?: number;
};

type CompetitorNewsUpdateInput = {
  tag?: string;
  pushedTo?: string[];
  actionRequired?: boolean;
  status?: string;
};

type ScanJobRecord = {
  id: string;
  jobType: string;
  triggerSource: string;
  status: string;
  payload: Record<string, unknown>;
  resultSnapshot: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type PostgresCompetitorRow = {
  id: string;
  name: string;
  short_name: string | null;
  stock: string | null;
  bu: unknown[] | null;
  listing: boolean;
  market_cap: string | null;
  customer_group: unknown[] | null;
  product_line: unknown[] | null;
  main_products: unknown[] | null;
  core_strengths: unknown[] | null;
  market_share: Record<string, unknown> | null;
  recent_action: string | null;
  threat_level: string | null;
  status: string | null;
};

type PostgresNewsRow = {
  id: string;
  competitor_id: string | null;
  competitor_name: string;
  title: string;
  content: string | null;
  summary: string | null;
  tag: string | null;
  tag_label: string | null;
  impact_analysis: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | Date | null;
  sentiment: string | null;
  action_required: boolean;
  pushed_to: unknown[] | null;
  status: string | null;
};

type PostgresPolicyRow = {
  id: string;
  title: string;
  content: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | Date | null;
  impact_level: string | null;
  affected_products: unknown[] | null;
  opportunities: unknown[] | null;
  threats: unknown[] | null;
  impact_analysis: string | null;
  recommendation: string | null;
  status: string | null;
};

type PostgresCrawlJobRow = {
  id: number | string;
  job_type: string;
  trigger_source: string;
  status: string;
  payload: Record<string, unknown> | null;
  result_snapshot: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string | Date;
  started_at: string | Date | null;
  finished_at: string | Date | null;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE_DB_PATH = join(__dirname, 'db', 'db.json');
const PUBLIC_POLICIES_PATH = join(__dirname, '..', 'public', 'policies-data.json');
const app = express();
app.use(cors());
app.use(express.json());

const NEWS_TAG_LABELS: Record<string, string> = {
  major: '重大信号',
  new: '新产品',
  bid: '中标喜报',
  strategy: '战略合作',
  personnel: '人员变动',
  report: '业绩报告',
  other: '其他',
};

const NEWS_TAGS = new Set(Object.keys(NEWS_TAG_LABELS));
const NEWS_STATUSES = new Set(['draft', 'published']);
const scanJobs = new Map<string, ScanJobRecord>();

function loadFileDb(): FileDb {
  return JSON.parse(readFileSync(FILE_DB_PATH, 'utf-8'));
}

function saveFileDb(dbData: FileDb) {
  writeFileSync(FILE_DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function parsePage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function getTimeRangeStart(timeRange?: string) {
  if (!timeRange || timeRange === 'all') return null;

  const now = new Date();
  const start = new Date();
  switch (timeRange) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return start;
    case 'week':
      start.setDate(now.getDate() - 7);
      return start;
    case 'month':
      start.setDate(now.getDate() - 30);
      return start;
    default:
      return null;
  }
}

function normalizeCompetitorRow(row: PostgresCompetitorRow) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name ?? '',
    stock: row.stock ?? '',
    bu: row.bu ?? [],
    listing: row.listing,
    marketCap: row.market_cap ?? '',
    customerGroup: row.customer_group ?? [],
    productLine: row.product_line ?? [],
    mainProducts: row.main_products ?? [],
    coreStrengths: row.core_strengths ?? [],
    marketShare: row.market_share ?? {},
    recentAction: row.recent_action ?? '',
    threatLevel: row.threat_level ?? 'medium',
    status: row.status ?? 'active',
  };
}

function normalizeFileNewsItem(item: any) {
  return {
    ...item,
    id: item.id || item._id,
    tagLabel: item.tagLabel || NEWS_TAG_LABELS[item.tag] || item.tagLabel || '',
    pushedTo: item.pushedTo || [],
    actionRequired: item.actionRequired ?? (item.status === 'draft'),
  };
}

function normalizeNewsRow(row: PostgresNewsRow) {
  return {
    id: row.id,
    competitorId: row.competitor_id ?? '',
    competitorName: row.competitor_name,
    title: row.title,
    content: row.content ?? '',
    summary: row.summary ?? '',
    tag: row.tag ?? 'other',
    tagLabel: row.tag_label ?? '',
    impactAnalysis: row.impact_analysis ?? '',
    source: row.source_name ?? '',
    sourceUrl: row.source_url ?? '',
    publishedAt: toIsoString(row.published_at) ?? '',
    sentiment: row.sentiment ?? 'neutral',
    actionRequired: row.action_required,
    pushedTo: row.pushed_to ?? [],
    status: row.status ?? 'published',
  };
}

function normalizePolicyRow(row: PostgresPolicyRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? '',
    source: row.source_name ?? '',
    sourceUrl: row.source_url ?? '',
    publishedAt: toIsoString(row.published_at) ?? '',
    impactLevel: row.impact_level ?? 'medium',
    affectedProducts: row.affected_products ?? [],
    opportunities: row.opportunities ?? [],
    threats: row.threats ?? [],
    impactAnalysis: row.impact_analysis ?? '',
    recommendation: row.recommendation ?? '',
    status: row.status ?? 'active',
  };
}

function normalizePolicySnapshotItem(item: any) {
  return {
    id: item.id,
    title: item.title,
    content: item.content ?? '',
    source: item.source ?? '',
    sourceUrl: item.sourceUrl ?? '',
    publishedAt: item.publishedAt ?? new Date().toISOString(),
    impactLevel: item.impactLevel ?? 'medium',
    affectedProducts: item.affectedProducts ?? [],
    opportunities: item.opportunities ?? [],
    threats: item.threats ?? [],
    impactAnalysis: item.impactAnalysis ?? '',
    recommendation: item.recommendation ?? '',
    status: item.status ?? 'active',
  };
}

function normalizeScanJobRow(row: PostgresCrawlJobRow): ScanJobRecord {
  return {
    id: String(row.id),
    jobType: row.job_type,
    triggerSource: row.trigger_source,
    status: row.status,
    payload: row.payload ?? {},
    resultSnapshot: row.result_snapshot ?? {},
    errorMessage: row.error_message,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    startedAt: toIsoString(row.started_at),
    finishedAt: toIsoString(row.finished_at),
  };
}

function nullIfUndefined<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

function nextGeneratedId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function filterNewsItems(items: any[], params: NewsQueryParams) {
  let news = [...items];

  if (params.competitorId && params.competitorId !== 'all') {
    news = news.filter((n: any) => n.competitorId === params.competitorId);
  }
  if (params.tag && params.tag !== 'all') {
    news = news.filter((n: any) => n.tag === params.tag);
  }
  if (params.date) {
    news = news.filter((n: any) => String(n.publishedAt).startsWith(params.date!));
  }

  const start = getTimeRangeStart(params.timeRange);
  if (start) {
    news = news.filter((n: any) => new Date(n.publishedAt) >= start);
  }

  news.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return news;
}

async function fetchCompetitorsData() {
  const rows = await queryPostgres<PostgresCompetitorRow>(
    `SELECT
      id,
      name,
      short_name,
      stock,
      bu,
      listing,
      market_cap,
      customer_group,
      product_line,
      main_products,
      core_strengths,
      market_share,
      recent_action,
      threat_level,
      status
    FROM competitors
    ORDER BY name ASC`,
  );

  if (rows) {
    return rows.map(normalizeCompetitorRow);
  }

  const dbData = loadFileDb();
  const competitors = dbData.competitors || [];
  return competitors.map((c: any) => ({ ...c, id: c.id || c._id }));
}

async function fetchNewsData(params: NewsQueryParams) {
  const page = parsePage(params.page, 1);
  const limit = parsePage(params.limit, 50);
  const offset = (page - 1) * limit;

  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.competitorId && params.competitorId !== 'all') {
    values.push(params.competitorId);
    filters.push(`competitor_id = $${values.length}`);
  }
  if (params.tag && params.tag !== 'all') {
    values.push(params.tag);
    filters.push(`tag = $${values.length}`);
  }
  if (params.date) {
    values.push(params.date);
    filters.push(`published_at >= $${values.length}::date AND published_at < ($${values.length}::date + INTERVAL '1 day')`);
  }

  const start = getTimeRangeStart(params.timeRange);
  if (start) {
    values.push(start.toISOString());
    filters.push(`published_at >= $${values.length}::timestamptz`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countRows = await queryPostgres<{ total: number | string }>(
    `SELECT COUNT(*)::int AS total
     FROM competitor_news
     ${whereClause}`,
    values,
  );

  const dataRows = await queryPostgres<PostgresNewsRow>(
    `SELECT
      id,
      competitor_id,
      competitor_name,
      title,
      content,
      summary,
      tag,
      tag_label,
      impact_analysis,
      source_name,
      source_url,
      published_at,
      sentiment,
      action_required,
      pushed_to,
      status
     FROM competitor_news
     ${whereClause}
     ORDER BY published_at DESC NULLS LAST
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );

  if (countRows && dataRows) {
    return {
      items: dataRows.map(normalizeNewsRow),
      total: Number(countRows[0]?.total ?? 0),
      page,
      limit,
      source: 'postgres' as const,
    };
  }

  const dbData = loadFileDb();
  const news = filterNewsItems(dbData.competitorNews || [], params);
  return {
    items: news.slice(offset, offset + limit).map(normalizeFileNewsItem),
    total: news.length,
    page,
    limit,
    source: 'file' as const,
  };
}

async function fetchPoliciesData(impactLevel?: string) {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (impactLevel && impactLevel !== 'all') {
    values.push(impactLevel);
    filters.push(`impact_level = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await queryPostgres<PostgresPolicyRow>(
    `SELECT
      id,
      title,
      content,
      source_name,
      source_url,
      published_at,
      impact_level,
      affected_products,
      opportunities,
      threats,
      impact_analysis,
      recommendation,
      status
     FROM policies
     ${whereClause}
     ORDER BY published_at DESC NULLS LAST, title ASC`,
    values,
  );

  if (rows) {
    return rows.map(normalizePolicyRow);
  }

  const dbData = loadFileDb();
  let policies = [...(dbData.policies || [])];
  if (impactLevel && impactLevel !== 'all') {
    policies = policies.filter((p: any) => p.impactLevel === impactLevel);
  }
  return policies;
}

async function syncFilePolicies(policies: any[]) {
  const dbData = loadFileDb();
  dbData.policies = policies;
  saveFileDb(dbData);
}

async function upsertPolicyRecord(policy: ReturnType<typeof normalizePolicySnapshotItem>) {
  await queryPostgres(
    `INSERT INTO policies (
       id,
       title,
       content,
       source_name,
       source_url,
       published_at,
       impact_level,
       affected_products,
       opportunities,
       threats,
       impact_analysis,
       recommendation,
       status,
       raw_payload,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6::timestamptz, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14::jsonb, NOW()
     )
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       content = EXCLUDED.content,
       source_name = EXCLUDED.source_name,
       source_url = EXCLUDED.source_url,
       published_at = EXCLUDED.published_at,
       impact_level = EXCLUDED.impact_level,
       affected_products = EXCLUDED.affected_products,
       opportunities = EXCLUDED.opportunities,
       threats = EXCLUDED.threats,
       impact_analysis = EXCLUDED.impact_analysis,
       recommendation = EXCLUDED.recommendation,
       status = EXCLUDED.status,
       raw_payload = EXCLUDED.raw_payload,
       updated_at = NOW()`,
    [
      policy.id,
      policy.title,
      policy.content,
      policy.source,
      policy.sourceUrl,
      policy.publishedAt,
      policy.impactLevel,
      JSON.stringify(policy.affectedProducts),
      JSON.stringify(policy.opportunities),
      JSON.stringify(policy.threats),
      policy.impactAnalysis,
      policy.recommendation,
      policy.status,
      JSON.stringify(policy),
    ],
  );
}

async function newsExists(competitorId: string, title: string) {
  const rows = await queryPostgres<{ id: string }>(
    `SELECT id FROM competitor_news WHERE competitor_id = $1 AND title = $2 LIMIT 1`,
    [competitorId, title],
  );

  if (rows) {
    return rows.length > 0;
  }

  const dbData = loadFileDb();
  const newsItems = dbData.competitorNews || [];
  return newsItems.some((item: any) => item.competitorId === competitorId && item.title === title);
}

async function insertCompetitorNewsRecord(record: any) {
  const insertedRows = await queryPostgres<PostgresNewsRow>(
    `INSERT INTO competitor_news (
       id,
       competitor_id,
       competitor_name,
       title,
       content,
       summary,
       tag,
       tag_label,
       impact_analysis,
       source_name,
       source_url,
       published_at,
       sentiment,
       action_required,
       pushed_to,
       status,
       raw_payload,
       created_at,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
       $12::timestamptz, $13, $14, $15::jsonb, $16, $17::jsonb, NOW(), NOW()
     )
     RETURNING
       id,
       competitor_id,
       competitor_name,
       title,
       content,
       summary,
       tag,
       tag_label,
       impact_analysis,
       source_name,
       source_url,
       published_at,
       sentiment,
       action_required,
       pushed_to,
       status`,
    [
      record.id,
      record.competitorId,
      record.competitorName,
      record.title,
      record.content,
      record.summary,
      record.tag,
      record.tagLabel,
      record.impactAnalysis,
      record.source,
      record.sourceUrl,
      record.publishedAt,
      record.sentiment,
      record.actionRequired,
      JSON.stringify(record.pushedTo),
      record.status,
      JSON.stringify(record),
    ],
  );

  const dbData = loadFileDb();
  const newsItems = dbData.competitorNews || [];
  if (!newsItems.some((item: any) => item.id === record.id)) {
    newsItems.unshift(record);
    dbData.competitorNews = newsItems;
    saveFileDb(dbData);
  }

  if (insertedRows?.[0]) {
    return normalizeNewsRow(insertedRows[0]);
  }

  return normalizeFileNewsItem(record);
}

async function updateCompetitorNewsRecord(id: string, updates: CompetitorNewsUpdateInput) {
  const pgRows = await queryPostgres<PostgresNewsRow>(
    `UPDATE competitor_news
     SET
       tag = COALESCE($1, tag),
       tag_label = COALESCE($2, tag_label),
       pushed_to = COALESCE($3::jsonb, pushed_to),
       action_required = COALESCE($4, action_required),
       status = COALESCE($5, status),
       updated_at = NOW()
     WHERE id = $6
     RETURNING
       id,
       competitor_id,
       competitor_name,
       title,
       content,
       summary,
       tag,
       tag_label,
       impact_analysis,
       source_name,
       source_url,
       published_at,
       sentiment,
       action_required,
       pushed_to,
       status`,
    [
      nullIfUndefined(updates.tag),
      updates.tag ? NEWS_TAG_LABELS[updates.tag] || updates.tag : null,
      updates.pushedTo === undefined ? null : JSON.stringify(updates.pushedTo),
      nullIfUndefined(updates.actionRequired),
      nullIfUndefined(updates.status),
      id,
    ],
  );

  if (pgRows?.[0]) {
    return normalizeNewsRow(pgRows[0]);
  }

  const dbData = loadFileDb();
  const newsItems = dbData.competitorNews || [];
  const index = newsItems.findIndex((item: any) => (item.id || item._id) === id);
  if (index === -1) return null;

  const current = newsItems[index];
  const next = {
    ...current,
    ...(updates.tag !== undefined
      ? { tag: updates.tag, tagLabel: NEWS_TAG_LABELS[updates.tag] || updates.tag }
      : {}),
    ...(updates.pushedTo !== undefined ? { pushedTo: updates.pushedTo } : {}),
    ...(updates.actionRequired !== undefined ? { actionRequired: updates.actionRequired } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
  };

  newsItems[index] = next;
  dbData.competitorNews = newsItems;
  saveFileDb(dbData);
  return normalizeFileNewsItem(next);
}

async function createScanJob(payload: Record<string, unknown>, triggerSource = 'manual') {
  const scope = payload.scope === 'policy' ? 'policy' : 'competitor';
  const jobType = scope === 'policy' ? 'policy_sync' : 'competitor_scan';
  const rows = await queryPostgres<PostgresCrawlJobRow>(
    `INSERT INTO crawl_jobs (
       job_type,
       trigger_source,
       status,
       payload,
       result_snapshot
     )
     VALUES ($1, $2, 'queued', $3::jsonb, '{}'::jsonb)
     RETURNING
       id,
       job_type,
       trigger_source,
       status,
       payload,
       result_snapshot,
       error_message,
       created_at,
       started_at,
       finished_at`,
    [jobType, triggerSource, JSON.stringify(payload)],
  );

  if (rows?.[0]) {
    return normalizeScanJobRow(rows[0]);
  }

  const job: ScanJobRecord = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    jobType,
    triggerSource,
    status: 'queued',
    payload,
    resultSnapshot: {},
    errorMessage: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };
  scanJobs.set(job.id, job);
  return job;
}

async function updateScanJob(
  id: string,
  updates: Partial<Pick<ScanJobRecord, 'status' | 'resultSnapshot' | 'errorMessage' | 'startedAt' | 'finishedAt'>>,
) {
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId > 0) {
    const rows = await queryPostgres<PostgresCrawlJobRow>(
      `UPDATE crawl_jobs
       SET
         status = COALESCE($1, status),
         result_snapshot = COALESCE($2::jsonb, result_snapshot),
         error_message = COALESCE($3, error_message),
         started_at = COALESCE($4::timestamptz, started_at),
         finished_at = COALESCE($5::timestamptz, finished_at),
         updated_at = NOW()
       WHERE id = $6
       RETURNING
         id,
         job_type,
         trigger_source,
         status,
         payload,
         result_snapshot,
         error_message,
         created_at,
         started_at,
         finished_at`,
      [
        nullIfUndefined(updates.status),
        updates.resultSnapshot === undefined ? null : JSON.stringify(updates.resultSnapshot),
        nullIfUndefined(updates.errorMessage),
        nullIfUndefined(updates.startedAt),
        nullIfUndefined(updates.finishedAt),
        numericId,
      ],
    );

    if (rows?.[0]) {
      return normalizeScanJobRow(rows[0]);
    }
  }

  const current = scanJobs.get(id);
  if (!current) return null;
  const next: ScanJobRecord = {
    ...current,
    ...updates,
    resultSnapshot: updates.resultSnapshot ?? current.resultSnapshot,
    errorMessage: updates.errorMessage ?? current.errorMessage,
    startedAt: updates.startedAt ?? current.startedAt,
    finishedAt: updates.finishedAt ?? current.finishedAt,
  };
  scanJobs.set(id, next);
  return next;
}

async function getScanJob(id: string) {
  if (scanJobs.has(id)) {
    return scanJobs.get(id) ?? null;
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const rows = await queryPostgres<PostgresCrawlJobRow>(
    `SELECT
       id,
       job_type,
       trigger_source,
       status,
       payload,
       result_snapshot,
       error_message,
       created_at,
       started_at,
       finished_at
     FROM crawl_jobs
     WHERE id = $1`,
    [numericId],
  );

  if (rows?.[0]) {
    return normalizeScanJobRow(rows[0]);
  }

  return null;
}

async function executeCompetitorScan() {
  const competitors = await fetchCompetitorsData();
  const results = [];

  for (const competitor of competitors) {
    const mockNews = generateMockNews(competitor.id, competitor.name);

    for (const newsData of mockNews) {
      const exists = await newsExists(competitor.id, newsData.title);
      if (exists) continue;

      const analysis = await analyzeNews(
        newsData.title,
        newsData.content,
        competitor.name,
      );

      const tag = NEWS_TAGS.has(analysis.tag) ? analysis.tag : 'other';
      const record = {
        id: nextGeneratedId('scan_news'),
        competitorId: competitor.id,
        competitorName: competitor.name,
        title: newsData.title,
        content: newsData.content,
        summary: analysis.summary || newsData.title,
        tag,
        tagLabel: NEWS_TAG_LABELS[tag] || NEWS_TAG_LABELS.other,
        impactAnalysis:
          (analysis.opportunity && analysis.opportunity !== '无' ? analysis.opportunity : '') ||
          analysis.recommendation ||
          '',
        source: newsData.sourceName || competitor.name,
        sourceUrl: newsData.source || newsData.url || '',
        publishedAt: newsData.publishedAt instanceof Date
          ? newsData.publishedAt.toISOString()
          : new Date().toISOString(),
        sentiment: 'neutral',
        actionRequired: analysis.importance >= 4,
        pushedTo: [],
        status: analysis.importance >= 4 ? 'draft' : 'published',
      };

      const inserted = await insertCompetitorNewsRecord(record);
      results.push(inserted);
    }
  }

  return {
    success: true,
    message: `扫描完成，新增 ${results.length} 条动态`,
    data: results,
  };
}

async function executePolicyRefresh() {
  let snapshotPolicies: any[] = [];

  try {
    const file = JSON.parse(readFileSync(PUBLIC_POLICIES_PATH, 'utf-8'));
    snapshotPolicies = (file.policies || []).map(normalizePolicySnapshotItem);
  } catch {
    const dbData = loadFileDb();
    snapshotPolicies = (dbData.policies || []).map(normalizePolicySnapshotItem);
  }

  if (snapshotPolicies.length === 0) {
    throw new Error('未找到可同步的政策数据');
  }

  await syncFilePolicies(snapshotPolicies);

  if (await isPostgresReady()) {
    await queryPostgres('DELETE FROM policies');
    for (const policy of snapshotPolicies) {
      await upsertPolicyRecord(policy);
    }
  }

  return {
    success: true,
    message: `政策同步完成，共 ${snapshotPolicies.length} 条`,
    data: snapshotPolicies,
  };
}

async function processScanJob(jobId: string) {
  await updateScanJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    errorMessage: null,
  });

  try {
    const job = await getScanJob(jobId);
    const scope = job?.payload.scope === 'policy' ? 'policy' : 'competitor';
    const result = scope === 'policy'
      ? await executePolicyRefresh()
      : await executeCompetitorScan();
    await updateScanJob(jobId, {
      status: 'completed',
      finishedAt: new Date().toISOString(),
      resultSnapshot: {
        addedCount: result.data.length,
        message: result.message,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '扫描失败';
    await updateScanJob(jobId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      errorMessage: message,
      resultSnapshot: {},
    });
  }
}

async function buildStatsResponse() {
  const pgAvailable = await isPostgresReady();
  if (pgAvailable) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayRows, weekRows, majorRows, draftRows, competitorRows] = await Promise.all([
      queryPostgres<{ count: number | string }>(
        `SELECT COUNT(*)::int AS count FROM competitor_news WHERE published_at >= $1::timestamptz`,
        [today.toISOString()],
      ),
      queryPostgres<{ count: number | string }>(
        `SELECT COUNT(*)::int AS count FROM competitor_news WHERE published_at >= $1::timestamptz`,
        [weekAgo.toISOString()],
      ),
      queryPostgres<{ count: number | string }>(
        `SELECT COUNT(*)::int AS count FROM competitor_news WHERE tag = 'major'`,
      ),
      queryPostgres<{ count: number | string }>(
        `SELECT COUNT(*)::int AS count FROM competitor_news WHERE status = 'draft'`,
      ),
      queryPostgres<{ count: number | string }>(
        `SELECT COUNT(*)::int AS count FROM competitors`,
      ),
    ]);

    if (todayRows && weekRows && majorRows && draftRows && competitorRows) {
      return {
        today: Number(todayRows[0]?.count ?? 0),
        week: Number(weekRows[0]?.count ?? 0),
        major: Number(majorRows[0]?.count ?? 0),
        draft: Number(draftRows[0]?.count ?? 0),
        competitors: Number(competitorRows[0]?.count ?? 0),
      };
    }
  }

  const dbData = loadFileDb();
  const competitorNews = dbData.competitorNews || [];
  const competitors = dbData.competitors || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    today: competitorNews.filter((item: any) => new Date(item.publishedAt) >= today).length,
    week: competitorNews.filter((item: any) => new Date(item.publishedAt) >= weekAgo).length,
    major: competitorNews.filter((item: any) => item.tag === 'major').length,
    draft: competitorNews.filter((item: any) => item.status === 'draft').length,
    competitors: competitors.length,
  };
}

// ============ API 路由 ============

// 获取竞争对手列表（优先 PostgreSQL，失败时回退文件）
app.get('/api/competitors', async (req, res) => {
  try {
    const competitors = await fetchCompetitorsData();
    res.json(competitors);
  } catch (error) {
    res.status(500).json({ error: '获取竞争对手列表失败' });
  }
});

// 获取竞争对手动态（优先 PostgreSQL，失败时回退文件）
app.get('/api/news', async (req, res) => {
  try {
    const payload = await fetchNewsData({
      competitorId: typeof req.query.competitorId === 'string' ? req.query.competitorId : undefined,
      tag: typeof req.query.tag === 'string' ? req.query.tag : undefined,
      timeRange: typeof req.query.timeRange === 'string' ? req.query.timeRange : undefined,
      date: typeof req.query.date === 'string' ? req.query.date : undefined,
      page: parsePage(req.query.page, 1),
      limit: parsePage(req.query.limit, 50),
    });
    res.json({
      data: payload.items,
      total: payload.total,
      page: payload.page,
      limit: payload.limit,
    });
  } catch (error) {
    console.error('获取竞争对手动态失败:', error);
    res.status(500).json({ error: '获取竞争对手动态失败' });
  }
});

// 获取政策列表（优先 PostgreSQL，失败时回退文件）
app.get('/api/policies', async (req, res) => {
  try {
    const impactLevel = typeof req.query.impactLevel === 'string' ? req.query.impactLevel : undefined;
    const policies = await fetchPoliciesData(impactLevel);
    res.json(policies);
  } catch (error) {
    console.error('获取政策列表失败:', error);
    res.status(500).json({ error: '获取政策列表失败' });
  }
});

// /api/competitor-news 兼容路由
app.get('/api/competitor-news', async (req, res) => {
  try {
    const payload = await fetchNewsData({
      competitorId: typeof req.query.competitorId === 'string' ? req.query.competitorId : undefined,
      tag: typeof req.query.tag === 'string' ? req.query.tag : undefined,
      timeRange: typeof req.query.timeRange === 'string' ? req.query.timeRange : undefined,
      date: typeof req.query.date === 'string' ? req.query.date : undefined,
      page: parsePage(req.query.page, 1),
      limit: parsePage(req.query.limit, 50),
    });
    res.json(payload.items);
  } catch (error) {
    console.error('获取竞品动态失败:', error);
    res.status(500).json({ error: '获取竞品动态失败' });
  }
});

app.patch('/api/competitor-news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tag, pushedTo, actionRequired, status } = req.body ?? {};

    if (tag !== undefined && (typeof tag !== 'string' || !NEWS_TAGS.has(tag))) {
      res.status(400).json({ error: '无效的标签' });
      return;
    }

    if (
      pushedTo !== undefined &&
      (!Array.isArray(pushedTo) || pushedTo.some((item) => typeof item !== 'string'))
    ) {
      res.status(400).json({ error: 'pushedTo 必须是字符串数组' });
      return;
    }

    if (actionRequired !== undefined && typeof actionRequired !== 'boolean') {
      res.status(400).json({ error: 'actionRequired 必须是布尔值' });
      return;
    }

    if (status !== undefined && (typeof status !== 'string' || !NEWS_STATUSES.has(status))) {
      res.status(400).json({ error: '无效的状态' });
      return;
    }

    if (
      tag === undefined &&
      pushedTo === undefined &&
      actionRequired === undefined &&
      status === undefined
    ) {
      res.status(400).json({ error: '至少需要一个可更新字段' });
      return;
    }

    const updated = await updateCompetitorNewsRecord(id, {
      tag,
      pushedTo,
      actionRequired,
      status,
    });

    if (!updated) {
      res.status(404).json({ error: '未找到对应动态' });
      return;
    }

    res.json({ data: updated });
  } catch (error) {
    console.error('更新竞品动态失败:', error);
    res.status(500).json({ error: '更新竞品动态失败' });
  }
});

app.post('/api/jobs/scan', async (req, res) => {
  try {
    const payload = {
      scope: 'competitor',
      ...((req.body && typeof req.body === 'object') ? req.body : {}),
    } as Record<string, unknown>;

    const job = await createScanJob(payload, 'manual');
    void processScanJob(job.id);

    res.status(202).json({ data: job });
  } catch (error) {
    console.error('创建扫描任务失败:', error);
    res.status(500).json({ error: '创建扫描任务失败' });
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await getScanJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: '未找到任务' });
      return;
    }
    res.json({ data: job });
  } catch (error) {
    console.error('获取任务失败:', error);
    res.status(500).json({ error: '获取任务失败' });
  }
});

// 触发扫描（手动）- 同时支持 /api/crawler/run 和 /api/scan
async function runScan(req: any, res: any) {
  try {
    const scope = req.body?.scope === 'policy' ? 'policy' : 'competitor';
    const result = scope === 'policy'
      ? await executePolicyRefresh()
      : await executeCompetitorScan();
    res.json(result);
  } catch (error) {
    console.error('扫描失败:', error);
    const message = error instanceof Error ? error.message : '扫描失败';
    res.status(500).json({ error: '扫描失败', message });
  }
}

// 同时支持 /api/crawler/run 和 /api/scan
app.post('/api/crawler/run', runScan);
app.post('/api/scan', runScan);

// 获取统计
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await buildStatsResponse();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取统计失败' });
  }
});

// 启动
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`4S Intelligence API running on port ${PORT}`);
  if (process.env.DATABASE_URL) {
    console.log('Primary read path: PostgreSQL with file fallback');
  } else {
    console.log('Primary read path: file fallback (DATABASE_URL not configured)');
  }
});
