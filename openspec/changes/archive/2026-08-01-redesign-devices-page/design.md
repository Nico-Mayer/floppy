## Context

`src/routes/devices/+page.svelte` is ~370 lines holding four sections separated by `<Separator />`:
this device, "Add a device" (a permanently inflated QR card behind `RevealVeil`, plus a copy button),
"Enter a code" (`CodeInput` + Connect), and "Your devices". Everything is gated behind
`pairing.available`, so a device with no pairing service shows one empty state and nothing else.

Facts the design has to work with:

- `PairingService::show_pair_code` (`src-tauri/src/pairing/service.rs:184`) spawns a session bounded by
  `PAIR_TIMEOUT = 120s` and returns the phrase only. The frontend has no way to know that bound.
- The page auto-calls `showCode()` from an `$effect` guarded by a plain `autoTried` flag, so every
  first render of the page opens a broker mailbox session.
- `pairing.request` (`PairingRequest`) is the signal that someone redeemed the code this device is
  showing; `pairing:paired` fires when a pairing completes on either side and routes to `/devices`.
- `SendPanel.svelte:27` holds `let picked = $state('code')` — component-local, so it dies on
  navigation and cannot be set from anywhere else. `app.send.target` is a different thing: the
  snapshot the in-flight transfer belongs to, written by `beginTrusted`/`reset`.
- `SwipeRow` wraps its children in a div carrying `horizontalSwipe`. The engine uses passive listeners
  and never suppresses the `click` that follows a drag, which has not mattered because row children
  have never been clickable.
- `DeviceInfo` is `{ fingerprint, name }`. There is no platform, no paired-on date, no camera code
  anywhere in the repo.
- The repo has honesty rails for unbuilt surfaces (`preview-markers`, the `StubMark` badge, the `stub`
  flag in `nav-items.ts`) if the scan step ever needs marking before the app has users.
- There is no frontend test runner. Gates are `cargo test`, `npm run check`, `npm run lint`.

## Goals / Non-Goals

**Goals:**

- Devices page reads as a management screen: this device, your devices, one way to add.
- Pairing surfaces are a task you open, and cost nothing until you open them.
- A shown code never lies about being alive.
- A device row is where a send to that device starts.
- Rename/remove/self-name keep working when pairing is down.
- Scanning has its slot in the flow now, so wiring the camera later is a swap rather than a re-layout.

**Non-Goals:**

- A working scanner: the camera plugin, its permissions, and on-device verification.
- New device metadata (paired-on, platform glyph, last-seen) — trust store and pairing payload changes.
- Reworking `IncomingPairDialog` or the incoming-offer prompt.
- Changing the pairing protocol, the broker, or the trust-store file format.

## Decisions

### 1. The two halves of a pairing split by what they need, not into one surface

This device's code lives on the page, under this device's name; taking the other device's code is a
`ResponsiveDialog` the list opens. Both are reachable without a decision, which is the symmetry the spec
asks for — what differs is that one half is a thing to look at and the other needs a keyboard, and only
the second is worth a surface of its own.

The first cut of this change put both halves in the dialog. That dialog was too full (QR, code, clock,
copy, replace, scan, field, connect) while the page it opened from was thin, which is the wrong balance:
the page is where you land and the dialog is where you work.

A route (`/devices/add`) stays rejected: the shell has no in-app history back (`app-shell`), so a nested
route is a dead end on mobile.

Alternative rejected: a `Tabs` pair on the page ("Show a code" / "Enter a code"). A tab you are not on is
a mode you are not in, which is exactly the role choice the spec forbids.

### 1b. One code on load, and a card that never resizes

The page asks for a code as it mounts. That is one live broker session per visit and it is worth it: the
first look at your own code should not be a wait, and the alternative (mint on uncover) put a spinner
behind the first tap every time.

The retry guard is a plain `let tried = false`, not `$state`. A failed `showCode()` leaves `code` null and
flips `making` back to false, and an effect that reads `making` would therefore re-run and try again,
forever. This is the same reason the old page carried an `autoTried` flag.

Nothing about the card is content-sized:

- the slot is a fixed `h-64` across all three states (waiting, live, spent),
- `newCode()` does not clear `code` first, so a replacement swaps in place instead of blanking the code
  line and dropping the actions row,
