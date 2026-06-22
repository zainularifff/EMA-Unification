function setCss(element: Element | null | undefined, styles: Record<string, string>) {
  if (!(element instanceof HTMLElement)) return;
  Object.entries(styles).forEach(([name, value]) => element.style.setProperty(name, value, "important"));
}

function applyAuditTableLayout() {
  if (typeof document === "undefined") return;

  const table = document.querySelector<HTMLElement>(".settings-with-notifications .audit-standard-table");
  if (!table) return;

  const columns = "3.25rem 10.75rem 7.5rem 8.25rem minmax(0, 1fr) 7rem";

  setCss(table, {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
    overflowY: "auto",
  });

  table.querySelectorAll<HTMLElement>(".audit-standard-row").forEach((row) => {
    setCss(row, {
      display: "grid",
      gridTemplateColumns: columns,
      width: "100%",
      minWidth: "0",
      maxWidth: "100%",
      alignItems: "stretch",
      minHeight: row.classList.contains("head") ? "3.15rem" : "3.75rem",
    });

    Array.from(row.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      const isActivity = index === 4;
      setCss(child, {
        gridColumn: String(index + 1),
        gridRow: "1",
        width: "100%",
        minWidth: "0",
        maxWidth: "100%",
        display: isActivity ? "block" : "flex",
        alignItems: isActivity ? "flex-start" : "center",
        justifyContent: isActivity ? "flex-start" : "center",
        textAlign: isActivity ? "left" : "center",
        padding: "0.65rem 0.7rem",
        overflow: isActivity ? "visible" : "hidden",
        whiteSpace: isActivity ? "normal" : "nowrap",
        textOverflow: isActivity ? "clip" : "ellipsis",
        boxSizing: "border-box",
      });
    });
  });

  table.querySelectorAll<HTMLElement>(".audit-action-cell").forEach((cell) => {
    setCss(cell, {
      display: "block",
      width: "100%",
      maxWidth: "100%",
      minWidth: "0",
      whiteSpace: "normal",
      overflow: "visible",
    });
  });

  table.querySelectorAll<HTMLElement>(".audit-action-cell strong, .audit-action-cell small").forEach((node) => {
    setCss(node, {
      display: "block",
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

  table.querySelectorAll<HTMLElement>(".audit-action-cell strong").forEach((node) => {
    setCss(node, { fontWeight: "950" });
  });

  table.querySelectorAll<HTMLElement>(".audit-module-chip").forEach((chip) => {
    setCss(chip, {
      maxWidth: "7rem",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
  });
}

if (typeof document !== "undefined") {
  const run = () => window.requestAnimationFrame(applyAuditTableLayout);
  run();
  window.setTimeout(run, 80);
  window.setTimeout(run, 220);
  window.setInterval(applyAuditTableLayout, 80);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
}

export {};
