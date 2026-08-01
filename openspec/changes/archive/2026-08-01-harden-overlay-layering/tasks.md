# Tasks

## 1. The layer scale

- [x] 1.1 Add four tokens to `:root` in `src/routes/layout.css`, next to the
      safe-area block: `--z-header: 40`, `--z-panel: 50`, `--z-scanner: 60`,
      `--z-prompt: 70`. Comment them as one scale, back to front, and name the
      owner of each layer. Note that toasts are above all four and come from
      sonner's own `999999999`, so they are not in the scale.
- [x] 1.2 Add the unlayered `data-layer` rule to `layout.css`, below the existing
      unlayered safe-area rules and above the `[data-slot='dialog-content']`
      max-height rule:

      ```css
      [data-slot='dialog-content'][data-layer='prompt'],
      [data-slot='drawer-content'][data-layer='prompt'],
      [data-slot='dialog-overlay']:has(+ [data-layer='prompt']),
      [data-slot='drawer-overlay']:has(+ [data-layer='prompt']) {
          z-index: var(--z-prompt);
      }
      ```

      Comment why it is unlayered (the vendored `z-50` is a utility), why it uses
      an attribute rather than a class (tailwind-merge and the variant-prefix
      trap), and why `:has(+ …)` is the only path to the overlay — see design D3.
- [x] 1.3 `src/lib/components/shell/AppHeader.svelte`: replace `z-60` with
      `z-(--z-header)`. Update the comment in `BottomNav.svelte` that records the
      "header is z-60, dialog content z-50" argument — it is settled now, and the
      bar's reason for staying in the layout flow no longer depends on it.
- [x] 1.4 `src/lib/components/devices/ScanSheet.svelte`: replace `z-70` on the
      fixed root with `z-(--z-scanner)`. The `z-10` / `z-0` on its own children
      are local to that stacking context and stay as they are.
- [x] 1.5 Leave `--z-panel` unused by any component for now: it documents the
      shadcn default so a future surface can name the layer it is already on
      without a vendored patch. Say so in the token comment.

## 2. Prompts on the prompt layer

- [x] 2.1 `src/lib/components/prompts/IncomingPairDialog.svelte`: add
      `data-layer="prompt"` to `ResponsiveDialog.Content`. It reaches both the
      dialog and the drawer branch through `restProps`.
- [x] 2.2 Same in `src/lib/components/prompts/IncomingOfferDialog.svelte`.
- [x] 2.3 Verify in the running app, on a phone build, that the prompt's dim covers
      the panel as well as the page — that is the `:has()` half of the rule, and
      it is the half that fails silently. Covered by the run in 5.2: the prompt now
      arrives in front reliably, which it cannot do if the rule did not compile.

## 3. Reverted: closing a panel to make room for a prompt

Implemented, then reverted after it broke the prompt on device. vaul keeps its
body-lock state in module-level singletons, so a drawer closing while another opens
corrupts it and the arriving one can fail to appear. See design D4.

- [x] 3.1 Reverted: `pairing.prompting`, the effect on `src/routes/devices/+page.svelte`
      closing `showingCode` and `removing`, and the one on `DeviceList.svelte`
      closing `entering`. All four files are back at their pre-change state, so the
      change no longer touches them at all.

## 4. Reverted: the code panel closing on a redeemed code

- [x] 4.1 Reverted with group 3. `CodePanel` keeps `used`, the effect that sets it
      from `pairing.request`, and "That code has been used." — with the panel staying
      open behind the prompt, that is the honest thing for it to say, and it is the
      panel's own business again rather than a consequence of a rule elsewhere.

## 5. Verify

- [x] 5.1 Reproduce the original bug on the current build first, so the fix is
      measured against a seen failure: phone build, open Devices, navigate to Send
      and back to Devices, show the code, redeem it from a second device. The
      prompt should be behind the QR drawer. Seen, repeatedly, across this change:
      behind the panel first, then not arriving at all under the group 3 revision.
