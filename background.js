const BOOKMARKS_BAR_ID = "1";
const PREF_KEY = "openInNewTab";
const FOLDER_CONTEXT_PREFIX = "folderContext:";
const MAX_NUMBERED_ITEMS = 9;
const SHOW_FOLDER_MESSAGE = "bookmark-shortcuts:show-folder";
const GET_FOLDER_MESSAGE = "bookmark-shortcuts:get-folder";
const OPEN_BOOKMARK_MESSAGE = "bookmark-shortcuts:open-bookmark";
const HIDE_OVERLAY_MESSAGE = "bookmark-shortcuts:hide-overlay";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

function getFolderContextKey(windowId) {
  return `${FOLDER_CONTEXT_PREFIX}${windowId}`;
}

async function openBookmark(url, sourceTab) {
  const { [PREF_KEY]: openInNewTab = true } = await chrome.storage.sync.get(PREF_KEY);

  if (openInNewTab) {
    const createProperties = { url, active: true };
    if (Number.isInteger(sourceTab?.windowId)) {
      createProperties.windowId = sourceTab.windowId;
    }
    await chrome.tabs.create(createProperties);
    return;
  }

  if (Number.isInteger(sourceTab?.id)) {
    await chrome.tabs.update(sourceTab.id, { url });
  } else {
    await chrome.tabs.update({ url });
  }
}

function serializeBookmarkNode(node) {
  return {
    id: node.id,
    title: node.title,
    url: node.url || null,
  };
}

function serializeBookmarkBarItem(node) {
  return {
    title: node.title,
    isFolder: !node.url,
  };
}

async function getFolderPayload(folderId, knownTitle) {
  const [folderNodes, children] = await Promise.all([
    knownTitle === undefined ? chrome.bookmarks.get(folderId) : Promise.resolve([]),
    chrome.bookmarks.getChildren(folderId),
  ]);

  return {
    id: folderId,
    title: knownTitle ?? folderNodes[0]?.title ?? "Bookmark folder",
    total: children.length,
    children: children.slice(0, MAX_NUMBERED_ITEMS).map(serializeBookmarkNode),
  };
}

async function hideFolderOverlay(tabId) {
  if (!Number.isInteger(tabId)) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: HIDE_OVERLAY_MESSAGE });
  } catch {
    // The overlay has not been injected into this tab.
  }
}

async function showFolderOverlay(node, slot, sourceTab, precedingItems) {
  if (!Number.isInteger(sourceTab?.id)) return false;

  try {
    const folder = await getFolderPayload(node.id, node.title);
    await chrome.scripting.executeScript({
      target: { tabId: sourceTab.id },
      files: ["folder-overlay.js"],
    });
    await chrome.tabs.sendMessage(sourceTab.id, {
      type: SHOW_FOLDER_MESSAGE,
      folder,
      slot,
      precedingItems,
    });
    return true;
  } catch (error) {
    console.info("Falling back to the extension popup", error);
    return false;
  }
}

async function showFolderPopup(node, sourceTab) {
  if (!Number.isInteger(sourceTab?.windowId)) return;

  const contextKey = getFolderContextKey(sourceTab.windowId);
  await chrome.storage.session.set({
    [contextKey]: {
      folderId: node.id,
      folderTitle: node.title,
      sourceTabId: sourceTab.id,
      sourceWindowId: sourceTab.windowId,
    },
  });

  try {
    await chrome.action.openPopup({ windowId: sourceTab.windowId });
  } catch (error) {
    await chrome.storage.session.remove(contextKey);
    throw error;
  }
}

async function handleCommand(command) {
  const match = command.match(/^open_bookmark_(\d)$/);
  if (!match) return;
  const slot = parseInt(match[1], 10);

  const [children, activeTabs] = await Promise.all([
    chrome.bookmarks.getChildren(BOOKMARKS_BAR_ID),
    chrome.tabs.query({ active: true, lastFocusedWindow: true }),
  ]);
  const node = children[slot - 1];
  if (!node) return;

  const sourceTab = activeTabs[0];
  if (node.url) {
    await hideFolderOverlay(sourceTab?.id);
    await openBookmark(node.url, sourceTab);
    return;
  }

  const precedingItems = children.slice(0, slot - 1).map(serializeBookmarkBarItem);
  const overlayWasShown = await showFolderOverlay(node, slot, sourceTab, precedingItems);
  if (!overlayWasShown) await showFolderPopup(node, sourceTab);
}

chrome.commands.onCommand.addListener((command) => {
  handleCommand(command).catch((error) => {
    console.error("Unable to handle bookmark shortcut", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id)) return false;

  if (message?.type === GET_FOLDER_MESSAGE && typeof message.folderId === "string") {
    getFolderPayload(message.folderId)
      .then((folder) => sendResponse({ ok: true, folder }))
      .catch((error) => {
        console.error("Unable to read bookmark folder", error);
        sendResponse({ ok: false, error: "Unable to read this bookmark folder." });
      });
    return true;
  }

  if (message?.type === OPEN_BOOKMARK_MESSAGE && typeof message.bookmarkId === "string") {
    chrome.bookmarks
      .get(message.bookmarkId)
      .then(async ([node]) => {
        if (!node?.url) throw new Error("The selected node is not a bookmark");
        await openBookmark(node.url, sender.tab);
        sendResponse({ ok: true });
      })
      .catch((error) => {
        console.error("Unable to open bookmark", error);
        sendResponse({ ok: false, error: "Unable to open this bookmark." });
      });
    return true;
  }

  return false;
});
