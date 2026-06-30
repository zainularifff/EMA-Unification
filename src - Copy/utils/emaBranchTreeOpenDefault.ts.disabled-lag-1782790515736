const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports"];

function isExcluded() {
  const path = window.location.pathname.toLowerCase();
  return EXCLUDE.some((item) => path.includes(item));
}

function clickRootOnce() {
  if (isExcluded()) return;

  document.querySelectorAll('[data-ema-branch-panel-v3="true"], .ema-branch-sidepanel-v3').forEach((panel) => {
    const key = "emaBranchOpened";
    const el = panel as HTMLElement;

    if (el.dataset[key] === "true") return;
    el.dataset[key] = "true";

    const candidates = Array.from(
      panel.querySelectorAll('button[aria-label*="All Branches"], button[title*="All Branches"], button[aria-expanded="false"]')
    ).filter((node) => node instanceof HTMLButtonElement) as HTMLButtonElement[];

    for (const btn of candidates.slice(0, 3)) {
      const text = String(btn.textContent || btn.getAttribute("aria-label") || btn.getAttribute("title") || "").toLowerCase();

      if (
        text.includes("all branches") ||
        btn.getAttribute("aria-expanded") === "false"
      ) {
        try {
          btn.click();
        } catch {
          // ignore
        }
      }
    }
  });
}

function schedule() {
  requestAnimationFrame(() => {
    clickRootOnce();
    setTimeout(clickRootOnce, 250);
    setTimeout(clickRootOnce, 700);
  });
}

if (typeof window !== "undefined") {
  schedule();
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
}

export {};
