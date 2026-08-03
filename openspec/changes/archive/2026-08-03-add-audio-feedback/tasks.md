## 1. Sound module

- [x] 1.1 Add `src/lib/sounds.ts` with a header comment in the style of `haptics.ts`: why sound
      exists alongside haptics, why it is not gated on pointer type, why it is gated on window
      focus rather than visibility, why there is no off switch and what that costs the design,
      and why it can never fail loudly.
- [x] 1.2 Implement lazy `AudioContext` creation with `latencyHint: 'interactive'`, held in a
      module-level `let ctx: AudioContext | null = null`.
- [x] 1.3 Implement the note primitive: `OscillatorNode` (`sine`) → `GainNode` → destination,
      with a 6 ms linear ramp to peak and an `exponentialRampToValueAtTime(0.0001)` decay across
      the rest of the note. Master gain 0.06. Verify by ear that no note clicks at its start or
      end, and that the decay reads as a struck bell rather than a gate.
- [x] 1.4 Define the two tones from the design table: `done` (C5 523.25 → G5 783.99, 90 ms each,
      20 ms gap) and `alert` (E5 659.25, 70 ms / 70 ms gap / 70 ms at 70% gain). Both under
      220 ms end to end. There is no third tone: nothing falls, and nothing is dissonant.
- [x] 1.5 Implement the `play()` wrapper: no-op if the context is null (no gesture yet) or if the
      window is not focused; everything inside a `try`/`catch` that swallows, with a comment
      saying why silence beats a log line here.
- [x] 1.6 Export `sounds` with exactly three moments over those two tones, named to match
      `haptics.ts`: `transferDone` → `done`, `paired` → `done`, `arrived` → `alert`.
- [x] 1.7 Add a closing comment listing every moment that deliberately makes no sound, in two
      groups. First, **failures** (a mid-flight transfer failure, a pairing failure, a decline):
      sound never carries bad news, a failure raises no OS notification so a tone could only ever
      reach someone already reading the error, and there is no switch to turn it off with.
      Second, the rest (copied, scanned, removed, accepted, declined, pullTriggered,
      peerAccepted). Call out `failed` and `peerAccepted` by name since both fire haptics and both
      look like oversights otherwise. State that the list only grows on the same reasoning, and
      never for a failure.
- [x] 1.8 Implement the focus flag: seeded `true`, updated from
      `getCurrentWindow().onFocusChanged()`, falling back to `document.hasFocus()` when the
      listener cannot be registered (browser preview). Do not call `isFocused()` anywhere.
- [x] 1.9 Implement `initSoundFeedback()`: register the focus listener, and register a
      `pointerdown`/`keydown` unlock on `window` (`{once: true, capture: true, passive: true}`)
      that constructs the context, `resume()`s it, and plays a one-sample buffer at zero gain.
      Both halves wrapped so neither can throw into the caller.
- [x] 1.10 In the unlock path, set `navigator.audioSession.type = 'ambient'` behind a feature
      check (WebKit only; Chromium has no such API, so it is a no-op on Android and desktop).
      Comment why `ambient` and not `playback` or `transient`: mixable, so a tone never ducks
      other audio, and subject to the iOS ringer switch.
- [x] 1.11 Do **not** add a silent looping `HTMLAudioElement`. Leave a comment saying so and why:
      it is the standard hack to make Web Audio survive the iOS ringer switch, and overriding a
      switch the user flipped on purpose is the opposite of what this feature wants, especially
      with no in-app switch to offer instead.

## 2. Wiring

- [x] 2.1 Call `initSoundFeedback()` once from `src/routes/+layout.svelte`.
- [x] 2.2 `src/lib/transfer-app.svelte.ts`: add `void sounds.transferDone()` beside the existing
      `haptics.transferDone()` (~line 414). One line. Add nothing beside `haptics.failed()`
      (~line 445).
