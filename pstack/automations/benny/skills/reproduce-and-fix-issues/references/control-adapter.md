# Control-adapter contract

Benny does not know how to start or drive every app. The user must configure one control skill or adapter that implements this contract for the target app.

Set its skill name in `control.skill_name`.

Set the completed user-facing feature map path in `control.feature_map_path`. Copy and fill [`feature-map.example.md`](./feature-map.example.md) outside `.cursor/automations/benny/` instead of editing the copied example.

If the skill, feature map, or a required capability is absent, ambiguous, or incomplete, repro and fix work must fail closed.

## Required capabilities

### Bring up

Start the requested app revision in the requested test environment.

Input:

- Repository and revision
- Build or start mode
- Workspace, account, fixture, and feature-state requirements
- Artifact directory
- Completed feature-map path

Return:

- Session identifier
- How the adapter confirmed the correct app and environment
- Stable app markers
- Running process or target details needed by later calls
- Any missing capability

The adapter must distinguish the target app from a similar window, shell, or production instance.

### Drive UI

Perform real user actions:

- Click
- Type
- Press keys
- Scroll
- Drag
- Resize
- Navigate through app controls

Prefer roles, labels, and stable selectors. Use coordinates only after a fresh screenshot.

Return each action and the observed state change.

Do not set internal state, call hidden app methods, write directly to storage, or inject DOM changes to create the symptom.

### Drive mapped features and states

Read the relevant feature-map section before driving the app.

The adapter must expose ways to:

- Navigate every mapped feature through the user-visible path.
- Invoke the adapter action names listed for that feature.
- Interact with default, hover, focus-visible, active, disabled, loading, empty, error, selected, open, expanded, and feature-specific states when they apply.
- Arrange a state through safe fixture data, permissions, flags, service responses, or supported test controls.
- Reset the feature for a second independent repro attempt.
- Capture the screenshot, video, and read-only cross-check named by the feature map.

Use roles, accessible names, ARIA relationships, stable component markers, and purpose-named data attributes. Never use generated CSS or StyleX classes, dynamic hashes, child indexes, or brittle DOM position.

Arranging a precondition is not permission to inject the reported symptom. The repro itself must still come from real user interaction.

### Inspect state

Read state to confirm what the UI shows.

Examples:

- Accessibility tree
- DOM or view hierarchy
- Process state
- Local logs
- Network request status
- App-exposed debug state

Inspection is read-only. If a query changes state, it belongs in `drive UI` and must represent a real user action.

### Screenshot

Capture the current app state to a requested path.

Return:

- File path
- Capture time
- App marker or window title
- Short description of what should be visible

The screenshot must show enough app chrome to prove that the correct app is under test.

### Recording

Start and stop a screen recording around the full repro path.

Return:

- File path
- Start and stop times
- Captured window or region
- Whether audio or sensitive overlays were omitted

The recording must show the discriminating final state, not only setup or a loading screen.

### Cleanup

Stop processes and sessions created by the adapter.

Remove disposable:

- Browser or app profiles
- Temporary workspaces
- Test accounts or fixtures when the adapter created them
- Debug ports and tunnels
- Captures past their retention window

Return what was stopped, removed, retained, or left for a person.

Cleanup must not delete user work.

## Adapter behavior

The adapter must:

- Report capabilities before the repro starts.
- Report which feature-map sections it can drive and which are blocked.
- Use the same environment inputs for baseline and patched builds.
- Surface startup failures as failures.
- Bound retries.
- Keep secrets out of logs and artifacts.
- Keep captures outside the repository.
- Support a fresh or reset state between the two repro attempts.
- Avoid production changes unless the user explicitly configured a safe test action.

## Environment translation

Before declaring an environment block, restate the defect without platform-specific nouns and ask whether the same behavior can be tested safely in the available environment.

Examples:

- A named browser may mean any external browser.
- A named key may mean the configured shortcut.
- A named remote host may mean a delayed or disconnected remote target.

Use a translated attempt only when it tests the same underlying behavior. Label it as translated evidence. Do not call it an exact repro when the missing environment is part of the defect.

Hardware prompts, operating-system permission dialogs, device-only APIs, and unavailable account states may be real blocks.

## Setup check

Before enabling the repro automation, run one harmless adapter check:

1. Bring up the app.
2. Confirm the stable app marker.
3. Load one completed feature-map section.
4. Navigate to that feature through its user path.
5. Exercise one disposable state through mapped adapter actions.
6. Inspect the resulting state.
7. Capture a screenshot.
8. Record a short clip.
9. Clean up.

Enable repro work only when all nine steps succeed and no source-channel Slack post is involved.
