type QueryRow = Record<string, unknown>;

type QueryResultLike = {
  rows: QueryRow[];
};

type PoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResultLike>;
};

let pool: PoolLike | null = null;
let connecting: Promise<PoolLike | null> | null = null;
let missingDriverLogged = false;
let connectionFailureLogged = false;

async function createPool(): Promise<PoolLike | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    const moduleName = 'pg';
    const pgModule = await import(moduleName);
    const Pool = (pgModule as { Pool?: new (options: Record<string, unknown>) => PoolLike }).Pool;

    if (!Pool) {
      throw new Error('pg Pool export is unavailable');
    }

    const nextPool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });

    await nextPool.query('SELECT 1');
    connectionFailureLogged = false;
    console.log('Connected to PostgreSQL');
    return nextPool;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Cannot find package') || message.includes('Cannot find module')) {
      if (!missingDriverLogged) {
        console.warn('DATABASE_URL is set but the `pg` package is not installed. Falling back to file data.');
        missingDriverLogged = true;
      }
      return null;
    }

    if (!connectionFailureLogged) {
      console.warn(`PostgreSQL connection unavailable, falling back to file data: ${message}`);
      connectionFailureLogged = true;
    }
    return null;
  }
}

export async function getPostgresPool(): Promise<PoolLike | null> {
  if (pool) return pool;
  if (connecting) return connecting;

  connecting = createPool()
    .then((createdPool) => {
      pool = createdPool;
      return createdPool;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

export async function queryPostgres<T extends QueryRow = QueryRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[] | null> {
  const activePool = await getPostgresPool();
  if (!activePool) return null;

  try {
    const result = await activePool.query(sql, params);
    return result.rows as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PostgreSQL query failed: ${message}`);
    return null;
  }
}

export async function isPostgresReady(): Promise<boolean> {
  return Boolean(await getPostgresPool());
}
