import { Hono } from 'hono';
import type { Cert, CertChoice, ClassRow, FieldError, InfoRequest } from '../../shared/types';
import { todayCentral } from '../../shared/format';
import { createRegistration, getClass, listClasses, standbyPosition } from '../lib/seats';
import { emails, logEmails } from '../lib/emails';
import { contactFields, isSpam, lang, str, type Body } from '../lib/validate';

export const publicRoutes = new Hono<{ Bindings: Env }>();

/** Public class list. Tony asked for "open" or "full" only, so no seat counts leave the server. */
publicRoutes.get('/classes', async (c) => {
  const rows = await listClasses(c.env.DB, 'c.start_date >= ?', todayCentral());
  return c.json(
    rows.map(({ registered, standby, capacity, ...cls }) => ({ ...cls, full: registered >= capacity })),
  );
});

async function openClass(db: D1Database, rawId: unknown) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return null;
  const cls = await getClass(db, id);
  return cls && cls.start_date >= todayCentral() ? cls : null;
}

publicRoutes.post('/registrations', async (c) => {
  const body = await c.req.json<Body>().catch(() => ({}) as Body);
  if (isSpam(body)) return c.json({ ok: true, ignored: true });

  const cls = await openClass(c.env.DB, body.class_id);
  if (!cls) return c.json({ ok: false, error: 'class_unavailable' }, 404);

  const { errors, name, email, phone } = contactFields(body);
  const level = str(body, 'level');
  if (!['1', '2', '3'].includes(level)) errors.push({ field: 'level', code: 'choice' });

  // Only SPRAT/IRATA classes ask the cert question; otherwise it's implied.
  let cert_choice: CertChoice = 'single';
  let single_cert: Cert | null = cls.cert_type === 'IRATA' ? 'IRATA' : 'SPRAT';
  if (cls.cert_type === 'SPRAT/IRATA') {
    const cert = str(body, 'cert');
    if (cert === 'dual') { cert_choice = 'dual'; single_cert = null; }
    else if (cert === 'SPRAT' || cert === 'IRATA') single_cert = cert;
    else errors.push({ field: 'cert', code: 'choice' } satisfies FieldError);
  }
  if (errors.length) return c.json({ ok: false, errors }, 400);

  const dupe = await c.env.DB
    .prepare(`SELECT id FROM registrations WHERE class_id = ? AND lower(email) = lower(?) AND status != 'cancelled'`)
    .bind(cls.id, email)
    .first();
  if (dupe) return c.json({ ok: false, error: 'duplicate' }, 409);

  const reg = await createRegistration(c.env.DB, {
    class_id: cls.id, name, email, phone, level, cert_choice, single_cert, language: lang(body),
  });
  const position = await standbyPosition(c.env.DB, reg);
  const after = (await getClass(c.env.DB, cls.id))!;

  const sent = await logEmails(c.env.DB, [
    reg.status === 'standby'
      ? emails.standbyEmail(reg, cls, position!)
      : emails.registeredEmail(reg, cls, 'reg_confirm'),
    emails.adminNewRegEmail(reg, cls, position, after),
  ]);

  const { registered, standby, capacity, ...publicCls } = after;
  return c.json({
    ok: true,
    registration: {
      status: reg.status, position, level: reg.level, cert_choice: reg.cert_choice,
      single_cert: reg.single_cert, name: reg.name, email: reg.email,
    },
    class: publicCls,
    emails: sent,
  });
});

publicRoutes.post('/info-requests', async (c) => {
  const body = await c.req.json<Body>().catch(() => ({}) as Body);
  if (isSpam(body)) return c.json({ ok: true, ignored: true });

  const { errors, name, email, phone } = contactFields(body);
  const message = str(body, 'message');
  if (message.length > 2000) errors.push({ field: 'message', code: 'too_long' });
  if (errors.length) return c.json({ ok: false, errors }, 400);

  // A class is optional; an unknown or past one is just dropped.
  const cls: ClassRow | null = body.class_id ? await openClass(c.env.DB, body.class_id) : null;

  const req = await c.env.DB
    .prepare(`INSERT INTO info_requests (class_id, name, email, phone, message, language)
              VALUES (?, ?, ?, ?, ?, ?) RETURNING *`)
    .bind(cls?.id ?? null, name, email, phone, message || null, lang(body))
    .first<InfoRequest>();

  const sent = await logEmails(c.env.DB, [emails.infoAdminEmail(req!, cls)]);
  return c.json({ ok: true, emails: sent });
});
