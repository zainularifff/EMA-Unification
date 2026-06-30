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
  document.querySelectorAll("[data-unified-tree-panel],[data-unified-tree-body],[data-unified-tree-old],[data-unified-tree-tabs],[data-unified-tree-search],[data-unified-tree-list],[data-unified-tree-row],[data-unified-tree-chevron],[data-unified-tree-icon],[data-unified-tree-label],[data-unified-tree-count],[data-unified-tree-add]").forEach((el) => {
    const n = el as HTMLElement;
    [
      "unifiedTreePanel",
      "unifiedTreeBody",
      "unifiedTreeOld",
      "unifiedTreeTabs",
      "unifiedTreeSearch",
      "unifiedTreeList",
      "unifiedTreeRow",
      "unifiedTreeChevron",
      "unifiedTreeIcon",
      "unifiedTreeLabel",
      "unifiedTreeCount",
      "unifiedTreeAdd",
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

  if (r.left < 90 || r.left > 680) return -9999;
  if (r.width < 190 || r.width > 490) return -9999;
  if (r.height < 200) return -9999;

  let score = 0;

  if (t.includes("all branches")) score += 140;
  if (t.includes("search branches")) score += 120;
  if (t.includes("search branch")) score += 120;
  if (t.includes("branch")) score += 70;
  if (t.includes("network")) score += 40;
  if (t.includes("statistics")) score += 20;
  if (t.includes("add new folder")) score += 90;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;

  if (panel.querySelector(".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .network-tree, .tree-list, [aria-label*='tree'], [aria-label*='Tree']")) score += 80;
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
    ".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .network-tree, .folder-tree, .branch-tree, .tree-list, .tree-scroll, [aria-label*='tree'], [aria-label*='Tree'], ul"
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
    if (t.includes("network")) score += 40;
    if (t.includes("search branch")) score -= 80;
    if (t.includes("add new folder")) score -= 80;

    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function markOld(panel: HTMLElement) {
  panel.querySelectorAll("#hardwareMenu, nav[role='tablist'], .ema-module-sidebar-switcher, .settings-menu-list, .sidebar-tabs, .sidebar-modes, .view-switch, .panel-switch").forEach((el) => {
    (el as HTMLElement).setAttribute("data-unified-tree-tabs", "true");
  });

  const kids = Array.from(panel.children).filter((el) => el instanceof HTMLElement) as HTMLElement[];
  for (const child of kids.slice(0, 8)) {
    const t = text(child).toLowerCase();
    if (!t) continue;
    if (child.querySelector("input")) continue;
    if (t.includes("all branches") && (t.includes("hq") || t.includes("kl branch"))) continue;
    if (t.includes("search branch")) continue;

    if (
      t.includes("hardware inventory") ||
      t.includes("software") ||
      t.includes("network") ||
      t.includes("inventory") ||
      t.includes("manage hardware") ||
      t.includes("browse software")
    ) {
      child.setAttribute("data-unified-tree-old", "true");
    }
  }
}

function markSearch(panel: HTMLElement) {
  const input = Array.from(panel.querySelectorAll("input")).find((el) => {
    const ph = String((el as HTMLInputElement).placeholder || "").toLowerCase();
    return ph.includes("search");
  }) as HTMLInputElement | undefined;

  if (!input) return;

  let row = input.closest(".hardware-branch-search, .ema-sidebar-field, .section-search, .sidebar-search, .search-box, .tree-search, .branch-search, .folder-search") as HTMLElement | null;
  if (!row) row = input.parentElement as HTMLElement | null;

  if (row) row.setAttribute("data-unified-tree-search", "true");
}

function markAdd(panel: HTMLElement) {
  const btn = Array.from(panel.querySelectorAll("button, [role='button']")).find((el) => {
    const t = text(el).toLowerCase();
    return t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder");
  }) as HTMLElement | undefined;

  if (btn) btn.setAttribute("data-unified-tree-add", "true");
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
      t.includes("network") ||
      t.includes("remote") ||
      t.includes("site ") ||
      !!row.querySelector("svg");

    if (!looksTree) continue;

    row.setAttribute("data-unified-tree-row", "true");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-unified-tree-chevron", "true");
      svgs.slice(1).forEach((svg) => svg.setAttribute("data-unified-tree-icon", "true"));
    } else {
      for (const svg of svgs) {
        if (isChevron(svg)) svg.setAttribute("data-unified-tree-chevron", "true");
        else svg.setAttribute("data-unified-tree-icon", "true");
      }
    }

    row.querySelectorAll("span, i, button, div").forEach((el) => {
      if (isChevron(el)) (el as HTMLElement).setAttribute("data-unified-tree-chevron", "true");
    });

    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 52 && rr.height <= 32) {
        (el as HTMLElement).setAttribute("data-unified-tree-count", "true");
      }
    });

    const labels = Array.from(row.querySelectorAll("span, strong, div, p")).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.dataset.unifiedTreeChevron === "true") return false;
      if (el.dataset.unifiedTreeCount === "true") return false;

      const tt = text(el);
      if (!/[a-zA-Z]/.test(tt)) return false;
      if (tt.length > 140) return false;

      return true;
    }) as HTMLElement[];

    const label =
      labels.find((el) => /all branches|head office|hq|kl branch|putrajaya|selangor|perlis|wssb|network|remote|site/i.test(text(el))) ||
      labels[labels.length - 1];

    if (label) label.setAttribute("data-unified-tree-label", "true");
  }
}

function openAll(panel: HTMLElement) {
  const key = "unifiedTreeOpened";
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
        t.includes("network") ||
        t.includes("servers") ||
        t.includes("wssb")
      ) {
        try { (el as HTMLElement).click(); } catch {}
      }
    });
  }, 120);
}

function apply() {
  clearMarks();

  if (isExcluded()) {
    document.body.classList.remove("ema-unified-branch-tree");
    return;
  }

  const panel = findPanel();
  if (!panel) {
    document.body.classList.remove("ema-unified-branch-tree");
    return;
  }

  document.body.classList.add("ema-unified-branch-tree");

  panel.setAttribute("data-unified-tree-panel", "true");

  const body = findBody(panel);
  body.setAttribute("data-unified-tree-body", "true");

  markOld(panel);
  markSearch(panel);
  markAdd(panel);

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-unified-tree-list", "true");
    markRows(tree);
  }

  openAll(panel);
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
