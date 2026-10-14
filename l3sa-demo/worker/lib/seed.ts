// Re-runs db/seed.sql (the same file the CLI seed uses) as one D1 batch,
// which D1 executes as a single transaction.

import seedSql from '../../db/seed.sql';

export function seedStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function resetDemoData(db: D1Database): Promise<void> {
  await db.batch(seedStatements(seedSql).map((s) => db.prepare(s)));
}
