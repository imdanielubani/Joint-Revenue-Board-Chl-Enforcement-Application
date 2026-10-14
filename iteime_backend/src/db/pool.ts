import pg from 'pg';

/** The PostgreSQL connection the backend uses, if one is configured. */
export interface Database {
  /** Resolves when the database answers; rejects otherwise. */
  ping(): Promise<void>;
  close(): Promise<void>;
}

/** A connection pool for [connectionString]. Connections open on first use. */
export function createDatabase(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
  return {
    async ping() {
      await pool.query('SELECT 1');
    },
    async close() {
      await pool.end();
    },
  };
}