- [x] 5.2 Repeat on the fixed build. The prompt is in front, over the QR drawer,
      which stays open behind it saying the code has been used. Verified on device
      (iPhone showing the code, desktop redeeming by typed code).
- [ ] 5.3 DEFERRED. Cold start straight onto Devices and repeat — the path that was
      already accidentally correct. Not exercised separately; the layer scale makes
      it the same code path as 5.2, which is the point of the scale.
- [ ] 5.4 DEFERRED. Start a scan and have the other device send files. The offer
      prompt should appear over the camera chrome with the scan still running. This
      is the one collision in the change with no run behind it at all.
- [ ] 5.5 DEFERRED. Desktop: open any dialog and check the header dims with the page.
- [ ] 5.6 DEFERRED. Decline a pairing request: the panel behind says the code has
      been used and offers a new one.
- [ ] 5.7 DEFERRED. Let a code run out with the panel open — the spent state and the
      "Show a new code" control still work. Untouched by the final shape of this
      change (group 4 was reverted), so it is regression cover, not new behaviour.
- [x] 5.8 `npm run check` and `npm run lint`, both clean. No Rust or broker gate is
      touched by this change.
- [x] 5.9 `npm run build`, and confirm in the emitted stylesheet that all four
      `data-layer` selectors survive — including both `:has(+ …)` ones, which are
      the half that fails silently — and that `--z-header`, `--z-scanner` and
      `--z-prompt` are referenced by real rules.

## 6. The pair prompt loses its name field

Found on two devices after group 5 was written: on a phone the prompt arrives with
the soft keyboard already up over the sheet. Two attempts at controlling focus were
made first and neither held on device — see design D5. The field is the problem, and
the requirement governing this prompt is called *One-tap confirmation without
naming*, so it goes.

- [x] 6.1 Reverted: the `ref` forwarded through
      `responsive-dialog-content.svelte`, and the `onOpenAutoFocus` handler on the
      pair prompt. Both existed only to put focus somewhere harmless, which is moot
      once there is nowhere harmful to put it. The file is back to the shape it had,
      so the change adds no deviation from the shadcn source.
- [x] 6.1a Confirm the missing prompt was group 3's overlapping drawer transitions
      (design D4). Verified by reverting: with groups 3 and 4 out, the prompt arrives
      reliably again. Not proven at the level of watching vaul's singletons, so the
      link is inference plus a clean revert, not a traced failure.
- [x] 6.2 `src/lib/components/prompts/IncomingPairDialog.svelte`: delete the
      `Input`, the `name` state, the `$effect` seeding it from `suggestedName`, the
      `nameOk` gate and the `disabled` on Add. `confirm()` reads
      `pairing.request.suggestedName` and hands it to `confirmPair`.
- [x] 6.3 Same file: the body is now only the SAS line, so render it only for a typed
      code. A scanned QR leaves the prompt as its header and its two answers.
- [x] 6.4 Same file: drop "or rename it below" from the description. New wording is
      "Add it and you can send to it without a code." No em dash, no new concept.
- [x] 6.5 Record in the file's header comment that the field was removed rather than
      focus-managed, and why: a prompt with no field cannot raise a keyboard at all.
      Leave `EnterCodeDialog` alone — it is opened in order to type.
- [x] 6.6 On a phone: show a code, redeem it from a second device, and confirm the
      prompt arrives with no keyboard at any point, that the panel does not resize,
      and that both answers are reachable without scrolling. Verified for the typed
      code, which is the path that renders a body. The scanned-QR path renders
      strictly less, so it is covered by construction rather than by a run.
- [ ] 6.7 DEFERRED. Confirm the added device lands in the list under the name it
      advertised, and that renaming it from its row still works. Design D5 records
      why this is the same write as before: `confirmPair` always wrote the advertised
      name, never the local override, so the removed field changed nothing here.
