const STYLE_ID = "ema-sidebar-runtime-styles";

const css = `
.ema-module-root .ema-sidebar-content,
.ema-module-root .ema-sidebar-subpanel {
  width: 100% !important;
  min-width: 0 !important;
}

.ema-module-root .ema-sidebar-scope-card {
  width: 100% !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: .2rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .95rem !important;
  background: #ffffff !important;
  padding: .78rem .85rem !important;
  margin: 0 0 .75rem !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .04) !important;
}

.ema-module-root .ema-sidebar-scope-card strong,
.ema-module-root .ema-sidebar-scope-card span {
  display: block !important;
  margin: 0 !important;
  line-height: 1.2 !important;
}

.ema-module-root .ema-sidebar-scope-card strong {
  color: #0f172a !important;
  font-size: .84rem !important;
  font-weight: 950 !important;
}

.ema-module-root .ema-sidebar-scope-card span {
  color: #64748b !important;
  font-size: .72rem !important;
  font-weight: 750 !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] {
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: .46rem !important;
  margin: .65rem 0 0 !important;
  padding: 0 !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] > * {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  flex: 0 0 auto !important;
}

.ema-module-root .ema-sidebar-section-title,
.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-section-title {
  width: 100% !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: .45rem !important;
  margin: 0 0 .16rem !important;
  color: #64748b !important;
  font-size: .68rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

.ema-module-root .ema-sidebar-section-title svg {
  width: .9rem !important;
  height: .9rem !important;
  color: #2563eb !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-node {
  width: 100% !important;
  min-height: 2.72rem !important;
  display: grid !important;
  grid-template-columns: 1.55rem minmax(0, 1fr) !important;
  align-items: center !important;
  gap: .32rem !important;
  border: 1px solid transparent !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .32rem .55rem !important;
  margin: 0 !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-node:hover,
.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-node.is-selected,
.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-node.is-active {
  border-color: #93c5fd !important;
  background: #eff6ff !important;
  box-shadow: inset 3px 0 0 #2563eb !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-toggle {
  width: 1.45rem !important;
  height: 1.45rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .55rem !important;
  background: transparent !important;
  color: #334155 !important;
  padding: 0 !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-main {
  min-width: 0 !important;
  width: 100% !important;
  min-height: 2.05rem !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: .6rem !important;
  border: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 !important;
  text-align: left !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-icon {
  width: 1.8rem !important;
  height: 1.8rem !important;
  flex: 0 0 1.8rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .65rem !important;
  background: #eef6ff !important;
  color: #486581 !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-label {
  min-width: 0 !important;
  display: block !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: #0f172a !important;
  font-size: .8rem !important;
  font-weight: 950 !important;
}

.ema-module-root .ema-sidebar-tree[aria-label="Hardware statistics tree"] .ema-sidebar-tree-children {
  display: grid !important;
  gap: .36rem !important;
  margin: .4rem 0 0 1.15rem !important;
  padding-left: .55rem !important;
  border-left: 1px dashed #dbe7f5 !important;
}
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.textContent = css;
  else {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

export {};
