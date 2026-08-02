## Context

The Send panel's idle screen has two shapes, both in `SendQueue.svelte`: an `Empty.Root`
hero when nothing is queued, and a tile grid when something is. Both are click targets that
call `send.pickFiles()`, which opens `@tauri-apps/plugin-dialog`'s `open()`. Both also
advertise drag-and-drop in their copy: "Drop your files here / or browse" and the add tile's
"Add files / or drop them".

Drag-and-drop itself is wired in `src/routes/+layout.svelte` via
`getCurrentWebview().onDragDropEvent`, hit-testing the drop point against
`[data-file-drop-target]`, which `TransferCard` sets while the send panel is idle. On Android
and iOS that event never fires, so the copy names an affordance that cannot exist there.

Three platform signals already exist in `src/lib/platform.ts` with a written rule for
choosing between them: `isTouch()` for fingers, `isNarrow()` for width, `isPhoneChrome` for
form factor, explicitly including "hiding an action the OS cannot perform".

The panel's structure is fixed by spec: a flexible status zone above and an anchored action
zone at the bottom, with the action row on the idle-with-files state carrying the target
picker on the left and Send on the right. Anything floating in the bottom-right corner has
to reckon with that Send button.

## Goals / Non-Goals

**Goals:**

- Idle Send copy tells the truth on every platform.
- A thumb-reachable way to add files that survives a scrolled queue.
- The photo library appears as a destination the product intends to reach, marked honestly.
- One code path for "add files" on a phone, so the affordances cannot drift apart.

**Non-Goals:**

- Actually reading the photo library. No `tauri-plugin-android-fs` media picker, no
  `PHPickerViewController`, no new Rust command or capability entry. That is a follow-up.
- Touching desktop drag-and-drop, the drop hit-test, or `TransferCard`'s drop-target
  attribute.
- Any change to the Receive panel, which has no add affordance.
- A general-purpose FAB primitive for the app. One screen needs one, so it stays local until
  a second caller exists.

## Decisions

### The gate is `isPhoneChrome`, not `isTouch()` or `isNarrow()`

Whether drag-and-drop exists is a property of the operating system, not of the pointer or the
window. A touchscreen laptop can drop files and must keep the drag copy; a desktop window
dragged under 640px can too. `isPhoneChrome` is the constant `platform.ts` documents for
exactly this case, and being a constant rather than a reactive query it also means the button
cannot appear and disappear as a desktop window is resized.

Alternatives: `isTouch()` would put the sheet on touchscreen laptops, where the direct picker
is better and dropping works. `isNarrow()` would flip the copy on a narrow desktop window,
which is the exact bug `platform.ts`'s header comment was written to prevent.

### The button is anchored to the status zone, not to the card

Spec already pins the action zone to the card's bottom with Send at the trailing edge. A FAB
in the card's bottom-right corner would land on top of it. So the button is
`position: absolute` inside the status zone's own relative container, at its trailing bottom
corner, which puts it above the action row in both idle shapes. The status zone is also the
scroll container for the grid, so the button must sit outside the scrolling element and over
it, not inside it, to stay put while the queue scrolls.

Alternative considered: hiding the button while files are queued and letting the add tile
carry the job alone. Rejected because the tile is the *last* grid item, so on a long queue it
is off-screen precisely when the user wants it.

Alternative considered: moving Send out of the action zone on phone to free the corner.
Rejected: it would break the stable-two-zone requirement and move the primary action between
platforms.

### One sheet component, three callers

A single new component under `src/lib/components/transfer/send/` owns both the floating
button and the sheet, and exports a way for `SendQueue`'s two surfaces to open the same
sheet. Concretely that is one piece of `$state` for `open` plus a shared `addFiles()` entry
point, rather than three components each with their own drawer, so the "all idle add
affordances share one sheet" requirement is structural rather than a convention.

On desktop the component renders nothing and the shared entry point is `send.pickFiles()`
directly, so `SendQueue`'s handlers stay one call in both cases.

### The sheet is a Drawer, not a ResponsiveDialog

`ResponsiveDialog` exists to pick dialog-on-desktop / drawer-on-phone. This surface only ever
renders on a phone, so the choice is already made and the indirection would only hide that.
Using `Drawer` directly also keeps the bottom-sheet shape guaranteed rather than dependent on
a viewport query. It takes the default overlay layer (`--z-panel`); nothing here needs the
`prompt` layer, which is reserved for what the app raises unasked.

The known vaul hazard is closing one drawer to open another. That is not this: the Files row
closes the drawer and then hands off to a *native* picker, which is not a web overlay at all.
The close is awaited before `open()` is called so the two are never stacked.

### The photo row is a real, focusable row carrying `StubMark`

Per `preview-markers`, a preview control stays operable and is not dimmed or disabled. So the
row is an ordinary button that renders `StubMark` beside its label and does nothing on tap.
The marker goes on the row and not on the sheet title, because the Files row beside it works
and a title-level marker would wrongly disclaim it. That is the one sentence added to the
`preview-markers` spec by this change.

### Copy

Phone empty state: "Add files to send" / "Photos or files, your pick". Phone add tile
subtitle: drop the "or drop them" line for "photos or files". Sheet title "Add files", rows
"Files" and "Photo library". No em dashes, no semicolons, lowercase kept where the
surrounding design already keeps it.

## Risks / Trade-offs

- **The absolute-positioned button overlaps the last row of tiles as the queue scrolls under
  it** → give the scroll container bottom padding equal to the button's height plus its
  inset, so the final row can always be scrolled clear.
- **Two ways to add on one screen reads as clutter** → the tile is quiet and dashed, the
  button is the loud one; and the tile is what keeps the grid identical to desktop. Accepted
  deliberately per the chosen option.
- **A stub row invites a tap that does nothing** → `StubMark` already has a hover/focus
  explanation, and the requirement keeps the row operable rather than disabled, which is the
  spec's settled answer for this.
- **`isPhoneChrome` is user-agent sniffing and can be wrong in a preview browser** → it
  already gates the titlebar and the `data-mobile` flag, so this change adds no new exposure.
  The browser preview at :1420 cannot open the picker anyway.
- **Nothing here can be covered by an automated test** — the repo's gates are Rust and Go,
  and this change touches neither. Verification is manual on a device or emulator, which the
  tasks list explicitly.

## Open Questions

- Whether the photo row should later reuse the same queue path (paths in, `Describe`, tiles)
  or need a separate content-URI route on Android. Out of scope here; the stub deliberately
  commits to nothing.
