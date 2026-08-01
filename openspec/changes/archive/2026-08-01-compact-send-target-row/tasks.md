## 1. Vendor the native select

- [x] 1.1 Run `npx shadcn-svelte@latest add native-select` and confirm it lands in
      `src/lib/components/ui/native-select/` with a barrel exporting `Root`,
      `Option`, and `OptGroup`
- [x] 1.2 Read the generated files: check the imports use the project's `$lib` aliases
      and the icon import matches `iconLibrary: lucide`, and leave the files otherwise
      unmodified so a future `update` is a no-op
- [x] 1.3 Patch `native-select.svelte` for the coarse-pointer minimum, the way `input`
      and `select-trigger` already are: `pointer-coarse:min-h-11` (the registry's `h-9`
      is 36px, below the 44px the `interaction` capability requires, and this control
      renders *only* on coarse pointers) plus `text-base md:not-pointer-coarse:text-sm`
      (iOS zooms the page on a control smaller than 16px). Carries the same
      `// PATCHED (not from the shadcn-svelte registry)` header as the others

## 2. Rewrite the target picker

- [x] 2.1 Drop the `Field.Field` wrapper and the visible "Send to" label from
      `SendTargetPicker.svelte`; keep the `'code' | fingerprint` bindable `value`
      contract and the `CODE_LABEL` / derived `label` logic as they are
- [x] 2.2 Make the component's root a `flex items-center gap-2` row that fills the
      width it is given, with the picker at `flex-1 min-w-0`
- [x] 2.3 Branch the picker on `isTouch()` from `$lib/platform`: `NativeSelect.Root`
      with `bind:value` on coarse pointers, the existing `Select.Root` on fine ones,
      both with `aria-label="Send to"`
- [x] 2.4 Give the native branch the same options in the same order — the `code`
      option first, then one `<option>` per trusted device inside a
      `NativeSelect.OptGroup label="Your devices"` — so both controls list the same
      thing under the same headings
- [x] 2.5 Truncate the picker's displayed label so a long device name shortens instead
      of widening the row
- [x] 2.6 Delete the tooltip-wrapped add-device icon button and the component's now
      unused `Tooltip` import: it explained itself only through a tooltip a finger
      cannot open, it sat beside a control that already lists the paired devices, and
      Devices is a top-level destination
- [x] 2.7 Keep the zero-devices branch rendering the `Add a device and skip the code`
      link, but as the row's flexible left item (in the picker's slot) rather than as
      the whole component. This is now pairing's only presence on the Send screen

## 3. Collapse the panel's action row

- [x] 3.1 In `SendPanel.svelte`, replace the idle `flex flex-col gap-3` wrapper with a
      single `flex items-center gap-2` row
- [x] 3.2 Let `SendTargetPicker` take `flex-1 min-w-0` in that row and change the Send
      button from `w-full` to `shrink-0`
- [x] 3.3 Update the surrounding comment so it describes the one-row zone instead of
      the "one primary action and nothing to weigh it against" stack
- [x] 3.4 Confirm the other states' action snippets (cancel, done) are untouched and
      still render at the same anchored position

## 4. Verify

- [x] 4.1 `npm run check` and `npm run lint` are clean (also `npm run build`)
- [ ] 4.2 In the `:1420` browser preview with files queued, check the row at the 500px
      minimum window width and at full desktop width: one line, no horizontal
      overflow, Send never clipped
- [ ] 4.3 With device emulation on (coarse pointer), confirm the native `<select>`
      renders, lists the code target plus a "Your devices" group, and that switching
      emulation off swaps back to the styled listbox with the selection intact
- [ ] 4.4 Check both device states: with devices paired the row is picker + Send and
      carries no pairing shortcut; with none paired it is the add-device link + Send,
      and Send has not moved between the two
- [ ] 4.5 In the native window, send by code and send to a trusted device from the new
      row and confirm both dispatch as before
- [ ] 4.6 Un-trust the selected device while the picker shows it and confirm the picker
      falls back to the code target with no flicker of a stale name
- [ ] 4.7 On a phone or emulator, confirm the OS picker opens, the select itself is
      comfortably tappable at the patched 44px, and the file grid gained the height
