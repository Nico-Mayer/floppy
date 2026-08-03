## Context

The camera already works. `src/lib/scan.svelte.ts` owns the whole attempt (permission,
warm-up, the caught/added/retry beats, the giving-up bound) and `ScanSheet.svelte` draws
it, mounted once in `+layout.svelte`. It has exactly one caller: `DeviceList.add()`,
which hands every decoded string to `pairing.redeemCode(content, 'qr')`.

Two things stop that camera being used for a transfer:

1. **Nothing calls it from Receive.** `ReceiveCodeForm.svelte` is a code input and a
   button. The panel that would benefit most from a scan is the one that has no scan.
2. **A decoded string carries no kind.** `SendCode.svelte` renders `value={code}` and
   `CodePanel.svelte` does the same for the pairing code, and both codes come from the
   same `code::generate()` (`rendezvous/code.rs`), so `1234-red-fox-moon` is a valid
   transfer code and a valid pair code and nothing can tell them apart. Today that is
   hidden because the only scanner in the app assumes pairing.

The deep-link half is already half-built: `route_deep_link` (`src-tauri/src/lib.rs:231`)
accepts `floppy://receive?code=…`, emits `DeepLink { code }`, and
`transfer-app.svelte.ts:416` navigates to Receive and prefills without starting. Its
sibling comment records that pairing was deliberately removed as a deep link. Nothing in
the app has ever produced a `floppy://` URL, which is why the gap never showed.

Constraint that shapes the scope: `@tauri-apps/plugin-barcode-scanner` is Android and iOS
only. There is no desktop camera to ungate, so desktop scanning is a separate change with
its own capture path, and `canScan()` stays as it is.

## Goals / Non-Goals

**Goals:**

- One press and one aim to receive files from a QR on another screen.
- A scanned string says what it is, so the wrong code on the wrong screen is a sentence
  and not a failed redemption.
- QR payloads that a future https-linked build can keep, rather than a shape we know we
  will replace.
- The scanner module stops knowing about pairing.

**Non-Goals:**

- Desktop scanning. No webcam capture, no decoder dependency, no change to `canScan()`.
- Universal / App Links and the domain they need. This change makes the payload
  link-shaped; it does not make a phone's own camera app a reliable entry point.
