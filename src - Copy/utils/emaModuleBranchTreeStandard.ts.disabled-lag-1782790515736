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
  document.querySelectorAll(
    "[data-ema-branch-panel-standard],[data-ema-branch-body-standard],[data-ema-branch-search-standard],[data-ema-branch-search-input-standard],[data-ema-branch-add-standard],[data-ema-branch-tree-standard],[data-ema-branch-row-standard],[data-ema-branch-chevron-standard],[data-ema-branch-icon-standard],[data-ema-branch-label-standard],[data-ema-branch-count-standard]"
  ).forEach((el) => {
    const n = el as HTMLElement;
    [
      "emaBranchPanelStandard",
      "emaBranchBodyStandard",
      "emaBranchSearchStandard",
      "emaBranchSearchInputStandard",
      "emaBranchAddStandard",
      "emaBranchTreeStandard",
      "emaBranchRowStandard",
      "emaBranchChevronStandard",
      "emaBranchIconStandard",
      "emaBranchLabelStandard",
      "emaBranchCountStandard",
    ].forEach((k) => delete n.dataset[k]);
  });
}

function panelScore(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;
  if (r.left < 120 || r.left > 620) return -9999;
  if (r.width < 200 || r.width > 450) return -9999;
  if (r.height < 220) return -9999;

  let score = 0;
  if (t.includes("hardware inventory")) score += 80;
  if (t.includes("software")) score += 35;
  if (t.includes("all branches")) score += 130;
  if (t.includes("search branches")) score += 120;
  if (t.includes("branch")) score += 70;
  if (t.includes("statistics")) score += 25;
  if (t.includes("add new folder")) score += 90;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;

  if (t.includes("package registry") || t.includes("device registry") || t.includes("target device registry")) score -= 130;

  return score;
}

