## ADDED Requirements

### Requirement: The live progress display is one gauge and at most one moving figure

While a transfer is running, the panel's status zone SHALL be composed of, in this order and
nothing else:

1. **One circular progress gauge** carrying the percentage as a whole number. The gauge is the
   surface's largest element, it is tinted with the screen's accent (`--tint` for the filled
   arc, the muted track behind it), and the percent sits inside it. There SHALL NOT be a
   second progress indicator, linear or otherwise, on the screen.
2. **One line naming what is moving** — the current filename, with `· <n> of <total>` appended
   only when the transfer carries more than one file. It SHALL be ordinary single-line text,
   not a monospace read-out.

   The name SHALL be reduced before it is shown: anything up to the last path separator is
   dropped, so only the file's own name can reach the line whatever a platform's picker hands
   over, and a name longer than a fixed character limit is elided in the middle, keeping the
   start and the end (so the extension stays readable). The limit is a character count, not
   only CSS truncation, so the line's width is bounded whatever its container does.
3. **At most one moving figure**: bytes moved against the total (`128 MB / 2.1 GB`). It SHALL
   be set in tabular numerals so counting up does not reflow the line, and it SHALL be visibly
   quieter than the gauge and the filename.

The screen SHALL NOT show a byte rate, a transfer speed, or a time estimate in any state. The
phase word stays in the shared top bar (see the headerless-surface requirement) and the
percentage is the gauge's, so no state shows the same fact twice.

A phase with no measurable progress — a send getting ready, a receive connecting, either side
cancelling — SHALL show the shared spinner and its label rather than a gauge reading zero.

#### Scenario: Running transfer shows one gauge

- **WHEN** either transfer screen is in its sending or receiving state
- **THEN** a single circular gauge carries the whole-number percentage, tinted with that
  screen's accent, and no linear progress bar is rendered anywhere on the screen

#### Scenario: No rate and no estimate

- **WHEN** a transfer runs, whatever its speed, size, or duration
- **THEN** no transfer speed, byte rate, or time-remaining figure appears on the screen

#### Scenario: The bytes line does not reflow

- **WHEN** the bytes-moved figure counts up during a transfer
- **THEN** it is rendered in tabular numerals and the line's other content does not shift
  position as the digits change

#### Scenario: A long filename does not deform the surface

- **WHEN** the file being transferred has a very long name
- **THEN** the name is cut to the fixed character limit with the middle elided, on one line of
  ordinary text, and the gauge and the bytes line keep their position and size

#### Scenario: Only the file's own name is shown

- **WHEN** the name reported for the file being transferred contains path separators
- **THEN** only the part after the last separator is shown, on either platform's separator

#### Scenario: The extension survives the cut

- **WHEN** a name is long enough to be elided
- **THEN** the end of the name is kept along with the start, so its extension is still
  readable

#### Scenario: Multi-file transfers say where they are

- **WHEN** a transfer carries more than one file
- **THEN** the filename line also reports the position in the set, and a single-file transfer
  reports the name alone

#### Scenario: Indeterminate phases show the spinner

- **WHEN** a send is getting ready, a code receive is connecting, or either side is stopping
- **THEN** the shared spinner and its label are shown, and no gauge reading zero percent
  appears

#### Scenario: The gauge fits both panel layouts

- **WHEN** the progress display renders in the compact card and in the regular (roomy) one
- **THEN** the gauge is centered in the status zone at a size that fits both, with no
  platform-specific or breakpoint-specific progress code
