## Context

`src/lib/haptics.ts` is the app's only non-visual feedback channel. It names moments rather
than intensities, swallows every failure, and no-ops unless the pointer is coarse. That last
rule means desktop has nothing: a transfer that finishes behind another window is announced by
an OS notification only when the window is *unfocused*, and by nothing at all when it is visible
but ignored.

Three constraints shape everything below.

**There is no Tauri audio plugin.** The official plugin workspace has none. The community
crates are the wrong shape: `tauri-plugin-native-audio` wraps Media3 ExoPlayer on Android and
AVPlayer on iOS with a `MediaSessionService`, a now-playing entry, and remote-command handling —
built for playing tracks, and it would pause the user's music and post a media notification to
chirp for 200 ms. `tauri-plugin-audio-recorder` and `tauri-plugin-mic-recorder` record.
`tauri-plugin-musickit` is Apple Music. None of them fit.

**The core already owns a foreground predicate, and it was hard-won.** `src-tauri/src/lib.rs`
keeps an `AtomicBool` fed by `WindowEvent::Focused` and reads it before raising a notification.
Its comment records why it is not `is_focused()`: asking the window blocks on the UI event loop,
which is what made completion notifications land long after the transfer finished. Any sound
gate has to agree with that flag or the app will sound twice for one event.

**There is no off switch, by decision.** That is not an omission to be filled in later; it is the
constraint that sets the shape of the feature. Everything below is chosen so that a person who
cannot turn these tones off never wants to.

## Goals / Non-Goals

**Goals:**

- Give desktop a non-visual channel it does not have today, and give both platforms a signal
  that carries across a room rather than only into a hand.
- Earn every tone. A person who hears one should already know what it means before they look.
- Be quiet, and never unpleasant. Subtle enough to be pleasant on the twentieth transfer of the
  day, in a shared room, with no way to switch it off.
- Add nothing to the Rust side, the IPC contract, the plugin set, the capability files, the CSP,
  the dependency list, or the settings surface.
- Keep the moment vocabulary the single source of truth: a call site reads `void sounds.paired()`
  next to `void haptics.paired()` and the mapping to an actual tone lives in one file.

**Non-Goals:**

- A sound on/off switch, a volume slider, per-moment volume, or custom sound packs. Decided
  against: the honest alternative to a switch is fewer, quieter, friendlier sounds, which is what
  this design spends its effort on.
- Any sound for a failure, a decline, for finger-driven moments, or for the other device
  accepting. Explicitly refused, not deferred.
- Sound assets, a sound designer, or an asset pipeline.
- Any Rust-side audio (`rodio`, `cpal`). A dependency and a build-toolchain surface on five
  targets to play two chirps the webview can already synthesize.

## Decisions

### Sound says a flow finished, or that someone is waiting. Never that something broke.

Two tones over three moments:

| Moment | Sound | Why |
| --- | --- | --- |
| a transfer finishing, either direction | `done` | The whole point. You start it and look away. |
| a pairing completing | `done` | Same shape: a flow with a wait in it, ending well. |
| an offer or pairing request arriving | `alert` | Someone else is blocked waiting on your answer. |

`done` is shared rather than split. A finished transfer and a finished pairing are the same fact
— "the thing you were waiting on is done" — and giving them separate tones would ask the user to
learn a distinction they can read off the screen in the one second it takes to look.

**Failures make no sound at all.** This is the deliberate asymmetry, and it holds up on
inspection rather than merely being kind: `notify_done` in `src-tauri/src/lib.rs` fires only on
`Done` and its comment says so ("No notification on error or cancel"), so a failure never raised
an OS notification either. Combined with the focus gate, an error tone could only ever have
played while the window was focused — that is, while the failure was already on screen being
read. It would have been bad news delivered to someone already looking at it, and an unpleasant
noise is the worst thing to hand someone who cannot switch it off.

Everything else stays silent too, including two moments that *do* fire a haptic:

- **The other device accepting a trusted send.** A step inside a flow rather than its outcome,
  and `done` follows within seconds. Two tones seconds apart read as a malfunction.
- **Every finger-driven moment** — copy, remove, scan, accept, decline, pull-trigger. A finger is
  on the control and eyes are on the result. A haptic is free there because the device is in your
  hand; a sound is not, because the room hears it.

*Trade-off accepted:* on Android there is no OS-level way to silence these (see the mute table
below), so media volume is the only control. This was weighed and chosen over adding a switch.
Two soft tones over three moments is the budget that makes it defensible, and it is why the list
above is not allowed to grow without the same reasoning being redone.

### Synthesize tones with Web Audio, in the webview

