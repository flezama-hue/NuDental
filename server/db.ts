import 'dotenv/config';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

export interface Queryable {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

export interface Database extends Queryable {
  close(): Promise<void>;
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
}

function adapter(connection: any): Queryable {
  return {
    query: (sql, params) => connection.query(sql, params),
    exec: (sql) => connection.exec ? connection.exec(sql) : connection.query(sql),
  };
}

export async function connectDb(): Promise<Database> {
  const driver = process.env.DB_DRIVER || 'pglite';
  if (driver === 'pglite') {
    if (process.env.NODE_ENV === 'production') throw new Error('Producción requiere PostgreSQL y revisión de despliegue.');
    const { PGlite } = await import('@electric-sql/pglite');
    const directory = process.env.PGLITE_PATH || './.local-data/nudental';
    await mkdir(directory, { recursive: true });
    const db: any = new PGlite(directory);
    await db.waitReady;
    return {
      ...adapter(db),
      close: () => db.close(),
      transaction: <T>(work: (tx: Queryable) => Promise<T>) => db.transaction((tx: any) => work(adapter(tx))),
    };
  }

  if (driver !== 'postgres' || !process.env.DATABASE_URL) throw new Error('Configura DB_DRIVER y DATABASE_URL.');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 10),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30_000,
  });

  return {
    query: (sql, params) => pool.query(sql, params),
    exec: sql => pool.query(sql),
    close: () => pool.end(),
    transaction: async <T>(work: (tx: Queryable) => Promise<T>) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work({ query: (sql, params) => client.query(sql, params), exec: sql => client.query(sql) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function migrate(db: Database) {
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('../database/', import.meta.url);
  const files = (await readdir(directory))
    .filter(name => /^\d{3}_.+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const version = file.slice(0, 3);
    const result = await db.query('SELECT version FROM schema_migrations WHERE version = $1', [version]);
    if (result.rows.length) continue;
    await db.exec(await readFile(new URL(file, directory), 'utf8'));
  }
}
