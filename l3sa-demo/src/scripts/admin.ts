// Admin page. English only. Routes by hash:
//   #classes, #class-<id>, #new-class, #edit-<id>, #info, #emails

import type { ClassSummary, EmailPreview, InfoRequest, Registration } from '../../shared/types';
import { dateRange, fridayOf, isMonday, money, stamp } from '../../shared/format';
import { $, fill, h } from './dom';
import { emailCard } from './emailCard';

type Tone = 'ok' | 'warn' | 'info';
interface Flash { message: string; tone: Tone; emails?: EmailPreview[] }
type StandbyReg = Registration & { position: number };
interface Roster { class: ClassSummary; registered: Registration[]; standby: StandbyReg[]; cancelled: Registration[] }
type InfoRow = InfoRequest & { start_date: string | null; end_date: string | null; cert_type: string | null };

let classes: ClassSummary[] = [];
let flash: Flash | null = null;
let keepFlash = false;

const KIND_LABELS: Record<string, string> = {
  reg_confirm: 'To student: registration confirmed',
  standby_confirm: 'To student: standby confirmation',
  admin_new_reg: 'To L3SA: new signup',
  info_admin: 'To L3SA: info request',
  promoted: 'To student: promoted from standby',
  moved: 'To student: class changed',
};

// ---- API -----------------------------------------------------------------

async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: init.method ?? 'GET',
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }));
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json;
}

async function loadClasses() {
  classes = await api<ClassSummary[]>('/classes');
}

async function refreshInfoCount() {
  const rows = await api<InfoRow[]>('/info-requests');
  const open = rows.filter((r) => !r.handled).length;
  const pill = $('#info-count');
  pill.textContent = String(open);
  pill.hidden = open === 0;
}

// ---- Flash ---------------------------------------------------------------

function setFlash(f: Flash) {
  flash = f;
  keepFlash = true;
}

function renderFlash() {
  const root = $('#flash');
  if (!flash) return fill(root);
  const f = flash;
  fill(root, 
    h('div', { class: `notice notice-${f.tone}`, role: 'status' },
      h('span', { text: f.message }),
      h('button', { class: 'btn btn-ghost btn-small', type: 'button', 'aria-label': 'Dismiss', text: '✕',
        onclick: () => { flash = null; renderFlash(); } }),
    ),
    f.emails?.length
      ? h('div', { class: 'previews', style: 'margin-top:12px' },
          h('p', { text: 'Email preview (not sent):' }),
          f.emails.map((e) => emailCard(e, { who: KIND_LABELS[e.kind], to: 'To', subject: 'Subject' })))
      : null,
  );
}

// ---- Helpers -------------------------------------------------------------

const range = (c: { start_date: string; end_date: string }) => dateRange(c.start_date, c.end_date, 'en');
const openSeats = (c: ClassSummary) => Math.max(0, c.capacity - c.registered);

function certText(r: Registration): string {
  return r.cert_choice === 'dual' ? 'Dual (SPRAT + IRATA)' : `Single (${r.single_cert ?? 'SPRAT'})`;
}

function seatBadge(c: ClassSummary): HTMLElement {
  const open = openSeats(c);
  if (open > 0 && c.standby > 0) {
    return h('span', { class: 'badge badge-full', text: `${open} seat${open > 1 ? 's' : ''} open · ${c.standby} on standby` });
  }
  if (open === 0) return h('span', { class: 'badge badge-full', text: 'Full' });
  return h('span', { class: 'badge badge-open', text: `${open} open` });
}

function meter(c: ClassSummary): HTMLElement {
  const pct = Math.min(100, Math.round((c.registered / c.capacity) * 100));
  return h('div', { class: `meter${c.registered >= c.capacity ? ' full' : ''}` }, h('i', { style: `width:${pct}%` }));
}

async function act(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    setFlash({ message: (err as Error).message, tone: 'warn' });
    await route();
  }
}

// ---- Classes tab ---------------------------------------------------------

