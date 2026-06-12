# Website build notes

Built 2026-06-12. Single-page personal portfolio for Amal Shaji — recruiter-facing,
for a job search targeting Research Engineer / Applied Scientist roles. Captures who
he is (AI/ML engineer, ex-AWS Bedrock, now Senior Data Scientist at Veracode) plus a
deliberate, heavy Interstellar/space theme, requested explicitly ("very creative").

## Stack

Plain HTML/CSS/JS — no framework, no build step, no dependencies. Three files do
everything:

| File | Role |
|------|------|
| `index.html` | All content and structure |
| `css/style.css` | Theme. Colors are CSS variables in `:root` at the top |
| `js/main.js` | Starfield, parallax, decode effect, constellation, TARS, Morse |

Fonts via Google Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (mono).

## Content sources & the role correction

- First version was built from `Amal_Shaji_Resume.pdf` (extracted with pypdf).
- The resume said "AWS, Oct 2022 – Present" — but the LinkedIn profile export
  (`Profile.pdf`) revealed the current role: **Senior Data Scientist @ Veracode
  (via Accion Labs), Bengaluru, since April 2026**. The site was corrected to match
  LinkedIn, including the AWS promotion (Application Engineer → System Development
  Engineer, Nov 2024) and TCS promotion (Assistant System Engineer → System
  Engineer, Apr 2021).
- LinkedIn also added: PyTorch, CNNs, UMich Applied Data Science specialization.
- **The bundled resume PDF in `assets/` still predates Veracode** — see the TODO in
  `03-maintenance.md`.

## Page structure

1. **Hero** — name (decodes in like a transmission), role line, pitch, CTAs,
   CSS-drawn Gargantua (black hole: halo, photon ring, edge-on accretion disk, core)
2. **About (01)** — research-to-production story, the security-career thread
   (Amazon Security Guardian → Veracode AppSec), Interstellar connection, stat cards
3. **Mission Log (02)** — experience timeline; each employer is a planet:
   TCS = blue home world ("LOG 01 · LAUNCH"), AWS = ringed amber gas giant,
   Veracode = teal new world ("LOG 03 · CURRENT ORBIT")
4. **Systems I've Built (03)** — cards: MARES, VISAR, RLHF data-quality pipeline,
   M.Tech thesis. Each with an IMPACT line and stack tags
5. **Skill Constellations (04)** — skills rendered as an SVG star chart, three
   constellations (AI/ML amber, Cloud ice-blue, Engineering white). Coordinates and
   links are hand-tuned data in `js/main.js` (`CONSTELLATIONS` array)
6. **Education & Certifications (05)**
7. **Open a Channel (06)** — contact; email + LinkedIn + résumé download

## Design system

- Background `#060911`, text `#d7deed`, accent `#f0a84b` (Gargantua's accretion-disk
  amber), secondary `#9ec5ff` (ice blue). All in `:root` of `style.css`.
- Space flavor lives in visuals and microcopy; section content stays
  recruiter-scannable (real dates, real titles, bolded impact numbers).

## Creative features (and where they live in js/main.js)

- **Starfield canvas** — twinkling stars, occasional shooting star, mouse parallax
- **Decode effect** — hero + section titles scramble into place (`decode()`)
- **Gargantua parallax** — black hole drifts against mouse (`easeMouse()`)
- **Constellation renderer** — `renderConstellation()` builds the SVG from data
- **Card tilt** — 3D hover tilt on system cards
- **TARS** — fixed bottom-right robot, click cycles original in-voice quips
- **Morse easter egg** — nav logo ring blinks "STAY" (S/T/A/Y timing loop);
  tooltip on the logo hints at it
- **Trajectory rail** — right-edge dot nav tracking scroll (desktop ≥1180px)

## Responsive & accessibility

- Breakpoints: 880px (single column; constellation swaps to chip lists; Gargantua
  dims) and 640px (nav links hidden — known gap, no hamburger; TARS hidden)
- Verified: no horizontal overflow at phone widths
- All motion honors `prefers-reduced-motion` (static starfield, no decode/parallax)

## Privacy decisions

- Phone number and home address (present in resume/LinkedIn exports) are
  **deliberately excluded** from the site. Contact surface = email + LinkedIn only.
- The résumé PDF (which contains the phone) is still downloadable by choice.
