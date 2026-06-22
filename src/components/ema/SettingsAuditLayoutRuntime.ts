function setStyle(el: HTMLElement | null | undefined, styles: Record<string, string>) {
  if (!el) return;
  Object.entries(styles).forEach(([key, value]) => el.style.setProperty(key, value, "important"));
}

function applyAuditLayout() {
  if (typeof document === "undefined") return;
  const table = document.querySelector<HTMLElement>(".settings-with-notifications .audit-standard-table");
  if (!table) return;

  const columns = "3.25rem 11rem 9rem 7rem minmax(0, 1fr) 6.5rem";

  setStyle(table, {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    minWidth: "0",
    overflowX: "hidden",
    overflowY: "auto",
  });

  table.querySelectorAll<HTMLElement>(".audit-standard-row").forEach((row) => {
    setStyle(row, {
      display: "grid",
      gridTemplateColumns: columns,
      width: "100%",
      minWidth: "0",
      maxWidth: "100%",
      alignItems: "stretch",
      overflow: "visible",
    });

    Array.from(row.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      const activity = index === 4;
      setStyle(child, {
        gridColumn: String(index + 1),
        gridRow: "1",
        minWidth: "0",
        maxWidth: "100%",
        width: "100%",
        display: activity ? "block" : "flex",
        alignItems: activity ? "flex-start" : "center",
        justifyContent: activity ? "flex-start" : "center",
        textAlign: activity ? "left" : "center",
        overflow: activity ? "visible" : "hidden",
        padding: "0.65rem 0.7rem",
        boxSizing: "border-box",
        whiteSpace: activity ? "normal" : "nowrap",
        textOverflow: activity ? "clip" : "ellipsis",
      });
    });
  });

  table.querySelectorAll<HTMLElement>(".audit-action-cell, .audit-action-cell strong, .audit-action-cell small").forEach((node) => {
    setStyle(node, {
      width: "100%",
      maxWidth: "100%",
      whiteSpace: "normal",
      overflow: "visible",
      textOverflow: "clip",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      lineHeight: "1.25",
    });
  });

  table.querySelectorAll<HTMLElement>(".audit-module-chip, .audit-user-chip, .audit-time-cell").forEach((node) => {
    setStyle(node, {
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });
}

if (typeof document !== "undefined") {
  const run = () => window.requestAnimationFrame(applyAuditLayout);
  run();
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", run);
  window.setInterval(applyAuditLayout, 180);
}

export {};
