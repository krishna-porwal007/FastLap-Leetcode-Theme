/* Restructure only recognized static example markup; preserve every source node. */
(() => {
  if (globalThis.__lcFastlapExamplesLoaded) return;
  globalThis.__lcFastlapExamplesLoaded = true;

  const EXAMPLE = /^(?:Example\s*\d+|示例\s*\d+)\s*[:：]?$/i;
  const LABELS = new Map([
    ['input', 'input'], ['output', 'output'], ['explanation', 'explanation'],
    ['输入', 'input'], ['输出', 'output'], ['解释', 'explanation']
  ]);
  let timers = [];

  function partOf(node) {
    if (node.nodeType !== Node.ELEMENT_NODE || !node.matches('strong,b')) return null;
    const text = node.textContent.trim().replace(/[:：]$/, '').toLowerCase();
    return LABELS.get(text) || null;
  }

  function enhance(pre) {
    if (pre.classList.contains('lcfl-example') ||
        pre.querySelector('button,input,textarea,[contenteditable]')) return;
    const previous = pre.previousElementSibling;
    const hasHeading = previous && /^(?:P|H2|H3|H4)$/.test(previous.tagName) &&
      EXAMPLE.test(previous.textContent.trim());
    const nodes = [...pre.childNodes];
    const labels = nodes.map((node, index) => ({ node, index, part: partOf(node) }))
      .filter(x => x.part);
    const allLabels = [...pre.querySelectorAll('strong,b')].filter(partOf);
    if (!hasHeading && allLabels.length < 2) return;
    pre.classList.add('lcfl-example');
    if (hasHeading) previous.classList.add('lcfl-example-heading');
    if (labels.length < 2) {
      allLabels.forEach(label => label.classList.add('lcfl-example-label'));
      return;
    }

    /* Spans are valid phrasing content inside <pre>. Moving existing nodes keeps
       textContent, MathJax/KaTeX nodes, and any listeners on those nodes intact. */
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (let i = 0; i < labels.length; i++) {
      const { index, part } = labels[i];
      while (cursor < index) fragment.appendChild(nodes[cursor++]);
      const section = document.createElement('span');
      section.className = 'lcfl-example-part';
      section.dataset.lcflPart = part;
      const label = nodes[cursor++];
      label.classList.add('lcfl-example-label');
      section.appendChild(label);
      const end = i + 1 < labels.length ? labels[i + 1].index : nodes.length;
      while (cursor < end) section.appendChild(nodes[cursor++]);
      fragment.appendChild(section);
    }
    while (cursor < nodes.length) fragment.appendChild(nodes[cursor++]);
    pre.replaceChildren(fragment);
  }

  function scan() {
    if (document.documentElement.getAttribute('data-lc-fastlap-page') !== 'problem') return;
    document.querySelectorAll('[data-track-load="description_content"] pre').forEach(enhance);
  }

  function schedule() {
    timers.forEach(clearTimeout);
    timers = [];
    scan();
    for (const delay of [120, 500, 1500, 3500]) timers.push(setTimeout(scan, delay));
  }

  addEventListener('lc-fastlap-route', schedule);
  schedule();
})();