- the actions row is always rendered — copy plus a small replace while a code is live, the replace alone
  once it is spent — because every version of it appearing and disappearing moved the list below it.

The spent state is a line in the card and nothing else; what to do about it is the row that was already
there.

### 2. The code's life is data from Rust, not a constant in TS

`show_pair_code` returns a struct instead of a `String`:

```rust
#[derive(Serialize, Type)]
pub struct PairCode {
    pub code: String,
    /// How long this code works, in seconds. Same bound the session is timed out with.
    pub seconds: u32,
}
```

`PAIR_TIMEOUT` stays the only definition; the service reads `PAIR_TIMEOUT.as_secs()` into the return.
This is a breaking change to one generated binding (`showPairCode(): Promise<PairCode>`), regenerated
by `cargo test export_bindings`.

Alternative rejected: hard-code `120` in the frontend. It is a duplicated constant that silently
desyncs, and the countdown would keep running on a code the core already dropped.

Alternative rejected: a new `PairingCodeExpired` event. More wire surface for the same information, and
the frontend still needs the total to render a countdown. The two things that end a code early are both
already observable: `pairing.request` (someone redeemed it) and `pairing:paired` (it completed).

### 3. Code state in the add flow is one derived state, not three booleans

The dialog holds `code: PairCode | null` and `elapsed` (whole seconds, ticked by a 1s interval that runs
while the dialog is open and holds a code), and derives `remaining` from the two.
`spent` is `remaining <= 0 || usedByPeer`, where `usedByPeer` is set by an `$effect` watching
`pairing.request` while the dialog holds a code. Spent removes the code rather than dimming it: a
blurred QR is still one someone can lift the veil off and scan. The slot holds one line and one
"Show a new code" control instead.

Wording (spec forbids "expired"/"timeout"): run-out → "That code has run out."; used → "That code has
been used." Both followed by the single control.

### 4. The send target selection moves into `app.send`

Add to the send state:

```ts
/** What the picker points at: 'code' or a device fingerprint. Outlives a transfer. */
picked = $state('code')
/** Choose a device as the next send target. Chooses who, never starts anything. */
choose(fingerprint: string) { this.picked = fingerprint }
```

`SendPanel` drops its local `picked` and keeps the existing `selection` derivation (fall back to
`'code'` when the fingerprint is no longer trusted) reading from `app.send.picked`. Devices rows call
`app.send.choose(fp)` then `goto(resolve('/send'))`.

The fallback stays derived rather than corrected in an `$effect`, for the reason already written at
`SendPanel.svelte:31`: a corrected value has a frame where it names a device that is gone.

Alternative rejected: pass the target through a query param (`/send?to=<fp>`). The route is a static
SPA page, the fingerprint would sit in a URL the user can see and share, and `SendPanel` would need to
read-and-clear it, which is state with extra steps.

### 5. Row actions are two buttons, and the swipe is gone

`DeviceRow` is a plain `Item.Root`: name, rename, remove. No `SwipeRow`, no tap-to-send.

The swipe existed so a thumb aiming at rename could not land on a destructive control beside it. In
practice it was the worse trade: undiscoverable without a hint, in competition with the list's own
scrolling, and it put removal behind a drag plus a tap on the pointer type that handles both worst. What
keeps the thumb safe now is the pair of things that were always doing the real work — `size="icon"` and
the destructive variant each grow to 44px on a coarse pointer, so the target is visible, and removal
confirms before it revokes anything.

`SwipeRow.svelte` is deleted along with its click guard, since the row was its only consumer.
`horizontalSwipe` stays: it is the definition of the horizontal-gesture arbitration order, and deleting it
would take the `interaction` requirement written around it with it. It has no consumer today, which its
own header comment says.

Tap-to-send is gone from the row too. With rename and remove both visible, a third action on the row's
body was one too many, and an invisible one worse than none. `app.send.picked` stays — the selection
surviving navigation is worth having on its own — but `choose()` had no caller left and went with it.

### 6. Offline degrades per control, not per page

`pairing.available` stops gating the page body. It gates exactly one thing: the "Add a device" trigger
(disabled, with one line beside it). `refresh`, `rename`, `untrust`, and `setSelfName` are trust-store
and identity operations that already work without the broker.

`available` is `identity !== ''`, i.e. "the pairing service came up", which is not literally "online".
The copy is therefore about adding, not about the network: "Floppy can't add a device right now. Check
your connection, then reopen the app." No behaviour change to `available` itself in this change.

