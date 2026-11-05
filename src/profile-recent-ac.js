/* Public Recent AC metadata only. Never infer difficulty from titles or colors. */
(() => {
  if (globalThis.__lcflRecentAC) return;
  globalThis.__lcflRecentAC = true;
  const cache = new Map();
  let current = null;
  const profile = () => /^\/(?:u|profile)\/([^/]+)\/?$/.exec(location.pathname)?.[1] || '';
  async function graphql(query, variables, signal) {
    const response = await fetch('/graphql/', {
      method: 'POST', credentials: 'same-origin', signal,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables})
    });
    if (!response.ok) throw new Error('Recent AC metadata unavailable');
    return (await response.json()).data;
  }
  function stop() {
    if (!current) return;
    current.controller.abort(); current.observer.disconnect();
    clearTimeout(current.timer); clearTimeout(current.deadline);
    for (const [element, attribute] of current.marks) element.removeAttribute(attribute);
    current = null;
  }
  function start() {
    const username = profile();
    if (current?.username === username) return;
    stop();
    if (!username || !document.body) return;
    const state = {username, controller: new AbortController(), marks: new Map(), rows: new Map(), timer: 0, deadline: 0};
    current = state;
    function mark(element, attribute, value) {
      if (!element) return;
      if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
      state.marks.set(element, attribute);
    }
    function decorate() {
      state.timer = 0;
      if (current !== state) return;
      // React may reuse an anchor for a different submission: clear stale metadata.
      for (const [element, attribute] of state.marks) element.removeAttribute(attribute);
      state.marks.clear();
      // Recent AC links contain submission IDs; match only IDs returned for this user.
      // Do not accidentally recolor unrelated problem links or other profile tabs.
      for (const a of document.querySelectorAll('a[href*="/submissions/detail/"]')) {
        let url;
        try { url = new URL(a.href, location.href); } catch { continue; }
        if (url.origin !== location.origin) continue;
        const id = /^\/submissions\/detail\/(\d+)\/?$/.exec(url.pathname)?.[1];
        const row = state.rows.get(id);
        const difficulty = row && cache.get(row.titleSlug);
        if (!difficulty) continue;
        // The title leaf is selected by exact API text, not a generated class.
        const title = [...a.querySelectorAll('span, p, div')].find(el =>
          el.childElementCount === 0 && el.textContent.trim() === row.title);
        if (!title) continue;
        mark(a, 'data-lcfl-ac-difficulty', difficulty);
        mark(title, 'data-lcfl-ac-title', '');
        for (const el of a.querySelectorAll('time, span')) {
          if (el !== title && !el.contains(title) && !title.contains(el) && !el.childElementCount &&
              (el.tagName === 'TIME' || /\b(?:ago|yesterday|today)\b/i.test(el.textContent))) mark(el, 'data-lcfl-ac-time', '');
        }
      }
    }
    state.observer = new MutationObserver(records => {
      if (state.timer || !state.rows.size) return;
      if (records.some(record => (record.type === 'attributes' && record.target.matches('a')) || [...record.addedNodes].some(node => node.nodeType === 1 &&
          (node.matches('a[href*="/submissions/detail/"]') || node.closest('a[href*="/submissions/detail/"]') || node.querySelector('a[href*="/submissions/detail/"]'))))) {
        state.timer = setTimeout(decorate, 100);
      }
    });
    state.observer.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['href']});
    state.deadline = setTimeout(() => state.controller.abort(), 10000);
    (async () => {
      const data = await graphql(`query FastlapRecentAC($username: String!) {
        recentAcSubmissionList(username: $username, limit: 20) { id title titleSlug }
      }`, {username: decodeURIComponent(username)}, state.controller.signal);
      if (current !== state) return;
      const rows = Array.isArray(data?.recentAcSubmissionList) ? data.recentAcSubmissionList.slice(0, 20) : [];
      for (const row of rows) if (/^\d+$/.test(String(row?.id)) && typeof row.title === 'string' &&
          typeof row.titleSlug === 'string' && /^[a-z0-9-]+$/.test(row.titleSlug)) state.rows.set(String(row.id), row);
      decorate();
      const slugs = [...new Set([...state.rows.values()].map(row => row.titleSlug))].filter(slug => !cache.has(slug));
      if (!slugs.length) return;
      const definitions = slugs.map((_, i) => `$s${i}: String!`).join(', ');
      const fields = slugs.map((_, i) => `q${i}: question(titleSlug: $s${i}) { titleSlug difficulty }`).join('\n');
      const variables = Object.fromEntries(slugs.map((slug, i) => [`s${i}`, slug]));
      const questions = await graphql(`query FastlapRecentACDifficulty(${definitions}) { ${fields} }`, variables, state.controller.signal);
      if (current !== state) return;
      slugs.forEach((slug, i) => {
        const question = questions?.[`q${i}`];
        const difficulty = String(question?.difficulty || '').toLowerCase();
        if (question?.titleSlug === slug && ['easy', 'medium', 'hard'].includes(difficulty)) cache.set(slug, difficulty);
      });
      while (cache.size > 200) cache.delete(cache.keys().next().value);
      decorate();
    })().catch(() => { /* Keep native rows neutral when public metadata is unavailable. */ })
      .finally(() => clearTimeout(state.deadline));
  }
  addEventListener('lc-fastlap-route', start);
  addEventListener('popstate', start);
  addEventListener('pagehide', stop);
  addEventListener('pageshow', start);
  start();
})();
