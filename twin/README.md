# Gargantua Twin — deploy runbook

An AI "twin" of Amal that visitors chat with via the black-hole icon on the
site. Architecture is **Path C**: the static site (GitHub Pages) stays untouched;
one Cloudflare Worker holds the Anthropic API key and answers the widget. The
whole knowledge corpus lives in the system prompt — no vector database.

```
browser widget (js/twin.js)  ──POST──►  Cloudflare Worker (twin/worker.js)
                                          • holds ANTHROPIC_API_KEY (server-only)
                                          • system prompt = persona + corpus
                                          • Haiku default, Sonnet on deep Qs
                                          • per-IP rate limit (optional KV)
```

## Files

| File | What it is |
|------|------------|
| `corpus.js` | The twin's knowledge + persona. **Edit this to change what it says.** |
| `worker.js` | The Cloudflare Worker (validate → call Claude → reply). |
| `wrangler.toml` | Worker config (model vars, optional KV binding). |
| `../js/twin.js` | The front-end widget. Holds `TWIN_ENDPOINT` (set after deploy). |

## One-time deploy (~10 minutes)

Prereqs: a free **Cloudflare account** and **Node.js** installed. All commands
run from this `twin/` folder.

1. **Set a hard spend ceiling first** (most important bill protection).
   In the Anthropic Console → Billing → set a monthly usage limit, and an alert
   at 50%. Haiku is cents-per-conversation, but this caps a worst case.

2. **Log in to Cloudflare** (opens a browser):
   ```
   npx wrangler login
   ```

3. **Add your Anthropic API key as a secret** (never goes in any file):
   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
   Paste your key (from the Anthropic Console) when prompted.

4. **(Recommended) Create the rate-limit KV namespace:**
   ```
   npx wrangler kv namespace create RATE_LIMIT
   ```
   Copy the printed `id` into the `[[kv_namespaces]]` block in `wrangler.toml`
   and uncomment that block. (Skip this and the Worker still works — rate
   limiting is just disabled; the spend ceiling + input caps remain.)

5. **Deploy:**
   ```
   npx wrangler deploy
   ```
   Wrangler prints your Worker URL, e.g. `https://gargantua-twin.<you>.workers.dev`.

6. **Wire the widget to it.** In `../js/twin.js`, set:
   ```js
   var TWIN_ENDPOINT = "https://gargantua-twin.<you>.workers.dev";
   ```
   Commit and push — the twin goes live on the site within a minute.
   (Until this URL is set, the widget injects nothing — the site is unchanged.)

## Updating the corpus

Edit `corpus.js` (plain prose, first person, accurate), then redeploy:
```
npx wrangler deploy
```
No site change or push needed — the corpus is bundled into the Worker.

## Previewing the UI without a backend

Open the site with `#twin-demo` appended to the URL
(`http://localhost:4173/#twin-demo`). The widget renders and returns a canned
reply, so you can see the panel, voice controls, and styling without deploying.

## Testing the Worker directly

```
curl -X POST https://gargantua-twin.<you>.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://amalshaji.in" \
  -d '{"messages":[{"role":"user","content":"What are you looking for?"}]}'
```

## Cost & safety notes

- **Models:** Haiku 4.5 by default (`$1`/`$5` per Mtok in/out), escalating to
  Sonnet 4.6 for long or "deep" questions. Override via `[vars]` in
  `wrangler.toml`.
- **Prompt caching** is on (the corpus carries `cache_control`). Note Haiku only
  caches prefixes ≥ ~4096 tokens; the current corpus is smaller, so caching
  won't engage until it grows — harmless, since Haiku input is cheap.
- **Caps:** `MAX_OUTPUT_TOKENS=800`, `MAX_MSG_CHARS=1500`, `MAX_TURNS=12`, and a
  20-req / 10-min per-IP limit (with KV). These bound a runaway or a scraper.
- **Key safety:** `ANTHROPIC_API_KEY` lives only in the Worker secret store —
  never in the repo, never in the browser bundle.
- **CORS:** the Worker only answers the origins listed in `worker.js`
  (`ALLOWED_ORIGINS`). Add a new origin there if you move domains.
