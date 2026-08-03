## Why

The live transfer screen is the app's most-watched surface and currently its noisiest: a
linear bar under a big percent, with a mono line underneath that restates the same fact three
more ways (`128 MB / 2.1 GB · 12 MB/s · 2m left`). The rate and the estimate re-render on
every progress sample, so the text jitters and changes width while the user watches, and two
of the three figures are engineer-facing detail nobody acts on. The completion screen then
ends the flow on an absolute filesystem path in mono, which is the least readable thing on
either transfer screen.

## What Changes

- Replace the linear bar + percent stack with one **animated circular progress gauge** (the
  `animated-circular-progress-bar` block from the sv-animations magic registry, vendored
  alongside the existing `border-beam`), tinted with the screen's accent so Send and Receive
  keep their identity.
- **Cut the byte rate and the time estimate from the UI.** `formatRate` and `formatDuration`
  are deleted; `ProgressEvent.bps` / `.eta` stay on the wire (the core keeps measuring; the
  notification path and future surfaces may want them) but nothing renders them.
- Keep exactly one quiet figure under the gauge: `sent / total` bytes, in tabular numerals at
  a fixed width so the line stops reflowing as it counts up.
- Keep the "what is moving" line (`photo.jpg · 2 of 5`) but render it as ordinary truncating
  text rather than a mono technical read-out, and reduce the name before showing it: only the
  part after the last path separator, cut to a fixed character limit with the middle elided,
  so a long name cannot deform the layout whatever a platform's picker hands over.
- **Completion shows no filesystem path.** The done screen is the title, the check, and its
  actions; `TransferComplete`'s `mono` variant is removed. Desktop still has Open folder, and
  the resolved save location is still readable in Settings (`download-destination`).
- Progress interpolation moves from the JS spring in `TransferProgress` to the gauge's own CSS
  transition — one mechanism instead of a spring feeding a transitioning component, and it
  keeps animating under reduced motion, which the movement-is-the-information rule requires.

## Capabilities

### New Capabilities

None. This reshapes an existing surface.

### Modified Capabilities

- `transfer-panel-layout`: adds a requirement fixing the composition of the live progress
  display (a circular gauge carries the percent; the surface shows at most one moving figure;
  no rate, no estimate; the filename is reduced to a bounded label) and states that the accent
  tints the gauge.
- `interaction`: the progress-motion requirement is rewritten for a gauge rather than a bar,
  and names the CSS transition as the interpolation, still clamped at 100 and still animating
  under reduced motion.
- `feedback`: the shared completion component SHALL NOT render a filesystem path, and drops
  its mono variant; where files landed is answered by the open-folder action and Settings.

## Impact

- `src/lib/components/transfer/TransferProgress.svelte` — rewritten around the gauge; the
  `Spring` import and the three-part detail line go.
- `src/lib/components/transfer/format.ts` — `formatRate` and `formatDuration` deleted, and a
  `fileLabel` helper added that bounds a filename; `formatBytes` and `currentFile` stay (both
  have other callers).
- `src/lib/components/transfer/send/SendPanel.svelte` — the single-file `summary` goes through
  `fileLabel`, so the pre-progress fallback and the completion title are bounded too.
- `src/lib/components/feedback/TransferComplete.svelte` — `mono` prop removed.
- `src/lib/components/transfer/receive/ReceivePanel.svelte` — stops passing `savedTo` as the
  completion description (still passes it to `OpenPath`).
- New vendored block: `src/lib/components/magic/animated-circular-progress-bar/` (added via
  the shadcn-svelte CLI against the sv-animations registry, then patched for a snippet readout
  and a motion-aware transition length).
- No Rust, IPC, or broker change: `ProgressEvent` is untouched, so no bindings regeneration.
