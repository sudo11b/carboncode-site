// Before/after compare sliders. The range input sits over the images, so
// mouse, touch and keyboard all work through one native control.
//
// The first time a slider scrolls into view it sweeps once from "before" to
// "after", so the change is visible without dragging. People who prefer
// reduced motion get the end position straight away.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const REST = 12; // resting position: the "after" headline fully in view, a strip of "before" left

document.querySelectorAll('[data-compare] .compare-stage').forEach((stage) => {
    const input = stage.querySelector('input[type="range"]');
    if (!input) return;

    const set = (value) => {
        input.value = value;
        stage.style.setProperty('--pos', value + '%');
    };
    let touched = false;
    input.addEventListener('input', () => {
        touched = true;
        stage.style.setProperty('--pos', input.value + '%');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
        set(REST);
        return;
    }

    set(92);
    const observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const from = 92, start = performance.now(), duration = 1400;
        const step = (now) => {
            if (touched) return;
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            set(Math.round(from + (REST - from) * eased));
            if (t < 1) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 250);
    }, { threshold: 0.5 });
    observer.observe(stage);
});

// Quote request form on /websites/. Shows the follow-up field that fits the
// domain answer, checks the answers before sending, and posts them to
// /api/quote (functions/api/quote.js), which emails them to Tomas. Without
// JavaScript the form still posts, and the function redirects back to
// #quote-sent or #quote-error.
const quoteForm = document.getElementById('quote-form');
if (quoteForm) {
    const QUOTE_EMAIL = 'tomas@carboncode.app';
    const panel = quoteForm.closest('.quote-panel');
    const alertBox = quoteForm.querySelector('.q-alert');
    const button = quoteForm.querySelector('button[type="submit"]');
    const field = (name) => quoteForm.elements[name];
    const value = (name) => (field(name)?.value ?? '').trim();

    // Same check as the function: "yourbusiness.com", "www.x.com/about" and
    // "https://x.com" all pass; "my website" doesn't.
    const hostOf = (raw) => {
        const host = raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/:\d+$/, '').toLowerCase();
        return /^([\p{L}\p{N}-]+\.)+\p{L}{2,}$/u.test(host) ? host : '';
    };

    const checks = {
        domain_status: () => value('domain_status') ? '' : 'Pick one.',
        domain: () => {
            if (value('domain_status') !== 'have') return '';
            if (!value('domain')) return 'Add the domain, like yourbusiness.com.';
            return hostOf(value('domain')) ? '' : 'That doesn\'t look like a web address. Something like yourbusiness.com works.';
        },
        project_type: () => value('project_type') ? '' : 'Pick the closest fit. You can explain the rest below.',
        details: () => value('details').length >= 10 ? '' : 'A sentence or two is enough.',
        name: () => value('name') ? '' : 'Add your name.',
        email: () => {
            if (!value('email')) return 'Add your email so I can reply.';
            return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(value('email')) ? '' : 'Check the email address. It should look like name@example.com.';
        },
    };

    // Each control's message sits in its [data-error-for] slot and is tied to
    // the control with aria-describedby, next to any hint it already had.
    quoteForm.querySelectorAll('[aria-describedby]').forEach((el) => { el.dataset.hint = el.getAttribute('aria-describedby'); });
    const setError = (name, message) => {
        const slot = quoteForm.querySelector(`[data-error-for="${name}"]`);
        slot.id = `q-err-${name}`;
        slot.textContent = message;
        const el = field(name);
        const isGroup = el instanceof RadioNodeList;
        if (isGroup) el[0].closest('.choices').classList.toggle('is-invalid', !!message);
        (isGroup ? [...el] : [el]).forEach((control) => {
            if (message) control.setAttribute('aria-invalid', 'true');
            else control.removeAttribute('aria-invalid');
            const ids = [control.dataset.hint, message && slot.id].filter(Boolean).join(' ');
            if (ids) control.setAttribute('aria-describedby', ids);
            else control.removeAttribute('aria-describedby');
        });
    };

    // Returns the first control with a problem, to focus.
    const validate = (names) => {
        let first = null;
        names.forEach((name) => {
            const message = checks[name]();
            setError(name, message);
            if (message && !first) {
                const el = field(name);
                first = el instanceof RadioNodeList ? el[0] : el;
            }
        });
        return first;
    };

    const conditionals = quoteForm.querySelectorAll('[data-show-when]');
    const syncConditionals = () => {
        conditionals.forEach((el) => {
            const [name, wanted] = el.dataset.showWhen.split('=');
            el.hidden = value(name) !== wanted;
        });
    };
    syncConditionals();

    quoteForm.addEventListener('change', (e) => {
        if (e.target.type !== 'radio') return;
        syncConditionals();
        setError(e.target.name, '');
        if (e.target.name === 'domain_status') setError('domain', '');
    });
    // Once a field has been flagged, clear the message as soon as it's fixed.
    quoteForm.addEventListener('input', (e) => {
        const name = e.target.name;
        if (checks[name] && e.target.getAttribute('aria-invalid') === 'true' && !checks[name]()) setError(name, '');
    });

    const mailtoFallback = () => {
        const labels = { have: 'Has a domain', need: 'Needs a domain', new: 'New build', refresh: 'Site refresh', feature: 'Feature request' };
        const body = [
            `Domain: ${labels[value('domain_status')] ?? ''} ${value('domain') || value('domain_ideas')}`.trim(),
            `Project: ${labels[value('project_type')] ?? ''}`,
            '',
            value('details'),
            '',
            [value('name'), value('business'), value('phone')].filter(Boolean).join(' · '),
        ].join('\n');
        return `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent('Website quote request')}&body=${encodeURIComponent(body)}`;
    };
    const showAlert = () => {
        const link = document.createElement('a');
        link.href = mailtoFallback();
        link.textContent = 'send it by email instead';
        alertBox.replaceChildren('That didn\'t send. Try again in a minute, or ', link, ' (your answers come along).');
        alertBox.hidden = false;
    };

    quoteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.hidden = true;
        const first = validate(Object.keys(checks));
        if (first) {
            first.focus();
            return;
        }

        const label = button.textContent;
        button.disabled = true;
        button.textContent = 'Sending…';
        try {
            const res = await fetch(quoteForm.action, {
                method: 'POST',
                body: new FormData(quoteForm),
                headers: { Accept: 'application/json' },
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok) {
                const done = panel.querySelector('.q-done');
                done.querySelector('[data-done-email]').textContent = value('email');
                quoteForm.hidden = true;
                done.hidden = false;
                done.querySelector('h3').focus();
                return;
            }
            if (res.status === 422 && Array.isArray(data.fields) && data.fields.length) {
                // The function disagreed with a check that passed here; flag what it named.
                data.fields.forEach((name) => { if (checks[name]) setError(name, checks[name]() || 'Check this one.'); });
                const el = field(data.fields[0]);
                (el instanceof RadioNodeList ? el[0] : el)?.focus();
                return;
            }
            showAlert();
        } catch {
            showAlert();
        } finally {
            button.disabled = false;
            button.textContent = label;
        }
    });
}
