# Maintenance & open items

## How to change anything

1. Edit files locally in `D:\Projects\personal_website`
2. Preview: `python -m http.server 4173` → http://localhost:4173
3. Ship it:
   ```
   git add -A
   git commit -m "describe the change"
   git push
   ```
   Live at https://amalshaji.in about a minute later.

### Where things live

| Want to change… | Edit |
|-----------------|------|
| Any text/content | `index.html` (sections are clearly commented) |
| Colors / theme | `:root` variables at the top of `css/style.css` |
| Skills star chart | `CONSTELLATIONS` array in `js/main.js` (labels, x/y, links) |
| TARS quips | `tarsQuips` array in `js/main.js` |
| Résumé download | Replace `assets/Amal_Shaji_Resume.pdf` (keep the filename) |
| AI twin's knowledge | `twin/corpus.js`, then `npx wrangler deploy` (see `twin/README.md`) |

## Open items (as of 2026-06-12)

1. **Replace the résumé PDF** — the bundled one predates Veracode and still says
   AWS "Present". A recruiter who downloads it sees it contradict the site.
   Highest-priority fix.
2. **Veracode bullets** — the Mission Log entry for Veracode has one generic line
   because neither source document described the actual work. Add 2–3 concrete
   bullets (projects, ML systems, impact numbers) once available.
3. **Mobile nav gap (known, accepted for now)** — below 640px the section links are
   hidden and there's no hamburger menu; only the logo + Résumé button remain.
   Phone users must scroll. Fix = small hamburger or a persistent "Contact" link.
## Gargantua Twin — deployed (2026-06-25)

The AI chat widget is **live**. Operational facts:

- **Worker URL:** `https://gargantua-twin.amalshajicreativist.workers.dev`
  (wired into `TWIN_ENDPOINT` in `js/twin.js`).
- **Cloudflare account:** a *separate* account from the website's — signed in as
  `amalshajicreativist@gmail.com` (the GitHub/site work is under different
  credentials). `wrangler login` stores this on disk; `npx wrangler whoami` shows it.
- **Secret:** `ANTHROPIC_API_KEY` is set in the Worker's secret store (never in the
  repo). Rotate with `npx wrangler secret put ANTHROPIC_API_KEY` from `twin/`.
- **Rate limit KV:** namespace `RATE_LIMIT` id `e7858b1b6da247e8913f0947e69d25b9`.
- **Redeploy after editing `twin/worker.js` or `twin/corpus.js`:**
  `cd twin; npx wrangler deploy` (no site push needed — the corpus is bundled).
- **Watch live logs:** `cd twin; npx wrangler tail`.
- **Verified:** Haiku default + Sonnet escalation both answer correctly; in-browser
  call from the site succeeds; CORS allowlist covers amalshaji.in + localhost.
- **Cost guard:** set/confirm the monthly spend ceiling in the Anthropic Console.

### Gotcha: Anthropic 403 "Request not allowed" (geo/region) — fixed

Symptom: the twin works intermittently or not at all; the Worker returns 502 and
`wrangler tail` shows `Anthropic error 403 {"type":"forbidden","message":"Request
not allowed"}` with `colo: HKG`. Cause: Cloudflare runs the Worker in the colo
nearest the visitor; from Bengaluru that's often **Hong Kong**, and Anthropic
blocks API calls that egress from there (unsupported region). It's not the key,
credits, or billing.

Fix (in place): the Worker routes the Anthropic call through the **AnthropicRelay
Durable Object**, created with `locationHint: "enam"` (US East), so the call
always egresses from a supported region. See `worker.js` (AnthropicRelay class +
the relay.fetch call) and `wrangler.toml` (durable_objects binding + migration).
Smart Placement was tried first but doesn't relocate a low-traffic Worker fast
enough to be reliable. Watch live with `cd twin; npx wrangler tail`.

## Nice-to-have ideas (discussed, not started)

- Photo/portrait in the About section (recruiters connect faster with a face)
- Short technical blog posts (e.g. sanitized "how we built MARES") to back the
  Research Engineer positioning
- Open Graph image for richer link previews when the URL is shared
- `amal@amalshaji.in` email forwarding (free via Cloudflare Email Routing if DNS
  ever moves to Cloudflare, or via Hostinger's email offerings)

## Annual checklist

- Domain auto-renew is on at Hostinger — verify the payment method hasn't expired
- Everything else (hosting, HTTPS cert) renews itself; no action ever needed
