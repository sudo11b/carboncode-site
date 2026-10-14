// Formatting used by both the email templates (Worker) and the pages (browser).

import type { Cert, CertType, Lang } from './types';

const locale = (lang: Lang) => (lang === 'es' ? 'es-MX' : 'en-US');

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** "Mon, Oct 19 – Fri, Oct 23, 2026" / "lun. 19 de oct. – vie. 23 de oct. de 2026" */
export function dateRange(start: string, end: string, lang: Lang): string {
  const fmt = new Intl.DateTimeFormat(locale(lang), {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
  const year = utcDate(end).getUTCFullYear();
  return lang === 'es'
    ? `${fmt.format(utcDate(start))} – ${fmt.format(utcDate(end))} de ${year}`
    : `${fmt.format(utcDate(start))} – ${fmt.format(utcDate(end))}, ${year}`;
}

/** Short form for card headings: "Oct 19 – 23" or "Nov 30 – Dec 4". */
export function dateRangeShort(start: string, end: string, lang: Lang): string {
  const s = utcDate(start), e = utcDate(end);
  const month = new Intl.DateTimeFormat(locale(lang), { month: 'short', timeZone: 'UTC' });
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  if (lang === 'es') {
    return sameMonth
      ? `${s.getUTCDate()} – ${e.getUTCDate()} ${month.format(e)}`
      : `${s.getUTCDate()} ${month.format(s)} – ${e.getUTCDate()} ${month.format(e)}`;
  }
  return sameMonth
    ? `${month.format(s)} ${s.getUTCDate()} – ${e.getUTCDate()}`
    : `${month.format(s)} ${s.getUTCDate()} – ${month.format(e)} ${e.getUTCDate()}`;
}

export function year(iso: string): number {
  return utcDate(iso).getUTCFullYear();
}

export function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

/** Timestamp in Houston time, e.g. "Oct 3, 9:45 AM". */
export function stamp(isoUtc: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Chicago',
  }).format(new Date(isoUtc));
}

/** Today's date in Houston as YYYY-MM-DD. */
export function todayCentral(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
}

/** Which certs a class offers. */
export function certsOffered(type: CertType): Cert[] {
  return type === 'SPRAT/IRATA' ? ['SPRAT', 'IRATA'] : [type];
}

export const isDual = (type: CertType) => type === 'SPRAT/IRATA';

/** Friday of the week that `start` falls in (classes run Mon–Fri). */
export function fridayOf(start: string): string {
  const d = utcDate(start);
  const offset = (5 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function isMonday(iso: string): boolean {
  return utcDate(iso).getUTCDay() === 1;
}
