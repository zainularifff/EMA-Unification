const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];

let proxying = false;

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
    "[data-ema-v7-panel],[data-ema-v7-tree],[data-ema-v7-row],[data-ema-v7-chevron],[data-ema-v7-icon],[data-ema-v7-label],[data-ema-v7-count],[data-ema-v7-search-row],[data-ema-v7-search-input],[data-ema-v7-add-folder]"
  ).forEach((el) => {
    const node = el as HTMLElement;
    [
      "emaV7Panel",
      "emaV7Tree",
      "emaV7Row",
      "emaV7Chevron",
      "emaV7Icon",
      "emaV7Label",
      "emaV7Count",
      "emaV7SearchRow",
      "emaV7SearchInput",
      "emaV7AddFolder",
    ].forEach((key) => delete node.dataset[key]);
  });

  document.querySelectorAll(".ema-tree-forced-title").forEach((el) => el.remove());
}

function scorePanel(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;

  if (r.left < 150 || r.left > 570) return -9999;
  if (r.width < 190 || r.width > 430) return -9999;
  if (r.height < 220) return -9999;

  let score = 0;

  if (t.includes("all branches")) score += 120;
  if (t.includes("search branches")) score += 110;
  if (t.includes("search branch")) score += 110;
  if (t.includes("branch")) score += 60;
  if (t.includes("statistics")) score += 20;
  if (t.includes("add new folder")) score += 80;
  if (t.includes("new branch path")) score += 70;
  if (t.includes("head office")) score += 60;
  if (t.includes("kl branch")) score += 60;
  if (t.includes("remote sites")) score += 60;

  if (t.includes("package registry") || t.includes("device registry") || t.includes("target device registry")) score -= 160;

  return score;
}

function findPanel() {
  const panels = Array.from(
    document.querySelectorAll(
      "aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .folder-sidebar, .branch-sidebar, .inventory-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, .tree-sidebar, .ema-branch-sidepanel-v3, [data-ema-branch-panel-v3='true'], [class*='sidepanel'], [class*='side-panel']"
    )
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return panels
    .map((panel) => ({ panel, score: scorePanel(panel) }))
    .filter((x) => x.score > 90)
    .sort((a, b) => b.score - a.score)[0]?.panel || null;
}

function markSearch(panel: HTMLElement) {
  panel.querySelectorAll("input").forEach((input) => {
    const inp = input as HTMLInputElement;
    const ph = String(inp.placeholder || "").toLowerCase();

    if (!ph.includes("search")) return;

    inp.setAttribute("data-ema-v7-search-input", "true");

    const parent = inp.parentElement as HTMLElement | null;
    const grand = parent?.parentElement as HTMLElement | null;

    if (grand && grand.querySelector("button")) {
      grand.setAttribute("data-ema-v7-search-row", "true");
    } else if (parent) {
      parent.setAttribute("data-ema-v7-search-row", "true");
    }
  });
}

function markAddFolder(panel: HTMLElement) {
  panel.querySelectorAll("button, [role='button']").forEach((btn) => {
    const t = text(btn).toLowerCase();

    if (t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder")) {
      (btn as HTMLElement).setAttribute("data-ema-v7-add-folder", "true");
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

    if (r.width < 100 || r.height < 24) continue;

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

function isChevronLike(el: Element) {
  const node = el as HTMLElement;
  const cls = String(node.getAttribute("class") || "").toLowerCase();
  const tt = text(node);

  return (
    cls.includes("chevron") ||
    cls.includes("expander") ||
    cls.includes("arrow") ||
    [">", "?", "?", "?", "?", "?", "?", "?"].includes(tt)
  );
}

function markRows(tree: HTMLElement) {
  const rows = Array.from(
    tree.querySelectorAll(".ema-sidebar-tree-main, .ema-sidebar-tree-node, button, [role='button'], [role='treeitem']")
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const row of rows) {
    if (!visible(row)) continue;

    const t = text(row).toLowerCase();
    const r = row.getBoundingClientRect();

    if (!t) continue;
    if (r.height < 12 || r.height > 70) continue;
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

    row.setAttribute("data-ema-v7-row", "true");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-ema-v7-chevron", "true");
      const wrapper = svgs[0].closest("button, span, div");
      if (wrapper && wrapper !== row && !/[a-zA-Z]/.test(text(wrapper))) {
        (wrapper as HTMLElement).setAttribute("data-ema-v7-chevron", "true");
      }

      svgs.slice(1).forEach((svg) => svg.setAttribute("data-ema-v7-icon", "true"));
    } else if (svgs.length === 1) {
      if (isChevronLike(svgs[0])) {
        svgs[0].setAttribute("data-ema-v7-chevron", "true");
        const wrapper = svgs[0].closest("button, span, div");
        if (wrapper && wrapper !== row && !/[a-zA-Z]/.test(text(wrapper))) {
          (wrapper as HTMLElement).setAttribute("data-ema-v7-chevron", "true");
        }
      } else {
        svgs[0].setAttribute("data-ema-v7-icon", "true");
      }
    }

    row.querySelectorAll("span, i, button, div").forEach((el) => {
      if (isChevronLike(el)) {
        (el as HTMLElement).setAttribute("data-ema-v7-chevron", "true");
      }
    });

    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 48 && rr.height <= 30) {
        (el as HTMLElement).setAttribute("data-ema-v7-count", "true");
      }
    });

    const labelCandidates = Array.from(row.querySelectorAll("span, strong, div, p"))
      .filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        if (el.dataset.emaV7Chevron === "true") return false;
        if (el.dataset.emaV7Count === "true") return false;

        const tt = text(el);
        if (!/[a-zA-Z]/.test(tt)) return false;
        if (tt.length > 90) return false;

        return true;
      }) as HTMLElement[];

    const label =
      labelCandidates.find((el) => /all branches|head office|kl branch|penang|johor|sabah|sarawak|remote|site/i.test(text(el))) ||
      labelCandidates[labelCandidates.length - 1];

    if (label) {
      label.setAttribute("data-ema-v7-label", "true");
    }
  }
}