function renderClassList() {
  const root = $('#tab-classes');
  fill(root, 
    h('div', { class: 'roster-head' },
      h('h2', { style: 'margin:0', text: 'Upcoming classes' }),
      h('a', { class: 'btn btn-primary btn-small', href: '#new-class', text: '+ Add class' }),
    ),
    classes.length === 0
      ? h('p', { class: 'empty', text: 'No upcoming classes. Add one to get started.' })
      : h('ul', { class: 'admin-list' },
          classes.map((c) =>
            h('li', {},
              h('button', { class: 'admin-class', type: 'button', onclick: () => (location.hash = `class-${c.id}`) },
                h('div', { class: 'line' },
                  h('span', { class: 'dates', text: range(c) }),
                  h('span', { class: 'badge badge-cert', text: c.cert_type }),
                ),
                h('div', {},
                  h('div', { class: 'stat' },
                    h('b', { text: `${c.registered}/${c.capacity}` }), ' registered · ',
                    h('b', { text: String(c.standby) }), ' standby'),
                  h('div', { style: 'margin-top:6px' }, meter(c)),
                ),
                h('div', {}, seatBadge(c)),
              ),
            )),
        ),
  );
}

function studentRow(r: Registration, roster: Roster): HTMLElement {
  const cls = roster.class;
  const isStandby = r.status === 'standby';
  const canPromote = isStandby && openSeats(cls) > 0;
  const actions = h('div', { class: 'actions' });

  const showButtons = () => fill(actions, 
    canPromote ? h('button', { class: 'btn btn-primary btn-small', type: 'button', text: 'Promote', onclick: () => promote(r) }) : null,
    h('button', { class: 'btn btn-secondary btn-small', type: 'button', text: 'Move', onclick: showMove }),
    h('button', { class: 'btn btn-danger btn-small', type: 'button', text: 'Remove', onclick: () => remove(r) }),
  );

  function showMove() {
    const others = classes.filter((c) => c.id !== cls.id);
    if (others.length === 0) {
      setFlash({ message: 'There are no other upcoming classes to move to.', tone: 'info' });
      renderFlash();
      return;
    }
    const select = h('select', { 'aria-label': `Move ${r.name} to` },
      others.map((c) => h('option', {
        value: String(c.id),
        text: `${range(c)} · ${c.cert_type} · ${c.registered}/${c.capacity}${openSeats(c) === 0 ? ' (full, goes to standby)' : ''}`,
      })),
    );
    fill(actions, h('div', { class: 'move-box' },
      select,
      h('button', { class: 'btn btn-primary btn-small', type: 'button', text: 'Move', onclick: () => move(r, Number(select.value)) }),
      h('button', { class: 'btn btn-ghost btn-small', type: 'button', text: 'Cancel', onclick: showButtons }),
    ));
    select.focus();
  }

  if (r.status !== 'cancelled') showButtons();

  return h('div', { class: `student${r.status === 'cancelled' ? ' cancelled' : ''}` },
    h('div', { class: 'name' },
      isStandby ? h('span', { class: 'pos', text: `#${(r as StandbyReg).position}` }) : null,
      h('span', { text: r.name }),
      r.language === 'es' ? h('span', { class: 'badge badge-muted', title: 'Prefers Spanish', text: 'ES' }) : null,
    ),
    h('dl', {},
      h('dt', { text: 'Email' }), h('dd', {}, h('a', { href: `mailto:${r.email}`, text: r.email })),
      h('dt', { text: 'Phone' }), h('dd', {}, h('a', { href: `tel:${r.phone.replace(/[^\d+]/g, '')}`, text: r.phone })),
      h('dt', { text: 'Level' }), h('dd', { text: r.level }),
      h('dt', { text: 'Cert' }), h('dd', { text: certText(r) }),
      h('dt', { text: isStandby ? 'Joined standby' : 'Signed up' }), h('dd', { text: stamp(isStandby && r.standby_since ? r.standby_since : r.created_at) }),
    ),
    r.status !== 'cancelled' ? actions : null,
  );
}

async function promote(r: Registration) {
  await act(async () => {
    const json = await api(`/registrations/${r.id}/promote`, { method: 'POST' });
    setFlash({ message: `${r.name} moved off standby and into the class.`, tone: 'ok', emails: json.emails });
    await route();
  });
}

