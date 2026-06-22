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

function isManagementView() {
  if (typeof document === "undefined") return false;
  const view = document.body.dataset.settingsView || document.documentElement.dataset.settingsView || "settings";
  return view === "management";
}

function alignManagementKpiCards() {
  if (typeof document === "undefined" || !isManagementView()) return;

  const hero = document.querySelector<HTMLElement>(".settings-with-notifications .management-control-wrapper .settings-hero");
  const score = document.querySelector<HTMLElement>(".settings-with-notifications .management-control-wrapper .settings-score");
  if (!hero || !score) return;

  setImportant(hero, {
    display: "grid",
    gridTemplateColumns: "minmax(18rem, 22rem) minmax(0, 1fr)",
    alignItems: "stretch",
    gap: "0.75rem",
  });

  setImportant(score, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 18rem))",
    justifyContent: "end",
    alignItems: "stretch",
    alignContent: "center",
    gap: "0.65rem",
    minWidth: "0",
    width: "100%",
  });

  score.querySelectorAll<HTMLElement>(".score-box").forEach((box) => {
    setImportant(box, {
      width: "100%",
      minWidth: "0",
      minHeight: "4.35rem",
    });
  });
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

function getStandardSettingsContent() {
  return document.querySelector<HTMLElement>(".settings-with-notifications .management-control-wrapper .settings-content");
}

function restoreStandardSettingsContent() {
  const content = getStandardSettingsContent();
  if (!content) return;

  content.querySelectorAll<HTMLElement>(":scope > *").forEach((child) => {
    if (child.classList.contains("software-policy-runtime-host")) return;
    setImportant(child, { display: "" });
  });
}

function unmountSoftwarePolicy() {
  if (softwarePolicyRoot) {
    softwarePolicyRoot.unmount();
    softwarePolicyRoot = null;
  }
  if (softwarePolicyHost?.parentNode) softwarePolicyHost.parentNode.removeChild(softwarePolicyHost);
  softwarePolicyHost = null;
  restoreStandardSettingsContent();

  document.querySelectorAll<HTMLElement>(".settings-view-host > *").forEach((child) => {
    setImportant(child, { display: "" });
  });
}

function mountSoftwarePolicy() {
  const content = getStandardSettingsContent();
  if (!content) return;

  document.querySelectorAll<HTMLElement>(".settings-view-host > *").forEach((child) => {
    setImportant(child, { display: "" });
  });

  content.querySelectorAll<HTMLElement>(":scope > *").forEach((child) => {
    if (child.classList.contains("software-policy-runtime-host")) return;
    setImportant(child, { display: "none" });
  });

  setImportant(content, {
    minWidth: "0",
    minHeight: "0",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    overflow: "hidden",
  });

  if (!softwarePolicyHost) {
    softwarePolicyHost = document.createElement("div");
    softwarePolicyHost.className = "software-policy-runtime-host";
    setImportant(softwarePolicyHost, {
      width: "100%",
      height: "100%",
      minHeight: "0",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    });
    content.appendChild(softwarePolicyHost);
    softwarePolicyRoot = createRoot(softwarePolicyHost);
    softwarePolicyRoot.render(<SoftwarePolicyManagement />);
  } else if (softwarePolicyHost.parentElement !== content) {
    content.appendChild(softwarePolicyHost);
  }
}

function applySoftwarePolicyRuntime() {
  if (typeof document === "undefined") return;
  ensureManagementSoftwareButton();
  markSoftwareButtonActive();
  alignManagementKpiCards();

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
  window.setInterval(applySoftwarePolicyRuntime, 120);
}

export {};
