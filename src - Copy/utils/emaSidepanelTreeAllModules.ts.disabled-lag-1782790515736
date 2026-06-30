type AnyEl = HTMLElement & { dataset: DOMStringMap };

declare global {
  interface Window {
    __emaSidepanelAllModulesStatus?: {
      ran: number;
      forced: number;
      route: string;
      reason: string;
      panels: number;
    };
  }
}

const EXCLUDED_ROUTE_PARTS = [
  "/settings",
  "/service-desk",
  "/report",
  "/reports",
];

function route() {
  return window.location.pathname.toLowerCase();
}

function isExcludedRoute() {
  const r = route();
  return EXCLUDED_ROUTE_PARTS.some((part) => r.includes(part));
}

function textOf(el: Element | null) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function isVisible(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  );
}

function clearMarks() {
  document.querySelectorAll("[data-ema-branch-sidepanel='true']").forEach((el) => {
    const node = el as AnyEl;
    delete node.dataset.emaBranchSidepanel;
  });

  document.querySelectorAll("[data-ema-branch-search-row],[data-ema-branch-search-input],[data-ema-branch-tree-list],[data-ema-branch-mode],[data-ema-branch-old-header],[data-ema-branch-add-folder]")
    .forEach((el) => {
      const node = el as AnyEl;
      delete node.dataset.emaBranchSearchRow;
      delete node.dataset.emaBranchSearchInput;
      delete node.dataset.emaBranchTreeList;
      delete node.dataset.emaBranchMode;
      delete node.dataset.emaBranchOldHeader;
      delete node.dataset.emaBranchAddFolder;
    });
}

function looksLikeMainAppSidebar(el: HTMLElement) {
  const t = textOf(el).toLowerCase();

  return (
    t.includes("ema system") ||
    t.includes("operations console") ||
    t.includes("main category") ||
    t.includes("logout") ||
    t.includes("super admin") ||
    t.includes("ai assistant")
  );
}

function scorePanel(el: HTMLElement) {
  if (!isVisible(el)) return -9999;

  const rect = el.getBoundingClientRect();
  const t = textOf(el).toLowerCase();

  if (looksLikeMainAppSidebar(el)) return -9999;

  if (rect.width < 190 || rect.width > 380) return -9999;
  if (rect.height < 250) return -9999;
  if (rect.left < 170 || rect.left > 520) return -9999;

  let score = 0;

  if (t.includes("search branches")) score += 160;
  if (t.includes("search branch")) score += 160;
  if (t.includes("all branches")) score += 120;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("add new folder")) score += 90;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;
  if (t.includes("branch")) score += 45;
  if (t.includes("statistics")) score += 25;

  if (t.includes("device registry")) score -= 150;
  if (t.includes("package registry")) score -= 150;
  if (t.includes("target device registry")) score -= 150;
  if (t.includes("export") && t.includes("refresh") && t.includes("search")) score -= 100;

  score += Math.max(0, 100 - Math.abs(rect.width - 248));

  return score;
}

function findSidepanels() {
  const fromInputs = Array.from(document.querySelectorAll("input"))
    .filter((input): input is HTMLInputElement => input instanceof HTMLInputElement)
    .filter((input) => {
      const placeholder = String(input.placeholder || "").toLowerCase();
      return placeholder.includes("search branches") || placeholder.includes("search branch");
    })
    .flatMap((input) => {
      const arr: HTMLElement[] = [];
      let cur: HTMLElement | null = input.parentElement;

      for (let i = 0; i < 8 && cur; i++) {
        arr.push(cur);
        cur = cur.parentElement;
      }

      return arr;
    });

  const broad = Array.from(document.querySelectorAll("aside, section, div"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement);

  const candidates = [...fromInputs, ...broad]
    .filter((el, i, arr) => arr.indexOf(el) === i)
    .map((el) => ({ el, score: scorePanel(el) }))
    .filter((item) => item.score > 120)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) return [];

  const best = candidates[0].el;

  return [best];
}

function markSearch(panel: HTMLElement) {
  const inputs = Array.from(panel.querySelectorAll("input"))
    .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement);

  for (const input of inputs) {
    const placeholder = String(input.placeholder || "").toLowerCase();

    if (!placeholder.includes("search")) continue;

    input.setAttribute("data-ema-branch-search-input", "true");

    const parent = input.parentElement as HTMLElement | null;
    const grand = parent?.parentElement as HTMLElement | null;

    if (grand && grand.querySelector("button")) {
      grand.setAttribute("data-ema-branch-search-row", "true");
    } else if (parent) {
      parent.setAttribute("data-ema-branch-search-row", "true");
    }
  }
}

