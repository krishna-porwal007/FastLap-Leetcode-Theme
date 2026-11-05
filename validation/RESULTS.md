# Validation results — 2026-11-04

Tests used an actual desktop Chromium browser with `fastlap-leetcode/` loaded as
an unpacked Manifest V3 extension. Live pages were `leetcode.com/problemset/`,
`leetcode.com/u/lee215/`, and `leetcode.com/problems/two-sum/`. No user account was
signed in and no submission was made. This is not a simulated-DOM-only report.

## Live problemset

| Check | Result |
| --- | --- |
| Native DOM inspected before selectors | Anchor rows and explicit `data-e2e` hooks confirmed; see [audit](DOM-AUDIT.md). |
| Native problem and daily links | Original anchors preserved; feature link reads the real daily row. |
| Topics | 101 native response-backed tag groups, including Array / Hash Table for Two Sum. No additional GraphQL requests. |
| Search | Typed `two sum`; the unchanged native query reached the server. LeetCode returned **Please Register or Sign in**. Authenticated search results remain unverified. |
| Sort | Selected Acceptance; native `AC_RATE / DESCENDING` results rendered, beginning with problem 3263 in this run. |
| Difficulty filter | Selected Easy; non-daily results all had native `EASY` difficulty. |
| Pagination / dynamic loading | Scrolling loaded the next 100 results: 101 → 201 including the pinned daily challenge; native request used `skip: 100`. This UI uses incremental loading, not numbered pages. |
| Hover | Computed inset rail became race red. |
| Mobile | Search and results visible at 390 × 844; no document horizontal overflow; titles, acceptance and difficulty remain readable. |
| Attempted filter enum | Native menu exposed Todo / Attempted / Solved and emitted `ATTEMPTED`. |
| Solved/attempted account states | Not live-verified without a signed-in account. Controlled metadata fixtures separately verified green `SOLVED` and yellow `ATTEMPTED` rails. |

Screenshots: [directory](problemset-final.png), [mobile rows](problemset-mobile-rows.png).
Machine-readable evidence: [interaction report](interaction-report.json),
[status/mobile report](status-mobile-report.json), [search response](search-response.json).

## Live profile

- Original RB22 GLB loaded successfully, with the original +Z nose pointing along
  increasing track distance. Wheel/body shadows and contact were visually inspected.
- Public `lee215` history supplied **27 attended contests**. The saved response
  is [real-history.json](real-history.json); no profile data was fabricated.
- At 25% scroll, distance was **202.797** and the HUD showed round 6 / Weekly
  Contest 44. At 60%, distance was **453.110** and round 16 / Weekly Contest 69.
  Reversing to 25% reproduced the same distance and checkpoint exactly.
- Actual peak: **Weekly Contest 176**, **2,222** displayed rating, **+59** change,
  **P59** placement. The HUD matched that checkpoint and displayed CAREER PEAK.
  A red elevated gantry and projected peak label mark its position on the track.
- End-of-run finish appeared; Skip reached the normal profile with no scroll lock.
  Native statistics, rating chart, activity heatmap and submission sections remained.
- Reduced-motion preference and 390px mobile viewport switched to compact mode.
- Clicking the native Library link performed a **same-document SPA navigation**;
  the drive was removed. No JavaScript page errors were reported in the final runs.
- An idle pause did not change track distance. Rendering is requested by scroll,
  resize, visibility or asset completion, with no independent driving timer.

Screenshots: [start](profile-start-final.png), [driving](profile-drive-final.png),
[peak checkpoint](profile-peak.png), [finish](profile-finish.png),
[native profile after skip](profile-native.png), [reduced motion](profile-reduced.png),
[mobile fallback](profile-mobile.png).

## Geometry, assets and controlled edge cases

- 1,001 sampled poses checked monotonic forward distance, reproducible positions,
  orthonormal right/up/forward bases and a shared ground plane.
- Each contest's arc distance lands within 0.001 world units of its actual curve
  knot. One- and two-contest histories produce finite valid tracks.
- Original car model vertex bounds were measured in a real browser: its lowest
  tyre vertex is at ground level after normalization. See [car audit](car-audit.json).
- Original model and all five reused textures are byte-identical copies. The
  engine bundle only changes exports; original license/credit files are retained.
- **Mocked edge cases**, explicitly separate from live history: empty history
  produced “No attended contest history yet”; HTTP 503 produced “Contest history
  unavailable.” Both used compact fallback and preserved the native profile.

## Existing problem experience

Protected source/CSS hashes match the initial snapshot: content route markers,
Monaco palette/fallback, examples, contest-history loader, problem CSS and core
styles are unchanged. Live Two Sum loaded Monaco and retained Run and Submit.
Dragging the native FlexLayout splitter moved it from x=716 to x=771. Neither the
drive nor directory UI appeared on the problem page. See [screenshot](problem-preserved.png)
and [final report](final-report.json). Run execution and Submit were not exercised.

## Remaining verification limits

Authenticated search/results and real personal solved/attempted states need a
signed-in browser. `leetcode.cn`, legacy table variants, other GPUs and screen
readers were not tested. Mobile was a real browser viewport test, not physical
phone testing. The graceful WebGL failure handler exists but context loss was
not forced during this run. Unknown page variants retain native behavior.