### 7. The page splits into components under `src/lib/components/devices/`

`SelfDeviceCard.svelte` (name + inline rename), `DeviceRow.svelte` (swipe + send + rename + remove),
`DeviceList.svelte` (list, empty state, add trigger), `AddDeviceDialog.svelte` (both symmetric halves,
countdown, spent state). `+page.svelte` becomes the shell plus the remove-confirmation dialog it
already owns. The remove confirmation stays at page level: one dialog for the list, not one per row.

### 8. Empty state carries the primary action

With zero devices the list section renders `Empty.Root` whose action is the add trigger, so a first-run
user has one obvious button. With one or more devices the trigger is a normal secondary button in the
section header. Same dialog either way; only its prominence changes.

### 9. The scan slot is a real step with no scanner behind it

The dialog's "other device" half carries a scan control (icon button, left of the code field) that swaps
the dialog body to `ScanStep.svelte`: a dashed square frame with a scan glyph and one control back to
typing. The frame is a placeholder shape, not a viewfinder, and nothing asks for camera permission —
a permission spent to then show nothing is a permission spent on a lie. The camera drops into that frame
later without the surrounding flow moving, which is the point of building it now.

The step is a body swap inside the same `ResponsiveDialog`, not a route or a second dialog. A real
scanner will want the whole surface, which this already is on a phone, and closing the dialog is the same
escape from either step. The code keeps ageing behind it: the countdown interval reads only `open` and
`code`, not `step`.

The entry renders on every platform rather than behind `isTouch()`. Camera availability is a runtime
question the real scanner will answer, a desktop can have a webcam, and gating it by pointer type would
hide the flow on the machine it is being iterated on.

No preview marker, and no `scanReady` declaration: there are no users to be honest to yet, and a flag
with no reader is dead code. What is true about the step lives in its component comment, which is
developer-facing and exempt from the UI copy rules. If the app ships before the scanner does, the marker
goes back on — `preview-markers` already has the requirements for it.

### 10. This device is a panel, not a row

The self-name used to be an `Item.Root variant="outline"` with a laptop glyph, which is exactly what a
paired device row is, so the first read of the page was "why is my own laptop in my list?". It is now a
filled panel (`bg-muted/60`, no border), with a person glyph rather than a machine one, and the text
beside the name says what the name is for ("Other devices see you as") instead of labelling the section.
The separator between it and the list is gone: with the two shapes distinct, a rule between them was
what made the page look like two lists of devices.

### 11. A QR is one path, not one node per module

`QRCode` drew every data module as its own keyed `<circle>` — roughly 300 SVG nodes for a pairing code,
built and laid out while the dialog was still animating open, which is what made the desktop dialog
hitch. The modules are now one `<path>` of arc pairs: same picture, one node.

The other half of that hitch was layout: the code arrives an IPC round trip after the dialog opens, so
a slot sized to its contents resized the dialog just as it settled. The QR slot now holds a fixed height
from the moment the surface opens, and the spinner, the code, and the spent state all live inside it.

This edits a vendored `spell/` component, so it has to be re-applied if that component is ever pulled
again — the same caveat the vendored shadcn patches carry.

### 12. The code card mounts after the surface has finished opening

Trimming the SVG was not enough on its own. The dialog zooms and fades over ~100ms, and the card is a
few hundred arcs under a `backdrop-filter` veil sitting on top of the overlay's own `backdrop-filter` —
compositing that while the surface is still being scaled is the stutter, and the code arrives mid-animation
by definition (it is an IPC round trip away). So the card waits: a `settled` flag flips one `fast()`
after open, the fixed-height slot shows a spinner until then, and the card fades in once the surface is
still. The countdown row waits with it, so the body does not assemble in two visible steps.

### 13. Scanning is offered by platform, not by window width

The scan entry renders only under `isPhoneChrome` (user-agent form factor), and it takes a full-width row
of its own there. `isNarrow()` would have put it in a desktop window someone dragged narrow, which has no
camera worth pointing at another screen, and `isTouch()` would put it on a touchscreen laptop. Desktop is
code-only, which also means `ScanStep` is unreachable there.

`platform.ts` already names these three signals and what each one measures; this is the "hiding an action
the platform cannot perform at all" case it describes.

### 14. An inline rename commits when focus leaves it

