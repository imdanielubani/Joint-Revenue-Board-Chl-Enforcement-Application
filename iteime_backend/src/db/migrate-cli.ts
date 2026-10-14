import 'dotenv/config';

import { loadConfig } from '../config/env.js';
import { runMigrations } from './migrate.js';
import { createDatabase } from './pool.js';

/** `npm run migrate`: brings the database's schema up to date. */
const database = createDatabase(loadConfig().databaseUrl);
try {
  const applied = await runMigrations(database);
  console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Already up to date.');
} finally {
  await database.close();
}
