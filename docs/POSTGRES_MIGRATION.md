# PostgreSQL Migration Guide

This guide covers Phase 1 of the refactor: moving the current file snapshot into
a single PostgreSQL source of truth.

## Files

- [schema.sql](/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/db/schema.sql)
- [generate-postgres-import.cjs](/Users/cying/WorkBuddy/20260414120640/4S竞品情报系统-pro/scripts/import/generate-postgres-import.cjs)

## Recommended workflow

1. Create a PostgreSQL database for the project.
2. Apply `db/schema.sql`.
3. Generate the import SQL from the current `db.json`.
4. Load the generated SQL into PostgreSQL.
5. Point the backend to `DATABASE_URL`.

## Step 1: create the database

Example:

```bash
createdb market_analysis
```

## Step 2: apply the schema

Example:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

## Step 3: generate import SQL

Example:

```bash
npm run db:generate-import-sql
```

By default this writes:

```text
db/seeds/current_snapshot.generated.sql
```

You can also choose a custom source or output:

```bash
node scripts/import/generate-postgres-import.cjs \
  --source ./db.json \
  --output /tmp/market-analysis-import.sql
```

## Step 4: load the generated SQL

Example:

```bash
psql "$DATABASE_URL" -f db/seeds/current_snapshot.generated.sql
```

## Step 5: validate the import

Suggested checks:

```sql
SELECT COUNT(*) FROM competitors;
SELECT COUNT(*) FROM competitor_news;
SELECT COUNT(*) FROM policies;
SELECT COUNT(*) FROM bid_results;
SELECT COUNT(*) FROM bid_packages;
SELECT COUNT(*) FROM reports;
SELECT COUNT(*) FROM intel_sources;
```

## Notes

- The current schema intentionally stores nested snapshots like reports and bid
  packages as `JSONB` so Phase 1 can land quickly without blocking on full
  normalization.
- Operational tables like `crawl_jobs`, `operation_logs`, and `push_records`
  are included now so later phases can build on the same schema.
- The current environment where this refactor was prepared did not have `psql`
  installed, so schema execution and live import were not run here.
