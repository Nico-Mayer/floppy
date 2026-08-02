# Tasks: account-view-platform-nav

## 1. Backend: readable download root

- [x] 1.1 Add `download_root` command in `src-tauri/src/lib.rs` returning the
      `resolve_dest_root` value as a display string, without creating the folder; register
      it in `specta_builder` and the invoke handler
- [x] 1.2 Regenerate `src/lib/ipc/bindings.ts` (`cargo test export_bindings`) and add the
      wrapper export in `src/lib/ipc/index.ts` following the existing pattern
- [x] 1.3 `cargo test` in `src-tauri/` green

## 2. Platform-aware destinations

- [x] 2.1 `src/lib/nav-items.ts`: add `platform: 'all' | 'desktop' | 'phone'` per entry;
      change Settings to desktop-only with `stub: false`; add Account entry (phone,
      `/account`, avatar glyph, `stub: true`); export a `platformNavItems` list filtered by
      `isPhoneChrome`
- [x] 2.2 `BottomNav.svelte` and `AppSidebar.svelte` render the filtered list
- [x] 2.3 `+layout.svelte`: keyboard shortcuts and route-transition index read the filtered
      list
- [x] 2.4 Sidebar footer account row navigates to `/account`

## 3. Account screen

- [x] 3.1 New `src/lib/components/account/AccountView.svelte`: signed-out avatar glyph +
      status in text, `LoginView`, sync-scoped copy, no external requests
- [x] 3.2 New `src/routes/account/+page.svelte` with `PageShell`/`PageHeader`, preview
      marker from the shared declaration

## 4. Settings becomes desktop-only and partly real

- [x] 4.1 `SettingsView.svelte`: remove the Account section; add a Downloads section that
      reads `download_root`, shows it read-only, and opens it via `open_path`; keep the
      theme picker; mark Transfers and Network sections with their own `StubMark`s
- [x] 4.2 `src/routes/settings/+page.svelte`: page header no longer stub-marked

## 5. Phone theme follows system

- [x] 5.1 `+layout.svelte`: on `isPhoneChrome`, `setMode('system')` once at startup

## 6. Verify

- [x] 6.1 `npm run check` (svelte-check) green
- [ ] 6.2 Desktop smoke: sidebar shows Send/Receive/Devices/Settings, account row opens
      Account, Settings shows real download folder and opens it
- [ ] 6.3 Narrow desktop window: bottom bar shows the desktop set including Settings
