## Why

The Send screen's idle copy is written for a mouse. The empty state says "Drop your files
here" and the queue's add tile says "or drop them", but on Android and iOS there is no
drag-and-drop at all: the webview never fires a drag event, so the app's one advertised
affordance is a lie on the two platforms where a person is most likely to be sending a
holiday photo. Tapping the surface does open the file picker, but nothing on screen says
so, and the picker itself only offers documents - the photo library, which is where phone
files actually live, is not reachable at all.

## What Changes

- The Send idle surfaces stop naming drag-and-drop on phone builds. The empty state and the
  queue's add tile both get phone wording that describes tapping, and keep their existing
  desktop wording everywhere else.
- A floating add button appears on the Send screen on phone builds, anchored bottom-right,
  in both idle shapes: the empty state and the populated queue grid. It clears the anchored
  action zone rather than overlapping the Send button.
- Tapping it opens a bottom sheet with two rows: **Files**, which opens the existing native
  picker, and **Photo library**, which is a stub carrying the preview marker.
- On phone builds, every idle add affordance on the screen routes through that one sheet:
  tapping the empty state and tapping the queue's dashed add tile both open it, instead of
  jumping straight to the document picker. Desktop keeps the direct picker.
- The dashed add tile stays in the grid on phone. The floating button is an additional,
  thumb-reachable entry point that survives scrolling a long queue, not a replacement.
- No change to what the queue accepts, how files are described, or the send flow. Drag-drop
  on desktop is untouched.

## Capabilities

### New Capabilities

None. This is a behaviour change to an existing screen.

### Modified Capabilities

- `transfer-panel-layout`: adds requirements for the Send screen's platform-dependent add
  affordance - phone wording that does not name drag-and-drop, a floating add button with
  its placement rule against the anchored action zone, the two-option sheet it opens, and
  the rule that all idle add entry points on a phone share it.
- `preview-markers`: extends the "planned feature" requirement so a marker can sit on a row
  inside a menu or sheet, not only on a screen or dialog title, since the Photo library stub
  is one row beside a working one.

## Impact

- `src/lib/components/transfer/send/SendQueue.svelte` - empty-state and add-tile copy, the
  add-tile click target.
- `src/lib/components/transfer/send/SendPanel.svelte` - hosts the floating button inside the
  card's status zone.
- New component under `src/lib/components/transfer/send/` for the button and its sheet.
- `src/lib/platform.ts` - no change; the gate is the existing `isPhoneChrome`, which is the
  signal already documented for "hiding an action the OS cannot perform".
- No Rust, IPC, broker, or capability-manifest change. The picker is still
  `@tauri-apps/plugin-dialog` via the existing `send.pickFiles()`; the photo row is inert.
