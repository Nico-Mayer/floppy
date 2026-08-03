## ADDED Requirements

### Requirement: A completion screen names no filesystem path

The shared completion screen SHALL NOT display a filesystem path. It carries a short title, a
success mark, and an optional plain-language line (who the files went to, or came from), and
nothing that reads as a path. The shared component SHALL NOT offer a monospace-path variant
for one to be passed through.

Where received files landed SHALL be answered by action and by settings instead: desktop keeps
the open-folder control on the completion screen, which reveals the exact folder in the
platform's file manager, and the resolved save location stays readable in Settings (see
`download-destination`).

#### Scenario: Receive completion shows no path

- **WHEN** a receive finishes and the completion screen renders
- **THEN** no absolute or partial filesystem path is shown, on any platform

#### Scenario: The folder is still one press away on desktop

- **WHEN** a receive finishes on desktop
- **THEN** the open-folder control is present and opens the transfer's own destination folder

#### Scenario: No path variant to pass

- **WHEN** the shared completion component's props are inspected
- **THEN** it exposes no monospace or path-styled description variant
