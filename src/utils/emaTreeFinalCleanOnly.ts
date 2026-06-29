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

function important(el: HTMLElement, prop: string, value: string) {
  el.style.setProperty(prop, value, "important");
}

function clearMarks() {
  document.querySelectorAll("[data-tree-panel-final],[data-tree-body-final],[data-tree-old-final],[data-tree-tabs-final],[data-tree-search-final],[data-tree-list-final],[data-tree-row-final],[data-tree-chevron-final],[data-tree-icon-final],[data-tree-label-final],[data-tree-count-final],[data-tree-action-final],[data-tree-add-final]").forEach((el) => {
    const n = el as HTMLElement;
    [
      "treePanelFinal",
      "treeBodyFinal",
      "treeOldFinal",
      "treeTabsFinal",
      "treeSearchFinal",
      "treeListFinal",
      "treeRowFinal",
      "treeChevronFinal",
      "treeIconFinal",
      "treeLabelFinal",
      "treeCountFinal",
      "treeActionFinal",
      "treeAddFinal"
    ].forEach((k) => delete n.dataset[k]);
  });
}

function panelScore(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;
  if (t.includes("package registry")) return -9999;
  if (t.includes("device registry") && !t.includes("all branches")) return -9999;

  if (r.left < 80 || r.left > 700) return -9999;
  if (r.width < 190 || r.width > 520) return -9999;
  if (r.height < 200) return -9999;

  let score = 0;

  if (t.includes("all branches")) score += 150;
  if (t.includes("search branches")) score += 120;
  if (t.includes("search branch")) score += 120;
  if (t.includes("branch")) score += 80;
  if (t.includes("network")) score += 40;
  if (t.includes("add new folder")) score += 90;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;

  if (panel.querySelector(".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .network-tree, .tree-list, [aria-label*='tree'], [aria-label*='Tree']")) score += 90;
  if (panel.querySelector("input[placeholder*='Search']")) score += 40;

  return score;
}

function findPanel() {
  const panels = Array.from(document.querySelectorAll(
    "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .branch-sidebar, .folder-sidebar, .inventory-sidebar, .tree-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, [class*='sidepanel'], [class*='side-panel']"
  )).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return panels
    .map((el) => ({ el, score: panelScore(el) }))
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
    if (t.includes("all branches")) score += 130;
    if (t.includes("head office")) score += 60;
    if (t.includes("kl branch")) score += 60;
    if (t.includes("remote sites")) score += 60;
    if (t.includes("network")) score += 40;
    if (t.includes("search branch")) score -= 90;
    if (t.includes("add new folder")) score -= 90;

    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function markOld(panel: HTMLElement) {
  panel.querySelectorAll("#hardwareMenu, nav[role='tablist'], .ema-module-sidebar-switcher, .settings-menu-list, .sidebar-tabs, .sidebar-modes, .view-switch, .panel-switch").forEach((el) => {
    (el as HTMLElement).setAttribute("data-tree-tabs-final", "true");
  });

  const kids = Array.from(panel.children).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const child of kids.slice(0, 8)) {
    const t = text(child).toLowerCase();
    if (!t) continue;
    if (child.querySelector("input")) continue;
    if (t.includes("all branches") && (t.includes("hq") || t.includes("kl branch"))) continue;
    if (t.includes("search branch")) continue;
    if (t.includes("add new folder")) continue;

    if (
      t.includes("hardware inventory") ||
      t.includes("software") ||
      t.includes("network") ||
      t.includes("inventory") ||
      t.includes("manage hardware") ||
      t.includes("browse software")
    ) {
      child.setAttribute("data-tree-old-final", "true");
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

  if (row) row.setAttribute("data-tree-search-final", "true");
}

function markAdd(panel: HTMLElement) {
  const btn = Array.from(panel.querySelectorAll("button, [role='button']")).find((el) => {
    const t = text(el).toLowerCase();
    return t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder");
  }) as HTMLElement | undefined;

  if (btn) btn.setAttribute("data-tree-add-final", "true");
}

function isChevron(el: Element) {
  const cls = String((el as HTMLElement).getAttribute("class") || "").toLowerCase();
  const tt = text(el);
  return cls.includes("chevron") || cls.includes("expander") || cls.includes("arrow") || [">", "?", "?", "?", "?", "?", "?", "?"].includes(tt);
}

function styleLabel(label: HTMLElement) {
  label.setAttribute("data-tree-label-final", "true");

  important(label, "flex", "1 1 auto");
  important(label, "min-width", "110px");
  important(label, "width", "auto");
  important(label, "max-width", "none");
  important(label, "display", "block");
  important(label, "white-space", "nowrap");
  important(label, "word-break", "keep-all");
  important(label, "overflow-wrap", "normal");
  important(label, "overflow", "hidden");
  important(label, "text-overflow", "ellipsis");
  important(label, "text-align", "left");
  important(label, "font-size", "10.5px");
  important(label, "line-height", "1.25");
  important(label, "font-weight", "850");
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
    if (r.height < 12 || r.height > 95) continue;
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

    row.setAttribute("data-tree-row-final", "true");

    important(row, "display", "flex");
    important(row, "flex-direction", "row");
    important(row, "flex-wrap", "nowrap");
    important(row, "align-items", "center");
    important(row, "gap", "7px");
    important(row, "overflow", "hidden");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-tree-chevron-final", "true");
      svgs.slice(1).forEach((svg) => svg.setAttribute("data-tree-icon-final", "true"));
    } else {
      for (const svg of svgs) {
        if (isChevron(svg)) svg.setAttribute("data-tree-chevron-final", "true");
        else svg.setAttribute("data-tree-icon-final", "true");
      }
    }

    row.querySelectorAll("span, i, button, div").forEach((el) => {
      if (isChevron(el)) (el as HTMLElement).setAttribute("data-tree-chevron-final", "true");
    });

    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 52 && rr.height <= 32) {
        (el as HTMLElement).setAttribute("data-tree-count-final", "true");
      }
    });

    row.querySelectorAll(".hardware-tree-actions, .hardware-tree-more, .tree-actions, .node-actions, .folder-actions, button[aria-label*='More'], button[title*='More']").forEach((el) => {
      (el as HTMLElement).setAttribute("data-tree-action-final", "true");
    });

    const labels = Array.from(row.querySelectorAll("span, strong, div, p")).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.dataset.treeChevronFinal === "true") return false;
      if (el.dataset.treeCountFinal === "true") return false;
      if (el.dataset.treeActionFinal === "true") return false;

      const tt = text(el);
      if (!/[a-zA-Z]/.test(tt)) return false;
      if (tt.length > 140) return false;

      return true;
    }) as HTMLElement[];

    const label =
      labels.find((el) => /all branches|head office|hq|kl branch|putrajaya|selangor|perlis|wssb|padang|network|remote|site|servers/i.test(text(el))) ||
      labels[labels.length - 1];

    if (label) styleLabel(label);
  }
}

function openAll(panel: HTMLElement) {
  const key = "treeFinalOpened";
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
    document.body.classList.remove("ema-tree-final-clean");
    return;
  }

  const panel = findPanel();

  if (!panel) {
    document.body.classList.remove("ema-tree-final-clean");
    return;
  }

  document.body.classList.add("ema-tree-final-clean");

  panel.setAttribute("data-tree-panel-final", "true");

  const body = findBody(panel);
  body.setAttribute("data-tree-body-final", "true");

  markOld(panel);
  markSearch(panel);
  markAdd(panel);

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-tree-list-final", "true");
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
    setTimeout(apply, 1500);
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
