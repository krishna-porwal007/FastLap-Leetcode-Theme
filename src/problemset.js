/* DOM audited against LeetCode.com, 2026-11-04. Enhance native anchor rows,
   search, category tabs and menu triggers; never replace or reorder results. */
(() => {
  if (globalThis.__lcflProblemset) return;
  globalThis.__lcflProblemset = true;
  const ROW = '[data-e2e-locator="question-list-row"]';
  const data = new Map();
  let active = null;
  const eligible = () => /^\/problemset(?:\/|$)/.test(location.pathname) && document.documentElement.dataset.lcTheme === 'fastlap';
  function mount() {
    const app = document.querySelector('#__next, #root, #app'); if (!app) return null;
    let timer = 0, disposed = false, hero = null, owner = null;
    const marked = new Map();
    const observed = app.querySelector('main') || app;
    function mark(node, key, value = '') {
      if (!node || node.getAttribute(key) === value) return;
      if (!marked.has(node)) marked.set(node, new Map());
      const attrs = marked.get(node); if (!attrs.has(key)) attrs.set(key, node.getAttribute(key));
      node.setAttribute(key, value);
    }
    function titleOf(row) { return row.querySelector('.ellipsis')?.textContent.trim() || ''; }
    function enhance() {
      timer = 0; if (disposed || !eligible()) return;
      const search = app.querySelector('input[placeholder="Search questions"]');
      const heading = app.querySelector('main h1');
      if (!heading || !search) return; // Unknown/localized DOM retains native UI.
      const rows = [...app.querySelectorAll(ROW)];
      owner = heading.parentElement; mark(owner, 'data-lcfl-directory');
      if (!hero?.isConnected) {
        hero = document.createElement('section'); hero.className = 'lcfl-directory-head';
        hero.setAttribute('aria-label', 'Fastlap problem directory');
        hero.innerHTML = `<div class="lcfl-directory-title"><p><i></i> FASTLAP / PROBLEM DIRECTORY</p><h2>PROBLEM<span>GRID</span></h2><div class="lcfl-directory-legend"><span>● SOLVED</span><span>◐ ATTEMPTED</span><span>YOUR NEXT LAP AWAITS</span></div></div>
          <a class="lcfl-feature" hidden><span>DAILY CHALLENGE / DISCOVERY</span><strong></strong><small></small><b>TAKE THE START →</b></a>`;
        heading.after(hero);
      }
      const daily = rows.find(row => new URL(row.href, location.href).searchParams.get('envType') === 'daily-question');
      const feature = hero.querySelector('.lcfl-feature');
      const featured = daily || rows[0];
      feature.hidden = !featured;
      if (featured) {
        if (feature.getAttribute('href') !== featured.getAttribute('href')) feature.setAttribute('href', featured.getAttribute('href'));
        const content = [[feature.querySelector('span'), daily ? 'DAILY CHALLENGE / DISCOVERY' : 'ON THE GRID / DISCOVER'],
          [feature.querySelector('strong'), titleOf(featured)],
          [feature.querySelector('small'), [...featured.querySelectorAll('[data-lcfl-acceptance], p')].map(el => el.textContent.trim()).join(' · ')]];
        for (const [node, text] of content) if (node.textContent !== text) node.textContent = text;
      }
      const toolbar = search.parentElement?.parentElement?.parentElement;
      if (toolbar?.querySelector('[data-e2e-locator="filter-button"]')) {
        mark(toolbar, 'data-lcfl-controls'); mark(search, 'aria-label', 'Search questions');
        for (const [selector, label] of [['filter-sort-button', 'Sort'], ['filter-button', 'Filters']]) {
          const button = toolbar.querySelector(`[data-e2e-locator="${selector}"] button`);
          mark(button, 'aria-label', label); mark(button, 'data-lcfl-control', label);
        }
      }
      const topic = owner.querySelector('a[href^="/tag/"]');
      if (topic) mark(topic.parentElement.parentElement.parentElement.parentElement, 'data-lcfl-topics');
      const desktop = search.closest('[class~="max-[759.98px]:hidden"]');
      if (desktop) mark(desktop, 'data-lcfl-results');
      for (const row of rows) {
        mark(row.parentElement, 'data-lcfl-tower');
        const title = row.querySelector('.ellipsis');
        if (title) mark(title, 'data-lcfl-title');
        const info = row.firstElementChild?.children[1];
        if (info) {
          mark(info, 'data-lcfl-row-info');
          for (const el of info.children) {
            if (/^\d+(?:\.\d+)?%$/.test(el.textContent.trim())) mark(el, 'data-lcfl-acceptance');
            if (el.tagName === 'P' && /^(Easy|Med\.?|Medium|Hard)$/i.test(el.textContent.trim())) mark(el, 'data-lcfl-difficulty');
          }
          // Audited native leading status slot. Never hide a title or control.
          const statusSlot = row.firstElementChild?.firstElementChild;
          if (statusSlot && statusSlot !== info && !statusSlot.contains(title) &&
              !statusSlot.matches('button, a, [role="button"]') &&
              !statusSlot.querySelector('button, a, input, [role="button"]')) mark(statusSlot, 'data-lcfl-status-slot');
        }
        const meta = data.get(row.dataset.e2eSlug);
        const status = ({ ac: 'solved', solved: 'solved', accepted: 'solved', tr: 'attempted', tried: 'attempted', attempted: 'attempted', not_accepted: 'attempted' })[meta?.status?.toLowerCase()] || '';
        mark(row, 'data-lcfl-status', status);
        if (!meta) row.querySelector('.lcfl-row-tags')?.remove();
        if (meta) {
          let tags = row.querySelector('.lcfl-row-tags');
          if (meta.tags.length && !tags) { tags = document.createElement('div'); tags.className = 'lcfl-row-tags'; row.appendChild(tags); }
          if (tags) {
            const names = meta.tags.map(tag => tag?.name).filter(name => typeof name === 'string' && name.length < 100);
            if (tags.dataset.names !== names.join('|')) {
              tags.replaceChildren(...names.map(name => { const span = document.createElement('span'); span.textContent = name; return span; }));
              tags.dataset.names = names.join('|');
            }
          }
        }
      }
      // Prune detached references after native search/filter/pagination updates.
      for (const node of marked.keys()) if (!node.isConnected) marked.delete(node);
    }
    function schedule() { if (!timer && !disposed) timer = setTimeout(enhance, 100); }
    const observer = new MutationObserver(records => {
      if (records.some(record => {
        const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        if (target?.closest('.lcfl-directory-head, .lcfl-row-tags')) return false;
        if (!hero?.isConnected || target?.closest(ROW)) return true;
        if (record.type !== 'childList') return false;
        return [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && !node.matches('.lcfl-directory-head, .lcfl-row-tags') &&
          (node.matches(`${ROW}, input, h1, [data-e2e-locator="filter-button"]`) ||
           node.querySelector(`${ROW}, input, h1, [data-e2e-locator="filter-button"]`)));
      })) schedule();
    });
    // Only native main, when available; no attributes or whole-document observer.
    observer.observe(observed, { childList: true, subtree: true, characterData: true });
    enhance(); dispatchEvent(new CustomEvent('lc-fastlap-request-problem-data'));
    return { app, schedule, get connected() { return observed.isConnected && (!hero || hero.isConnected); }, cleanup() {
      disposed = true; clearTimeout(timer); observer.disconnect(); hero?.remove();
      app.querySelectorAll('.lcfl-row-tags').forEach(node => node.remove());
      for (const [node, attrs] of marked) for (const [key, value] of attrs) {
        if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);
      }
    } };
  }
  addEventListener('lc-fastlap-problem-data', event => {
    if (!eligible() || typeof event.detail !== 'string' || event.detail.length > 1500000) return;
    try {
      const rows = JSON.parse(event.detail); if (!Array.isArray(rows)) return;
      for (const row of rows.slice(0, 2500)) if (typeof row.slug === 'string' && /^[a-z0-9-]+$/.test(row.slug) && Array.isArray(row.tags)) data.set(row.slug, { slug: row.slug, status: typeof row.status === 'string' ? row.status : '', tags: row.tags.slice(0, 15) });
      while (data.size > 2500) data.delete(data.keys().next().value);
      active?.schedule();
    } catch { /* Invalid page messages never affect native results. */ }
  });
  function sync() {
    if (!eligible() || (active && !active.app.isConnected)) { active?.cleanup(); active = null; data.clear(); }
    if (eligible() && !active) active = mount();
    active?.schedule();
  }
  addEventListener('lc-fastlap-route', sync); addEventListener('popstate', sync);
  // Route events come from content.js. This fallback checks references only;
  // it scans the DOM solely while waiting for the app or a replaced main.
  let routeWatch = 0;
  function startWatch() {
    if (routeWatch) return;
    routeWatch = setInterval(() => {
      if (document.hidden || !eligible()) return;
      if (active && !active.connected) { active.cleanup(); active = null; }
      if (!active) sync();
    }, 1500);
  }
  addEventListener('pagehide', () => {
    clearInterval(routeWatch); routeWatch = 0;
    active?.cleanup(); active = null; data.clear();
  });
  addEventListener('pageshow', () => { startWatch(); sync(); });
  startWatch(); sync();
})();
