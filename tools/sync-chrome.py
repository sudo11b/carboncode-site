#!/usr/bin/env python3
"""Keep the shared header, app bar and footer identical on every page.

The site has no build step, so each page carries its own copy of the chrome.
Pages mark where it goes with comments:

    <!-- @header current=home -->   ...generated...   <!-- /@header -->
    <!-- @appbar utcal -->          ...generated...   <!-- /@appbar -->
    <!-- @footer -->                ...generated...   <!-- /@footer -->

Edit the templates below, then run `python3 tools/sync-chrome.py` from the
repo root. It rewrites only the marked blocks and is safe to run repeatedly.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {"rt-quiz", "l3sa-demo", "tools", ".git", "node_modules"}

HEX = ('<svg width="22" height="22" viewBox="0 0 200 200" aria-hidden="true">'
       '<polygon points="180,100 140,169.28 60,169.28 20,100 60,30.72 140,30.72" fill="none" '
       'stroke="#E83A0A" stroke-width="14" stroke-linejoin="round"/>'
       '<circle cx="100" cy="100" r="20" fill="#E83A0A"/></svg>')

NAV = [("apps", "/#apps", "Apps"), ("websites", "/websites/", "Websites"), ("about", "/about.html", "About")]

APPS = {
    "utcal": "UTCal",
    "formulapulse": "FormulaPulse",
    "usagepro": "UsagePro for Claude",
    "darkroom": "DarkRoom RT",
}


def header(current):
    links = []
    for key, href, label in NAV:
        cur = ' aria-current="page"' if key == current else ""
        links.append(f'            <a href="{href}"{cur}>{label}</a>')
    links.append('            <a class="nav-cta" href="/websites/#contact">Start a project</a>')
    return "\n".join([
        '<a class="skip-link" href="#main">Skip to content</a>',
        '<header class="site-header">',
        '    <div class="site-header-inner">',
        f'        <a class="brand" href="/" aria-label="CarbonCode home">{HEX}<span class="brand-word">Carbon<span class="cc">Code</span></span></a>',
        '        <nav class="site-nav" aria-label="Main">',
        *links,
        '        </nav>',
        '    </div>',
        '</header>',
    ])


def appbar(app, page):
    name = APPS[app]
    cur = lambda p: ' aria-current="page"' if p == page else ""
    return "\n".join([
        f'<nav class="app-bar" aria-label="{name}">',
        f'    <a class="app-bar-name" href="/{app}/"{cur("index.html")}>{name}</a>',
        f'    <a href="/{app}/privacy.html"{cur("privacy.html")}>Privacy</a>',
        f'    <a href="/{app}/terms.html"{cur("terms.html")}>Terms</a>',
        f'    <a href="/{app}/support.html"{cur("support.html")}>Support</a>',
        '</nav>',
    ])


FOOTER = "\n".join([
    '<footer class="site-footer">',
    '    <div class="site-footer-inner">',
    '        <div>',
    f'            <a class="brand" href="/">{HEX}<span class="brand-word">Carbon<span class="cc">Code</span></span></a>',
    '            <div class="footer-identity">Indie Studio · Veteran Run</div>',
    '            <p class="footer-tag">Mobile apps that earn a spot on your home screen.</p>',
    '        </div>',
    '        <div>',
    '            <h2>Apps</h2>',
    '            <ul>',
    '                <li><a href="/formulapulse/">FormulaPulse</a></li>',
    '                <li><a href="/usagepro/">UsagePro for Claude</a></li>',
    '                <li><a href="/utcal/">UTCal</a></li>',
    '                <li><a href="/darkroom/">DarkRoom RT</a></li>',
    '            </ul>',
    '        </div>',
    '        <div>',
    '            <h2>Studio</h2>',
    '            <ul>',
    '                <li><a href="/websites/">Website rebuilds</a></li>',
    '                <li><a href="/about.html">About</a></li>',
    '                <li><a href="https://www.facebook.com/profile.php?id=61564563694055">Facebook</a></li>',
    '                <li><a href="mailto:tomas@carboncode.app">tomas@carboncode.app</a></li>',
    '            </ul>',
    '        </div>',
    '    </div>',
    '    <div class="footer-copy">© 2026 CarbonCode. Texas, USA.</div>',
    '</footer>',
])

BLOCK = re.compile(r"<!-- @(header|appbar|footer)([^>]*?)-->(?:.*?<!-- /@\1 -->)?", re.S)


def render(path, kind, args):
    args = args.strip()
    if kind == "header":
        current = dict(a.split("=") for a in args.split()).get("current", "none")
        body = header(current)
    elif kind == "appbar":
        body = appbar(args, path.name)
    else:
        body = FOOTER
    open_tag = f"<!-- @{kind}{(' ' + args) if args else ''} -->"
    return f"{open_tag}\n{body}\n<!-- /@{kind} -->"


def main():
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if SKIP & set(path.relative_to(ROOT).parts):
            continue
        src = path.read_text()
        out = BLOCK.sub(lambda m: render(path, m.group(1), m.group(2)), src)
        if out != src:
            path.write_text(out)
            changed += 1
            print("updated", path.relative_to(ROOT))
    print(f"{changed} file(s) changed")


if __name__ == "__main__":
    main()
