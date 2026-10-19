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

## Deploying

Pushing to `main` auto-deploys via Cloudflare Pages — no build step (static HTML).
