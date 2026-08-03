## Why

The app has one non-visual feedback channel and it only exists on phones. `src/lib/haptics.ts`
no-ops on a fine pointer, so on desktop every outcome is silent: a transfer that finishes while
the window is behind the browser announces itself only by an OS notification, and only if the
window is unfocused. A visible-but-ignored window says nothing at all.

Sound covers what a buzz cannot. A haptic reaches a hand that is holding the device; a short
tone reaches someone who set the phone down or switched to another window on the same screen.
That gap is exactly where a file transfer lives: you start it and look away.

The research question in the request has a clear answer. **Tauri publishes no audio plugin.**
The community ones are the wrong tool — `tauri-plugin-native-audio` wraps ExoPlayer/AVPlayer
with a media session and now-playing controls (it would pause the user's music and post a media
notification for a 200 ms chirp), and `tauri-plugin-audio-recorder` records rather than plays.
The webview's own Web Audio API is available on all five Tauri webviews, needs no plugin, no
Rust dependency, no capability entry, and no CSP change. That is the mechanism.

## What Changes

- **New `src/lib/sounds.ts`**, a sibling to `haptics.ts` with the same shape: moments named by
  what happened, one place that maps a moment to a sound, and failure that can never surface.
  Tones are synthesized with Web Audio oscillators, so there are no audio assets to bundle,
  license, decode, or admit through the CSP.
- **Two tones, three moments.** A `done` tone when a transfer finishes and when a pairing
  completes, and an `alert` tone when an offer or pairing request arrives.
- **Sound never carries bad news.** No tone for a failed transfer, a failed pairing, or a
  decline. Those are shown on screen, and they were the only moments where the app would have
  made an unpleasant noise at someone who could not turn it off.
- **There is no off switch, so restraint is the whole design.** Every tone has to earn its place
  against the fact that nobody can turn it off, which sets both the short list above and the
  quiet, soft tones described in `design.md`.
- **No sound at any finger-driven moment.** Copy, remove, scan, accept, decline, and the
  pull-to-refresh trigger stay silent. Those happen with a finger on the glass and eyes on the
  result; a chirp there is the "a buzz on everything stops meaning anything" failure the haptics
  module already warns about, and it is worse for sound because a room can hear it.
- **No sound for the other device accepting a trusted send.** It is a mid-flow beat, not an
  outcome, and the completion tone follows within seconds. Two tones seconds apart read as a
  malfunction.
- **Sound is not gated on pointer type.** Unlike haptics it runs on desktop, which is where it
  is most needed.
- **Sound is gated on window focus, not just page visibility.** Haptics gate on
  `document.visibilityState`, which stays `visible` for an unfocused desktop window. That is
  precisely when the Rust side fires an OS notification (`notify_done`/`notify_offer` read a
  `foreground` flag maintained from window-focus events), so reusing the haptics gate would play
  two sounds for one event. The frontend tracks the same window-focus event stream instead.
- **Tones run in the mixable `ambient` audio mode**, pinned with `navigator.audioSession` where
  the webview supports it, so a tone never ducks or pauses other audio and stays under the iOS
  ringer switch.
- **A first-gesture unlock.** Browsers suspend an `AudioContext` until a user gesture, and every
  sound in this change is triggered by a backend event rather than a tap. The context is created
  lazily on the first pointer or key event, once, for the session.

Nothing else is added. No Rust change, no new IPC command or event, no new dependency, no new
plugin, no capability edit, no CSP edit, no asset file, and no new setting.

## Capabilities

### New Capabilities

None. Audio feedback is the same subject as haptic feedback and belongs beside it.

### Modified Capabilities

- `interaction`: The feedback family grows a second channel, added alongside the haptics
  requirements rather than folded into them. New requirements state which moments make a sound
  (a strict subset of the haptic moments, never a failure), that sound is not restricted to touch
  devices, that it is gated on window focus rather than page visibility, that tones are quiet and
  short by design because there is no way to turn them off, that they sit under the platform's
  own mute and never override it, that reduced-motion does not suppress them, and that a browser
  blocking playback is indistinguishable from success. Every existing haptics requirement stays
  exactly as written and keeps meaning what it says; only the capability's Purpose paragraph is
  reworded to name both channels.

## Impact

- **New**: `src/lib/sounds.ts` — the moment vocabulary, Web Audio synthesis, the focus gate, and
  the unlock. One file.
- **Modified call sites**, each already calling `haptics.*` on the same line:
  `src/lib/transfer-app.svelte.ts` (one line, the completion) and
  `src/lib/pairing-app.svelte.ts` (three lines: two arrivals and the pairing completion).
- **Shell**: the one-time init is registered in `src/routes/+layout.svelte`.
- **Unaffected**: all of `src-tauri/`, `broker/`, `src/lib/ipc/bindings.ts`, `tauri.conf.json`,
  `src-tauri/capabilities/`, `package.json`, and every settings surface.
- **Mute behaviour differs per platform**, and the app does not add a control of its own. The iOS
  ringer switch does silence these tones, because a bare `AudioContext` runs in the `ambient`
  audio category (an `<audio>` element would not — that is the `Playback` category, and the
  source of the "web video plays on a silenced phone" complaint). iOS notification settings and
  Focus modes govern the OS notification instead, which is the branch the focus gate hands them.
  Android has no equivalent: WebView audio is on the media stream, so a phone on vibrate still
  chirps, and media volume is the only control there. Accepted deliberately; the answer is to
  keep the tones few, quiet, and never unpleasant rather than to add a switch.
- **Risk to verify on hardware**: whether a tone still ducks background audio on iOS despite the
  `ambient` pin. Device-only check.
