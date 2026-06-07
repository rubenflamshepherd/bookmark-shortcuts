const BOOKMARKS_BAR_ID = "1";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const match = command.match(/^open_bookmark_(\d)$/);
  if (!match) return;
  const slot = parseInt(match[1], 10);

  const children = await chrome.bookmarks.getChildren(BOOKMARKS_BAR_ID);
  const node = children[slot - 1];
  if (!node || !node.url) return;

  await chrome.tabs.create({ url: node.url, active: true });
});
