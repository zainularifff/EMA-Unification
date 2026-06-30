const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];

function isExcluded() {
  const p = window.location.pathname.toLowerCase();
  return EXCLUDE.some((x) => p.includes(x));
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
  document.querySelectorAll("[data-clean-tree-panel],[data-clean-tree-body],[data-clean-tree-old-header],[data-clean-tree-tabs],[data-clean-tree-search],[data-clean-tree-list],[data-clean-tree-row],[data-clean-tree-chevron],[data-clean-tree-icon],[data-clean-tree-label],[data-clean-tree-count],[data-clean-tree-action],[data-clean-tree-add]").forEach((el) => {
    const n = el as HTMLElement;
    [
      "cleanTreePanel",
      "cleanTreeBody",
      "cleanTreeOldHeader",
      "cleanTreeTabs",
      "cleanTreeSearch",
      "cleanTreeList",
      "cleanTreeRow",
      "cleanTreeChevron",
      "cleanTreeIcon",
      "cleanTreeLabel",
      "cleanTreeCount",
      "cleanTreeAction",
      "cleanTreeAdd"
    ].forEach((k) => delete n.dataset[k]);
  });
}

function scorePanel(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;
  if (t.includes("package registry")) return -9999;
  if (t.includes("device registry") && !t.includes("all branches")) return -9999;

  if (r.left < 100 || r.left > 650) return -9999;
  if (r.width < 200 || r.width > 470) return -9999;
  if (r.height < 220) return -9999;

  let score = 0;

  if (t.includes("all branches")) score += 140;
  if (t.includes("search branches")) score += 120;
  if (t.includes("search branch")) score += 120;
  if (t.includes("branch")) score += 70;
  if (t.includes("statistics")) score += 20;
  if (t.includes("add new folder")) score += 90;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;

  if (panel.querySelector(".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .tree-list, [aria-label*='tree'], [aria-label*='Tree']")) score += 80;
  if (panel.querySelector("input[placeholder*='Search']")) score += 40;

  return score;
}

function findPanel() {
  const panels = Array.from(document.querySelectorAll(
    "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .branch-sidebar, .folder-sidebar, .inventory-sidebar, .tree-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, [class*='sidepanel'], [class*='side-panel']"
  )).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return panels
    .map((el) => ({ el, score: scorePanel(el) }))
    .filter((x) => x.score > 90)
    .sort((a, b) => b.score - a.score)[0]?.el || null;
}

function findBody(panel: HTMLElement) {
  return (
    panel.querySelector(".hardware-branch-body, .hardware-branch-panel-body, .ema-sidebar-content, .ema-sidebar-subpanel, .sidebar-body, .tree-body, .folder-body") ||
    panel
  ) as HTMLElement;
}

function findTree(panel: HTMLElement) {
  const candidates = Array.from(panel.querySelectorAll(
    ".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .folder-tree, .branch-tree, .tree-list, .tree-scroll, [aria-label*='tree'], [aria-label*='Tree'], ul"
  )).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  let best: HTMLElement | null = null;
  let bestScore = 0;

  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    const t = text(el).toLowerCase();

    if (r.width < 100 || r.height < 24) continue;

    let score = 0;
    if (t.includes("all branches")) score += 120;
    if (t.includes("head office")) score += 60;
    if (t.includes("kl branch")) score += 60;
    if (t.includes("remote sites")) score += 60;
    if (t.includes("site a")) score += 30;
    if (t.includes("search branch")) score -= 80;
    if (t.includes("add new folder")) score -= 80;

    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function markOldHeader(panel: HTMLElement) {
  const kids = Array.from(panel.children).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const child of kids.slice(0, 8)) {
    const t = text(child).toLowerCase();
    if (!t) continue;
    if (child.querySelector("input")) continue;
    if (t.includes("search branch")) continue;
    if (t.includes("add new folder")) continue;
    if (t.includes("all branches") && t.includes("hq")) continue;

    if (
      t.includes("hardware inventory") ||
      t.includes("software") ||
      t.includes("inventory") ||
      t.includes("manage hardware") ||
      t.includes("browse software")
    ) {
      child.setAttribute("data-clean-tree-old-header", "true");
    }
  }

  panel.querySelectorAll("#hardwareMenu, nav[role='tablist'], .ema-module-sidebar-switcher, .settings-menu-list, .sidebar-tabs, .sidebar-modes, .view-switch, .panel-switch").forEach((el) => {
    (el as HTMLElement).setAttribute("data-clean-tree-tabs", "true");
  });
}

