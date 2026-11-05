/* A scroll runway before the native app. No scroll locks or replacement DOM. */
(() => {
  if (globalThis.__lcFastlapProfileDriveLoaded) return;
  globalThis.__lcFastlapProfileDriveLoaded = true;
  const history = globalThis.__lcFastlapContestHistory;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const dates = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  let active = null, key = null;
  const assetURL = path => chrome.runtime.getURL(path);
  const clamp = v => Math.max(0, Math.min(1, v));
  function username() {
    const match = /^\/(?:u|profile)\/([^/]+)\/?$/.exec(location.pathname);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return null; }
  }
  function mount(name) {
    const controller = new AbortController(), signal = controller.signal;
    const root = document.createElement('section'); root.id = 'lcfl-drive';
    root.setAttribute('aria-label', `${name}'s contest journey`);
    root.dataset.mode = 'compact';
    root.innerHTML = `
      <div class="lcfl-stage">
        <canvas aria-hidden="true"></canvas>
        <div class="lcfl-topline"><span class="lcfl-plate">LEETCODE</span><span>DRIVER CARD</span></div>
        <button class="lcfl-skip" type="button">SKIP TO PROFILE ↓</button>
        <div class="lcfl-hero"><p class="lcfl-eyebrow">YOUR CONTEST JOURNEY <i></i></p><h1></h1>
          <div class="lcfl-summary"><span><b data-value="rounds">—</b><small>ATTENDED ROUNDS</small></span>
            <span><b data-value="latest">—</b><small>LATEST RATING</small></span><span><b data-value="peak">—</b><small>PEAK RATING</small></span></div>
          <p class="lcfl-message" role="status">Reading contest history…</p>
        </div>
        <div class="lcfl-landmarks" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="lcfl-hud" role="group" aria-label="Contest checkpoint">
          <div class="lcfl-round"><b></b><time></time></div>
          <div class="lcfl-board"><div class="lcfl-figures"><strong></strong><b></b></div><h2></h2><p></p>
            <svg class="lcfl-chart" viewBox="0 0 300 48" role="img" aria-label="Rating progression"><polyline/><circle r="3"/></svg>
          </div>
        </div>
        <div class="lcfl-finish"><i></i><strong>FINISH</strong><span>YOUR NEXT LAP STARTS BELOW</span></div>
        <a class="lcfl-credit" href="https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383" target="_blank" rel="noopener">SCROLL TO DRIVE ↓</a>
        <div class="lcfl-progress" aria-hidden="true"><i></i></div>
      </div>
      <details class="lcfl-history"><summary>CONTEST LOG <span>Every attended round</span></summary><div class="lcfl-log"></div></details>`;
    root.querySelector('h1').textContent = name;
    // Outside React's root: React never owns or reconciles the drive subtree.
    const app = document.querySelector('#__next, #root, #app');
    document.body.insertBefore(root, app?.parentElement === document.body ? app : document.body.firstChild);
    const stage = root.querySelector('.lcfl-stage'), canvas = root.querySelector('canvas');
    const runway = document.createElement('div'); runway.className = 'lcfl-runway'; stage.before(runway); runway.appendChild(stage);
    const message = root.querySelector('.lcfl-message'), hud = root.querySelector('.lcfl-hud');
    let disposed = false, scene = null, rows = [], raf = 0, visible = true, generation = 0, currentRound = -2;
    let resizeObserver = null, intersection = null, restoreTargetFocus = null;
    let ratingLow = 0, ratingHigh = 0;
    const labels = [...root.querySelectorAll('.lcfl-landmarks span')];
    const setValue = (field, value) => { root.querySelector(`[data-value="${field}"]`).textContent = value; };
    function skip() {
      const target = document.querySelector('#__next main, #__next [role="main"], #root main, #app main') || app;
      scrollTo({ top: root.getBoundingClientRect().bottom + scrollY, behavior: 'instant' });
      if (target) {
        restoreTargetFocus?.();
        const old = target.getAttribute('tabindex');
        target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
        const restore = () => { if (old === null) target.removeAttribute('tabindex'); else target.setAttribute('tabindex', old); };
        restoreTargetFocus = restore;
        target.addEventListener('blur', restore, { once: true, signal });
      }
    }
    root.querySelector('.lcfl-skip').addEventListener('click', skip, { signal });
    root.addEventListener('keydown', event => { if (event.key === 'Escape') skip(); }, { signal });
    function compact(reason) {
      generation++; scene?.dispose(); scene = null;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      root.dataset.mode = 'compact'; root.classList.remove('lcfl-finished');
      root.style.removeProperty('--runway'); message.textContent = reason;
      root.querySelector('.lcfl-history').hidden = !rows.length;
    }
    function showRound(index) {
      if (index === currentRound) return; currentRound = index;
      const row = rows[index];
      hud.querySelector('.lcfl-round b').textContent = row ? `ROUND ${String(index + 1).padStart(3, '0')} / ${rows.length}` : 'STARTING GRID';
      hud.querySelector('time').textContent = row ? dates.format(new Date(row.startTime * 1000)) : '';
      hud.querySelector('time').dateTime = row ? new Date(row.startTime * 1000).toISOString() : '';
      hud.querySelector('strong').textContent = row ? fmt.format(row.rating) : '—';
      const delta = hud.querySelector('.lcfl-figures b');
      const change = index > 0 ? Math.round(row.rating) - Math.round(rows[index - 1].rating) : null;
      delta.textContent = change === null ? '' : `${change >= 0 ? '+' : '−'}${fmt.format(Math.abs(change))}`;
      delta.dataset.direction = change === null ? '' : change >= 0 ? 'up' : 'down';
      hud.querySelector('h2').textContent = row?.title || 'Scroll to your first contest';
      hud.querySelector('.lcfl-board p').textContent = row
        ? [row.ranking ? `PLACEMENT P${fmt.format(row.ranking)}` : '', index === 0 ? 'FIRST RECORDED RATING' : '', scene?.journey.checkpoints[index].peak ? 'CAREER PEAK' : scene?.journey.checkpoints[index].milestone].filter(Boolean).join(' · ')
        : 'SCROLL DOWN TO DRIVE FORWARD · UP TO REVERSE';
      const dot = hud.querySelector('circle'); dot.style.display = row ? '' : 'none';
      if (row) { const [x, y] = chartPoint(row, index); dot.setAttribute('cx', x); dot.setAttribute('cy', y); }
    }
    function chartPoint(row, i) {
      const low = ratingLow, high = ratingHigh;
      return [4 + i / Math.max(1, rows.length - 1) * 292, 44 - (row.rating - low) / Math.max(1, high - low) * 40];
    }
    function frame() {
      raf = 0;
      if (disposed || !scene || !visible || document.hidden) return;
      const rect = root.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, runway.offsetHeight - stage.clientHeight));
      const pose = scene.render(progress); if (!pose) return;
      root.dataset.progress = progress.toFixed(5);
      root.dataset.distance = pose.distance.toFixed(3);
      root.style.setProperty('--intro', String(1 - clamp(progress / .09)));
      root.classList.toggle('lcfl-finished', progress > .985);
      root.querySelector('.lcfl-progress i').style.transform = `scaleX(${progress})`;
      const checkpoints = scene.journey.checkpoints;
      // Last checkpoint actually crossed; reverse scrolling restores the same round.
      let lo = 0, hi = checkpoints.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (checkpoints[mid].distance <= pose.distance) lo = mid + 1; else hi = mid; }
      showRound(lo - 1);
      // Binary search the visible window; inspect at most three nearby labels.
      let first = 0, last = checkpoints.length;
      while (first < last) {
        const mid = (first + last) >> 1;
        if (checkpoints[mid].distance <= pose.distance - 8) first = mid + 1; else last = mid;
      }
      const candidates = checkpoints.slice(first, first + 3).filter(r => r.distance < pose.distance + 65);
      labels.forEach((label, i) => {
        const row = candidates[i]; label.hidden = !row; if (!row) return;
        const f = scene.journey.sample(row.distance);
        const p = f.position.clone().addScaledVector(f.right, (row.index % 2 ? 1 : -1) * 4.3);
        p.y += row.peak ? 8 : 2.2; p.project(pose.camera);
        label.hidden = p.z < -1 || p.z > 1 || Math.abs(p.x) > .95 || Math.abs(p.y) > .92;
        label.style.left = `${(p.x + 1) * 50}%`; label.style.top = `${(1 - p.y) * 50}%`;
        label.classList.toggle('peak', row.peak);
        label.textContent = `${row.peak ? 'PEAK · ' : row.milestone ? row.milestone + ' · ' : ''}${row.title} / ${fmt.format(row.rating)}`;
      });
    }
    function requestFrame() { if (!disposed && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
    function resize() { if (scene) { scene.resize(stage.clientWidth, stage.clientHeight); requestFrame(); } }
    async function configureScene() {
      if (disposed || !rows.length) return;
      if (reduced.matches || mobile.matches) {
        compact(reduced.matches ? 'Reduced motion · Explore your contest log, then continue to your profile.' : 'Your contest log · Continue below to your profile.'); return;
      }
      const version = ++generation;
      try {
        const module = await import(assetURL('src/profile-scene.mjs'));
        if (disposed || version !== generation) return;
        scene?.dispose();
        root.dataset.mode = 'drive';
        root.style.setProperty('--runway', `${Math.min(1400, Math.max(450, 300 + rows.length * 12))}vh`);
        scene = module.createScene(canvas, rows, assetURL, requestFrame,
          ok => { if (!disposed) root.dataset.car = ok ? 'model' : 'original-procedural'; },
          () => compact('The circuit could not be displayed. Your contest log and profile are available below.'));
        currentRound = -2; message.textContent = '';
        root.querySelector('.lcfl-history').hidden = false;
        resize();
      } catch (error) {
        compact('The circuit could not be displayed. Your contest log and profile are available below.');
        console.warn('[Fastlap] Profile scene unavailable:', error);
      }
    }
    function populate(result) {
      if (disposed || result.source === 'cancelled') return;
      rows = result.rows;
      ratingLow = rows.reduce((value, row) => Math.min(value, row.rating), Infinity);
      ratingHigh = rows.reduce((value, row) => Math.max(value, row.rating), -Infinity);
      setValue('rounds', fmt.format(rows.length));
      if (!rows.length) {
        compact(result.source === 'graphql' ? 'No attended contest history yet. Your profile is below.' : 'Contest history unavailable. Your profile is below.'); return;
      }
      setValue('latest', fmt.format(rows.at(-1).rating)); setValue('peak', fmt.format(Math.max(...rows.map(r => r.rating))));
      hud.querySelector('polyline').setAttribute('points', rows.map((row, i) => chartPoint(row, i).join(',')).join(' '));
      const table = document.createElement('table');
      const caption = document.createElement('caption'); caption.textContent = `${name} — attended contest history`; table.appendChild(caption);
      const head = table.createTHead().insertRow();
      ['Contest', 'Date', 'Rating', 'Change', 'Placement'].forEach(text => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = text; head.appendChild(th); });
      const body = table.createTBody();
      rows.forEach((row, i) => {
        const tr = body.insertRow();
        const delta = i ? Math.round(row.rating) - Math.round(rows[i - 1].rating) : null;
        [row.title, dates.format(new Date(row.startTime * 1000)), fmt.format(row.rating), delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta}`, row.ranking ? `P${fmt.format(row.ranking)}` : '—'].forEach(value => { tr.insertCell().textContent = value; });
      });
      root.querySelector('.lcfl-log').replaceChildren(table);
      configureScene();
    }
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
    intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) requestFrame(); }, { rootMargin: '150px' }); intersection.observe(stage);
    addEventListener('scroll', requestFrame, { passive: true, signal });
    document.addEventListener('visibilitychange', requestFrame, { signal });
    reduced.addEventListener('change', configureScene, { signal }); mobile.addEventListener('change', configureScene, { signal });
    history.load(name, signal).then(populate).catch(() => { if (!disposed) compact('Contest history unavailable. Your profile is below.'); });
    return { root, cleanup() {
      disposed = true; generation++; restoreTargetFocus?.(); controller.abort();
      if (raf) cancelAnimationFrame(raf); resizeObserver.disconnect(); intersection.disconnect();
      scene?.dispose(); root.remove();
    } };
  }
  function sync() {
    const name = username();
    const next = name && document.documentElement.dataset.lcTheme === 'fastlap' ? `${location.origin}/${name}` : null;
    if (next === key && (!active || active.root.isConnected)) return;
    active?.cleanup(); active = null; key = next;
    if (next && document.body && history) active = mount(name);
  }
  addEventListener('lc-fastlap-route', sync); addEventListener('popstate', sync);
  addEventListener('pagehide', () => { active?.cleanup(); active = null; key = null; });
  addEventListener('pageshow', sync); sync();
})();
