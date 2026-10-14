import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { defineConfig } from 'vitest/config';

// Tests read only TEST_DATABASE_URL from .env; every other setting is passed
// explicitly by the tests themselves.
if (!process.env.TEST_DATABASE_URL && existsSync('.env')) {
  const fromFile = parseEnv(readFileSync('.env', 'utf8')).TEST_DATABASE_URL;
  if (fromFile) process.env.TEST_DATABASE_URL = fromFile;
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/support/global-setup.ts'],
  },
});
