const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports"];

function isExcluded() {
  const path = window.location.pathname.toLowerCase();
  return EXCLUDE.some((item) => path.includes(item));
}

function openBranchPanelDefault() {
  if (isExcluded()) return;
  if (!document.body.classList.contains("ema-sidepanel-v4-page")) return;

  const panels = Array.from(document.querySelectorAll("aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel"))
    .filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const panel of panels) {
    const text = String(panel.textContent || "").toLowerCase();
    if (!text.includes("branch") && !text.includes("all branches")) continue;

    const already = panel.dataset.emaV4Opened === "true";
    if (already) continue;
    panel.dataset.emaV4Opened = "true";

    const branchTab = Array.from(panel.querySelectorAll("button"))
      .find((btn) => {
        const t = String(btn.textContent || "").trim().toLowerCase();
        return t === "branch" || t.startsWith("branch ");
      }) as HTMLButtonElement | undefined;

    if (branchTab) {
      try { branchTab.click(); } catch {}
    }

    setTimeout(() => {
      const allBranchesBtn = Array.from(panel.querySelectorAll("button"))
        .find((btn) => String(btn.textContent || btn.getAttribute("aria-label") || "").toLowerCase().includes("all branches")) as HTMLButtonElement | undefined;

      if (allBranchesBtn && allBranchesBtn.getAttribute("aria-expanded") === "false") {
        try { allBranchesBtn.click(); } catch {}
      }
    }, 120);
  }
}

function schedule() {
  requestAnimationFrame(() => {
    openBranchPanelDefault();
    setTimeout(openBranchPanelDefault, 300);
    setTimeout(openBranchPanelDefault, 800);
  });
}

if (typeof window !== "undefined") {
  schedule();
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
}

export {};
