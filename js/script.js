/* Made to Scale: menu toggle and a paused hero video for reduced motion. Everything else works without script. */
(function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('nav-links');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
      });
    });
  }

  var video = document.querySelector('.hero__video');
  if (video) {
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { video.pause(); video.removeAttribute('autoplay'); }
    else {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
  }
})();

/* =========================================================
   CONNECTED JOURNEY (interactive)
   Each step's text comes from data-* attributes on its button,
   so the copy lives in one place (index.html).
   ========================================================= */
(function () {
  const buttons = Array.from(document.querySelectorAll('.journey__step'));
  if (!buttons.length) return;

  const label = document.getElementById('journey-label');
  const title = document.getElementById('journey-title');
  const text = document.getElementById('journey-text');
  const tools = document.getElementById('journey-tools');
  const prev = document.getElementById('journey-prev');
  const next = document.getElementById('journey-next');
  if (!label || !title || !text || !tools || !prev || !next) return;

  const panel = document.querySelector('.journey__panel');
  let current = 0;

  function show(i) {
    current = (i + buttons.length) % buttons.length;
    const b = buttons[current];

    // Restart the panel's content animation on every change.
    if (panel) {
      panel.classList.remove('is-changing');
      void panel.offsetWidth;
      panel.classList.add('is-changing');
    }

    buttons.forEach((btn, k) => {
      const on = k === current;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });

    label.textContent = 'Step ' + (current + 1) + ' of ' + buttons.length;
    title.textContent = b.dataset.title;
    text.textContent = b.dataset.text;
    tools.textContent = b.dataset.tools;
  }

  buttons.forEach((btn, k) => btn.addEventListener('click', () => {
    show(k);
    // on phones, keep the tapped step visible in the swipeable row
    if (window.matchMedia('(max-width: 900px)').matches) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }));
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  show(0);
})();


/* Work filters (concept builds) and FAQ "show all" toggle. Without script, everything stays visible. */
(function () {
  var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.proj-grid .proj'));
  filters.forEach(function (f) {
    f.addEventListener('click', function () {
      var cat = f.getAttribute('data-filter');
      filters.forEach(function (x) { x.setAttribute('aria-pressed', String(x === f)); });
      items.forEach(function (it) {
        it.hidden = !(cat === 'all' || it.getAttribute('data-cat') === cat);
      });
    });
  });

  var qs = Array.prototype.slice.call(document.querySelectorAll('.faq-q'));
  var more = document.getElementById('faq-more');
  var LIMIT = 6;
  if (more && qs.length > LIMIT) {
    var expanded = false;
    qs.forEach(function (q, i) { if (i >= LIMIT) q.hidden = true; });
    more.hidden = false;
    more.textContent = 'Show all ' + qs.length + ' questions';
    more.addEventListener('click', function () {
      expanded = !expanded;
      qs.forEach(function (q, i) { if (i >= LIMIT) q.hidden = !expanded; });
      more.textContent = expanded ? 'Show fewer questions' : 'Show all ' + qs.length + ' questions';
      more.setAttribute('aria-expanded', String(expanded));
    });
  }
})();
