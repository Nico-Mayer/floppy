## 1. Vendor the gauge

- [x] 1.1 Add the block: `npx shadcn-svelte@latest add https://sv-animations.vercel.app/r/animated-circular-progress-bar.json`, and confirm it landed at `src/lib/components/magic/animated-circular-progress-bar/` (beside `magic/border-beam/`) with `$UTILS$` resolved to `$lib/utils`
- [x] 1.2 Patch 1: make the readout a `children` snippet with the bare rounded percent as its fallback, so the call site owns the percent-sign typography
- [x] 1.3 Patch 2: replace the hardcoded `--transition-length: 1s` with a `duration` prop in seconds (default 1), interpolated into the same custom property
- [x] 1.4 Comment both patches in the file as vendored deviations, following the convention the existing vendored shadcn patches use

## 2. Rebuild the progress display

- [x] 2.1 In `TransferProgress.svelte`, drop the `Spring` and the `Progress` bar; pass `Math.min(100, Math.max(0, progress))` straight to the gauge with `duration={0.35}`, `gaugePrimaryColor="var(--tint)"`, `gaugeSecondaryColor="var(--muted)"`
- [x] 2.2 Render the percent inside the gauge as digits plus a smaller `%`, replacing the old 4xl percent line
- [x] 2.3 Size the gauge from the card's container query (compact by default, roomy at `@sm:`), centered in the status zone, with no platform branch
- [x] 2.4 Replace the mono detail line with one quiet bytes line: `formatBytes(sent) / formatBytes(total)` in `tabular-nums text-muted-foreground`, and render nothing when there are no stats yet
- [x] 2.5 Re-render the filename label as ordinary truncating text, dropping the mono face
- [x] 2.6 Put `role="progressbar"` with `aria-valuemin/max/now` and a label-derived `aria-label` on the wrapper
- [x] 2.7 Leave the indeterminate branch (`progress === null`) on the shared `Spinner`, unchanged

## 3. Delete the rate and the estimate

- [x] 3.1 Remove `formatRate` and `formatDuration` from `src/lib/components/transfer/format.ts`
- [x] 3.2 Grep `src/` for `bps`, `eta`, `formatRate`, `formatDuration` and confirm nothing in the frontend reads them any more (the fields stay on the wire)

## 4. Clean up the completion screen

- [x] 4.1 Remove the `mono` prop and its branch from `TransferComplete.svelte`
- [x] 4.2 Stop passing `receive.savedTo` as the completion description in `ReceivePanel.svelte`, keeping it for `OpenPath` and keeping the desktop-only open-folder button
- [x] 4.3 Re-read the completion copy for both panels against the UI voice rules (no path, no em dash, lowercase status words)

## 5. Verify

- [x] 5.1 `npm run check` clean, and prettier/eslint clean over the changed files
- [x] 5.2 Desktop: run a multi-file transfer both ways and watch that the gauge fills smoothly, the bytes line does not reflow as it counts, and a long filename truncates on one line
- [x] 5.3 Desktop: confirm the receive completion screen shows no path and Open folder still reveals the transfer's own folder
- [x] 5.4 Phone build: same transfer, checking the gauge fits the full-bleed card and the completion screen reads sensibly without a path
- [x] 5.5 With reduced motion enabled, confirm the gauge still animates between values

## 6. Bound the filename label

- [x] 6.1 Add `fileLabel` to `format.ts`: drop everything up to the last `/` or `\`, then elide the middle past a fixed character limit, keeping the tail so the extension stays readable
- [x] 6.2 Route `currentFile` and the Send panel's single-file `summary` through it, so the pre-progress fallback and the completion title are bounded too
- [x] 6.3 Drop the now-redundant tooltip on the progress label, keeping `truncate` as the CSS backstop
