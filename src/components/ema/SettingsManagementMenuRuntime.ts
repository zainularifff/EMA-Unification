const MANAGEMENT_SECTIONS = new Set(["incident", "pricing", "aging", "policy", "softwarePolicy"]);

function applySettingsManagementMenu() {
  if (typeof document === "undefined") return;
  const view = document.body.dataset.settingsView || document.documentElement.dataset.settingsView || "settings";
  document
    .querySelectorAll<HTMLButtonElement>(".settings-with-notifications .settings-menu .setting-btn[data-section]")
    .forEach((button) => {
      const section = String(button.dataset.section || "");
      const isManagement = MANAGEMENT_SECTIONS.has(section);
      const hidden = view === "management" ? !isManagement : view === "settings" ? isManagement : false;
      button.style.setProperty("display", hidden ? "none" : "grid", "important");
    });
}

if (typeof document !== "undefined") {
  const run = () => window.requestAnimationFrame(applySettingsManagementMenu);
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  window.addEventListener("resize", run);
  window.setInterval(applySettingsManagementMenu, 250);
}

export {};