function markMode(panel: HTMLElement) {
  const nodes = Array.from(panel.querySelectorAll("div, section, nav"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement);

  for (const node of nodes) {
    const t = textOf(node).toLowerCase();
    const rect = node.getBoundingClientRect();

    if (rect.width < 120 || rect.height < 26 || rect.height > 130) continue;

    if (t.includes("branch") && t.includes("statistics")) {
      node.setAttribute("data-ema-branch-mode", "true");
      return;
    }
  }
}

function markTreeList(panel: HTMLElement) {
  const nodes = Array.from(panel.querySelectorAll("ul, [role='tree'], div"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement);

  let best: HTMLElement | null = null;
  let bestScore = 0;

  for (const node of nodes) {
    const text = textOf(node).toLowerCase();
    const rect = node.getBoundingClientRect();

    if (rect.width < 120 || rect.height < 80) continue;

    let score = 0;

    if (text.includes("all branches")) score += 100;
    if (text.includes("head office")) score += 60;
    if (text.includes("kl branch")) score += 60;
    if (text.includes("remote sites")) score += 60;
    if (text.includes("new branch path")) score -= 40;
    if (text.includes("search branches")) score -= 50;
    if (text.includes("add new folder")) score -= 40;

    if (score > bestScore) {
      best = node;
      bestScore = score;
    }
  }

  if (best) {
    best.setAttribute("data-ema-branch-tree-list", "true");
  }
}

function markHeader(panel: HTMLElement) {
  const children = Array.from(panel.children).filter((el): el is HTMLElement => el instanceof HTMLElement);

  for (const child of children.slice(0, 8)) {
    const t = textOf(child).toLowerCase();

    if (!t) continue;
    if (child.querySelector("input")) continue;
    if (t.includes("all branches")) continue;
    if (t.includes("search branch")) continue;
    if (t.includes("head office") || t.includes("kl branch") || t.includes("remote sites")) continue;
    if (t.includes("new branch path") || t.includes("add new folder")) continue;

    if (
      t.includes("software") ||
      t.includes("hardware") ||
      t.includes("network") ||
      t.includes("metering") ||
      t.includes("inventory") ||
      t.includes("browse") ||
      t.includes("endpoint")
    ) {
      child.setAttribute("data-ema-branch-old-header", "true");
    }
  }
}

function markAddFolder(panel: HTMLElement) {
  const nodes = Array.from(panel.querySelectorAll("button, [role='button']"))
    .filter((el): el is HTMLElement => el instanceof HTMLElement);

  for (const node of nodes) {
    const t = textOf(node).toLowerCase();

    if (
      t.includes("add new folder") ||
      t.includes("new branch path") ||
      t.includes("add folder")
    ) {
      node.setAttribute("data-ema-branch-add-folder", "true");
    }
  }
}

function apply() {
  window.__emaSidepanelAllModulesStatus = {
    ran: (window.__emaSidepanelAllModulesStatus?.ran || 0) + 1,
    forced: 0,
    route: window.location.pathname,
    reason: "",
    panels: 0,
  };

  if (isExcludedRoute()) {
    clearMarks();
    window.__emaSidepanelAllModulesStatus.reason = "excluded route";
    return;
  }

  const panels = findSidepanels();

  clearMarks();

  if (!panels.length) {
    window.__emaSidepanelAllModulesStatus.reason = "no branch sidepanel found";
    return;
  }

  for (const panel of panels) {
    panel.setAttribute("data-ema-branch-sidepanel", "true");
    markHeader(panel);
    markSearch(panel);
    markMode(panel);
    markTreeList(panel);
    markAddFolder(panel);
  }

  window.__emaSidepanelAllModulesStatus.forced = 1;
  window.__emaSidepanelAllModulesStatus.reason = "forced";
  window.__emaSidepanelAllModulesStatus.panels = panels.length;
}

function schedule() {
  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 150);
    setTimeout(apply, 500);
  });
}

if (typeof window !== "undefined") {
  schedule();

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("resize", schedule);
  document.addEventListener("click", () => setTimeout(apply, 80), true);
}

export {};
