# Design: account-view-platform-nav

## Context

Navigation is one shared list (`src/lib/nav-items.ts`) read by the desktop sidebar and the
mobile bottom bar. Settings is the fourth destination on both, page-wide marked as a preview.
Its contents: a stub Account section (LoginView), a real theme picker (mode-watcher), a stub
notify switch, a stub relay field. The sidebar footer's account row navigates to `/settings`.
This device's editable name lives on the Devices page (`device-management` requires that).

The backend already resolves the download root per platform in `resolve_dest_root`
(`src-tauri/src/lib.rs:546`) but never exposes it; `open_path` exists as a command.

## Goals / Non-Goals

**Goals:**

- Phone chrome shows no Settings; it shows an Account destination with an avatar glyph.
- Phone theme always follows the system.
- Desktop Settings feels like desktop settings: real theme control, real download folder
  (visible and openable), account concerns moved out.
- One source of truth for destinations survives the platform split.

**Non-Goals:**

- Real sign-in or sync. The Account screen stays a marked preview.
- A *configurable* download folder. The root is shown and openable, not changeable.
- Moving this device's name. It stays on Devices: it is the label other devices see after a
  pairing, a device property, not an account property.
- Tablet-specific treatment. Phone chrome (`isPhoneChrome`) is the platform test, as today.

## Decisions

**1. Platform decides what exists; width decides how it renders.** `navItems` entries gain a
`platform: 'all' | 'desktop' | 'phone'` field, and both surfaces render the filtered list for
the running platform. A narrow desktop window therefore shows a bottom bar with Send /
Receive / Devices / Settings — the desktop set in the phone arrangement — which matches the
existing platform-vs-width doctrine in `platform.ts`. Alternative rejected: two separate nav
lists (can drift, violates the single-source requirement).

**2. Account is a real destination, not chrome.** New `/account` route. On phones it is the
fourth bar item (avatar glyph, label "Account"). On desktop it is *not* in the sidebar's
destination list; the footer account row navigates to it, keeping "one place, one way in".
The route-transition index and ⌘1-⌘4 shortcuts read the platform's filtered list; a route
outside the list (desktop `/account`) keeps the last direction, which the layout already
handles (`index === -1` returns early).

**3. Sign-in moves whole.** `LoginView` renders on the Account screen; the Settings Account
section is deleted. The Account screen adds the sync sentence and a preview marker via the
shared `stub` declaration. No avatar image while signed out (no external fetch), as the
sidebar row already argues.

**4. Phone theme is system, enforced once.** No theme picker renders on the phone (the whole
Settings screen is gone there). To clear any stored preference from earlier builds, the
layout calls `setMode('system')` once at startup when `isPhoneChrome`. Alternative rejected:
leaving stale stored preferences active with no UI to change them.

**5. Desktop Settings gets one real fact, not a preferences engine.** New Rust command
`download_root` returns `resolve_dest_root(...)` as a display string; the Downloads section
shows it read-only with an "open folder" control wired to the existing `open_path`. This
satisfies preview-markers honesty: the value shown *is* the truth. The command is declared in
`specta_builder`, so `bindings.ts` regenerates; the wrapper follows the existing pattern in
`src/lib/ipc/index.ts`. Notify and relay stay, but the preview marking moves from page-wide
(`stub: true` in nav) to per-section `StubMark`s, because the page now has two real sections.
Settings' nav entry flips to `stub: false`; Account's is `stub: true`.

**6. Spec surgery.** app-shell: the account-row requirement is REMOVED and re-ADDED under a
name that no longer says "Settings"; the single-shell and bottom-bar requirements are
MODIFIED in full (platform may now determine the destination set). preview-markers: the
false-value requirement's settings scenario now demands the *real* location or nothing.
download-destination: ADDED readable-root requirement. New `account-view` capability spec.

## Risks / Trade-offs

- [Phone users lose the theme picker while a dark-mode preference was already stored] →
  startup `setMode('system')` resets it deliberately; system theme is the stated behavior.
- [Desktop set in a narrow window shows Settings in a bar with no page-wide stub dot while
  two of its sections are stubs] → per-section markers keep honesty at the point of contact;
  preview-markers spec is updated to say so.
- [`download_root` returns a path the user may find odd on mobile] → command is called only
  from the desktop-only Settings screen; it still returns the truth everywhere.
- [Removing `/settings` from phone nav leaves the route reachable only by code] → navigation
  is flat and nothing links there on phones; acceptable, no guard added.

## Open Questions

None. All decisions above are settled for this change.
