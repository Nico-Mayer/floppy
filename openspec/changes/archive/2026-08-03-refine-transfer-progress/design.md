## Context

`TransferProgress.svelte` is the one component both transfer panels render while bytes move,
and it currently paints four things at once: a 4xl percent, a linear `Progress` bar, a mono
detail line assembling `sent / total · rate · eta`, and a mono label carrying the filename.
The rate and the ETA are recomputed from every `ProgressEvent` (the core samples no faster than
`MIN_SAMPLE_INTERVAL`, but that is still several times a second), so the mono line changes
width and content constantly. A JS `Spring` smooths the percentage before it reaches the bar.

The done state of a receive then ends on `TransferComplete` with `mono` set and
`receive.savedTo` — an absolute path — as its description.

Constraints that shape the work:

- `ProgressEvent` is generated IPC (`bps`, `eta` included). This change touches no Rust, so the
  wire stays as-is and no bindings regeneration happens. The rate tracker keeps working; only
  the UI stops reading two of its fields.
- The magic-registry components are vendored into `src/lib/components/magic/` (`border-beam` is
  the precedent) and are then ours to patch, like the vendored shadcn patches already in the
  tree.
- `interaction` requires progress to keep animating under reduced motion, and `layout.css`
  neutralises specific keyframe animations only — it does not blanket-kill transitions, so a
  CSS transition on the gauge survives `prefers-reduced-motion` without extra work.
- The status zone is a flex column inside a container-queried card; whatever replaces the bar
  has to center in it at both compact and roomy widths without a breakpoint of its own.

## Goals / Non-Goals

**Goals:**

- One calm progress surface: gauge, filename, bytes. Nothing else moves.
- Delete the speed and ETA read-outs, and the helpers that formatted them.
- Bound the filename label so no name can deform the layout.
- Get the filesystem path off the completion screen without losing the way to the folder.
- One interpolation mechanism instead of a spring feeding a transitioning component.

**Non-Goals:**

- No change to the transfer core, the rate tracker, `ProgressEvent`, or the notification copy
  that reads the final progress snapshot.
- No change to the phase words in the top bar (`sendHeadline` / `receiveHeadline`), the action
  zone, the error surfaces, or the idle states.
- No new setting for what the progress screen shows. The composition is fixed.
- Not adding a size read-out to the send queue or the offer dialog; those already show sizes
  and are out of scope.

## Decisions

### Vendor the registry block through the CLI, then patch it

`npx shadcn-svelte@latest add https://sv-animations.vercel.app/r/animated-circular-progress-bar.json`
writes `magic/animated-circular-progress-bar/{animated-circular-progress-bar.svelte,index.ts}`
under the `components` alias, i.e. exactly beside `magic/border-beam/`, and substitutes the
`$UTILS$` placeholder with `$lib/utils` on the way in. Copying the file by hand would work too,
but the CLI is what the repo already uses for registry blocks and it resolves the alias for us.

Two patches, both recorded in the file with a comment so a future re-add is re-patchable (the
same convention the vendored shadcn patches follow):

1. **A `children` snippet for the readout.** Upstream prints the bare rounded number
   (`{currentPercent}`), and the design wants `42%` with the sign set smaller than the digits.
   Making the readout a snippet with the bare number as the fallback keeps the component
   general and keeps the percent-sign styling at the call site, where the rest of the panel's
   typography lives.
2. **`duration` prop replacing the hardcoded `--transition-length: 1s`.** One second is far
   longer than the gap between progress samples, so the arc would trail a full second behind
   the truth and would still be filling after the panel had already switched to the completion
   screen. The prop takes seconds and defaults to upstream's 1.

Everything else upstream stays untouched: `gaugePrimaryColor` / `gaugeSecondaryColor` are plain
strings interpolated into `stroke:`, so `var(--tint)` and `var(--muted)` pass straight through
and the accent tinting needs no patch at all.

### Interpolate once, in the gauge, and drop the Spring

The gauge already transitions `stroke-dasharray` on every value change, which is precisely the
"fluctuating rate reads smooth" behaviour the spec asks for. Keeping the `Spring` on top would
mean the displayed arc is a CSS ease chasing a spring chasing the truth — visible lag, and two
knobs that have to be tuned against each other. So `TransferProgress` hands the gauge
`Math.min(100, Math.max(0, progress))` directly and the spring goes.

Consequences worth naming:

- The clamp stays in `TransferProgress` (a CSS transition cannot overshoot, but a bad percent
  from upstream still could read as 103%).
- The "never move backwards" concern disappears with the spring: the displayed value is the
  reported value, so it only moves back if the core reports it moving back.
- Reduced motion keeps the transition on purpose. This is the documented exception in
  `interaction`: the movement is the information.

`duration` is set to `0.35s` — long enough to read as motion between two samples, short enough
that the arc is honest about where the transfer is.

