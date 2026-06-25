// Gargantua Twin — Cloudflare Worker
//
// The only server-side component of the twin. It holds the Anthropic API key
// (GitHub Pages can't), grounds Claude in Amal's corpus, and answers the
// website widget. Deploy with `npx wrangler deploy` (see README.md).
//
// Request:  POST { "messages": [ { "role": "user"|"assistant", "content": "..." } ] }
// Response: { "reply": "..." }   or   { "error": "..." } with a 4xx/5xx status.

import { SYSTEM_PROMPT } from "./corpus.js";

// ---- constants -------------------------------------------------------------

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Models. Haiku is the cheap default; we escalate to Sonnet for longer or
// "deeper" questions. Both are overridable via wrangler.toml [vars].
const DEFAULT_MODEL = "claude-haiku-4-5";
const ESCALATE_MODEL = "claude-sonnet-4-6";

const MAX_OUTPUT_TOKENS = 800;
const MAX_MSG_CHARS = 1500; // reject any single message longer than this
const MAX_TURNS = 12; // only keep the most recent N messages

// Per-IP rate limit (only enforced if a RATE_LIMIT KV namespace is bound).
const RL_MAX = 20; // requests
const RL_WINDOW = 600; // per N seconds (10 minutes)

// Origins allowed to call this Worker. Add a preview/staging origin if needed.
const ALLOWED_ORIGINS = [
  "https://amalshaji.in",
  "https://www.amalshaji.in",
  "https://astro-initiative.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

// "deep" questions escalate to the stronger model.
const ESCALATE_KEYWORDS = [
  "architecture",
  "trade-off",
  "tradeoff",
  "design decision",
  "why did you",
  "philosophy",
  "deep dive",
  "compare",
  "explain how",
];

// ---- helpers ---------------------------------------------------------------

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function shouldEscalate(query) {
  if (query.length > 400) return true;
  const q = query.toLowerCase();
  return ESCALATE_KEYWORDS.some((k) => q.includes(k));
}

// Fixed-window per-IP limiter backed by Workers KV. No-op if KV isn't bound,
// so the Worker still runs without it (spend ceiling + input caps remain).
async function rateLimited(env, ip) {
  if (!env.RATE_LIMIT) return false;
  const key = `rl:${ip}`;
  const current = parseInt((await env.RATE_LIMIT.get(key)) || "0", 10);
  if (current >= RL_MAX) return true;
  await env.RATE_LIMIT.put(key, String(current + 1), {
    expirationTtl: RL_WINDOW,
  });
  return false;
}

// ---- handler ---------------------------------------------------------------

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, origin);
    }

    // --- validate ---
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400, origin);
    }

    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      return json({ error: "No messages." }, 400, origin);
    }
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || typeof last.content !== "string") {
      return json({ error: "Last message must be a user string." }, 400, origin);
    }
    for (const m of messages) {
      if (typeof m?.content !== "string" || m.content.length > MAX_MSG_CHARS) {
        return json({ error: "Message too long." }, 400, origin);
      }
      if (m.role !== "user" && m.role !== "assistant") {
        return json({ error: "Bad message role." }, 400, origin);
      }
    }

    // --- rate limit ---
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (await rateLimited(env, ip)) {
      return json(
        { error: "You're sending messages a little fast — give it a minute." },
        429,
        origin,
      );
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Server not configured." }, 500, origin);
    }

    // --- build the Anthropic request ---
    const trimmed = messages.slice(-MAX_TURNS);
    const model = shouldEscalate(last.content)
      ? env.TWIN_MODEL_ESCALATE || ESCALATE_MODEL
      : env.TWIN_MODEL_DEFAULT || DEFAULT_MODEL;

    const payload = {
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      // System prompt = persona + corpus. cache_control marks it cacheable so
      // repeat calls re-read it cheaply instead of re-charging full input.
      // (On Haiku the cacheable minimum is ~4096 tokens; below that it simply
      // won't cache — harmless, just slightly higher per-call input cost.)
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
    };

    // --- call Claude ---
    let apiRes;
    try {
      apiRes = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      return json({ error: "Couldn't reach the model. Try again." }, 502, origin);
    }

    if (!apiRes.ok) {
      // Don't leak upstream error bodies to the browser; log for debugging.
      console.error("Anthropic error", apiRes.status, await apiRes.text());
      const status = apiRes.status === 429 ? 429 : 502;
      return json({ error: "The twin is busy right now. Try again shortly." }, status, origin);
    }

    const data = await apiRes.json();
    const reply = Array.isArray(data?.content)
      ? data.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim()
      : "";

    if (!reply) {
      return json({ error: "Empty reply — try rephrasing." }, 502, origin);
    }

    return json({ reply, model: data.model }, 200, origin);
  },
};
