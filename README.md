# Fastlap for LeetCode

A standalone Manifest V3 theme for `leetcode.com` and `leetcode.cn`. It translates Theme Studio for Codeforces' Fastlap palette and broadcast typography onto LeetCode's native interface. It uses LeetCode’s native controls and public contest history, with no Codeforces API calls or custom editor.

## Install the extension

Fastlap is a browser extension that automatically themes LeetCode when you visit it. You install it locally as an **unpacked extension**. You do not need Node.js, npm, a build step, or a development server to use it.

### 1. Download the files

1. Open the [GitHub repository](https://github.com/krishna-porwal007/FastLap-Leetcode-Theme).
2. Click **Code → Download ZIP**.
3. Extract the ZIP to a folder you plan to keep on your computer. Chrome loads the extension from this folder, so keep it in place while using the extension.

Alternatively, if you use Git:

```sh
git clone https://github.com/krishna-porwal007/FastLap-Leetcode-Theme.git
```

### 2. Load it in Chrome

1. Open Chrome and enter `chrome://extensions` in the address bar.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the extracted or cloned folder that directly contains `manifest.json`, `src/`, `themes/`, and `assets/`. The folder name may vary; choose the folder containing `manifest.json`, not the ZIP file or its parent folder.
5. Check that **Fastlap for LeetCode** appears in the extension list and is enabled.
6. Open [LeetCode's problemset](https://leetcode.com/problemset/) or refresh any LeetCode tabs you already have open.

These instructions target Chrome, where the extension has been tested. The extension also matches `leetcode.cn`, but that site has not been tested. See [Validation and limits](#validation-and-limits) below.

## How to use it

The theme applies automatically on `https://leetcode.com/*` and `https://leetcode.cn/*`. There is no extension popup, toolbar button, or separate app to launch.

- **Browse and solve problems as usual.** Use LeetCode's existing search, filters, editor, **Run**, and **Submit** controls. Fastlap changes the presentation; LeetCode still handles your account and submissions.
- **Explore a profile's contest history.** On supported profile pages with available contest history, scroll down to drive along the 3D circuit and scroll up to go back. Use **Contest log** for the history table or **Skip to profile** to jump to the regular profile. Smaller screens, reduced-motion preferences, or unavailable WebGL/history use a compact view instead.
- **Turn it off.** Open `chrome://extensions` and switch off **Fastlap for LeetCode**, then refresh LeetCode. The theme is dark-only and has no in-page theme toggle.
- **Uninstall it.** Click **Remove** on its card in `chrome://extensions`, then refresh LeetCode.

## Updating and troubleshooting

To update, download and extract the latest files into the installation folder, or run `git pull` inside your cloned repository. Then open `chrome://extensions`, click the **Reload** icon on Fastlap's card, and refresh your LeetCode tabs. Local unpacked installations need this manual update step.

| Problem | What to do |
| --- | --- |
| Chrome cannot find or load the manifest | Extract the ZIP first, then select the folder that directly contains `manifest.json`. Do not select `src/` or `themes/`. |
| LeetCode still looks unchanged | Make sure the extension is enabled, check that Chrome allows it access to the LeetCode site, and refresh the page. |
| Changes do not appear after an update | Reload the extension in `chrome://extensions`, then refresh LeetCode too. Both steps are needed. |
| Styles look mixed or broken | Try disabling other LeetCode themes or styling extensions, then refresh. LeetCode layout changes may also affect the theme. |
| The 3D profile circuit does not appear | A compact view is expected on screens 760px wide or less, with reduced motion enabled, or when contest history or WebGL is unavailable. |

If a problem persists, [open an issue](https://github.com/krishna-porwal007/FastLap-Leetcode-Theme/issues) with your browser version, the affected page URL, and a screenshot or the error shown on the extension's card.

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
