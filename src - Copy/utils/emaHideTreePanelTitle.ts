const TARGET_ROUTES = [
  "/appmetering",
  "/app-metering",
  "/internet-metering",
  "/app-restriction",
  "/web-restriction",
  "/app-web-restriction",
  "/patch-management"
];

function shouldRun() {
  const p = window.location.pathname.toLowerCase();
  return TARGET_ROUTES.some((x) => p.includes(x));
}

function text(el: Element | null) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function visible(el: Element) {
  const node = el as HTMLElement;
  const r = node.getBoundingClientRect();
  const s = window.getComputedStyle(node);
  return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
}

function clearMarks() {
  document.querySelectorAll("[data-hide-tree-panel-title-panel],[data-hide-tree-panel-title-block]").forEach((el) => {
    const node = el as HTMLElement;
    delete node.dataset.hideTreePanelTitlePanel;
    delete node.dataset.hideTreePanelTitleBlock;
  });
}

function scorePanel(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;
  if (t.includes("package registry")) return -9999;

  if (r.left < 80 || r.left > 700) return -9999;
  if (r.width < 190 || r.width > 520) return -9999;
  if (r.height < 200) return -9999;

  let score = 0;

  if (t.includes("all branches")) score += 150;
  if (t.includes("search branches")) score += 120;
  if (t.includes("search branch")) score += 120;
  if (t.includes("add new folder")) score += 90;
  if (t.includes("app metering")) score += 80;
  if (t.includes("application metering")) score += 80;
  if (t.includes("internet metering")) score += 80;
  if (t.includes("app restriction")) score += 80;
  if (t.includes("web restriction")) score += 80;
  if (t.includes("patch management")) score += 80;

  if (panel.querySelector("input[placeholder*='Search']")) score += 50;
  if (panel.querySelector(".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .network-tree, .tree-list, [aria-label*='tree'], [aria-label*='Tree']")) score += 80;

  return score;
}

function findPanel() {
  const marked =
    document.querySelector("[data-tree-panel-final='true']") ||
    document.querySelector("[data-unified-tree-panel='true']") ||
    document.querySelector("[data-clean-tree-panel='true']") ||
    document.querySelector("[data-ema-branch-panel-standard='true']");

  if (marked instanceof HTMLElement && visible(marked)) return marked;

  const candidates = Array.from(document.querySelectorAll(
    "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .branch-sidebar, .folder-sidebar, .inventory-sidebar, .tree-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, [class*='sidepanel'], [class*='side-panel']"
  )).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return candidates
    .map((el) => ({ el, score: scorePanel(el) }))
    .filter((x) => x.score > 90)
    .sort((a, b) => b.score - a.score)[0]?.el || null;
}

function isOldTitleBlock(el: HTMLElement) {
  const t = text(el).toLowerCase();

  if (!t) return false;
  if (el.querySelector("input")) return false;
  if (t.includes("search branches")) return false;
  if (t.includes("add new folder")) return false;
  if (t.includes("all branches") && (t.includes("hq") || t.includes("kl branch"))) return false;

  return (
    t.includes("app metering") ||
    t.includes("application metering") ||
    t.includes("internet metering") ||
    t.includes("app restriction") ||
    t.includes("web restriction") ||
    t.includes("patch management") ||
    t.includes("manage metering branches") ||
    t.includes("manage internet") ||
    t.includes("manage application") ||
    t.includes("manage restriction") ||
    t.includes("manage patch")
  );
}

function hideOldTitle(panel: HTMLElement) {
  panel.setAttribute("data-hide-tree-panel-title-panel", "true");

  const directChildren = Array.from(panel.children).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const child of directChildren.slice(0, 10)) {
    if (isOldTitleBlock(child)) {
      child.setAttribute("data-hide-tree-panel-title-block", "true");

      child.style.setProperty("display", "none", "important");
      child.style.setProperty("height", "0", "important");
      child.style.setProperty("min-height", "0", "important");
      child.style.setProperty("max-height", "0", "important");
      child.style.setProperty("margin", "0", "important");
      child.style.setProperty("padding", "0", "important");
      child.style.setProperty("overflow", "hidden", "important");
    }

    child.querySelectorAll("h1, h2, h3, h4, p, small, [class*='title'], [class*='subtitle'], [class*='description']").forEach((inner) => {
      const node = inner as HTMLElement;
      const tt = text(node).toLowerCase();

      if (
        tt.includes("app metering") ||
        tt.includes("application metering") ||
        tt.includes("internet metering") ||
        tt.includes("app restriction") ||
        tt.includes("web restriction") ||
        tt.includes("patch management") ||
        tt.includes("manage metering branches") ||
        tt.includes("manage restriction") ||
        tt.includes("manage patch")
      ) {
        const block = node.closest("div, section, header") as HTMLElement | null;
        const target = block && panel.contains(block) ? block : node;

        target.setAttribute("data-hide-tree-panel-title-block", "true");
        target.style.setProperty("display", "none", "important");
        target.style.setProperty("height", "0", "important");
        target.style.setProperty("min-height", "0", "important");
        target.style.setProperty("margin", "0", "important");
        target.style.setProperty("padding", "0", "important");
        target.style.setProperty("overflow", "hidden", "important");
      }
    });
  }
}

function apply() {
  clearMarks();

  if (!shouldRun()) {
    document.body.classList.remove("ema-hide-tree-panel-title");
    return;
  }

  const panel = findPanel();

  if (!panel) {
    document.body.classList.remove("ema-hide-tree-panel-title");
    return;
  }

  document.body.classList.add("ema-hide-tree-panel-title");
  hideOldTitle(panel);
}

function schedule() {
  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 120);
    setTimeout(apply, 400);
    setTimeout(apply, 900);
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
