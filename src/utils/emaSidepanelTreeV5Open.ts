const EXCLUDE = ["/settings", "/service-desk", "/report", "/reports", "/software-distribution"];

function isExcluded() {
  const path = window.location.pathname.toLowerCase();
  const excluded = EXCLUDE.some((item) => path.includes(item));

  if (excluded) {
    document.body.classList.remove("ema-sidepanel-v5-page");
  }

  return excluded;
}

function openAllTreeOnce() {
  if (isExcluded()) return;
  if (!document.body.classList.contains("ema-sidepanel-v5-page")) return;

  const panels = Array.from(document.querySelectorAll("aside, .ema-page-sidebar, .ema-sidebar-panel, .module-sidepanel, .module-tree-panel, .sidebar-tree-panel, .ema-branch-sidepanel-v3, [data-ema-branch-panel-v3='true']"))
    .filter((el) => el instanceof HTMLElement) as HTMLElement[];

  for (const panel of panels) {
    const text = String(panel.textContent || "").toLowerCase();
    if (!text.includes("branch") && !text.includes("all branches")) continue;

    const key = "emaV5Opened";
    if (panel.dataset[key] === "true") continue;
    panel.dataset[key] = "true";

    const branchTab = Array.from(panel.querySelectorAll("button")).find((btn) => {
      const t = String(btn.textContent || "").trim().toLowerCase();
      return t === "branch" || t.startsWith("branch ");
    }) as HTMLButtonElement | undefined;

    try { branchTab?.click(); } catch {}

    setTimeout(() => {
      Array.from(panel.querySelectorAll("button[aria-expanded='false']")).forEach((btn) => {
        const b = btn as HTMLButtonElement;
        const t = String(b.textContent || b.getAttribute("aria-label") || "").toLowerCase();

        if (
          t.includes("branch") ||
          t.includes("all branches") ||
          t.includes("head office") ||
          t.includes("remote") ||
          t.includes("site") ||
          b.querySelector("svg")
        ) {
          try { b.click(); } catch {}
        }
      });
    }, 100);
  }
}

function schedule() {
  requestAnimationFrame(() => {
    openAllTreeOnce();
    setTimeout(openAllTreeOnce, 250);
    setTimeout(openAllTreeOnce, 800);
  });
}

if (typeof window !== "undefined") {
  schedule();
  window.addEventListener("popstate", schedule);
  window.addEventListener("hashchange", schedule);
}

export {};
