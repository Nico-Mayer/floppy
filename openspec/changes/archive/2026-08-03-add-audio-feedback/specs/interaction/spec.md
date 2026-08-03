## ADDED Requirements

### Requirement: Sound feedback marks a flow finishing or a flow needing an answer

The app SHALL play a short tone at exactly three moments, using two tones between them. The
moments that make a sound SHALL be a strict subset of the moments that fire a haptic:

- a transfer finishing, in either direction (the done tone)
- a pairing completing (the done tone, the same note as a finished transfer)
- an incoming transfer offer or a pairing confirm request appearing (the alert tone)

The done tone SHALL be shared by the two completions rather than split, because both report the
same fact: the thing the user was waiting on has finished. The two tones SHALL be tellable apart
without looking at the screen.

Every moment the user causes with their own finger SHALL be silent: copying a code, removing a
file from the send queue, reading a QR code, accepting or declining an offer, crossing the
pull-to-refresh trigger, and changing destination. Those happen with a finger on the control and
eyes on the result, so a tone adds nothing, and unlike a haptic a whole room can hear it.

The other device accepting a trusted send SHALL be silent. It is a step inside a flow rather than
its outcome, and the completion tone follows it within seconds; two tones seconds apart read as a
malfunction rather than as two facts.

#### Scenario: Transfer completion is heard

- **WHEN** a transfer finishes with the app focused
- **THEN** the done tone plays once

#### Scenario: Pairing completion is heard, with the same note

- **WHEN** a pairing completes with the app focused
- **THEN** the done tone plays once, and it is the same tone a finished transfer plays

#### Scenario: An arriving offer is heard, and is distinct from completion

- **WHEN** an incoming transfer offer or a pairing confirm request appears with the app focused
- **THEN** the alert tone plays once, and it is audibly different from the done tone

#### Scenario: Finger-driven moments are silent

- **WHEN** the user copies a code, removes a file from the queue, scans a QR code, accepts or
  declines an offer, crosses the pull-to-refresh trigger, or changes destination
- **THEN** no tone plays, and the haptic for that moment still fires on a touch device

#### Scenario: The other device saying yes is silent

- **WHEN** a trusted send the user is waiting on is accepted by the other device
- **THEN** no tone plays, the medium haptic still fires on a touch device, and the done tone
  plays only when the transfer itself finishes

#### Scenario: Ordinary taps are silent

- **WHEN** the user taps a control that is not one of the listed moments
- **THEN** no tone plays

### Requirement: Sound feedback never carries bad news

No failure SHALL make a sound. A transfer failing mid-flight, a pairing failing, and the other
device declining SHALL all be silent, even though each fires an error-weight haptic and each
shows on screen.

This asymmetry is deliberate. A failure raises no OS notification, and a tone only plays while
the window is focused, so a failure tone could only ever reach someone who already had the error
in front of them. An unpleasant noise adds nothing there, and it is the worst thing to hand
someone who has no way to switch it off. Failures are shown, not sounded.

#### Scenario: A failed transfer is silent

- **WHEN** a transfer fails mid-flight with the app focused
- **THEN** no tone plays, the error-weight haptic still fires on a touch device, and the failure
  is shown on screen as it is today

#### Scenario: A failed pairing is silent

- **WHEN** a pairing attempt fails with the app focused
- **THEN** no tone plays and the failure is shown on screen as it is today

#### Scenario: A decline is silent

- **WHEN** the other device declines a trusted send with the app focused
- **THEN** no tone plays and the decline is shown on screen as it is today

### Requirement: Tones are quiet and short, because there is no way to turn them off

The app SHALL NOT offer a control that disables sound feedback. Restraint SHALL take the place of
that control: the moment list above is deliberately short, and every tone SHALL be quiet and
brief enough to stay pleasant on repeat, in a shared room, for someone who cannot switch it off.

Each tone SHALL last under a quarter of a second end to end, SHALL play well below full scale
rather than at a level that carries across a room, and SHALL rise and fall through a smooth
amplitude envelope so that no note begins or ends with an audible click. No tone SHALL be
harsh, dissonant, or alarming.

Any future addition to the moment list SHALL be justified against the same reasoning the list
was built from, and SHALL NOT be a failure.

#### Scenario: No sound setting exists

- **WHEN** the user looks through the app's settings for a way to turn sound off
- **THEN** no such control exists, and the app relies on the platform's own volume and silencing
  controls instead

#### Scenario: Tones are brief

- **WHEN** either tone plays
- **THEN** it finishes within a quarter of a second

#### Scenario: Tones do not click

- **WHEN** any tone plays
- **THEN** no note starts or ends with an audible click or pop

#### Scenario: Repetition stays tolerable

- **WHEN** a person completes many transfers in a row within earshot of others
- **THEN** the tones remain unobtrusive at the app's own level, without anyone needing to reach
  for a volume control

