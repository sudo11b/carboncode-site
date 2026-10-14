/// <reference types="@cloudflare/workers-types" />

declare module '*.sql' {
  const sql: string;
  export default sql;
}

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}
