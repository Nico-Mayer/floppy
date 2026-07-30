# Tasks: nav-sidebar-and-pages

## 1. Shell

- [x] 1.1 Add the shadcn `sidebar` component (CLI)
- [x] 1.2 `nav/AppSidebar.svelte`: nav (Transfer, Pair devices + count, Activity, Settings) with active state from the route; footer with the placeholder sign-in
- [x] 1.3 `+layout.svelte`: Sidebar shell (Provider + AppSidebar + SidebarInset), TitleBar on top; own global lifecycle (app.listen, pairing.init, drag-drop, contextmenu) and mount the incoming offer/pair dialogs + Toaster here

## 2. Pages

- [x] 2.1 `routes/+page.svelte`: transfer content only (tabs + error alert), no account/header
- [x] 2.2 `routes/pair/+page.svelte`: this-device QR + copy link, "I have a link" paste, paired list (rename/remove) — the single pairing home
- [x] 2.3 `routes/settings/+page.svelte` and `routes/activity/+page.svelte`: render the existing Settings/Activity content

## 3. Flow + cleanup

- [x] 3.1 `SendTargetPicker.svelte`: "add a device" navigates to `/pair` (no dialog)
- [x] 3.2 Remove `AccountSheet`, `MenuView`, `AddDeviceDialog`, `PairDeviceButton`, `account/types.ts` view stack
- [x] 3.3 `npm run check` clean; manual pass: nav works, pairing on /pair, confirm dialog on top, transfer survives navigation
