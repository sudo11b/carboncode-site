# carboncode-site

Official site for CarbonCode Studio — studio homepage, app pages, and legal docs (privacy, terms, support) for every app we ship.

Hosted on **Cloudflare Pages**, domain managed through **Namecheap → Cloudflare DNS**.

## Structure

```
/
├── index.html              # Studio homepage
├── assets/
│   └── style.css           # Shared styling
├── formulapulse/
│   ├── index.html          # App landing page
│   ├── privacy.html        # App Store privacy policy
│   ├── terms.html          # App Store terms of use + subscription terms
│   └── support.html        # App Store support URL + FAQ
└── README.md
```

## URLs

Once deployed:

- `https://carboncode.app/` — studio homepage
- `https://carboncode.app/formulapulse/` — FormulaPulse overview
- `https://carboncode.app/formulapulse/privacy.html` — Privacy Policy
- `https://carboncode.app/formulapulse/terms.html` — Terms of Use
- `https://carboncode.app/formulapulse/support.html` — Support

## Local preview

Open any `.html` file directly in a browser, or run:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploying

Pushing to `main` auto-deploys via Cloudflare Pages — no build step (static HTML).
