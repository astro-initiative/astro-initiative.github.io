/* Gargantua Twin — front-end widget.
 *
 * A self-contained chat panel that overlays the site. It injects its own DOM
 * and namespaced (gtwin-*) styles, so it touches nothing else on the page —
 * the only edit to the existing site is the <script> include in index.html.
 *
 * It stays INVISIBLE until configured: set TWIN_ENDPOINT to your deployed
 * Cloudflare Worker URL to switch it on. Until then the site is unchanged.
 * (Append #twin-demo to the URL to preview the UI with a canned reply.)
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

  // ===== styles =====
  var css = `
.gtwin-trigger{position:fixed;left:1.4rem;bottom:1.4rem;z-index:30;width:54px;height:54px;
  border-radius:50%;border:1px solid rgba(148,170,220,.18);background:rgba(6,9,17,.85);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 24px rgba(0,0,0,.5);transition:transform .2s,border-color .2s}
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

.gtwin-panel{position:fixed;left:1.4rem;bottom:5.4rem;z-index:31;width:min(380px,calc(100vw - 2.8rem));
  height:min(560px,70vh);display:none;flex-direction:column;border-radius:18px;overflow:hidden;
  background:rgba(8,11,20,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(148,170,220,.16);box-shadow:0 20px 60px rgba(0,0,0,.6);
  font-family:"Inter",system-ui,sans-serif;color:#d7deed}
.gtwin-panel.gtwin-open{display:flex;animation:gtwin-in .22s ease}
@keyframes gtwin-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

.gtwin-head{display:flex;align-items:center;gap:10px;padding:.85rem 1rem;
  border-bottom:1px solid rgba(148,170,220,.12);background:rgba(6,9,17,.6)}
.gtwin-head__dot{width:12px;height:12px;border-radius:50%;border:2px solid #f0a84b;
  box-shadow:0 0 8px rgba(240,168,75,.7);flex:none}
.gtwin-head__t{font-family:"Space Grotesk",sans-serif;font-weight:600;font-size:.95rem;color:#f0f4fc}
.gtwin-head__s{font-size:.7rem;color:#8a96b0;font-family:"JetBrains Mono",monospace}
.gtwin-head__sp{margin-left:auto;display:flex;gap:4px}
.gtwin-iconbtn{background:transparent;border:1px solid rgba(148,170,220,.18);border-radius:8px;
  width:30px;height:30px;color:#8a96b0;cursor:pointer;display:flex;align-items:center;
  justify-content:center;font-size:14px;transition:color .2s,border-color .2s}
.gtwin-iconbtn:hover{color:#f0f4fc;border-color:rgba(240,168,75,.5)}
.gtwin-iconbtn.gtwin-active{color:#f0a84b;border-color:rgba(240,168,75,.6)}

.gtwin-log{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.7rem}
.gtwin-msg{max-width:85%;padding:.6rem .8rem;border-radius:12px;font-size:.9rem;line-height:1.5;
  white-space:pre-wrap;word-wrap:break-word}
.gtwin-msg--user{align-self:flex-end;background:#f0a84b;color:#1a1206;border-bottom-right-radius:3px}
.gtwin-msg--bot{align-self:flex-start;background:rgba(20,28,46,.9);border:1px solid rgba(148,170,220,.12);
  border-bottom-left-radius:3px}
.gtwin-msg--err{align-self:flex-start;background:rgba(60,20,20,.7);border:1px solid rgba(200,90,90,.4);
  color:#f0c0c0;font-size:.82rem}
.gtwin-typing{align-self:flex-start;color:#8a96b0;font-size:.8rem;font-family:"JetBrains Mono",monospace}

.gtwin-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 1rem .6rem}
.gtwin-chip{background:rgba(20,28,46,.7);border:1px solid rgba(148,170,220,.16);border-radius:999px;
  padding:.35rem .7rem;font-size:.76rem;color:#9ec5ff;cursor:pointer;transition:border-color .2s}
.gtwin-chip:hover{border-color:rgba(240,168,75,.5)}

.gtwin-foot{display:flex;gap:6px;padding:.7rem;border-top:1px solid rgba(148,170,220,.12);align-items:flex-end}
.gtwin-input{flex:1;resize:none;max-height:90px;min-height:38px;padding:.55rem .7rem;border-radius:10px;
  background:rgba(6,9,17,.7);border:1px solid rgba(148,170,220,.18);color:#d7deed;font-family:inherit;
  font-size:.88rem;line-height:1.4;outline:none}
.gtwin-input:focus{border-color:rgba(240,168,75,.5)}
.gtwin-send{flex:none;width:38px;height:38px;border-radius:10px;border:none;background:#f0a84b;color:#1a1206;
  font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
.gtwin-send:hover{background:#f7b863}
.gtwin-send:disabled{opacity:.45;cursor:default}
.gtwin-mic.gtwin-listening{color:#f0a84b;border-color:rgba(240,168,75,.7);animation:gtwin-pulse 1.2s infinite}
@media (max-width:640px){.gtwin-trigger{left:1rem;bottom:1rem}.gtwin-panel{left:1rem;bottom:4.8rem}}
`;

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ===== build DOM =====
  var trigger = document.createElement("button");
  trigger.className = "gtwin-trigger" + (reduced ? " gtwin-reduced" : "");
  trigger.setAttribute("aria-label", "Chat with Amal's AI twin");
  trigger.title = "Ask my AI twin anything";
  trigger.innerHTML =
    '<span class="gtwin-bh"><span class="gtwin-bh__disk"></span>' +
    '<span class="gtwin-bh__ring"></span><span class="gtwin-bh__core"></span></span>';

  var panel = document.createElement("div");
  panel.className = "gtwin-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with Amal's AI twin");
  panel.innerHTML =
    '<div class="gtwin-head">' +
    '<span class="gtwin-head__dot"></span>' +
    '<div><div class="gtwin-head__t">Amal — AI twin</div>' +
    '<div class="gtwin-head__s">grounded in my own work</div></div>' +
    '<div class="gtwin-head__sp">' +
    '<button class="gtwin-iconbtn gtwin-speak" aria-label="Toggle speech" title="Read replies aloud">🔊</button>' +
    '<button class="gtwin-iconbtn gtwin-close" aria-label="Close">✕</button>' +
    "</div></div>" +
    '<div class="gtwin-log" aria-live="polite"></div>' +
    '<div class="gtwin-chips"></div>' +
    '<div class="gtwin-foot">' +
    '<textarea class="gtwin-input" rows="1" placeholder="Ask about my work, my experience…" aria-label="Message"></textarea>' +
    (SpeechRec
      ? '<button class="gtwin-iconbtn gtwin-mic" aria-label="Speak" title="Speak your question">🎤</button>'
      : "") +
    '<button class="gtwin-send" aria-label="Send">↑</button>' +
    "</div>";

  document.body.appendChild(trigger);
  document.body.appendChild(panel);

  var log = panel.querySelector(".gtwin-log");
  var chips = panel.querySelector(".gtwin-chips");
  var input = panel.querySelector(".gtwin-input");
  var sendBtn = panel.querySelector(".gtwin-send");
  var micBtn = panel.querySelector(".gtwin-mic");
  var speakBtn = panel.querySelector(".gtwin-speak");
  var closeBtn = panel.querySelector(".gtwin-close");

  var STARTERS = [
    "What are you working on at Veracode?",
    "Tell me about MARES.",
    "What roles are you looking for?",
    "What's with the black hole?",
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
              "Once the Cloudflare Worker is live, I answer from Amal's real corpus " +
              "(his AWS Bedrock work, the Veracode move, the Interstellar thing, and so on)."
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
        // keep history consistent: drop the unanswered user turn
        messages.pop();
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
    u.pitch = 1;
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

  // ===== events =====
  function openPanel() {
    panel.classList.add("gtwin-open");
    renderChips();
    if (messages.length === 0 && log.children.length === 0) {
      addMsg("bot", "Hi — I'm Amal's AI twin, and I answer from his actual work and writing. Ask me anything about what I build, where I've worked, or what I'm looking for.");
    }
    setTimeout(function () {
      input.focus();
    }, 60);
  }
  function closePanel() {
    panel.classList.remove("gtwin-open");
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  trigger.addEventListener("click", function () {
    if (panel.classList.contains("gtwin-open")) closePanel();
    else openPanel();
  });
  closeBtn.addEventListener("click", closePanel);
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
    input.style.height = Math.min(input.scrollHeight, 90) + "px";
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("gtwin-open")) closePanel();
  });
})();
