# CarbonCode — Brand & Design System

This file is project memory for Claude Code. It captures the visual identity, voice, and constraints established during the CarbonCode Facebook Page build so the website stays consistent with everything else in the brand. Drop this at the root of any CarbonCode-related repo (site, marketing, etc.) and Claude Code will read it automatically every session.

---

## What CarbonCode Is

A one-person mobile studio building focused, well-crafted apps for iPhone and Apple Watch, with Android on the roadmap. Built nights and weekends by an Army infantry veteran and NDT inspector who codes. Solo operation — no team, no ad budget, no marketing intern. Authenticity, craftsmanship, technical accuracy, and utility-over-hype are the core values.

## Current Apps

- **UTCal** — Calibration tool for UT and PAUT inspectors. Live on the App Store. App Store URL: https://apps.apple.com/us/app/utcal/id6762418371
- **FormulaPulse** — Formula 1 companion for race weekends. Currently in Apple review.
- (TheUnsolved was a learning project — do not feature it on marketing surfaces.)

---

## Brand Voice

Friendly, professional, technical. Like a sharp colleague — not a marketing intern.

- Clear and approachable without being casual or hype-y
- Technical accuracy matters, especially for the NDT audience — wrong jargon kills credibility with techs
- The "NDT tech by day, indie dev by night" story is a real asset — use it where it fits, don't force it
- Veteran-run is part of the identity but stays understated, not a marketing crutch
- No emojis unless the user explicitly requests them
- No emotes or `*action*` formatting

### Anti-patterns — never do these

- AI buzzwords ("revolutionary", "AI-powered", "next-gen", "game-changing")
- Generic indie-dev clichés ("crafted with love", "made with passion", "for the community")
- Hustle-culture language ("grinding", "shipping at scale", "10x")
- Apple-only language that locks out the Android roadmap (avoid pinning the brand to "iOS-only" or "iPhone-exclusive" in evergreen copy — current apps are iOS, but the studio is mobile)
- Hype around the founder ("genius", "visionary", "self-taught prodigy") — keep it grounded

---

## Locked-In Copy

**Bio / tagline (use everywhere short copy fits):**

```
Mobile apps that earn a spot on your home screen.
```