- [x] 2.3 `src/lib/pairing-app.svelte.ts`: add `void sounds.arrived()` beside both
      `haptics.arrived()` sites (~lines 112, 154) and `void sounds.paired()` beside
      `haptics.paired()` (~line 171). Add nothing beside `haptics.peerAccepted()` (~line 121) or
      either `haptics.failed()` (~lines 134, 142).
- [x] 2.4 Confirm by grep that no `sounds.*` call sits beside `haptics.failed`, `copied`,
      `scanned`, `removed`, `accepted`, `declined`, `pullTriggered`, or `peerAccepted`, that
      `sounds.ts` exports exactly three moments over two tones, and that the string `error` names
      no tone anywhere in the module.

## 3. Spec text

- [x] 3.1 Reword the `interaction` capability's Purpose paragraph to name both feedback channels
      rather than only haptics. This is the one edit to existing spec prose in the change and it
      is not expressible as a requirement delta, so it happens here.

## 4. Gates

- [x] 4.1 `npm run check` clean.
- [x] 4.2 `npm run lint`: this change's files are clean under both `prettier --check` and
      `eslint`. The repo-wide command still fails, on 142 prettier files and 3360 eslint errors
      that are all inside `broker/.svelte-kit/` — committed SvelteKit build output, pre-existing
      and untouched here. `npm run format` was **not** run: it would rewrite those 142 unrelated
      committed files. Cleaning that up (or gitignoring the directory) is its own change.
- [x] 4.3 Confirm nothing changed under `src-tauri/`, `broker/`, `src/lib/ipc/bindings.ts`,
      `src-tauri/tauri.conf.json`, `src-tauri/capabilities/`, `package.json`, or any settings
      component. A diff touching any of them means the design was departed from.

## 5. Device verification

- [x] 5.1 Desktop (`mise run dev`): finish a transfer with the window focused and hear `done`;
      repeat with the window visible but behind another window and confirm exactly one alert
      arrives, the OS notification, with no app tone on top of it.
- [x] 5.2 Desktop: trigger an arrival, and confirm `done` and `alert` are tellable apart without
      looking at the screen. Complete a pairing and confirm it plays the same `done` tone a
      finished transfer does.
- [x] 5.3 Desktop: fail a transfer, fail a pairing, and have the other device decline. Confirm
      all three are silent while still showing on screen. Then confirm the other device accepting
      a trusted send is silent and only the later completion sounds.
- [x] 5.4 iOS device: start music or a podcast in another app, return to floppy, and finish a
      transfer. The tone should mix without pausing or ducking. If it interrupts despite the
      `ambient` pin, stop and take the Open Question in `design.md` back to the user before
      shipping iOS sound.
- [x] 5.5 iOS device: flip the ringer switch (or Action Button) to silent and confirm the tone is
      silenced while the haptic still fires and the screen still updates. Expected behaviour,
      logged so it is not later filed as a bug.
- [x] 5.6 iOS device: turn on a Focus mode, then finish a transfer with the app in front, and
      confirm the tone still plays. Focus governs notifications, and a focused window raises none.
- [x] 5.7 iOS device: confirm a foreground transfer both buzzes and chirps, and that a
      backgrounded one produces only the OS notification.
- [x] 5.8 Android device or emulator: repeat 5.4 and 5.7. Then set the phone to vibrate and
      confirm the tone still plays, since WebView audio is on the media stream. Expected, and
      recorded so the limitation is documented rather than discovered.
- [x] 5.9 Android: confirm turning media volume down silences the tone, since it is the only
      control there.
- [x] 5.10 Listening pass on all three platforms, against the no-off-switch bar: run ten
      transfers back to back and judge whether the tones are still pleasant on the tenth. Check
      0.06 gain is audible on a phone speaker at moderate media volume without being loud on a
      laptop, and that nothing clicks. Retune the table in `sounds.ts` if any of that fails; add
      a per-platform gain constant only if one level genuinely cannot serve both.
