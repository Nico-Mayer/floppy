# Tasks: transfer-panels-redesign

## 1. UI primitives — touch sizing (`pointer-coarse:`)

- [x] 1.1 `ui/button/button.svelte`: append `pointer-coarse:` bumps to size variants — `default`/`lg` → `min-h-11`, `sm` → `min-h-11`, `icon*` → `min-size-11` equivalents (`pointer-coarse:size-11` / `pointer-coarse:min-h-11 pointer-coarse:min-w-11`); keep fine-pointer classes untouched
- [x] 1.2 `ui/input/input.svelte` and `ui/input-group/` input + button parts: `pointer-coarse:h-11 pointer-coarse:text-base` (and matching addon button hit areas)
- [x] 1.3 Verify with devtools touch emulation at :9245 that panel controls measure ≥44px and input text ≥16px; fine-pointer rendering unchanged (visual diff of both tabs)

## 2. TransferCard — container + two-zone scaffold

- [x] 2.1 Make `Card.Content` a size container (`@container`) in `TransferCard.svelte`
- [x] 2.2 Add optional `actions` snippet prop rendered in an anchored bottom zone (consistent padding, `shrink-0`); status content keeps `min-h-0 flex-1 overflow-y-auto` semantics
- [x] 2.3 `svelte-check` + autofixer clean

## 3. ReceivePanel restructure

- [x] 3.1 Move per-state buttons (Receive files, Cancel, Open folder + Receive more) into the `actions` zone; keep entrance-only fades
- [x] 3.2 Idle: compact = mascot `size-12`–`size-14` stacked; regular (`@md:`) = mascot beside title/description (hero row, left-aligned text)
- [x] 3.3 Code group in the action zone: input (width-capped at `@sm:`), auto-fill hint directly below input (unchanged logic), full-width button in compact / content-width in regular, `saves to` line with the group
- [x] 3.4 Regression: walk every `receive-clipboard-detect` scenario (auto-fill, hint + clear, typed-input protection, suppression) in the native window — all must still hold

## 4. SendPanel restructure

- [x] 4.1 Move per-state buttons (Add/Send row, Cancel, New transfer) into the `actions` zone
- [x] 4.2 Idle empty (drop target): apply compact/regular mascot treatment while keeping whole-surface click/drop affordance and drop-target highlight
- [x] 4.3 Waiting state: migrate viewport `sm:` QR-row classes to container variants (`@sm:`/`@md:`) — QR leads stacked in compact, recedes beside the phrase in regular
- [x] 4.4 File list: confirm it scrolls inside the status zone with the Send/Add actions anchored (long list test)

## 5. Clipboard presentation iteration

- [x] 5.1 Replace the "from clipboard" hint row: code input becomes `InputGroup` with an inline-end ✕ clear button shown whenever the input is non-empty; clearing an auto-filled value keeps the session suppression
- [x] 5.2 Signal auto-fill by replaying `animate-pop` on the input group at fill time (~400ms class toggle; reduced-motion fade fallback via app.css)
- [x] 5.3 Delta spec for `receive-clipboard-detect` (MODIFIED provenance requirement) + `transfer-panel-layout` requirement updated to match

## 6. Verify

- [x] 6.1 Native window sweep at 500px width and full-screen: both tabs, every state (idle, connecting/waiting, transferring, done, cancelling) — no horizontal overflow, no action-row jump between states
- [x] 6.2 :9245 devtools: container-query switch point behaves when resizing; touch emulation sizing per 1.3
- [x] 6.3 Reduced-motion pass (fades collapse to 0 already) and `prettier`/`eslint`/`svelte-check` clean
- [x] 6.4 `go test -race ./...` green (sanity — no Go changes)
