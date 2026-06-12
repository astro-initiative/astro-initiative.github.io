# Deployment record

Deployed 2026-06-12. Everything below is free except the domain.

## Hosting — GitHub Pages

- Repo: `astro-initiative/astro-initiative.github.io` (public; user-site repos named
  `<username>.github.io` get Pages enabled automatically, serving `main` branch root)
- Build type: legacy (static files served as-is, no build command)
- Deploys: **push to `main` → live in ~1 minute**. That's the whole pipeline.
- Original URL `https://astro-initiative.github.io/` now redirects to the custom
  domain automatically.

## Domain — amalshaji.in

- Registrar: **Hostinger**, bought 2026-06-12 (~₹900/yr is the only recurring cost)
- Keep **auto-renew on** — if it lapses, every link on old resumes dies and expired
  personal domains get squatted.
- Custom domain is set in the Pages config and stored in the `CNAME` file at repo
  root (GitHub committed that file automatically — don't delete it).

### DNS records (at Hostinger → Domains → amalshaji.in → DNS / Nameservers)

| Type | Host | Value | Purpose |
|------|------|-------|---------|
| A | @ | 185.199.108.153 | GitHub Pages |
| A | @ | 185.199.109.153 | GitHub Pages |
| A | @ | 185.199.110.153 | GitHub Pages |
| A | @ | 185.199.111.153 | GitHub Pages |
| CNAME | www | astro-initiative.github.io | www → apex |

Hostinger's default parking A record on `@` was deleted (it conflicts).

## HTTPS

- Certificate: Let's Encrypt, auto-provisioned and auto-renewed by GitHub. Zero
  maintenance.
- **Enforce HTTPS is ON** — `http://` 301-redirects to `https://`.
- Gotcha hit during setup, for future reference: the custom domain was attached to
  Pages *before* the DNS records existed, so GitHub's first certificate attempt
  failed silently (`https_certificate.state` stayed null). Fix: re-save the custom
  domain after DNS is live (remove + re-add cname via API or the Pages settings UI).
  Certificate went to "approved" within a minute after that.

## Verified state (2026-06-12)

- `https://amalshaji.in` → 200, valid certificate
- `http://amalshaji.in` → 301 → https
- `https://www.amalshaji.in` → 200, lands on apex
- Resume PDF downloadable at `/assets/Amal_Shaji_Resume.pdf`

## Useful commands

```powershell
# Pages status (cert, domain, enforcement)
gh api repos/astro-initiative/astro-initiative.github.io/pages

# DNS health check as GitHub sees it
gh api repos/astro-initiative/astro-initiative.github.io/pages/health

# Check DNS propagation directly
Resolve-DnsName amalshaji.in -Type A -Server 8.8.8.8
```
