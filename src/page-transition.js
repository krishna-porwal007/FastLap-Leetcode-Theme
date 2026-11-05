/* Port of Fastlap shell.js's stinger: cosmetic only, never intercept navigation.
   No page visibility, scroll, focus, network or native View Transition changes. */
(() => {
  if (globalThis.__lcflStinger) return;
  globalThis.__lcflStinger = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let card = null, timeout = 0, check = 0, listeners = null, abortWatch = null;
  let path = location.pathname, anticipated = null;

  function caption(pathname) {
    if (/\/submissions(?:\/|$)/.test(pathname)) return 'SUBMISSIONS';
    if (/\/(?:editorial|articles|solutions)(?:\/|$)/.test(pathname)) return 'EDITORIAL';
    if (/^\/(?:u|profile)\//.test(pathname)) return 'PROFILE';
    if (/^\/problems\/[^/]+/.test(pathname) || /\/contest\/[^/]+\/problems\//.test(pathname)) return 'PROBLEM';
    if (/^\/(?:problemset|problems)(?:\/|$)/.test(pathname)) return 'PROBLEMSET';
    if (/^\/(?:contest|contests)(?:\/|$)/.test(pathname)) return /\/(?:ranking|standings)(?:\/|$)/.test(pathname) ? 'STANDINGS' : 'CONTESTS';
    const sections = { explore: 'EXPLORE', studyplan: 'STUDY PLAN', discuss: 'DISCUSS', quest: 'QUEST', tag: 'TOPICS', company: 'COMPANIES', account: 'ACCOUNT', settings: 'SETTINGS', progress: 'PROGRESS', interview: 'INTERVIEW', library: 'LIBRARY' };
    return sections[pathname.split('/')[1]] || (/^\/(?:home\/?)?$/.test(pathname) ? 'HOME' : 'LEETCODE');
  }
  function clear() {
    clearTimeout(timeout); timeout = 0;
    clearTimeout(check); check = 0;
    abortWatch?.abort(); abortWatch = null;
    card?.remove(); card = null;
  }
  function show(destination) {
    clear();
    if (document.hidden) return;
    const el = document.createElement('div');
    el.id = 'lcfl-stinger'; el.setAttribute('aria-hidden', 'true'); el.inert = true;
    el.innerHTML = '<i class="r"></i><i class="w"></i><div class="c"></div><div class="s"></div><div class="cap"><span class="k"><b>FASTLAP</b><span>LEETCODE / NEXT UP</span></span><span class="l"></span><span class="t"><i></i></span></div>';
    el.querySelector('.l').textContent = caption(destination);
    card = el; document.documentElement.appendChild(el);
    const started = performance.now();
    let readySince = 0, leaving = false;
    function reveal() {
      if (card !== el || leaving) return;
      leaving = true;
      clearTimeout(check); check = 0;
      clearTimeout(timeout);
      el.classList.add('lcfl-st-reveal');
      // Removal does not depend on CSS events (including reduced motion).
      timeout = setTimeout(() => { if (card === el) clear(); }, reduced.matches ? 140 : 260);
    }
    function ready() {
      const root = document.documentElement;
      const host = document.querySelector('#__next, #root, #app, main');
      if (location.pathname !== destination || document.readyState === 'loading' ||
          root.dataset.lcTheme !== 'fastlap' || !root.classList.contains('dark') ||
          !getComputedStyle(root).getPropertyValue('--fl-carbon').trim() ||
          !host?.childElementCount || document.fonts.status !== 'loaded') return false;
      // Wait for local page adapters, never for contest data or 3D downloads.
      if (/^\/problemset(?:\/|$)/.test(destination) && !document.querySelector('.lcfl-directory-head')) return false;
      if (/^\/u\/[^/]+/.test(destination) && !document.querySelector('#lcfl-drive')) return false;
      return true;
    }
    function poll() {
      if (card !== el || leaving) return;
      const now = performance.now();
      if (!ready()) readySince = 0;
      else if (!readySince) readySince = now;
      if (readySince && now - readySince >= 200 && now - started >= (reduced.matches ? 0 : 1500)) reveal();
      else check = setTimeout(poll, 100);
    }
    poll();
    // Broken routes, absent adapters or failed fonts must never strand the overlay.
    timeout = setTimeout(reveal, 4500);
  }
  function departing(url) {
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    anticipated = url.pathname;
    show(url.pathname);
  }
  function committed() {
    const next = location.pathname;
    if (next === path) return;
    path = next;
    if (anticipated !== next) show(next);
    anticipated = null;
  }
  function attach() {
    if (listeners) return;
    listeners = new AbortController();
    const options = { signal: listeners.signal };
    if (globalThis.navigation) {
      navigation.addEventListener('navigate', event => {
        if (event.defaultPrevented || event.hashChange || event.downloadRequest != null || event.navigationType === 'reload') return;
        let url; try { url = new URL(event.destination.url); } catch { return; }
        departing(url);
        const current = card;
        if (!current) return;
        abortWatch = new AbortController();
        event.signal.addEventListener('abort', () => {
          if (card === current) { clear(); anticipated = null; }
        }, { once: true, signal: abortWatch.signal });
      }, options);
      navigation.addEventListener('currententrychange', committed, options);
      navigation.addEventListener('navigatesuccess', committed, options);
    } else {
      // Older Chrome: native click + existing content.js route notification.
      addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest?.('a[href]');
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
        try { departing(new URL(link.href, location.href)); } catch { /* Invalid link. */ }
      }, options);
    }
    addEventListener('popstate', committed, options);
    addEventListener('lc-fastlap-route', committed, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); }, options);
  }
  addEventListener('pagehide', () => {
    clear(); anticipated = null; listeners?.abort(); listeners = null;
  });
  addEventListener('pageshow', event => {
    path = location.pathname; anticipated = null; attach();
    if (event.persisted) show(path);
  });
  attach();
  show(path);
})();