`OscillatorNode` → `GainNode` → destination, created per tone and discarded. No files, no
`fetch`, no `decodeAudioData`, no bundle weight, no licensing, and no CSP surface at all (the
policy has no `media-src`, so it would fall through to `default-src 'self'` — same-origin assets
would in fact pass, but touching nothing is better than relying on that).

*Alternatives:* a Tauri plugin (none fits, see Context); Rust `rodio` (new dependency, five build
targets, and an IPC hop for a UI nicety); bundled WAV/OGG assets (real files to source or
commission, licence, ship, and decode).

Synthesis also makes the tones one table to retune, which matters more than usual when "too
noisy" is the main way this feature can fail and nobody can opt out.

### The two tones: soft, low, and short

A `sine` oscillator throughout. Sine has no upper harmonics, so it reads as a soft chime rather
than a beep; triangle and square both carry an edge that becomes grating on repetition.

Everything sits an octave lower than a typical UI chirp. High frequencies are what make a sound
feel piercing, and C6/G6 territory is exactly the brightness that gets a feature muted.

| Tone | Shape | Notes |
| --- | --- | --- |
| `done` | rising perfect fifth | C5 523.25 Hz → G5 783.99 Hz, 90 ms each, 20 ms gap |
| `alert` | one pitch, twice, second softer | E5 659.25 Hz, 70 ms, 70 ms gap, 70 ms at 70% gain |

Rising reads as "finished"; a repeat reads as "your turn". With no falling tone in the set
nothing has to carry a negative meaning, which is why both can be consonant and warm. Each tone
is under 220 ms end to end. Master gain **0.06** — audible across a desk in a quiet room, not
across an office.

Two tones is few enough that they are told apart by shape alone, with no learning: one note
climbs, the other repeats.

Each note is a struck-bell envelope, not a gate: ramp linearly to peak over 6 ms, then
`exponentialRampToValueAtTime(0.0001)` across the rest of the note. This is not a detail. An
oscillator that starts or stops at full amplitude is a step discontinuity, which is a click, and
a click is most of what makes synthesized UI sound feel cheap. Exponential rather than linear
because a linear fade to zero still ends in a discontinuity, and `exponentialRamp` cannot target
exactly 0.

### Gate on the window-focus event stream, not on `document.hasFocus()` or `visibilityState`

Track focus in a module-level flag fed by `getCurrentWindow().onFocusChanged()` from
`@tauri-apps/api/window` — already a dependency, core API, no plugin. This is literally the same
event stream the Rust `AtomicBool` is fed from, so the two gates cannot drift.

*Rejected — `document.visibilityState`:* what haptics uses. It stays `visible` for a desktop
window sitting behind another window, which is exactly when the core fires a notification. Two
sounds for one event.

*Rejected — `document.hasFocus()`:* correct on desktop, but its behaviour in WKWebView and
Android WebView is not something to bet the mobile experience on; a spurious `false` silences
the feature with no way to tell.

*Rejected — `getCurrentWindow().isFocused()` per event:* it is async and answers off the UI event
loop. The Rust comment in `notify_done` documents this exact call arriving late. Not repeating it.

Seed the flag `true` (a just-launched app is in front, matching `AtomicBool::new(true)`) and fall
back to `document.hasFocus()` if the listener cannot be registered, which is the browser preview
at :1420 where there is no IPC bridge.

Note the honest limitation: the two gates are eventually consistent, not atomic. An event landing
in the microseconds around a focus change could in principle sound twice or not at all. Not worth
solving for a chirp.

### Sit under each platform's own mute, and pin it with `navigator.audioSession`

