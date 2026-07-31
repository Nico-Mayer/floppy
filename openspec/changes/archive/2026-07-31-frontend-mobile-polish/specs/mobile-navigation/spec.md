## MODIFIED Requirements

### Requirement: The drawer is reachable and dismissable one-handed

The menu control SHALL remain a visible, tappable affordance so the drawer is reachable
without knowing the gesture, and the drawer SHALL be dismissable by tapping the overlay,
by choosing a destination, by dragging it back toward the edge it came from, and (on Android)
by the hardware back button. While the drawer is open it MAY cover the menu control; closing
does not depend on it.

The drag dismissal SHALL follow the finger, SHALL commit on either distance or release
velocity, SHALL animate back to open when it commits to neither, and SHALL fade the overlay in
proportion to the drag so the gesture's effect is visible before it is released.

Opening remains a discrete action rather than a tracked drag: the menu control and the
left-edge swipe both open the drawer at once, and the drawer animates in. The opening gesture
SHALL NOT be required to track the finger.

#### Scenario: Overlay tap closes the drawer

- **WHEN** the drawer is open and the user taps the dimmed area outside it
- **THEN** the drawer closes and no navigation occurs

#### Scenario: Hardware back closes the drawer first

- **WHEN** the drawer is open on Android and the hardware back button is pressed
- **THEN** the drawer closes instead of the app closing or navigation changing

#### Scenario: Dragging the drawer back closes it

- **WHEN** the drawer is open and the user drags it toward the edge it came from past the
  commit distance
- **THEN** the drawer follows the finger during the drag and closes on release

#### Scenario: A flick closes the drawer

- **WHEN** the user flicks the open drawer toward its edge above the velocity threshold but
  below the commit distance
- **THEN** the drawer closes

#### Scenario: An abandoned drag returns to open

- **WHEN** the user drags the open drawer partway and releases below both thresholds
- **THEN** the drawer animates back to fully open and no navigation occurs

#### Scenario: The overlay tracks the drag

- **WHEN** the user drags the open drawer partway toward its edge
- **THEN** the dimmed overlay lightens in proportion to the drag distance

#### Scenario: Opening is a discrete action

- **WHEN** the user taps the menu control or swipes in from the left edge past its threshold
- **THEN** the drawer opens and animates in, without requiring the gesture to track the finger

## ADDED Requirements

### Requirement: The drawer owns the left edge strip exclusively

A horizontal gesture beginning within 24 CSS pixels of the left screen edge SHALL belong to the
navigation drawer on every screen, and no other horizontal gesture SHALL respond to it. The
reserved width SHALL be defined once and read by every other horizontal gesture, so the
reservation cannot drift between screens.

#### Scenario: Edge swipe opens the drawer over a swipeable screen

- **WHEN** the user swipes in from the left edge while on a screen that has its own horizontal
  gesture
- **THEN** the drawer opens and that screen's gesture does not activate

#### Scenario: A swipe just inside the strip belongs to the screen

- **WHEN** a horizontal gesture begins beyond the reserved edge width
- **THEN** the screen's own gesture handles it and the drawer does not open

#### Scenario: The reservation is defined once

- **WHEN** the reserved edge width changes
- **THEN** every horizontal gesture in the app observes the new width without separate edits

### Requirement: The drawer clears safe areas as a floating panel

The mobile navigation drawer SHALL clear the status bar, the home indicator, and the gesture
rails on every platform, whether it renders edge to edge or as an inset floating panel. Its
footer SHALL stay clear of the bottom inset so the account row is never under the gesture bar.

#### Scenario: Drawer content clears the status bar and gesture bar

- **WHEN** the drawer is open on a phone with a notch and a gesture bar
- **THEN** no drawer content is obscured at the top or bottom, and its footer sits above the
  gesture bar

#### Scenario: Drawer sits below the app bar

- **WHEN** the drawer is open on a phone
- **THEN** it begins below the app bar rather than covering the app's title area