function findPanel() {
  const panels = Array.from(
    document.querySelectorAll(
      "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .folder-sidebar, .branch-sidebar, .inventory-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, .tree-sidebar, [class*='sidepanel'], [class*='side-panel']"
    )
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return panels
    .map((panel) => ({ panel, score: panelScore(panel) }))
    .filter((x) => x.score > 90)
    .sort((a, b) => b.score - a.score)[0]?.panel || null;
}

function findBody(panel: HTMLElement) {
  return (
    panel.querySelector(".hardware-branch-body, .hardware-branch-panel-body, .ema-sidebar-content, .ema-sidebar-subpanel, .sidebar-body, .tree-body") ||
    panel
  ) as HTMLElement;
}

function findTree(panel: HTMLElement) {
  const candidates = Array.from(
    panel.querySelectorAll(".hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .folder-tree, .branch-tree, .tree-list, .tree-scroll, [aria-label*='tree'], [aria-label*='Tree'], ul")
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  let best: HTMLElement | null = null;
  let bestScore = 0;

  for (const el of candidates) {
    const r = el.getBoundingClientRect();
    const t = text(el).toLowerCase();

    if (r.width < 100 || r.height < 24) continue;

    let score = 0;
    if (t.includes("all branches")) score += 100;
    if (t.includes("head office")) score += 60;
    if (t.includes("kl branch")) score += 60;
    if (t.includes("remote sites")) score += 60;
    if (t.includes("site a")) score += 30;
    if (t.includes("search branch")) score -= 70;
    if (t.includes("add new folder")) score -= 70;

    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function markSearch(panel: HTMLElement) {
  const input = Array.from(panel.querySelectorAll("input")).find((el) => {
    const ph = String((el as HTMLInputElement).placeholder || "").toLowerCase();
    return ph.includes("search");
  }) as HTMLInputElement | undefined;

  if (!input) return;

  input.setAttribute("data-ema-branch-search-input-standard", "true");

  let row = input.closest(".hardware-branch-search, .ema-sidebar-field, .section-search, .sidebar-search, .search-box, .tree-search, .branch-search, .folder-search") as HTMLElement | null;
  if (!row) row = input.parentElement as HTMLElement | null;

  if (row) row.setAttribute("data-ema-branch-search-standard", "true");
}

function markAdd(panel: HTMLElement) {
  const btn = Array.from(panel.querySelectorAll("button, [role='button']")).find((el) => {
    const t = text(el).toLowerCase();
    return t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder");
  }) as HTMLElement | undefined;

  if (btn) btn.setAttribute("data-ema-branch-add-standard", "true");
}

function isChevron(el: Element) {
  const cls = String((el as HTMLElement).getAttribute("class") || "").toLowerCase();
  const tt = text(el);
  return cls.includes("chevron") || cls.includes("expander") || cls.includes("arrow") || [">", "?", "?", "?", "?", "?", "?", "?"].includes(tt);
}

function markRows(tree: HTMLElement) {
  const rows = Array.from(
    tree.querySelectorAll(".hardware-tree-select, .ema-sidebar-tree-main, .ema-sidebar-tree-node, button, [role='button'], [role='treeitem']")
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const row of rows) {
    if (!visible(row)) continue;

    const t = text(row).toLowerCase();
    const r = row.getBoundingClientRect();

    if (!t) continue;
    if (r.height < 12 || r.height > 80) continue;
    if (t.includes("search")) continue;
    if (t.includes("add new folder")) continue;

    const looksTree =
      t.includes("all branches") ||
      t.includes("head office") ||
      t.includes("branch") ||
      t.includes("remote") ||
      t.includes("site ") ||
      !!row.querySelector("svg");

    if (!looksTree) continue;

    row.setAttribute("data-ema-branch-row-standard", "true");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    for (const svg of svgs) {
      if (isChevron(svg)) svg.setAttribute("data-ema-branch-chevron-standard", "true");
      else svg.setAttribute("data-ema-branch-icon-standard", "true");
    }

    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-ema-branch-chevron-standard", "true");
      svgs.slice(1).forEach((svg) => svg.setAttribute("data-ema-branch-icon-standard", "true"));
    }

    row.querySelectorAll("span, i, button, div").forEach((el) => {
      if (isChevron(el)) (el as HTMLElement).setAttribute("data-ema-branch-chevron-standard", "true");
    });

    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 50 && rr.height <= 32) {
        (el as HTMLElement).setAttribute("data-ema-branch-count-standard", "true");
      }
    });

    const labels = Array.from(row.querySelectorAll("span, strong, div, p")).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.dataset.emaBranchChevronStandard === "true") return false;
      if (el.dataset.emaBranchCountStandard === "true") return false;

      const tt = text(el);
      if (!/[a-zA-Z]/.test(tt)) return false;
      if (tt.length > 90) return false;

      return true;
    }) as HTMLElement[];

    const label =
      labels.find((el) => /all branches|head office|hq|kl branch|putrajaya|selangor|perlis|wssb|padang|remote|site/i.test(text(el))) ||
      labels[labels.length - 1];

    if (label) label.setAttribute("data-ema-branch-label-standard", "true");
  }
}

function openAll(panel: HTMLElement) {
  const key = "emaStandardOpened";
  if (panel.dataset[key] === "true") return;
  panel.dataset[key] = "true";

  const branchTab = Array.from(panel.querySelectorAll("button")).find((btn) => {
    const t = text(btn).toLowerCase();
    return t === "branch" || t.startsWith("branch ");
  }) as HTMLButtonElement | undefined;

  try { branchTab?.click(); } catch {}

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
  }, 160);
}

function apply() {
  clearMarks();

  if (isExcluded()) {
    document.body.classList.remove("ema-module-branch-tree-standard");
    return;
  }

  const panel = findPanel();
  if (!panel) return;

  document.body.classList.add("ema-module-branch-tree-standard");

  panel.setAttribute("data-ema-branch-panel-standard", "true");

  const body = findBody(panel);
  body.setAttribute("data-ema-branch-body-standard", "true");

  markSearch(panel);
  markAdd(panel);

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-ema-branch-tree-standard", "true");
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

  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("resize", schedule);
}

export {};
