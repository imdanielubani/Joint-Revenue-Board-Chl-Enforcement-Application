/**
 * One step of the database schema. A step, once applied anywhere, is never
 * edited: add a new one instead. Kept in TypeScript so the build ships them
 * without copying SQL files.
 */
export interface Migration {
  /** Unique and sortable: "<number>_<name>". */
  id: string;
  sql: string;
}
