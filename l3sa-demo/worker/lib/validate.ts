// Server-side validation for the public forms. Error codes are translated in
// the browser, so this file stays language-free.

import type { FieldError } from '../../shared/types';

export type Body = Record<string, unknown>;

export function str(body: Body, key: string): string {
  const v = body[key];
  return typeof v === 'string' ? v.trim() : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Name, email, phone: the fields both public forms share. */
export function contactFields(body: Body): { errors: FieldError[]; name: string; email: string; phone: string } {
  const errors: FieldError[] = [];
  const name = str(body, 'name');
  const email = str(body, 'email');
  const phone = str(body, 'phone');

  if (!name) errors.push({ field: 'name', code: 'required' });
  else if (name.length > 100) errors.push({ field: 'name', code: 'too_long' });

  if (!email) errors.push({ field: 'email', code: 'required' });
  else if (!EMAIL_RE.test(email) || email.length > 200) errors.push({ field: 'email', code: 'email' });

  const digits = phone.replace(/\D/g, '');
  if (!phone) errors.push({ field: 'phone', code: 'required' });
  else if (digits.length < 10 || digits.length > 15) errors.push({ field: 'phone', code: 'phone' });

  return { errors, name, email, phone };
}

/** Honeypot: a hidden "website" field real people never fill in. */
export function isSpam(body: Body): boolean {
  return str(body, 'website') !== '';
}

export function lang(body: Body): 'en' | 'es' {
  return body.language === 'es' ? 'es' : 'en';
}
