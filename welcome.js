document.getElementById("open-shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

document.getElementById("open-preferences").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