Alternative considered: keep the `Spring` and set the gauge's transition to 0. It works, but it
puts the smoothing in JS on a component built to smooth itself, and it costs a per-frame
re-render of the SVG instead of letting the compositor handle it.

### The status zone becomes gauge → filename → bytes

Three children, in that order, centered in the existing flex column:

- The gauge, `size-40` on a roomy card and `size-32` when the card is compact, via the
  container-query variants the panels already use (`@sm:`). It stays a single element with two
  size classes rather than two components.
- The filename line, as ordinary `truncate text-sm` text. Dropping the mono face is most of
  what makes a long name stop looking like a path; the rest is `fileLabel` below.
- The bytes line: `formatBytes(sent) / formatBytes(total)`, `text-xs tabular-nums
  text-muted-foreground`. It is the one thing that ticks.

Accessibility: the bar came from bits-ui with `role="progressbar"` and its aria values, and the
vendored gauge has neither. Rather than patch that into the registry component, the wrapper in
`TransferProgress` carries `role="progressbar"`, `aria-valuemin/max/now`, and an `aria-label`
built from the label prop. That keeps the announcement in the component that knows the
transfer's semantics.

The indeterminate branch (`progress === null`, used by starting/connecting/cancelling) keeps the
`Spinner` exactly as it is. A gauge stuck at zero reads as a stalled transfer, not a pending one.

### The filename is bounded at the source, not by the layout

`fileLabel` in `format.ts` does two things before a name is ever rendered:

- Drops everything up to the last `/` or `\`. Every name the core sends is already bare (it
  takes `file_name()` on the way in, on both the send and receive side), but the mobile pickers
  reach `display_name` through a URI, and a path-shaped label on the status line is not worth
  trusting the whole chain for. One `slice` is cheaper than that trust.
- Past a fixed character limit, elides the **middle** rather than the end, keeping a short tail.
  The extension survives, and two long names that differ only near the end stay tellable apart.

It is a character cap and not only CSS truncation because the cap holds whatever the container
does: the line cannot be the thing that decides the layout's width. `currentFile` returns the
bounded name, and the Send panel's single-file `summary` goes through the same helper, so the
label shown before any progress has arrived — and the `Sent <name>` completion title — are
bounded by the same rule. The tooltip that used to carry the full name goes with it: it now
repeats what is on screen, and the full name is still in the queue tile.

### Completion drops the path and the `mono` prop with it

`TransferComplete` keeps `title` and `description`; `mono` is removed, which is what stops the
variant coming back. `ReceivePanel` stops passing `savedTo` as the description — for a device
receive the description is already the plain "Got them from <name>" title, and for a code
receive the screen becomes title + check + actions. `savedTo` stays in state because
`OpenPath(receive.savedTo)` is the desktop action and it is the reason the folder is still one
press away.

The phone case is the honest cost: with no path and no open-folder control, a phone user is told
files arrived but not where. Settings still shows the resolved root, and the platform locations
are the OS-visible ones by design (`download-destination`), so this is a discoverability
trade-off taken deliberately, noted below.

## Risks / Trade-offs

- **A phone user cannot see where files landed from the completion screen** → Settings shows the
  resolved save location, and the destination is a user-visible OS folder by design. If this
  turns out to bite, the fix is a plain-language line ("in your Downloads"), not the path.
- **Re-adding the block from the registry silently reverts both patches** → the patches are
  commented as vendored in the file itself, matching how the existing shadcn patches are
  recorded, so a future update has the note in front of it.
- **`cn()` merging the gauge's own `size-40 text-2xl` against our overrides** → the overrides
  are prefix-less utilities against prefix-less defaults, which tailwind-merge resolves; the
  container-query variants (`@sm:size-40`) only ever add, they do not have to beat a variant of
  the same prefix. This is the trap that has already produced sidebar defects, so it is called
  out rather than assumed.
- **0.35s transition on a very short transfer** → a transfer that finishes in under a second
  may switch to the completion screen with the arc part-way. Acceptable: the completion screen
  is itself the "it worked" signal, and lengthening the arc's honesty for a two-second transfer
  is not worth lag on a two-minute one.
- **A middle-elided name hides the middle** → deliberate. The start identifies the file and the
  tail carries the extension; the queue tile still holds the full name.
- **Losing the ETA removes the only "how long" cue** → deliberate, per the product call. The
  gauge's rate of change carries pace, and the figure it replaced was the jitteriest thing on
  the screen.

## Migration Plan

Front-end only, no data or IPC migration. Land in one commit; revert is a revert. Gates:
`npm run check` and prettier/eslint over `src`. Device verification: run a real multi-file
transfer on desktop and on a phone, watching that the bytes line does not reflow, a long
filename is elided rather than overflowing, and the gauge reaches 100 before the completion
screen replaces it.

## Open Questions

None. The product calls (bytes only, no ETA, no path on completion, fixed-length name) are
settled.
