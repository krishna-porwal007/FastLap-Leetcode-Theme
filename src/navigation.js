/* Native shell adapter. Never move React-owned nodes or replace their handlers. */
(() => {
  if (globalThis.__lcFastlapNavigation) return;
  globalThis.__lcFastlapNavigation = true;
  const desktop = matchMedia('(min-width: 1100px)');
  let active = null, observer = null, frame = 0, controller = null;
  const primary = [['HOME', '/'], ['PROBLEMS', '/problemset/'], ['CONTESTS', '/contest/'], ['DISCUSS', '/discuss/']];
  const branch = (node, shell) => {
    while (node && node.parentElement !== shell) node = node.parentElement;
    return node?.parentElement === shell ? node : null;
  };
  function destroy() {
    if (!active) return;
    active.events.abort();
    active.resize.disconnect();
    active.shell.removeAttribute('data-lcfl-more-open');
    active.shell.removeAttribute('data-lcfl-nav-tabs');
    active.bar.remove();
    for (const [node, name] of active.marks) node.removeAttribute(name);
    active.shell.style.removeProperty('--lcfl-utility-width');
    active.shell.style.removeProperty('--lcfl-more-left');
    active.shell.style.removeProperty('--lcfl-more-top');
    active = null;
  }
  function mount() {
    frame = 0;
    const eligible = desktop.matches && !/^\/problems\/[^/]+/.test(location.pathname);
    if (active && (!eligible || !active.sidebar.isConnected || !active.utility.isConnected || !active.bar.isConnected)) destroy();
    if (!eligible) return;
    if (active) { active.update(); return; }
    const sidebar = document.querySelector('[data-testid="shell-sidebar"]');
    const shell = sidebar?.closest('[data-has-sidebar]');
    const wrapper = shell && branch(sidebar, shell);
    const search = shell?.querySelector('[data-testid="shell-search-button"]');
    const utility = shell && branch(search, shell);
    const nativeMore = sidebar && [...sidebar.querySelectorAll('button')].find(b => b.textContent.trim() === 'More');
    // Fail open: keep native navigation when the inspected structure is absent.
    if (!wrapper || !utility || !nativeMore || !primary.every(([, href]) => sidebar.querySelector(`a[href="${href}"]`))) return;
    const marks = [];
    const mark = (node, name) => { if (node) { node.setAttribute(name, ''); marks.push([node, name]); } };
    const events = new AbortController();
    const bar = document.createElement('div');
    bar.id = 'lcfl-navigation';
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Main navigation');
    const brand = document.createElement('a');
    brand.href = '/'; brand.className = 'lcfl-nav-brand'; brand.textContent = 'LEETCODE';
    const stripes = document.createElement('span'); stripes.textContent = ' ////'; stripes.setAttribute('aria-hidden', 'true');
    brand.append(stripes); nav.append(brand);
    function link(label, href, parent) {
      const a = document.createElement('a'); a.href = href; a.textContent = label; parent.append(a); return a;
    }
    const links = primary.map(([label, href]) => link(label, href, nav));
    const more = document.createElement('button');
    more.type = 'button'; more.textContent = 'MORE ▾'; more.setAttribute('aria-expanded', 'false');
    // This is a disclosure of native navigation, not an ARIA menu replacement.
    nav.append(more); bar.append(nav);
    const tabs = document.createElement('nav'); tabs.className = 'lcfl-nav-tabs'; tabs.setAttribute('aria-label', 'Problemset navigation');
    const tabLinks = [['PROBLEMSET', '/problemset/'], ['STUDY PLANS', '/studyplan/'], ['DISCUSSIONS', '/discuss/']].map(([label, href]) => link(label, href, tabs));
    bar.append(tabs);
    let open = false;
    function positionMore() {
      if (!open) return;
      // Keep the React-owned panel in place; fixed coordinates anchor it to
      // the button without reparenting. Clamp only when the right edge overflows.
      const rect = more.getBoundingClientRect();
      const width = wrapper.getBoundingClientRect().width;
      const left = Math.max(8, Math.min(rect.left, document.documentElement.clientWidth - width - 8));
      shell.style.setProperty('--lcfl-more-left', `${left}px`);
      shell.style.setProperty('--lcfl-more-top', `${rect.bottom}px`);
    }
    addEventListener('resize', positionMore, {signal: events.signal});
    function close(focus = false) {
      open = false; shell.removeAttribute('data-lcfl-more-open'); more.setAttribute('aria-expanded', 'false');
      if (focus) more.focus();
    }
    function update() {
      const path = location.pathname;
      for (const a of [...links, ...tabLinks]) {
        const selected = a.pathname === '/' ? path === '/' : path === a.pathname.replace(/\/$/, '') || path.startsWith(a.pathname);
        if (selected) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      }
      const contextual = /^\/(problemset|studyplan)(\/|$)/.test(path);
      tabs.hidden = !contextual;
      shell.toggleAttribute('data-lcfl-nav-tabs', contextual);
    }
    more.addEventListener('click', () => {
      if (open) { close(); return; }
      open = true; shell.setAttribute('data-lcfl-more-open', ''); more.setAttribute('aria-expanded', 'true');
      // Expand the existing inline More section only when its links are hidden.
      const explore = sidebar.querySelector('a[href="/explore/"]');
      if (!explore?.getClientRects().length) nativeMore.click();
      positionMore();
    }, {signal: events.signal});
    bar.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const native = sidebar.querySelector(`a[href="${a.getAttribute('href')}"]`);
      // Native anchor keeps Next routing. Modified clicks retain browser behavior.
      if (native) { e.preventDefault(); native.click(); }
      close();
    }, {signal: events.signal});
    document.addEventListener('pointerdown', e => { if (open && !wrapper.contains(e.target) && !bar.contains(e.target)) close(); }, {signal: events.signal});
    document.addEventListener('keydown', e => { if (open && e.key === 'Escape') { close(true); e.preventDefault(); } }, {signal: events.signal});
    sidebar.addEventListener('click', e => { if (e.target.closest('a')) close(); }, {signal: events.signal});
    addEventListener('lc-fastlap-route', () => close(), {signal: events.signal});
    mark(shell, 'data-lcfl-nav-shell'); mark(wrapper, 'data-lcfl-nav-sidebar'); mark(utility, 'data-lcfl-nav-utility');
    for (const selector of ['[data-testid="shell-rail"]', '[data-testid="shell-topbar"]', '[data-testid="shell-tabbar"]']) mark(branch(shell.querySelector(selector), shell), 'data-lcfl-nav-replaced');
    // Collapse handles belong to the old layout; all native destination links remain.
    mark(wrapper.querySelector('button[aria-label="Collapse"]')?.parentElement, 'data-lcfl-nav-handle');
    for (const [, href] of primary) {
      for (const a of sidebar.querySelectorAll(`a[href="${href}"]`)) mark(a, 'data-lcfl-nav-duplicate');
    }
    const resize = new ResizeObserver(() => {
      shell.style.setProperty('--lcfl-utility-width', `${Math.ceil(utility.getBoundingClientRect().width)}px`);
      positionMore();
    });
    resize.observe(utility);
    resize.observe(wrapper);
    for (const item of nav.children) resize.observe(item);
    active = {sidebar, utility, shell, bar, events, resize, marks, update};
    shell.prepend(bar); update();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(mount); }
  function start() {
    if (controller) return;
    controller = new AbortController();
    addEventListener('lc-fastlap-route', schedule, {signal: controller.signal});
    addEventListener('popstate', schedule, {signal: controller.signal});
    desktop.addEventListener('change', schedule, {signal: controller.signal});
    observer = new MutationObserver(records => {
      if (active && (!active.sidebar.isConnected || !active.utility.isConnected || !active.bar.isConnected)) { schedule(); return; }
      // Only shell insertion/removal matters; ignore row text, attributes and animation.
      if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && !n.closest?.('#lcfl-navigation') && (n.matches('[data-testid="shell-sidebar"]') || (!active && (n.closest('[data-testid="shell-sidebar"]') || n.querySelector('[data-testid="shell-sidebar"]'))))))) schedule();
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    schedule();
  }
  addEventListener('pagehide', () => {
    controller?.abort(); controller = null; observer?.disconnect(); observer = null;
    cancelAnimationFrame(frame); frame = 0;
    if (active) { active.shell.removeAttribute('data-lcfl-more-open'); active.shell.removeAttribute('data-lcfl-nav-tabs'); }
    destroy();
  });
  addEventListener('pageshow', start);
  start();
})();
