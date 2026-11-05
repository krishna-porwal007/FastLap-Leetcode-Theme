# Original Fastlap engine

`fastlap-engine.mjs` is copied from `codeforce-theme/0.2.1_0/src/fastlap/drive.js`.
It contains the original bundled Three.js r170 renderer, loaders, PBR shaders,
environment generator, detailed procedural F1 fallback and model loader.

The sole executable change to that bundle is its export statement: expose
`THREE`, `buildCar`, `loadOriginalCar`, `RoomEnvironment`, and `RGBELoader`.
The original Codeforces mount function is not exported or called. Its original
Codeforces rank bands are not used for LeetCode. The bundled MIT notice is kept.

The LeetCode-specific, readable scene lives in `../profile-scene.mjs`; the
arc-distance geometry and coordinate convention live in `../drive-geometry.mjs`.
No remote script, build step, npm dependency or CDN is needed by the extension.

The RB22 GLB and asphalt/grass/night-sky assets are byte-identical copies of the
original Fastlap assets. See `../../assets/models/CREDIT.txt` and
`../../assets/CREDITS.txt`. The model's original +Z nose axis, .72 scale and
material assignments are preserved; its tyre contact plane is measured from
vertices, and shadow casting is enabled for the wheels as well as the body.
