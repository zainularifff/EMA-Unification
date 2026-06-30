const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];

function excluded() {
  const p = window.location.pathname.toLowerCase();
  return EXCLUDE.some((x) => p.includes(x));
}

function isVisible(el: Element) {
  const node = el as HTMLElement;
  const r = node.getBoundingClientRect();
  const s = window.getComputedStyle(node);
  return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
}

function getPanels() {
  if (excluded()) return [];

  return Array.from(
    document.querySelectorAll(
      "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .folder-sidebar, .branch-sidebar, .inventory-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, .tree-sidebar, .ema-branch-sidepanel-v3, [data-ema-branch-panel-v3='true']"
    )
  ).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (!isVisible(el)) return false;

    const text = String(el.textContent || "").toLowerCase();
    return text.includes("branch") || text.includes("all branches") || !!el.querySelector(".ema-sidebar-tree, .hardware-location-tree-card, .software-tree-panel, [aria-label*='tree']");
  }) as HTMLElement[];
}

function markChevrons(panel: HTMLElement) {
  const obvious = panel.querySelectorAll(
    ".lucide-chevron-right, .lucide-chevron-down, .lucide-chevron-left, .lucide-chevron-up, [class*='chevron'], [class*='Chevron'], [class*='expander'], [class*='Expander'], [class*='arrow'], [class*='Arrow']"
  );

  obvious.forEach((el) => {
    (el as HTMLElement).setAttribute("data-ema-v5-chevron", "true");
  });

  panel.querySelectorAll("span, i, button").forEach((el) => {
    const text = String(el.textContent || "").trim();

    if ([">", "?", "?", "?", "?", "?", "?", "?"].includes(text)) {
      (el as HTMLElement).setAttribute("data-ema-v5-chevron", "true");
    }
  });

  const rows = Array.from(
    panel.querySelectorAll(
      ".ema-sidebar-tree-main, .ema-sidebar-tree-node, .hardware-location-tree-card button, .hardware-location-tree-scroll button, .ema-sidebar-tree button, .software-tree-panel button, .folder-tree button, .branch-tree button, .tree-list button, [role='treeitem']"
    )
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const row of rows) {
    const svgs = Array.from(row.querySelectorAll("svg")).filter(isVisible) as SVGElement[];

    /* Hardware rows normally render Chevron + Folder. Hide the first svg when row is expandable. */
    const expandable =
      row.hasAttribute("aria-expanded") ||
      row.querySelector("[aria-expanded]") ||
      svgs.length >= 2;

    if (expandable && svgs.length >= 2) {
      svgs[0].setAttribute("data-ema-v5-chevron", "true");
    }
  }
}

function openDefault(panel: HTMLElement) {
  const key = "emaV5RowFixOpened";
  if (panel.dataset[key] === "true") return;
  panel.dataset[key] = "true";

  const branchTab = Array.from(panel.querySelectorAll("button")).find((btn) => {
    const t = String(btn.textContent || "").trim().toLowerCase();
    return t === "branch" || t.startsWith("branch ");
  }) as HTMLButtonElement | undefined;

  try { branchTab?.click(); } catch {}

  setTimeout(() => {
    Array.from(panel.querySelectorAll("button[aria-expanded='false'], [role='treeitem'][aria-expanded='false']")).forEach((el) => {
      const btn = el as HTMLElement;
      const text = String(btn.textContent || btn.getAttribute("aria-label") || "").toLowerCase();

      if (
        text.includes("all branches") ||
        text.includes("head office") ||
        text.includes("remote") ||
        text.includes("branch")
      ) {
        try { btn.click(); } catch {}
      }
    });
  }, 120);
}

function apply() {
  if (excluded()) return;
  if (!document.body.classList.contains("ema-sidepanel-v5-page")) return;

  for (const panel of getPanels()) {
    markChevrons(panel);
    openDefault(panel);
  }
}

function schedule() {
  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 200);
    setTimeout(apply, 700);
  });
}

if (typeof window !== "undefined") {
  schedule();

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("resize", schedule);
}

export {};
