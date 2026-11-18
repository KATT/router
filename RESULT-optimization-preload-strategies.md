# RESULT: lean preload strategies, per-mode lazy string modes, compiled preload strings

BEFORE is `main` at `0b6d4f3`. AFTER is this branch (PR #14, at `4cd531b` plus docs and this file). All sizes are gzip bytes unless a cell says kB. Deltas are AFTER minus BEFORE.

## Bundle-size benchmark (all scenarios)

`pnpm --silent benchmark:bundle-size:run` without `--scenario`. AFTER is `--name pr14-final` in this worktree. BEFORE is `--name main-baseline`, measured fresh with the same command in a separate export of `0b6d4f3` (no earlier full main baseline existed). "gzip" is all emitted JS, "initial" the entry chunk and its static imports.

| Scenario                           | main gzip | #14 gzip | Δ gzip | main initial | #14 initial | Δ initial |
| ---------------------------------- | --------: | -------: | -----: | -----------: | ----------: | --------: |
| `react-router.minimal`             |     86046 |    86747 |   +701 |        85908 |       85901 |        -7 |
| `react-router.full`                |     89677 |    90401 |   +724 |        89539 |       89558 |       +19 |
| `solid-router.minimal`             |     34131 |    34129 |     -2 |        34004 |       34003 |        -1 |
| `solid-router.full`                |     39172 |    39161 |    -11 |        39044 |       39035 |        -9 |
| `vue-router.minimal`               |     50603 |    50562 |    -41 |        50476 |       50434 |       -42 |
| `vue-router.full`                  |     56325 |    56257 |    -68 |        56198 |       56131 |       -67 |
| `react-start.minimal`              |     99109 |    99825 |   +716 |        98969 |       98983 |       +14 |
| `react-start.query-integration`    |    106707 |   107549 |   +842 |       106567 |      106703 |      +136 |
| `react-start.deferred-hydration`   |     99834 |   100570 |   +736 |        98971 |       99004 |       +33 |
| `react-start.full`                 |    102248 |   102976 |   +728 |       102108 |      102137 |       +29 |
| `react-start.rsbuild.minimal`      |     98996 |    99909 |   +913 |        98835 |       98944 |      +109 |
| `react-start.rsbuild.minimal-iife` |     99397 |   100309 |   +912 |        99237 |       99350 |      +113 |
| `react-start.rsbuild.full`         |    102363 |   103264 |   +901 |       102202 |      102299 |       +97 |
| `solid-start.minimal`              |     47268 |    47241 |    -27 |        47141 |       47113 |       -28 |
| `solid-start.deferred-hydration`   |     50387 |    50349 |    -38 |        47202 |       47168 |       -34 |
| `solid-start.full`                 |     52405 |    52396 |     -9 |        52278 |       52268 |       -10 |
| `vue-start.minimal`                |     66954 |    66914 |    -40 |        66825 |       66785 |       -40 |
| `vue-start.full`                   |     70768 |    70750 |    -18 |        70643 |       70622 |       -21 |

- React (router and Start, Vite and Rsbuild): total +0.70 to +0.91 kB. That's the three per-mode chunks (`intent`, `viewport`, `render`), which are always emitted but only downloaded when a string the plugin can't see reaches a Link. None of these scenarios use a preload string.
- React initial: −0.01 to +0.14 kB. The Link drops `main`'s inline string code and gains the small per-mode loader. Rsbuild Start scenarios pay the most (+0.10 to +0.11 kB).
- Solid and Vue: raw bytes are unchanged (0 to +4 B); the small gzip moves come from chunk hashes in file names. Their Links only gain a development warning, which production builds drop.

## Loaded JS per app

Temporary copies of `react-router-minimal` with one root `<Link>`, built with the bundle-size runner's Vite options (`measure.mjs` with `NORMALIZE=1`, which replaces chunk hashes in file contents so gzip doesn't move with them). "initial" = entry chunk and its static imports. "loaded" = initial plus the string chunks the app's Links load at run time, and their imports. "total" = all emitted JS. The route chunk for `/` (132 B, the same everywhere) is in total only. Plugin on = `experimental: { compilePreloadStrings: true }` (app h: `{ viewport: { rootMargin: '200px' } }`). Cells: initial / loaded / total, then the delta vs main.

