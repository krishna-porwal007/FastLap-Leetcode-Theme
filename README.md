# Fastlap for LeetCode

A standalone Manifest V3 theme for `leetcode.com` and `leetcode.cn`. It translates Theme Studio for Codeforces' Fastlap palette and broadcast typography onto LeetCode's native interface. It uses LeetCode’s native controls and public contest history, with no Codeforces API calls or custom editor.

## Install

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the `fastlap-leetcode/` directory. Reload LeetCode after changing the extension files.

## Design

Fastlap uses a flat carbon page (`#0E0E10`), pit panels (`#151518`), raised surfaces (`#1C1C21`), square borders, white display text, and restrained race-red (`#E10A1E`) action fills and rails. Titillium Web is used for headings, controls, labels, and figures; Inter is used for reading; JetBrains Mono is packaged for code samples and output. Font files and their licenses are in `fonts/`. The native Monaco editor keeps its own font configuration.

## Supported surfaces

| Surface | Treatment |
| --- | --- |
| Global navigation, menus, controls, dialogs | Carbon bar, square pit surfaces, white active text and red navigation mark |
| Home | Large display heading and flat featured cards with red hover edge |
| Problemset, explorer, tags, companies, study plans | Timing-table headers and rows, square filters, difficulty stamps and tags |
| Problems | Race-brief headings and prose, dark examples, FlexLayout tabs, editor chrome, native Run and red Submit |
| Submissions | Table typography and state rails for accepted, wrong answer, runtime, time/memory limits, and compilation |
| Editorials and articles | Display headings, Inter prose, bordered code and tables |
| Profiles | Identity and stat typography, flat cards, green-to-purple activity levels, quiet chart chrome |
| Contest list, detail, standings | Square cards, countdown typography, timing-table styling and state rails when matching native attributes exist |

`src/content.js` marks page and route types on `<html>` and updates them after client-side navigation. `themes/fastlap.css` defines the palette and fonts. `themes/core.css` and the page-specific CSS files use LeetCode tokens, exact utility class tokens, semantic roles, and stable editor hooks. `src/inject.js` defines a Monaco palette if LeetCode exposes `window.monaco`; `src/monaco-ink.js` is the low-frequency stylesheet fallback. Neither changes Monaco's model, key handling, language configuration, or font. FlexLayout keeps control of panes and splitters. Run, Submit, search, filters, registration, and navigation remain LeetCode controls.

### Profile race drive

A sticky, naturally scrolling 3D circuit precedes `/u/:username` and
`/profile/:username`. It uses the original Codeforces Fastlap Three.js bundle,
RB22 model, detailed procedural fallback and locally packaged PBR textures.
Scroll down to drive forward; scroll up to retrace the same path. Car, camera,
checkpoint labels and telemetry share one arc-distance coordinate. There is no
timer-based movement, body-scroll lock or disappearing entrance overlay.

Attended contests come from the existing same-origin contest-history loader.
Every checkpoint corresponds to a real contest. The HUD shows date, post-contest
rating, change from the previous attended contest, and placement when available.
The first rating has no assumed baseline. A rating chart, 500-point milestone
gates and a special peak gantry represent progress. The entire history is also
available as an accessible table in **Contest log**.

**Skip to profile** moves to the untouched native profile. Escape while focus is
inside the drive does the same. Reduced motion, narrow screens (760px or less),
missing history and unavailable WebGL use a compact driver card and contest log.
SPA navigation disposes the scene, GPU resources, observers and animation frame;
resizing is supported, and no frames are rendered continuously while idle.

See `assets/models/CREDIT.txt` for the original car's CC BY 4.0 attribution and
`assets/CREDITS.txt` for CC0 track textures. Model attribution is also visible in
the scene. The older vector car is retained as an unused legacy asset.

### Problem directory

The native problemset gets a large **Problem Grid** heading, a red discovery
panel linked to the actual daily problem (or a currently listed problem), square
search/filter controls and Timing Tower rows. Index, title, difficulty,
acceptance, topic tags and status rails are based on native content and data.
The native row anchors, favorites, Premium metadata, category/topic navigation,
search, sorting, filters and incremental pagination retain their event handlers.

`src/problemset-data.js` observes only the relevant native same-origin GraphQL
responses to expose slug/status/topic tags to the isolated enhancer. It issues
no extra queries and never changes native requests or results. A throttled,
child-list observer decorates the native main area; there is no document-wide
attribute observer or replacement table. Unknown DOM variants keep their native
controls and existing generic theme styles.

### Examples and compact labels

Recognized problem examples get a separate display heading and Input, Output and Explanation sections. The enhancer reuses the existing nodes inside each example; their text, math elements and copy controls remain in place. Input/output keep line breaks and horizontal scrolling for long lines; explanations use Inter. Compact navigation, Premium, tab, difficulty and contest labels prevent in-word wrapping without imposing fixed widths.

## Validation and limits

Actual Chromium testing was performed with this unpacked extension on
`leetcode.com/problemset/`, `/u/lee215/`, and `/problems/two-sum/`.
See [validation/RESULTS.md](validation/RESULTS.md) for checks, screenshots and
explicit limits. Search reached LeetCode's native sign-in requirement in the
signed-out test browser; authenticated search results and user-specific solved
and attempted states were not verified. The status colors also have controlled
fixture checks. `leetcode.cn` and alternative/legacy DOM variants were not tested.

The existing problem/editor/example files are unchanged. Run and Submit controls
were present and the FlexLayout splitter was dragged successfully; no submission
was made. The extension has no runtime npm dependency or remote script.

To reproduce developer checks (optional, from `fastlap-leetcode/`):

```sh
npm ci --prefix tools
PLAYWRIGHT_BROWSERS_PATH=./tools/browsers tools/node_modules/.bin/playwright install chromium
node tools/geometry-check.mjs
node tools/car-contact.cjs
node tools/check-interactions.cjs
node tools/final-validation.cjs
node tools/status-mobile.cjs
```

The browser scripts need a desktop display and use their own ignored test
profiles. Test tooling is not part of the extension's runtime. Reload the
unpacked extension and reload LeetCode after changing files. The theme remains
dark-only; disable the extension to remove it.
