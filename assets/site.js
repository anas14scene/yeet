/* ───────── Scene House — shared interactions ───────── */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const CONTACT = { whatsapp: '201015945954', email: 'anas@scenehouse.co' };
  const YT = 'https://www.youtube-nocookie.com/embed/';

  // Folder links ("realestate/") open index.html when the site is opened straight from disk
  if (location.protocol === 'file:') {
    $$('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (!/^[a-z]+:/i.test(h) && !h.startsWith('#') && /\/(#.*)?$/.test(h)) a.setAttribute('href', h.replace(/\/(#.*)?$/, '/index.html$1'));
    });
  }

  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  // Smooth scroll
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // Header + mobile menu
  const header = $('.site-header');
  const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const closeMenu = () => { if (!menu) return; menu.classList.add('hidden'); menuBtn.setAttribute('aria-expanded', 'false'); };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const open = menu.classList.toggle('hidden') === false;
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  // Reveal on scroll
  $$('.rise').forEach(el => $$('.ln > span', el).forEach((s, i) => (s.style.transitionDelay = i * 90 + 'ms')));
  if (!('IntersectionObserver' in window)) $$('.reveal, .rise').forEach(el => el.classList.add('in'));
  else {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, .rise').forEach(el => io.observe(el));
  }

  // YouTube helpers — loops stay invisible (poster shows) until YouTube reports they're actually playing
  const loopSrc = id => `${YT}${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3&fs=0&enablejsapi=1`;
  const loops = new Map();
  let loopId = 0;
  const makeLoop = id => {
    const f = document.createElement('iframe');
    const key = String(++loopId);
    f.src = loopSrc(id);
    f.title = '';
    f.allow = 'autoplay; encrypted-media; picture-in-picture';
    f.tabIndex = -1;
    f.setAttribute('aria-hidden', 'true');
    loops.set(key, f);
    f.addEventListener('load', () => {
      // ask the player to stream state updates to us
      const hello = () => f.contentWindow && f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: key, channel: 'widget' }), '*');
      hello(); setTimeout(hello, 500); setTimeout(hello, 1500);
    });
    return f;
  };
  // YouTube shows play/pause overlays on small players, so render small loops large and scale them down
  const MIN_W = 480;
  const mountLoop = (box, id) => {
    const f = makeLoop(id);
    box.appendChild(f);
    const w = f.offsetWidth;
    if (w && w < MIN_W) {
      const k = MIN_W / w;
      const z = parseFloat(getComputedStyle(f).getPropertyValue('--z')) || 1;
      f.style.width = w * k + 'px';
      f.style.transform = `translate(-50%, -50%) scale(${z / k})`;
    }
  };
  addEventListener('message', e => {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    const key = d && String(d.id);
    const f = loops.get(key);
    if (!f) return;
    if (!f.isConnected) { loops.delete(key); return; }
    const info = d.info || {};
    if (info.playerState === 1 || info.currentTime > 0.15) setTimeout(() => f.classList.add('ready'), 250);
  });

  // Background loops that play on their own (hero videos)
  addEventListener('load', () => setTimeout(() => {
    $$('[data-autoplay-yt]').forEach(box => {
      // touch devices get YouTube's mobile player UI on top of loops, so they keep the animated poster instead
      if (!fine || box.offsetParent === null || reduce) return;
      if (box.dataset.autoplayMin && innerWidth < +box.dataset.autoplayMin) return;
      mountLoop(box, box.dataset.autoplayYt);
    });
  }, 300));

  // Hover previews
  if (fine) {
    $$('[data-preview]').forEach(el => {
      const box = $('.yt-cover', el);
      if (!box) return;
      let t;
      el.addEventListener('mouseenter', () => { t = setTimeout(() => { if (!box.firstChild) mountLoop(box, el.dataset.preview); }, 200); });
      el.addEventListener('mouseleave', () => { clearTimeout(t); box.innerHTML = ''; });
    });
  }

  // Video modal
  const modal = $('#modal');
  const mbox = $('#modal-box');
  let lastFocus = null;
  const openModal = (id, land) => {
    if (!modal) return;
    lastFocus = document.activeElement;
    mbox.className = 'mbox ' + (land ? 'mbox-land' : 'mbox-portrait');
    mbox.innerHTML = `<iframe src="${YT}${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Scene House project video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    $('#modal-yt').href = land ? `https://youtu.be/${id}` : `https://youtube.com/shorts/${id}`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    $('#modal-close').focus();
  };
  const closeModal = () => {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    mbox.innerHTML = '';
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  };
  $$('[data-play]').forEach(el => el.addEventListener('click', () => openModal(el.dataset.play, el.hasAttribute('data-land'))));
  if (modal) {
    $('#modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  }
  addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeMenu(); } });

  // Before / after sliders
  $$('.ba').forEach(el => {
    const range = $('input[type=range]', el);
    const set = () => el.style.setProperty('--pos', range.value + '%');
    range.addEventListener('input', set);
    set();
  });

  // Custom cursor
  if (fine && !reduce) {
    const c = document.createElement('div');
    c.className = 'cursor';
    c.innerHTML = '<span></span>';
    document.body.appendChild(c);
    document.documentElement.classList.add('has-cursor');
    const label = $('span', c);
    let x = -100, y = -100, cx = x, cy = y;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; c.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', () => c.classList.remove('on'));
    const loop = () => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(loop); };
    loop();
    const updateCursor = el => {
      if (!el || !el.closest) return;
      const t = el.closest('[data-cursor]');
      if (t) { label.textContent = t.dataset.cursor; c.classList.add('is-active'); c.classList.remove('is-link'); return; }
      c.classList.remove('is-active');
      c.classList.toggle('is-link', !!el.closest('a, button, label, input, textarea'));
    };
    document.addEventListener('mouseover', e => updateCursor(e.target));
    // content moves under a still mouse while scrolling, so re-check what's under the pointer
    addEventListener('scroll', () => { if (c.classList.contains('on')) updateCursor(document.elementFromPoint(x, y)); }, { passive: true });
  }

  // Project estimator
  $$('[data-estimator]').forEach(form => {
    const steps = $$('.est-step', form);
    const bar = $('[data-est-bar]', form);
    const count = $('[data-est-count]', form);
    const back = $('[data-est-back]', form);
    const next = $('[data-est-next]', form);
    const sendRow = $('[data-est-send]', form);
    const done = $('[data-est-done]', form);
    const error = $('[data-est-error]', form);
    let i = 0;

    const stepValid = n => {
      const radios = $$('input[type=radio]', steps[n]);
      return !radios.length || radios.some(r => r.checked);
    };
    const show = n => {
      i = n;
      steps.forEach((s, k) => (s.hidden = k !== n));
      bar.style.width = ((n + 1) / steps.length) * 100 + '%';
      count.textContent = `Step ${n + 1} of ${steps.length}`;
      back.classList.toggle('invisible', n === 0);
      const last = n === steps.length - 1;
      next.classList.toggle('hidden', last);
      sendRow.classList.toggle('hidden', !last);
      next.disabled = !stepValid(n);
    };

    form.addEventListener('change', e => {
      if (e.target.type !== 'radio') return;
      next.disabled = !stepValid(i);
      if (i < steps.length - 1) setTimeout(() => show(i + 1), 280);
    });
    next.addEventListener('click', () => { if (stepValid(i)) show(i + 1); });
    back.addEventListener('click', () => show(Math.max(0, i - 1)));

    const compose = () => {
      const d = new FormData(form);
      const v = k => (d.get(k) || '').toString().trim();
      if (!v('name') || !v('contact')) { error.classList.remove('hidden'); return null; }
      error.classList.add('hidden');
      const sector = form.dataset.estimator;
      const lines = [
        `Hi Scene House! I'd like to start a project.`,
        ``,
        ...(sector ? [`Sector: ${sector}`] : []),
        `${form.dataset.typeLabel || 'Project'}: ${v('type')}`,
        `Scope: ${v('scope')}`,
        `Timeline: ${v('timeline')}`,
        ``,
        `Name: ${v('name')}`,
        `Company: ${v('company') || '—'}`,
        `Contact: ${v('contact')}`,
      ];
      if (v('details')) lines.push('', v('details'));
      return { text: lines.join('\n'), subject: `New project enquiry — ${v('type') || 'Scene House'}` };
    };

    $('[data-send-wa]', form).addEventListener('click', () => {
      const m = compose(); if (!m) return;
      window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(m.text)}`, '_blank', 'noopener');
      done.classList.remove('hidden');
    });
    $('[data-send-mail]', form).addEventListener('click', () => {
      const m = compose(); if (!m) return;
      location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.text)}`;
      done.classList.remove('hidden');
    });
    form.addEventListener('submit', e => e.preventDefault());
    show(0);
  });
})();