| App                                                              | main initial / loaded / total | plugin off initial / loaded / total       | plugin on initial / loaded / total         |
| ---------------------------------------------------------------- | ----------------------------- | ----------------------------------------- | ------------------------------------------ |
| (a) Link, no preload                                             | 85917 / 85917 / 86049         | 85879 / 85879 / 86699 (-38 / -38 / +650)  | 85879 / 85879 / 86699 (-38 / -38 / +650)   |
| (b) `defaultPreload: 'intent'`                                   | 85925 / 85925 / 86057         | 85887 / 86202 / 86707 (-38 / +277 / +650) | 86192 / 86192 / 86780 (+267 / +267 / +723) |
| (e) `'viewport'`                                                 | 85925 / 85925 / 86057         | 85887 / 86165 / 86707 (-38 / +240 / +650) | 86168 / 86168 / 86794 (+243 / +243 / +737) |
| (f) `'render'`                                                   | 85925 / 85925 / 86057         | 85887 / 85982 / 86707 (-38 / +57 / +650)  | 85945 / 85945 / 86732 (+20 / +20 / +675)   |
| (c) `batchedViewportPreload()`                                   | n/a (no batching on main)     | 86371 / 86371 / 87191                     | 86371 / 86371 / 87191                      |
| (g) `'intent'` + one `<Link preload="viewport">`                 | 85941 / 85941 / 86073         | 85893 / 86486 / 86713 (-48 / +545 / +640) | 86297 / 86297 / 86690 (+356 / +356 / +617) |
| (d) `preload={variable}`                                         | 85939 / 85939 / 86071         | 85896 / 86211 / 86716 (-43 / +272 / +645) | 85896 / 86211 / 86716 (-43 / +272 / +645)  |
| (h) `'viewport'`, plugin `{ viewport: { rootMargin: '200px' } }` | 85925 / 85925 / 86057         | 85887 / 86165 / 86707 (-38 / +240 / +650) | 86176 / 86176 / 86802 (+251 / +251 / +745) |

The same as kB deltas vs main, loaded first:

| App                                    | Loaded, plugin off | Loaded, plugin on | Initial, plugin off | Initial, plugin on | Total, off / on  |
| -------------------------------------- | ------------------ | ----------------- | ------------------- | ------------------ | ---------------- |
| (a) no preload                         | −0.04 kB           | −0.04 kB          | −0.04 kB            | −0.04 kB           | +0.65 / +0.65 kB |
| (b) `'intent'`                         | +0.28 kB           | +0.27 kB          | −0.04 kB            | +0.27 kB           | +0.65 / +0.72 kB |
| (e) `'viewport'`                       | +0.24 kB           | +0.24 kB          | −0.04 kB            | +0.24 kB           | +0.65 / +0.74 kB |
| (f) `'render'`                         | +0.06 kB           | +0.02 kB          | −0.04 kB            | +0.02 kB           | +0.65 / +0.68 kB |
| (c) `batchedViewportPreload()`         | n/a (86.37 kB)     | n/a (86.37 kB)    | n/a                 | n/a                | n/a              |
| (g) `'intent'` + one `'viewport'` Link | +0.55 kB           | +0.36 kB          | −0.05 kB            | +0.36 kB           | +0.64 / +0.62 kB |
| (d) `preload={variable}`               | +0.27 kB           | +0.27 kB          | −0.04 kB            | −0.04 kB           | +0.65 / +0.65 kB |
| (h) `'viewport'` + plugin options      | +0.24 kB           | +0.25 kB          | −0.04 kB            | +0.25 kB           | +0.65 / +0.74 kB |

- (c): `main` has no batching. Against `main`'s `'viewport'` app it's +0.45 kB loaded.
- Plugin off, a string's chunk is a second request after the page loads. Plugin on, the strategy is in the initial chunk instead, for about the same loaded bytes, and the string chunk it replaces shrinks to an 83 B re-export.
- (d): the plugin can't see a variable, so it changes nothing.
- (h): compiling `rootMargin: '200px'` in costs +8 B over plain `true`.

