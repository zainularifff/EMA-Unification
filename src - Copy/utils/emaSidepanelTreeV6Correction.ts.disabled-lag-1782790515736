const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];

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

function clearMarks() {
  document.querySelectorAll(
    "[data-ema-v6-panel],[data-ema-v6-tree],[data-ema-v6-row],[data-ema-v6-chevron],[data-ema-v6-icon],[data-ema-v6-label],[data-ema-v6-count],[data-ema-v6-search-row],[data-ema-v6-search-input],[data-ema-v6-add-folder]"
  ).forEach((el) => {
    const node = el as HTMLElement;
    [
      "emaV6Panel",
      "emaV6Tree",
      "emaV6Row",
      "emaV6Chevron",
      "emaV6Icon",
      "emaV6Label",
      "emaV6Count",
      "emaV6SearchRow",
      "emaV6SearchInput",
      "emaV6AddFolder",
    ].forEach((key) => delete node.dataset[key]);
  });
}

function panelScore(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;

  if (r.left < 160 || r.left > 560) return -9999;
  if (r.width < 190 || r.width > 420) return -9999;
  if (r.height < 220) return -9999;

  let score = 0;

  if (t.includes("all branches")) score += 100;
  if (t.includes("search branches")) score += 100;
  if (t.includes("branch")) score += 60;
  if (t.includes("statistics")) score += 20;
  if (t.includes("add new folder")) score += 80;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;

  if (t.includes("package registry") || t.includes("device registry") || t.includes("target device registry")) score -= 150;

  return score;
}

function findPanel() {
  const panels = Array.from(
    document.querySelectorAll(
      "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .folder-sidebar, .branch-sidebar, .inventory-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, .tree-sidebar, .ema-branch-sidepanel-v3, [data-ema-branch-panel-v3='true'], [class*='sidepanel'], [class*='side-panel']"
    )
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return panels
    .map((panel) => ({ panel, score: panelScore(panel) }))
    .filter((x) => x.score > 90)
    .sort((a, b) => b.score - a.score)[0]?.panel || null;
}

function markSearch(panel: HTMLElement) {
  panel.querySelectorAll("input").forEach((input) => {
    const inp = input as HTMLInputElement;
    const ph = String(inp.placeholder || "").toLowerCase();

    if (!ph.includes("search")) return;

    inp.setAttribute("data-ema-v6-search-input", "true");

    const parent = inp.parentElement as HTMLElement | null;
    const grand = parent?.parentElement as HTMLElement | null;

    if (grand && grand.querySelector("button")) {
      grand.setAttribute("data-ema-v6-search-row", "true");
    } else if (parent) {
      parent.setAttribute("data-ema-v6-search-row", "true");
    }
  });
}

function markAddFolder(panel: HTMLElement) {
  panel.querySelectorAll("button, [role='button']").forEach((btn) => {
    const t = text(btn).toLowerCase();

    if (t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder")) {
      (btn as HTMLElement).setAttribute("data-ema-v6-add-folder", "true");
    }
  });
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

    if (r.width < 100 || r.height < 30) continue;

    let score = 0;
    if (t.includes("all branches")) score += 100;
    if (t.includes("head office")) score += 60;
    if (t.includes("kl branch")) score += 60;
    if (t.includes("remote sites")) score += 60;
    if (t.includes("site a")) score += 30;
    if (t.includes("search branch")) score -= 60;
    if (t.includes("add new folder")) score -= 60;

    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return best;
}

function markRows(tree: HTMLElement) {
  const rowCandidates = Array.from(
    tree.querySelectorAll(".ema-sidebar-tree-main, .ema-sidebar-tree-node, button, [role='button'], [role='treeitem']")
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const row of rowCandidates) {
    if (!visible(row)) continue;

    const t = text(row).toLowerCase();
    const r = row.getBoundingClientRect();

    if (!t) continue;
    if (r.height < 12 || r.height > 60) continue;
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

    row.setAttribute("data-ema-v6-row", "true");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    /* if row has chevron + folder, hide first icon */
    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-ema-v6-chevron", "true");
      svgs.slice(1).forEach((svg) => svg.setAttribute("data-ema-v6-icon", "true"));
    } else if (svgs.length === 1) {
      const cls = String(svgs[0].getAttribute("class") || "").toLowerCase();
      if (cls.includes("chevron") || cls.includes("arrow")) {
        svgs[0].setAttribute("data-ema-v6-chevron", "true");
      } else {
        svgs[0].setAttribute("data-ema-v6-icon", "true");
      }
    }

    /* mark plain chevron text */
    row.querySelectorAll("span, i, button").forEach((el) => {
      const tt = text(el);
      if ([">", "?", "?", "?", "?", "?", "?", "?"].includes(tt)) {
        (el as HTMLElement).setAttribute("data-ema-v6-chevron", "true");
      }
    });

    /* numeric count */
    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 46 && rr.height <= 28) {
        (el as HTMLElement).setAttribute("data-ema-v6-count", "true");
      }
    });

    /* label: last non-count/non-chevron text element with alphabet */
    const labelCandidates = Array.from(row.querySelectorAll("span, strong, div, p"))
      .filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        if (el.dataset.emaV6Chevron === "true") return false;
        if (el.dataset.emaV6Count === "true") return false;

        const tt = text(el);
        if (!/[a-zA-Z]/.test(tt)) return false;
        if (tt.length > 80) return false;

        return true;
      }) as HTMLElement[];

    const label =
      labelCandidates.find((el) => /all branches|head office|branch|remote|site/i.test(text(el))) ||
      labelCandidates[labelCandidates.length - 1];

    if (label) {
      label.setAttribute("data-ema-v6-label", "true");
    }
  }
}

function openTree(panel: HTMLElement) {
  const key = "emaV6Opened";
  if (panel.dataset[key] === "true") return;
  panel.dataset[key] = "true";

  const branchTab = Array.from(panel.querySelectorAll("button")).find((btn) => {
    const t = text(btn).toLowerCase();
    return t === "branch" || t.startsWith("branch ");
  }) as HTMLButtonElement | undefined;

  try { branchTab?.click(); } catch {}

  setTimeout(() => {
    panel.querySelectorAll("button[aria-expanded='false'], [role='treeitem'][aria-expanded='false']").forEach((btn) => {
      const t = text(btn).toLowerCase();

      if (
        t.includes("all branches") ||
        t.includes("head office") ||
        t.includes("branch") ||
        t.includes("remote")
      ) {
        try { (btn as HTMLElement).click(); } catch {}
      }
    });
  }, 150);
}

function apply() {
  clearMarks();

  if (isExcluded()) {
    document.body.classList.remove("ema-sidepanel-v6-page");
    return;
  }

  document.body.classList.add("ema-sidepanel-v6-page");

  const panel = findPanel();
  if (!panel) return;

  panel.setAttribute("data-ema-v6-panel", "true");

  markSearch(panel);
  markAddFolder(panel);

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-ema-v6-tree", "true");
    markRows(tree);
  }

  openTree(panel);
}

function schedule() {
  requestAnimationFrame(() => {
    apply();
    setTimeout(apply, 180);
    setTimeout(apply, 500);
    setTimeout(apply, 1000);
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
