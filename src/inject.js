/* =============================================================================
   inject.js  — runs in the PAGE (MAIN) world via manifest content_scripts,
   so it can reach window.monaco and is NOT subject to page CSP.
   Recolors the Monaco code editor to match the active theme and keeps it applied
   across editor re-creation and LeetCode's own setTheme() calls.
============================================================================= */
(() => {
  if (window.__lcFastlapInjected) return;
  window.__lcFastlapInjected = true;

  const NAME = (id) => 'lcfl-' + id;

  /* palette = { base, fg, syn{}, colors{} }  (syntax value ending in 'i' = italic) */
  const PALETTES = {
    /* Code remains legible on carbon: pale red keywords, yellow functions,
       green numbers and purple types echo Fastlap's sector colors. */
    fastlap: {
      base: 'vs-dark', fg: 'f4f4f6',
      syn: { comment:'8c8c97i', keyword:'ff8a8a', control:'ff8a8a', string:'e2cda0',
             number:'22c55e', func:'facc15', type:'c38bfa', variable:'f4f4f6',
             param:'b4b4be', constant:'22c55e', operator:'c9c9d1', regexp:'e2cda0',
             tag:'facc15', attr:'c38bfa', escape:'22c55e' },
      colors: {
        'editor.background':'#151518','editor.foreground':'#f4f4f6',
        'editorLineNumber.foreground':'#64646e','editorLineNumber.activeForeground':'#ffffff',
        'editor.lineHighlightBackground':'#1c1c21','editorCursor.foreground':'#ffffff',
        'editor.selectionBackground':'#34343c','editor.selectionHighlightBackground':'#34343c99',
        'editor.inactiveSelectionBackground':'#34343c66','editorWhitespace.foreground':'#34343c',
        'editorIndentGuide.background':'#26262c','editorIndentGuide.activeBackground':'#8c8c97',
        'editorBracketMatch.background':'#34343c','editorBracketMatch.border':'#ffffff',
        'editorGutter.background':'#151518','editorError.foreground':'#ff8a8a',
        'editorWarning.foreground':'#facc15','scrollbarSlider.background':'#34343c99',
        'scrollbarSlider.hoverBackground':'#55555fcc','editorWidget.background':'#1c1c21',
        'editorSuggestWidget.background':'#1c1c21','editorHoverWidget.background':'#1c1c21',
        'input.background':'#0b0b0d','editor.findMatchBackground':'#facc1555',
        'editor.findMatchHighlightBackground':'#facc152e'
      }
    }
  };

  function ruleset(p) {
    const s = p.syn;
    /* a palette value is 6 hex digits plus optional style flags:
       'i' = italic, 'b' = bold. e.g. '9c2f1eb' = oxblood, bold. */
    const R = (tokens, val) => {
      const m = /^([0-9a-fA-F]{6})([ib]*)$/.exec(val) || [null, val, ''];
      const fg = m[1], flags = m[2] || '';
      const style = [flags.indexOf('i') > -1 ? 'italic' : '',
                     flags.indexOf('b') > -1 ? 'bold' : ''].filter(Boolean).join(' ');
      return tokens.map((t) => {
        const r = { token: t, foreground: fg };
        if (style) r.fontStyle = style;
        return r;
      });
    };
    return [
      { token: '', foreground: p.fg },
      ...R(['comment','comment.line','comment.block'], s.comment),
      ...R(['keyword','keyword.json','keyword.flow','storage','storage.type','modifier'], s.keyword),
      ...R(['keyword.control','control'], s.control),
      ...R(['string','string.value','string.key.json','string.quote','string.sql'], s.string),
      ...R(['string.escape','constant.character.escape'], s.escape),
      ...R(['number','number.hex','number.float','constant.numeric'], s.number),
      ...R(['regexp','string.regexp'], s.regexp),
      ...R(['type','type.identifier','struct','class','interface','enum','namespace','entity.name.type'], s.type),
      ...R(['function','entity.name.function','support.function','meta.function-call','function.call'], s.func),
      ...R(['variable','identifier','variable.other'], s.variable),
      ...R(['variable.parameter','parameter','variable.language'], s.param),
      ...R(['constant','constant.language','constant.other','boolean'], s.constant),
      ...R(['operator','keyword.operator','delimiter','delimiter.bracket','delimiter.parenthesis'], s.operator),
      ...R(['tag','metatag','entity.name.tag'], s.tag),
      ...R(['attribute.name','entity.other.attribute-name'], s.attr),
      ...R(['attribute.value'], s.string),
      ...R(['annotation','meta.annotation','decorator'], s.func)
    ];
  }

  let monaco = null;
  const definedFor = new Set();
  /* null when the theme is off: content.js removes the attribute */
  const currentId = () => {
    if (document.documentElement.getAttribute('data-lc-fastlap-page') !== 'problem') return null;
    const id = document.documentElement.getAttribute('data-lc-theme');
    return PALETTES[id] ? id : null;
  };

  function defineAll() {
    if (!monaco || !monaco.editor) return;
    Object.keys(PALETTES).forEach((id) => {
      if (definedFor.has(id)) return;
      try {
        monaco.editor.defineTheme(NAME(id), {
          base: PALETTES[id].base, inherit: true,
          rules: ruleset(PALETTES[id]), colors: PALETTES[id].colors
        });
        definedFor.add(id);
      } catch (e) {}
    });
  }

  /* Change Monaco's palette only; leave its editing and font configuration intact. */
  let applying = false, realSetTheme = null, oursApplied = false;
  function applyCurrent() {
    if (!monaco || !monaco.editor) return;
    defineAll();
    const id = currentId();
    if (!id || oursApplied) return;
    if (!realSetTheme || !definedFor.has(id)) return;
    try {
      applying = true;
      realSetTheme(NAME(id));
      oursApplied = true;
    } catch (e) {
      /* A later editor mount can retry; the isolated ink sheet still works. */
    } finally { applying = false; }
  }
  function hookSetTheme() {
    if (!monaco || !monaco.editor || realSetTheme) return;
    realSetTheme = monaco.editor.setTheme.bind(monaco.editor);
    monaco.editor.setTheme = function (name) {
      if (applying) return realSetTheme(name);
      const id = currentId();
      return realSetTheme(id ? NAME(id) : name);
    };
  }

  const themeObserver = new MutationObserver(() => syncRoute());
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lc-theme', 'data-lc-fastlap-page'] });

  let delay = 150, elapsed = 0, retryTimer = null;
  function findMonaco() {
    retryTimer = null;
    if (document.documentElement.getAttribute('data-lc-fastlap-page') !== 'problem') return;
    if (window.monaco && window.monaco.editor) {
      monaco = window.monaco;
      hookSetTheme();
      applyCurrent();
      return;
    }
    if (elapsed >= 90000) return;
    retryTimer = setTimeout(findMonaco, delay);
    elapsed += delay;
    delay = Math.min(delay * 2, 5000);
  }
  function syncRoute() {
    if (document.documentElement.getAttribute('data-lc-fastlap-page') !== 'problem') {
      oursApplied = false;
      if (retryTimer !== null) clearTimeout(retryTimer);
      retryTimer = null;
      delay = 150;
      elapsed = 0;
      return;
    }
    /* LeetCode can replace the Monaco module during client-side navigation. */
    if (monaco && window.monaco && window.monaco !== monaco) {
      monaco = null;
      realSetTheme = null;
      oursApplied = false;
      definedFor.clear();
    }
    if (monaco) { applyCurrent(); return; }
    if (retryTimer === null) findMonaco();
  }
  syncRoute();
})();
