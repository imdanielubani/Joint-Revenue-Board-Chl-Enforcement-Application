import pg, { type QueryResult, type QueryResultRow } from 'pg';

/** Something SQL can be run on: the pool, or one transaction's connection. */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
}

/** The one row an INSERT … RETURNING gives back. */
export function onlyRow<R>(rows: R[]): R {
  const [row] = rows;
  if (row === undefined) throw new Error('Expected a row, got none.');
  return row;
}

/** The PostgreSQL database the backend uses. */
export interface Database extends Queryable {
  /** Runs [work] in one transaction: committed if it resolves, rolled back if it throws. */
  transaction<T>(work: (client: Queryable) => Promise<T>): Promise<T>;
  /** Resolves when the database answers; rejects otherwise. */
  ping(): Promise<void>;
  close(): Promise<void>;
}

/** A connection pool for [connectionString]. Connections open on first use. */
export function createDatabase(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5_000 });
  return {
    query: (text, values) => pool.query(text, values),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async ping() {
      await pool.query('SELECT 1');
    },
    async close() {
      await pool.end();
    },
  };
}
