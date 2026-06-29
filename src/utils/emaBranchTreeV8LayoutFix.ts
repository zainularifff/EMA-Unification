const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];

function excluded() {
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

function clearV8() {
  document.querySelectorAll("[data-ema-v8-panel],[data-ema-v8-tree],[data-ema-v8-row],[data-ema-v8-chevron],[data-ema-v8-icon],[data-ema-v8-label],[data-ema-v8-count],[data-ema-v8-search-row],[data-ema-v8-search-input],[data-ema-v8-add-folder]").forEach((el) => {
    const n = el as HTMLElement;
    [
      "emaV8Panel",
      "emaV8Tree",
      "emaV8Row",
      "emaV8Chevron",
      "emaV8Icon",
      "emaV8Label",
      "emaV8Count",
      "emaV8SearchRow",
      "emaV8SearchInput",
      "emaV8AddFolder",
    ].forEach((k) => delete n.dataset[k]);
  });
}

function scorePanel(panel: HTMLElement) {
  if (!visible(panel)) return -9999;

  const r = panel.getBoundingClientRect();
  const t = text(panel).toLowerCase();

  if (t.includes("ema system") || t.includes("main category") || t.includes("logout")) return -9999;
  if (r.left < 140 || r.left > 580) return -9999;
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
    document.querySelectorAll("aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .folder-sidebar, .branch-sidebar, .inventory-sidebar, .hardware-sidebar, .software-sidebar, .network-sidebar, .tree-sidebar, .ema-branch-sidepanel-v3, [data-ema-branch-panel-v3='true'], [class*='sidepanel'], [class*='side-panel']")
  ).filter((el) => el instanceof HTMLElement) as HTMLElement[];

  return panels
    .map((panel) => ({ panel, score: scorePanel(panel) }))
    .filter((x) => x.score > 90)
    .sort((a, b) => b.score - a.score)[0]?.panel || null;
}

function findTree(panel: HTMLElement) {
  const candidates = Array.from(
    panel.querySelectorAll("[data-ema-v7-tree='true'], [data-ema-v6-tree='true'], .hardware-location-tree-card, .hardware-location-tree-scroll, .ema-sidebar-tree, .software-tree-panel, .folder-tree, .branch-tree, .tree-list, .tree-scroll, [aria-label*='tree'], [aria-label*='Tree'], ul")
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

function markSearch(panel: HTMLElement, tree: HTMLElement | null) {
  const input = Array.from(panel.querySelectorAll("input")).find((inp) => {
    const ph = String((inp as HTMLInputElement).placeholder || "").toLowerCase();
    return ph.includes("search");
  }) as HTMLInputElement | undefined;

  if (!input) return;

  input.setAttribute("data-ema-v8-search-input", "true");

  let row = input.parentElement as HTMLElement | null;

  for (let i = 0; i < 3 && row?.parentElement; i++) {
    const r = row.getBoundingClientRect();
    if (r.width > 120 && r.height <= 60) break;
    row = row.parentElement;
  }

  if (!row) return;

  row.setAttribute("data-ema-v8-search-row", "true");

  if (tree && row.parentElement !== panel) {
    try {
      panel.insertBefore(row, tree);
    } catch {}
  } else if (tree && row.nextElementSibling !== tree) {
    try {
      panel.insertBefore(row, tree);
    } catch {}
  }
}

function markAddFolder(panel: HTMLElement) {
  const btn = Array.from(panel.querySelectorAll("button, [role='button']")).find((el) => {
    const t = text(el).toLowerCase();
    return t.includes("add new folder") || t.includes("new branch path") || t.includes("add folder");
  }) as HTMLElement | undefined;

  if (!btn) return;

  btn.setAttribute("data-ema-v8-add-folder", "true");

  if (btn.parentElement !== panel) {
    try {
      panel.appendChild(btn);
    } catch {}
  }
}

function isChevronLike(el: Element) {
  const cls = String((el as HTMLElement).getAttribute("class") || "").toLowerCase();
  const tt = text(el);

  return (
    cls.includes("chevron") ||
    cls.includes("expander") ||
    cls.includes("arrow") ||
    [">", "?", "?", "?", "?", "?", "?", "?"].includes(tt)
  );
}

function markRows(tree: HTMLElement) {
  const rows = Array.from(
    tree.querySelectorAll("[data-ema-v7-row='true'], [data-ema-v6-row='true'], .ema-sidebar-tree-main, .ema-sidebar-tree-node, button, [role='button'], [role='treeitem']")
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

    row.setAttribute("data-ema-v8-row", "true");

    const svgs = Array.from(row.querySelectorAll("svg")).filter(visible) as SVGElement[];

    if (svgs.length >= 2) {
      svgs[0].setAttribute("data-ema-v8-chevron", "true");
      svgs.slice(1).forEach((svg) => svg.setAttribute("data-ema-v8-icon", "true"));
    } else if (svgs.length === 1) {
      if (isChevronLike(svgs[0])) svgs[0].setAttribute("data-ema-v8-chevron", "true");
      else svgs[0].setAttribute("data-ema-v8-icon", "true");
    }

    row.querySelectorAll("span, i, button, div").forEach((el) => {
      if (isChevronLike(el)) {
        (el as HTMLElement).setAttribute("data-ema-v8-chevron", "true");
      }
    });

    row.querySelectorAll("span, small, div").forEach((el) => {
      const tt = text(el);
      const rr = (el as HTMLElement).getBoundingClientRect();

      if (/^\d{1,4}$/.test(tt) && rr.width <= 48 && rr.height <= 30) {
        (el as HTMLElement).setAttribute("data-ema-v8-count", "true");
      }
    });

    const labels = Array.from(row.querySelectorAll("span, strong, div, p")).filter((el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.dataset.emaV8Chevron === "true") return false;
      if (el.dataset.emaV8Count === "true") return false;

      const tt = text(el);
      if (!/[a-zA-Z]/.test(tt)) return false;
      if (tt.length > 90) return false;

      return true;
    }) as HTMLElement[];

    const label =
      labels.find((el) => /all branches|head office|kl branch|penang|johor|sabah|sarawak|remote|site/i.test(text(el))) ||
      labels[labels.length - 1];

    if (label) label.setAttribute("data-ema-v8-label", "true");
  }
}

function apply() {
  clearV8();

  if (excluded()) {
    document.body.classList.remove("ema-branch-tree-v8-page");
    return;
  }

  document.body.classList.add("ema-branch-tree-v8-page");

  const panel = findPanel();
  if (!panel) return;

  panel.setAttribute("data-ema-v8-panel", "true");

  const tree = findTree(panel);
  if (tree) {
    tree.setAttribute("data-ema-v8-tree", "true");
  }

  markSearch(panel, tree);
  markAddFolder(panel);

  if (tree) markRows(tree);
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
