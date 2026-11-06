/* Made to Scale: menu toggle. Everything else works without script. */
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
  var LIMIT = 8;
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


/* =========================================================
   SCROLL EFFECTS
   - header turns solid once you scroll
   - thin gold progress bar at the top
   - cards and headings fade/slide in as they come into view
   - hero earth + text move at a slower speed (parallax)
   Without JavaScript, or with "reduce motion" on, everything simply shows.
   ========================================================= */
(function () {
  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('.top');
  var hero = document.querySelector('.hero');
  var earth = document.querySelector('.hero__earth');
  var heroInner = document.querySelector('.hero__inner');

  // ---- reveal on scroll
  var targets = [
    '.section__head', '.intro .statement', '.facts li', '.journey__steps', '.journey__panel',
    '.svc', '.svc__note', '.why__list li', '.steps li', '.filters', '.proj--live', '.proj-grid .proj',
    '.ind li', '.about__body', '.faq__head', '.faq-q', '.faq__more',
    '.close__title', '.close__row', '.close__audit', '.contact__copy', '.contact__form',
    '.page-hero > .wrap > *', '.build', '.svc-tools', '.svc-q', '.how4 li', '.ptable',
    '.calc > *', '.notes4 > div', '.page-close .wrap > *', '.foot__cols > *'
  ].join(',');
  var els = Array.prototype.slice.call(document.querySelectorAll(targets));

  if (!('IntersectionObserver' in window) || still) {
    els.forEach(function (el) { el.classList.add('reveal', 'is-in'); });
  } else {
    var seen = new Map();
    els.forEach(function (el) {
      var parent = el.parentElement;
      var n = seen.get(parent) || 0;
      seen.set(parent, n + 1);
      el.style.setProperty('--d', Math.min(n * 0.07, 0.42).toFixed(2) + 's');
      if (el.matches('.contact__copy')) el.style.setProperty('--rx', '-40px');
      if (el.matches('.contact__form')) el.style.setProperty('--rx', '40px');
      if (el.matches('.contact__copy, .contact__form')) el.style.setProperty('--ry', '0px');
      el.classList.add('reveal');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---- progress bar
  var bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  // ---- scroll handler (one per animation frame)
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.pageYOffset || 0;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    var max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--p', max > 0 ? Math.min(y / max, 1).toFixed(4) : '0');
    if (!still && hero && y < hero.offsetHeight + 200) {
      if (earth) earth.style.setProperty('--py', (y * 0.28).toFixed(1) + 'px');
      if (heroInner) {
        heroInner.style.setProperty('--hy', (y * 0.18).toFixed(1) + 'px');
        heroInner.style.setProperty('--ho', Math.max(0, 1 - y / (hero.offsetHeight * 0.75)).toFixed(3));
      }
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();


/* =========================================================
   ENQUIRY FORM
   Sends in the background (no page jump) with a 12 second limit.
   If it cannot be sent, the visitor gets ready-made Email and WhatsApp
   links that already contain what they typed, so no enquiry is lost.
   Without JavaScript the form still posts normally to the action URL.
   ========================================================= */
(function () {
  var form = document.querySelector('form.enquiry');
  if (!form || !window.fetch || !window.FormData) return;

  var TO_EMAIL = 'mts.madetoscale@gmail.com';
  var WHATSAPP = '971552571702';
  // Optional: paste a free Web3Forms access key here to send through Web3Forms instead of FormSubmit.
  var WEB3FORMS_KEY = 'a95c5b11-03cb-4e42-b60f-ddc1eddd506e';
  var ENDPOINT = WEB3FORMS_KEY ? 'https://api.web3forms.com/submit' : 'https://formsubmit.co/ajax/' + TO_EMAIL;
  var TIMEOUT_MS = 12000;

  var btn = form.querySelector('.enquiry__submit');
  var note = form.querySelector('.enquiry__note');
  var status = document.createElement('div');
  status.className = 'enquiry__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  form.appendChild(status);

  function collect() {
    var obj = {};
    new FormData(form).forEach(function (v, k) {
      if (k === '_captcha' || k === '_next') return;
      obj[k] = obj[k] ? obj[k] + ', ' + v : v;
    });
    return obj;
  }

  function plainText(o) {
    return 'Name: ' + (o.name || '') + '\n' +
      'Email: ' + (o.email || '') + '\n' +
      'Phone: ' + (o.phone || '') + '\n' +
      'Business type: ' + (o.business || '') + '\n' +
      'Needs: ' + (o.need || '') + '\n\n' +
      (o.message || '');
  }

  function show(html, kind) {
    status.className = 'enquiry__status enquiry__status--' + kind;
    status.innerHTML = html;
    status.hidden = false;
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function succeeded() {
    form.reset();
    if (note) note.hidden = true;
    show('<strong>Thank you, your enquiry was sent.</strong> We will reply to you soon.', 'ok');
  }

  function failed(o) {
    var text = plainText(o);
    var mail = 'mailto:' + TO_EMAIL + '?subject=' + encodeURIComponent('New enquiry from madetoscale.site') +
      '&body=' + encodeURIComponent(text);
    var wa = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hello Made to Scale,\n\n' + text);
    show(
      '<strong>Sorry, we could not send that automatically.</strong> Your details are safe in the form. ' +
      'Please send them with one click:' +
      '<span class="enquiry__alt"><a class="btn btn--amber" href="' + mail + '">Email us</a>' +
      '<a class="btn btn--ghost" href="' + wa + '" target="_blank" rel="noopener">WhatsApp us</a></span>',
      'error'
    );
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var o = collect();
    if (o._honey) { succeeded(); return; }          // a bot filled the hidden field
    delete o._honey;

    var payload = o;
    if (WEB3FORMS_KEY) {
      payload = Object.assign({}, o, { access_key: WEB3FORMS_KEY, subject: 'New enquiry from madetoscale.site', from_name: 'Made to Scale website' });
      delete payload._subject; delete payload._template;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    status.hidden = true;

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    var done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (btn) { btn.disabled = false; btn.textContent = 'Send enquiry'; }
      if (ok) succeeded(); else failed(o);
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (j) { finish(!!j && (j.success === true || j.success === 'true') && !/activat/i.test(String(j.message || ''))); })
      .catch(function () { finish(false); });
    // safety net for browsers without AbortController
    setTimeout(function () { finish(false); }, TIMEOUT_MS + 1500);
  });
})();
