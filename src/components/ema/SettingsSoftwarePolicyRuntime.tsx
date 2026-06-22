import { createRoot, type Root } from "react-dom/client";
import SoftwarePolicyManagement from "../settings/SoftwarePolicyManagement";

let softwarePolicyRoot: Root | null = null;
let softwarePolicyHost: HTMLDivElement | null = null;

function currentHash() {
  if (typeof window === "undefined") return "";
  return String(window.location.hash || "").toLowerCase();
}

function isSoftwarePolicyView() {
  return currentHash().includes("software-policy") || currentHash().includes("softwarepolicy");
}

function setImportant(element: HTMLElement | null | undefined, styles: Record<string, string>) {
  if (!element) return;
  Object.entries(styles).forEach(([key, value]) => element.style.setProperty(key, value, "important"));
}

function ensureManagementSoftwareButton() {
  if (typeof document === "undefined") return;
  const view = document.body.dataset.settingsView || document.documentElement.dataset.settingsView || "settings";
  if (view !== "management") return;

  const list = document.querySelector<HTMLElement>(".settings-with-notifications .settings-menu-list");
  if (!list || list.querySelector('[data-section="softwarePolicy"]')) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "setting-btn";
  button.dataset.section = "softwarePolicy";
  button.innerHTML = `
    <span class="setting-icon">☰</span>
    <span><strong>Software Policy</strong><small>Manage software license policy, usage and compliance.</small></span>
  `;
  button.addEventListener("click", () => {
    window.history.replaceState(null, "", `${window.location.pathname}#management-control-software-policy`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    applySoftwarePolicyRuntime();
  });
  list.appendChild(button);
}

function markSoftwareButtonActive() {
  const active = isSoftwarePolicyView();
  document.querySelectorAll<HTMLElement>('.settings-with-notifications .setting-btn[data-section]').forEach((button) => {
    if (button.dataset.section === "softwarePolicy") {
      button.classList.toggle("active", active);
      button.classList.toggle("is-active", active);
      setImportant(button, { display: "grid" });
    } else if (active) {
      button.classList.remove("active", "is-active");
    }
  });
}

function unmountSoftwarePolicy() {
  if (softwarePolicyRoot) {
    softwarePolicyRoot.unmount();
    softwarePolicyRoot = null;
  }
  if (softwarePolicyHost?.parentNode) softwarePolicyHost.parentNode.removeChild(softwarePolicyHost);
  softwarePolicyHost = null;

  document.querySelectorAll<HTMLElement>(".settings-view-host > *").forEach((child) => {
    if (child.classList.contains("software-policy-runtime-host")) return;
    setImportant(child, { display: "" });
  });
}

function mountSoftwarePolicy() {
  const viewHost = document.querySelector<HTMLElement>(".settings-view-host");
  if (!viewHost) return;

  document.querySelectorAll<HTMLElement>(".settings-view-host > *").forEach((child) => {
    if (child.classList.contains("software-policy-runtime-host")) return;
    setImportant(child, { display: "none" });
  });

  if (!softwarePolicyHost) {
    softwarePolicyHost = document.createElement("div");
    softwarePolicyHost.className = "software-policy-runtime-host";
    setImportant(softwarePolicyHost, {
      width: "100%",
      height: "100%",
      minHeight: "0",
      overflow: "hidden",
    });
    viewHost.appendChild(softwarePolicyHost);
    softwarePolicyRoot = createRoot(softwarePolicyHost);
    softwarePolicyRoot.render(<SoftwarePolicyManagement />);
  }
}

function applySoftwarePolicyRuntime() {
  if (typeof document === "undefined") return;
  ensureManagementSoftwareButton();
  markSoftwareButtonActive();

  if (isSoftwarePolicyView()) {
    mountSoftwarePolicy();
  } else {
    unmountSoftwarePolicy();
  }
}

if (typeof document !== "undefined") {
  const run = () => window.requestAnimationFrame(applySoftwarePolicyRuntime);
  run();
  window.addEventListener("hashchange", run);
  window.addEventListener("resize", run);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  window.setInterval(applySoftwarePolicyRuntime, 300);
}

export {};
