const PREF_KEY = "openInNewTab";
const FOLDER_CONTEXT_PREFIX = "folderContext:";
const MAX_NUMBERED_ITEMS = 9;

const backButton = document.getElementById("back");
const empty = document.getElementById("empty");
const folderHeader = document.getElementById("folder-header");
const folderIcon = document.getElementById("folder-icon");
const folderHint = document.getElementById("folder-hint");
const folderTitle = document.getElementById("folder-title");
const items = document.getElementById("items");

let context = null;
let visibleChildren = [];
const folderStack = [];

function getFolderContextKey(windowId) {
  return `${FOLDER_CONTEXT_PREFIX}${windowId}`;
}

function getFaviconUrl(pageUrl) {
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", pageUrl);
  faviconUrl.searchParams.set("size", "16");
  return faviconUrl.toString();
}

function showMessage(message, isError = false) {
  items.replaceChildren();
  visibleChildren = [];
  empty.textContent = message;
  empty.classList.toggle("error", isError);
  empty.hidden = false;
}

function makeItem(node, index) {
  const listItem = document.createElement("li");
  const button = document.createElement("button");
  const icon = document.createElement(node.url ? "img" : "span");
  const title = document.createElement("span");
  const shortcut = document.createElement("span");
  const chevron = document.createElement("span");

  button.className = "item";
  button.type = "button";
  button.dataset.index = String(index);
  button.setAttribute("role", "menuitem");
  button.setAttribute("aria-label", `${index + 1}. ${node.title || node.url || "Untitled bookmark"}`);

  icon.className = node.url ? "icon favicon" : "icon folder-icon";
  if (node.url) {
    icon.src = getFaviconUrl(node.url);
    icon.alt = "";
  } else {
    icon.setAttribute("aria-hidden", "true");
  }
  title.className = "item-title";
  title.textContent = node.title || node.url || "Untitled bookmark";
  shortcut.className = "shortcut";
  shortcut.textContent = String(index + 1);
  shortcut.setAttribute("aria-hidden", "true");
  chevron.className = "chevron";
  chevron.textContent = node.url ? "" : "›";
  chevron.setAttribute("aria-hidden", "true");

  button.append(icon, title, shortcut, chevron);
  listItem.append(button);
  return listItem;
}

async function renderFolder(folder) {
  folderTitle.textContent = folder.title || "Bookmark folder";
  folderHint.textContent = "1–9";
  const isNestedFolder = folderStack.length > 1;
  folderHeader.hidden = !isNestedFolder;
  backButton.hidden = !isNestedFolder;
  folderIcon.hidden = isNestedFolder;
  empty.hidden = true;
  empty.classList.remove("error");
  items.replaceChildren();

  const children = await chrome.bookmarks.getChildren(folder.id);
  visibleChildren = children.slice(0, MAX_NUMBERED_ITEMS);

  if (visibleChildren.length === 0) {
    showMessage("This folder is empty.");
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleChildren.forEach((node, index) => {
    fragment.append(makeItem(node, index));
  });
  items.append(fragment);

  if (children.length > MAX_NUMBERED_ITEMS) {
    folderHint.textContent = `1–${MAX_NUMBERED_ITEMS} of ${children.length}`;
  }
}

async function openUrl(url) {
  const { [PREF_KEY]: openInNewTab = true } = await chrome.storage.sync.get(PREF_KEY);

  if (openInNewTab) {
    const createProperties = { url, active: true };
    if (Number.isInteger(context.sourceWindowId)) {
      createProperties.windowId = context.sourceWindowId;
    }

    try {
      await chrome.tabs.create(createProperties);
    } catch {
      delete createProperties.windowId;
      await chrome.tabs.create(createProperties);
    }
  } else if (Number.isInteger(context.sourceTabId)) {
    try {
      await chrome.tabs.update(context.sourceTabId, { url, active: true });
    } catch {
      await chrome.tabs.create({ url, active: true });
    }
  } else {
    await chrome.tabs.update({ url });
  }

  window.close();
}

async function activateNode(node) {
  if (!node) return;

  if (node.url) {
    await openUrl(node.url);
    return;
  }

  folderStack.push({ id: node.id, title: node.title });
  await renderFolder(folderStack.at(-1));
}

async function goBack() {
  if (folderStack.length < 2) return;
  folderStack.pop();
  await renderFolder(folderStack.at(-1));
}

items.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;

  const node = visibleChildren[Number.parseInt(button.dataset.index, 10)];
  activateNode(node).catch((error) => {
    showMessage("Unable to open this bookmark.", true);
    console.error(error);
  });
});

backButton.addEventListener("click", () => {
  goBack().catch((error) => {
    showMessage("Unable to open the parent folder.", true);
    console.error(error);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.close();
    return;
  }

  if (event.key === "Backspace" || event.key === "ArrowLeft") {
    if (folderStack.length > 1) {
      event.preventDefault();
      goBack().catch(console.error);
    }
    return;
  }

  if (!/^[1-9]$/.test(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;

  event.preventDefault();
  const node = visibleChildren[Number.parseInt(event.key, 10) - 1];
  activateNode(node).catch((error) => {
    showMessage("Unable to open this bookmark.", true);
    console.error(error);
  });
});

async function initialize() {
  const currentWindow = await chrome.windows.getCurrent();
  const contextKey = getFolderContextKey(currentWindow.id);
  const stored = await chrome.storage.session.get(contextKey);
  context = stored[contextKey];
  await chrome.storage.session.remove(contextKey);

  if (!context?.folderId) {
    folderHeader.hidden = false;
    folderIcon.hidden = false;
    folderTitle.textContent = "Bookmark Shortcuts";
    folderHint.textContent = "";
    showMessage("Press a bookmark shortcut for a folder to show its items here.");
    return;
  }

  folderStack.push({ id: context.folderId, title: context.folderTitle });
  await renderFolder(folderStack[0]);
}

initialize().catch((error) => {
  folderHeader.hidden = false;
  folderIcon.hidden = false;
  folderTitle.textContent = "Bookmark Shortcuts";
  folderHint.textContent = "Something went wrong";
  showMessage("Unable to read this bookmark folder.", true);
  console.error(error);
});
