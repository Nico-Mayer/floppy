# Sidebar shell + real pages for pairing/settings/activity

## Why

The account UI is a `Sheet` with an in-sheet view stack (`account/types.ts` even
calls itself "a stand-in for real routing"). It has three concrete problems:

- **The confirm-pair dialog pops behind the add-device dialog.** Showing a link
  and confirming an incoming pair are two overlays fighting for the top; if the
  QR dialog is open, the confirmation is hidden behind it.
- **Convoluted, duplicated QR.** The add-device dialog's "show a link" QR is the
  same thing as the "This device" QR on the devices view — two entry points to
  one concept.
- **Pairing is buried.** Adding a device from the send panel opens a modal whose
  logic overlaps the devices view.

## What Changes

- Replace the account `Sheet` with a **shadcn Sidebar** shell in the root layout.
  Nav items become **real SvelteKit routes**: `/` (transfer), `/pair`,
  `/settings`, `/activity`. The placeholder sign-in moves to the sidebar footer.
- **Pairing becomes a page (`/pair`)** and the single home for it: this device's
  QR + copy-link, an "I have a link" paste field, and the paired-devices list
  (with rename/remove). The add-device dialog is removed.
- The **send panel's "add a device"** navigates to `/pair` instead of opening a
  dialog; all pairing logic lives on the page.
- **Confirm-pair is then the only overlay**, so it can no longer be hidden —
  fixing the stacking bug structurally.
- **Global app lifecycle** (transfer/pairing event listeners, native drag-drop,
  the incoming offer/pair dialogs, the toaster) moves to the root layout so it
  survives navigation between routes.

Out of scope: the pairing link format is unchanged (QR + a copy button carry
sharing); no transport/crypto changes.

## Capabilities

### Added Capabilities

- `app-navigation`: a sidebar shell with real routes for transfer, pairing,
  settings, and activity.

### Modified Capabilities

- `device-pairing`: pairing is a dedicated page with one QR/link home; the send
  panel links to it; the confirm-pair prompt is the only pairing overlay.

## Impact

- New routes `src/routes/{pair,settings,activity}/+page.svelte`; `+layout.svelte`
  gains the sidebar shell and owns global lifecycle; `+page.svelte` becomes the
  transfer content only.
- New `src/lib/components/nav/AppSidebar.svelte`; shadcn `sidebar` component added.
- `SendTargetPicker.svelte` links to `/pair`.
- Removed: `AccountSheet`, `MenuView`, `AddDeviceDialog`, `PairDeviceButton`
  (dialog), `account/types.ts` view stack. `DevicesView`/`SettingsView`/
  `ActivityView`/`LoginView` content is rendered by the new pages.
- No `src-tauri` changes.
