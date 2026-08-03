## Why

The Send panel puts a QR on screen and nothing in the app can read it. The camera we
built for pairing is wired to exactly one control on the Devices page, so the shortest
path between two phones — hold one up to the other — only exists for adding a device,
never for taking the files. The person on the receiving end types a four-word code that
is already on the other screen.

The QR itself is also weaker than it looks: both QRs in the app (the send code and the
pairing code) encode a bare `1234-word-word-word` phrase, so nothing about a scanned
string says which of the two it is, and nothing outside the app can act on it. There are
no users yet, so the payload is free to change now and expensive to change later.

## What Changes

- The Receive panel gains a scan control beside the code field. Pressing it opens the
  same camera surface pairing uses; a good scan fills the code and starts the receive,
  so the whole flow is one press and one aim.
- Both QRs carry a `floppy://` link instead of a bare code: the send QR carries
  `floppy://receive?code=…` (the link shape the deep-link router already accepts) and
  the pairing QR carries `floppy://pair?code=…`. **BREAKING** for the wire between two
  app builds: an old build scanning a new build's QR reads a URL where it expected a
  code. Acceptable, no released users.
- Scanning accepts either shape everywhere: a link or a bare code, so a scan is never
  refused for its wrapper, and a code read on the wrong screen says which screen it
  belongs to instead of failing as a bad code.
- `floppy://pair?code=…` becomes a routed link: it opens the Devices page with the code
  filled in, waiting for a press. It is not redeemed on arrival, and it is redeemed as a
  typed code (SAS compare), not as a scan — a link can be forwarded, a camera cannot.
- The scanner module stops being pairing-shaped: its outcome and on-screen copy come
  from the caller, so the same surface can say "add a device" or "get the files".
- Desktop scanning is **not** in this change. The barcode-scanner plugin has no desktop
  implementation, so a desktop camera needs a webview or native capture path of its own;
  that is a separate change. The scan control keeps following the existing camera check
  and simply does not render where there is no camera, exactly as the add-a-device
  control does today.

Out of scope, worth knowing: a `floppy://` QR is only sometimes actionable from a phone's
own camera app (iOS usually offers to open a claimed scheme, Android scanners often
linkify http(s) only). Reliable native-camera scanning needs the https Universal/App
Links already deferred elsewhere. This change makes the payload ready for that; it does
not deliver it.

## Capabilities

### New Capabilities

None. Every behaviour here belongs to a capability that already exists.

### Modified Capabilities

- `transfer-panel-layout`: the Receive panel's action zone gains a scan control beside
  the code field, and the send QR's payload becomes a link rather than a bare code.
- `device-management`: the pairing QR's payload becomes a link, scanned content may be a
  link or a bare code, and a scan that reads the wrong kind of code says so.
- `app-platform`: the deep-link router gains the pair link and reports which kind of link
  arrived; the scanner wrapper is no longer single-purpose.

## Impact

- Frontend: `src/lib/scan.svelte.ts` (caller-supplied copy and outcome),
  `src/lib/components/devices/ScanSheet.svelte` (copy from the caller; the sheet itself
  is already mounted once in `+layout.svelte`),
  `src/lib/components/transfer/receive/ReceiveCodeForm.svelte` (the new control),
  `src/lib/components/transfer/send/SendCode.svelte` and
  `src/lib/components/devices/CodePanel.svelte` (QR values),
  `src/lib/components/devices/DeviceList.svelte` (new scanner API),
  `src/lib/transfer-app.svelte.ts` (deep-link handling), plus one new module for
  building and parsing floppy links.
- Rust: `src-tauri/src/lib.rs` (`route_deep_link` gains the pair route),
  `src-tauri/src/events.rs` (`DeepLink` carries the kind), and the regenerated
  `src/lib/ipc/bindings.ts`.
- No new dependency, no broker change, no transport change. The pair link routes to a
  prefilled field rather than a redemption, so pairing's consent story is unchanged.
