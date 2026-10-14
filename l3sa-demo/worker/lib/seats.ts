// Seat and standby logic. Every status decision happens inside a single SQL
// statement so two people submitting at the same moment can't both take the
// last seat.

import type { Cert, CertChoice, ClassRow, ClassSummary, Lang, Registration } from '../../shared/types';

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

const SUMMARY_SQL = `
  SELECT c.*,
    (SELECT COUNT(*) FROM registrations r WHERE r.class_id = c.id AND r.status = 'registered') AS registered,
    (SELECT COUNT(*) FROM registrations r WHERE r.class_id = c.id AND r.status = 'standby')    AS standby
  FROM classes c`;

export async function listClasses(db: D1Database, where: string, ...params: unknown[]): Promise<ClassSummary[]> {
  const { results } = await db.prepare(`${SUMMARY_SQL} WHERE ${where} ORDER BY c.start_date`).bind(...params).all<ClassSummary>();
  return results;
}

export async function getClass(db: D1Database, id: number): Promise<ClassSummary | null> {
  return db.prepare(`${SUMMARY_SQL} WHERE c.id = ?`).bind(id).first<ClassSummary>();
}

export async function getRegistration(db: D1Database, id: number): Promise<Registration | null> {
  return db.prepare('SELECT * FROM registrations WHERE id = ?').bind(id).first<Registration>();
}

/** 1-based position on the standby list, or null if not on standby. */
export async function standbyPosition(db: D1Database, reg: Registration): Promise<number | null> {
  if (reg.status !== 'standby' || !reg.standby_since) return null;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM registrations
              WHERE class_id = ? AND status = 'standby'
                AND (standby_since < ? OR (standby_since = ? AND id <= ?))`)
    .bind(reg.class_id, reg.standby_since, reg.standby_since, reg.id)
    .first<{ n: number }>();
  return row?.n ?? null;
}

// SQL fragment: does class ?1 have an open seat right now?
const HAS_SEAT = `(SELECT COUNT(*) FROM registrations WHERE class_id = ?1 AND status = 'registered')
                  < (SELECT capacity FROM classes WHERE id = ?1)`;

export interface NewRegistration {
  class_id: number;
  name: string;
  email: string;
  phone: string;
  level: string;
  cert_choice: CertChoice;
  single_cert: Cert | null;
  language: Lang;
}

/** Inserts as 'registered' if a seat is open, otherwise 'standby'. */
export async function createRegistration(db: D1Database, r: NewRegistration): Promise<Registration> {
  const row = await db
    .prepare(`INSERT INTO registrations
                (class_id, name, email, phone, level, cert_choice, single_cert, language, status, standby_since)
              SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
                CASE WHEN ${HAS_SEAT} THEN 'registered' ELSE 'standby' END,
                CASE WHEN ${HAS_SEAT} THEN NULL ELSE ${NOW} END
              RETURNING *`)
    .bind(r.class_id, r.name, r.email, r.phone, r.level, r.cert_choice, r.single_cert, r.language)
    .first<Registration>();
  if (!row) throw new Error('insert failed');
  return row;
}

/**
 * Moves a student to another class. Same seat/standby rule as a new signup.
 * If the destination doesn't offer what they chose, they drop to the single
 * cert the destination does offer.
 */
export async function moveRegistration(db: D1Database, regId: number, dest: ClassRow): Promise<Registration | null> {
  const offersDual = dest.cert_type === 'SPRAT/IRATA';
  const fallbackCert: Cert = dest.cert_type === 'IRATA' ? 'IRATA' : 'SPRAT';
  return db
    .prepare(`UPDATE registrations SET
                status        = CASE WHEN ${HAS_SEAT} THEN 'registered' ELSE 'standby' END,
                standby_since = CASE WHEN ${HAS_SEAT} THEN NULL ELSE ${NOW} END,
                cert_choice   = CASE WHEN ?3 THEN cert_choice ELSE 'single' END,
                single_cert   = CASE
                                  WHEN ?3 THEN single_cert
                                  WHEN cert_choice = 'single' AND single_cert = ?4 THEN single_cert
                                  ELSE ?4 END,
                class_id      = ?1
              WHERE id = ?2 AND status != 'cancelled' AND class_id != ?1
              RETURNING *`)
    .bind(dest.id, regId, offersDual ? 1 : 0, fallbackCert)
    .first<Registration>();
}

/** Standby -> registered, only if the class has an open seat. */
export async function promoteRegistration(db: D1Database, regId: number): Promise<Registration | null> {
  return db
    .prepare(`UPDATE registrations SET status = 'registered', standby_since = NULL
              WHERE id = ?1 AND status = 'standby'
                AND (SELECT COUNT(*) FROM registrations r WHERE r.class_id = registrations.class_id AND r.status = 'registered')
                    < (SELECT capacity FROM classes c WHERE c.id = registrations.class_id)
              RETURNING *`)
    .bind(regId)
    .first<Registration>();
}

export async function cancelRegistration(db: D1Database, regId: number): Promise<Registration | null> {
  return db
    .prepare(`UPDATE registrations SET status = 'cancelled', standby_since = NULL
              WHERE id = ? AND status != 'cancelled' RETURNING *`)
    .bind(regId)
    .first<Registration>();
}
