BEGIN;

CREATE TABLE IF NOT EXISTS competitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  stock TEXT,
  bu JSONB NOT NULL DEFAULT '[]'::jsonb,
  listing BOOLEAN NOT NULL DEFAULT FALSE,
  market_cap TEXT,
  customer_group JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_line JSONB NOT NULL DEFAULT '[]'::jsonb,
  main_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  core_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  market_share JSONB NOT NULL DEFAULT '{}'::jsonb,
  recent_action TEXT,
  threat_level TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_news (
  id TEXT PRIMARY KEY,
  competitor_id TEXT REFERENCES competitors(id) ON DELETE SET NULL,
  competitor_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  tag TEXT,
  tag_label TEXT,
  impact_analysis TEXT,
  source_name TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  sentiment TEXT,
  action_required BOOLEAN NOT NULL DEFAULT FALSE,
  pushed_to JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  source_name TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  impact_level TEXT,
  affected_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
  threats JSONB NOT NULL DEFAULT '[]'::jsonb,
  impact_analysis TEXT,
  recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bid_results (
  id TEXT PRIMARY KEY,
  competitor_id TEXT REFERENCES competitors(id) ON DELETE SET NULL,
  competitor_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_type TEXT,
  amount NUMERIC(18, 2),
  market_share TEXT,
  share_change TEXT,
  main_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  bid_date DATE,
  status TEXT NOT NULL DEFAULT 'won',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bid_packages (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id TEXT,
  project_name TEXT NOT NULL,
  bid_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  competitor_news JSONB NOT NULL DEFAULT '[]'::jsonb,
  competitors_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_type TEXT NOT NULL,
  period TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  level TEXT,
  title TEXT NOT NULL,
  content TEXT,
  source_name TEXT,
  competitor_id TEXT REFERENCES competitors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ,
  alert_type TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intel_sources (
  id TEXT PRIMARY KEY,
  source_group TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT,
  customer_group TEXT,
  priority TEXT,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  operator TEXT,
  before_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_records (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'competitor_news',
  entity_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitors_threat_level ON competitors (threat_level);
CREATE INDEX IF NOT EXISTS idx_competitors_status ON competitors (status);
CREATE INDEX IF NOT EXISTS idx_competitor_news_competitor_id ON competitor_news (competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_news_published_at ON competitor_news (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_news_tag ON competitor_news (tag);
CREATE INDEX IF NOT EXISTS idx_policies_published_at ON policies (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_policies_impact_level ON policies (impact_level);
CREATE INDEX IF NOT EXISTS idx_bid_results_competitor_id ON bid_results (competitor_id);
CREATE INDEX IF NOT EXISTS idx_bid_results_bid_date ON bid_results (bid_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts (level);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intel_sources_group ON intel_sources (source_group);
CREATE INDEX IF NOT EXISTS idx_intel_sources_priority ON intel_sources (priority);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs (status);
CREATE INDEX IF NOT EXISTS idx_push_records_entity ON push_records (entity_type, entity_id);

COMMIT;