### Requirement: Sound feedback runs on every device, not only touch devices

Sound feedback SHALL NOT be gated on pointer type. Haptics are a no-op on a fine pointer because
a mouse has nothing to feel them with; a desktop has speakers, and a desktop is the case with no
other non-visual channel at all. On a touch device the tone and the haptic for the same moment
SHALL both fire, as one event reported through two channels.

#### Scenario: Desktop hears what it cannot feel

- **WHEN** a transfer finishes on a desktop with the window focused
- **THEN** the done tone plays, even though no haptic is attempted

#### Scenario: A phone both feels and hears

- **WHEN** a transfer finishes on a phone with the app in front
- **THEN** the success-weight haptic fires once and the done tone plays once

### Requirement: Sound feedback is gated on window focus, not page visibility

A tone SHALL play only while the app window has focus. Where the app is not focused, the OS
notification for the same event carries the alert with the system's own sound settings, and the
app SHALL NOT add a second sound for one event.

This gate SHALL be window focus rather than page visibility. A desktop window that is visible
but behind another window reports itself visible while the core treats it as background and
raises a notification, so a visibility gate would let both sound at once. The focus gate is the
webview's view of the same predicate the core's notification gate reads.

#### Scenario: An unfocused desktop window does not sound twice

- **WHEN** a transfer finishes while the app window is visible on screen but not focused
- **THEN** the app plays no tone of its own, and the OS notification alerts by the system's own
  settings

#### Scenario: A backgrounded phone does not sound twice

- **WHEN** an incoming offer arrives while the app is in the background on a phone
- **THEN** the app plays no tone of its own, and the OS notification alerts by the system's own
  settings

#### Scenario: A focused window sounds and shows no notification

- **WHEN** an incoming offer arrives while the app window is focused
- **THEN** the alert tone plays and no OS notification is shown, matching the existing foreground
  notification suppression

### Requirement: Sound feedback sits under the platform's own mute and never overrides it

Where the operating system provides a control that silences app audio, sound feedback SHALL be
subject to it, and the app SHALL NOT take any step to escape it. Tones SHALL be produced in a
mixable, ambient audio mode: one that plays alongside whatever else is making sound rather than
pausing, ducking, or taking the audio session from it, and one that the platform's own silencing
control applies to.

The app SHALL NOT use the technique of holding an inaudible media element open to promote the
audio session to a playback mode. That would let a tone sound through a switch the user
deliberately flipped, and would make the app duck other audio.

Where the platform offers no such control, the platform's media volume SHALL be the only control,
and no substitute SHALL be invented.

#### Scenario: A silenced phone plays no tone

- **WHEN** the device's hardware silencing control is engaged and a transfer finishes with the
  app in front
- **THEN** no tone is heard, while the haptic still fires and the completed state still shows

#### Scenario: A tone does not interrupt what the user is listening to

- **WHEN** audio is playing from another app and any of the listed moments occurs with the app in
  front
- **THEN** the other app's audio keeps playing without being paused, and is not ducked

#### Scenario: Notification mute settings govern the notification, not the tone

- **WHEN** the user has silenced the app's notifications through a focus mode or a per-app
  notification sound setting, and a transfer finishes with the window focused
- **THEN** the tone plays, because no OS notification is raised for a focused window and the two
  never sound for the same event

### Requirement: Sound feedback is independent of reduced-motion

Sound feedback SHALL NOT be suppressed by the `prefers-reduced-motion` setting. That setting
concerns visual and vestibular motion and says nothing about hearing.

#### Scenario: Reduced motion keeps sound

- **WHEN** the user has reduced motion enabled and a transfer finishes with the window focused
- **THEN** the done tone still plays while visual animation remains reduced

### Requirement: Sound feedback never becomes a failure

A failure to produce a tone SHALL never surface to the user, never be reported as an error, and
never interrupt the action that asked for it. A webview that blocks playback until a user
gesture, a machine with no audio output, a muted output device, and an audio subsystem that
refuses to start SHALL all be indistinguishable from success as far as the app's behaviour is
concerned.

Because every moment that plays a tone is driven by a backend event rather than by a tap,
playback SHALL be prepared on the user's first interaction of the session so a later
event-driven tone is not refused for want of a gesture. That preparation SHALL happen once, SHALL
be silent, and SHALL itself never surface a failure.

#### Scenario: Blocked playback does not break a transfer

- **WHEN** the webview refuses to play a tone for any reason
- **THEN** the transfer, pairing, or arrival completes and displays normally, no error is shown,
  and nothing is logged as a failure

#### Scenario: The first event-driven tone is not swallowed

- **WHEN** the user has interacted with the app at least once and a transfer then finishes with
  the window focused
- **THEN** the done tone plays, rather than being refused for want of a user gesture

#### Scenario: Preparation is inaudible

- **WHEN** the user's first interaction of the session is an ordinary tap or keypress
- **THEN** nothing is heard from it