- Any change to the transfer core, the broker, or pairing's cryptography.
- Sending by scanning (aiming the sender's camera at a receiver). The QR flows one
  direction, sender screen to receiver camera, as it does now.

## Decisions

### 1. Link shapes: reuse `receive?code=`, add `pair?code=` beside it

The send QR encodes `floppy://receive?code=1234-red-fox-moon`. That is the exact shape
`route_deep_link` already parses, so the send QR becomes the producer for a consumer that
has been waiting for one, with no new route. The pairing QR encodes
`floppy://pair?code=…` — same query form, one word different.

*Alternatives:* path form (`floppy://get/1234-red-fox-moon`) reads slightly better but
orphans the existing `receive?code=` route or forces us to accept both forever, for
nothing. A JSON or base64 wrapper buys extensibility we have no use for and makes the QR
denser than the phrase deserves.

Codes are `[0-9a-z-]` only, so nothing needs percent-encoding, and the router's existing
`+` → space tolerance stays.

### 2. One TS module builds and parses links; Rust keeps its own tiny parser

`src/lib/code-link.ts` exports `receiveLink(code)`, `pairLink(code)` and
`parseScanned(content)`, which returns `{ kind: 'receive' | 'pair' | 'bare', code }` or
`null` when the content is neither a floppy link nor a well-formed code (`CODE_PATTERN`
from `code.ts`). The scanner is a local decode with no IPC in the loop, so the parse has to
exist in TS.

Rust keeps parsing links itself in `route_deep_link`. That duplicates a prefix match
across two languages, which the repo already does deliberately for the same code format:
`code.ts`'s header says it mirrors `code::normalize` so unsupported input never reaches a
command. Same reasoning, same shape, and the Rust half is the one that gets unit tests
(there is no JS test runner in this repo — the gates are `cargo test`, `npm run check`,
`npm run lint`).

*Alternative:* a `parse_link` command so there is one implementation. Rejected: an IPC
round trip inside a camera loop, to re-derive what a regex already knows, and a new
command in the generated contract for a prefix match.

### 3. `bare` is legal input, never output

Every scan path accepts a bare code, because the requirement that the app "SHALL NOT
require the scanned content to be anything but the code" is a good one: a code read from a
sticky note or an older build still works. A bare code means *whatever the surface the
user scanned from means* — a transfer code on Receive, a pair code on Devices. Only the
QRs we render change; what we accept only widens.

### 4. A scan of the wrong kind is a sentence, not a bad code

`parseScanned` gives the handler the kind, so:

- `pair` link read from Receive → "That's a code for adding a device. Add it on the
  Devices screen."
- `receive` link read from Devices → "That's a code for sending files. Use it on the
  Receive screen."
- `null` (a wifi QR, a URL, junk) → "That's not a Floppy code. Point at the code on the
  other screen."

All three throw from the handler, which is already the scanner's retry path: the camera
stays live with the reason on screen, which is exactly right — the fix is to aim at
something else.

### 5. An in-app scan starts the receive; a deep link only prefills

Aiming a camera at a QR is deliberate and specific, so a good scan on Receive fills the
code and calls `receive.start()`. A link, by contrast, can arrive from anywhere and its
handler keeps the existing rule (prefill, never auto-start — the drive-by-download note in
`transfer-app.svelte.ts`). The two are different levels of intent and get different
answers.

Amended while building: `receive.start()` cannot be awaited by the camera. It awaits the
`receive` command, which awaits the whole transfer, and it records its failure on the panel
rather than throwing — so awaiting it would hold the camera up for the length of the
download and still never see an error. The handler therefore starts it and watches the
panel for 400ms: a refusal that lands at once (a busy device, nothing at the other end)
is taken off the panel and thrown, so it lands on the live camera with another aim
available, and anything slower stays on the panel, which is where a typed code reports too.

### 6. The pair link routes to a prefilled field, and redeems as *typed*

`floppy://pair?code=…` navigates to Devices and opens the code field with the code in it,
waiting for a press. When pressed it goes through `redeemCode(code, 'code')`, so the
device that showed the code does its SAS compare.

This is the security-relevant decision. `via: 'qr'` skips the SAS because a scan proves
the two devices are in the same room. A link proves nothing: it can be forwarded, pasted
in a chat, or embedded in a page. Treating a link like a scan would hand away the only
thing the SAS exemption is paid for. So a link is a typed code with the typing saved.

It also keeps intact the requirement that pairing is never redeemed by opening a link:
arrival prefills, a person presses. And the pairing UI still never shows a URL to copy —
the link lives inside a QR's pixels, not in a text field, so "no pasted links in the
pairing UI" holds.

*Alternatives:* not routing `pair` at all (a native-camera scan then opens the app to
nothing, which reads as broken); auto-redeeming on arrival (gives a forwardable link the
in-room privilege, and re-opens a path that was removed on purpose).

### 7. `DeepLink` gains a `kind`, rather than a second event

`DeepLink { kind: "receive" | "pair", code: String }`. Transfer and pairing events in this
app are already discriminated by a `kind` field on one payload (`ProgressEvent`,
`DoneEvent`). Bindings regenerate; `events.deepLink` keeps its name.

Amended while building: the branch is two listeners on the one event, not one listener that
branches. `pairing-app` imports `transfer-app` and not the reverse, so a single listener
would have had to reach across that line in the direction the modules do not depend. Each
module takes its own kind and returns on the other, which is mechanically exclusive — there
is no question of which one owns the navigation, because the kind decides.

### 8. The scanner takes an intent, not a callback

`scanner.run()` grows from `(handle)` to one options object:

```ts
scanner.run({
  handle: (content: string) => Promise<void>,
  copy: { aim: string; caught: string; done: string },
  wait?: { slow: number; limit: number },
})
```

`ScanSheet` reads `scanner.copy` instead of naming devices. The outcome kind `paired`
becomes `done` for the same reason.

`wait` is optional because the two callers wait for different things. Pairing waits on
another human pressing a button, which is why `WAIT_SLOW`/`WAIT_LIMIT` exist; the numbers
stay, owned by the pairing caller. A receive resolves the moment `receive.start()` returns
— the panel behind the sheet then owns the progress — so it arms no wait timers at all and
cannot inherit a 45-second bound on a thing that takes milliseconds.

### 9. The scan control sits in the Receive form, not the hero

One control, in `ReceiveCodeForm.svelte`, beside the code input inside the panel's
anchored action zone: thumb reach, next to the thing it fills, and it disappears where
there is no camera exactly as the add-a-device glyph does. The idle hero keeps its copy
and gains nothing — a second entry point to the same camera is two things to keep in step
for no new capability.

### 10. `busy` is already handled

`receive.start()` can fail with `busy` while a send runs. That surfaces through the same
handler throw as any other refusal: the camera stays up with the app's own busy sentence
on it. No new state.

## Risks / Trade-offs

- **[An old build scanning a new build's QR reads a URL where it wants a code]** → No
  released users, so this is theoretical; and the *reading* side accepts links from this
  change on, so only a build older than this change is affected. Not mitigated further on
  purpose.
- **[Two parsers for one link format drift]** → The Rust one is unit-tested and the TS one
  is a five-line prefix match over the same regex `code.ts` already owns; the module
  header points at its counterpart, matching the existing `code.ts` / `code::normalize`
  arrangement.
- **[A `floppy://` QR is only sometimes actionable from a phone's own camera app]** → Out
  of scope and stated as such: iOS generally offers to open a claimed scheme, Android
  scanners often linkify http(s) only. The payload is now the right shape for the deferred
  Universal/App Links change, which is where reliability comes from.
- **[The pair link is a new surface that reaches pairing]** → It cannot redeem anything by
  itself: it prefills a field, the redemption needs a press, and it is recorded as typed
  so the SAS compare happens. A forwarded link costs the recipient one dismissed dialog.
- **[Generalising the scanner touches the one flow that is device-verified]** → The
  changes are additive (copy and an optional wait moved onto the caller); the pairing
  caller passes the same numbers and the same beats it has today, so its behaviour is
  unchanged by construction. Re-check on a phone is a task.
- **[Half the ask is deferred]** → Desktop still cannot scan, which was the user's second
  point. Recorded in the proposal as its own change rather than half-built here, because a
  desktop camera is a capture path and a decoder, not a gate to remove.
