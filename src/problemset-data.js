/* MAIN-world read-only tap of native problemset metadata. LeetCode currently
   uses XHR; fetch is covered too. Original calls/results/errors are unchanged.
   No new requests, account/session fields, or page-to-extension commands. */
(() => {
  if (window.__lcflProblemData) return;
  window.__lcflProblemData = true;
  const cache = new Map();
  const onProblemset = () => /^\/problemset(?:\/|$)/.test(location.pathname);
  const publish = rows => {
    if (onProblemset() && rows.length) dispatchEvent(new CustomEvent('lc-fastlap-problem-data', { detail: JSON.stringify(rows) }));
  };
  function relevant(url, body) {
    if (!onProblemset() || typeof body !== 'string' || body.length > 30000) return false;
    try {
      const parsed = new URL(url, location.href);
      return parsed.origin === location.origin && /^\/graphql\/?$/.test(parsed.pathname) &&
        ['problemsetQuestionListV2', 'questionOfTodayV2', 'problemsetQuestionList'].includes(JSON.parse(body).operationName);
    } catch { return false; }
  }
  function ingest(payload) {
    if (!onProblemset()) return;
    const data = payload?.data;
    const questions = data?.problemsetQuestionListV2?.questions || data?.problemsetQuestionList?.questions ||
      (data?.activeDailyCodingChallengeQuestion?.question ? [data.activeDailyCodingChallengeQuestion.question] : []);
    if (!Array.isArray(questions)) return;
    const rows = questions.slice(0, 1000).filter(q => typeof q?.titleSlug === 'string').map(q => ({
      slug: q.titleSlug, status: q.status,
      tags: (Array.isArray(q.topicTags) ? q.topicTags : []).slice(0, 15).filter(t => t && typeof t === 'object').map(t => ({ name: t.nameTranslated || t.name, slug: t.slug }))
    }));
    // fetch polyfills can also trigger the XHR tap. Publish a change only once.
    const changed = rows.filter(row => JSON.stringify(cache.get(row.slug)) !== JSON.stringify(row));
    for (const row of changed) cache.set(row.slug, row);
    while (cache.size > 2500) cache.delete(cache.keys().next().value);
    publish(changed);
  }
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const promise = Reflect.apply(originalFetch, this, args);
    try {
    const url = typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0]?.url;
    if (relevant(url, args[1]?.body)) promise.then(response => {
      if (response.ok && onProblemset()) response.clone().json().then(ingest).catch(() => {});
    }).catch(() => {});
    } catch { /* Observation must never change native fetch behavior. */ }
    return promise;
  };
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (relevant('/graphql/', args[0])) this.addEventListener('loadend', () => {
      if (this.status < 200 || this.status >= 300 || !relevant(this.responseURL, args[0])) return;
      try {
        if (this.responseType === 'blob') this.response.text().then(JSON.parse).then(ingest).catch(() => {});
        else if (this.responseType === 'arraybuffer') ingest(JSON.parse(new TextDecoder().decode(this.response)));
        else ingest(this.responseType === 'json' ? this.response : JSON.parse(this.responseText));
      } catch { /* Native request is unaffected. */ }
    }, { once: true });
    return Reflect.apply(originalSend, this, args);
  };
  addEventListener('pagehide', () => cache.clear());
  addEventListener('lc-fastlap-request-problem-data', () => publish([...cache.values()]));
  addEventListener('lc-fastlap-route', () => { if (!onProblemset()) cache.clear(); });
})();
