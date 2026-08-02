## MODIFIED Requirements

### Requirement: The floating add button opens one sheet offering files and the photo library

Activating the floating add button SHALL open a bottom sheet offering exactly two choices:
one for files and one for the photo library. Choosing files SHALL open the platform's native
file picker, the same one the app already uses, and any files chosen SHALL be appended to
the queue. Choosing the photo library SHALL open the platform's own photo picker, offering
both photos and videos, and anything chosen SHALL be appended to the same queue in the same
way. Neither choice SHALL carry a preview marker.

Items picked from the photo library SHALL be queued and sent exactly as they are, with no
conversion, re-encoding, or downscaling of any kind. An item the app cannot decode for a
preview SHALL keep the queue's generic tile rather than being converted so it can be
previewed.

The sheet SHALL dismiss itself before the native picker is presented, so the two surfaces are
never stacked.

#### Scenario: The sheet offers both choices

- **WHEN** the user taps the floating add button
- **THEN** a bottom sheet opens showing a files choice and a photo library choice, neither
  carrying a preview marker

#### Scenario: Files opens the working picker

- **WHEN** the user chooses files and picks one or more files
- **THEN** the sheet is closed and the chosen files are appended to the send queue, exactly
  as picking from the empty state does today

#### Scenario: The photo library opens the platform's photo picker

- **WHEN** the user chooses the photo library
- **THEN** the sheet is closed and the platform's own photo picker is presented, showing
  photos and videos

#### Scenario: Picked photos and videos join the queue

- **WHEN** the user selects one or more items in the photo picker
- **THEN** they are appended to the send queue with their name and size, and they send and
  preview through the same path as a file picked from the file picker

#### Scenario: Picked items are not converted

- **WHEN** an item is picked whose format the app cannot decode for a preview
- **THEN** it is queued and sent byte for byte in its original format
- **AND** its tile shows the generic file tile with its extension rather than a thumbnail

#### Scenario: Dismissing the sheet changes nothing

- **WHEN** the user dismisses the sheet without choosing
- **THEN** the queue is unchanged and the Send screen returns to where it was

#### Scenario: Cancelling either picker changes nothing

- **WHEN** the user opens either picker from the sheet and cancels it without choosing
- **THEN** the queue is unchanged and no error is shown
