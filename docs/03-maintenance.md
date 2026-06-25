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
4. **Deploy the Gargantua Twin** — the AI chat widget is built and committed but
   dormant: `js/twin.js` has an empty `TWIN_ENDPOINT`, so it injects nothing on the
   live site. To switch it on, deploy the Cloudflare Worker and paste its URL into
   that constant — full runbook in `twin/README.md`. Needs a free Cloudflare
   account + an Anthropic API key with a spend ceiling set.

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