WebKit picks an audio-session category by what is making the sound, and the split matters here.
An `<audio>` or `<video>` element gets `Playback`, which ignores the Ring/Silent switch — that is
[WebKit bug 167788](https://bugs.webkit.org/show_bug.cgi?id=167788), and it is why web video plays
on a silenced phone. A bare `AudioContext` resolves through `auto` to `ambient`, which the switch
does mute. Synthesized oscillators put us on the second path, so **the iOS ringer switch silences
these tones**, which is the behaviour we want and matters more now that the app offers no switch
of its own.

Do not "fix" this. The known workaround is to loop a silent `HTMLAudioElement` to force the
session into `Playback` so Web Audio survives the switch. That is a technique for web games that
need sound; here it would override a hardware switch the user flipped on purpose and would also
make us duck other apps' audio. Refused, and named here so it is not later added as a bug fix.

Rather than rely on `auto` resolving the way we want, set `navigator.audioSession.type =
'ambient'` at unlock time, feature-detected. `ambient` is precisely the pair of properties we
need: mixable, so a tone never pauses or ducks someone's podcast, and subject to the ringer
switch. WebKit ships the `type` property (the state/event half is not enabled); Chromium does
not implement the API at all, so the assignment is guarded and is a no-op on Android and on
desktop Chromium-based webviews.

Mute behaviour therefore differs per platform, and none of it is ours:

| Platform | What silences a tone | What does not |
| --- | --- | --- |
| iOS | Ring/Silent switch or Action Button; media volume | Focus/DND, and per-app notification sound settings |
| Android | Media volume (`STREAM_MUSIC`) | Ringer/vibrate mode and DND, which govern other streams |
| Desktop | System or per-app volume | Nothing else exists |

**Notification-mute settings are the wrong axis for this feature.** A tone only plays while the
window is focused, and the OS notification only fires while it is not, so the two are mutually
exclusive by the focus gate: notification settings already own their whole branch, and nothing is
being bypassed. There is also no web API that can read Focus state, so honouring it directly is
not on the table.

**Android is the thin case:** no ringer-switch equivalent, so a phone on vibrate still chirps at
media volume. Accepted, and the reason the moment list is three items of soft sine at 0.06 gain
rather than a longer list at a comfortable volume.

### Module shape

One new file, `src/lib/sounds.ts`, a plain module deliberately mirroring `haptics.ts`: the same
header-comment style, the same "named by moment" rule, the same swallow-everything wrapper, and
export names matching its haptic counterparts (`transferDone`, `paired`, `arrived`) so a call
site reads as two parallel lines. No preference file and no `.svelte.ts`, because there is
nothing reactive to hold.

`initSoundFeedback()` is exported from the same file and called once from
`src/routes/+layout.svelte`. It wires the focus listener and the unlock listener; one call, one
place, and nothing to forget when a new route appears.

### One `AudioContext`, created inside the first user gesture

Every sound here is triggered by a backend event, and browsers suspend an `AudioContext` until a
user gesture. So create it *at unlock time* rather than at module load: a `pointerdown`/`keydown`
listener on `window` (`{once: true, capture: true, passive: true}`) constructs the context, calls
`resume()`, and plays a one-sample buffer at zero gain — WebKit has historically wanted an actual
buffer played inside the gesture, not just a `resume()`.

Creating it on demand means there is no suspended context to reason about: before the first
interaction the context is `null` and every `sounds.*` call is a no-op, which is exactly the
behaviour the spec asks for. The only case it loses is an offer arriving before the user has
touched anything at all (a deep-link cold start), and a silent first arrival is a fine price for
not having a second state to handle.

`latencyHint: 'interactive'` so a tone is not queued behind a large buffer.

## Risks / Trade-offs

- **[No way to turn it off]** → The defining trade-off, chosen deliberately. Mitigated by two
  tones over three moments instead of eleven, by never sounding bad news, by soft low sine tones
  at 0.06 gain, by the focus gate (nothing sounds unless you are already in the app), and by the
  iOS ringer switch working. The failure mode to watch for is the moment list growing later
  without the same reasoning being redone; the closing comment in `sounds.ts` exists to prevent
  exactly that.
- **[Android has no ringer-switch equivalent]** → A phone on vibrate still chirps at media volume,
  because WebView audio is on `STREAM_MUSIC` and ringer mode governs other streams. Known and
  accepted; media volume is the only out there.
- **[iOS WKWebView may still duck background audio]** → A chirp that pauses someone's podcast is
  worse than no chirp. Largely answered by pinning `ambient`, which is mixable by definition, and
  by tones being short and non-looping. Device check; if it still interrupts, the fallback is no
  sound on iOS rather than shipping the annoyance.
- **[The iOS ringer switch silences it]** → Expected and wanted, not a defect. Logged so it is not
  later filed as a bug and "fixed" with the silent-`<audio>` hack.
- **[No automated coverage]** → The repo's gates are `cargo test` and `go test -race`; there is no
  frontend test runner and this change adds none. Verification is `npm run check`, `npm run lint`,
  and hands on three platforms. Stated plainly rather than implied by a green build.
- **[Tones may still read as cheap or grating]** → The envelope and the low, quiet sine are the
  mitigation, and the listening pass is an explicit task on all three platforms. One table in one
  file to retune.
- **[Two gates on one event, eventually consistent]** → Accepted, see above.

## Open Questions

- If the iOS device check still shows ducking despite the `ambient` pin, is the answer no sound on
  iOS, or is a brief duck acceptable? Deferred to the evidence.
- Does 0.06 gain hold up on a phone speaker at low media volume, or is it inaudible there while
  being right on a laptop? A per-platform gain constant is the escape hatch if the listening pass
  says so.
