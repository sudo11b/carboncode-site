// Public sign-up flow: class list, register / standby form, info request form,
// confirmation with email previews. Views are switched by the URL hash so the
// phone's back button works:
//   #classes (or none)  class list
//   #register-<id>      register or join standby for a class
//   #info / #info-<id>  request info, optionally about a class
//   #done               confirmation for the last submission

import type { ClassRow, EmailPreview, FieldError } from '../../shared/types';
import { dateRange, dateRangeShort, isDual, money, year } from '../../shared/format';
import { applyStatic, getLang, onLangChange, setLang, t } from './i18n';
import type { StringKey } from '../i18n/strings';
import { $, fill, h, svgIcon, ICON_CHECK, ICON_CLOCK } from './dom';
import { emailCard } from './emailCard';

type PublicClass = Omit<ClassRow, 'capacity'> & { full: boolean };

interface RegistrationDone {
  type: 'registration';
  status: 'registered' | 'standby';
  position: number | null;
  level: string;
  cert_choice: 'single' | 'dual';
  single_cert: string | null;
  cls: PublicClass;
  emails: EmailPreview[];
}
interface InfoDone { type: 'info'; emails: EmailPreview[] }

let classes: PublicClass[] = [];
let loadFailed = false;
let done: RegistrationDone | InfoDone | null = null;

const views = ['view-list', 'view-register', 'view-info', 'view-done'] as const;

// ---- Data ----------------------------------------------------------------

async function loadClasses(): Promise<void> {
  try {
    const res = await fetch('/api/classes');
    if (!res.ok) throw new Error(String(res.status));
    classes = await res.json();
    loadFailed = false;
  } catch {
    loadFailed = true;
  }
}

const findClass = (id: number) => classes.find((c) => c.id === id);

// ---- Rendering -----------------------------------------------------------

function certLabel(type: PublicClass['cert_type']): string {
  return t(`cert.${type}` as StringKey);
}

function statusBadge(cls: PublicClass): HTMLElement {
  return cls.full
    ? h('span', { class: 'badge badge-full', text: t('class.full') })
    : h('span', { class: 'badge badge-open', text: t('class.open') });
}

function priceLine(cls: PublicClass): HTMLElement {
  return h('span', {},
    h('strong', { text: money(cls.price_single) }), ` ${t('class.single')}`,
    isDual(cls.cert_type) ? [' · ', h('strong', { text: money(cls.price_dual) }), ` ${t('class.dual')}`] : null,
  );
}

function renderList(): void {
  const list = $('#class-list');
  const status = $('#classes-status');
  fill(list);
  if (loadFailed || classes.length === 0) {
    status.hidden = false;
    status.textContent = t(loadFailed ? 'classes.error' : 'classes.empty');
    return;
  }
  status.hidden = true;
  const lang = getLang();
  for (const cls of classes) {
    list.append(
      h('li', { class: 'class-card' },
        h('div', {},
          h('div', { class: 'top' },
            h('div', {},
              h('div', { class: 'class-dates', text: dateRangeShort(cls.start_date, cls.end_date, lang) }),
              h('div', { class: 'class-year', text: String(year(cls.start_date)) }),
            ),
            statusBadge(cls),
          ),
          h('div', { class: 'class-meta', style: 'margin-top:10px' },
            h('span', { class: 'badge badge-cert', text: certLabel(cls.cert_type) }),
            priceLine(cls),
          ),
          cls.notes ? h('p', { class: 'class-note', style: 'margin-top:8px', text: cls.notes }) : null,
        ),
        h('div', { class: 'class-actions' },
          h('a', { class: 'btn btn-primary', href: `#register-${cls.id}`, text: t(cls.full ? 'class.standby' : 'class.register') }),
          h('a', { class: 'btn btn-secondary', href: `#info-${cls.id}`, text: t('class.info') }),
        ),
      ),
    );
  }
}

function classSummary(cls: PublicClass): HTMLElement[] {
  return [
    h('div', { class: 'top', style: 'display:flex;justify-content:space-between;gap:12px;align-items:flex-start' },
      h('div', { class: 'class-dates', text: dateRange(cls.start_date, cls.end_date, getLang()) }),
      statusBadge(cls),
    ),
    h('div', { class: 'class-meta', style: 'margin-top:6px' },
      h('span', { class: 'badge badge-cert', text: certLabel(cls.cert_type) }),
      priceLine(cls),
    ),
  ];
}

