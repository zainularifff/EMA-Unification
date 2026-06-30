const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];
const WIDTH = 340;
const GAP = 20;

function isExcluded() {
  const p = window.location.pathname.toLowerCase();
  return EXCLUDE.some((x) => p.includes(x));
}

function visible(el: Element) {
  const node = el as HTMLElement;
  const r = node.getBoundingClientRect();
  const s = window.getComputedStyle(node);

  return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
}

function text(el: Element | null) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function important(el: HTMLElement, prop: string, value: string) {
  el.style.setProperty(prop, value, "important");
}

function clearOldMarks() {
  document.querySelectorAll("[data-tree-layout-parent-final],[data-tree-layout-left-final],[data-tree-layout-right-final]").forEach((el) => {
    const n = el as HTMLElement;
    delete n.dataset.treeLayoutParentFinal;
    delete n.dataset.treeLayoutLeftFinal;
    delete n.dataset.treeLayoutRightFinal;
  });
}

function findPanel() {
  const direct =
    document.querySelector("[data-tree-panel-final='true']") ||
    document.querySelector("[data-unified-tree-panel='true']") ||
    document.querySelector("[data-clean-tree-panel='true']") ||
    document.querySelector("[data-ema-branch-panel-standard='true']");

  if (direct instanceof HTMLElement && visible(direct)) return direct;

  const candidates = Array.from(document.querySelectorAll(
    "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .branch-sidebar, .folder-sidebar, .inventory-sidebar, .tree-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, [class*='sidepanel'], [class*='side-panel']"
  )).filter((el) => el instanceof HTMLElement && visible(el)) as HTMLElement[];

  const scored = candidates.map((el) => {
    const r = el.getBoundingClientRect();
    const t = text(el).toLowerCase();

    let score = 0;

    if (r.left > 720) score -= 1000;
    if (r.width < 220 || r.width > 460) score -= 200;
    if (r.height < 220) score -= 200;

    if (t.includes("all branches")) score += 150;
    if (t.includes("search branches")) score += 120;
    if (t.includes("branch")) score += 80;
    if (t.includes("add new folder")) score += 80;

    if (el.querySelector(".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .network-tree, .tree-list, [aria-label*='tree'], [aria-label*='Tree']")) score += 120;

    if (t.includes("device registry") || t.includes("package registry") || t.includes("target device registry")) score -= 180;
    if (t.includes("ema system") || t.includes("logout") || t.includes("main category")) score -= 500;

    return { el, score };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.score > 80
    ? scored.sort((a, b) => b.score - a.score)[0].el
    : null;
}

function findLayout(panel: HTMLElement) {
  const panelRect = panel.getBoundingClientRect();

  let best: {
    parent: HTMLElement;
    left: HTMLElement;
    rights: HTMLElement[];
    score: number;
  } | null = null;

  for (let parent = panel.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (!(parent instanceof HTMLElement)) continue;

    const children = Array.from(parent.children).filter((el) => el instanceof HTMLElement && visible(el)) as HTMLElement[];
    if (children.length < 2) continue;

    const left = children.find((child) => child === panel || child.contains(panel));
    if (!left) continue;

    const rights = children.filter((child) => {
      if (child === left) return false;

      const r = child.getBoundingClientRect();
      const t = text(child).toLowerCase();

      const isRightSide = r.left >= panelRect.left + 80;
      const isBig = r.width > 360 && r.height > 180;
      const hasPageContent =
        t.includes("registry") ||
        t.includes("inventory") ||
        t.includes("dashboard") ||
        t.includes("refresh") ||
        t.includes("export") ||
        t.includes("status") ||
        t.includes("platform");

      return isRightSide && (isBig || hasPageContent);
    });

    if (!rights.length) continue;

    const parentRect = parent.getBoundingClientRect();

    let score = 0;
    score += 1000 - Math.abs(parentRect.top - panelRect.top);
    score += rights.length * 50;

    if (parentRect.width > window.innerWidth * 0.65) score += 100;
    if (parentRect.left <= panelRect.left + 5) score += 50;

    /* avoid app shell/body-level parent */
    if (text(parent).toLowerCase().includes("ema system") && text(parent).toLowerCase().includes("logout")) {
      score -= 500;
    }

    if (!best || score > best.score) {
      best = { parent, left, rights, score };
    }
  }

  return best;
}

function apply() {
  clearOldMarks();

  if (isExcluded()) {
    document.body.classList.remove("ema-tree-layout-reserve-final");
    return;
  }

  const panel = findPanel();

  if (!panel) {
    document.body.classList.remove("ema-tree-layout-reserve-final");
    return;
  }

  const layout = findLayout(panel);

  if (!layout) {
    document.body.classList.remove("ema-tree-layout-reserve-final");
    return;
  }

  document.body.classList.add("ema-tree-layout-reserve-final");

  layout.parent.setAttribute("data-tree-layout-parent-final", "true");
  layout.left.setAttribute("data-tree-layout-left-final", "true");

  for (const right of layout.rights) {
    right.setAttribute("data-tree-layout-right-final", "true");
  }

  important(layout.parent, "display", "grid");
  important(layout.parent, "grid-template-columns", WIDTH + "px minmax(0, 1fr)");
  important(layout.parent, "column-gap", GAP + "px");
  important(layout.parent, "gap", GAP + "px");
  important(layout.parent, "align-items", "stretch");
  important(layout.parent, "width", "100%");
  important(layout.parent, "max-width", "100%");
  important(layout.parent, "overflow", "hidden");
  important(layout.parent, "box-sizing", "border-box");

  important(layout.left, "grid-column", "1");
  important(layout.left, "width", WIDTH + "px");
  important(layout.left, "min-width", WIDTH + "px");
  important(layout.left, "max-width", WIDTH + "px");
  important(layout.left, "margin", "0");
  important(layout.left, "transform", "none");
  important(layout.left, "box-sizing", "border-box");
  important(layout.left, "z-index", "2");

  important(panel, "width", WIDTH + "px");
  important(panel, "min-width", WIDTH + "px");
  important(panel, "max-width", WIDTH + "px");
  important(panel, "margin", "0");
  important(panel, "box-sizing", "border-box");

  for (const right of layout.rights) {
    important(right, "grid-column", "2");
    important(right, "min-width", "0");
    important(right, "width", "100%");
    important(right, "max-width", "100%");
    important(right, "margin-left", "0");
    important(right, "transform", "none");
    important(right, "box-sizing", "border-box");
    important(right, "z-index", "1");
    important(right, "overflow", "hidden");
  }
}

function schedule() {
  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 150);
    setTimeout(apply, 500);
    setTimeout(apply, 1200);
  });
}

if (typeof window !== "undefined") {
  schedule();

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("resize", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
}

export {};
