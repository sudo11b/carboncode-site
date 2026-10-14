# L3SA class sign-up demo

A clickable preview for L3SA (Level 3 Services America, LLC) of a class sign-up flow and an admin page. It exists so Tony can approve the design before the real site is built. **It is not the production site.** If the project goes ahead, it gets its own repo.

- `/`: public sign-up (EN/ES). Class list, register / join standby, request info, confirmation with email previews.
- `/admin`: classes, rosters, standby promotion, move/remove, add/edit/delete classes, info requests, email log, **Reset demo data**.

Demo guardrails: a fixed "PREVIEW" banner on every page; `noindex` meta, an `X-Robots-Tag` header and `robots.txt Disallow: /`. No email is ever sent. Every email the system *would* send is stored in `email_log` and shown on screen as a preview.

## Stack

- **Cloudflare Workers + static assets** (not Pages). `wrangler.jsonc` serves `./dist` and runs the Worker only for `/api/*`.
- **Astro** (static output) for the two pages, with plain TypeScript in the browser and no UI framework.
- **Hono** for the API (`worker/`).
- **D1** for data. The schema is in `migrations/` and the demo data in `db/seed.sql`. The Reset button re-runs that same seed file.
- Plain CSS (`src/styles/global.css`), mobile-first. The colors and Bitter headings come from l3sa.com.

```
db/seed.sql              demo data (CLI seed + Reset button)
migrations/0001_init.sql schema
shared/                  types + date/price formatting used by Worker and browser
worker/index.ts          Hono app
worker/routes/           public.ts, admin.ts
worker/lib/              seats.ts (seat/standby logic), emails.ts (EN/ES templates), validate.ts, seed.ts
src/pages/               index.astro, admin.astro, 404.astro
src/scripts/             public.ts, admin.ts, i18n.ts, dom.ts, emailCard.ts
src/i18n/strings.ts      every public string in English and Spanish
```

## Commands

Run everything from this folder (`l3sa-demo/`).

```bash
npm install
```

### First-time setup (Cloudflare)

```bash
npx wrangler login
npx wrangler d1 create l3sa-demo
```

Copy the `database_id` it prints into `wrangler.jsonc` (replace the `00000000-…` placeholder).

### Local

```bash
npm run db:migrate:local    # create tables in the local D1 (.wrangler/)
npm run db:seed:local       # load demo data
npm run dev                 # astro build + wrangler dev → http://localhost:8787
```

`wrangler dev` serves the built `dist/`. After changing anything in `src/`, run `npx astro build` and reload. Worker changes reload on their own.

### Deploy

```bash
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy              # astro build + wrangler deploy
```

To serve it at `l3sa.carboncode.app`, add a custom domain to the `l3sa-demo` Worker in the Cloudflare dashboard (Workers & Pages → l3sa-demo → Settings → Domains & Routes). Or add `"routes": [{ "pattern": "l3sa.carboncode.app", "custom_domain": true }]` to `wrangler.jsonc` and redeploy.

### Reset data

Use the **Reset demo data** button on `/admin`, or `npm run db:seed:remote` (`:local` for local).

## How seats work

- A signup is `registered` if the class has an open seat, otherwise `standby`. The decision happens inside one SQL statement, so two people can't both take the last seat.
- The standby order is by `standby_since` (when they joined standby), so someone moved in from another class goes to the back of the line.
- **Remove** sets `cancelled` and frees the seat. No email is sent.
- **Move** applies the same seat/standby rule in the destination class and shows a "your class changed" email. If the destination doesn't offer the student's cert (for example a dual-cert student moved into a SPRAT-only class), they're switched to the single cert that class offers, and the admin page shows a warning.
- **Promote** only works when the class has an open seat. Tony picks who gets it; nothing happens automatically.
- Deleting a class is blocked while it has registered or standby students. Lowering capacity below the registered count is blocked too.
- The public page shows only **Spots open** or **Full**, never a count (Tony's request). Seat counts are visible only in the admin and in Tony's notification emails.

## Decisions confirmed by Tony

- **Single vs dual cert:** the question is asked only for SPRAT/IRATA classes. Other classes are SPRAT only. Dual classes run about once a month and may go to twice a month next year.
- **Standby:** students can join the standby list. When a spot opens, Tony contacts them and promotes them by hand.
- **Public seat display:** "Spots open" or "Full" only, with no tally.

## Assumptions still to confirm with Tony

1. **Which single cert in a dual class.** A student taking a single cert in a SPRAT/IRATA class could be after either one, so the form offers *SPRAT only / IRATA only / SPRAT + IRATA* and stores it in `single_cert`. Confirm both single options are real choices.
2. **Standby position is shown** to the student ("You're #3 on the standby list"). This was in the original spec, but given Tony's "no tally" preference he may want it hidden too.
3. **Emails on admin actions.** Promote and Move show a student email; Remove sends nothing.
4. **Spanish uses formal "usted"** throughout.
5. **Student-facing copy names Tony** ("Tony will follow up with an invoice").
6. **Prices**: $1,700 single / $2,300 dual, editable per class.

## Before this becomes the real site

- **Admin login:** put `/admin` and `/api/admin/*` behind a password. Cloudflare Access (one-time PIN to Tony's email) needs no code. The demo has no login, so anyone with the URL can change or reset the demo data.
- **Real email delivery** (Cloudflare Email Service, Resend, etc.) in place of `email_log`.
- Rate limiting / Turnstile on the public forms (the demo only has a honeypot field).
- Remove the preview banner and `noindex`.
