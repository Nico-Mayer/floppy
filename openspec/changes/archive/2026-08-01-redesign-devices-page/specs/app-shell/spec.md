## ADDED Requirements

### Requirement: A bottom surface's inset and its own padding do not stack

A bottom sheet or drawer SHALL keep its last control clear of the screen edge by whichever is
larger: the platform's bottom safe-area inset, or the surface's own spacing. It SHALL NOT add
them together. They are two answers to one question — how far the last control sits from the
bottom edge — and summing them left roughly 50px of dead space under a drawer on a phone with a
home indicator.

Safe-area rules for these portaled surfaces SHALL win over the surfaces' own spacing utilities. A
safe-area inset that a component's own padding class can quietly override is not an inset, and
the failure is invisible on a desktop where every inset is zero.

#### Scenario: A phone with a home indicator gets one inset, not two

- **WHEN** a bottom drawer opens on a device that reports a bottom inset
- **THEN** the space under its last control is that inset, not the inset plus the surface's padding

#### Scenario: A device with no inset still has room

- **WHEN** a bottom drawer opens where the bottom inset is zero
- **THEN** its last control still has the surface's own spacing beneath it

#### Scenario: Component spacing does not defeat the safe-area inset

- **WHEN** a drawer surface carries its own padding utility
- **THEN** the safe-area inset still applies

### Requirement: A focused field is brought clear of the soft keyboard

When a soft keyboard opens over a field, the app SHALL bring that field into the part of the
screen the keyboard is not covering. This SHALL be measured against the visual viewport, which
is the one the keyboard shrinks: the shell asks for a keyboard that overlays rather than
resizes, so the layout viewport still reports the field as on screen and the browser's own
scroll-into-view does nothing.

The app SHALL scroll the region the field lives in, not the window: the document is pinned to
the window height and cannot scroll, so scrolling it moves nothing.

Where that region has nothing left to scroll — a short page, a field near its end — the app
SHALL give the region enough room to scroll the field clear, and SHALL take that room back once
the field is blurred or the keyboard is gone. Moving focus from one field straight to another
SHALL NOT flicker the room away and back.

This SHALL apply on phone and tablet builds, where a soft keyboard covers the viewport, and
SHALL do nothing on desktop.

#### Scenario: A field low on the page comes into view

- **WHEN** the user focuses a field near the bottom of a scrolling page on a phone
- **THEN** the field is visible above the keyboard once the keyboard has opened

#### Scenario: A short page still yields room

- **WHEN** the page is too short to scroll and the focused field is behind the keyboard
- **THEN** the field is still brought into view, and the page returns to its normal length after
  the field is blurred

#### Scenario: Moving between fields does not thrash the layout

- **WHEN** focus moves directly from one field to another with the keyboard already open
- **THEN** both end up visible and the page does not jump back to its unpadded length in between

#### Scenario: Desktop is untouched

- **WHEN** a field is focused on a desktop build
- **THEN** nothing scrolls and no room is added