**Long About (use on the website's About page, social bios that allow more length):**

```
CarbonCode is a one-person mobile studio building focused,
well-crafted apps — starting on iPhone and Apple Watch, with
Android on the roadmap.

Built nights and weekends by an Army infantry veteran and NDT
inspector who codes — every app starts with a real problem worth
solving and ships only when it earns its place on your home screen.

Current apps: UTCal (NDT calibration, available now) and
FormulaPulse (F1 companion, coming soon).
```

**Identity caption (small "established" line on cover photos / footers):**

```
INDIE STUDIO  ·  VETERAN RUN
```

(Do not include a year — "Est. 2026" reads weird while the studio is still establishing itself. Revisit in a year or two.)

---

## Color Palette

The visual identity is dark + orange, with grid/schematic accents. These exact values were used on the Facebook cover and profile photo.

| Role | Hex | Notes |
|------|-----|-------|
| Background (primary) | `#0A0A0A` | Near-black, not pure black. Pure black looks cheap. |
| Brand orange | `#E83A0A` | Primary accent. Used on hex motif, "Code" in wordmark, key CTAs. |
| Brand orange (bright) | `#FF5A1E` | Hover state, highlight text on dark backgrounds. |
| Off-white text | `#F5F5F5` | Body text on dark backgrounds. Don't use pure `#FFFFFF` — too harsh. |
| Mid-grey caption | `#8C8C8C` | Subtle captions, secondary metadata. |
| Subtle grid | `#1C1C1C` | 20px grid line color. Barely visible — adds texture without noise. |
| Heavier grid | `#231914` | 100px grid line color. Slightly warm to pick up the orange. |
| Inner construction lines | `#783218` | Used in the hex schematic for triangulation lines. |

**On usage:**
- Default to dark backgrounds. Light mode can exist but isn't the primary identity.
- Orange is the only accent color. Don't add a second brand color (no blue/green/etc.) — it weakens the identity.
- Grid lines are *atmospheric*, not structural. They should be barely perceptible in normal viewing but visible if you look for them.

---

## Typography

The Facebook assets used DejaVu Sans (Linux fallback). For the web, the closest free, brand-aligned choice is **Inter** — clean, modern, geometric, reads well at every size.

```css
--font-brand: 'Inter', 'Helvetica Neue', sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
```

- Wordmark / display: Inter Bold or ExtraBold
- Body: Inter Regular at 16-18px
- Captions / spec lines: Inter Bold, uppercase, letter-spacing slightly increased (~0.05em), used sparingly
- Code samples: JetBrains Mono

The brand wordmark "CarbonCode" is set as one word, with **"Carbon"** in white (`#F5F5F5`) and **"Code"** in brand orange (`#E83A0A`). Not separated by a space. This split is intentional — keep it consistent.

---

## Visual Motifs

The CarbonCode visual identity has three reusable motifs. Pick one or combine; don't introduce new motifs without a reason.

### 1. Hexagonal schematic
A flat-top hexagon, often with internal triangulation lines from each vertex to the center, and a center dot. Suggests structure, engineering, inspection. The primary brand mark.

```
Construction:
- Outline weight: 4-6px (scale with size)
- Triangulation lines: 1-2px, color #783218 (dimmer than the outline)
- Center dot: solid orange, 8-12px diameter
- Rotation: 30° (flat-top, not pointy-top)
```

### 2. Reticle / viewfinder brackets
Four corner brackets forming a square viewfinder, with optional small crosshair tick marks at the cardinal directions. This is the NDT-inspection nod — it reads as "looking at something carefully", which fits both the inspector and the developer identity.

```
Construction:
- Bracket length: ~12% of canvas size
- Bracket weight: 6px (scale with size)
- Color: brand orange #E83A0A
- Optional: faint background grid (#1C1C1C lines at ~5% spacing)
```

### 3. Faint background grid
20px grid in `#1C1C1C` with 100px overlay grid in `#231914`. Adds blueprint/schematic atmosphere without competing with foreground content. Use behind hero sections, never behind body text.

---

## Existing Brand Assets

These files are in the CarbonCode shared folder and are the canonical brand reference for the website:

```
facebook_profile_LIVE.png  — 500×500, reticle motif, what's live on the FB Page
facebook_cover_LIVE.png    — 1640×924, schematic motif, what's live on the FB Page
_archive_unused/           — alternate variants, not for production use
```

When the site needs a logo, favicon, or hero visual, derive it from the same hex motif and palette so everything stays cohesive.

---

## Web-Specific Guidelines

### Layout
- Mobile-first. The biggest audience for indie app studios is on phones.
- Generous whitespace. The dark palette can feel claustrophobic — give it room to breathe.
- Single-column hero, max-width ~720px for readable copy.

### Performance
- This is a marketing site, not an app. Keep it fast and small.
- No heavy frameworks unless there's a real reason. Static HTML/CSS, or a lightweight static-site generator (Astro, 11ty, plain Vite), is plenty.
- Lazy-load images below the fold.

### Accessibility
- Brand orange `#E83A0A` on `#0A0A0A` background = WCAG AA contrast ratio of ~4.6:1. That passes for normal text but is borderline. Use the brighter `#FF5A1E` for small text or links to be safe.
- All interactive elements need visible focus states.
- Hex motif and reticle visuals need `alt` text or `aria-hidden="true"` if purely decorative.

### Project structure & URL conventions

The repo already follows a flat per-app subfolder pattern. Don't restructure into `/apps/...` — keep the existing convention.

```
/
├── index.html              # Studio homepage
├── assets/
│   └── style.css           # Shared stylesheet — extend this, don't create new ones
├── formulapulse/
│   ├── index.html          # App landing
│   ├── privacy.html        # App Store privacy policy
│   ├── terms.html          # App Store terms of use + subscription terms
│   └── support.html        # App Store support URL + FAQ
├── utcal/                  # (TODO — same pattern as formulapulse/)
│   ├── index.html
│   ├── privacy.html
│   ├── terms.html
│   └── support.html
├── about.html              # (TODO — long About content)
├── CLAUDE.md               # This file
└── README.md               # Human-facing project docs (operational, not brand)
```

URLs follow the file structure:

- `https://carboncode.app/` — studio homepage
- `https://carboncode.app/formulapulse/` — FormulaPulse overview
- `https://carboncode.app/formulapulse/privacy.html` — Privacy
- `https://carboncode.app/formulapulse/terms.html` — Terms
- `https://carboncode.app/formulapulse/support.html` — Support
- (Same pattern for `/utcal/...` once added)

### Hosting & deployment — don't break this

- **Hosting:** Cloudflare Pages
- **DNS:** Namecheap → Cloudflare
- **Build step:** None. Static HTML/CSS only. Pushing to `main` auto-deploys.
- **Local preview:** `python3 -m http.server 8080` from repo root, then visit `http://localhost:8080`.

Do not introduce a build step, bundler, or framework that requires compilation unless there is a clear, articulated reason. The "static HTML, no build" setup is intentional — it keeps deployment instant and dependency-free. If a feature genuinely needs JS, write it as a small inline `<script>` or a single file in `assets/` rather than reaching for a framework.

### Styling rules

- All shared styles live in `assets/style.css`. Extend this file rather than creating new stylesheets per page.
- Use CSS custom properties for the brand palette so colors stay in sync site-wide:

```css
:root {
  --bg: #0A0A0A;
  --bg-grid-fine: #1C1C1C;
  --bg-grid-coarse: #231914;
  --orange: #E83A0A;
  --orange-bright: #FF5A1E;
  --text: #F5F5F5;
  --text-muted: #8C8C8C;
  --hex-stroke-dim: #783218;
  --font-brand: 'Inter', 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
}
```

- Page-specific tweaks can use `<style>` blocks scoped to the page if truly one-off, but prefer adding utility classes to `assets/style.css`.

---

## PII & Privacy Constraints

These are non-negotiable. Do not put any of the following on the website:

- Tomas's home location (Deer Park, TX) or any city-level address
- Personal cell phone number
- Personal email (sudo11b@proton.me) — only `support@carboncode.app` and per-app `support@formulapulse.*` / `support@utcal.*` style addresses
- Family member names
- Specific employer (NDT company name)

Acceptable to mention:
- "Texas, USA" (state-level only)
- Veteran status (Army infantry)
- Profession in general terms ("NDT inspector who codes")

---

## Tone Examples — Show Don't Tell

**Bad (hype):**
> Revolutionary mobile experiences crafted with passion by a visionary indie developer.

**Bad (corporate):**
> CarbonCode delivers innovative software solutions for the modern mobile ecosystem.

**Good:**
> CarbonCode is a one-person mobile studio. The apps are built nights and weekends by an Army infantry veteran and NDT inspector who codes — and they ship only when they earn their place on your home screen.

**Good (shorter, for a hero):**
> Mobile apps, built solo. By someone who actually uses them.

**Good (technical, app-page level):**
> UTCal is a calibration tool for ultrasonic inspectors. Built by a PAUT tech who got tired of doing the math on a notepad.

---

## Reference

- Live Facebook Page: https://www.facebook.com/profile.php?id=61564563694055
- Site domain: https://www.carboncode.app
- Apps:
  - UTCal — https://apps.apple.com/us/app/utcal/id6762418371
  - FormulaPulse — (App Store URL pending review approval)

---

## When in Doubt

Ask: would a sharp, technical colleague say this? If the answer is no, rewrite it. This brand wins by being honest and technically credible, not by being loud.
