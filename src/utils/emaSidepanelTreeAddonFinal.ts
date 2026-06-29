type AnyEl = HTMLElement & { dataset: DOMStringMap };

declare global {
  interface Window {
    __emaSidepanelAddonStatus?: {
      ran: number;
      forced: number;
      route: string;
      reason: string;
      panelText?: string;
      panelRect?: {
        left: number;
        top: number;
        width: number;
        height: number;
      };
    };
  }
}

const EXCLUDED_ROUTES = ["/settings", "/service-desk", "/report", "/reports"];

function route() {
  return window.location.pathname.toLowerCase();
}

function isExcludedRoute() {
  return EXCLUDED_ROUTES.some((part) => route().includes(part));
}

function textOf(el: Element | null) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function visible(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function cleanupOnlyOurMarks() {
  document.querySelectorAll("[data-ema-addon-branch-panel='true']").forEach((el) => {
    delete (el as AnyEl).dataset.emaAddonBranchPanel;
  });

  document
    .querySelectorAll(
      "[data-ema-addon-old-header],[data-ema-addon-mode],[data-ema-addon-search-row],[data-ema-addon-search-input],[data-ema-addon-tree],[data-ema-addon-add-folder]"
    )
    .forEach((el) => {
      const node = el as AnyEl;
      delete node.dataset.emaAddonOldHeader;
      delete node.dataset.emaAddonMode;
      delete node.dataset.emaAddonSearchRow;
      delete node.dataset.emaAddonSearchInput;
      delete node.dataset.emaAddonTree;
      delete node.dataset.emaAddonAddFolder;
    });

  document.querySelectorAll(".ema-tree-forced-title").forEach((el) => el.remove());
}

function isMainDarkSidebar(el: HTMLElement) {
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

function scoreAncestor(el: HTMLElement) {
  if (!visible(el)) return -9999;

  const rect = el.getBoundingClientRect();
  const text = textOf(el).toLowerCase();

  if (isMainDarkSidebar(el)) return -9999;

  if (rect.left < 170 || rect.left > 560) return -9999;
  if (rect.width < 190 || rect.width > 390) return -9999;
  if (rect.height < 220) return -9999;

  let score = 0;

  if (text.includes("search branches")) score += 120;
  if (text.includes("search branch")) score += 120;
  if (text.includes("all branches")) score += 80;
  if (text.includes("branch")) score += 45;
  if (text.includes("statistics")) score += 25;
  if (text.includes("new branch path")) score += 45;
  if (text.includes("add new folder")) score += 65;
  if (text.includes("head office")) score += 50;
  if (text.includes("kl branch")) score += 50;
  if (text.includes("remote sites")) score += 50;

  if (text.includes("device registry")) score -= 140;
  if (text.includes("package registry")) score -= 140;
  if (text.includes("target device registry")) score -= 140;
  if (text.includes("export") && text.includes("refresh")) score -= 100;

  score += Math.max(0, 80 - Math.abs(rect.width - 248));

  return score;
}

function findPanelFromSearchInput() {
  const inputs = Array.from(document.querySelectorAll("input")).filter((el): el is HTMLInputElement => {
    if (!(el instanceof HTMLInputElement)) return false;
    const ph = String(el.placeholder || "").toLowerCase();
    return ph.includes("search branches") || ph.includes("search branch") || ph.includes("search folders") || ph.includes("search folder");
  });

  const scored: Array<{ el: HTMLElement; score: number }> = [];

  for (const input of inputs) {
    let cur: HTMLElement | null = input.parentElement;

    for (let level = 0; level < 10 && cur; level++) {
      scored.push({ el: cur, score: scoreAncestor(cur) });
      cur = cur.parentElement;
    }
  }

  const best = scored
    .filter((item) => item.score > 90)
    .sort((a, b) => b.score - a.score)[0];

  return best?.el || null;
}

function findFallbackPanel() {
  const nodes = Array.from(document.querySelectorAll("aside, section, div")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  );

  const best = nodes
    .map((el) => ({ el, score: scoreAncestor(el) }))
    .filter((item) => item.score > 120)
    .sort((a, b) => b.score - a.score)[0];

  return best?.el || null;
}

function findPanel() {
  return findPanelFromSearchInput() || findFallbackPanel();
}

function markOldHeader(panel: HTMLElement) {
  const children = Array.from(panel.children).filter((el): el is HTMLElement => el instanceof HTMLElement);

  for (const child of children.slice(0, 8)) {
    const t = textOf(child).toLowerCase();

    if (!t) continue;
    if (child.querySelector("input")) continue;
    if (t.includes("all branches")) continue;
    if (t.includes("search branch")) continue;
    if (t.includes("new branch path") || t.includes("add new folder")) continue;
    if (t.includes("head office") || t.includes("kl branch") || t.includes("remote sites")) continue;

    if (
      t.includes("software") ||
      t.includes("hardware") ||
      t.includes("network") ||
      t.includes("metering") ||
      t.includes("inventory") ||
      t.includes("browse") ||
      t.includes("endpoint")
    ) {
      child.setAttribute("data-ema-addon-old-header", "true");
    }
  }
}

function markMode(panel: HTMLElement) {
  const nodes = Array.from(panel.querySelectorAll("div, section, nav")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  );

  for (const node of nodes) {
    const t = textOf(node).toLowerCase();
    const rect = node.getBoundingClientRect();

    if (rect.width < 120 || rect.height < 26 || rect.height > 130) continue;

    if (t.includes("branch") && t.includes("statistics")) {
      node.setAttribute("data-ema-addon-mode", "true");
      return;
    }
  }
}

function markSearch(panel: HTMLElement) {
  const inputs = Array.from(panel.querySelectorAll("input")).filter(
    (el): el is HTMLInputElement => el instanceof HTMLInputElement
  );

  for (const input of inputs) {
    const ph = String(input.placeholder || "").toLowerCase();
    if (!ph.includes("search")) continue;

    input.setAttribute("data-ema-addon-search-input", "true");

    const parent = input.parentElement as HTMLElement | null;
    const grand = parent?.parentElement as HTMLElement | null;

    if (grand && grand.querySelector("button")) {
      grand.setAttribute("data-ema-addon-search-row", "true");
    } else if (parent) {
      parent.setAttribute("data-ema-addon-search-row", "true");
    }
  }
}

function markTree(panel: HTMLElement) {
  const nodes = Array.from(panel.querySelectorAll("ul, [role='tree'], div")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  );

  let best: HTMLElement | null = null;
  let bestScore = 0;

  for (const node of nodes) {
    const t = textOf(node).toLowerCase();
    const rect = node.getBoundingClientRect();

    if (rect.width < 120 || rect.height < 80) continue;

    let score = 0;
    if (t.includes("all branches")) score += 90;
    if (t.includes("head office")) score += 60;
    if (t.includes("kl branch")) score += 60;
    if (t.includes("remote sites")) score += 60;
    if (t.includes("site a")) score += 25;
    if (t.includes("new branch path")) score -= 50;
    if (t.includes("search branch")) score -= 50;
    if (t.includes("add new folder")) score -= 50;

    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }

  if (best) best.setAttribute("data-ema-addon-tree", "true");
}

function markAddFolder(panel: HTMLElement) {
  const buttons = Array.from(panel.querySelectorAll("button, [role='button']")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement
  );

  for (const btn of buttons) {
    const t = textOf(btn).toLowerCase();

    if (t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder")) {
      btn.setAttribute("data-ema-addon-add-folder", "true");
    }
  }
}

function apply() {
  window.__emaSidepanelAddonStatus = {
    ran: (window.__emaSidepanelAddonStatus?.ran || 0) + 1,
    forced: 0,
    route: window.location.pathname,
    reason: "",
  };

  cleanupOnlyOurMarks();

  if (isExcludedRoute()) {
    window.__emaSidepanelAddonStatus.reason = "excluded route";
    return;
  }

  const panel = findPanel();

  if (!panel) {
    window.__emaSidepanelAddonStatus.reason = "no branch panel found";
    return;
  }

  panel.setAttribute("data-ema-addon-branch-panel", "true");

  markOldHeader(panel);
  markMode(panel);
  markSearch(panel);
  markTree(panel);
  markAddFolder(panel);

  const r = panel.getBoundingClientRect();

  window.__emaSidepanelAddonStatus = {
    ran: window.__emaSidepanelAddonStatus.ran,
    forced: 1,
    route: window.location.pathname,
    reason: "forced",
    panelText: textOf(panel).slice(0, 220),
    panelRect: {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    },
  };
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
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("resize", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  document.addEventListener("click", () => setTimeout(apply, 100), true);
}

export {};