`InlineRename` listens for `focusout` and saves unless focus moved to its own cancel or save control
(`root.contains(relatedTarget)`), with the existing empty-is-a-cancel rule intact. Commit rather than
discard, because the field arrives pre-selected: someone who typed a new name and clicked away meant it,
and a rename is reversible where losing the typing is annoying.

`focusout` rather than a document-level `pointerdown` listener: it also covers tabbing away, and it needs
no listener lifecycle of its own.

### 15. Both states of the self panel share one box

The panel's two states do not measure the same — label-over-name against a field with two controls — so
the panel jumped as you pressed Rename. Both now sit in one `min-h-10 pointer-coarse:min-h-11` box, whose
floor is the control height for that pointer type. That is a floor, not a fixed height, so nothing is
clipped if a state grows later.

### 16. This device's picture is a DiceBear avatar, rendered locally

`DeviceAvatar.svelte` calls `createAvatar(funEmoji, { seed: name }).toDataUri()` and renders the result in
an `<img>`. The seed is the name, so the face is stable per name and redrawn on rename — a second way to
recognise the device rather than decoration. `data:` is already in `img-src`, so the CSP is untouched, and
nothing about the device leaves the machine.

The style is not the one the hosted API offers. `initial-face` is API-only: `@dicebear/collection` (9.4.3,
the newest) ships 31 styles and that is not among them, and there is no standalone package for it. So the
choice was hosted-`initial-face`-with-a-request or local-with-a-different-style, and local wins — a picture
is not worth a round trip, a name in someone else's log, or a blank square offline. `funEmoji` holds up at
the 36px this renders at; `bigSmile`, `thumbs`, and `toonHead` are the other candidates that do, and
swapping is one import.

Versions: the style packages peer-depend on `@dicebear/core@^9`, so both are pinned to 9.4.3 rather than
core's 10.x line.

No `Avatar.Root/Image/Fallback` any more either. That primitive exists to handle a load that can fail; a
data URI generated in-process cannot, so the fallback machinery was dead weight.

The paired rows keep their laptop glyph. Giving them faces too would undo the distinction that made the
self panel legible in the first place.

### 17. The code line is sized for the longest code there is

Codes are `<4 digits>-<word>-<word>-<word>` from a 240-word list whose longest entry is 9 characters, so
the worst case is 34 characters. At `text-lg` with `tracking-wide` that overflowed the old `sm:max-w-md`
dialog and wrapped, which grew the card. Three changes, together:

- the dialog is `sm:max-w-lg`, so on a pointer device the longest code is one comfortable line,
- the tracking is gone and the size steps down to `text-base` under `sm` — the floor, not lower, because
  `interaction` requires code text to stay at 16px or more on a coarse pointer,
- the code's line has a reserved `h-14`, so on a narrow phone where 34 characters genuinely cannot fit
  one 16px line, it wraps into height the card already had.

The gap between the QR and the code is `gap-0`: they are one secret, and the QR box's own padding is
already the visual separation.

### 18. The card is full width, the clock is on it, and copy leads

Three small corrections to the shown-code half:

- The card is `w-full` and so is the wrapper the fade lives on. It was already `w-full` itself, but its
  parent was an auto-width flex item, so it shrank to the QR.
- The remaining time moved onto the card as a small mono pill, positioned over it but *outside*
  `RevealVeil` and `pointer-events-none`: how long a code has left is not part of the secret, so it stays
  readable while the code is covered, and the whole card is still one press to reveal. It could not go
  inside the veil anyway — that is a `<button>`, and interactive children would nest inside it.
- Copy takes the row as a `secondary` button; "New code" is an icon-only ghost beside it. A live code does
  not need replacing, and the spent state already offers a new one at the moment it does, so this is the
  early exit rather than a peer of copy.

The description drops to "Use this code on your other device, or theirs here." Pairing by code is a
pattern people have seen; the sentence does not need to teach it.

### 19. One inset under a bottom drawer, not three

The drawer safe-area rules were written in `@layer base`, and `drawer-content` carries `p-4` — a utility,
and utilities come after base in the cascade, so the inset lost outright and did nothing. Unlayering them
fixed that and immediately produced the opposite complaint: on a phone with a home indicator the space
under the drawer's last control became `safe-bottom + 16px` ≈ 50px, plus a call-site `pb-4` on top of it.

