/* Read only public, same-origin LeetCode contest history for the profile drive. */
(() => {
  if (globalThis.__lcFastlapContestHistory) return;

  const QUERY = `query FastlapContestHistory($username: String!) {
    userContestRankingHistory(username: $username) {
      attended rating ranking
      contest { title startTime }
    }
  }`;

  function normalize(rows) {
    if (!Array.isArray(rows)) return [];
    const seen = new Set();
    return rows.filter(row => row && row.attended === true).map(row => {
      const contest = row.contest || {};
      const rating = Number(row.rating);
      const ranking = Number(row.ranking);
      let startTime = Number(contest.startTime);
      if (startTime > 1e12) startTime = Math.floor(startTime / 1000);
      const title = typeof contest.title === 'string' ? contest.title.trim() : '';
      if (!title || !Number.isFinite(startTime) || startTime <= 0 ||
          !Number.isFinite(rating) || rating <= 0) return null;
      return { title, startTime, rating,
        ranking: Number.isInteger(ranking) && ranking > 0 ? ranking : null };
    }).filter(Boolean).sort((a, b) => a.startTime - b.startTime).filter(row => {
      const key = `${row.startTime}:${row.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /* Next.js sometimes includes the same GraphQL payload on the profile page.
     Parse JSON only; never execute page scripts or infer chart values. */
  function embeddedHistory() {
    const script = document.querySelector('script#__NEXT_DATA__');
    if (!script || !script.textContent || script.textContent.length > 5_000_000) return [];
    let data;
    try { data = JSON.parse(script.textContent); } catch (_) { return []; }
    const queue = [data];
    let inspected = 0;
    while (inspected < queue.length && inspected < 15_000) {
      const item = queue[inspected++];
      if (!item || typeof item !== 'object') continue;
      if (Object.prototype.hasOwnProperty.call(item, 'userContestRankingHistory')) {
        const rows = normalize(item.userContestRankingHistory);
        if (rows.length) return rows;
      }
      if (Array.isArray(item)) queue.push(...item.slice(0, 300));
      else queue.push(...Object.values(item).filter(x => x && typeof x === 'object'));
    }
    return [];
  }

  async function load(username, signal) {
    const endpoint = new URL('/graphql/', location.origin);
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 6000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationName: 'FastlapContestHistory', query: QUERY, variables: { username } })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.errors?.length || !payload.data ||
          !Array.isArray(payload.data.userContestRankingHistory)) throw new Error('History unavailable');
      return { rows: normalize(payload.data.userContestRankingHistory), source: 'graphql' };
    } catch (_) {
      if (signal?.aborted) return { rows: [], source: 'cancelled' };
      const rows = embeddedHistory();
      return { rows, source: rows.length ? 'embedded' : 'unavailable' };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  globalThis.__lcFastlapContestHistory = { normalize, embeddedHistory, load };
})();
