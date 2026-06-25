/* Gargantua Twin — front-end widget.
 *
 * A self-contained AI chat that opens as a circular "event horizon" portal —
 * the chat happens INSIDE the black hole, which blooms open with a rotating
 * accretion disk. It injects its own DOM + namespaced (gtwin-*) styles, so it
 * touches nothing else on the page; the only edit to the existing site is the
 * <script> include in index.html.
 *
 * Stays INVISIBLE until configured: set TWIN_ENDPOINT to your deployed
 * Cloudflare Worker URL to switch it on. (Append #twin-demo to preview the UI
 * with a canned reply.)
 */

(function () {
  "use strict";

  // ===== config =====
  var TWIN_ENDPOINT = "https://gargantua-twin.amalshajicreativist.workers.dev"; // live
  var DEMO = location.hash.indexOf("twin-demo") !== -1;

  if (!TWIN_ENDPOINT && !DEMO) return; // production stays clean until configured

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  var messages = []; // {role, content}
  var busy = false;
  var listening = false;
  var speakOn = false;
  var recognition = null;
  var heroHint = null;

  // ===== styles =====
  var css = `
.gtwin-trigger{position:fixed;left:1.4rem;bottom:1.4rem;z-index:30;width:54px;height:54px;
  border-radius:50%;border:1px solid rgba(148,170,220,.18);background:rgba(6,9,17,.85);
  cursor:pointer;display:none;align-items:center;justify-content:center;
  box-shadow:0 6px 24px rgba(0,0,0,.5);transition:transform .2s,border-color .2s}
.gtwin-trigger.gtwin-show{display:flex}
.gtwin-trigger:hover{transform:translateY(-2px);border-color:rgba(240,168,75,.6)}
.gtwin-bh{position:relative;width:30px;height:30px}
.gtwin-bh__ring{position:absolute;inset:6px;border-radius:50%;
  box-shadow:0 0 8px 2px rgba(247,196,122,.85),0 0 18px 6px rgba(240,168,75,.45),
  inset 0 0 8px 2px rgba(247,196,122,.7)}
.gtwin-bh__disk{position:absolute;top:50%;left:-3px;right:-3px;height:5px;transform:translateY(-50%) rotate(-7deg);
  border-radius:50%;background:radial-gradient(ellipse 50% 50% at 50% 50%,
  rgba(255,222,168,.9),rgba(240,168,75,.5) 45%,transparent);filter:blur(1px)}
.gtwin-bh__core{position:absolute;inset:9px;border-radius:50%;background:#02040a}
.gtwin-trigger:not(.gtwin-reduced) .gtwin-bh__ring{animation:gtwin-pulse 6s ease-in-out infinite}
@keyframes gtwin-pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}

.gargantua.gtwin-clickable{pointer-events:auto;cursor:pointer}
.gargantua.gtwin-clickable .gargantua__ring{transition:filter .3s}
.gargantua.gtwin-clickable:hover .gargantua__ring{filter:brightness(1.45)}
.gtwin-hero-hint{position:fixed;right:clamp(2rem,24vw,21rem);top:50%;transform:translateY(-50%);z-index:6;
  display:flex;align-items:center;gap:7px;font-family:"JetBrains Mono",monospace;font-size:.72rem;
  letter-spacing:.12em;color:#f0a84b;background:rgba(6,9,17,.55);border:1px solid rgba(240,168,75,.3);
  border-radius:999px;padding:.4rem .85rem;pointer-events:none;opacity:0;transition:opacity .5s}
.gtwin-hero-hint.gtwin-show{opacity:.9}
.gtwin-hero-hint .gtwin-arrow{animation:gtwin-nudge 1.8s ease-in-out infinite}
@keyframes gtwin-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}

/* ===== circular event-horizon portal ===== */
.gtwin-overlay{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;
  padding:1rem;background:radial-gradient(circle at 50% 50%,rgba(8,11,20,.5),rgba(2,4,10,.85));
  backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;transition:opacity .35s}
.gtwin-overlay.gtwin-open{display:flex;opacity:1}

.gtwin-portal{position:relative;width:clamp(300px,96vmin,560px);aspect-ratio:1;border-radius:50%;
  font-family:"Inter",system-ui,sans-serif;color:#d7deed;will-change:transform}
.gtwin-overlay.gtwin-open .gtwin-portal{animation:gtwin-bloom .62s cubic-bezier(.18,.8,.24,1.08) both}
@keyframes gtwin-bloom{0%{transform:scale(.12) rotate(-22deg);opacity:0}
  55%{opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}

.gtwin-disk{position:absolute;inset:-6%;border-radius:50%;filter:blur(7px);
  background:conic-gradient(from 0deg,rgba(247,196,122,0) 0deg,rgba(247,196,122,.85) 38deg,
    rgba(240,168,75,.22) 110deg,rgba(247,196,122,0) 180deg,rgba(240,168,75,.7) 248deg,
    rgba(255,222,168,.2) 318deg,rgba(247,196,122,0) 360deg);
  animation:gtwin-spin 13s linear infinite}
@keyframes gtwin-spin{to{transform:rotate(360deg)}}

.gtwin-rim{position:absolute;inset:0;border-radius:50%;pointer-events:none;
  box-shadow:0 0 22px 5px rgba(247,196,122,.65),0 0 78px 20px rgba(240,168,75,.32),
  inset 0 0 30px 7px rgba(247,196,122,.5);animation:gtwin-rimpulse 6s ease-in-out infinite}
@keyframes gtwin-rimpulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.2)}}

.gtwin-core{position:absolute;inset:5.5%;border-radius:50%;overflow:hidden;display:flex;
  align-items:center;justify-content:center;
  background:radial-gradient(circle at 50% 40%,#0a0f1c 0%,#05080f 56%,#02040a 100%)}

.gtwin-stage{width:62%;height:68%;display:flex;flex-direction:column;gap:.5rem}

.gtwin-phead{display:flex;align-items:center;gap:8px;flex:none}
.gtwin-pdot{width:10px;height:10px;border-radius:50%;border:2px solid #f0a84b;
  box-shadow:0 0 8px rgba(240,168,75,.8);flex:none}
.gtwin-ptitle{font-family:"Space Grotesk",sans-serif;font-weight:600;font-size:.82rem;color:#f0f4fc;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gtwin-phead .gtwin-iconbtn{margin-left:auto}
.gtwin-phead .gtwin-pclose{margin-left:4px}
.gtwin-iconbtn{background:transparent;border:1px solid rgba(148,170,220,.2);border-radius:8px;
  width:28px;height:28px;color:#8a96b0;cursor:pointer;display:flex;align-items:center;
  justify-content:center;font-size:13px;flex:none;transition:color .2s,border-color .2s}
.gtwin-iconbtn:hover{color:#f0f4fc;border-color:rgba(240,168,75,.5)}
.gtwin-iconbtn.gtwin-active{color:#f0a84b;border-color:rgba(240,168,75,.6)}

.gtwin-log{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:.5rem;
  padding-right:2px;scrollbar-width:thin;scrollbar-color:rgba(240,168,75,.4) transparent}
.gtwin-log::-webkit-scrollbar{width:5px}
.gtwin-log::-webkit-scrollbar-thumb{background:rgba(240,168,75,.4);border-radius:3px}
.gtwin-msg{max-width:92%;padding:.5rem .7rem;border-radius:11px;font-size:.83rem;line-height:1.45;
  white-space:pre-wrap;word-wrap:break-word;animation:gtwin-emerge .4s ease both}
.gtwin-msg--user{align-self:flex-end;background:#f0a84b;color:#1a1206;border-bottom-right-radius:3px}
.gtwin-msg--bot{align-self:flex-start;background:rgba(20,28,46,.92);border:1px solid rgba(148,170,220,.14);
  border-bottom-left-radius:3px}
.gtwin-msg--err{align-self:flex-start;background:rgba(60,20,20,.7);border:1px solid rgba(200,90,90,.4);
  color:#f0c0c0;font-size:.78rem}
@keyframes gtwin-emerge{from{opacity:0;transform:translateY(9px) scale(.96)}to{opacity:1;transform:none}}
.gtwin-typing{align-self:flex-start;color:#f0a84b;font-size:.85rem;letter-spacing:.25em;
  animation:gtwin-fall 1.1s ease-in-out infinite}
@keyframes gtwin-fall{0%,100%{opacity:.35}50%{opacity:1}}

.gtwin-chips{display:flex;flex-wrap:wrap;gap:5px;flex:none;justify-content:center}
.gtwin-chip{background:rgba(20,28,46,.7);border:1px solid rgba(148,170,220,.16);border-radius:999px;
  padding:.3rem .6rem;font-size:.71rem;color:#9ec5ff;cursor:pointer;transition:border-color .2s}
.gtwin-chip:hover{border-color:rgba(240,168,75,.5)}

.gtwin-foot{display:flex;gap:5px;align-items:flex-end;flex:none}
.gtwin-input{flex:1;resize:none;max-height:64px;min-height:34px;padding:.45rem .6rem;border-radius:9px;
  background:rgba(2,4,10,.7);border:1px solid rgba(148,170,220,.2);color:#d7deed;font-family:inherit;
  font-size:.82rem;line-height:1.35;outline:none}
.gtwin-input:focus{border-color:rgba(240,168,75,.5)}
.gtwin-send{flex:none;width:34px;height:34px;border-radius:9px;border:none;background:#f0a84b;color:#1a1206;
  font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.gtwin-send:hover{background:#f7b863}
.gtwin-send:disabled{opacity:.45;cursor:default}
.gtwin-mic.gtwin-listening{color:#f0a84b;border-color:rgba(240,168,75,.7);animation:gtwin-pulse 1.2s infinite}

.gtwin-reduced .gtwin-disk,.gtwin-reduced .gtwin-rim{animation:none}
.gtwin-reduced .gtwin-overlay.gtwin-open .gtwin-portal{animation:none}
.gtwin-reduced .gtwin-msg{animation:none}

/* ===== mobile: full-height event-horizon sheet (circle is desktop-only) ===== */
@media (max-width:640px){
  .gtwin-trigger{left:1rem;bottom:1rem}
  .gtwin-overlay{padding:0;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;
    align-items:stretch}
  .gtwin-portal{width:100%;height:100%;aspect-ratio:auto;border-radius:0}
  .gtwin-overlay.gtwin-open .gtwin-portal{animation:gtwin-rise .3s ease both}
  .gtwin-disk,.gtwin-rim{display:none}
  .gtwin-core{inset:0;border-radius:0;align-items:stretch;
    background:radial-gradient(125% 55% at 50% 0%,#0c1322 0%,#06090f 55%,#02040a 100%)}
  .gtwin-core::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;z-index:2;
    background:linear-gradient(90deg,transparent,rgba(247,196,122,.95),rgba(240,168,75,.6),transparent);
    box-shadow:0 0 18px 3px rgba(240,168,75,.5)}
  .gtwin-stage{width:auto;height:auto;flex:1;align-self:stretch;gap:.7rem;
    padding:calc(env(safe-area-inset-top,0px) + 1.1rem) 1.1rem calc(env(safe-area-inset-bottom,0px) + .9rem)}
  .gtwin-ptitle{font-size:.95rem}
  .gtwin-pdot{width:12px;height:12px}
  .gtwin-msg{max-width:86%;font-size:.92rem;padding:.6rem .8rem}
  .gtwin-chips{justify-content:flex-start}
  .gtwin-chip{font-size:.78rem;padding:.4rem .75rem}
  .gtwin-log{gap:.6rem}
  .gtwin-input{font-size:16px;min-height:40px;max-height:120px}/* 16px = no iOS zoom-on-focus */
  .gtwin-send,.gtwin-iconbtn{width:38px;height:38px}
}
@keyframes gtwin-rise{from{transform:translateY(100%)}to{transform:none}}
`;

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  if (reduced) document.documentElement.classList.add("gtwin-reduced");

  // ===== build DOM =====
  var trigger = document.createElement("button");
  trigger.className = "gtwin-trigger" + (reduced ? " gtwin-reduced" : "");
  trigger.setAttribute("aria-label", "Chat with Amal's AI twin");
  trigger.title = "Ask my AI twin anything";
  trigger.innerHTML =
    '<span class="gtwin-bh"><span class="gtwin-bh__disk"></span>' +
    '<span class="gtwin-bh__ring"></span><span class="gtwin-bh__core"></span></span>';

  var overlay = document.createElement("div");
  overlay.className = "gtwin-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Chat with Amal's AI twin");
  overlay.innerHTML =
    '<div class="gtwin-portal">' +
    '<div class="gtwin-disk" aria-hidden="true"></div>' +
    '<div class="gtwin-rim" aria-hidden="true"></div>' +
    '<div class="gtwin-core">' +
    '<div class="gtwin-stage">' +
    '<div class="gtwin-phead">' +
    '<span class="gtwin-pdot" aria-hidden="true"></span>' +
    '<span class="gtwin-ptitle">Amal — AI twin</span>' +
    '<button class="gtwin-iconbtn gtwin-speak" aria-label="Read replies aloud" title="Read replies aloud">🔊</button>' +
    '<button class="gtwin-iconbtn gtwin-pclose" aria-label="Close">✕</button>' +
    "</div>" +
    '<div class="gtwin-log" aria-live="polite"></div>' +
    '<div class="gtwin-chips"></div>' +
    '<div class="gtwin-foot">' +
    '<textarea class="gtwin-input" rows="1" placeholder="Ask me anything…" aria-label="Message"></textarea>' +
    (SpeechRec
      ? '<button class="gtwin-iconbtn gtwin-mic" aria-label="Speak" title="Speak your question">🎤</button>'
      : "") +
    '<button class="gtwin-send" aria-label="Send">↑</button>' +
    "</div>" +
    "</div></div></div>";

  document.body.appendChild(trigger);
  document.body.appendChild(overlay);

  var portal = overlay.querySelector(".gtwin-portal");
  var log = overlay.querySelector(".gtwin-log");
  var chips = overlay.querySelector(".gtwin-chips");
  var input = overlay.querySelector(".gtwin-input");
  var sendBtn = overlay.querySelector(".gtwin-send");
  var micBtn = overlay.querySelector(".gtwin-mic");
  var speakBtn = overlay.querySelector(".gtwin-speak");
  var closeBtn = overlay.querySelector(".gtwin-pclose");

  var STARTERS = [
    "Working on at Veracode?",
    "Tell me about MARES.",
    "What roles are you after?",
    "Why the black hole?",
  ];

  // ===== rendering =====
  function addMsg(role, text, cls) {
    var el = document.createElement("div");
    el.className = "gtwin-msg gtwin-msg--" + (cls || (role === "user" ? "user" : "bot"));
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function renderChips() {
    chips.innerHTML = "";
    if (messages.length > 0) return; // only on a fresh conversation
    STARTERS.forEach(function (s) {
      var c = document.createElement("button");
      c.className = "gtwin-chip";
      c.textContent = s;
      c.addEventListener("click", function () {
        input.value = s;
        send();
      });
      chips.appendChild(c);
    });
  }

  // ===== backend call =====
  function callTwin(history) {
    if (DEMO && !TWIN_ENDPOINT) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(
            "I'm the demo twin — the backend isn't wired up in this preview. " +
              "Once the Cloudflare Worker is live, I answer from Amal's real corpus."
          );
        }, 700);
      });
    }
    return fetch(TWIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || "twin " + r.status);
        return data.reply;
      });
    });
  }

  function send() {
    var text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    input.style.height = "auto";
    chips.innerHTML = "";

    addMsg("user", text);
    messages.push({ role: "user", content: text });

    var typing = document.createElement("div");
    typing.className = "gtwin-typing";
    typing.textContent = "● ● ●";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    callTwin(messages.slice())
      .then(function (reply) {
        typing.remove();
        addMsg("bot", reply);
        messages.push({ role: "assistant", content: reply });
        if (speakOn) speak(reply);
      })
      .catch(function (err) {
        typing.remove();
        addMsg(
          "bot",
          "I couldn't reach my twin just now — but the real Amal is at amalshajiprof@gmail.com.",
          "err"
        );
        messages.pop(); // drop the unanswered user turn
        if (window.console) console.error("twin error:", err);
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      });
  }

  // ===== voice =====
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  }

  function startListening() {
    if (!SpeechRec || listening) return;
    recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    listening = true;
    micBtn.classList.add("gtwin-listening");
    recognition.onresult = function (e) {
      input.value = e.results[0][0].transcript;
    };
    recognition.onend = function () {
      listening = false;
      micBtn.classList.remove("gtwin-listening");
      if (input.value.trim()) send();
    };
    recognition.onerror = function () {
      listening = false;
      micBtn.classList.remove("gtwin-listening");
    };
    recognition.start();
  }

  // ===== open / close =====
  // On mobile, pin the sheet to the *visible* viewport so the on-screen
  // keyboard shrinks it (input stays above the keyboard) instead of covering it.
  function fitViewport() {
    var vv = window.visualViewport;
    if (vv && window.innerWidth <= 640 && overlay.classList.contains("gtwin-open")) {
      overlay.style.height = vv.height + "px";
      overlay.style.top = vv.offsetTop + "px";
    } else {
      overlay.style.height = "";
      overlay.style.top = "";
    }
  }

  function openPanel() {
    if (heroHint) {
      heroHint.remove();
      heroHint = null;
    }
    overlay.classList.add("gtwin-open");
    fitViewport();
    renderChips();
    if (messages.length === 0 && log.children.length === 0) {
      addMsg(
        "bot",
        "Hi — I'm Amal's AI twin, grounded in his real work. Ask me anything about what I build, where I've worked, or what I'm looking for."
      );
    }
    setTimeout(function () {
      input.focus();
    }, 300);
  }
  function closePanel() {
    overlay.classList.remove("gtwin-open");
    overlay.style.height = "";
    overlay.style.top = "";
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitViewport);
    window.visualViewport.addEventListener("scroll", fitViewport);
  }
  window.addEventListener("resize", fitViewport);

  // ===== events =====
  trigger.addEventListener("click", function () {
    if (overlay.classList.contains("gtwin-open")) closePanel();
    else openPanel();
  });
  closeBtn.addEventListener("click", closePanel);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closePanel(); // click the void around the portal
  });
  portal.addEventListener("click", function (e) {
    e.stopPropagation();
  });
  sendBtn.addEventListener("click", send);
  if (micBtn) micBtn.addEventListener("click", startListening);
  speakBtn.addEventListener("click", function () {
    speakOn = !speakOn;
    speakBtn.classList.toggle("gtwin-active", speakOn);
    if (!speakOn && window.speechSynthesis) window.speechSynthesis.cancel();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 64) + "px";
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("gtwin-open")) closePanel();
  });

  // ===== primary trigger: the big hero Gargantua (desktop) =====
  // On wide screens the hero black hole IS the launcher; the small corner
  // button only appears once the hero scrolls out of view, so the twin stays
  // reachable on a long page. On small screens (Gargantua dimmed/off-screen)
  // or other pages, the corner button is shown from the start.
  var heroBH = document.getElementById("gargantua");
  var bigOK = window.matchMedia("(min-width: 881px) and (hover: hover)").matches;

  if (heroBH && bigOK) {
    heroBH.classList.add("gtwin-clickable");
    heroBH.setAttribute("role", "button");
    heroBH.setAttribute("tabindex", "0");
    heroBH.setAttribute("aria-label", "Chat with Amal's AI twin");
    heroBH.removeAttribute("aria-hidden");
    heroBH.addEventListener("click", openPanel);
    heroBH.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPanel();
      }
    });

    heroHint = document.createElement("div");
    heroHint.className = "gtwin-hero-hint gtwin-show";
    heroHint.innerHTML =
      'ask my AI twin <span class="gtwin-arrow" aria-hidden="true">→</span>';
    document.body.appendChild(heroHint);

    var syncTriggers = function () {
      var heroInView = heroBH.getBoundingClientRect().bottom > 100;
      trigger.classList.toggle("gtwin-show", !heroInView);
      if (heroHint) heroHint.classList.toggle("gtwin-show", heroInView);
    };
    window.addEventListener("scroll", syncTriggers, { passive: true });
    window.addEventListener("resize", syncTriggers);
    syncTriggers();
  } else {
    trigger.classList.add("gtwin-show");
  }
})();
