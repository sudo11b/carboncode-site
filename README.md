# carboncode-site

Official site for CarbonCode Studio — studio homepage, app pages, and legal docs (privacy, terms, support) for every app we ship.

Hosted on **Cloudflare Pages**, domain managed through **Namecheap → Cloudflare DNS**.

## Structure

```
/
├── index.html              # Studio homepage
├── about.html              # About
├── 404.html                # Branded 404 (root-absolute paths only)
├── websites/index.html     # Website rebuild services + L3SA case study
├── assets/                 # style.css, site.js, fonts, screens/, work/
├── formulapulse/ utcal/ usagepro/ darkroom/
│   └── index, privacy, terms, support (.html)
├── rt-quiz/                # Unlisted
├── functions/api/quote.js  # Pages Function behind the quote form on /websites/
└── tools/sync-chrome.py    # Shared header/footer helper (see below)
```

## URLs

- `https://carboncode.app/` — studio homepage
- `https://carboncode.app/websites/` — website rebuilds
- `https://carboncode.app/<app>/` — app page, plus `privacy.html`, `terms.html`, `support.html`

## Shared header and footer

Each page holds its own copy of the header, app sub-nav and footer between `<!-- @header -->`, `<!-- @appbar -->` and `<!-- @footer -->` markers. Edit the templates in `tools/sync-chrome.py`, then run:

```sh
python3 tools/sync-chrome.py
```

## Local preview

Open any `.html` file directly in a browser, or run:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

The quote form on `/websites/` posts to a Pages Function, which `http.server` can't run. To try the form locally:

```sh
npx wrangler pages dev . --port 8788 --binding EMAIL_MODE=log
```

Then visit `http://localhost:8788/websites/`. With `EMAIL_MODE=log` nothing is sent; the email that would go out is printed in the wrangler output.

## Deploying

Pushing to `main` auto-deploys via Cloudflare Pages — no build step (static HTML). Pages compiles `functions/` on its own as part of the deploy.

## Quote form email (Resend)

`functions/api/quote.js` emails each quote request to tomas@carboncode.app through Resend, the same service the L3SA site uses. Reply-To is the person who asked, so replying goes straight to them. One-time setup:

1. Resend → Domains → Add Domain `carboncode.app`, region US East, **Manual setup**.
2. Add the records Resend shows in Cloudflare DNS for carboncode.app, all **DNS only** (grey cloud): the `resend._domainkey` TXT and the `send` records. Mail for carboncode.app is Proton: **do not touch** the root MX, the root SPF TXT, the `protonmail-verification` TXT or Proton's DKIM records. Leave Resend's "Enable Receiving" off.
3. Verify in Resend, then check Proton is untouched: `dig +short MX carboncode.app` still lists `mail.protonmail.ch` and `mailsec.protonmail.ch`.
4. Create a Resend API key with sending access for `carboncode.app`.
5. Cloudflare → Workers & Pages → this project → Settings → Variables and Secrets → add `RESEND_API_KEY` (type Secret, Production), then redeploy.
6. Submit a test request from the live page and check it arrives, with SPF and DKIM passing.

Optional variables: `QUOTE_TO` (default tomas@carboncode.app) and `QUOTE_FROM` (default `CarbonCode Quotes <quotes@carboncode.app>`). Until the key is set, the form shows an error with a link to send the answers by email instead.
