// Every email the system would send. Nothing is actually sent: each message is
// written to email_log and returned so the page can show it as a preview.
// Student emails use the student's language; Tony's are always English.

import { ADMIN_EMAIL, type ClassRow, type EmailPreview, type InfoRequest, type Lang, type Registration } from '../../shared/types';
import { dateRange, money } from '../../shared/format';

const BUSINESS = {
  address: '27355 W Hardy Rd, Suite 105, Spring, TX 77373',
  phone: '346-305-9893',
  email: ADMIN_EMAIL,
};

function certLine(reg: Registration, cls: ClassRow, lang: Lang): string {
  if (reg.cert_choice === 'dual') {
    return lang === 'es'
      ? `Doble (SPRAT + IRATA) — ${money(cls.price_dual)}`
      : `Dual (SPRAT + IRATA) — ${money(cls.price_dual)}`;
  }
  return `${reg.single_cert ?? 'SPRAT'} — ${money(cls.price_single)}`;
}

function fridayLine(reg: Registration, lang: Lang): string {
  const certs = reg.cert_choice === 'dual' ? ['SPRAT', 'IRATA'] : [reg.single_cert ?? 'SPRAT'];
  if (lang === 'es') {
    const what = certs.length > 1 ? 'la evaluación SPRAT e IRATA' : `la evaluación ${certs[0]}`;
    return `de lunes a jueves, de 8 a. m. a 5 p. m. El viernes es ${what}.`;
  }
  const what = certs.map((c) => (c === 'SPRAT' ? 'SPRAT evaluation' : 'IRATA assessment')).join(' and ');
  return `8am–5pm Monday–Thursday. Friday is your ${what}.`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

function signature(lang: Lang): string {
  return lang === 'es'
    ? `¿Preguntas? Llame o escriba por WhatsApp al ${BUSINESS.phone}, o escriba a ${BUSINESS.email}.\n\nL3SA — Level 3 Services America`
    : `Questions? Call or WhatsApp ${BUSINESS.phone}, or email ${BUSINESS.email}.\n\nL3SA — Level 3 Services America`;
}

function classDetails(reg: Registration, cls: ClassRow, lang: Lang): string {
  const range = dateRange(cls.start_date, cls.end_date, lang);
  return lang === 'es'
    ? [
        `Curso: ${cls.cert_type}, ${range}`,
        `Nivel: ${reg.level}`,
        `Certificación: ${certLine(reg, cls, lang)}`,
        `Horario: ${fridayLine(reg, lang)}`,
        `Dirección: ${BUSINESS.address}`,
      ].join('\n')
    : [
        `Class: ${cls.cert_type}, ${range}`,
        `Level: ${reg.level}`,
        `Certification: ${certLine(reg, cls, lang)}`,
        `Schedule: ${fridayLine(reg, lang)}`,
        `Location: ${BUSINESS.address}`,
      ].join('\n');
}

/** "You're registered" — sent on signup and on promotion from standby. */
function registeredEmail(reg: Registration, cls: ClassRow, kind: 'reg_confirm' | 'promoted'): EmailPreview {
  const lang = reg.language;
  const range = dateRange(cls.start_date, cls.end_date, lang);
  const es = lang === 'es';
  const opener = kind === 'promoted'
    ? (es ? 'Buenas noticias: se abrió un lugar en el curso y es suyo.' : 'Good news: a seat opened up and you’re in.')
    : (es ? 'Su inscripción en el curso de acceso por cuerda de L3SA está confirmada.' : 'You’re registered for rope access training at L3SA.');
  const subject = kind === 'promoted'
    ? (es ? `Se abrió un lugar: ${cls.cert_type}, ${range}` : `A seat opened up: ${cls.cert_type}, ${range}`)
    : (es ? `Inscripción confirmada: ${cls.cert_type}, ${range}` : `You’re registered: ${cls.cert_type}, ${range}`);
  const next = es
    ? 'Próximo paso: Tony le enviará una factura por correo electrónico. No se cobra nada en el sitio web.'
    : 'What happens next: Tony will email you an invoice. No payment is taken on the website.';
  return {
    to_address: reg.email,
    subject,
    body: `${es ? `Hola, ${firstName(reg.name)}:` : `Hi ${firstName(reg.name)},`}\n\n${opener}\n\n${classDetails(reg, cls, lang)}\n\n${next}\n\n${signature(lang)}`,
    kind,
  };
}

function standbyEmail(reg: Registration, cls: ClassRow, position: number): EmailPreview {
  const lang = reg.language;
  const range = dateRange(cls.start_date, cls.end_date, lang);
  const es = lang === 'es';
  return {
    to_address: reg.email,
    subject: es
      ? `Lista de espera (n.º ${position}): ${cls.cert_type}, ${range}`
      : `You’re on the standby list (#${position}): ${cls.cert_type}, ${range}`,
    body: es
      ? `Hola, ${firstName(reg.name)}:\n\nEste curso está lleno, así que su nombre quedó en la lista de espera. Su lugar en la lista: n.º ${position}.\n\nSi se abre un lugar, Tony se comunicará con usted directamente. No tiene que pagar nada a menos que obtenga un lugar.\n\n${classDetails(reg, cls, lang)}\n\n${signature(lang)}`
      : `Hi ${firstName(reg.name)},\n\nThis class is full, so you’ve been added to the standby list. Your position: #${position}.\n\nIf a seat opens up, Tony will contact you directly. There’s nothing to pay unless you get a seat.\n\n${classDetails(reg, cls, lang)}\n\n${signature(lang)}`,
    kind: 'standby_confirm',
  };
}

function adminNewRegEmail(reg: Registration, cls: ClassRow, position: number | null, counts: { registered: number; standby: number }): EmailPreview {
  const range = dateRange(cls.start_date, cls.end_date, 'en');
  const standby = reg.status === 'standby';
  const cert = reg.cert_choice === 'dual' ? 'Dual (SPRAT + IRATA)' : `Single (${reg.single_cert ?? 'SPRAT'})`;
  return {
    to_address: ADMIN_EMAIL,
    subject: standby
      ? `New standby signup: ${reg.name}, ${cls.cert_type} ${range}`
      : `New registration: ${reg.name}, ${cls.cert_type} ${range}`,
    body: [
      standby
        ? `${reg.name} joined the standby list (#${position}). The class is full.`
        : `${reg.name} registered for a class.`,
      '',
      `Class: ${cls.cert_type}, ${range}`,
      `Name: ${reg.name}`,
      `Email: ${reg.email}`,
      `Phone: ${reg.phone}`,
      `Level: ${reg.level}`,
      `Certification: ${cert}, ${money(reg.cert_choice === 'dual' ? cls.price_dual : cls.price_single)}`,
      `Language: ${reg.language === 'es' ? 'Spanish' : 'English'}`,
      '',
      `Class now: ${counts.registered} of ${cls.capacity} seats filled, ${counts.standby} on standby.`,
      '',
      standby ? 'Next step: contact them if a seat opens up.' : 'Next step: send the invoice.',
    ].join('\n'),
    kind: 'admin_new_reg',
  };
}

function movedEmail(reg: Registration, from: ClassRow, to: ClassRow, position: number | null): EmailPreview {
  const lang = reg.language;
  const es = lang === 'es';
  const toRange = dateRange(to.start_date, to.end_date, lang);
  const fromRange = dateRange(from.start_date, from.end_date, lang);
  const status = reg.status === 'standby'
    ? (es
        ? `Ese curso está lleno, así que está en la lista de espera (n.º ${position}). Tony se comunicará con usted si se abre un lugar.`
        : `That class is full, so you’re on its standby list (#${position}). Tony will contact you if a seat opens up.`)
    : (es ? 'Tiene un lugar confirmado en el nuevo curso.' : 'You have a confirmed seat in the new class.');
  return {
    to_address: reg.email,
    subject: es ? `Cambio de curso: ahora ${to.cert_type}, ${toRange}` : `Your class has changed: now ${to.cert_type}, ${toRange}`,
    body: es
      ? `Hola, ${firstName(reg.name)}:\n\nSu inscripción se cambió del curso del ${fromRange} al curso del ${toRange}.\n\n${status}\n\n${classDetails(reg, to, lang)}\n\n${signature(lang)}`
      : `Hi ${firstName(reg.name)},\n\nYou’ve been moved from the ${fromRange} class to the ${toRange} class.\n\n${status}\n\n${classDetails(reg, to, lang)}\n\n${signature(lang)}`,
    kind: 'moved',
  };
}

function infoAdminEmail(req: InfoRequest, cls: ClassRow | null): EmailPreview {
  const about = cls ? `${cls.cert_type}, ${dateRange(cls.start_date, cls.end_date, 'en')}` : 'General question (no class selected)';
  return {
    to_address: ADMIN_EMAIL,
    subject: `Info request: ${req.name}${cls ? `, ${cls.cert_type} ${dateRange(cls.start_date, cls.end_date, 'en')}` : ''}`,
    body: [
      `${req.name} asked for more information.`,
      '',
      `About: ${about}`,
      `Name: ${req.name}`,
      `Email: ${req.email}`,
      `Phone: ${req.phone}`,
      `Language: ${req.language === 'es' ? 'Spanish (reply in Spanish)' : 'English'}`,
      '',
      'Message:',
      req.message?.trim() || '(no message)',
      '',
      'This request does not hold a seat.',
    ].join('\n'),
    kind: 'info_admin',
  };
}

export const emails = { registeredEmail, standbyEmail, adminNewRegEmail, movedEmail, infoAdminEmail };

/** Writes previews to email_log and returns them (with timestamps). */
export async function logEmails(db: D1Database, previews: EmailPreview[]): Promise<EmailPreview[]> {
  if (previews.length === 0) return [];
  const rows = await db.batch(
    previews.map((p) =>
      db.prepare('INSERT INTO email_log (to_address, subject, body, kind) VALUES (?, ?, ?, ?) RETURNING *')
        .bind(p.to_address, p.subject, p.body, p.kind),
    ),
  );
  return rows.map((r) => (r.results as EmailPreview[])[0]);
}
