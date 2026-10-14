import type { Migration } from '../migration.js';
import { mobileMvp } from './001_mobile_mvp.js';

/** Every migration, in the order they are applied. Add new steps at the end. */
export const migrations: Migration[] = [mobileMvp];
