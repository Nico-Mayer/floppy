# connectivity-health

## ADDED Requirements

### Requirement: The two links a transfer depends on are observed

The app SHALL observe the reachability of the two pieces of network a transfer depends on,
and SHALL treat them as two independently reported links:

- the **relay link**: whether the iroh endpoint is connected to a home relay, taken from the
  endpoint's own home-relay connection status rather than from a probe of our own;
- the **broker link**: whether this device is registered on the rendezvous broker, taken from
  the state of the connection the broker client already maintains.

Neither link SHALL be observed by polling a health endpoint or by opening a connection that
exists only to be measured. Observation SHALL be passive: it reads state the app keeps for
its own reasons anyway.

The relay link SHALL be observed for the lifetime of the endpoint, not only at startup, so a
relay that drops or returns mid-session is reported.

#### Scenario: Relay state comes from the endpoint

- **WHEN** the endpoint's home-relay connection status changes
- **THEN** the relay link is re-reported from that status, and no separate request is made to
  the relay to find out

#### Scenario: Broker state comes from the connection already held

- **WHEN** the broker client's connection is established and registered, and later drops
- **THEN** the broker link is reported up on the registration acknowledgement and down when
  the connection fails, with no extra probe of the broker

#### Scenario: A mid-session relay drop is noticed

- **WHEN** the relay connection is lost while the app sits idle
- **THEN** the relay link is reported down without the user starting anything

### Requirement: Each link is up, down, or not yet known

A link SHALL carry one of three states: **up**, **down**, or **unknown**. `unknown` is the
state at launch and means the app has not yet earned an answer; it SHALL NOT be presented as
either good or bad news.

The relay link SHALL NOT be reported down merely because no relay connection exists yet: at
launch, and before a home relay has been selected, the absence of a connected relay is
indistinguishable from a relay that is still being picked. The relay link SHALL therefore
stay `unknown` until either a relay reports connected, or a bounded grace window from the
endpoint's construction has passed with none connected, at which point it is `down`.

The broker link needs no such window, because a failed connection attempt is an unambiguous
answer, and SHALL go `down` on the first failed attempt.

Once a link has been `up`, later transitions in either direction SHALL be reported at once.
The grace window is a launch concession and SHALL NOT act as a debounce afterwards.

#### Scenario: A cold start reports nothing yet

- **WHEN** the app has just launched and the endpoint has not yet connected to a relay
- **THEN** the relay link is `unknown`, not `down`

#### Scenario: A relay that never connects is eventually down

- **WHEN** the grace window from endpoint construction passes with no relay connected
- **THEN** the relay link is `down`

#### Scenario: A relay that connects late is up, not down

- **WHEN** a relay connects within the grace window
- **THEN** the relay link is `up` and no down state was ever reported

#### Scenario: A later drop is immediate

- **WHEN** a link that has been `up` fails
- **THEN** it is reported `down` immediately, with no grace window applied

#### Scenario: The first failed broker attempt is an answer

- **WHEN** the broker client's first connection attempt fails
- **THEN** the broker link is `down`

### Requirement: Health is available as a snapshot and as changes

The frontend SHALL be able to read the current state of both links on demand, and SHALL also
receive the state whenever it changes. Both SHALL be part of the generated IPC contract, so
neither a command name nor an event name nor a payload type is written by hand on the
frontend.

The change notification SHALL carry the whole state of both links, not a per-link delta, so a
missed or dropped notification cannot leave the frontend holding a mixture of old and new.

A report SHALL be emitted only when a link's state actually changes. Re-observing a link in
the state it already holds SHALL emit nothing.

#### Scenario: A screen that opens mid-session starts from the truth

- **WHEN** a screen that shows connection state is opened after the app has been running
- **THEN** it reads the current state of both links immediately, rather than waiting for the
  next change

#### Scenario: A change reaches an open screen

- **WHEN** either link changes state while a screen is open
- **THEN** that screen sees the new state without being reopened

#### Scenario: The payload is whole, not partial

- **WHEN** one link changes state
- **THEN** the reported payload states both links, so the receiver replaces its whole copy

#### Scenario: A restated link is silent

- **WHEN** a link is observed in the state it is already in
- **THEN** nothing is reported

### Requirement: Health informs but never gates

Connection health SHALL NOT block, disable, or refuse any transfer action. A send, a receive,
a quick share, and a pairing SHALL all remain startable while either link is `down`, because
two devices on one local network can transfer with no relay at all, and a down link is a
warning about the likely outcome rather than a verdict on it.

The existing typed transfer errors SHALL remain the only authority on an actual failure.
Health SHALL NOT be turned into a transfer error, and a transfer error SHALL NOT change a
link's reported state.

#### Scenario: A down link does not disable the controls

- **WHEN** the relay link, the broker link, or both are `down`
- **THEN** every transfer control stays enabled and a transfer can still be started

#### Scenario: Health is not a failure

- **WHEN** a link goes `down` while no transfer is running
- **THEN** no transfer error is raised and no transfer surface reports a failure

#### Scenario: A failure is not a health report

- **WHEN** a transfer fails to connect
- **THEN** the link states are unchanged by that failure alone

### Requirement: Health copy names no infrastructure

User-visible text about connection health SHALL be written for a person who has never heard
of a relay or a broker. It SHALL NOT contain the words "relay", "broker", "endpoint",
"socket", "WebSocket", or "rendezvous", and SHALL NOT show a URL, a host name, or an
underlying error string.

Each state SHALL say what is wrong in one short line and give the one thing worth trying.
Where something still works despite the failure, the copy SHALL say so rather than implying
nothing will work.

#### Scenario: No jargon reaches the screen

- **WHEN** any connection warning is shown
- **THEN** its text names no piece of infrastructure, no URL, and no underlying error

#### Scenario: The warning says what to try

- **WHEN** a connection warning is shown
- **THEN** it states what is wrong and one thing the person can do about it

#### Scenario: A relay-only failure says what still works

- **WHEN** only the relay link is `down`
- **THEN** the copy says that sending to a device on the same network can still work