function renderRegister(cls: PublicClass): void {
  const form = $<HTMLFormElement>('#register-form');
  (form.elements.namedItem('class_id') as HTMLInputElement).value = String(cls.id);
  $('#register-title').textContent = t(cls.full ? 'form.standby.title' : 'form.register.title');
  fill($('#register-summary'), ...classSummary(cls));
  $('#register-standby-notice').hidden = !cls.full;
  $('#register-submit').textContent = t(cls.full ? 'form.submit.standby' : 'form.submit.register');

  const box = $('#cert-choices');
  const previous = (form.querySelector<HTMLInputElement>('input[name=cert]:checked'))?.value;
  if (isDual(cls.cert_type)) {
    const opts: Array<[string, StringKey, number]> = [
      ['SPRAT', 'form.cert.SPRAT', cls.price_single],
      ['IRATA', 'form.cert.IRATA', cls.price_single],
      ['dual', 'form.cert.dual', cls.price_dual],
    ];
    fill(box, h('div', { class: 'choices' },
      opts.map(([value, key, price]) =>
        h('label', { class: 'choice' },
          h('input', { type: 'radio', name: 'cert', value, checked: previous === value }),
          h('span', {}, t(key), h('small', { text: money(price) })),
        )),
    ));
  } else {
    fill(box, h('p', { class: 'hint', style: 'margin:0;font-size:1rem;color:var(--text)' },
      t('form.cert.fixed', { cert: cls.cert_type }), ' ', h('strong', { text: money(cls.price_single) }),
    ));
  }
}

function renderInfoSelect(selectedId: number | null): void {
  const select = $<HTMLSelectElement>('#i-class');
  const keep = selectedId ?? (select.value ? Number(select.value) : null);
  fill(select, 
    h('option', { value: '', text: t('form.info.general') }),
    ...classes.map((c) =>
      h('option', {
        value: String(c.id),
        selected: c.id === keep,
        text: `${dateRange(c.start_date, c.end_date, getLang())} · ${c.cert_type}${c.full ? ` · ${t('class.full')}` : ''}`,
      })),
  );
}

function renderDone(): void {
  const root = $('#done-content');
  if (!done) return;
  const back = h('a', { class: 'btn btn-secondary', href: '#classes', text: t('done.back') });
  const labels = (who: string) => ({ who, to: t('preview.to'), subject: t('preview.subject') });
  const previews = (cards: HTMLElement[]) =>
    h('div', { class: 'previews' },
      h('h3', { text: t('preview.title') }),
      h('p', { text: t('preview.lead') }),
      cards,
    );

  if (done.type === 'info') {
    fill(root, 
      h('div', { class: 'panel' },
        h('div', { class: 'done-head' },
          h('div', { class: 'done-icon' }, svgIcon(ICON_CHECK)),
          h('div', {}, h('h2', { text: t('done.info.title') }), h('p', { text: t('done.info.lead') })),
        ),
        back,
      ),
      done.emails.length ? previews(done.emails.map((e) => emailCard(e, labels(t('preview.admin'))))) : null,
    );
    return;
  }

  const d = done;
  const standby = d.status === 'standby';
  const cert = d.cert_choice === 'dual'
    ? t('form.cert.dual')
    : t(`form.cert.${d.single_cert ?? 'SPRAT'}` as StringKey);
  const price = d.cert_choice === 'dual' ? d.cls.price_dual : d.cls.price_single;

  fill(root, 
    h('div', { class: 'panel' },
      h('div', { class: 'done-head' },
        h('div', { class: `done-icon${standby ? ' standby' : ''}` }, svgIcon(standby ? ICON_CLOCK : ICON_CHECK)),
        h('div', {},
          h('h2', { text: t(standby ? 'done.standby.title' : 'done.registered.title') }),
          h('p', { text: standby ? t('done.standby.lead', { n: d.position ?? '' }) : t('done.registered.lead') }),
        ),
      ),
      h('dl', { class: 'summary-list' },
        h('dt', { text: t('done.summary.class') }),
        h('dd', { text: `${dateRange(d.cls.start_date, d.cls.end_date, getLang())} · ${d.cls.cert_type}` }),
        h('dt', { text: t('done.summary.level') }), h('dd', { text: d.level }),
        h('dt', { text: t('done.summary.cert') }), h('dd', { text: cert }),
        h('dt', { text: t('done.summary.price') }), h('dd', { text: money(price) }),
      ),
      h('p', { class: `notice ${standby ? 'notice-warn' : 'notice-ok'}`, text: t(standby ? 'done.standbyPay' : 'done.invoice') }),
      back,
    ),
    previews(d.emails.map((e) =>
      emailCard(e, labels(t(e.kind === 'admin_new_reg' ? 'preview.admin' : 'preview.student'))))),
  );
}

// ---- Routing -------------------------------------------------------------

function show(view: (typeof views)[number]): void {
  for (const v of views) $(`#${v}`).hidden = v !== view;
}

function route(): void {
  const hash = location.hash.slice(1);
  let m: RegExpMatchArray | null;

  if ((m = hash.match(/^register-(\d+)$/))) {
    const cls = findClass(Number(m[1]));
    if (cls) {
      clearErrors($<HTMLFormElement>('#register-form'));
      renderRegister(cls);
      show('view-register');
      window.scrollTo(0, 0);
      return;
    }
  } else if ((m = hash.match(/^info(?:-(\d+))?$/))) {
    renderInfoSelect(m[1] ? Number(m[1]) : null);
    clearErrors($<HTMLFormElement>('#info-form'));
    show('view-info');
    window.scrollTo(0, 0);
    return;
  } else if (hash === 'done' && done) {
    renderDone();
    show('view-done');
    window.scrollTo(0, 0);
    $('#done-content').focus({ preventScroll: true });
    return;
  }

  show('view-list');
  if (hash === 'classes') $('#classes').scrollIntoView();
}

