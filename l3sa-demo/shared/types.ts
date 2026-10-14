// Shapes shared by the Worker API and the browser scripts.

export type Lang = 'en' | 'es';
export type CertType = 'SPRAT' | 'IRATA' | 'SPRAT/IRATA';
export type Cert = 'SPRAT' | 'IRATA';
export type CertChoice = 'single' | 'dual';
export type Status = 'registered' | 'standby' | 'cancelled';

export interface ClassRow {
  id: number;
  start_date: string;
  end_date: string;
  cert_type: CertType;
  price_single: number;
  price_dual: number;
  capacity: number;
  notes: string | null;
}

/** A class plus live seat counts. */
export interface ClassSummary extends ClassRow {
  registered: number;
  standby: number;
}

export interface Registration {
  id: number;
  class_id: number;
  name: string;
  email: string;
  phone: string;
  level: '1' | '2' | '3';
  cert_choice: CertChoice;
  single_cert: Cert | null;
  language: Lang;
  status: Status;
  standby_since: string | null;
  created_at: string;
}

export interface InfoRequest {
  id: number;
  class_id: number | null;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  language: Lang;
  handled: number;
  created_at: string;
}

export interface EmailPreview {
  to_address: string;
  subject: string;
  body: string;
  kind: string;
  created_at?: string;
}

/** Field-level validation failure; `code` is translated on the client. */
export interface FieldError {
  field: string;
  code: 'required' | 'email' | 'phone' | 'choice' | 'too_long';
}

export const ADMIN_EMAIL = 'training@L3SA.com';
