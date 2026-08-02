# Proposal: account-view-platform-nav

## Why

The Settings destination is a stub that earns no place in mobile navigation: its only real
control is the theme picker, and a phone app should follow the system theme instead of
carrying one; every other control on the page is disconnected. Meanwhile the planned account
(sign-in to sync paired devices) has no home of its own — it squats as a section inside
Settings. Splitting them lets each platform show what is true for it: phones get an Account
destination in the bottom bar, and desktop keeps a Settings screen that finally shows a real
value (the actual download folder) instead of hiding it.

## What Changes

- The destination list becomes platform-aware while staying one source of truth: phone
  chrome shows Send / Receive / Devices / Account; desktop shows Send / Receive / Devices /
  Settings. **BREAKING** for the app-shell contract that the bar lists the same four
  destinations as the sidebar.
- New Account screen (`/account`), a marked preview: the sign-in surface moves there from
  Settings, described as syncing paired devices across installs. The desktop sidebar's
  account row navigates there instead of to Settings.
- The bottom bar's Account item carries the avatar glyph; phone chrome now has an account
  affordance. **BREAKING** for the app-shell requirement that mobile chrome carries none.
- Settings becomes desktop-only and partially real: theme picker stays (real), the Account
  section leaves, and a new Downloads section shows the real resolved download root with a
  control that opens it in the platform's file manager. Notify and relay controls remain,
  marked as previews per section rather than page-wide.
- Phone theme always follows the system: no theme picker on phone, and any previously stored
  preference is reset to system on startup.
- New `download_root` command exposes the resolved destination root to the UI (read-only);
  the existing `open_path` command opens it.
- This device's name stays on the Devices page (it is the pairing label other devices see,
  not an account property). No change to `device-management`.

## Capabilities

### New Capabilities

- `account-view`: the Account screen — one place the account is presented, honest about
  being a preview, reachable from the bottom bar on phones and from the sidebar account row
  on desktop.

### Modified Capabilities

- `app-shell`: per-platform destination lists from one shared source; the sidebar account
  row navigates to Account instead of Settings; phone chrome carries an account destination
  in the bar; Settings is a desktop-only destination.
- `preview-markers`: the Settings screen may show the save location once it reads the real
  resolved value; preview marking on Settings moves from page-wide to per-section; the
  Account screen is a marked preview.
- `download-destination`: the resolved destination root is readable by the UI, so desktop
  Settings can state it and open it.

## Impact

- Frontend: `src/lib/nav-items.ts` (platform field + filtered lists), `BottomNav.svelte`,
  `AppSidebar.svelte`, `+layout.svelte` (shortcuts, transition index, theme enforcement),
  new `src/routes/account/+page.svelte` + `AccountView` component, `SettingsView.svelte`,
  `src/routes/settings/+page.svelte`.
- Backend: new `download_root` command in `src-tauri/src/lib.rs` (uses the existing
  `resolve_dest_root`); regenerated `src/lib/ipc/bindings.ts` plus the wrapper in
  `src/lib/ipc/index.ts`.
- Specs: one new capability, three delta specs.
