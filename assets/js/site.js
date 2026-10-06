(() => {
  const SC = window.SC || {};
  const es = SC.lang === 'es';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  /* ---------- colorway: the page dresses in her color ---------- */
  const heroImg = document.querySelector('.hero__swap img');
  const heroName = document.querySelector('[data-hero-name]');
  const colorLinks = document.querySelectorAll('[data-color-link], [data-hero-link]');

  function swapHero(id) {
    const c = SC.colors && SC.colors[id];
    if (!c || !heroImg) return;
    if (heroName) heroName.textContent = c.name;
    colorLinks.forEach((a) => { a.href = SC.dresses + '#color=' + id; });
    const box = heroImg.parentElement;
    const cur = box.querySelector('img:not(.is-incoming)') || heroImg;
    const paint = (im) => { im.src = c.hero; im.style.objectPosition = c.pos; im.alt = c.dress; im.style.transform = c.zoom ? 'scale(' + c.zoom[0] + ')' : ''; im.style.transformOrigin = c.zoom ? c.zoom[1] : ''; };
    if (cur.getAttribute('src') === c.hero && cur.style.objectPosition === c.pos && cur.style.transformOrigin === (c.zoom ? c.zoom[1] : '')) return;
    if (reduce) { paint(cur); return; }
    box.querySelectorAll('.is-incoming').forEach((n) => n.remove());
    const next = cur.cloneNode();
    next.removeAttribute('fetchpriority');
    next.classList.add('is-incoming');
    paint(next);
    box.appendChild(next);
    next.addEventListener('animationend', () => {
      paint(cur);
      requestAnimationFrame(() => next.remove());
    }, { once: true });
  }

  function setColorway(id, { save = true } = {}) {
    if (!id || !SC.colors || !SC.colors[id]) id = 'rosa';
    root.dataset.colorway = id;
    if (save) store.set('sc-colorway', id);
    document.querySelectorAll('.swatch[data-colorway]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.colorway === id)));
    swapHero(id);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--field').trim() || '#C92A63';
  }

  document.querySelectorAll('.swatch[data-colorway]').forEach((b) => {
    b.addEventListener('click', () => setColorway(b.dataset.colorway));
  });
  setColorway(root.dataset.colorway, { save: false });

  /* ---------- menu sheet ---------- */
  const sheet = document.getElementById('sheet');
  const opener = document.querySelector('.site-head .menu-btn');
  function openSheet(open) {
    if (!sheet || !opener) return;
    if (open) { sheet.setAttribute('data-open', ''); opener.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; sheet.querySelector('nav a')?.focus(); }
    else { sheet.removeAttribute('data-open'); opener.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; opener.focus(); }
  }
  opener?.addEventListener('click', () => openSheet(true));
  sheet?.querySelector('[data-close]')?.addEventListener('click', () => openSheet(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet?.hasAttribute('data-open')) openSheet(false); });

  /* ---------- open now (Mountain Time) ---------- */
  const statusEl = document.querySelectorAll('[data-open-status]');
  if (statusEl.length && SC.hours) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const mins = (+get('hour')) * 60 + (+get('minute'));
    const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const fmt = (s) => { let [h, m] = s.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + String(m).padStart(2, '0') + ' ' + ap; };
    const today = SC.hours.find((h) => h.d.includes(day));
    let text; let state = 'closed';
    if (today && mins >= toMin(today.o) && mins < toMin(today.c)) { state = 'open'; text = es ? `Abierto ahora · cierra a las ${fmt(today.c)}` : `Open now · closes at ${fmt(today.c)}`; }
    else if (today && mins < toMin(today.o)) { text = es ? `Cerrado · abre hoy a las ${fmt(today.o)}` : `Closed · opens today at ${fmt(today.o)}`; }
    else {
      let n = 1, next;
      while (n < 8 && !next) { next = SC.hours.find((h) => h.d.includes((day + n) % 7)); if (!next) n++; }
      const names = es ? ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const when = n === 1 ? (es ? 'mañana' : 'tomorrow') : (es ? 'el ' : '') + names[(day + n) % 7];
      text = es ? `Cerrado · abre ${when} a las ${fmt(next.o)}` : `Closed · opens ${when} at ${fmt(next.o)}`;
    }
    statusEl.forEach((el) => { el.textContent = text; el.dataset.state = state; });
    document.querySelectorAll('.hours tr[data-days]').forEach((tr) => { if (tr.dataset.days.split(',').map(Number).includes(day)) tr.classList.add('is-today'); });
  }

  /* ---------- catalog filters ---------- */
  const catalog = document.querySelector('[data-catalog]');
  if (catalog) {
    const items = [...catalog.querySelectorAll('.dress')];
    const empty = document.querySelector('[data-empty]');
    const colorBtns = document.querySelectorAll('[data-filter-color]');
    const modeBtns = document.querySelectorAll('[data-filter-mode]');
    let color = 'all', mode = 'all';
    const apply = () => {
      let shown = 0;
      items.forEach((it) => {
        const ok = (color === 'all' || it.dataset.color === color) && (mode === 'all' || it.dataset.mode.split(' ').includes(mode));
        it.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
      colorBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filterColor === color)));
      modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filterMode === mode)));
    };
    colorBtns.forEach((b) => b.addEventListener('click', () => {
      color = b.dataset.filterColor;
      if (SC.colors[color]) setColorway(color);
      history.replaceState(null, '', color === 'all' ? location.pathname : '#color=' + color);
      apply();
    }));
    modeBtns.forEach((b) => b.addEventListener('click', () => { mode = b.dataset.filterMode; apply(); }));
    const m = location.hash.match(/color=([\w-]+)/);
    if (m && (SC.colors[m[1]] || m[1] === 'otros')) { color = m[1]; if (SC.colors[color]) setColorway(color); }
    apply();
    const on = document.querySelector('[data-filter-color][aria-pressed="true"]');
    if (on && color !== 'all') on.parentElement.scrollLeft = on.offsetLeft - 80;
  }

  /* ---------- Arma tu look ---------- */
  const builder = document.querySelector('[data-builder]');
  if (builder) {
    const out = document.querySelector('[data-look]');
    const sms = document.querySelector('[data-look-sms]');
    const copyBtn = document.querySelector('[data-look-copy]');
    const labels = es
      ? { color: 'Vestido', modo: 'Compra o renta', ramo: 'Ramo', corona: 'Corona', extra: 'Además', fecha: 'Fecha de XV' }
      : { color: 'Gown', modo: 'Buy or rent', ramo: 'Ramo', corona: 'Crown', extra: 'Also', fecha: 'Quince date' };
    try { const saved = JSON.parse(store.get('sc-look') || 'null'); if (saved) Object.entries(saved).forEach(([k, v]) => { builder.querySelectorAll(`[name="${k}"]`).forEach((inp) => { if (inp.type === 'checkbox' || inp.type === 'radio') inp.checked = [].concat(v).includes(inp.value); else inp.value = v; }); }); } catch (e) { /* ignore */ }
    const read = () => {
      const fd = new FormData(builder);
      return { color: fd.get('color'), modo: fd.get('modo'), ramo: fd.get('ramo'), corona: fd.get('corona'), extra: fd.getAll('extra'), fecha: fd.get('fecha') };
    };
    const text = (s) => {
      const lines = [es ? 'Hola Santa Clarita, este es mi look para mis XV:' : 'Hi Santa Clarita, here is my look for my quince:'];
      Object.keys(labels).forEach((k) => { const v = Array.isArray(s[k]) ? s[k].join(', ') : s[k]; if (v) lines.push(`${labels[k]}: ${v}`); });
      return lines.join('\n');
    };
    if (!builder.querySelector('[name="color"]:checked')) {
      const cur = SC.colors[root.dataset.colorway];
      const r0 = cur && [...builder.querySelectorAll('[name="color"]')].find((i) => i.value === cur.name);
      if (r0) r0.checked = true;
    }
    const render = (ev) => {
      const s = read();
      out.innerHTML = '';
      Object.keys(labels).forEach((k) => {
        const v = Array.isArray(s[k]) ? s[k].join(', ') : s[k];
        if (!v) return;
        const dt = document.createElement('dt'); dt.textContent = labels[k];
        const dd = document.createElement('dd'); dd.textContent = v;
        out.append(dt, dd);
      });
      const body = encodeURIComponent(text(s));
      sms.href = `sms:${SC.tel}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?'}body=${body}`;
      store.set('sc-look', JSON.stringify(s));
      const picked = Object.entries(SC.colors).find(([, c]) => c.name === s.color);
      if (picked && ev && ev.target && ev.target.name === 'color') setColorway(picked[0]);
    };
    builder.addEventListener('change', render);
    copyBtn?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text(read())); copyBtn.lastChild.textContent = es ? '¡Copiado! Pégalo en un DM' : 'Copied! Paste it in a DM'; }
      catch (e) { copyBtn.lastChild.textContent = es ? 'No se pudo copiar' : 'Could not copy'; }
    });
    render();
  }

  /* ---------- Agenda tu cita ---------- */
  const cita = document.querySelector('[data-cita]');
  if (cita) {
    const q = new URLSearchParams(location.search).get('vestido');
    if (q) cita.querySelector('#vestido').value = q;
    const done = cita.querySelector('[data-done]');
    cita.addEventListener('submit', (e) => {
      e.preventDefault();
      let bad = null;
      cita.querySelectorAll('[data-field]').forEach((f) => {
        const inp = f.querySelector('input, select, textarea');
        let ok = inp.checkValidity() && (!inp.required || inp.value.trim());
        if (ok && inp.id === 'dia' && inp.value) ok = new Date(inp.value + 'T12:00').getDay() !== 1;
        f.toggleAttribute('data-invalid', !ok);
        inp.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) bad = inp;
      });
      if (bad) { bad.focus(); return; }
      const fd = new FormData(cita);
      const L = es
        ? ['Hola Santa Clarita, quiero agendar una cita.', `Nombre: ${fd.get('nombre')}`, `Teléfono: ${fd.get('tel')}`, `Día para ir: ${fd.get('dia')}`, `Fecha de XV: ${fd.get('fecha') || '-'}`, `Compra o renta: ${fd.get('modo')}`, `Personas: ${fd.get('personas')}`, `Me gustó: ${fd.get('vestido') || '-'}`, `${fd.get('msg') || ''}`]
        : ['Hi Santa Clarita, I would like to book a fitting.', `Name: ${fd.get('nombre')}`, `Phone: ${fd.get('tel')}`, `Day to visit: ${fd.get('dia')}`, `Quince date: ${fd.get('fecha') || '-'}`, `Buy or rent: ${fd.get('modo')}`, `People: ${fd.get('personas')}`, `Liked: ${fd.get('vestido') || '-'}`, `${fd.get('msg') || ''}`];
      const body = encodeURIComponent(L.join('\n').trim());
      done.querySelector('[data-send-sms]').href = `sms:${SC.tel}${/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?'}body=${body}`;
      done.querySelector('[data-send-mail]').href = `mailto:${SC.email}?subject=${encodeURIComponent(es ? 'Cita para probarme vestidos' : 'Fitting request')}&body=${body}`;
      done.hidden = false;
      done.focus();
    });
  }
})();
