# receive-clipboard-detect

## ADDED Requirements

### Requirement: Clipboard is checked when the Receive tab gains focus

The app SHALL read the system clipboard via the native Wails clipboard API when the Receive tab becomes active, and when the application window regains focus while the Receive tab is active. The app SHALL NOT read the clipboard on a timer or at any other moment.

#### Scenario: Switching to the Receive tab

- **WHEN** the user switches the active tab from Send to Receive
- **THEN** the app reads the clipboard once via `Clipboard.Text()`

#### Scenario: Window regains focus on the Receive tab

- **WHEN** the application window regains OS focus while the Receive tab is active
- **THEN** the app reads the clipboard once via `Clipboard.Text()`

#### Scenario: Window regains focus on the Send tab

- **WHEN** the application window regains OS focus while the Send tab is active
- **THEN** the app does not read the clipboard

#### Scenario: Clipboard read fails

- **WHEN** the clipboard read rejects (e.g. browser preview without Wails runtime)
- **THEN** nothing is auto-filled and no error is surfaced

### Requirement: Detected croc codes are auto-filled into the empty code input

When the clipboard text, after trimming, matches the croc code pattern `^\d+-\w+-\w+-\w+$`, the app SHALL fill the receive code input with the detected code, but only if the input is empty or still holds an unmodified earlier auto-fill. The app SHALL NOT overwrite user-typed input and SHALL NOT start the receive automatically. Clipboard text that does not match SHALL be discarded immediately and SHALL NOT be displayed, stored, or logged.

#### Scenario: Clipboard holds a croc code and the input is empty

- **WHEN** the Receive tab gains focus, the input is empty, and the clipboard contains `2847-ocean-tiger-lamp`
- **THEN** the input value becomes `2847-ocean-tiger-lamp` and no receive is started

#### Scenario: Newer clipboard code replaces an unmodified auto-fill

- **WHEN** the input holds a previous auto-filled code the user has not edited and the clipboard now holds a different matching code
- **THEN** the input is updated to the new code

#### Scenario: User-typed input is never overwritten

- **WHEN** the input holds text the user typed or edited and the clipboard contains a matching code
- **THEN** the input value is unchanged

#### Scenario: Clipboard holds unrelated text

- **WHEN** the Receive tab gains focus and the clipboard contains text not matching the code pattern
- **THEN** nothing is filled and the clipboard content is not retained

#### Scenario: Clipboard code with surrounding whitespace

- **WHEN** the clipboard contains a croc code surrounded by leading/trailing whitespace
- **THEN** the trimmed code is used

### Requirement: Auto-filled values show provenance and a one-click clear

While the code input value equals the auto-filled value, the app SHALL show a hint below the input indicating the value came from the clipboard, with a clear control. The hint SHALL disappear when the value no longer equals the auto-filled value (user edits or clears).

#### Scenario: Provenance hint after auto-fill

- **WHEN** a code has been auto-filled and remains unmodified
- **THEN** a "from clipboard" hint with a clear control is visible below the input

#### Scenario: User edits the auto-filled value

- **WHEN** the user edits the auto-filled code in the input
- **THEN** the provenance hint disappears and the edited value is kept

#### Scenario: Clearing the auto-fill

- **WHEN** the user activates the clear control
- **THEN** the input becomes empty and the hint disappears

### Requirement: Auto-fill is suppressed when a receive is active or the value was cleared

The app SHALL NOT auto-fill while the receive session is not idle. A cleared value SHALL NOT be auto-filled again for the current app session; a different matching clipboard value SHALL re-enable auto-fill.

#### Scenario: Receive in progress

- **WHEN** a receive is connecting or receiving and the window regains focus with a code on the clipboard
- **THEN** the input is not modified

#### Scenario: Cleared value is not re-filled

- **WHEN** the user cleared the auto-fill for `2847-ocean-tiger-lamp` and the Receive tab later regains focus with the same clipboard value
- **THEN** the input stays empty

#### Scenario: New code after a clear

- **WHEN** the user cleared one auto-filled code and the clipboard later holds a different matching code
- **THEN** the new code is auto-filled
