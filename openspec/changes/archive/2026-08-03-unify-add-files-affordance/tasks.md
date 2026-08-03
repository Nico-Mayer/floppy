> Heads-up before starting: the change `fold-connect-beam` is active in parallel and also edits
> `SendPanel.svelte`, but its edits are the `starting`/`waiting` device branches, not the idle
> block this change touches. Expect a rebase, not a conflict.
>
> `prettier --write .` reformats archived spec files across `openspec/` — format only the files
> this change touches.
>
> The button keeps the `Button` it renders today. A press animation was scoped in and dropped;
> see design.md's Non-Goals for what it would take, and do not reintroduce it here.

## 1. One add affordance

- [x] 1.1 Rename `AddFilesSheet.svelte` → `AddFilesButton.svelte` and update the import in
      `SendPanel.svelte`. Rewrite the head comment: the button renders on every platform, and only
      the drawer is behind `isPhoneChrome`.
- [x] 1.2 Move the `{#if isPhoneChrome}` gate off the button so it renders everywhere, keeping it
      around `Drawer.Root` alone. The button itself is unchanged — same `Button`, `size="icon-lg"`,
      `touch="grow"`, `aria-label="Add files"`, and `absolute right-2 bottom-2 z-10 size-14
      shadow-lg` placement.
- [x] 1.3 Give the sheet an accessible name so it is not announced as an unnamed dialog, and leave
      no commented-out markup behind. (Done as a *visible* `Drawer.Title` reading "Add", not the
      `sr-only` header this task originally called for — the header was restored by hand mid-apply
      and a visible title solves the same problem. The commented-out `Drawer.Description` beside it
      was deleted; no description is needed, since `aria-describedby` is optional where
      `aria-labelledby` is not. The spec delta was corrected to match.)
- [x] 1.4 Delete the dashed add tile from `SendQueue.svelte` — the whole trailing `<div class="h-full">`
      wrapper, its button, and the comment block above it. Drop the `PlusIcon` import if nothing
      else in the file uses it.
- [x] 1.5 Make the scroll container's bottom padding unconditional (`pb-20` off the `isPhoneChrome`
      branch) and update its comment: the button floats over this corner on every platform now. Drop
      `cn` from `SendQueue.svelte` if no class list is left conditional; `isPhoneChrome` stays, since
      the empty state's copy branch still needs it.
- [x] 1.6 Update the three-callers comment in `add-files.svelte.ts` to two, and the comment in
      `SendPanel.svelte` that says `AddFilesSheet` "renders nothing at all off a phone build".

## 2. Verify

- [x] 2.1 `npm run check` clean.
- [x] 2.2 `prettier --check` and `eslint` clean on the touched files.
- [x] 2.3 Desktop (`mise run dev`): the button is in the corner on both idle shapes; clicking it
      opens the file picker with no sheet; the queue grid has no dashed tile; a queue long enough to
      scroll can be scrolled so its last row clears the button.
- [x] 2.4 Desktop keyboard: tab to the button, focus ring intact, Enter opens the picker.
- [x] 2.5 Desktop: the empty state still says "Drop your files here", and dragging files onto the
      card still queues them.
- [x] 2.6 Phone (`mise run dev:ios` or `dev:android`): the button opens the files/photos sheet, both
      rows still work, the sheet still dismisses before the native picker appears, and the empty
      state also opens the sheet.
- [x] 2.7 Phone: the button measures at least 44px in each dimension.
- [x] 2.8 Phone: with a pick in flight, the button is unchanged and starts nothing; the report shows
      in the action zone with files queued and under the mascot without.
- [x] 2.9 Check the two-primaries call recorded in `design.md`: with files queued, look at the add
      button above the Send pill and decide whether the corner reads as ambiguous. Nothing
      distinguishes them now but the icon, so this needs a real look. If it does read as ambiguous,
      drop the button to `variant="secondary"` and say so, since the spec calls it the primary way
      to add files.

## 3. Sync

- [x] 3.1 `openspec validate --changes unify-add-files-affordance`.
- [x] 3.2 Sync the delta into `openspec/specs/`. Four requirements are re-added under changed
      headers, so `openspec archive` appends them to the end of
      `openspec/specs/transfer-panel-layout/spec.md` — move each block back into reading order by
      hand afterwards, where its removed predecessor used to sit.
      (Done: archive reported 4 added / 1 modified / 4 removed and appended all four to the end,
      after the progress-display requirement; moved back above the sheet requirement in the
      send-idle region. 900 lines before and after, 19 requirements, 98 scenarios, specs valid.)
