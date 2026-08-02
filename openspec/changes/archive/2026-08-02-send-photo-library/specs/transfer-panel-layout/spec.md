## ADDED Requirements

### Requirement: The floating add button opens one sheet offering files and photos

Activating the floating add button SHALL open a bottom sheet offering exactly two choices:
one for files and one for photos. Choosing files SHALL open the platform's native file picker,
the same one the app already uses, and any files chosen SHALL be appended to the queue.
Choosing photos SHALL open the platform's own photo picker, offering both photos and videos,
and anything chosen SHALL be appended to the same queue in the same way. Neither choice SHALL
carry a preview marker.

The app SHALL queue and send whatever the picker hands back exactly as it is, with no
conversion, re-encoding, or downscaling of any kind. An item the app cannot decode for a
preview SHALL keep the queue's generic tile rather than being converted so it can be
previewed.

Where the platform's own picker hands back a converted rendition rather than the original
asset, the app SHALL queue that rendition as-is: it SHALL NOT convert it further, and SHALL NOT
try to undo the conversion.

The sheet SHALL dismiss itself before the native picker is presented, so the two surfaces are
never stacked.

#### Scenario: The sheet offers both choices

- **WHEN** the user taps the floating add button
- **THEN** a bottom sheet opens showing a files choice and a photos choice, neither carrying a
  preview marker

#### Scenario: Files opens the working picker

- **WHEN** the user chooses files and picks one or more files
- **THEN** the sheet is closed and the chosen files are appended to the send queue, exactly
  as picking from the empty state does today

#### Scenario: Photos opens the platform's photo picker

- **WHEN** the user chooses photos
- **THEN** the sheet is closed and the platform's own photo picker is presented, showing
  photos and videos

#### Scenario: Picked photos and videos join the queue

- **WHEN** the user selects one or more items in the photo picker
- **THEN** they are appended to the send queue with their name and size, and they send and
  preview through the same path as a file picked from the file picker

#### Scenario: The app converts nothing

- **WHEN** an item reaches the queue from either picker
- **THEN** it is sent byte for byte as the picker handed it over, in that format

#### Scenario: A format the app cannot preview keeps its tile

- **WHEN** an item is queued whose format the app cannot decode for a preview
- **THEN** its tile shows the generic file tile with its extension rather than a thumbnail
- **AND** it is not converted so that it could be previewed

#### Scenario: The platform converted it first

- **WHEN** the platform's photo picker hands back a converted rendition instead of the original
  asset, as iOS does when it returns a JPEG for a HEIC
- **THEN** that rendition is what is queued and sent, unchanged
- **AND** the app neither converts it further nor tries to recover the original

#### Scenario: Dismissing the sheet changes nothing

- **WHEN** the user dismisses the sheet without choosing
- **THEN** the queue is unchanged and the Send screen returns to where it was

#### Scenario: Cancelling either picker changes nothing

- **WHEN** the user opens either picker from the sheet and cancels it without choosing
- **THEN** the queue is unchanged and no error is shown

## REMOVED Requirements

### Requirement: The floating add button opens one sheet offering files and the photo library

**Reason**: The photo row is built, so the half of this requirement that specified it as a
preview marker doing nothing is now false. Replaced rather than modified because its
"Photo library is honest about being unbuilt" scenario has no successor: there is nothing
unbuilt left on the sheet to be honest about. The row is also labelled "Photos" now, to sit
beside "Files" and to avoid promising a library of photos alone when it takes video too.

**Migration**: None for the user. The replacement requirement above keeps every other scenario
of this one unchanged and adds the picker, conversion, and cancel behaviour.