The inset and the surface's own padding are two answers to the same question, so they take `max()` rather
than a sum: iOS clears the home indicator, a device with no inset still gets its 16px, and the call-site
padding is gone. The panel's own offset from the screen edge stays at the `before:inset-2` the drawer was
designed with.

### 20. Nothing replaces a code that still works

The tertiary "New code" control is gone from the live card. Replacing a code that works is not something
anyone needs to do: the card offers a new one at the moment the old one dies, which is the only moment the
offer means anything, and the row is one control clearer without it. The row still exists in both states,
so the change costs no layout.

### 21. Keeping a focused field above the keyboard is the app's job here

Tapping rename on a device row low on the Devices page put the field behind the keyboard on iOS, with
nothing scrolling it into view. That is a consequence of a deliberate choice made earlier:
`interactive-widget=overlays-content` in `app.html` keeps the keyboard from resizing the shell, which
means the layout viewport still measures the field as visible, so the browser has no reason to scroll —
and iOS's fallback scrolls the document, which is pinned to the window height.

`src/lib/keyboard.ts` closes it, wired once in the layout beside `watchSafeArea`:

- measure against `visualViewport.offsetTop + height`, the floor of what is actually visible,
- scroll the nearest ancestor with `overflow-y: auto|scroll` (PageShell's region), not the window,
- when that region has nothing left to scroll — a short page is the common case — lend it exactly the
  missing room as inline `padding-bottom`, scroll, and hand it back on blur,
- act on `visualViewport` resize and scroll, plus a timer after `focusin` for the case where the keyboard
  is already up and nothing resizes,
- read `activeElement` a frame after `focusout`, so moving between two fields does not return the room
  and immediately borrow it again. `BottomNav` already does this for the same reason.

Phone builds only (`isPhoneChrome`): a touchscreen laptop has a hardware keyboard and nothing to dodge.

## Risks / Trade-offs

- **The QR is now two taps away (open the flow, lift the veil) instead of one.** → Accepted, and it is
  what makes the page usable for the common visit. The flow opens with the code already requested, so
  it is open-then-reveal, not open-then-request-then-reveal.
- **A generated binding changes shape, and every `showCode()` caller must be updated.** → There is one
  caller. `npm run check` catches a miss; `cargo test export_bindings` keeps `bindings.ts` honest.
- **A destructive button now sits beside rename on touch**, which the removed requirement existed to
  prevent. → Both grow to 44px so the targets are visible and distinct, and removal confirms. If misfires
  show up in practice, a long-press menu is the next option rather than the swipe.
- **A 1s interval in the dialog.** → Started and cleared with the dialog, and only while a code is
  live, so nothing ticks on the page or after the code is spent.
- **`horizontalSwipe` has no consumer now.** → Kept deliberately: it is what the arbitration-order
  requirement in `interaction` describes, and the next horizontal gesture should not have to reinvent it.
- **Scanning still does not work, so `device-management`'s camera scenario stays unsatisfied.** → The
  frame is built and the follow-up change fills it. Named in the proposal rather than quietly left out.
- **An unmarked empty scan step reads as a bug rather than an unbuilt feature.** → Accepted while there
  are no users: the honesty rails (`preview-markers`, `StubMark`) are there to switch on before shipping.
- **Two new dependencies for a picture.** → They render offline with no request and no CSP hole, which
  the hosted URL could not do. The alternative was shipping a network round trip on a page that otherwise
  works offline.
- **The avatar style is not the one that was asked for**, because `initial-face` exists only behind the
  API. → Named here and in one component comment, with the styles that would swap cleanly.
- **The QR change touches a vendored component.** → One derived value and one element; re-applying it
  after a pull is a two-line diff.

## Open Questions

- Should the countdown render as a bare `1:47` or as "works for another 1:47"? Leaning on the shorter
  one with the label carried by the surrounding line, decided at implementation with the copy voice.
- Whether the row's send glyph should appear only on hover on fine pointers. Default: always visible on
  both, because it is the row's primary affordance and hover cannot teach a phone.
- Which scanner the follow-up change uses (`tauri-plugin-barcode-scanner` is the obvious candidate, and
  it is mobile-only, so the desktop scan entry may end up hidden by camera availability after all).
  Nothing in this change depends on the answer.
- Whether the scan step gets a preview marker back before the app has users. Decided then, not now.
