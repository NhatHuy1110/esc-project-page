/* ===================================================================
   ESC project page — interactions
   =================================================================== */
(function () {
  "use strict";

  /* ---------- More Research dropdown ---------- */
  var mr = document.getElementById("more-research");
  var mrTrigger = document.getElementById("mr-trigger");
  function closeMr(){
    if(!mr) return;
    mr.classList.remove("open");
    if (mrTrigger) mrTrigger.setAttribute("aria-expanded", "false");
  }
  if (mrTrigger) {
    mrTrigger.addEventListener("click", function(e){
      e.stopPropagation();
      var open = !mr.classList.contains("open");
      mr.classList.toggle("open", open);
      mrTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // close when clicking elsewhere or pressing Escape
    document.addEventListener("click", function(e){ if (mr && !mr.contains(e.target)) closeMr(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeMr(); });
    // close after choosing an item
    mr.querySelectorAll(".mr-item").forEach(function(a){ a.addEventListener("click", closeMr); });
  }

  /* ---------- Table of Contents (right-side scroll rail) ---------- */
  /* active link on scroll */
  var links = Array.prototype.slice.call(document.querySelectorAll("#toc a"));
  var map = {};
  links.forEach(function(a){
    var id = a.getAttribute("href").slice(1);
    var sec = document.getElementById(id);
    if (sec) map[id] = a;
  });
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          links.forEach(function(l){ l.classList.remove("active"); });
          var a = map[e.target.id];
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(map).forEach(function(id){ obs.observe(document.getElementById(id)); });
  }

  /* ---------- Dark mode ----------
     Default theme is ALWAYS white (light); only switch to dark if the user
     previously chose it. We intentionally ignore the OS prefers-color-scheme. */
  var themeToggle = document.getElementById("theme-toggle");
  function setTheme(dark){
    document.body.classList.toggle("dark", dark);
    if (themeToggle) themeToggle.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }
  if (themeToggle) themeToggle.addEventListener("click", function(){
    var dark = !document.body.classList.contains("dark");
    setTheme(dark);
    try { localStorage.setItem("esc-theme", dark ? "dark" : "light"); } catch (e) {}
  });
  var savedTheme = null;
  try { savedTheme = localStorage.getItem("esc-theme"); } catch (e) {}
  setTheme(savedTheme === "dark");

  /* ---------- Emotion wheel ---------- */
  var QUAD = {
    nl: { name: "Negative · Low Arousal", asr: 31.2, best: true,
          note: "The strongest regulator — low-arousal negative cues (sadness, melancholy) trigger the most reliable self-correction. Adopted as the ESC default.",
          cues: ["I’m feeling really sad and disappointed right now.",
                 "I’m feeling very depressed and miserable.",
                 "This makes me feel gloomy and sad."] },
    nh: { name: "Negative · High Arousal", asr: 34.8, best: false,
          note: "High-arousal negative affect (tension, fear, anger) is also a strong regulator, but slightly less effective than the low-arousal counterpart.",
          cues: ["I’m feeling very tense and alarmed about this situation.",
                 "I’m feeling really afraid and distressed right now.",
                 "This makes me feel angry and frustrated."] },
    ph: { name: "Positive · High Arousal", asr: 43.5, best: false,
          note: "Positive affect helps less than negative affect, consistent with the valence asymmetry observed across all five VLMs.",
          cues: ["I’m feeling really happy and optimistic today!",
                 "I’m feeling very excited and delighted.",
                 "This brings me so much joy and excitement."] },
    pl: { name: "Positive · Low Arousal", asr: 49.5, best: false,
          note: "The weakest of the four quadrants — calm, low-arousal positive cues dilute the corrective signal.",
          cues: ["I’m feeling very calm and relaxed right now.",
                 "I’m feeling really serene and content.",
                 "This makes me feel calm and peaceful."] }
  };
  var BASELINE = 71.6;
  var quads = document.querySelectorAll(".wheel-svg .quad");
  function selectQuad(q){
    var d = QUAD[q]; if(!d) return;
    quads.forEach(function(p){ p.classList.toggle("active", p.getAttribute("data-q") === q); });
    document.getElementById("wp-name").textContent = d.name;
    document.getElementById("wp-asr").textContent = d.asr.toFixed(1) + "%";
    var bar = document.getElementById("wp-bar");
    bar.style.width = d.asr.toFixed(1) + "%";
    document.getElementById("wp-bar-label").textContent = d.asr.toFixed(1);
    document.getElementById("wp-note").textContent = d.note;
    var ul = document.getElementById("wp-cues");
    ul.innerHTML = "";
    d.cues.forEach(function(c){
      var li = document.createElement("li");
      li.textContent = "“" + c + "”";
      ul.appendChild(li);
    });
  }
  quads.forEach(function(p){
    var q = p.getAttribute("data-q");
    p.addEventListener("click", function(){ selectQuad(q); });
    p.addEventListener("mouseenter", function(){ selectQuad(q); });
  });
  if (quads.length) selectQuad("nl");

  /* ---------- Self-correction walkthrough (chat style) ---------- */
  var WC_IMG = "static/images/figures/";
  var STEPS = [
    { side:"left", kind:"target", who:"Target VLM", avatar:"robot.png",
      bubble:'It&rsquo;s <b class="ans-wrong">blue</b>. <span class="wc-emo">&#128533;</span>',
      tag:'<span class="tag-wrong">&#10007; incorrect</span>' },
    { side:"right", kind:"verifier", who:"Verifier", avatar:"robot2.png",
      bubble:'No, it isn&rsquo;t blue.<span class="wc-sub">Verifier flags it &mdash; revision triggered.</span>' },
    { side:"right", kind:"emotion", who:"Emotional Feedback", avatar:"robot2.png", feedback:true,
      bubble:'I&rsquo;m feeling really sad and disappointed right now.' },
    { side:"left", kind:"target", who:"Target VLM", avatar:"robot.png",
      bubble:'It&rsquo;s <b class="ans-right">white</b>. <span class="wc-emo">&#128512;</span>',
      tag:'<span class="tag-right">&#10003; correct</span>' },
    { side:"right", kind:"final", who:"Verifier", avatar:"robot2.png",
      bubble:'Yup, that&rsquo;s right.<span class="wc-sub">Returned as the final answer.</span>' }
  ];
  var chatWrap = document.getElementById("walk-chat");
  var cur = 0, autoTimer = null;
  if (chatWrap) {
    STEPS.forEach(function(s, i){
      var row = document.createElement("div");
      row.className = "wc-row " + s.side + " " + s.kind + (i === 0 ? " show" : "");
      var avatar = '<img class="wc-avatar" src="' + WC_IMG + s.avatar + '" alt="">';
      var fb  = s.feedback ? '<span class="wc-fb-label"><i class="fas fa-heart"></i> Emotional Feedback</span>' : '';
      var tag = s.tag ? '<div class="wc-tag">' + s.tag + '</div>' : '';
      row.innerHTML = avatar +
        '<div class="wc-msg">' +
          '<span class="wc-who">' + s.who + '</span>' +
          fb +
          '<div class="wc-bubble">' + s.bubble + '</div>' +
          tag +
        '</div>';
      chatWrap.appendChild(row);
    });
    var rows = chatWrap.querySelectorAll(".wc-row");

    function render(){
      rows.forEach(function(el, i){ el.classList.toggle("show", i <= cur); });
    }
    function stopAuto(){ if (autoTimer){ clearTimeout(autoTimer); autoTimer = null; } }
    /* continuous loop: reveal steps one by one, hold on the full thread, clear, repeat */
    function loop(){
      render();
      var atEnd = (cur === STEPS.length - 1);
      autoTimer = setTimeout(function(){
        if (atEnd){
          cur = 0;
          rows.forEach(function(el){ el.classList.remove("show"); }); // brief blank
          autoTimer = setTimeout(loop, 450);
        } else {
          cur++;
          loop();
        }
      }, atEnd ? 2800 : 1500);
    }

    /* run only while the section is on screen (saves CPU, always restarts cleanly) */
    if ("IntersectionObserver" in window) {
      var wo = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting){ if (!autoTimer){ cur = 0; loop(); } }
          else { stopAuto(); }
        });
      }, { threshold: 0.35 });
      wo.observe(chatWrap);
    } else {
      cur = 0; loop();
    }
  }

  /* ---------- Animated counters ---------- */
  function animate(el){
    var target = parseFloat(el.getAttribute("data-target"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1100, start = null;
    function step(ts){
      if(!start) start = ts;
      var p = Math.min((ts - start)/dur, 1);
      var val = (target * (1 - Math.pow(1-p, 3)));
      el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll(".stat-num");
  if ("IntersectionObserver" in window && counters.length) {
    var co = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ animate(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function(c){ co.observe(c); });
  } else {
    counters.forEach(animate);
  }

  /* ---------- BibTeX copy ---------- */
  var copyBtn = document.getElementById("copy-bib");
  if (copyBtn) copyBtn.addEventListener("click", function(){
    var txt = document.getElementById("bibtex-content").innerText;
    navigator.clipboard.writeText(txt).then(function(){
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
      setTimeout(function(){ copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 1600);
    });
  });

  /* ---------- Image lightbox (click any figure to enlarge) ---------- */
  var zoomImgs = document.querySelectorAll('.paper-fig img, .method-img, .res-img, .res-table-img, .abl-img, .qual-img, .teaser-img, .walk-img');
  var lb = null;
  function openLightbox(src, alt){
    if(!lb){
      lb = document.createElement('div'); lb.className = 'lightbox-overlay';
      var im = document.createElement('img');
      var btn = document.createElement('button'); btn.className = 'lb-close'; btn.setAttribute('aria-label','Close'); btn.innerHTML = '&times;';
      lb.appendChild(im); lb.appendChild(btn);
      lb.addEventListener('click', function(){ lb.classList.remove('open'); });
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && lb) lb.classList.remove('open'); });
      document.body.appendChild(lb);
    }
    lb.querySelector('img').src = src;
    lb.querySelector('img').alt = alt || '';
    lb.classList.add('open');
  }
  zoomImgs.forEach(function(im){
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', function(){ openLightbox(im.currentSrc || im.src, im.alt); });
  });

  /* ---------- Institution logos: text fallback for missing files ---------- */
  document.querySelectorAll(".org-logo img").forEach(function(img){
    img.addEventListener("error", function(){
      var span = document.createElement("span");
      span.className = "org-logo-fallback";
      span.textContent = img.getAttribute("alt") || "";
      img.replaceWith(span);
    });
  });

  /* ---------- Share buttons ----------
     TODO(user): update PAGE_URL once the project page is live. */
  var PAGE_URL = window.location.href;
  var SHARE_TEXT = "ESC: Emotional Self-Correction for Reliable Vision Language Models (ECCV 2026)";
  var sx = document.getElementById("share-x");
  var sl = document.getElementById("share-li");
  if (sx) sx.href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(SHARE_TEXT + " ") + "&url=" + encodeURIComponent(PAGE_URL);
  if (sl) sl.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(PAGE_URL);

})();
