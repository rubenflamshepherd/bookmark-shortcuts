const PREF_KEY = "openInNewTab";
const button = document.getElementById("open-in-new-tab");
const shortcutSettingsButton = document.getElementById("open-shortcut-settings");
const status = document.getElementById("status");
let statusTimer = null;

function setState(value) {
  button.setAttribute("aria-checked", String(value));
}

function flashSaved() {
  status.classList.add("visible");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove("visible"), 1200);
}

document.addEventListener("DOMContentLoaded", async () => {
  const { [PREF_KEY]: openInNewTab = true } = await chrome.storage.sync.get(PREF_KEY);
  setState(openInNewTab);
});

button.addEventListener("click", async () => {
  const next = button.getAttribute("aria-checked") !== "true";
  setState(next);
  await chrome.storage.sync.set({ [PREF_KEY]: next });
  flashSaved();
});

shortcutSettingsButton.addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