function clickExpand(row: HTMLElement) {
  const hiddenChevron = row.querySelector("[data-ema-v7-chevron='true']") as HTMLElement | null;

  if (hiddenChevron) {
    hiddenChevron.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
    return true;
  }

  const expandable = row.matches("[aria-expanded]") ? row : row.querySelector("[aria-expanded]") as HTMLElement | null;

  if (expandable) {
    expandable.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );
    return true;
  }

  return false;
}

function bindClickProxy() {
  if ((window as any).__emaV7ClickProxyBound) return;
  (window as any).__emaV7ClickProxyBound = true;

  document.addEventListener(
    "click",
    (event) => {
      if (proxying) return;
      if (isExcluded()) return;
      if (!document.body.classList.contains("ema-branch-tree-v7-page")) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const panel = target.closest("[data-ema-v7-panel='true']");
      if (!panel) return;

      const row = target.closest("[data-ema-v7-row='true']") as HTMLElement | null;
      if (!row) return;

      if (target.closest("[data-ema-v7-count='true']")) return;
      if (target.closest("[data-ema-v7-add-folder='true']")) return;

      const clickedFolderOrLabel =
        !!target.closest("[data-ema-v7-icon='true']") ||
        !!target.closest("[data-ema-v7-label='true']") ||
        target === row ||
        row.contains(target);

      if (!clickedFolderOrLabel) return;

      const hasExpandable =
        !!row.querySelector("[data-ema-v7-chevron='true']") ||
        row.hasAttribute("aria-expanded") ||
        !!row.querySelector("[aria-expanded]");

      if (!hasExpandable) return;

      event.preventDefault();
      event.stopPropagation();

      proxying = true;
      clickExpand(row);
      proxying = false;

      setTimeout(apply, 80);
    },
    true
  );
}

function openDefault(panel: HTMLElement) {
  const key = "emaV7Opened";
  if (panel.dataset[key] === "true") return;
  panel.dataset[key] = "true";

  const branchTab = Array.from(panel.querySelectorAll("button")).find((btn) => {
    const t = text(btn).toLowerCase();
    return t === "branch" || t.startsWith("branch ");
  }) as HTMLButtonElement | undefined;

  try { branchTab?.click(); } catch {}

  setTimeout(() => {
    const rows = Array.from(panel.querySelectorAll("[data-ema-v7-row='true']")) as HTMLElement[];

    for (const row of rows) {
      const t = text(row).toLowerCase();

      if (
        t.includes("all branches") ||
        t.includes("head office") ||
        t.includes("remote sites")
      ) {
        clickExpand(row);
      }
    }
  }, 180);
}

function apply() {
  clearMarks();

  if (isExcluded()) {
    document.body.classList.remove("ema-branch-tree-v7-page");
    return;
  }

  document.body.classList.add("ema-branch-tree-v7-page");

  const panel = findPanel();
  if (!panel) return;

  panel.setAttribute("data-ema-v7-panel", "true");

  markSearch(panel);
  markAddFolder(panel);

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-ema-v7-tree", "true");
    markRows(tree);
  }

  openDefault(panel);
  bindClickProxy();
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
