# amalshaji.dev — personal website

Single-page personal site for Amal Shaji — Senior Software Engineer (AWS Bedrock),
multi-agent systems & RAG. Built as plain HTML/CSS/JS: no build step, no dependencies.

## Run locally

```
python -m http.server 4173
```

Then open http://localhost:4173.

## Structure

- `index.html` — all content (edit text here)
- `css/style.css` — theme; colors live in the `:root` variables at the top
- `js/main.js` — starfield canvas, scroll reveals, nav highlighting
- `assets/Amal_Shaji_Resume.pdf` — the downloadable résumé; replace this file when the résumé updates

## Deploy (free options)

**GitHub Pages** — push this folder to a repo, then Settings → Pages → deploy from
branch `main`, root. The site appears at `https://<user>.github.io/<repo>/`.

**Netlify / Vercel** — drag-and-drop the folder, or connect the repo. No build
command needed; publish directory is the repo root.

Note: the phone number is intentionally left off the public site (it remains in the
downloadable PDF). Public sites get scraped; email + LinkedIn are the contact surface.