function markSearch(panel: HTMLElement) {
  const input = Array.from(panel.querySelectorAll("input")).find((el) => {
    const ph = String((el as HTMLInputElement).placeholder || "").toLowerCase();
    return ph.includes("search");
  }) as HTMLInputElement | undefined;

  if (!input) return;

  let row = input.closest(".hardware-branch-search, .ema-sidebar-field, .section-search, .sidebar-search, .search-box, .tree-search, .branch-search, .folder-search") as HTMLElement | null;
  if (!row) row = input.parentElement as HTMLElement | null;

  if (row) row.setAttribute("data-clean-tree-search", "true");
}

function markAdd(panel: HTMLElement) {
  const btn = Array.from(panel.querySelectorAll("button, [role='button']")).find((el) => {
    const t = text(el).toLowerCase();
    return t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder");
  }) as HTMLElement | undefined;

  if (btn) btn.setAttribute("data-clean-tree-add", "true");
}

function isChevron(el: Element) {
  const cls = String((el as HTMLElement).getAttribute("class") || "").toLowerCase();
  const tt = text(el);
  return cls.includes("chevron") || cls.includes("expander") || cls.includes("arrow") || [">", "?", "?", "?", "?", "?", "?", "?"].includes(tt);
}

function markRows(tree: HTMLElement) {
  const rows = Array.from(tree.querySelectorAll(
    ".hardware-tree-select, .ema-sidebar-tree-main, .ema-sidebar-tree-node, button, [role='button'], [role='treeitem']"
  )).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const row of rows) {
    if (!visible(row)) continue;

    const t = text(row).toLowerCase();
    const r = row.getBoundingClientRect();

    if (!t) continue;
    if (r.height < 12 || r.height > 90) continue;
    if (t.includes("search")) continue;
    if (t.includes("add new folder")) continue;

    const looksTree =
      t.includes("all branches") ||
      t.includes("head office") ||
      t.includes("hq") ||
      t.includes("branch") ||
      t.includes("remote") ||
      t.includes("site ") ||
      !!row.querySelector("svg");

    if (!looksTree) continue;

    row.setAttribute("data-clean-tree-row", "true");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-clean-tree-chevron", "true");
      svgs.slice(1).forEach((svg) => svg.setAttribute("data-clean-tree-icon", "true"));
    } else {
      for (const svg of svgs) {
        if (isChevron(svg)) svg.setAttribute("data-clean-tree-chevron", "true");
        else svg.setAttribute("data-clean-tree-icon", "true");
      }
    }

    row.querySelectorAll("span, i, button, div").forEach((el) => {
      if (isChevron(el)) (el as HTMLElement).setAttribute("data-clean-tree-chevron", "true");
    });

    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 52 && rr.height <= 32) {
        (el as HTMLElement).setAttribute("data-clean-tree-count", "true");
      }
    });

    const labels = Array.from(row.querySelectorAll("span, strong, div, p")).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.dataset.cleanTreeChevron === "true") return false;
      if (el.dataset.cleanTreeCount === "true") return false;

      const tt = text(el);
      if (!/[a-zA-Z]/.test(tt)) return false;
      if (tt.length > 120) return false;

      return true;
    }) as HTMLElement[];

    const label =
      labels.find((el) => /all branches|head office|hq|kl branch|putrajaya|selangor|perlis|wssb|padang|remote|site/i.test(text(el))) ||
      labels[labels.length - 1];

    if (label) label.setAttribute("data-clean-tree-label", "true");

    row.querySelectorAll(".hardware-tree-actions, .hardware-tree-more, .tree-actions, .node-actions, .folder-actions").forEach((el) => {
      (el as HTMLElement).setAttribute("data-clean-tree-action", "true");
    });
  }
}

function openAll(panel: HTMLElement) {
  const key = "cleanTreeOpened";
  if (panel.dataset[key] === "true") return;
  panel.dataset[key] = "true";

  setTimeout(() => {
    panel.querySelectorAll("button[aria-expanded='false'], [role='treeitem'][aria-expanded='false']").forEach((el) => {
      const t = text(el).toLowerCase();

      if (
        t.includes("all branches") ||
        t.includes("head office") ||
        t.includes("remote") ||
        t.includes("branch") ||
        t.includes("servers") ||
        t.includes("wssb")
      ) {
        try { (el as HTMLElement).click(); } catch {}
      }
    });
  }, 150);
}

function apply() {
  clearMarks();

  if (isExcluded()) {
    document.body.classList.remove("ema-clean-reference-tree");
    return;
  }

  const panel = findPanel();
  if (!panel) {
    document.body.classList.remove("ema-clean-reference-tree");
    return;
  }

  document.body.classList.add("ema-clean-reference-tree");

  panel.setAttribute("data-clean-tree-panel", "true");

  const body = findBody(panel);
  body.setAttribute("data-clean-tree-body", "true");

  markOldHeader(panel);
  markSearch(panel);
  markAdd(panel);

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-clean-tree-list", "true");
    markRows(tree);
  }

  openAll(panel);
}

function schedule() {
  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 200);
    setTimeout(apply, 600);
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
