/* Port of Fastlap shell.js's stinger: cosmetic only, never intercept navigation.
   No page visibility, scroll, focus, network or native View Transition changes. */
(() => {
  if (globalThis.__lcflStinger) return;
  globalThis.__lcflStinger = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let card = null, timeout = 0, check = 0, listeners = null;
  let section = majorSection(location.pathname);

  // Only the first path segment defines a section; IDs, tabs, queries and
  // hashes never participate. Problem details belong to the problem directory.
  function majorSection(pathname) {
    const root = pathname.split('/').filter(Boolean)[0] || 'home';
    const aliases = { problems: 'problemset', contests: 'contest', u: 'profile' };
    return Object.prototype.hasOwnProperty.call(aliases, root) ? aliases[root] : root;
  }

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
    card?.remove(); card = null;
  }
  function show(destination) {
    clear();
    if (document.hidden) return;
    const el = document.createElement('div');
    el.id = 'lcfl-stinger'; el.setAttribute('aria-hidden', 'true'); el.inert = true;
    el.innerHTML = '<i class="r"></i><i class="w"></i><div class="c"></div><div class="s"></div><div class="cap"><span class="k"><b>LEETCODE</b><span>NEXT UP</span></span><span class="l"></span><span class="t"><i></i></span></div>';
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
      const currentPath = location.pathname;
      if (majorSection(currentPath) !== majorSection(destination) || document.readyState === 'loading' ||
          root.dataset.lcTheme !== 'fastlap' || !root.classList.contains('dark') ||
          !getComputedStyle(root).getPropertyValue('--fl-carbon').trim() ||
          !host?.childElementCount || document.fonts.status !== 'loaded') return false;
      // Wait for local page adapters, never for contest data or 3D downloads.
      if (/^\/problemset(?:\/|$)/.test(currentPath) && !document.querySelector('.lcfl-directory-head')) return false;
      if (/^\/u\/[^/]+/.test(currentPath) && !document.querySelector('#lcfl-drive')) return false;
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
  function committed() {
    const next = majorSection(location.pathname);
    if (next === section) return;
    // Update synchronously before showing: all route event sources share this
    // state, so currententrychange, popstate and React notifications deduplicate.
    section = next;
    show(location.pathname);
  }
  function attach() {
    if (listeners) return;
    listeners = new AbortController();
    const options = { signal: listeners.signal };
    if (globalThis.navigation) {
      navigation.addEventListener('currententrychange', committed, options);
      navigation.addEventListener('navigatesuccess', committed, options);
    }
    // Older Chrome uses content.js's existing route notification; do not
    // speculate on clicks, which may be cancelled or redirected by React.
    addEventListener('popstate', committed, options);
    addEventListener('lc-fastlap-route', committed, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); }, options);
  }
  addEventListener('pagehide', () => {
    clear(); listeners?.abort(); listeners = null;
  });
  addEventListener('pageshow', () => {
    attach(); committed();
  });
  attach();
  show(location.pathname);
})();
