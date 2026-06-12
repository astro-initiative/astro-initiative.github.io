/* Starfield with parallax, decode-on-reveal text, mission rail,
   skill constellations, card tilt, TARS, and a Morse easter egg.
   All motion respects prefers-reduced-motion. */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ================= starfield ================= */
  var canvas = document.getElementById("starfield");
  var ctx = canvas.getContext("2d");
  var stars = [];
  var shootingStar = null;
  var lastShoot = 0;
  var mouse = { x: 0, y: 0 }; // normalized -1..1, eased

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStars();
  }

  function buildStars() {
    var count = Math.floor((window.innerWidth * window.innerHeight) / 5200);
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.3 + 0.3,
        z: Math.random() * 0.8 + 0.2,             // parallax depth
        base: Math.random() * 0.55 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.9 + 0.4,
        warm: Math.random() < 0.18
      });
    }
  }

  function drawStars(t) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var alpha = reducedMotion
        ? s.base
        : s.base * (0.65 + 0.35 * Math.sin(t * 0.001 * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x + mouse.x * s.z * 14, s.y + mouse.y * s.z * 9, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.warm
        ? "rgba(240, 188, 120, " + alpha + ")"
        : "rgba(215, 226, 248, " + alpha + ")";
      ctx.fill();
    }
  }

  function maybeShoot(t) {
    if (!shootingStar && t - lastShoot > 9000 + Math.random() * 9000) {
      shootingStar = {
        x: Math.random() * window.innerWidth * 0.7 + window.innerWidth * 0.15,
        y: Math.random() * window.innerHeight * 0.35,
        vx: 5 + Math.random() * 3.5,
        vy: 2 + Math.random() * 1.5,
        life: 1
      };
      lastShoot = t;
    }
    if (shootingStar) {
      var st = shootingStar;
      var grad = ctx.createLinearGradient(st.x - st.vx * 12, st.y - st.vy * 12, st.x, st.y);
      grad.addColorStop(0, "rgba(240, 188, 120, 0)");
      grad.addColorStop(1, "rgba(245, 230, 205, " + 0.85 * st.life + ")");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(st.x - st.vx * 12, st.y - st.vy * 12);
      ctx.lineTo(st.x, st.y);
      ctx.stroke();
      st.x += st.vx;
      st.y += st.vy;
      st.life -= 0.018;
      if (st.life <= 0 || st.x > window.innerWidth + 100) shootingStar = null;
    }
  }

  function frame(t) {
    drawStars(t);
    maybeShoot(t);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  if (reducedMotion) {
    drawStars(0);
  } else {
    requestAnimationFrame(frame);
  }

  /* ================= mouse parallax (starfield + gargantua) ================= */
  if (!reducedMotion && finePointer) {
    var targetMouse = { x: 0, y: 0 };
    var gargantua = document.getElementById("gargantua");

    document.addEventListener("mousemove", function (e) {
      targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    (function easeMouse() {
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;
      if (gargantua) {
        gargantua.style.setProperty("--px", (mouse.x * -16).toFixed(1) + "px");
        gargantua.style.setProperty("--py", (mouse.y * -10).toFixed(1) + "px");
      }
      requestAnimationFrame(easeMouse);
    })();
  }

  /* ================= decode-on-reveal text ================= */
  var DECODE_CHARS = "█▓▒░<>/\\|=+*·";

  function decode(el) {
    if (reducedMotion || el.dataset.decoded) return;
    el.dataset.decoded = "1";
    var original = el.textContent;
    var duration = 700;
    var start = null;

    function step(t) {
      if (!start) start = t;
      var progress = Math.min((t - start) / duration, 1);
      var settled = Math.floor(original.length * progress);
      var out = original.slice(0, settled);
      for (var i = settled; i < original.length; i++) {
        out += original[i] === " "
          ? " "
          : DECODE_CHARS[Math.floor(Math.random() * DECODE_CHARS.length)];
      }
      el.textContent = out;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = original;
    }
    requestAnimationFrame(step);
  }

  // hero decodes on load; section titles decode when revealed
  document.querySelectorAll(".hero [data-decode]").forEach(decode);

  /* ================= reveal sections on scroll ================= */
  var revealTargets = document.querySelectorAll(
    ".section__title, .about__text, .about__stats, .timeline__item, .card, .constellation, .skills__group, .edu__col, .contact__lead"
  );
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        var d = entry.target.querySelector("[data-decode]");
        if (d) decode(d);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );
  revealTargets.forEach(function (el) { io.observe(el); });

  /* ================= active nav link + trajectory rail ================= */
  var sections = document.querySelectorAll("section[id]");
  var navLinks = document.querySelectorAll(".nav__links a");
  var railDots = document.querySelectorAll(".rail a");

  var navIo = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
        });
        railDots.forEach(function (dot) {
          dot.classList.toggle("is-active", dot.dataset.rail === id);
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  sections.forEach(function (s) { navIo.observe(s); });

  /* ================= skill constellations ================= */
  var CONSTELLATIONS = [
    {
      name: "AI / ML",
      color: "#f0a84b",
      label: [50, 36],
      stars: [
        ["Multi-Agent Systems", 80, 90, 5],
        ["RAG", 170, 150, 4.5],
        ["LLM Evaluation", 100, 225, 3.5],
        ["NLP", 215, 240, 4],
        ["Deep Learning", 295, 165, 4.5],
        ["RLHF Pipelines", 420, 100, 3.5],
        ["LSTM / GRU", 365, 230, 3],
        ["Attention", 305, 310, 3],
        ["TensorFlow", 185, 340, 3.5],
        ["PyTorch", 265, 400, 3.5],
        ["CNNs", 390, 355, 3],
        ["Recommenders", 455, 275, 3]
      ],
      links: [[0,1],[1,2],[1,3],[3,4],[4,5],[4,6],[6,7],[7,8],[7,9],[9,10],[6,11]]
    },
    {
      name: "Cloud & Infra",
      color: "#9ec5ff",
      label: [560, 36],
      stars: [
        ["Amazon Bedrock", 590, 95, 5],
        ["SageMaker", 680, 155, 4],
        ["OpenSearch", 635, 245, 3.5],
        ["AWS Lambda", 725, 285, 3.5],
        ["AWS Batch", 790, 195, 3.5],
        ["Serverless", 855, 115, 3.5],
        ["Elasticsearch", 815, 290, 3],
        ["Kibana", 895, 235, 3]
      ],
      links: [[0,1],[1,2],[2,3],[1,4],[4,5],[3,6],[6,7],[4,7]]
    },
    {
      name: "Engineering",
      color: "#d7deed",
      label: [490, 470],
      stars: [
        ["Python", 500, 395, 4.5],
        ["Distributed Systems", 590, 425, 3.5],
        ["Data Pipelines", 690, 400, 3.5],
        ["App Security", 780, 430, 4],
        ["Production Ops", 870, 405, 3],
        ["Info Retrieval", 945, 360, 3]
      ],
      links: [[0,1],[1,2],[2,3],[3,4],[4,5]]
    }
  ];

  function renderConstellation() {
    var host = document.getElementById("constellation");
    if (!host) return;
    var W = 1000, H = 500;
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" xmlns="http://www.w3.org/2000/svg">';

    CONSTELLATIONS.forEach(function (c) {
      // links first, under the stars
      c.links.forEach(function (pair) {
        var a = c.stars[pair[0]], b = c.stars[pair[1]];
        svg += '<line class="c-line" x1="' + a[1] + '" y1="' + a[2] +
               '" x2="' + b[1] + '" y2="' + b[2] +
               '" stroke="' + c.color + '" />';
      });
      svg += '<text class="c-group-label" x="' + c.label[0] + '" y="' + c.label[1] +
             '" fill="' + c.color + '">' + c.name.toUpperCase() + "</text>";
      c.stars.forEach(function (s) {
        var name = s[0], x = s[1], y = s[2], r = s[3];
        // label placement: flip to the left side near the right edge
        var anchor = x > W - 130 ? "end" : "start";
        var lx = anchor === "end" ? x - r - 6 : x + r + 6;
        svg += '<g class="c-star" style="color:' + c.color + '">' +
               '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c.color + '">' +
               (reducedMotion ? "" :
                 '<animate attributeName="opacity" values="1;0.55;1" dur="' +
                 (2.5 + Math.random() * 3).toFixed(1) + 's" repeatCount="indefinite" />') +
               "</circle>" +
               '<text x="' + lx + '" y="' + (y + 4) + '" text-anchor="' + anchor + '">' + name + "</text>" +
               "</g>";
      });
    });

    svg += "</svg>";
    host.innerHTML = svg;
  }
  renderConstellation();

  /* ================= card tilt ================= */
  if (!reducedMotion && finePointer) {
    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
        var ry = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
        card.style.transform =
          "perspective(1100px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" +
          ry.toFixed(2) + "deg) translateY(-4px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ================= TARS ================= */
  var tarsQuips = [
    "Honesty setting: 100%. Yes, he has watched Interstellar more times than he'll admit.",
    "Humor setting: 75%. Any higher and this site becomes a screenplay.",
    "Status report: seven years of production systems. Zero crews abandoned.",
    "This is TARS. I handle the easter eggs. Amal handles the agents.",
    "Recruiter detected. Probability of a good hire: it's not possible— no wait, it's necessary.",
    "The blinking ring up top? Morse code. Work it out, Cooper."
  ];
  var tarsIndex = 0;
  var tarsBot = document.getElementById("tars-bot");
  var tarsBubble = document.getElementById("tars-bubble");
  var tarsTimer = null;

  if (tarsBot && tarsBubble) {
    tarsBot.addEventListener("click", function () {
      tarsBubble.textContent = tarsQuips[tarsIndex % tarsQuips.length];
      tarsIndex++;
      tarsBubble.hidden = false;
      clearTimeout(tarsTimer);
      tarsTimer = setTimeout(function () { tarsBubble.hidden = true; }, 7000);
    });
  }

  /* ================= Morse "STAY" on the logo ring ================= */
  // S = ···  T = −  A = ·−  Y = −·−−
  if (!reducedMotion) {
    var ring = document.getElementById("morse-ring");
    if (ring) {
      var DOT = 220, DASH = 660, GAP = 220, LETTER_GAP = 660, WORD_GAP = 4000;
      var seq = [];
      "... - .- -.--".split("").forEach(function (ch) {
        if (ch === ".") seq.push([DOT, GAP]);
        else if (ch === "-") seq.push([DASH, GAP]);
        else seq.push([0, LETTER_GAP]); // space between letters
      });

      ring.classList.add("morse-off"); // resting state: dim; flashes spell the word
      var idx = 0;
      (function tick() {
        if (idx >= seq.length) {
          idx = 0;
          setTimeout(tick, WORD_GAP); // pause, then repeat the word
          return;
        }
        var step = seq[idx++];
        if (step[0] > 0) {
          ring.classList.remove("morse-off"); // flash on for dot/dash
          setTimeout(function () {
            ring.classList.add("morse-off");
            setTimeout(tick, step[1]);
          }, step[0]);
        } else {
          setTimeout(tick, step[1]); // letter gap, stay dim
        }
      })();
    }
  }
})();
