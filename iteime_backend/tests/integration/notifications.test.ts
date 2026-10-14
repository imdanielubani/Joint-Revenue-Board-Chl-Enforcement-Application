import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '../../src/database/pool.js';
import { createNotification } from '../../src/modules/notifications/notification.repository.js';
import {
  buildApp,
  emptyTables,
  openTestDatabase,
  recreateSchema,
  signIn,
  testDatabaseUrl,
} from '../support/harness.js';

describe.skipIf(!testDatabaseUrl)('notifications API', () => {
  let database: Database;
  let app: Express;
  let token: string;

  beforeAll(async () => {
    database = openTestDatabase();
    await recreateSchema(database);
  });
  beforeEach(async () => {
    await emptyTables(database);
    app = buildApp(database).app;
    token = (await signIn(app)).accessToken;
  });
  afterAll(async () => {
    await database.close();
  });

  const get = (path: string) => request(app).get(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const post = (path: string) =>
    request(app).post(`/api/v1${path}`).auth(token, { type: 'bearer' });

  async function notify(agentId: string, title: string) {
    return createNotification(database, {
      agentId,
      category: 'system',
      title,
      body: `${title} body`,
    });
  }

  it("lists only the agent's own notifications, newest first", async () => {
    await notify('agt-0142', 'First');
    await notify('agt-other', 'Not yours');
    await notify('agt-0142', 'Second');

    const first = await get('/notifications?limit=1');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ unread: 2, items: [{ title: 'Second', read: false }] });
    const second = await get(`/notifications?limit=1&cursor=${first.body.nextCursor}`);
    expect(second.body.items.map((item: { title: string }) => item.title)).toEqual(['First']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('marks one or all as read', async () => {
    const one = await notify('agt-0142', 'One');
    await notify('agt-0142', 'Two');
    const theirs = await notify('agt-other', 'Theirs');

    expect((await post(`/notifications/${one.id}/read`)).status).toBe(204);
    expect((await get('/notifications/unread-count')).body).toEqual({ unread: 1 });
    expect((await post(`/notifications/${theirs.id}/read`)).status).toBe(404);
    expect((await post('/notifications/nonsense/read')).status).toBe(404);

    expect((await post('/notifications/read-all')).body).toEqual({ marked: 1 });
    expect((await get('/dashboard')).body.unreadNotifications).toBe(0);
  });
});
