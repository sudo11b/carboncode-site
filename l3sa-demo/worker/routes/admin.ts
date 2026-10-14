// Admin API. No auth in the demo; the real site goes behind Cloudflare Access.
// Errors here are plain English since the admin page is English-only.

import { Hono } from 'hono';
import type { ClassRow, EmailPreview, InfoRequest, Registration } from '../../shared/types';
import { todayCentral } from '../../shared/format';
import {
  cancelRegistration, getClass, getRegistration, listClasses, moveRegistration,
  promoteRegistration, standbyPosition,
} from '../lib/seats';
import { emails, logEmails } from '../lib/emails';
import { resetDemoData } from '../lib/seed';
import type { Body } from '../lib/validate';

export const adminRoutes = new Hono<{ Bindings: Env }>();

const fail = (message: string) => ({ ok: false, error: message });
const idParam = (raw: string) => (/^\d+$/.test(raw) ? Number(raw) : NaN);

// ---- Classes -------------------------------------------------------------

adminRoutes.get('/classes', async (c) => {
  return c.json(await listClasses(c.env.DB, 'c.end_date >= ?', todayCentral()));
});

adminRoutes.get('/classes/:id', async (c) => {
  const id = idParam(c.req.param('id'));
  const cls = await getClass(c.env.DB, id);
  if (!cls) return c.json(fail('Class not found.'), 404);
  const { results } = await c.env.DB
    .prepare(`SELECT * FROM registrations WHERE class_id = ?
              ORDER BY CASE status WHEN 'registered' THEN 0 WHEN 'standby' THEN 1 ELSE 2 END,
                       COALESCE(standby_since, created_at), id`)
    .bind(id)
    .all<Registration>();
  return c.json({
    class: cls,
    registered: results.filter((r) => r.status === 'registered'),
    standby: results.filter((r) => r.status === 'standby').map((r, i) => ({ ...r, position: i + 1 })),
    cancelled: results.filter((r) => r.status === 'cancelled'),
  });
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseClass(body: Body): { cls?: Omit<ClassRow, 'id'>; error?: string } {
  const start_date = String(body.start_date ?? '');
  const end_date = String(body.end_date ?? '');
  const cert_type = String(body.cert_type ?? '');
  const capacity = Number(body.capacity);
  const price_single = Number(body.price_single);
  const price_dual = Number(body.price_dual);
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;

  if (!DATE_RE.test(start_date) || !DATE_RE.test(end_date)) return { error: 'Start and end dates are required.' };
  if (end_date < start_date) return { error: 'End date must be on or after the start date.' };
  if (!['SPRAT', 'IRATA', 'SPRAT/IRATA'].includes(cert_type)) return { error: 'Pick a cert type.' };
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) return { error: 'Capacity must be between 1 and 50.' };
  if (![price_single, price_dual].every((p) => Number.isInteger(p) && p >= 0)) return { error: 'Prices must be whole dollar amounts.' };

  return { cls: { start_date, end_date, cert_type: cert_type as ClassRow['cert_type'], capacity, price_single, price_dual, notes } };
}

adminRoutes.post('/classes', async (c) => {
  const { cls, error } = parseClass(await c.req.json<Body>());
  if (!cls) return c.json(fail(error!), 400);
  const row = await c.env.DB
    .prepare(`INSERT INTO classes (start_date, end_date, cert_type, price_single, price_dual, capacity, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`)
    .bind(cls.start_date, cls.end_date, cls.cert_type, cls.price_single, cls.price_dual, cls.capacity, cls.notes)
    .first<ClassRow>();
  return c.json({ ok: true, class: row });
});

adminRoutes.put('/classes/:id', async (c) => {
  const id = idParam(c.req.param('id'));
  const current = await getClass(c.env.DB, id);
  if (!current) return c.json(fail('Class not found.'), 404);
  const { cls, error } = parseClass(await c.req.json<Body>());
  if (!cls) return c.json(fail(error!), 400);

  if (cls.capacity < current.registered) {
    return c.json(fail(`${current.registered} students are registered. Capacity can't go below that. Move or remove students first.`), 409);
  }
  if (cls.cert_type !== current.cert_type) {
    const mismatch = await c.env.DB
      .prepare(`SELECT COUNT(*) AS n FROM registrations WHERE class_id = ? AND status != 'cancelled'
                AND (cert_choice = 'dual' OR single_cert != ?)`)
      .bind(id, cls.cert_type)
      .first<{ n: number }>();
    if (cls.cert_type !== 'SPRAT/IRATA' && mismatch && mismatch.n > 0) {
      return c.json(fail(`${mismatch.n} student(s) signed up for a cert this class would no longer offer. Move them first.`), 409);
    }
  }

  const row = await c.env.DB
    .prepare(`UPDATE classes SET start_date = ?, end_date = ?, cert_type = ?, price_single = ?, price_dual = ?, capacity = ?, notes = ?
              WHERE id = ? RETURNING *`)
    .bind(cls.start_date, cls.end_date, cls.cert_type, cls.price_single, cls.price_dual, cls.capacity, cls.notes, id)
    .first<ClassRow>();
  return c.json({ ok: true, class: row });
});

adminRoutes.delete('/classes/:id', async (c) => {
  const id = idParam(c.req.param('id'));
  const cls = await getClass(c.env.DB, id);
  if (!cls) return c.json(fail('Class not found.'), 404);
  if (cls.registered + cls.standby > 0) {
    return c.json(fail('This class still has students. Move or remove them before deleting it.'), 409);
  }
  await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// ---- Students ------------------------------------------------------------

async function loadReg(c: { env: Env; req: { param: (k: string) => string } }) {
  return getRegistration(c.env.DB, idParam(c.req.param('id')));
}

adminRoutes.post('/registrations/:id/cancel', async (c) => {
  const reg = await cancelRegistration(c.env.DB, idParam(c.req.param('id')));
  if (!reg) return c.json(fail('Student not found or already removed.'), 404);
  return c.json({ ok: true, registration: reg, emails: [] });
});

adminRoutes.post('/registrations/:id/promote', async (c) => {
  const before = await loadReg(c);
  if (!before || before.status !== 'standby') return c.json(fail('That student is not on standby.'), 404);
  const reg = await promoteRegistration(c.env.DB, before.id);
  if (!reg) return c.json(fail('No open seat in this class. Remove or move someone first.'), 409);
  const cls = (await getClass(c.env.DB, reg.class_id))!;
  const sent = await logEmails(c.env.DB, [emails.registeredEmail(reg, cls, 'promoted')]);
  return c.json({ ok: true, registration: reg, emails: sent });
});

adminRoutes.post('/registrations/:id/move', async (c) => {
  const before = await loadReg(c);
  if (!before || before.status === 'cancelled') return c.json(fail('Student not found.'), 404);
  const { class_id } = await c.req.json<{ class_id: number }>();
  const dest = await getClass(c.env.DB, Number(class_id));
  if (!dest) return c.json(fail('Destination class not found.'), 404);
  if (dest.id === before.class_id) return c.json(fail('Student is already in that class.'), 400);

  const from = (await getClass(c.env.DB, before.class_id))!;
  const reg = await moveRegistration(c.env.DB, before.id, dest);
  if (!reg) return c.json(fail('Move failed. Refresh and try again.'), 409);

  const position = await standbyPosition(c.env.DB, reg);
  const certChanged = reg.cert_choice !== before.cert_choice || reg.single_cert !== before.single_cert;
  const warning = certChanged
    ? `${dest.cert_type} class doesn't offer ${before.cert_choice === 'dual' ? 'dual cert' : before.single_cert}. ${reg.name} is now down for ${reg.single_cert} only.`
    : null;

  const sent: EmailPreview[] = await logEmails(c.env.DB, [emails.movedEmail(reg, from, dest, position)]);
  return c.json({ ok: true, registration: reg, position, warning, emails: sent });
});

// ---- Info requests, email log, reset ------------------------------------

adminRoutes.get('/info-requests', async (c) => {
  const { results } = await c.env.DB
    .prepare(`SELECT i.*, c.start_date, c.end_date, c.cert_type FROM info_requests i
              LEFT JOIN classes c ON c.id = i.class_id
              ORDER BY i.handled, i.created_at DESC`)
    .all<InfoRequest & { start_date: string | null; end_date: string | null; cert_type: string | null }>();
  return c.json(results);
});

adminRoutes.post('/info-requests/:id/handled', async (c) => {
  const { handled } = await c.req.json<{ handled: boolean }>();
  const row = await c.env.DB
    .prepare('UPDATE info_requests SET handled = ? WHERE id = ? RETURNING *')
    .bind(handled ? 1 : 0, idParam(c.req.param('id')))
    .first<InfoRequest>();
  if (!row) return c.json(fail('Request not found.'), 404);
  return c.json({ ok: true, request: row });
});

adminRoutes.get('/emails', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM email_log ORDER BY created_at DESC, id DESC LIMIT 200')
    .all<EmailPreview>();
  return c.json(results);
});

adminRoutes.post('/reset', async (c) => {
  await resetDemoData(c.env.DB);
  return c.json({ ok: true });
});
