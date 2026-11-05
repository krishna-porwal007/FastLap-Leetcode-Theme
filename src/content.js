/* Route markers select the native problem layout or page-specific visual layers. */
(() => {
  if (globalThis.__lcFastlapContent) return;
  globalThis.__lcFastlapContent = true;
  const root = document.documentElement;

  let lastPath = '';
  function applyRoute() {
    const path = location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    const page = /^\/problems\/[^/]+/.test(path) ? 'problem' : 'global';
    const surface = page === 'problem' ? 'other'
      : /^\/(?:problemset|problems|explore|tag|company|studyplan)(?:\/|$)/.test(path) ? 'listing'
      : /^\/(?:home\/?)?$/.test(path) ? 'home' : 'other';
    const contest = /^\/(?:contest|contests)(?:\/|$)/.test(path)
      ? /^\/(?:contest|contests)\/[^/]+\/(?:ranking|standings)(?:\/|$)/.test(path) ? 'standings'
      : /^\/(?:contest|contests)\/[^/]+(?:\/|$)/.test(path) ? 'detail' : 'listing'
      : 'other';
    const detail = /^\/(?:u|profile)\/[^/]+/.test(path) ? 'profile'
      : /^\/problems\/[^/]+\/submissions(?:\/|$)/.test(path) || /^\/submissions(?:\/|$)/.test(path) ? 'submissions'
      : /^\/problems\/[^/]+\/editorial(?:\/|$)/.test(path) || /^\/articles\/[^/]+/.test(path) ? 'editorial'
      : 'other';
    if (root.getAttribute('data-lc-fastlap-page') !== page) root.setAttribute('data-lc-fastlap-page', page);
    if (root.getAttribute('data-lc-fastlap-discovery') !== surface) root.setAttribute('data-lc-fastlap-discovery', surface);
    if (root.getAttribute('data-lc-fastlap-detail') !== detail) root.setAttribute('data-lc-fastlap-detail', detail);
    if (root.getAttribute('data-lc-fastlap-contest') !== contest) root.setAttribute('data-lc-fastlap-contest', contest);
    dispatchEvent(new CustomEvent('lc-fastlap-route', { detail: { path, page, surface, contest, detail } }));
  }

  function applyRoot() {
    if (root.getAttribute('data-lc-theme') !== 'fastlap') root.setAttribute('data-lc-theme', 'fastlap');
    if (!root.classList.contains('dark')) root.classList.add('dark');
    if (root.classList.contains('light')) root.classList.remove('light');
    if (root.getAttribute('data-theme') !== 'dark') root.setAttribute('data-theme', 'dark');
    if (root.style.colorScheme !== 'dark') root.style.colorScheme = 'dark';
  }

  function applyBody() {
    if (!document.body) return;
    if (!document.body.classList.contains('dark')) document.body.classList.add('dark');
    if (document.body.classList.contains('light')) document.body.classList.remove('light');
  }

  applyRoot();
  applyRoute();
  applyBody();

  new MutationObserver(() => { applyRoot(); applyBody(); }).observe(root, {
    attributes: true,
    attributeFilter: ['class', 'data-lc-theme', 'data-theme']
  });

  if (!document.body) {
    const bodyMount = new MutationObserver(() => {
      if (!document.body) return;
      bodyMount.disconnect();
      applyBody();
    });
    bodyMount.observe(root, { childList: true });
  }

  /* LeetCode uses client-side routing. Navigation API covers pushState on
     current Chrome; the low-cost path check also covers older browsers. */
  addEventListener('popstate', applyRoute);
  if (globalThis.navigation && typeof navigation.addEventListener === 'function') {
    navigation.addEventListener('navigatesuccess', applyRoute);
  }
  setInterval(applyRoute, 1000);
})();