async function remove(r: Registration) {
  if (!confirm(`Remove ${r.name} from this class? Their ${r.status === 'registered' ? 'seat opens up' : 'standby spot is dropped'}. No email is sent.`)) return;
  await act(async () => {
    await api(`/registrations/${r.id}/cancel`, { method: 'POST' });
    setFlash({ message: `${r.name} was removed.`, tone: 'info' });
    await route();
  });
}

async function move(r: Registration, classId: number) {
  await act(async () => {
    const json = await api(`/registrations/${r.id}/move`, { method: 'POST', body: { class_id: classId } });
    const dest = classes.find((c) => c.id === classId);
    const where = dest ? `${range(dest)} (${dest.cert_type})` : 'the new class';
    const outcome = json.registration.status === 'standby' ? `on standby, #${json.position}` : 'registered';
    setFlash({
      message: `${r.name} moved to ${where}: ${outcome}.${json.warning ? ` Note: ${json.warning}` : ''}`,
      tone: json.warning ? 'warn' : 'ok',
      emails: json.emails,
    });
    await route();
  });
}

async function renderRoster(id: number) {
  const root = $('#tab-classes');
  const roster = await api<Roster>(`/classes/${id}`);
  const c = roster.class;
  const open = openSeats(c);

  const alert = open > 0 && roster.standby.length > 0
    ? h('div', { class: 'seat-alert', role: 'status' },
        h('strong', { text: `${open} seat${open > 1 ? 's' : ''} open, ${roster.standby.length} on standby` }),
        h('span', { text: 'You pick who gets the seat. Promoting someone shows the email telling them they’re in.' }),
        h('div', { class: 'promote-row' },
          roster.standby.map((s) => h('button', {
            class: 'btn btn-primary btn-small', type: 'button',
            text: `Promote #${s.position} ${s.name}`, onclick: () => promote(s),
          })),
        ),
      )
    : null;

  fill(root, 
    h('a', { class: 'btn btn-ghost', href: '#classes', text: '← All classes' }),
    h('div', { class: 'roster-head' },
      h('div', {},
        h('h2', { style: 'margin-bottom:6px', text: range(c) }),
        h('div', { class: 'class-meta' },
          h('span', { class: 'badge badge-cert', text: c.cert_type }),
          h('span', { text: `${money(c.price_single)} single${c.cert_type === 'SPRAT/IRATA' ? ` · ${money(c.price_dual)} dual` : ''}` }),
          seatBadge(c),
        ),
        c.notes ? h('p', { class: 'class-note', style: 'margin-top:8px', text: c.notes }) : null,
      ),
      h('div', { class: 'actions' },
        h('a', { class: 'btn btn-secondary btn-small', href: `#edit-${c.id}`, text: 'Edit class' }),
        h('button', { class: 'btn btn-danger btn-small', type: 'button', text: 'Delete', onclick: () => deleteClass(c) }),
      ),
    ),
    alert,
    h('div', { class: 'roster-section' },
      h('h3', {}, 'Registered', h('span', { class: 'stat', text: `${c.registered} of ${c.capacity}` })),
      roster.registered.length
        ? roster.registered.map((r) => studentRow(r, roster))
        : h('p', { class: 'empty', text: 'Nobody registered yet.' }),
    ),
    h('div', { class: 'roster-section' },
      h('h3', {}, 'Standby', h('span', { class: 'stat', text: `${roster.standby.length} waiting` })),
      roster.standby.length
        ? roster.standby.map((r) => studentRow(r, roster))
        : h('p', { class: 'empty', text: 'No one on standby.' }),
    ),
    roster.cancelled.length
      ? h('details', { class: 'roster-section' },
          h('summary', { text: `Removed (${roster.cancelled.length})` }),
          h('div', { style: 'margin-top:8px' }, roster.cancelled.map((r) => studentRow(r, roster))),
        )
      : null,
  );
}

async function deleteClass(c: ClassSummary) {
  if (!confirm(`Delete the ${range(c)} ${c.cert_type} class? This can't be undone.`)) return;
  await act(async () => {
    await api(`/classes/${c.id}`, { method: 'DELETE' });
    setFlash({ message: `Deleted the ${range(c)} class.`, tone: 'info' });
    location.hash = 'classes';
  });
}

