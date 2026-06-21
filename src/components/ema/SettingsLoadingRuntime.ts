const STYLE_ID = "settings-loading-runtime-styles";

const css = `
@keyframes settings-loading-spin {
  to { transform: rotate(360deg); }
}

html body .settings-with-notifications .settings-loading-state,
html body .settings-with-notifications .settings-empty-state.settings-loading-state,
html body .settings-with-notifications .settings-inline-alert.settings-loading-state,
html body .settings-with-notifications .incident-empty-state.settings-loading-state {
  min-height: 12rem !important;
  display: grid !important;
  place-items: center !important;
  align-content: center !important;
  gap: 0.7rem !important;
  text-align: center !important;
  color: #64748b !important;
  font-size: 0.76rem !important;
  font-weight: 950 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}

html body .settings-with-notifications .settings-loading-state::before,
html body .settings-with-notifications .settings-empty-state.settings-loading-state::before,
html body .settings-with-notifications .settings-inline-alert.settings-loading-state::before,
html body .settings-with-notifications .incident-empty-state.settings-loading-state::before {
  content: "" !important;
  width: 2.45rem !important;
  height: 2.45rem !important;
  display: block !important;
  border: 0.22rem solid #dbeafe !important;
  border-top-color: #2563eb !important;
  border-radius: 999px !important;
  animation: settings-loading-spin 0.85s linear infinite !important;
}

html body .settings-with-notifications .settings-inline-alert.settings-loading-state {
  min-height: 5.5rem !important;
  border-style: dashed !important;
  background: #f8fbff !important;
}

html body .settings-with-notifications button.settings-button-loading,
html body .user-modal-backdrop button.settings-button-loading,
html body .role-modal-backdrop button.settings-button-loading,
html body .pricing-confirm-backdrop button.settings-button-loading,
html body .user-delete-backdrop button.settings-button-loading {
  position: relative !important;
  gap: 0.55rem !important;
}

html body .settings-with-notifications button.settings-button-loading::before,
html body .user-modal-backdrop button.settings-button-loading::before,
html body .role-modal-backdrop button.settings-button-loading::before,
html body .pricing-confirm-backdrop button.settings-button-loading::before,
html body .user-delete-backdrop button.settings-button-loading::before {
  content: "" !important;
  width: 0.95rem !important;
  height: 0.95rem !important;
  flex: 0 0 0.95rem !important;
  border: 0.15rem solid rgba(37, 99, 235, 0.22) !important;
  border-top-color: currentColor !important;
  border-radius: 999px !important;
  animation: settings-loading-spin 0.75s linear infinite !important;
}

html body .settings-with-notifications button.primary-btn.settings-button-loading::before,
html body .user-modal-backdrop button.primary-btn.settings-button-loading::before,
html body .role-modal-backdrop button.primary-btn.settings-button-loading::before,
html body .pricing-confirm-backdrop button.primary-btn.settings-button-loading::before,
html body .user-delete-backdrop button.primary-btn.settings-button-loading::before {
  border-color: rgba(255, 255, 255, 0.35) !important;
  border-top-color: #ffffff !important;
}
`;

function ensureSettingsLoadingStyles() {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    existing.textContent = css;
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function syncSettingsLoadingStates() {
  if (typeof document === "undefined") return;
  const settingsRoot = document.querySelector(".settings-with-notifications");
  if (!settingsRoot) return;

  settingsRoot
    .querySelectorAll<HTMLElement>(".settings-empty-state, .settings-inline-alert, .incident-empty-state")
    .forEach((node) => {
      const text = (node.textContent || "").trim().toLowerCase();
      const isLoading = text.startsWith("loading") || text.includes("loading ") || text.includes("loading...") || text.includes("retrieving") || text.includes("fetching");
      node.classList.toggle("settings-loading-state", isLoading);
    });

  document
    .querySelectorAll<HTMLButtonElement>(".settings-with-notifications button, .user-modal-backdrop button, .role-modal-backdrop button, .pricing-confirm-backdrop button, .user-delete-backdrop button")
    .forEach((button) => {
      const text = (button.textContent || "").trim().toLowerCase();
      const isLoading = /^(loading|saving|deleting|adding|updating|reloading|exporting|processing)/.test(text) || text.endsWith("...");
      button.classList.toggle("settings-button-loading", isLoading);
    });
}

if (typeof document !== "undefined") {
  ensureSettingsLoadingStyles();
  const run = () => window.requestAnimationFrame(syncSettingsLoadingStates);
  run();

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("resize", run);
}

export {};
