# Fastlap audit and implementation notes

Inspected the original `codeforce-theme/0.2.1_0/src/fastlap/drive.js`,
`themes/fastlap-drive.css`, `themes/fastlap-side.css`, `themes/fastlap-tower.css`,
`themes/fastlap-paddock.css`, model metadata, texture credits and car builder.
The source project was read only.

The original drive bundles Three.js r170 and constructs a centripetal Catmull-Rom
ribbon circuit from contest history. It uses a .72-scale, +Z-forward car, PBR
asphalt/grass, a night HDR, kerbs, barriers, milestone gantries, a peak landmark,
contact shadows and a sticky scroll runway. Its original camera/car smoothing,
body bob, and overview time orbit are not suitable for strict scroll posing.
The old LeetCode port instead locked body overflow and played a 5.2-second CSS
animation of an SVG over a flat road, with timer-selected contest signs.

The new scene reuses the original renderer bundle, model loader, detailed
procedural fallback, RB22 GLB and textures. It adapts the ribbon construction
into readable modules. A single arc distance determines the car's +Z orientation,
chase camera, projected labels, finish and latest crossed contest. Checkpoint
knots are converted to arc distance; they are not uniformly spaced curve
parameters. There is no time-based movement, pose smoothing or body bob.
The circuit is planar to keep all four tyres on the shared road plane. Actual
rating changes determine bends, the centre rail's colors, the rating chart and
500-point milestone gates; these markers do not assert LeetCode rank titles.
The first recorded rating has no invented delta. All attended contests remain
available in the accessible contest log. Missing history produces no circuit.

## Live LeetCode DOM, 2026-11-04

Audited in installed Chromium against `https://leetcode.com/problemset/` before
writing the new selectors. Current results are **anchors, not table rows**:

- `a[data-e2e-locator="question-list-row"]`: native result and navigation.
- `data-e2e-slug`: problem slug; `data-e2e-difficulty`: EASY/MEDIUM/HARD.
- `.ellipsis` inside a row: native frontend index and title.
- Row inner content: title, percentage text, difficulty `p`, native status,
  Premium frequency and favorite controls. All stay in their original nodes.
- `input[placeholder="Search questions"]`: native query input.
- `[data-e2e-locator="filter-sort-button"] button`: native sort menu.
- `[data-e2e-locator="filter-button"] button`: native filter menu.
- `[data-e2e-locator="filter-item"][data-e2e-key]`: native filter groups.
- `[data-e2e-locator="filter-multi-select"]`: native filter choices.
- Native `/tag/…` links and category strip remain interactive.
- The current list loads another 100 results at the bottom, rather than exposing
  numbered pagination. Its existing loading behavior is preserved.

Native GraphQL `problemsetQuestionListV2` and `questionOfTodayV2` responses include
`titleSlug`, `status` and `topicTags`. The current transport is XHR with a **Blob**
response (the page's fetch implementation delegates to XHR). The read-only MAIN
bridge observes only these named same-origin operations and publishes only
slug/status/tags. It never alters requests, response objects, promises or errors,
and makes no extra requests. It does not depend on React private properties.
Unknown DOM/API variants keep their native UI instead of receiving guessed data.

Profile routes use `#__next` under `body`, with normal document scrolling. The
new runway is an independent sibling preceding that root. It neither reparents
nor hides the native statistics, submissions, heatmap, or navigation. The normal
profile becomes visible below the runway; reverse scrolling can reenter it.

Only the existing `src/profile-drive.js`, `themes/profile-drive.css` and
`themes/problem-list.css` were changed, plus the manifest and README. Editor,
Monaco, examples, core/global CSS, content route markers and contest-history
loader were verified unchanged against the initial SHA-256 snapshot.