function field(label: string, input: HTMLElement, hint?: HTMLElement | null, span2 = false) {
  return h('div', { class: `field${span2 ? ' span-2' : ''}` },
    h('label', { for: input.id, text: label }), input, hint ?? null);
}

function renderClassForm(existing: ClassSummary | null) {
  const root = $('#tab-classes');
  const v = existing ?? { start_date: '', end_date: '', cert_type: 'SPRAT', capacity: 8, price_single: 1700, price_dual: 2300, notes: '' };

  const start = h('input', { id: 'f-start', type: 'date', name: 'start_date', required: true, value: v.start_date });
  const end = h('input', { id: 'f-end', type: 'date', name: 'end_date', required: true, value: v.end_date });
  const cert = h('select', { id: 'f-cert', name: 'cert_type' },
    ['SPRAT', 'SPRAT/IRATA', 'IRATA'].map((t) => h('option', { value: t, selected: v.cert_type === t, text: t })));
  const capacity = h('input', { id: 'f-cap', type: 'number', name: 'capacity', min: 1, max: 50, required: true, value: v.capacity });
  const single = h('input', { id: 'f-single', type: 'number', name: 'price_single', min: 0, step: 1, required: true, value: v.price_single });
  const dual = h('input', { id: 'f-dual', type: 'number', name: 'price_dual', min: 0, step: 1, required: true, value: v.price_dual });
  const notes = h('textarea', { id: 'f-notes', name: 'notes', maxlength: 500 });
  notes.value = v.notes ?? '';
  const startHint = h('p', { class: 'hint' });
  const dualHint = h('p', { class: 'hint', text: 'Only offered in SPRAT/IRATA classes.' });
  const error = h('p', { class: 'form-error', role: 'alert', hidden: true });

  const syncStart = () => {
    startHint.textContent = start.value && !isMonday(start.value) ? 'Heads up: classes normally start on a Monday.' : '';
  };
  start.addEventListener('change', () => {
    if (start.value) end.value = fridayOf(start.value);
    syncStart();
  });
  const syncDual = () => { dual.disabled = cert.value !== 'SPRAT/IRATA'; };
  cert.addEventListener('change', syncDual);
  syncStart();
  syncDual();

  const form = h('form', { class: 'panel', novalidate: true },
    h('div', { class: 'form-grid' },
      field('Start date (Monday)', start, startHint),
      field('End date', end, h('p', { class: 'hint', text: 'Fills in as that Friday.' })),
      field('Cert type', cert),
      field('Capacity', capacity),
      field('Price, single cert ($)', single),
      field('Price, dual cert ($)', dual, dualHint),
      field('Notes (optional, shown on the public page)', notes, null, true),
    ),
    h('div', { class: 'form-actions', style: 'grid-template-columns:auto auto;justify-content:start' },
      h('button', { class: 'btn btn-primary', type: 'submit', text: existing ? 'Save changes' : 'Add class' }),
      h('a', { class: 'btn btn-secondary', href: existing ? `#class-${existing.id}` : '#classes', text: 'Cancel' }),
    ),
    error,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const body = {
      start_date: start.value, end_date: end.value, cert_type: cert.value,
      capacity: Number(capacity.value), price_single: Number(single.value), price_dual: Number(dual.value),
      notes: notes.value,
    };
    try {
      const json = existing
        ? await api(`/classes/${existing.id}`, { method: 'PUT', body })
        : await api('/classes', { method: 'POST', body });
      setFlash({ message: existing ? 'Class updated.' : `Added the ${range(json.class)} class.`, tone: 'ok' });
      location.hash = `class-${json.class.id}`;
    } catch (err) {
      error.textContent = (err as Error).message;
      error.hidden = false;
    }
  });

  fill(root, 
    h('a', { class: 'btn btn-ghost', href: existing ? `#class-${existing.id}` : '#classes', text: '← Back' }),
    h('h2', { text: existing ? `Edit class: ${range(existing)}` : 'Add a class' }),
    form,
  );
  start.focus();
}

// ---- Info requests tab ---------------------------------------------------

