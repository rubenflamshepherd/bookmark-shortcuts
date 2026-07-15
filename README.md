# Bookmark Shortcuts

A minimal Chrome extension (Manifest V3) that maps keyboard shortcuts to the first 9 items on your bookmarks bar. Pressing the shortcut for slot N opens that bookmark or shows the first 9 items when the slot is a folder.

## Default shortcuts

| Platform     | Shortcut       |
| ------------ | -------------- |
| macOS        | `Ctrl+1` … `Ctrl+9` (the `⌃` key, not `⌘`) |
| Windows/Linux| `Alt+1` … `Alt+9`   |

On macOS, `Cmd+1–9` is reserved by Chrome for tab switching, so this extension uses the physical `Ctrl` key (`MacCtrl` in manifest terms) instead. On Windows/Linux, `Ctrl+1–9` is reserved for the same reason, so it uses `Alt`.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this directory.

## Binding shortcuts 5–9 (one-time manual step)

Chrome only auto-binds the first **4** suggested keyboard shortcuts per extension. Slots 5–9 are declared but unbound after install. To bind them:

1. Open `chrome://extensions/shortcuts`.
2. Find **Bookmark Shortcuts**.
3. For each of `Open bookmark 5` … `Open bookmark 9`, click the input field and press:
   - macOS: `Ctrl+5` … `Ctrl+9`
   - Windows/Linux: `Alt+5` … `Alt+9`

This is a Chrome platform limitation — there is no workaround in the extension code.

On first install, the extension opens a **welcome page** that explains this and provides a button to jump straight to `chrome://extensions/shortcuts`.

## Behavior

- Slot N refers to the Nth item on the bookmarks bar (1-indexed), counting folders.
- If slot N is a URL bookmark → opens in a new foreground tab.
- If slot N is a folder → opens a numbered menu at the top of the active webpage, approximately beneath that bookmark slot. Press `1` … `9` without a modifier to open an item.
- If an item in the menu is another folder → selecting it shows that folder's first 9 items. Press `Backspace` or `←` to return to its parent.
- On pages where Chrome blocks script injection, such as `chrome://` pages, the menu falls back to the extension toolbar popup.
- If slot N is empty (fewer than N items on the bar) → nothing happens.

Chrome does not expose the bookmarks bar's layout or native folder dropdown to extensions. The webpage menu estimates horizontal alignment by measuring the titles of preceding bookmark-bar items and applying Chrome's native button spacing and truncation limits. Browser-generated items such as the Apps shortcut and saved tab groups are not exposed, so alignment can still vary. Programmatic fallback popups require Chrome 127 or newer.
