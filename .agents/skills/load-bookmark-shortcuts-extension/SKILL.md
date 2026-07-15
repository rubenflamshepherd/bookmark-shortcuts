---
name: load-bookmark-shortcuts-extension
description: Load, reload, and verify this Bookmark Shortcuts repository as an unpacked Google Chrome extension on macOS. Use when the user asks to load the unpacked extension, install the repository locally in Chrome, refresh it after source or manifest changes, or verify that Chrome is running the repository's current extension version.
---

# Load Bookmark Shortcuts Extension

Load the repository into the user's regular Google Chrome profile and verify the result. If the user only asks for instructions, explain the workflow without controlling Chrome.

## Guardrails

- Resolve the repository root from the directory containing `manifest.json`.
- Read `manifest.json` and note its `version` before touching Chrome.
- Record `git status --short`. Preserve every existing change.
- Never edit Chrome's `Preferences` or `Secure Preferences` files.
- Never quit the user's regular Chrome session or substitute a temporary Chrome profile without explicit approval.
- Prefer reloading an existing unpacked entry over loading a duplicate.
- Treat the extension as successfully loaded only after Chrome displays the expected manifest version.

## Open and inspect Chrome

1. Open `chrome://extensions/` in the regular Google Chrome window with AppleScript.
2. Capture the screen to a temporary path with `screencapture -x` and inspect it with the image-viewing tool.
3. Locate the **Bookmark Shortcuts** card and check whether Developer mode is enabled.
4. If needed, determine the active profile from the main Chrome process. Read its `Secure Preferences` with `jq` only to confirm that an extension entry's `path` equals the repository root. Do not infer success from preferences alone.

## Use the normal UI route

Use macOS UI automation when Accessibility access is available:

- If the Bookmark Shortcuts card already exists, activate Chrome and click that card's reload icon.
- Otherwise, enable Developer mode, click **Load unpacked**, and choose the repository root—the folder containing `manifest.json`.
- Use a fresh screenshot to establish click coordinates. Do not reuse hard-coded screen coordinates.
- In the native folder chooser, use `Cmd+Shift+G`, enter the absolute repository path, confirm it, and select/open the directory.

If `System Events` reports that assistive access is denied, do not repeatedly attempt clicks. For a first-time installation, open **Privacy & Security → Accessibility** and the repository folder, then ask the user to enable Codex or its host terminal and retry.

## Reload without UI clicking

Use this fallback only when Bookmark Shortcuts is already loaded unpacked from this repository and UI clicking is blocked.

1. Find the extension ID read-only from the active profile's `Secure Preferences`: select the entry under `extensions.settings` whose resolved `path` equals the repository root. Cross-check the ID on the extension card when visible.
2. Confirm that `welcome.html` loads `welcome.js`.
3. Add this one-time guarded statement to the beginning of `welcome.js` using `apply_patch`:

   ```js
   if (location.hash === "#reload-extension") chrome.runtime.reload();
   ```

4. Navigate the active Chrome tab to:

   ```text
   chrome-extension://EXTENSION_ID/welcome.html#reload-extension
   ```

5. Wait briefly for Chrome to reload the unpacked extension.
6. Immediately remove the exact guarded statement with `apply_patch`, even if navigation or reload fails.
7. Confirm with `rg` and `git diff` that no reload trigger or unrelated temporary edit remains.

This fallback works because the already-loaded extension can call `chrome.runtime.reload()` from its own setup page. Do not generalize it to first-time installation or to unrelated extension repositories.

## Verify and report

1. Return to `chrome://extensions/` and capture a fresh screenshot.
2. Verify that the Bookmark Shortcuts card is enabled and displays the same version as `manifest.json`.
3. Check for an error badge or extension error panel. If present, inspect and report it instead of claiming success.
4. Re-run `git status --short` and ensure the fallback left no temporary changes.
5. Report the loaded version and suggest testing a configured bookmark shortcut. Mention any remaining manual shortcut bindings separately.
