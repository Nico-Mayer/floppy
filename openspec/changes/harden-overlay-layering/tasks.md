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
- [ ] 2.3 Verify in the running app, on a phone build, that the prompt's dim covers
      the panel as well as the page — that is the `:has()` half of the rule, and
      it is the half that fails silently.

## 3. A system prompt takes the screen

- [x] 3.1 Name the rule once, apply it at each owner. Corrected during
      implementation: the page does not own all three overlays — `DeviceList` owns
      `entering`, since the control that opens the enter-a-code dialog sits beside
      the list. See design D4.
      - [x] 3.1a `src/lib/pairing-app.svelte.ts`: add a `prompting` getter
            (`request !== null || incoming !== null`), documented as the shell rule's
            predicate so no call site has to know which events count as a prompt.
      - [x] 3.1b `src/routes/devices/+page.svelte`: one effect closing `showingCode`
            and `removing` when `pairing.prompting`. Comment it as the page's half of
            the shell rule, not as a fix for the code panel specifically.
      - [x] 3.1c `src/lib/components/devices/DeviceList.svelte`: the same one line
            for `entering`. Note there why the camera is not included — it is on its
            own layer under the prompt on purpose.
- [x] 3.2 Confirm closing `removing` this way does not remove anything: the
      confirmation performs its action on confirm only, so closing it declines by
      omission, which is what dismissing it already does.

## 4. The code panel stops showing a spent-because-used state

- [x] 4.1 `src/lib/components/devices/CodePanel.svelte`: delete the `used` state,
      the `$effect` that sets it from `pairing.request`, and the `used ||` term in
      `spent`. `spent` becomes `code !== null && remaining === 0`.
- [x] 4.2 Replace the `{used ? … : …}` ternary with the run-out sentence alone.
      Delete "That code has been used." — it has no live call site once 3.1 lands.
      No new string.
- [x] 4.3 Remove `used = false` from the two reset paths (`showCode`, and the
      `!open` branch of the mint effect) now that the flag is gone.
- [x] 4.4 Keep the `seenPaired` effect. Note in its comment that it is now only
      reached when this device is the redeemer, since the shower's panel is
      already closed by the page rule.
- [x] 4.5 Update the file's header comment: the panel closes when its code is
      redeemed, and the reason lives in the shell rule rather than here.

## 5. Verify

- [ ] 5.1 Reproduce the original bug on the current build first, so the fix is
      measured against a seen failure: phone build, open Devices, navigate to Send
      and back to Devices, show the code, redeem it from a second device. The
      prompt should be behind the QR drawer.
- [ ] 5.2 Repeat on the fixed build. The QR drawer closes, the prompt is the only
      surface, one dim.
- [ ] 5.3 Cold start straight onto Devices and repeat — the case that already
      worked, to confirm nothing regressed in the path that was accidentally
      correct.
- [ ] 5.4 Start a scan and have the other device send files. The offer prompt
      appears over the camera chrome and the scan keeps running behind it.
- [ ] 5.5 Desktop: open any dialog and check the header dims with the page.
- [ ] 5.6 Decline a pairing request, reopen the code panel, confirm a fresh code
      with a full countdown.
- [ ] 5.7 Let a code run out with the panel open — the spent state and the "Show a
      new code" control still work.
- [x] 5.8 `npm run check` and `npm run lint`. No Rust or broker gate is touched by
      this change. `lint` clean. `check` reports 3 errors, all of them from
      uncommitted scratch edits in the working tree that commented out the
      `/devices` and `/settings` entries in `nav-items.ts` — `stub === true` and
      `href !== '/devices'` no longer have overlapping types. `git stash` gives 0
      errors on the same tree, so none of the three come from this change.
- [x] 5.9 `npm run build`, and confirm in the emitted stylesheet that all four
      `data-layer` selectors survive — including both `:has(+ …)` ones, which are
      the half that fails silently — and that `--z-header`, `--z-scanner` and
      `--z-prompt` are referenced by real rules.