// ---- Forms ---------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll('.field-error').forEach((e) => e.remove());
  form.querySelectorAll('.has-error').forEach((e) => e.classList.remove('has-error'));
  form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  const err = form.querySelector<HTMLElement>('.form-error');
  if (err) err.hidden = true;
}

function showErrors(form: HTMLFormElement, errors: FieldError[]): void {
  for (const { field, code } of errors) {
    const wrap = form.querySelector<HTMLElement>(`[data-field="${field}"]`)
      ?? form.querySelector<HTMLElement>(`[name="${field}"]`)?.closest<HTMLElement>('.field');
    if (!wrap || wrap.querySelector('.field-error')) continue;
    wrap.classList.add('has-error');
    const id = `err-${form.id}-${field}`;
    wrap.append(h('p', { class: 'field-error', id, text: t(`err.${code}` as StringKey) }));
    const input = wrap.querySelector('input:not([type=radio]), select, textarea');
    input?.setAttribute('aria-invalid', 'true');
    input?.setAttribute('aria-describedby', id);
  }
  const first = form.querySelector<HTMLElement>('.has-error input, .has-error select, .has-error textarea');
  first?.focus();
}

function formError(form: HTMLFormElement, key: StringKey): void {
  const el = form.querySelector<HTMLElement>('.form-error')!;
  el.textContent = t(key);
  el.hidden = false;
}

function validateContact(data: Record<string, string>): FieldError[] {
  const errors: FieldError[] = [];
  if (!data.name?.trim()) errors.push({ field: 'name', code: 'required' });
  if (!data.email?.trim()) errors.push({ field: 'email', code: 'required' });
  else if (!EMAIL_RE.test(data.email.trim())) errors.push({ field: 'email', code: 'email' });
  const digits = (data.phone ?? '').replace(/\D/g, '');
  if (!data.phone?.trim()) errors.push({ field: 'phone', code: 'required' });
  else if (digits.length < 10 || digits.length > 15) errors.push({ field: 'phone', code: 'phone' });
  return errors;
}

async function submit(form: HTMLFormElement, url: string, data: Record<string, unknown>) {
  const button = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = t('form.sending');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, language: getLang() }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'generic' };
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

function handleFailure(form: HTMLFormElement, json: { errors?: FieldError[]; error?: string }): void {
  if (json.errors?.length) showErrors(form, json.errors);
  else if (json.error === 'duplicate' || json.error === 'class_unavailable') formError(form, `err.${json.error}`);
  else formError(form, 'err.generic');
}

$<HTMLFormElement>('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  clearErrors(form);
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const cls = findClass(Number(data.class_id));
  if (!cls) return formError(form, 'err.class_unavailable');

  const errors = validateContact(data);
  if (!data.level) errors.push({ field: 'level', code: 'choice' });
  if (isDual(cls.cert_type) && !data.cert) errors.push({ field: 'cert', code: 'choice' });
  if (errors.length) return showErrors(form, errors);

  const json = await submit(form, '/api/registrations', data);
  if (!json.ok) return handleFailure(form, json);
  if (json.ignored) { done = { type: 'info', emails: [] }; location.hash = 'done'; return; }

  done = {
    type: 'registration',
    status: json.registration.status,
    position: json.registration.position,
    level: json.registration.level,
    cert_choice: json.registration.cert_choice,
    single_cert: json.registration.single_cert,
    cls: json.class,
    emails: json.emails,
  };
  form.reset();
  await loadClasses();
  renderList();
  location.hash = 'done';
});

$<HTMLFormElement>('#info-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  clearErrors(form);
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const errors = validateContact(data);
  if (errors.length) return showErrors(form, errors);

  const json = await submit(form, '/api/info-requests', { ...data, class_id: data.class_id ? Number(data.class_id) : null });
  if (!json.ok) return handleFailure(form, json);
  done = { type: 'info', emails: json.ignored ? [] : json.emails };
  form.reset();
  location.hash = 'done';
});

// ---- Boot ----------------------------------------------------------------

$('#lang-toggle').addEventListener('click', () => setLang(getLang() === 'en' ? 'es' : 'en'));

onLangChange(() => {
  const toggle = $('#lang-toggle');
  toggle.setAttribute('lang', getLang() === 'en' ? 'es' : 'en');
  renderList();
  const hash = location.hash.slice(1);
  const reg = hash.match(/^register-(\d+)$/);
  if (reg && findClass(Number(reg[1]))) renderRegister(findClass(Number(reg[1]))!);
  if (hash.startsWith('info')) renderInfoSelect(null);
  if (hash === 'done') renderDone();
  // Re-translate any visible field errors.
  document.querySelectorAll('form').forEach((f) => clearErrors(f));
});

window.addEventListener('hashchange', route);

applyStatic();
$('#lang-toggle').setAttribute('lang', getLang() === 'en' ? 'es' : 'en');
loadClasses().then(() => {
  renderList();
  route();
});
