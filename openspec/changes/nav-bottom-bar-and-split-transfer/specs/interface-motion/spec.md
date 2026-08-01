## ADDED Requirements

### Requirement: Destination changes are animated in the direction of travel

Moving between the Send and Receive destinations SHALL animate in the direction of travel, so
that moving forward through the destination list and back again read as movement in opposite
directions rather than as two identical swaps.

The direction SHALL be derived from the change in position within the shared destination list,
not from the control or gesture that caused it, so every route into the change animates
consistently: a bar tap, a sidebar click, a keyboard shortcut, and a programmatic navigation from
an accepted transfer all produce the same motion.

A surface waiting on data SHALL show placeholder shapes matching the content it is loading,
rather than an unplaced spinner.

#### Scenario: Destination change moves in the direction of travel

- **WHEN** the user moves from Send to Receive, by any means
- **THEN** the outgoing content leaves and the incoming content arrives in the direction that
  matches the change, and moving back reverses the direction

#### Scenario: Every route into the change agrees

- **WHEN** the user reaches a destination by tapping the bar, clicking the sidebar, pressing its
  shortcut, or being taken there by an accepted transfer
- **THEN** the animation direction is the same in every case, because it is derived from the
  destinations' positions rather than from the control used

#### Scenario: A loading list shows its shape

- **WHEN** a surface in the app loads a list of items
- **THEN** it shows placeholder rows resembling those items rather than a centred spinner

## REMOVED Requirements

### Requirement: Mode changes and loading states are animated in place of blank swaps

**Reason**: Send and Receive are no longer two modes of one screen but two destinations, so the
requirement's subject no longer exists. Its two loading scenarios described the activity
timeline, which this change deletes.

**Migration**: The direction-of-travel behaviour is preserved and restated for destinations in
"Destination changes are animated in the direction of travel" above, with the direction now
derived from position in the shared destination list so that programmatic navigation animates
correctly too. The placeholder-shapes rule is carried over as a standing rule; it currently has
no subject, since the only list that showed loading placeholders was the activity timeline.
