/* =============================================================================
   monaco-ink.js  (isolated world)

   WHAT THIS DOES
   LeetCode bundles Monaco through webpack and does not reliably expose
   window.monaco, so monaco.editor.defineTheme often never runs and the editor
   keeps its stock dark-theme syntax colours. Monaco always emits its palette as
   a plain stylesheet (`.mtk1 { color: #d4d4d4 }`) which the isolated world can
   read, so we read the colours it chose, work out what role each plays, and
   publish an override sheet. The mapping is bijective on the source colours, so
   two tokens Monaco drew differently stay different.

   WHY THIS LOOKS DIFFERENT FROM THE FIRST VERSION
   The first version observed documentElement with { subtree, characterData }
   and re-scanned every <style> with a regex on each animation frame. Monaco
   virtualises its lines, so scrolling the editor is a continuous stream of
   characterData mutations -- that scan was running dozens of times a second,
   over the whole stylesheet, on the main thread. It was a large part of the lag.

   The replacement never observes the document:
     - a decaying schedule catches the editor whenever it mounts
       (0.3s, 0.6s, 1.2s ... 40s, then stop) -- eight scans in total
     - after that, a 2s heartbeat compares ONE cached number: the length of
       Monaco's own colour stylesheet. A property read, no parsing. The
       expensive scan reruns only when that number moves, i.e. on a language or
       theme switch
     - our own theme switches arrive via a single attributeFilter observer on
       <html>, which fires only when we change it ourselves
============================================================================= */
(() => {
  if (globalThis.__lcFastlapMonacoInk) return;
  globalThis.__lcFastlapMonacoInk = true;
  const STYLE_ID = 'lcfl-monaco-ink';

  /* Same semantic inks as the page-world Monaco palette in inject.js. */
  const INK = {
    fastlap: {
      a: 1,
      variable:'#f4f4f6', comment:'#8c8c97', keyword:'#ff8a8a', control:'#ff8a8a',
      string:'#e2cda0',   number:'#22c55e',  func:'#facc15',    type:'#c38bfa',
      param:'#b4b4be',    operator:'#c9c9d1', regexp:'#e2cda0', invalid:'#ff8a8a'
    }
  };

  /* The palette LeetCode ships is the VS Code Dark+ family. Naming it gets the
     roles semantically right; anything else falls through to the hue
     classifier, which still keeps distinct colours distinct. */
  const KNOWN = {
    '569cd6':'keyword',  'c586c0':'control',  '4ec9b0':'type',     'dcdcaa':'func',
    '9cdcfe':'param',    'ce9178':'string',   'b5cea8':'number',   '6a9955':'comment',
    'd4d4d4':'variable', 'd16969':'regexp',   '4fc1ff':'param',    'c8c8c8':'variable',
    '808080':'comment',  'd7ba7d':'number',   'f44747':'invalid',  'b267e6':'type',
    '000080':'operator', '646695':'operator', 'ffd700':'operator', 'da70d6':'operator',
    '179fff':'func',     '3794ff':'func',     'cccccc':'variable', 'e6e6e6':'variable'
  };

  function hsl(hex) {
    const r = parseInt(hex.slice(0,2),16)/255,
          g = parseInt(hex.slice(2,4),16)/255,
          b = parseInt(hex.slice(4,6),16)/255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx===r) h = ((g-b)/d) % 6; else if (mx===g) h = (b-r)/d + 2; else h = (r-g)/d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const l = (mx+mn)/2;
    return [h, d ? d/(1-Math.abs(2*l-1)) : 0, l];
  }

  /* If inject.js managed to define a real Monaco theme, Monaco writes OUR
     colours into its stylesheet and we would read them back on the next scan.
     Mapping each ink to the role it came from makes that round trip a no-op. */
  const OURS = {};
  Object.keys(INK).forEach((t) => {
    Object.keys(INK[t]).forEach((role) => {
      const v = INK[t][role];
      if (typeof v === 'string' && v.charAt(0) === '#') {
        const h = v.slice(1).toLowerCase();
        if (!(h in OURS)) OURS[h] = role;
      }
    });
  });

  function classify(hex) {
    const k = KNOWN[hex] || OURS[hex];
    if (k) return k;
    const t = hsl(hex), h = t[0], s = t[1], l = t[2];
    if (s < 0.18) return l > 0.45 ? 'variable' : 'comment';
    if (h < 20 || h >= 345) return 'keyword';
    if (h < 45)  return 'string';
    if (h < 70)  return 'func';
    if (h < 160) return 'number';
    if (h < 200) return 'type';
    if (h < 255) return 'param';
    if (h < 290) return 'func';
    return 'control';
  }

  function rgba(hex, a) {
    if (a >= 1) return hex;
    const h = hex.slice(1);
    return 'rgba(' + parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16)
         + ',' + parseInt(h.slice(4,6),16) + ',' + a + ')';
  }

  let sheets = [], sig = -1, lastTheme = '', styleCount = -1;
  const COLOR_RULE = /\.mtk\d+\s*\{\s*color\s*:\s*#[0-9a-fA-F]{6}/;

  /* WHY THIS MERGES RATHER THAN PICKS ONE SHEET
     Two stylesheets on the page both define .mtk colours and they disagree.
     Monaco registers its own default palette in style.monaco-colors (32
     colours) and LeetCode overwrites a subset from #__monaco_theme_color__ (19)
     later in the head, so the SAME .mtk class means different things in the
     two: .mtk4 is #569cd6 (a keyword) in LeetCode's sheet and something else
     entirely in Monaco's. Reading either one alone therefore hands most tokens
     the wrong ink -- keywords came out as parameters, types as strings -- which
     looked like "the colours are all the same" because the roles that carry the
     strong hues landed on tokens that barely appear.
     So we read every colour-bearing sheet in document order and let later ones
     win, which is exactly what the cascade does for the page itself. */
  /* A page carries many <style> elements. Cache unrelated sheets, but recheck
     Monaco/theme sheets because LeetCode can fill them after their creation. */
  const notPalette = new WeakSet();
  function findSheets() {
    const found = [];
    const all = document.querySelectorAll('style');
    for (let i = 0; i < all.length; i++) {
      const st = all[i];
      if (st.id === STYLE_ID || notPalette.has(st)) continue;   // never read ourselves back
      const text = st.textContent;
      if (COLOR_RULE.test(text)) found.push(st);
      else if (text.length && !/monaco|theme/i.test(st.id + ' ' + st.className)) notPalette.add(st);
    }
    return found;
  }

  /* the heartbeat's whole cost: one length read per sheet, no parsing */
  function signature() {
    let n = 0;
    for (let i = 0; i < sheets.length; i++) {
      if (!sheets[i].isConnected) return -1;
      n += sheets[i].textContent.length * (i + 1);
    }
    return n;
  }

  function palette() {
    const map = {};
    const re = /\.mtk(\d+)\s*\{\s*color\s*:\s*#([0-9a-fA-F]{6})/g;
    for (let i = 0; i < sheets.length; i++) {
      let m; re.lastIndex = 0;
      while ((m = re.exec(sheets[i].textContent))) map[m[1]] = m[2].toLowerCase();
    }
    return map;
  }

  function apply(force) {
    if (document.documentElement.getAttribute('data-lc-fastlap-page') !== 'problem') {
      const old = document.getElementById(STYLE_ID);
      if (old) old.remove();
      sig = -1; lastTheme = '';
      return true;
    }
    const theme = document.documentElement.getAttribute('data-lc-theme') || '';
    const ink = INK[theme];
    if (!ink) {
      /* theme off: take the override away so LeetCode's own colours return */
      const old = document.getElementById(STYLE_ID);
      if (old) old.remove();
      sig = -1; lastTheme = '';
      return false;
    }

    /* counting <style> elements is a cheap way to notice a sheet appearing
       after the first scan -- LeetCode inserts its palette some time after
       Monaco has already registered its own. */
    const n = document.querySelectorAll('style').length;
    if (!sheets.length || n !== styleCount || signature() === -1) {
      styleCount = n; sheets = findSheets();
    }
    if (!sheets.length) return false;

    /* the entire heartbeat is this comparison -- no parsing unless it moved */
    const now = signature();
    if (!force && now === sig && theme === lastTheme) return true;
    /* a sheet was replaced rather than edited: rediscover before parsing */
    if (now === -1) { sheets = findSheets(); if (!sheets.length) return false; }
    sig = signature(); lastTheme = theme;

    const map = palette();
    const rules = [];
    for (const cls in map) {
      const role = classify(map[cls]);
      /* unprefixed: LeetCode colourises testcase text with the same classes
         outside the editor, and those spans need the same inks */
      rules.push('.mtk' + cls + '{color:' + rgba(ink[role] || ink.variable, ink.a) + '!important}');
    }
    if (!rules.length) return false;

    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = rules.join('\n');
    return true;
  }

  function safe(force) { try { return apply(force); } catch (e) { return false; } }

  /* decaying catch-up: eight scans spread over 40s, then done */
  let delay = 300;
  (function tick() {
    if (safe(false)) return;
    if (delay > 40000) return;
    setTimeout(tick, delay);
    delay *= 2;
  })();

  /* The route check avoids any stylesheet work outside problem pages. */
  setInterval(function () { safe(false); }, 2000);

  /* our own theme switches, and only ours */
  new MutationObserver(function () { safe(true); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-lc-theme', 'data-lc-fastlap-page'] });
})();
