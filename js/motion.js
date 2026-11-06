/* =========================================================
   Made to Scale: cinematic motion layer (no libraries)
   - hero: words rise out of a mask, the earth rises, the sun comes up,
     stars drift behind, the whole scene follows the pointer and zooms in as you scroll
   - a held statement whose words light up as you scroll
   - section headings rise word by word
   - cards follow the pointer with light and a gentle tilt
   - buttons lean toward the pointer
   Everything is an extra: with "reduce motion" on, or if this file fails,
   the page shows normally. Pairs with css/motion.css.
   ========================================================= */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) { root.classList.remove('m-pre'); return; }

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var small = window.matchMedia('(max-width: 720px)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var qa = function (s, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(s)); };

  root.classList.add('m-on');

  /* ---------- header height, for the held statement ---------- */
  var header = doc.querySelector('.top');
  function measureHeader() {
    if (header) root.style.setProperty('--hh', header.offsetHeight + 'px');
  }
  measureHeader();
  window.addEventListener('resize', measureHeader);

  /* ---------- split text into words (each in its own mask) ---------- */
  function splitWords(el, masked) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var wi = doc.createElement('span');
            wi.className = 'm-wi';
            wi.style.setProperty('--i', Math.min(i++, 16));
            wi.textContent = p;
            if (masked) {
              var w = doc.createElement('span');
              w.className = 'm-w';
              w.setAttribute('aria-hidden', 'true');
              w.appendChild(wi);
              frag.appendChild(w);
            } else {
              wi.setAttribute('aria-hidden', 'true');
              frag.appendChild(wi);
            }
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(el);
    el.setAttribute('aria-label', label);
    return qa('.m-wi', el);
  }

  /* ---------- 1. hero headline ---------- */
  var heroTitle = doc.querySelector('.hero__title');
  if (heroTitle) {
    splitWords(heroTitle, true);
    heroTitle.classList.add('m-split');
  }
  root.classList.remove('m-pre');

  /* ---------- 2. section headings ---------- */
  var seen = [];
  qa('.section__head, .faq__head').forEach(function (head) {
    var h2 = head.querySelector('h2');
    if (!h2) return;
    splitWords(h2, true);
    h2.classList.add('m-split');
    head.classList.remove('reveal'); // the words are the entrance now
    head.classList.add('m-head');
    seen.push(head);
  });
  qa('.contact__copy h2').forEach(function (h2) {
    splitWords(h2, true);
    h2.classList.add('m-split');
    seen.push(h2);
  });
  var headIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); headIO.unobserve(e.target); }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  seen.forEach(function (el) { headIO.observe(el); });

  /* ---------- varied entrances (direction per group) ---------- */
  qa('.svc-grid .svc').forEach(function (el, i) {
    el.style.setProperty('--rx', (i % 2 ? '44px' : '-44px'));
    el.style.setProperty('--ry', '34px');
  });
  qa('.steps li').forEach(function (el) {
    el.style.setProperty('--rx', '-34px');
    el.style.setProperty('--ry', '0px');
  });
  qa('.proj-grid .proj').forEach(function (el) { el.style.setProperty('--ry', '58px'); });
  qa('.ind li, .why__list li').forEach(function (el) { el.style.setProperty('--ry', '26px'); });

  /* ---------- 3. held statement (words light up with scroll) ---------- */
  var intro = doc.querySelector('.intro');
  var statement = intro && intro.querySelector('.statement');
  var inkWords = [];
  if (statement) {
    inkWords = splitWords(statement, false);
    statement.classList.add('m-ink');
    intro.classList.add('m-scene');
  }
  function paintInk() {
    if (!inkWords.length) return;
    var total = intro.offsetHeight - window.innerHeight + (header ? header.offsetHeight : 0);
    var t = total > 0 ? clamp(-intro.getBoundingClientRect().top / total, 0, 1) : 1;
    var f = clamp(t / 0.8, 0, 1); // finished with a short hold at the end
    var n = inkWords.length, ramp = 2.6;
    for (var k = 0; k < n; k++) {
      var a = clamp((f * (n + ramp) - k) / ramp, 0, 1);
      inkWords[k].style.opacity = (0.2 + 0.8 * a).toFixed(3);
    }
  }

  /* ---------- 4. hero scene: sun, stars, pointer, zoom ---------- */
  var hero = doc.querySelector('.hero');
  var earth = doc.querySelector('.hero__earth');
  var heroVisible = true;
  var mx = 0, my = 0, tx = 0, ty = 0; // pointer, smoothed

  if (earth && !earth.querySelector('.hero__sun')) {
    var sun = doc.createElement('div');
    sun.className = 'hero__sun';
    sun.setAttribute('aria-hidden', 'true');
    earth.appendChild(sun);
  }

  var stars = (function () {
    if (!hero) return null;
    var c = doc.createElement('canvas');
    c.className = 'hero__stars';
    c.setAttribute('aria-hidden', 'true');
    hero.insertBefore(c, hero.firstChild);
    var ctx = c.getContext && c.getContext('2d');
    if (!ctx) { c.remove(); return null; }
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, list = [], shoot = null, nextShoot = 4500, scrollY = 0;

    function build() {
      W = hero.clientWidth; H = hero.clientHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(clamp(W * H / (small ? 11000 : 7500), 40, 220));
      list = [];
      for (var i = 0; i < count; i++) {
        var z = Math.random();
        list.push({
          x: Math.random(), y: Math.random() * 0.72, z: 0.25 + z * 0.75,
          r: 0.35 + z * 1.15, sp: 0.6 + Math.random() * 1.8, ph: Math.random() * 6.28,
          warm: Math.random() < 0.28
        });
      }
    }
    function draw(now) {
      var t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        var px = (((s.x * W - t * 5 * s.z) % W) + W) % W - mx * s.z * 18;
        var py = s.y * H - scrollY * s.z * 0.22 - my * s.z * 10;
        var tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        var fade = clamp(1 - s.y / 0.78, 0.15, 1);
        ctx.globalAlpha = (0.25 + 0.75 * tw) * (0.35 + 0.65 * s.z) * fade;
        ctx.fillStyle = s.warm ? '#ffd9a0' : '#ffffff';
        ctx.beginPath(); ctx.arc(px, py, s.r, 0, 6.2832); ctx.fill();
      }
      // an occasional shooting star
      if (!shoot && now > nextShoot) {
        shoot = { x: W * (0.45 + Math.random() * 0.5), y: H * (0.05 + Math.random() * 0.22), born: now, life: 900 };
        nextShoot = now + 8000 + Math.random() * 7000;
      }
      if (shoot) {
        var p = (now - shoot.born) / shoot.life;
        if (p >= 1) { shoot = null; }
        else {
          var len = 150 * (1 - Math.abs(p - 0.4)), x = shoot.x - p * W * 0.32, y = shoot.y + p * H * 0.16;
          var g = ctx.createLinearGradient(x, y, x + len, y - len * 0.5);
          g.addColorStop(0, 'rgba(255,230,190,' + (0.85 * (1 - p)) + ')');
          g.addColorStop(1, 'rgba(255,230,190,0)');
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.5); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    build();
    window.addEventListener('resize', build);
    return { draw: draw, setScroll: function (y) { scrollY = y; } };
  })();

  /* ---------- one animation loop for the hero, only while it is on screen ---------- */
  var looping = false;
  function frame(now) {
    looping = false;
    if (!heroVisible || doc.hidden) return;
    tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;
    hero.style.setProperty('--mx', tx.toFixed(3));
    hero.style.setProperty('--my', ty.toFixed(3));
    if (stars) stars.draw(now);
    loop();
  }
  function loop() { if (!looping) { looping = true; window.requestAnimationFrame(frame); } }

  if (hero) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) loop();
    }, { threshold: 0 }).observe(hero);
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden) loop(); });
    if (fine) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        mx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
        my = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { mx = 0; my = 0; });
    }
    loop();
  }

  /* ---------- scroll: zoom into the earth, light up the statement ---------- */
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || 0;
    if (hero && earth) {
      var p = clamp(y / Math.max(hero.offsetHeight, 1), 0, 1);
      earth.style.setProperty('--es', (1 + p * 0.22).toFixed(4));
    }
    if (stars) stars.setScroll(y);
    paintInk();
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 5. cards: pointer light + tilt (mouse only) ---------- */
  if (fine) {
    qa('.svc-grid .svc, .proj-grid .proj, .proj--live, .ind li, .steps li, .why__list li, .journey__panel').forEach(function (card) {
      var spot = doc.createElement('i');
      spot.className = 'm-spot';
      spot.setAttribute('aria-hidden', 'true');
      card.insertBefore(spot, card.firstChild);
      card.classList.add('m-card');
      var tilt = card.matches('.svc-grid .svc, .proj-grid .proj, .proj--live');
      var busy = false, ev = null;
      function paint() {
        busy = false;
        var r = card.getBoundingClientRect();
        var px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
        card.style.setProperty('--sx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--sy', (py * 100).toFixed(1) + '%');
        if (tilt) {
          card.style.transition = 'transform .15s linear';
          card.style.transform = 'perspective(1000px) rotateX(' + ((0.5 - py) * 4).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 5).toFixed(2) + 'deg)';
        }
      }
      card.addEventListener('pointerenter', function () { card.classList.add('is-hot'); });
      card.addEventListener('pointermove', function (e) {
        ev = e;
        if (!busy) { busy = true; window.requestAnimationFrame(paint); }
      }, { passive: true });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-hot');
        if (tilt) { card.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1)'; card.style.transform = ''; }
      });
    });
  }

  /* ---------- 6. magnetic buttons (mouse only) ---------- */
  if (fine) {
    var mags = qa('.hero__actions .btn, .svc__cta .btn, .top .btn, .close .btn, .contact .btn--amber');
    mags.forEach(function (b) { b.classList.add('m-mag'); });
    var magBusy = false, lastEv = null;
    function magPaint() {
      magBusy = false;
      mags.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = lastEv.clientX - cx, dy = lastEv.clientY - cy;
        var reach = Math.max(r.width, r.height) * 0.5 + 46;
        if (Math.abs(dx) < r.width / 2 + 46 && Math.abs(dy) < r.height / 2 + 46 && Math.hypot(dx, dy) < reach + r.width / 2) {
          b.style.translate = clamp(dx * 0.18, -9, 9).toFixed(1) + 'px ' + clamp(dy * 0.28, -7, 7).toFixed(1) + 'px';
        } else if (b.style.translate) {
          b.style.translate = '';
        }
      });
    }
    window.addEventListener('pointermove', function (e) {
      lastEv = e;
      if (!magBusy) { magBusy = true; window.requestAnimationFrame(magPaint); }
    }, { passive: true });
  }
})();