async function renderInfo() {
  const rows = await api<InfoRow[]>('/info-requests');
  const root = $('#tab-info');
  fill(root, 
    h('h2', { text: 'Info requests' }),
    h('p', { class: 'hint', text: 'Info requests never hold a seat.' }),
    rows.length === 0 ? h('p', { class: 'empty', text: 'No info requests yet.' }) : null,
    rows.map((r) => {
      const item = h('article', { class: `info-item${r.handled ? ' handled' : ''}` });
      const toggle = h('input', { type: 'checkbox', checked: !!r.handled });
      toggle.addEventListener('change', () => act(async () => {
        await api(`/info-requests/${r.id}/handled`, { method: 'POST', body: { handled: toggle.checked } });
        item.classList.toggle('handled', toggle.checked);
        await refreshInfoCount();
      }));
      item.append(
        h('div', { class: 'line', style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between' },
          h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center' },
            h('strong', { text: r.name }),
            h('span', { class: 'badge badge-cert', text: r.start_date ? `${dateRange(r.start_date, r.end_date!, 'en')} · ${r.cert_type}` : 'General' }),
            r.language === 'es' ? h('span', { class: 'badge badge-muted', title: 'Prefers Spanish', text: 'ES' }) : null,
          ),
          h('label', { class: 'toggle' }, toggle, 'Handled'),
        ),
        h('div', { class: 'stat' },
          h('a', { href: `mailto:${r.email}`, text: r.email }), ' · ',
          h('a', { href: `tel:${r.phone.replace(/[^\d+]/g, '')}`, text: r.phone }), ' · ',
          stamp(r.created_at),
        ),
        r.message ? h('p', { class: 'msg', text: r.message }) : null,
      );
      return item;
    }),
  );
}

// ---- Email log tab -------------------------------------------------------

async function renderEmails() {
  const rows = await api<EmailPreview[]>('/emails');
  fill($('#tab-emails'), 
    h('h2', { text: 'Email log' }),
    h('p', { class: 'hint', text: 'Every email the system would have sent, newest first. None were actually sent.' }),
    rows.length === 0
      ? h('p', { class: 'empty', text: 'Nothing yet. Register on the public page and the emails show up here.' })
      : rows.map((e) => emailCard(e, {
          who: `${KIND_LABELS[e.kind] ?? e.kind} · ${e.created_at ? stamp(e.created_at) : ''}`,
          to: 'To', subject: 'Subject',
        })),
  );
}

// ---- Routing -------------------------------------------------------------

function selectTab(tab: 'classes' | 'info' | 'emails') {
  for (const name of ['classes', 'info', 'emails'] as const) {
    $(`#tab-${name}`).hidden = name !== tab;
    $(`#tab-btn-${name}`).setAttribute('aria-selected', String(name === tab));
  }
}

async function route() {
  if (!keepFlash) flash = null;
  keepFlash = false;
  const hash = location.hash.slice(1);
  let m: RegExpMatchArray | null;

  try {
    await loadClasses();
    if (hash === 'info') { selectTab('info'); await renderInfo(); }
    else if (hash === 'emails') { selectTab('emails'); await renderEmails(); }
    else {
      selectTab('classes');
      if ((m = hash.match(/^class-(\d+)$/))) await renderRoster(Number(m[1]));
      else if (hash === 'new-class') renderClassForm(null);
      else if ((m = hash.match(/^edit-(\d+)$/))) {
        const c = classes.find((x) => x.id === Number(m![1]));
        if (c) renderClassForm(c); else renderClassList();
      } else renderClassList();
    }
  } catch (err) {
    flash = { message: (err as Error).message, tone: 'warn' };
    selectTab('classes');
    renderClassList();
  }
  renderFlash();
}

document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab!;
    if (location.hash.slice(1) === tab) route();
    else location.hash = tab;
  }));

$('#reset-demo').addEventListener('click', async () => {
  if (!confirm('Reset all demo data? Classes, students, info requests and the email log go back to the starting state.')) return;
  await act(async () => {
    await api('/reset', { method: 'POST' });
    setFlash({ message: 'Demo data reset to the starting state.', tone: 'ok' });
    await refreshInfoCount();
    if (location.hash.slice(1) === 'classes') await route();
    else location.hash = 'classes';
  });
});

window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
route();
refreshInfoCount().catch(() => {});
