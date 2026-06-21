function setImportantStyle(element: HTMLElement | null | undefined, styles: Record<string, string>) {
  if (!element) return;
  Object.entries(styles).forEach(([property, value]) => element.style.setProperty(property, value, "important"));
}

function applySettingsModuleControlLayout() {
  if (typeof document === "undefined") return;

  const root = document.querySelector<HTMLElement>(".settings-with-notifications .settings-module-root[data-section='modules']");
  const table = root?.querySelector<HTMLElement>(".module-control-table");
  const header = table?.querySelector<HTMLElement>(".module-control-row.head");
  if (!root || !table || !header) return;

  const roleCount = Math.max(header.children.length - 2, 1);
  const noWidth = 4;
  const moduleWidth = 24;
  const roleWidth = 8.5;
  const tableMinWidth = noWidth + moduleWidth + roleCount * roleWidth;
  const columns = `${noWidth}rem ${moduleWidth}rem repeat(${roleCount}, ${roleWidth}rem)`;

  setImportantStyle(table, {
    width: "100%",
    maxWidth: "100%",
    minWidth: "0",
    display: "block",
    overflowX: "auto",
    overflowY: "auto",
    whiteSpace: "normal",
    borderCollapse: "separate",
  });

  table.querySelectorAll<HTMLElement>(".module-control-row").forEach((row) => {
    setImportantStyle(row, {
      width: "100%",
      minWidth: `${tableMinWidth}rem`,
      display: "grid",
      gridTemplateColumns: columns,
      gridAutoFlow: "row",
      gridAutoRows: "auto",
      alignItems: "center",
      flexWrap: "nowrap",
      overflow: "visible",
    });

    Array.from(row.children).forEach((child, index) => {
      const cell = child as HTMLElement;
      setImportantStyle(cell, {
        gridColumn: `${index + 1}`,
        gridRow: "1",
        width: "auto",
        maxWidth: "none",
        minWidth: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: index === 1 ? "flex-start" : "center",
        textAlign: index === 1 ? "left" : "center",
        boxSizing: "border-box",
      });
    });
  });

  table.querySelectorAll<HTMLElement>(".module-control-group-row").forEach((row) => {
    setImportantStyle(row, {
      width: "100%",
      minWidth: `${tableMinWidth}rem`,
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
    });
  });

  table.querySelectorAll<HTMLElement>(".module-toggle-cell .toggle").forEach((toggle) => {
    setImportantStyle(toggle, {
      width: "2.55rem",
      minWidth: "2.55rem",
      height: "1.4rem",
      minHeight: "1.4rem",
      margin: "0 auto",
    });
  });
}

if (typeof document !== "undefined") {
  const run = () => window.requestAnimationFrame(applySettingsModuleControlLayout);
  run();

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", run);
  window.addEventListener("scroll", run, true);
}

export {};