Chunks per app (gzip bytes; `*` = initial, `+` = loaded on demand by the app's strings, unmarked = emitted but not loaded):

- (a) Link, no preload
  - main: `index-D-t1lP3h.js:85917*`, `routes-BpS4XmJE.js:132`
  - off: `index-D32aYoJO.js:85879*`, `intent-CeSJ8HaT.js:315`, `render-CZ4eXO5Q.js:95`, `routes-Dps9OFny.js:132`, `viewport-Bqy0ab9g.js:278`
  - on: `index-D32aYoJO.js:85879*`, `intent-CeSJ8HaT.js:315`, `render-CZ4eXO5Q.js:95`, `routes-Dps9OFny.js:132`, `viewport-Bqy0ab9g.js:278`
- (b) `defaultPreload: 'intent'`
  - main: `index-2WyRSsmm.js:85925*`, `routes-Dqm31ImM.js:132`
  - off: `index-D68wgLn9.js:85887*`, `intent-DT-0Y6uR.js:315+`, `render-CZ4eXO5Q.js:95`, `routes-JeCOUn9e.js:132`, `viewport-bB7_RrFL.js:278`
  - on: `index-C0IM1GtB.js:86192*`, `intent-CEU0pTUu.js:83`, `render-CZ4eXO5Q.js:95`, `routes-BrWoODPU.js:132`, `viewport-iKVAG2YM.js:278`
- (e) `'viewport'`
  - main: `index-YTwjq9OA.js:85925*`, `routes-DfTn_2SB.js:132`
  - off: `index-Bl1uUL9s.js:85887*`, `intent-Bb2b170z.js:315`, `render-CZ4eXO5Q.js:95`, `routes-BZkPFDXB.js:132`, `viewport-DPHH26gZ.js:278+`
  - on: `index-DWPmELzL.js:86168*`, `intent-SPN05PCK.js:316`, `render-CZ4eXO5Q.js:95`, `routes-DI16dzkl.js:132`, `viewport-DUNaan4A.js:83`
- (f) `'render'`
  - main: `index-D9syfcdo.js:85925*`, `routes-CfvER5A7.js:132`
  - off: `index-CSCeECHT.js:85887*`, `intent-T4cfcATo.js:315`, `render-CZ4eXO5Q.js:95+`, `routes-BAy4Iylo.js:132`, `viewport-BW5pdZ7B.js:278`
  - on: `index-D9T2Gjya.js:85945*`, `intent-BEK4WqsI.js:316`, `render-TgnMnGVJ.js:61`, `routes-DNO7jElw.js:132`, `viewport-CHEtVtFF.js:278`
- (c) `batchedViewportPreload()`
  - main: n/a
  - off: `index-BVn8u0uQ.js:86371*`, `intent-hl-MOshf.js:315`, `render-CZ4eXO5Q.js:95`, `routes-DdYAsnZJ.js:132`, `viewport-CXbzMKv8.js:278`
  - on: `index-BVn8u0uQ.js:86371*`, `intent-hl-MOshf.js:315`, `render-CZ4eXO5Q.js:95`, `routes-DdYAsnZJ.js:132`, `viewport-CXbzMKv8.js:278`
- (g) `'intent'` + one `<Link preload="viewport">`
  - main: `index-CzoGh9mt.js:85941*`, `routes-Ligw1P0L.js:132`
  - off: `index-DPalP16p.js:85893*`, `intent-DsSbwIje.js:315+`, `render-CZ4eXO5Q.js:95`, `routes-CLusE4dp.js:132`, `viewport-BIwaCdV_.js:278+`
  - on: `index-CQGmkXwL.js:86297*`, `intent-Bcemc8f4.js:83`, `render-CZ4eXO5Q.js:95`, `routes-Dw-Z1ZnB.js:132`, `viewport-P1h6ltD7.js:83`
- (d) `preload={variable}`
  - main: `index-DjR7Z2bW.js:85939*`, `routes-DUiTghgs.js:132`
  - off: `index-DuKDZLG6.js:85896*`, `intent-CoyPT4OM.js:315+`, `render-CZ4eXO5Q.js:95`, `routes-BkkHqdBJ.js:132`, `viewport-ChQ8-xFd.js:278`
  - on: `index-DuKDZLG6.js:85896*`, `intent-CoyPT4OM.js:315+`, `render-CZ4eXO5Q.js:95`, `routes-BkkHqdBJ.js:132`, `viewport-ChQ8-xFd.js:278`
- (h) `'viewport'`, plugin `{ viewport: { rootMargin: '200px' } }`
  - main: `index-YTwjq9OA.js:85925*`, `routes-DfTn_2SB.js:132`
  - off: `index-Bl1uUL9s.js:85887*`, `intent-Bb2b170z.js:315`, `render-CZ4eXO5Q.js:95`, `routes-BZkPFDXB.js:132`, `viewport-DPHH26gZ.js:278+`
  - on: `index-6-BRMJu9.js:86176*`, `intent-Brg4XX8I.js:316`, `render-CZ4eXO5Q.js:95`, `routes-6ca1X0UA.js:132`, `viewport-BHXUZq_p.js:83`

## Performance

### `packages/react-router/tests/link.bench.tsx`

As committed, this bench never unmounts what it renders, so it runs out of heap on this machine on `main` too (2 GB and 8 GB heaps, even one case at a time). Both sides ran a scratch copy that adds `.unmount()` after each `render(...)` (not committed), with `--max-old-space-size=6144`. hz, higher is better; ± is rme, then samples.

| Case                                 | main               | #14                |
| ------------------------------------ | ------------------ | ------------------ |
| small router: hardcoded href         | 119.3 ±11.83% (97) | 118.8 ±13.98% (92) |
| small router: interpolate path       | 111.6 ±9.14% (98)  | 104.0 ±9.40% (89)  |
| small router: build location         | 81.3 ±11.09% (68)  | 100.1 ±8.98% (85)  |
| small router: link to absolute path  | 92.7 ±10.26% (78)  | 94.0 ±9.61% (79)   |
| small router: link to relative path  | 82.0 ±38.95% (64)  | 69.8 ±56.66% (64)  |
| small router: link to current path   | 110.8 ±11.48% (88) | 90.1 ±11.56% (73)  |
| medium router: hardcoded href        | 62.6 ±9.18% (64)   | 56.6 ±8.29% (64)   |
| medium router: interpolate path      | 55.9 ±7.65% (64)   | 48.7 ±9.93% (64)   |
| medium router: build location        | 40.7 ±7.00% (64)   | 43.4 ±8.31% (64)   |
| medium router: link to absolute path | 36.9 ±49.72% (64)  | 40.7 ±56.50% (64)  |
| medium router: link to relative path | 31.6 ±5.97% (64)   | 34.0 ±7.76% (64)   |
| medium router: link to current path  | 36.0 ±55.05% (64)  | 32.2 ±53.21% (64)  |

- Sample quality is poor: rme ±6% to ±57%, 64 to 98 samples, and p999 outliers up to 1 s (GC). The gaps between the two sides (−19% to +23%, in both directions) are inside the rme, and `hardcoded href`, which renders no Link at all, also moves by up to 10%. Read it as "no clear difference"; a real Link regression would need a narrower bench.

### `packages/router-plugin/tests/preload-strings.bench.ts` (AFTER only, the bench is new)

| Case                                         |     hz | mean (ms) | p99 (ms) |    rme | samples |
| -------------------------------------------- | -----: | --------: | -------: | -----: | ------: |
| code filter: large module without candidates | 17,969 |     0.056 |    0.090 | ±0.20% |  17,758 |
| transform: candidate without a router import | 19,188 |     0.055 |    0.105 | ±1.45% |  18,154 |
| transform: typical route file                |  1,892 |      0.73 |     5.96 | ±7.75% |   1,369 |

- A module the filter rejects (no `preload` string near a router import) costs about 0.06 ms for a 5,000-function file. A typical route file that it rewrites costs about 0.7 ms; its rme (±7.75%, ±11% in a first run) comes from GC outliers in the parse.

### `benchmarks/client-nav` `preload` scenario (React, jsdom, `defaultPreload: 'intent'`)

`build:client`, then `vitest bench --mode benchmark` in `scenarios/preload/react`, three runs each, alternating. No browser is needed. hz, higher is better.

| Run | main                | #14                 |
| --- | ------------------- | ------------------- |
| 1   | 182.3 ±1.36% (1705) | 171.6 ±1.39% (1609) |
| 2   | 184.7 ±1.75% (1732) | 178.8 ±1.85% (1629) |
| 3   | 149.7 ±1.85% (1372) | 161.2 ±2.16% (1443) |

- Means: main 172.2 hz, #14 170.5 hz (−1%). Within a run rme is ±1.4% to ±2.2% (1,372 to 1,732 samples), but the machine drifts more than that between runs (149.7 to 184.7 hz on main), and the pairwise gap flips sign (−5.9%, −3.2%, +7.7%). No measurable difference.
- The scenario's assertions pass with `throws: true`, so the lazily loaded `'intent'` strategy does preload on hover in this harness.

## Validation

- `nx run-many -p router-core react-router router-plugin start-plugin-core solid-router vue-router -t test:eslint test:types test:unit --parallel=1`: 32/32 pass.
- `test:build` (publint + attw) for router-core, react-router and router-plugin: pass, after a fix. The webpack entry's declarations referred to `PreloadStringsOptions` as `import('.')`, which node16 ESM can't resolve; the webpack and esbuild entries now export the type like the Vite and Rspack ones.
- start-plugin-core `test:integration` for `tests/integration/start-router-wiring.test.ts`: 11/11 pass.
