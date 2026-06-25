# amalshaji.in — personal website

Single-page personal site for Amal Shaji — Senior Data Scientist @ Veracode,
ex-AWS Bedrock. Plain HTML/CSS/JS, no build step. Interstellar-themed by design.

**Live at [amalshaji.in](https://amalshaji.in)** (GitHub Pages + custom domain).
Push to `main` and it deploys automatically in about a minute.

## Run locally

```
python -m http.server 4173
```

Then open http://localhost:4173.

## Docs

- [docs/01-website-build.md](docs/01-website-build.md) — what was built and why:
  structure, design system, creative features, content sources
- [docs/02-deployment.md](docs/02-deployment.md) — hosting, domain, DNS records,
  HTTPS setup, and the gotchas hit along the way
- [docs/03-maintenance.md](docs/03-maintenance.md) — how to make changes, open
  items, annual checklist

## Structure

- `index.html` — all content (edit text here)
- `css/style.css` — theme; colors live in the `:root` variables at the top
- `js/main.js` — starfield, decode effect, constellation, TARS, Morse easter egg
- `js/twin.js` — the Gargantua Twin chat widget (self-disables until configured)
- `twin/` — the AI twin backend (Cloudflare Worker + corpus); see [twin/README.md](twin/README.md)
- `assets/Amal_Shaji_Resume.pdf` — the downloadable résumé; replace this file when
  the résumé updates
- `CNAME` — custom-domain binding for GitHub Pages (don't delete)
