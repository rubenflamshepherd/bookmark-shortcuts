(() => {
  const CONTROLLER_KEY = "__bookmarkShortcutsFolderOverlay";
  const SHOW_FOLDER_MESSAGE = "bookmark-shortcuts:show-folder";
  const GET_FOLDER_MESSAGE = "bookmark-shortcuts:get-folder";
  const OPEN_BOOKMARK_MESSAGE = "bookmark-shortcuts:open-bookmark";
  const HIDE_OVERLAY_MESSAGE = "bookmark-shortcuts:hide-overlay";
  const MENU_WIDTH = 280;
  const EDGE_GAP = 8;
  const BOOKMARK_BAR_LEADING_MARGIN = 6;
  const BOOKMARK_BUTTON_HORIZONTAL_INSETS = 12;
  const BOOKMARK_BUTTON_ICON_WIDTH = 16;
  const BOOKMARK_BUTTON_IMAGE_LABEL_GAP = 6;
  const BOOKMARK_BUTTON_GAP = 4;
  const BOOKMARK_BUTTON_MAX_WIDTH = 150;
  const FALLBACK_SLOT_WIDTH = 72;

  if (globalThis[CONTROLLER_KEY]) return;

  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  const menu = document.createElement("section");
  const header = document.createElement("header");
  const backButton = document.createElement("button");
  const heading = document.createElement("h1");
  const hint = document.createElement("span");
  const items = document.createElement("div");
  const empty = document.createElement("p");
  const titleMeasurementContext = document.createElement("canvas").getContext("2d");

  let activeSlot = 1;
  let activePrecedingItems = [];
  let visibleChildren = [];
  let selectedIndex = -1;
  const folderStack = [];

  style.textContent = `
    :host {
      color-scheme: light dark;
      --bg: #fff;
      --fg: #202124;
      --muted: #5f6368;
      --hover: #f1f3f4;
      --border: #dadce0;
      --folder: #5f6368;
      --error: #d93025;
      all: initial;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --bg: #292a2d;
        --fg: #e8eaed;
        --muted: #9aa0a6;
        --hover: #3c4043;
        --border: #5f6368;
        --folder: #bdc1c6;
        --error: #f28b82;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    .menu {
      width: ${MENU_WIDTH}px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
      border-radius: 12px;
      background: var(--bg);
      box-shadow: 0 4px 16px rgba(0, 0, 0, .24), 0 1px 3px rgba(0, 0, 0, .18);
      color: var(--fg);
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      animation: menu-in 80ms ease-out;
    }
    @keyframes menu-in {
      from { opacity: 0; transform: translateY(-2px) scale(.99); }
      to { opacity: 1; transform: none; }
    }
    header {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 38px;
      padding: 3px 8px;
      border-bottom: 1px solid var(--border);
    }
    header[hidden] { display: none; }
    h1 {
      min-width: 0;
      flex: 1;
      margin: 0;
      overflow: hidden;
      font: 600 13px/32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hint {
      flex: none;
      margin-right: 2px;
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
    }
    .back {
      flex: none;
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--fg);
      cursor: pointer;
      font: 19px/1 sans-serif;
    }
    .back:hover, .back:focus-visible { outline: none; background: var(--hover); }
    .items { max-height: 314px; overflow-y: auto; padding: 4px; }
    .item {
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr) 22px 12px;
      align-items: center;
      gap: 6px;
      width: 100%;
      height: 34px;
      padding: 0 8px;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--fg);
      cursor: default;
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: left;
    }
    .item:hover, .item:focus-visible, .item.selected {
      outline: none;
      background: var(--hover);
    }
    .icon {
      position: relative;
      display: block;
      width: 16px;
      height: 16px;
      justify-self: center;
    }
    img.icon { object-fit: contain; }
    .folder-icon { height: 14px; color: var(--folder); }
    .folder-icon::before {
      content: "";
      position: absolute;
      inset: 4px 1px 1px;
      border: 2px solid currentColor;
      border-radius: 2px;
    }
    .folder-icon::after {
      content: "";
      position: absolute;
      top: 1px;
      left: 2px;
      width: 7px;
      height: 5px;
      border: 2px solid currentColor;
      border-bottom: 0;
      border-radius: 2px 2px 0 0;
    }
    .title {
      overflow: hidden;
      line-height: 34px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .shortcut { color: var(--muted); font-size: 12px; text-align: right; }
    .chevron { color: var(--muted); font-size: 17px; line-height: 1; text-align: right; }
    .empty {
      margin: 0;
      padding: 24px 20px;
      color: var(--muted);
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
    }
    .empty.error { color: var(--error); }
  `;

  menu.className = "menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-label", "Bookmark folder");
  header.hidden = true;
  backButton.className = "back";
  backButton.type = "button";
  backButton.textContent = "‹";
  backButton.setAttribute("aria-label", "Go to parent folder");
  hint.className = "hint";
  hint.textContent = "1–9";
  items.className = "items";
  items.setAttribute("role", "menu");
  empty.className = "empty";
  empty.hidden = true;

  header.append(backButton, heading, hint);
  menu.append(header, items, empty);
  shadow.append(style, menu);

  host.style.setProperty("all", "initial", "important");
  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("top", "2px", "important");
  host.style.setProperty("z-index", "2147483647", "important");
  host.style.setProperty("width", `${MENU_WIDTH}px`, "important");
  host.style.setProperty("height", "auto", "important");
  host.style.setProperty("margin", "0", "important");
  host.style.setProperty("padding", "0", "important");

  if (titleMeasurementContext) {
    titleMeasurementContext.font = '13px Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }

  function measureBookmarkTitle(title) {
    if (!title) return 0;
    if (titleMeasurementContext) return Math.ceil(titleMeasurementContext.measureText(title).width);
    return Array.from(title).length * 7;
  }

  function estimateBookmarkButtonWidth(item) {
    const title = typeof item?.title === "string" ? item.title : "";
    const labelWidth = title ? BOOKMARK_BUTTON_IMAGE_LABEL_GAP + measureBookmarkTitle(title) : 0;
    return Math.min(
      BOOKMARK_BUTTON_MAX_WIDTH,
      BOOKMARK_BUTTON_HORIZONTAL_INSETS + BOOKMARK_BUTTON_ICON_WIDTH + labelWidth,
    );
  }

  function estimateBookmarkLeft() {
    if (activePrecedingItems.length !== activeSlot - 1) {
      return EDGE_GAP + (activeSlot - 1) * FALLBACK_SLOT_WIDTH;
    }

    return activePrecedingItems.reduce(
      (left, item) => left + estimateBookmarkButtonWidth(item) + BOOKMARK_BUTTON_GAP,
      BOOKMARK_BAR_LEADING_MARGIN,
    );
  }

  function positionMenu() {
    const preferredLeft = estimateBookmarkLeft();
    const maximumLeft = Math.max(EDGE_GAP, window.innerWidth - MENU_WIDTH - EDGE_GAP);
    const left = Math.min(Math.max(EDGE_GAP, preferredLeft), maximumLeft);
    host.style.setProperty("left", `${left}px`, "important");
  }

  function getFaviconUrl(pageUrl) {
    const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
    faviconUrl.searchParams.set("pageUrl", pageUrl);
    faviconUrl.searchParams.set("size", "16");
    return faviconUrl.toString();
  }

  function makeItem(node, index) {
    const button = document.createElement("button");
    const icon = document.createElement(node.url ? "img" : "span");
    const title = document.createElement("span");
    const shortcut = document.createElement("span");
    const chevron = document.createElement("span");

    button.className = "item";
    button.type = "button";
    button.dataset.index = String(index);
    button.setAttribute("role", "menuitem");
    button.setAttribute("aria-label", `${index + 1}. ${node.title || "Untitled bookmark"}`);

    icon.className = node.url ? "icon" : "icon folder-icon";
    if (node.url) {
      icon.src = getFaviconUrl(node.url);
      icon.alt = "";
    } else {
      icon.setAttribute("aria-hidden", "true");
    }
    title.className = "title";
    title.textContent = node.title || "Untitled bookmark";
    shortcut.className = "shortcut";
    shortcut.textContent = String(index + 1);
    shortcut.setAttribute("aria-hidden", "true");
    chevron.className = "chevron";
    chevron.textContent = node.url ? "" : "›";
    chevron.setAttribute("aria-hidden", "true");

    button.append(icon, title, shortcut, chevron);
    return button;
  }

  function showMessage(message, isError = false) {
    items.replaceChildren();
    visibleChildren = [];
    selectedIndex = -1;
    empty.textContent = message;
    empty.classList.toggle("error", isError);
    empty.hidden = false;
  }

  function renderFolder(folder) {
    const isNestedFolder = folderStack.length > 1;
    header.hidden = !isNestedFolder;
    heading.textContent = folder.title || "Bookmark folder";
    hint.textContent = folder.total > 9 ? `1–9 of ${folder.total}` : "1–9";
    empty.hidden = true;
    empty.classList.remove("error");
    items.replaceChildren();
    visibleChildren = folder.children;
    selectedIndex = -1;

    if (visibleChildren.length === 0) {
      showMessage("This folder is empty.");
      return;
    }

    const fragment = document.createDocumentFragment();
    visibleChildren.forEach((node, index) => fragment.append(makeItem(node, index)));
    items.append(fragment);
  }

  async function requestFolder(folderId) {
    const response = await chrome.runtime.sendMessage({
      type: GET_FOLDER_MESSAGE,
      folderId,
    });
    if (!response?.ok) throw new Error(response?.error || "Unable to read bookmark folder");
    return response.folder;
  }

  async function activateNode(node) {
    if (!node) return;

    if (node.url) {
      const response = await chrome.runtime.sendMessage({
        type: OPEN_BOOKMARK_MESSAGE,
        bookmarkId: node.id,
      });
      if (!response?.ok) throw new Error(response?.error || "Unable to open bookmark");
      destroy();
      return;
    }

    const folder = await requestFolder(node.id);
    folderStack.push(folder);
    renderFolder(folder);
  }

  function goBack() {
    if (folderStack.length < 2) {
      destroy();
      return;
    }
    folderStack.pop();
    renderFolder(folderStack.at(-1));
  }

  function moveSelection(direction) {
    if (visibleChildren.length === 0) return;
    selectedIndex = (selectedIndex + direction + visibleChildren.length) % visibleChildren.length;
    const buttons = items.querySelectorAll("button[data-index]");
    buttons.forEach((button, index) => button.classList.toggle("selected", index === selectedIndex));
    buttons[selectedIndex]?.focus({ preventScroll: true });
  }

  function destroy() {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("resize", positionMenu);
    chrome.runtime.onMessage.removeListener(onMessage);
    host.remove();
    delete globalThis[CONTROLLER_KEY];
  }

  function onPointerDown(event) {
    if (!event.composedPath().includes(host)) destroy();
  }

  function onKeyDown(event) {
    let handled = true;

    if (event.key === "Escape") {
      destroy();
    } else if (event.key === "Backspace" || event.key === "ArrowLeft") {
      goBack();
    } else if (event.key === "ArrowDown") {
      moveSelection(1);
    } else if (event.key === "ArrowUp") {
      moveSelection(-1);
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      activateNode(visibleChildren[selectedIndex]).catch((error) => showMessage(error.message, true));
    } else if (/^[1-9]$/.test(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
      activateNode(visibleChildren[Number.parseInt(event.key, 10) - 1]).catch((error) =>
        showMessage(error.message, true),
      );
    } else {
      handled = false;
    }

    if (handled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function show(folder, slot, precedingItems) {
    activeSlot = Number.isInteger(slot) ? slot : 1;
    activePrecedingItems = Array.isArray(precedingItems)
      ? precedingItems.slice(0, Math.max(0, activeSlot - 1))
      : [];
    folderStack.splice(0, folderStack.length, folder);
    positionMenu();
    renderFolder(folder);
    if (!host.isConnected) document.documentElement.append(host);
  }

  function onMessage(message) {
    if (message?.type === SHOW_FOLDER_MESSAGE && message.folder) {
      show(message.folder, message.slot, message.precedingItems);
    } else if (message?.type === HIDE_OVERLAY_MESSAGE) {
      destroy();
    }
  }

  items.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-index]");
    if (!button) return;
    const node = visibleChildren[Number.parseInt(button.dataset.index, 10)];
    activateNode(node).catch((error) => showMessage(error.message, true));
  });
  backButton.addEventListener("click", goBack);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", positionMenu);
  chrome.runtime.onMessage.addListener(onMessage);

  globalThis[CONTROLLER_KEY] = { destroy, show };
})();
