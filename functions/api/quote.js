// POST /api/quote: the quote request form on /websites/.
//
// Cloudflare Pages picks this file up on deploy (no build step). It checks the
// answers, then emails them to Tomas through Resend, with Reply-To set to the
// person asking so a reply goes straight to them. The email carries recon
// links for their current domain when they gave one.
//
// Environment (Pages → Settings → Variables and Secrets):
//   RESEND_API_KEY  secret, sending access for carboncode.app (required to send)
//   QUOTE_TO        optional, defaults to tomas@carboncode.app
//   QUOTE_FROM      optional, defaults to "CarbonCode Quotes <quotes@carboncode.app>"
//   EMAIL_MODE      "log" prints the email instead of sending it (local preview)
//
// The page's script asks for JSON. A browser without JavaScript posts the form
// directly and gets redirected back to /websites/#quote-sent or #quote-error.

const DOMAIN_STATUS = { have: 'Has a domain', need: 'Needs a domain' };
const PROJECT_TYPE = { new: 'New build, from the ground up', refresh: 'Site refresh', feature: 'Feature request' };
const PROJECT_SHORT = { new: 'New build', refresh: 'Site refresh', feature: 'Feature request' };
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

export async function onRequestPost({ request, env }) {
    const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
    if (Number(request.headers.get('Content-Length') || 0) > 32_000) return reply(wantsJson, 413, { error: 'too_large' });

    let form;
    try {
        form = await request.formData();
    } catch {
        return reply(wantsJson, 400, { error: 'bad_request' });
    }
    const get = (key, max) => String(form.get(key) ?? '').trim().slice(0, max);

    // Hidden field that people never see. Bots fill it; act as if it worked.
    if (get('company_website', 200)) return reply(wantsJson, 200, { ok: true });

    const q = {
        domainStatus: get('domain_status', 10),
        domain: get('domain', 200),
        domainIdeas: get('domain_ideas', 300),
        projectType: get('project_type', 10),
        details: get('details', 5000),
        name: oneLine(get('name', 120)),
        business: oneLine(get('business', 160)),
        email: get('email', 200),
        phone: oneLine(get('phone', 40)),
    };
    const host = hostOf(q.domain);

    const fields = [];
    if (!DOMAIN_STATUS[q.domainStatus]) fields.push('domain_status');
    if (q.domainStatus === 'have' && !host) fields.push('domain');
    if (!PROJECT_TYPE[q.projectType]) fields.push('project_type');
    if (q.details.length < 10) fields.push('details');
    if (!q.name) fields.push('name');
    if (!EMAIL_RE.test(q.email)) fields.push('email');
    if (fields.length) return reply(wantsJson, 422, { error: 'invalid', fields });

    const who = q.business ? `${q.name} (${q.business})` : q.name;
    const email = {
        from: env.QUOTE_FROM || 'CarbonCode Quotes <quotes@carboncode.app>',
        to: [env.QUOTE_TO || 'tomas@carboncode.app'],
        reply_to: q.email,
        subject: `Quote request: ${PROJECT_SHORT[q.projectType]} for ${who}`.slice(0, 200),
        text: emailBody(q, host),
    };

    if (env.EMAIL_MODE === 'log') {
        console.log(`[quote] would send:\n${JSON.stringify({ ...email, text: undefined }, null, 2)}\n\n${email.text}`);
        return reply(wantsJson, 200, { ok: true });
    }
    if (!env.RESEND_API_KEY) {
        console.error('[quote] RESEND_API_KEY is not set');
        return reply(wantsJson, 503, { error: 'not_configured' });
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(email),
        });
        if (!res.ok) {
            console.error('[quote] Resend refused', res.status, (await res.text()).slice(0, 300));
            return reply(wantsJson, 502, { error: 'send_failed' });
        }
    } catch (err) {
        console.error('[quote] Resend unreachable', err);
        return reply(wantsJson, 502, { error: 'send_failed' });
    }
    return reply(wantsJson, 200, { ok: true });
}

function reply(wantsJson, status, data) {
    if (wantsJson) {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    }
    const anchor = status === 200 ? 'quote-sent' : 'quote-error';
    return new Response(null, { status: 303, headers: { Location: `/websites/#${anchor}` } });
}

function oneLine(s) {
    return s.replace(/\s+/g, ' ');
}

// "yourbusiness.com", "www.x.com/about" and "https://x.com" all give a host;
// "my website" gives ''. Matches hostOf in assets/site.js.
function hostOf(raw) {
    const host = raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/:\d+$/, '').toLowerCase();
    return /^([\p{L}\p{N}-]+\.)+\p{L}{2,}$/u.test(host) ? host : '';
}

function emailBody(q, host) {
    const lines = [
        `Project   ${PROJECT_TYPE[q.projectType]}`,
        `Domain    ${DOMAIN_STATUS[q.domainStatus]}${q.domain ? `: ${q.domain}` : ''}`,
    ];
    if (q.domainStatus === 'need' && q.domainIdeas) lines.push(`Ideas     ${q.domainIdeas}`);
    lines.push(
        '',
        `Name      ${q.name}`,
        `Business  ${q.business || '-'}`,
        `Email     ${q.email}`,
        `Phone     ${q.phone || '-'}`,
        '',
        'What they need',
        '--------------',
        q.details,
    );

    if (host) {
        const bare = host.replace(/^www\./, '');
        const site = `https://${host}`;
        lines.push(
            '',
            'Recon',
            '-----',
            `Site          ${site}`,
            `Old versions  https://web.archive.org/web/*/${bare}`,
            `Built with    https://builtwith.com/${bare}`,
            `Speed         https://pagespeed.web.dev/analysis?url=${encodeURIComponent(site)}`,
            `Registrar     https://lookup.icann.org/en/lookup?name=${encodeURIComponent(bare)}`,
            `DNS and mail  https://mxtoolbox.com/SuperTool.aspx?action=mx%3a${encodeURIComponent(bare)}`,
        );
    }

    const sent = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' });
    lines.push('', `Sent from carboncode.app/websites/ on ${sent} (Central). Reply to answer them directly.`);
    return lines.join('\n');
}
