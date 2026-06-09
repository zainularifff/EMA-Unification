import React, { useEffect, useMemo, useState } from "react";

const MANAGEMENT_DASHBOARD_INLINE_CSS = `
:root {
  --md-font: "Inter", "Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --md-page: #eef4fb;
  --md-ink: #07152f;
  --md-muted: #64748b;
  --md-line: rgba(148, 163, 184, 0.24);
  --md-card: rgba(255, 255, 255, 0.92);
  --md-white: #ffffff;
  --md-blue: #2563eb;
  --md-sky: #06b6d4;
  --md-green: #059669;
  --md-red: #ef4444;
  --md-amber: #f59e0b;
  --md-purple: #8b5cf6;
  --md-pink: #ec4899;
  --md-shadow: 0 22px 55px rgba(15, 23, 42, 0.10);
  --md-soft-shadow: 0 12px 30px rgba(15, 23, 42, 0.075);
  --md-radius-xl: 28px;
  --md-radius-lg: 22px;
  --md-radius-md: 16px;
  --md-radius-sm: 12px;
}

* { box-sizing: border-box; }
body { font-family: var(--md-font); }
button, table { font: inherit; }
button { cursor: pointer; }

.management-center-page {
  height: calc(100vh - 72px);
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background:
    radial-gradient(circle at 74% 0%, rgba(59, 130, 246, 0.18), transparent 32%),
    radial-gradient(circle at 14% 18%, rgba(139, 92, 246, 0.09), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #eef4fb 54%, #e9f1fa 100%);
  color: var(--md-ink);
  -webkit-font-smoothing: antialiased;
}

.management-module-root {
  width: 100%;
  max-width: 1620px;
  margin: 0 auto;
}

.md-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.md-content {
  display: grid;
  gap: 16px;
}

.md-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 22px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

.md-header h1 {
  margin: 0;
  font-size: clamp(28px, 2.2vw, 42px);
  line-height: 1;
  font-weight: 920;
  letter-spacing: -0.06em;
  color: #06142f;
}

.md-header p {
  margin: 7px 0 0;
  color: #1d3766;
  font-size: 14px;
  font-weight: 800;
}

.md-generated {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.md-generated::before {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #22c55e;
  content: "";
}

.md-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.md-toolbar button,
.md-view-actions button,
.md-table-action {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 14px;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.055);
  font-size: 13px;
  font-weight: 900;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.md-toolbar button:hover,
.md-view-actions button:hover,
.md-table-action:hover {
  transform: translateY(-1px);
  border-color: rgba(37, 99, 235, 0.38);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.09);
}

.md-toolbar .download,
.md-view-actions .primary {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
}

.md-state-panel {
  display: grid;
  place-items: center;
  min-height: 260px;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--md-shadow);
  color: #475569;
  font-size: 15px;
  font-weight: 850;
}

.md-state-error {
  color: #b91c1c;
  background: #fff7f7;
  border-color: rgba(239, 68, 68, 0.24);
}

.md-studio-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}

.md-side-panel,
.md-card,
.md-panel,
.md-tile,
.md-metric-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: var(--md-card);
  box-shadow: var(--md-soft-shadow);
  backdrop-filter: blur(10px);
}

.md-side-panel {
  position: sticky;
  top: 110px;
  align-self: start;
  height: calc(100vh - 132px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  padding: 16px;
  border-radius: 26px;
}

.md-mini-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--md-line);
}

.md-mini-logo {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #8b5cf6);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.32);
}

.md-mini-brand strong,
.md-side-user strong {
  display: block;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.md-mini-brand span,
.md-side-user span {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
}

.md-section-nav {
  display: grid;
  gap: 8px;
  overflow: auto;
  padding-right: 2px;
}

.md-section-nav p {
  margin: 0 0 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.md-section-nav button {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 0;
  border-radius: 14px;
  color: #334155;
  background: transparent;
  font-size: 13px;
  font-weight: 850;
  text-align: left;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.md-section-nav button:hover,
.md-section-nav button.active {
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
  transform: translateX(2px);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.26);
}

.md-side-user {
  margin-top: auto;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(139, 92, 246, 0.09));
}

.md-side-user small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: #059669;
  font-size: 11px;
  font-weight: 950;
}

.md-side-user small::before {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #22c55e;
  content: "";
}

.md-board {
  min-width: 0;
  display: grid;
  gap: 16px;
}

.md-metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(160px, 1fr));
  gap: 14px;
}

.md-metric-card {
  min-height: 132px;
  position: relative;
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  overflow: hidden;
  text-align: left;
}

.md-metric-card::after {
  position: absolute;
  inset: auto -16px -34px auto;
  width: 98px;
  height: 98px;
  border-radius: 50%;
  opacity: 0.12;
  content: "";
}

.md-metric-card.tone-blue::after { background: var(--md-blue); }
.md-metric-card.tone-green::after { background: var(--md-green); }
.md-metric-card.tone-red::after { background: var(--md-red); }
.md-metric-card.tone-amber::after { background: var(--md-amber); }
.md-metric-card.tone-purple::after { background: var(--md-purple); }
.md-metric-card.tone-navy::after { background: #0f172a; }

.md-metric-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.md-metric-card h3,
.md-panel-title h2,
.md-widget-title h2 {
  margin: 0;
  color: #07152f;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: -0.01em;
}

.md-metric-card h3 {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.04em;
}

.md-kpi-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 16px;
}

.tone-blue .md-kpi-icon, .tone-blue .md-soft-badge { color: var(--md-blue); background: #e8f1ff; }
.tone-green .md-kpi-icon, .tone-green .md-soft-badge { color: var(--md-green); background: #ddfbea; }
.tone-red .md-kpi-icon, .tone-red .md-soft-badge { color: var(--md-red); background: #fee2e2; }
.tone-amber .md-kpi-icon, .tone-amber .md-soft-badge { color: #d97706; background: #fff1d6; }
.tone-purple .md-kpi-icon, .tone-purple .md-soft-badge { color: var(--md-purple); background: #ede9fe; }
.tone-navy .md-kpi-icon, .tone-navy .md-soft-badge { color: #0f172a; background: #e2e8f0; }

.md-metric-value {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  flex-wrap: wrap;
}

.md-metric-value strong {
  font-size: clamp(25px, 2vw, 34px);
  line-height: 0.96;
  font-weight: 950;
  letter-spacing: -0.06em;
  color: #07152f;
}

.tone-blue .md-metric-value strong { color: var(--md-blue); }
.tone-green .md-metric-value strong { color: var(--md-green); }
.tone-red .md-metric-value strong { color: var(--md-red); }
.tone-amber .md-metric-value strong { color: #d97706; }
.tone-purple .md-metric-value strong { color: var(--md-purple); }

.md-metric-value span {
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.md-soft-badge {
  width: max-content;
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 950;
}

.md-metric-card p,
.md-panel-title p,
.md-widget-title p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 750;
}

.md-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
}

.md-left-stack,
.md-right-stack {
  min-width: 0;
  display: grid;
  gap: 16px;
  align-content: start;
  align-self: start;
}

.md-card,
.md-panel {
  border-radius: 26px;
  overflow: hidden;
}

.md-finance-hero {
  min-height: 342px;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.92fr);
  gap: 16px;
  padding: 20px;
}

.md-panel-title,
.md-widget-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.md-panel-title h2,
.md-widget-title h2 {
  font-size: 19px;
  letter-spacing: -0.04em;
}

.md-panel-title span,
.md-widget-title span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.md-money-hero {
  display: grid;
  gap: 18px;
}

.md-money-amount {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.md-money-amount strong {
  font-size: clamp(42px, 4vw, 70px);
  line-height: 0.9;
  font-weight: 980;
  letter-spacing: -0.08em;
  color: #111827;
}

.md-money-amount span {
  margin-bottom: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 900;
}

.md-mini-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.md-mini-stat {
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.20);
  border-radius: 20px;
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.md-mini-stat span {
  display: block;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.md-mini-stat strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
  color: #07152f;
}

.text-blue { color: var(--md-blue) !important; }
.text-green { color: var(--md-green) !important; }
.text-red { color: var(--md-red) !important; }
.text-amber { color: #d97706 !important; }
.text-purple { color: var(--md-purple) !important; }
.text-navy { color: #07152f !important; }

.md-chart-panel {
  min-height: 260px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.22), transparent 26%),
    radial-gradient(circle at 84% 22%, rgba(139, 92, 246, 0.18), transparent 24%),
    linear-gradient(180deg, #fbfdff, #f8fafc);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.md-svg-chart {
  width: 100%;
  height: 172px;
  margin-top: 8px;
}

.md-svg-chart polygon {
  fill: rgba(37, 99, 235, 0.12);
}

.md-svg-chart .line-main {
  fill: none;
  stroke: #2563eb;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.md-svg-chart .line-secondary {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.84;
}

.md-chart-dots circle {
  fill: #fff;
  stroke: #2563eb;
  stroke-width: 2.5;
}

.md-chart-footer {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding-top: 10px;
}

.md-chart-footer button {
  min-height: 52px;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  background: #fff;
  text-align: left;
}

.md-chart-footer span {
  display: block;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.md-chart-footer strong {
  display: block;
  margin-top: 4px;
  color: #07152f;
  font-size: 13px;
  font-weight: 950;
}

.md-donut-card {
  min-height: 282px;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.md-donut {
  --md-donut-value: 72%;
  width: min(158px, 56vw);
  aspect-ratio: 1;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(#ef4444 0 18%, #8b5cf6 18% var(--md-donut-value), #06b6d4 var(--md-donut-value) 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55), 0 12px 24px rgba(15, 23, 42, 0.08);
}

.md-donut::before {
  width: 58%;
  height: 58%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
  content: "";
}

.md-donut-center {
  position: absolute;
  text-align: center;
}

.md-donut-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  padding: 2px 0;
  border: 0;
  outline: 0;
  border-radius: 22px;
  background: transparent;
  box-shadow: none;
}
.md-donut-wrap:focus-visible,
.md-donut-legend button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.22);
  outline-offset: 3px;
}


.md-donut-center strong {
  display: block;
  color: #07152f;
  font-size: 27px;
  line-height: 1;
  font-weight: 980;
  letter-spacing: -0.06em;
}

.md-donut-center span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.md-donut-legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.md-donut-legend button {
  min-height: 58px;
  padding: 9px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 15px;
  background: #fff;
  text-align: left;
}

.md-donut-legend i,
.md-dot {
  width: 9px;
  height: 9px;
  display: inline-block;
  margin-right: 6px;
  border-radius: 999px;
}

.md-dot.blue, .md-donut-legend .blue { background: #2563eb; }
.md-dot.green, .md-donut-legend .green { background: #059669; }
.md-dot.red, .md-donut-legend .red { background: #ef4444; }
.md-dot.amber, .md-donut-legend .amber { background: #f59e0b; }
.md-dot.purple, .md-donut-legend .purple { background: #8b5cf6; }
.md-dot.sky, .md-donut-legend .sky { background: #06b6d4; }

.md-donut-legend span {
  display: block;
  color: #64748b;
  font-size: 10px;
  font-weight: 900;
}

.md-donut-legend strong {
  display: block;
  margin-top: 6px;
  color: #07152f;
  font-size: 16px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.md-color-tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.md-tile {
  min-height: 144px;
  position: relative;
  overflow: hidden;
  padding: 18px;
  border-radius: 24px;
  color: #fff;
  text-align: left;
  border: 0;
}

.md-tile::after {
  position: absolute;
  right: -18px;
  bottom: -26px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  content: "";
}

.md-tile.tone-red { background: linear-gradient(135deg, #ef4444, #f97316); }
.md-tile.tone-blue { background: linear-gradient(135deg, #2563eb, #06b6d4); }
.md-tile.tone-green { background: linear-gradient(135deg, #059669, #10b981); }
.md-tile.tone-amber { background: linear-gradient(135deg, #f59e0b, #fb923c); }
.md-tile.tone-purple { background: linear-gradient(135deg, #7c3aed, #ec4899); }
.md-tile.tone-navy { background: linear-gradient(135deg, #0f172a, #334155); }

.md-tile header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.md-tile h3 {
  position: relative;
  z-index: 1;
  margin: 18px 0 0;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: -0.01em;
}

.md-tile strong {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 8px;
  font-size: 34px;
  line-height: 1;
  font-weight: 980;
  letter-spacing: -0.07em;
}

.md-tile p {
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 750;
}

.md-tile-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.18);
}

.md-bottom-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.72fr) minmax(0, 1.28fr);
  gap: 14px;
  align-items: start;
}

.md-widget {
  padding: 16px;
  border-radius: 24px;
}

.md-activity-list {
  display: grid;
  gap: 9px;
  margin-top: 14px;
}

.md-activity-item {
  min-height: 62px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 17px;
  background: #fff;
  text-align: left;
}

.md-activity-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
}

.md-activity-item strong {
  display: block;
  color: #07152f;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 950;
}

.md-activity-item span {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 750;
}

.md-table-wrap {
  width: 100%;
  max-height: 286px;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 20px;
  background: #fff;
}

.md-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 0;
  table-layout: fixed;
}

.md-table th,
.md-table td {
  padding: 12px 13px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.86);
  text-align: left;
  vertical-align: top;
  font-size: 11px;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
}

.md-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  color: #64748b;
  background: #f8fafc;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.md-table th:nth-child(1), .md-table td:nth-child(1) { width: 92px; }
.md-table th:nth-child(2), .md-table td:nth-child(2) { width: 92px; }
.md-table th:nth-child(3), .md-table td:nth-child(3) { width: 36%; }
.md-table th:nth-child(4), .md-table td:nth-child(4) { width: 110px; }
.md-table th:nth-child(5), .md-table td:nth-child(5) { width: 30%; }

.md-table td {
  color: #334155;
  font-weight: 750;
}

.md-table tbody tr:last-child td { border-bottom: 0; }
.md-table tbody tr { cursor: pointer; }
.md-table tbody tr:hover td { background: #f8fbff; }

.md-priority {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 950;
}


.md-right-stack .md-widget {
  max-height: 292px;
  overflow: auto;
}

.md-bottom-grid .md-panel,
.md-right-stack .md-panel {
  min-height: 0;
}

.md-bottom-grid .md-widget-title,
.md-right-stack .md-widget-title {
  gap: 12px;
}

.md-bottom-grid .md-widget-title h2,
.md-right-stack .md-widget-title h2 {
  font-size: 17px;
  line-height: 1.1;
}

.md-bottom-grid .md-widget-title p,
.md-right-stack .md-widget-title p {
  font-size: 11px;
}

.md-priority-high { color: #b91c1c; background: #fee2e2; }
.md-priority-medium { color: #b45309; background: #fef3c7; }
.md-priority-low { color: #047857; background: #d1fae5; }

.md-view-panel {
  min-height: 560px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--md-shadow);
}

.md-view-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background:
    radial-gradient(circle at 88% 0%, rgba(37, 99, 235, 0.12), transparent 28%),
    linear-gradient(180deg, #fff, #f8fafc);
}

.md-view-eyebrow {
  display: inline-flex;
  margin-bottom: 8px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.md-view-header h2 {
  margin: 0;
  color: #06142f;
  font-size: clamp(28px, 2vw, 38px);
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.md-view-header p {
  margin: 9px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.md-view-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.md-view-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 22px;
}

.md-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(210px, 1fr));
  gap: 14px;
}

.md-breakdown-card {
  min-height: 150px;
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 24px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  text-align: left;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.055);
}

.md-breakdown-card::after {
  position: absolute;
  right: -22px;
  bottom: -42px;
  width: 122px;
  height: 122px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.08);
  content: "";
}

.md-breakdown-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 900;
}

.md-breakdown-card strong {
  color: #07152f;
  font-size: 30px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.md-breakdown-card small {
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}

.md-card-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  color: #2563eb;
  font-style: normal;
  font-size: 12px;
  font-weight: 950;
}

.md-evidence-wrap {
  max-height: none;
  margin-top: 0;
}

@media (max-width: 1480px) {
  .md-metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md-main-grid { grid-template-columns: 1fr; }
  .md-right-stack { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md-donut-card { min-height: 260px; }
  .md-breakdown-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 1180px) {
  .md-studio-shell { grid-template-columns: 1fr; }
  .md-side-panel {
    position: static;
    height: auto;
  }
  .md-section-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .md-finance-hero { grid-template-columns: 1fr; }
  .md-color-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md-bottom-grid { grid-template-columns: 1fr; }
}

@media (max-width: 760px) {
  .management-center-page {
    height: calc(100vh - 64px);
    padding: 10px;
  }
  .md-header,
  .md-view-header {
    flex-direction: column;
  }
  .md-toolbar,
  .md-view-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .md-toolbar button,
  .md-view-actions button {
    flex: 1 1 auto;
  }
  .md-metric-grid,
  .md-right-stack,
  .md-mini-stat-row,
  .md-chart-footer,
  .md-donut-legend,
  .md-color-tiles,
  .md-section-nav,
  .md-breakdown-grid {
    grid-template-columns: 1fr;
  }
  .md-money-amount strong { font-size: 42px; }
}

@media print {
  .management-center-page { height: auto; overflow: visible; padding: 0; background: #fff; }
  .md-header { position: static; box-shadow: none; }
  .md-toolbar, .md-side-panel { display: none; }
  .md-studio-shell, .md-main-grid, .md-bottom-grid { grid-template-columns: 1fr; }
  .md-card, .md-panel, .md-widget, .md-metric-card { box-shadow: none; break-inside: avoid; }
}

/* --------------------------------------------------------------------------
   Reference dashboard layout - requested exact admin-card direction
   -------------------------------------------------------------------------- */
.management-center-page {
  height: calc(100vh - 72px);
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #f4f8fc;
  color: #111827;
}

.management-module-root {
  max-width: 1280px;
}

.md-content {
  gap: 14px;
}

.md-header {
  display: none !important;
}

.md-reference-dashboard {
  display: grid;
  gap: 14px;
}

.md-metric-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.md-metric-card {
  min-height: 92px;
  gap: 8px;
  padding: 14px 15px;
  border: 0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 9px 20px rgba(15, 23, 42, 0.055);
}

.md-metric-card::after {
  width: 58px;
  height: 58px;
  right: -18px;
  bottom: -24px;
}

.md-metric-card h3 {
  font-size: 9px;
  letter-spacing: 0.05em;
  color: #7c8797;
}

.md-kpi-icon {
  width: 30px;
  height: 30px;
  border-radius: 10px;
}

.md-metric-value strong {
  font-size: 24px;
  letter-spacing: -0.05em;
}

.md-metric-value span {
  font-size: 11px;
}

.md-soft-badge {
  height: 20px;
  padding: 0 8px;
  font-size: 9px;
}

.md-metric-card p {
  display: none;
}

.ref-top-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.12fr) minmax(270px, 0.88fr);
  gap: 14px;
  align-items: stretch;
}

.ref-card,
.ref-tile,
.ref-activity-card,
.ref-order-card {
  border: 0;
  border-radius: 11px;
  background: #ffffff;
  box-shadow: 0 9px 22px rgba(15, 23, 42, 0.055);
}

.ref-card {
  padding: 16px 18px 14px;
}

.ref-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ref-card-kicker {
  margin: 0;
  color: #6b7280;
  font-size: 10px;
  line-height: 1;
  font-weight: 850;
}

.ref-card-subtitle {
  margin: 5px 0 0;
  color: #9aa4b2;
  font-size: 10px;
  font-weight: 700;
}

.ref-tabs {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  color: #8a94a5;
  font-size: 9px;
  font-weight: 850;
  white-space: nowrap;
}

.ref-tabs button {
  border: 0;
  background: transparent;
  color: #f59e0b;
  font: inherit;
  padding: 0;
}

.ref-legend {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  margin-left: 8px;
  color: #8a94a5;
  font-size: 9px;
  font-weight: 800;
}

.ref-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.ref-chart-layout {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 14px;
  min-height: 218px;
  margin-top: 12px;
}

.ref-earning-panel {
  display: grid;
  align-content: start;
  gap: 14px;
  padding-top: 12px;
}

.ref-big-money {
  margin: 0;
  font-size: 27px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #2d3748;
}

.ref-caption {
  display: block;
  margin-top: 7px;
  color: #7d8795;
  font-size: 10px;
  font-weight: 700;
}

.ref-count-number {
  margin: 0;
  font-size: 24px;
  line-height: 1;
  font-weight: 850;
  color: #2d3748;
}

.ref-summary-pill {
  width: max-content;
  min-height: 35px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  padding: 0 17px;
  color: #fff;
  background: linear-gradient(135deg, #f55793, #8b5cf6);
  box-shadow: 0 10px 18px rgba(139, 92, 246, 0.18);
  font-size: 10px;
  font-weight: 800;
}

.ref-line-chart {
  min-width: 0;
  min-height: 216px;
  padding: 4px 0 0;
}

.ref-chart-svg {
  width: 100%;
  height: 198px;
  display: block;
}

.ref-chart-grid line {
  stroke: rgba(148, 163, 184, 0.20);
  stroke-width: 0.6;
  stroke-dasharray: 2 3;
}

.ref-chart-months {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  margin-top: -6px;
  color: #868f9f;
  font-size: 10px;
  font-weight: 750;
}

.ref-finance-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding-top: 13px;
  border-top: 1px solid rgba(226, 232, 240, 0.76);
}

.ref-finance-chip {
  min-width: 0;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
}

.ref-finance-icon,
.ref-mini-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #fff;
  box-shadow: 0 7px 15px rgba(15, 23, 42, 0.08);
}

.ref-finance-chip span {
  display: block;
  color: #8b95a5;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 750;
}

.ref-finance-chip strong {
  display: block;
  margin-top: 3px;
  color: #374151;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 900;
}

.ref-donut-card {
  position: relative;
  min-height: 322px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 14px;
  padding: 18px 18px 15px;
  overflow: hidden;
}

.ref-donut-title {
  position: absolute;
  left: 18px;
  top: 18px;
  margin: 0;
  color: #dfe5ee;
  font-size: 12px;
  font-weight: 900;
}

.ref-donut-wrap {
  position: relative;
  width: 195px;
  height: 195px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: transparent;
}

.ref-donut-ring {
  width: 195px;
  height: 195px;
  border-radius: 50%;
  background: conic-gradient(#ef5350 0 40%, #8b5cf6 40% 63%, #5dc7ec 63% 82%, #ef5350 82% 100%);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

.ref-donut-hole {
  position: absolute;
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #ffffff;
}

.ref-donut-core {
  width: 70px;
  height: 70px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, #ffb232, #ff9a2d);
  box-shadow: 0 10px 22px rgba(255, 154, 45, 0.24);
}

.ref-social-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ref-social-item {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0;
}

.ref-social-item strong {
  display: block;
  color: #1f2937;
  font-size: 25px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.ref-social-item span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  color: #6b7280;
  font-size: 9px;
  font-weight: 800;
}

.ref-tiles-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.ref-tile {
  min-height: 112px;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: #fff;
  text-align: left;
}

.ref-tile::after {
  position: absolute;
  right: 20px;
  bottom: 14px;
  width: 92px;
  height: 44px;
  opacity: 0.72;
  content: "";
  border-bottom: 2px dashed rgba(255, 255, 255, 0.62);
  border-radius: 50%;
  transform: rotate(-8deg);
}

.ref-tile-icon {
  position: relative;
  z-index: 1;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
}

.ref-tile-content {
  position: relative;
  z-index: 1;
}

.ref-tile span {
  display: block;
  color: rgba(255,255,255,.84);
  font-size: 10px;
  font-weight: 800;
}

.ref-tile strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.ref-tile small {
  display: block;
  margin-top: 5px;
  color: rgba(255,255,255,.82);
  font-size: 9px;
  font-weight: 750;
}

.ref-tile.tile-purple { background: linear-gradient(135deg, #8b3ff5, #5b73ff); }
.ref-tile.tile-blue { background: linear-gradient(135deg, #16a8ff, #2d63f2); }
.ref-tile.tile-teal { background: linear-gradient(135deg, #25c3b2, #1aa9d5); }
.ref-tile.tile-orange { background: linear-gradient(135deg, #ffbb4f, #ff8744); }

.ref-bottom-grid {
  display: grid;
  grid-template-columns: minmax(250px, .7fr) minmax(0, 1.7fr);
  gap: 14px;
}

.ref-activity-card,
.ref-order-card {
  padding: 16px;
}

.ref-section-title {
  margin: 0;
  color: #273144;
  font-size: 12px;
  font-weight: 900;
}

.ref-section-subtitle {
  margin: 4px 0 0;
  color: #a2acba;
  font-size: 10px;
  font-weight: 750;
}

.ref-activity-stack {
  display: grid;
  gap: 13px;
  margin-top: 16px;
}

.ref-activity-row {
  display: grid;
  grid-template-columns: 60px 36px minmax(0,1fr);
  gap: 11px;
  align-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
}

.ref-activity-time {
  color: #6f7a8b;
  font-size: 10px;
  font-weight: 800;
}

.ref-activity-dot {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #fff;
  box-shadow: 0 8px 16px rgba(15,23,42,.08);
}

.ref-activity-row strong {
  display: block;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.1;
  font-weight: 850;
}

.ref-activity-row span:last-child {
  display: block;
  margin-top: 4px;
  color: #9aa4b2;
  font-size: 9px;
  font-weight: 750;
}

.ref-order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.ref-order-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ref-add-btn {
  min-height: 35px;
  border: 0;
  border-radius: 8px;
  padding: 0 13px;
  color: #fff;
  background: #fb5252;
  font-size: 10px;
  font-weight: 850;
}

.ref-icon-btn,
.ref-search-box {
  width: 35px;
  height: 35px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  color: #b7c0ce;
  background: #f4f6f9;
}

.ref-search-box {
  width: 112px;
  justify-content: start;
  padding-left: 13px;
  color: #a2acba;
  font-size: 10px;
  font-weight: 700;
}

.ref-order-table-wrap {
  width: 100%;
  margin-top: 12px;
  overflow-x: auto;
}

.ref-order-table {
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
}

.ref-order-table th,
.ref-order-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #eef2f7;
  text-align: left;
  font-size: 10px;
  line-height: 1.35;
}

.ref-order-table th {
  color: #7c8797;
  font-weight: 900;
  text-transform: uppercase;
}

.ref-order-table td {
  color: #394456;
  font-weight: 780;
}

.ref-order-table tr {
  cursor: pointer;
}

.ref-order-table tr:hover td {
  background: #f8fbff;
}

.ref-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 67px;
  height: 26px;
  border-radius: 7px;
  color: #fff;
  font-size: 10px;
  font-weight: 850;
}

.ref-status-pill.high { background: #f04d8a; }
.ref-status-pill.medium { background: #8b5cf6; }
.ref-status-pill.low { background: #42c2e8; }

.ref-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  color: #8b95a5;
  font-size: 10px;
  font-weight: 750;
}

.ref-page-dots {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.ref-page-dots span {
  width: 21px;
  height: 21px;
  display: grid;
  place-items: center;
  border-radius: 999px;
}

.ref-page-dots span.active {
  color: #fff;
  background: #ef4444;
}

.bg-pink { background: linear-gradient(135deg, #f0528f, #e83e7f); }
.bg-purple { background: linear-gradient(135deg, #8b5cf6, #6d5dfc); }
.bg-cyan { background: linear-gradient(135deg, #5ed5f2, #37bde5); }
.bg-orange { background: linear-gradient(135deg, #fbbf24, #fb923c); }
.bg-blue { background: linear-gradient(135deg, #2563eb, #06b6d4); }

@media (max-width: 1260px) {
  .md-metric-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .ref-top-grid { grid-template-columns: 1fr; }
}

@media (max-width: 960px) {
  .ref-chart-layout { grid-template-columns: 1fr; }
  .ref-finance-strip,
  .ref-tiles-grid,
  .ref-bottom-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 680px) {
  .management-center-page { padding: 10px; }
  .md-metric-grid,
  .ref-finance-strip,
  .ref-tiles-grid,
  .ref-bottom-grid,
  .ref-social-row { grid-template-columns: 1fr; }
  .ref-card-head,
  .ref-order-header { flex-direction: column; align-items: flex-start; }
  .ref-tabs { flex-wrap: wrap; gap: 10px; }
  .ref-chart-months { display: none; }
}

`;

type Tone = "green" | "blue" | "red" | "amber" | "purple" | "navy";
type DrillLevel = 1 | 2 | 3;

type IconName =
  | "dashboard"
  | "shield"
  | "wallet"
  | "risk"
  | "audit"
  | "saving"
  | "users"
  | "alert"
  | "calendar"
  | "download"
  | "filter"
  | "endpoint"
  | "service"
  | "software"
  | "remote"
  | "job"
  | "pin"
  | "asset"
  | "network"
  | "settings"
  | "chevron";

type DashboardKpi = {
  id: string;
  title: string;
  value: string;
  subValue?: string;
  note?: string;
  trend?: string;
  tone: Tone;
  icon?: IconName | string;
  area: string;
};

type DashboardPillar = {
  id: string;
  index: number;
  title: string;
  scoreTitle: string;
  scoreValue: string;
  scoreUnit?: string;
  scoreStatus: string;
  statusTone: Tone;
  secondTitle: string;
  secondValue: string;
  secondNote?: string;
  detailsTitle: string;
  details: Array<{ label: string; value: string; tone?: Tone; key?: string }>;
  footerText: string;
  tone: Tone;
  icon?: IconName | string;
  area: string;
};

type BoardAction = {
  priority: "High" | "Medium" | "Low";
  area: string;
  key: string;
  issue: string;
  impact: string;
  decision: string;
  targetDate: string;
};

type FinanceData = {
  capexOpex: Array<{ month: string; capex: number; opex: number; count?: number }>;
  tangibleCost: number;
  intangibleCost: number;
  totalCost: number;
  capexYtd: number;
  opexYtd: number;
  riskCost: number;
  avgMonthlyCost: number;
  potentialSavings: number;
};

type DrillRow = {
  key: string;
  label: string;
  count: number;
  value: number;
  valueFmt?: string;
  level3Area?: string;
  level3Key?: string;
};

type DashboardData = {
  generatedAt: string;
  executiveKpis: DashboardKpi[];
  pillars: DashboardPillar[];
  boardActions: BoardAction[];
  finance: FinanceData;
  level2: Record<string, DrillRow[]>;
};

type EvidenceRow = {
  assetKey?: string;
  objectAgent?: string;
  assetId?: string;
  deviceName?: string;
  department?: string;
  category?: string;
  brand?: string;
  model?: string;
  platform?: string;
  status?: string;
  lastSeen?: string;
  age?: string;
  ipAddress?: string;
  riskScore?: number;
  riskSeverity?: string;
  replacementCost?: string;
};

type DrillState = {
  level: DrillLevel;
  area?: string;
  key?: string;
  title?: string;
  rows?: Array<DrillRow | EvidenceRow>;
  total?: number;
  loading?: boolean;
  parent?: {
    level: DrillLevel;
    area?: string;
    key?: string;
    title?: string;
    rows?: Array<DrillRow | EvidenceRow>;
    total?: number;
    loading?: boolean;
  };
};

const emptyFinance: FinanceData = {
  capexOpex: [],
  tangibleCost: 0,
  intangibleCost: 0,
  totalCost: 0,
  capexYtd: 0,
  opexYtd: 0,
  riskCost: 0,
  avgMonthlyCost: 0,
  potentialSavings: 0,
};

const emptyDashboard: DashboardData = {
  generatedAt: "",
  executiveKpis: [],
  pillars: [],
  boardActions: [],
  finance: emptyFinance,
  level2: {},
};

const validIcons: IconName[] = [
  "dashboard", "shield", "wallet", "risk", "audit", "saving", "users", "alert", "calendar", "download", "filter", "endpoint", "service", "software", "remote", "job", "pin", "asset", "network", "settings", "chevron",
];

const API_BASE_URL = String(import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readApiJson(res: Response, featureName: string) {
  const contentType = res.headers.get("content-type") || "";
  const bodyText = await res.text();

  if (!contentType.toLowerCase().includes("application/json")) {
    const isHtml = bodyText.trim().toLowerCase().startsWith("<!doctype") || bodyText.trim().toLowerCase().startsWith("<html");
    throw new Error(
      isHtml
        ? `${featureName} endpoint is returning the frontend HTML page. Check backend route and Vite proxy / API base URL.`
        : `${featureName} endpoint did not return JSON.`
    );
  }

  try {
    return bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error(`${featureName} endpoint returned invalid JSON.`);
  }
}

function formatMoney(value: number) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `RM ${Math.round(n / 1_000).toLocaleString()}K`;
  return `RM ${Math.round(n).toLocaleString()}`;
}

function parseNumberFromText(value: unknown, fallback = 0) {
  const text = String(value ?? "");
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function normalizeIcon(value?: string): IconName {
  return validIcons.includes(value as IconName) ? (value as IconName) : "dashboard";
}

function normalizeDashboardData(payload: Partial<DashboardData> | null | undefined): DashboardData {
  return {
    generatedAt: payload?.generatedAt || "",
    executiveKpis: Array.isArray(payload?.executiveKpis) ? payload.executiveKpis : [],
    pillars: Array.isArray(payload?.pillars) ? payload.pillars : [],
    boardActions: Array.isArray(payload?.boardActions) ? payload.boardActions : [],
    finance: {
      ...emptyFinance,
      ...(payload?.finance || {}),
      capexOpex: Array.isArray(payload?.finance?.capexOpex) ? payload.finance.capexOpex : [],
    },
    level2: payload?.level2 || {},
  };
}

function parseActionTarget(action: BoardAction) {
  const rawKey = action.key || "";
  const [prefix, ...rest] = rawKey.split(":");
  let area = (prefix || action.area || "risk").toLowerCase().trim();
  let key = rest.join(":") || rawKey;

  if (area === "capex-category" || area === "capex-department") area = "capex";
  if (area === "data quality" || area === "data-quality") {
    area = "compliance";
    key = key || "data-quality";
  }
  if (!area || area === "actions") area = "risk";
  return { area, key };
}

function getDrillValue(row: DrillRow, area?: string) {
  if (row.valueFmt) return row.valueFmt;
  if (area === "resources") return `${Number(row.count || 0).toLocaleString()} endpoint(s)`;
  if (area === "compliance") return row.key === "pricing-coverage" ? `${Number(row.value || 0)}%` : `${Number(row.count || 0).toLocaleString()} record(s)`;
  if (area === "actions") return row.value ? formatMoney(row.value) : "Decision item";
  return formatMoney(row.value || 0);
}

function readText(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

async function fetchDashboardOverview() {
  const res = await fetch(buildApiUrl("/api/management-dashboard/overview"), {
    headers: getAuthHeaders(),
  });

  const json = await readApiJson(res, "Management dashboard overview");
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "Management insight is not available right now.");
  }
  return normalizeDashboardData(json.data || json);
}

async function fetchDashboardDrilldown(area: string, key = "", level: DrillLevel = 2) {
  const params = new URLSearchParams({ area, key, level: String(level) });
  const res = await fetch(buildApiUrl(`/api/management-dashboard/drilldown?${params.toString()}`), {
    headers: getAuthHeaders(),
  });

  const json = await readApiJson(res, "Management dashboard drilldown");
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || "Detail insight is not available right now.");
  }
  return json.data || { rows: [], total: 0 };
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `md-icon ${className}`,
    "aria-hidden": true,
  };

  const icons: Record<IconName, React.ReactElement> = {
    dashboard: <svg {...props}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>,
    shield: <svg {...props}><path d="M12 3l7 3v5c0 4.5-2.8 8.5-7 10-4.2-1.5-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-5" /></svg>,
    wallet: <svg {...props}><path d="M4 7.5h14A3 3 0 0 1 21 10.5v6.2A3.3 3.3 0 0 1 17.7 20H6.3A3.3 3.3 0 0 1 3 16.7V7a3 3 0 0 1 3-3h11" /><path d="M16.5 13H21" /><path d="M17.8 15.2h.1" /></svg>,
    risk: <svg {...props}><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    audit: <svg {...props}><path d="M8 4h8l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2z" /><path d="M8 13l2.2 2.2L16 9.5" /></svg>,
    saving: <svg {...props}><path d="M19 6.8A8.7 8.7 0 0 0 12 3C7 3 3.4 6.2 3.4 10.5c0 3.9 3 7.2 7.1 7.8V21h3v-2.7c2.9-.5 5.2-2.2 6.1-4.6" /><path d="M9.5 14.5c.7.7 1.7 1 2.8 1 1.4 0 2.5-.6 2.5-1.7 0-1.2-1.2-1.5-2.7-1.8-1.4-.3-2.6-.7-2.6-1.9 0-1 1-1.7 2.5-1.7 1 0 1.9.3 2.6.9" /></svg>,
    users: <svg {...props}><path d="M16 20v-1.7c0-1.8-1.6-3.3-3.6-3.3H7.6C5.6 15 4 16.5 4 18.3V20" /><circle cx="10" cy="8" r="3.5" /><path d="M20 20v-1.4c0-1.5-1.1-2.8-2.6-3.2" /><path d="M16.3 4.4a3 3 0 0 1 0 5.8" /></svg>,
    alert: <svg {...props}><path d="M10.3 4.1L2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    calendar: <svg {...props}><path d="M7 3v3" /><path d="M17 3v3" /><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16" /></svg>,
    download: <svg {...props}><path d="M12 4v10" /><path d="M8 10l4 4 4-4" /><path d="M5 20h14" /></svg>,
    filter: <svg {...props}><path d="M4 5h16l-6.5 7.5V18l-3 1.5v-7L4 5z" /></svg>,
    endpoint: <svg {...props}><rect x="4" y="5" width="16" height="11" rx="2" /><path d="M8 21h8" /><path d="M12 16v5" /></svg>,
    service: <svg {...props}><path d="M4 14a8 8 0 0 1 16 0" /><path d="M4 14v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2z" /><path d="M20 14v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2z" /></svg>,
    software: <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 4v16" /><path d="M4 9h16" /></svg>,
    remote: <svg {...props}><path d="M6 7h12v10H6z" /><path d="M9 20h6" /><path d="M12 17v3" /><path d="M9 11h6" /></svg>,
    job: <svg {...props}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></svg>,
    pin: <svg {...props}><path d="M12 21s7-5.5 7-12a7 7 0 0 0-14 0c0 6.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>,
    asset: <svg {...props}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 12l8-4.5" /><path d="M12 12v9" /><path d="M12 12L4 7.5" /></svg>,
    network: <svg {...props}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M8 7l3 8" /><path d="M16 7l-3 8" /><path d="M8 6h8" /></svg>,
    settings: <svg {...props}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .2 1.7 1.7 0 0 0-.8 1.6V22H9.2v-.2a1.7 1.7 0 0 0-.8-1.6 1.7 1.7 0 0 0-2-.2l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.4-1H3V10h.2a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.2A1.7 1.7 0 0 0 9.2 2V2h5.6v.2a1.7 1.7 0 0 0 .8 1.6 1.7 1.7 0 0 0 2 .2l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2v3.8h-.2a1.7 1.7 0 0 0-1.4.9z" /></svg>,
    chevron: <svg {...props}><path d="M9 18l6-6-6-6" /></svg>,
  };

  return icons[name];
}

function SoftBadge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return <span className={`md-soft-badge tone-${tone}`}>{children}</span>;
}

export default function ManagementDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState<DrillState>({ level: 1 });

  useEffect(() => {
    let mounted = true;

    fetchDashboardOverview()
      .then((data) => {
        if (!mounted) return;
        setDashboard(data);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setDashboard(emptyDashboard);
        setError(err?.message || "Management insight is not available right now.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const scrollTarget = document.querySelector(".management-center-page");
    if (scrollTarget && "scrollTo" in scrollTarget) {
      (scrollTarget as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [drill.level, drill.title]);

  const capexMax = useMemo(() => {
    const values = dashboard.finance.capexOpex.flatMap((item) => [Number(item.capex || 0), Number(item.opex || 0)]);
    return Math.max(...values, 1);
  }, [dashboard.finance.capexOpex]);

  const chartData = useMemo(() => {
    const rows = dashboard.finance.capexOpex.slice(-6);
    const max = Math.max(...rows.flatMap((item) => [Number(item.capex || 0), Number(item.opex || 0)]), 1);
    const makePoints = (field: "capex" | "opex") => rows.map((item, index) => {
      const x = rows.length <= 1 ? 50 : (index / (rows.length - 1)) * 100;
      const y = 88 - (Number(item[field] || 0) / max) * 68;
      return { x, y, item };
    });
    const capex = makePoints("capex");
    const opex = makePoints("opex");
    return {
      capex,
      opex,
      capexLine: capex.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
      opexLine: opex.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "),
      capexArea: capex.length ? `0,100 ${capex.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")} 100,100` : "0,100 100,100",
      latest: rows.slice(-4),
    };
  }, [dashboard.finance.capexOpex]);

  const healthPercent = useMemo(() => {
    const compliance = dashboard.executiveKpis.find((item) => /compliance|health/i.test(item.title));
    const first = compliance || dashboard.executiveKpis[0];
    return clamp(parseNumberFromText(first?.value, 72), 0, 100);
  }, [dashboard.executiveKpis]);

  const quickActions = useMemo(() => dashboard.boardActions.slice(0, 4), [dashboard.boardActions]);
  const topMetrics = useMemo(() => dashboard.executiveKpis.slice(0, 6), [dashboard.executiveKpis]);
  const tiles = useMemo(() => dashboard.pillars.slice(0, 4), [dashboard.pillars]);

  function openLevel2(area: string, title: string, key = "") {
    if (area === "actions") {
      const rows: DrillRow[] = dashboard.boardActions.map((action) => {
        const target = parseActionTarget(action);
        return {
          key: action.key || `${action.area}-${action.issue}`,
          label: action.issue,
          count: 1,
          value: 0,
          valueFmt: action.impact,
          level3Area: target.area,
          level3Key: target.key,
        };
      });
      setDrill({ level: 2, area, key, title, rows, total: rows.length });
      return;
    }

    const rows = key ? [] : dashboard.level2[area] || [];
    setDrill({ level: 2, area, key, title, rows, total: rows.length, loading: Boolean(key) });

    if (key) {
      fetchDashboardDrilldown(area, key, 2)
        .then((data) => setDrill({ level: 2, area, key, title: data.title || title, rows: data.rows || [], total: data.total || 0 }))
        .catch(() => setDrill({ level: 2, area, key, title, rows: [], total: 0, loading: false }));
    }
  }

  function openLevel3(area: string, key: string, title: string) {
    const parent = drill.level === 2
      ? {
          level: drill.level,
          area: drill.area,
          key: drill.key,
          title: drill.title,
          rows: drill.rows,
          total: drill.total,
          loading: false,
        }
      : undefined;

    setDrill({ level: 3, area, key, title, rows: [], total: 0, loading: true, parent });

    fetchDashboardDrilldown(area, key, 3)
      .then((data) => setDrill({ level: 3, area, key, title: data.title || title, rows: data.rows || [], total: data.total || 0, parent }))
      .catch(() => setDrill({ level: 3, area, key, title, rows: [], total: 0, loading: false, parent }));
  }

  function closeDrilldown() {
    setDrill({ level: 1 });
  }

  function backDrilldown() {
    if (drill.level === 3 && drill.parent) {
      setDrill({ ...drill.parent, level: 2 });
      return;
    }
    closeDrilldown();
  }

  function refreshDashboard() {
    setLoading(true);
    setError("");
    closeDrilldown();

    fetchDashboardOverview()
      .then((data) => setDashboard(data))
      .catch((err) => setError(err?.message || "Management insight is not available right now."))
      .finally(() => setLoading(false));
  }

  function printDashboard() {
    window.print();
  }

  const hasDashboardData = dashboard.executiveKpis.length > 0 || dashboard.pillars.length > 0;

  function renderOverview() {
    const financeChips = [
      { label: "Wallet Balance", value: formatMoney(dashboard.finance.totalCost), icon: "wallet" as IconName, bg: "bg-pink", area: "capex", title: "Financial Exposure" },
      { label: "Risk Exposure", value: formatMoney(dashboard.finance.riskCost), icon: "risk" as IconName, bg: "bg-purple", area: "risk", title: "Risk Exposure" },
      { label: "Savings", value: formatMoney(dashboard.finance.potentialSavings), icon: "saving" as IconName, bg: "bg-cyan", area: "saving", title: "Savings Opportunity" },
      { label: "CAPEX Watch", value: formatMoney(dashboard.finance.capexYtd), icon: "asset" as IconName, bg: "bg-orange", area: "capex", title: "CAPEX Watch" },
    ];

    const tileClasses = ["tile-purple", "tile-blue", "tile-teal", "tile-orange"];
    const activityColors = ["bg-pink", "bg-purple", "bg-cyan", "bg-orange"];
    const chartMonths = chartData.latest.length ? chartData.latest.map((item) => item.month) : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const displayActions = dashboard.boardActions.slice(0, 5);

    return (
      <section className="md-reference-dashboard" aria-label="Management dashboard overview">
        <section className="md-metric-grid" aria-label="Executive KPI cards">
          {topMetrics.map((kpi) => (
            <button
              type="button"
              className={`md-metric-card tone-${kpi.tone}`}
              key={kpi.id || kpi.title}
              onClick={() => openLevel2(kpi.area, kpi.title)}
            >
              <header>
                <h3>{kpi.title}</h3>
                <span className="md-kpi-icon"><Icon name={normalizeIcon(kpi.icon)} /></span>
              </header>
              <div className="md-metric-value">
                <strong>{kpi.value}</strong>
                {kpi.subValue && <span>{kpi.subValue}</span>}
              </div>
              {kpi.note && <SoftBadge tone={kpi.tone}>{kpi.note}</SoftBadge>}
            </button>
          ))}
        </section>

        <section className="ref-top-grid">
          <article className="ref-card" aria-label="Financial trend dashboard">
            <div className="ref-card-head">
              <div>
                <p className="ref-card-kicker">Dashboard</p>
                <p className="ref-card-subtitle">Overview of latest Month</p>
              </div>
              <div className="ref-tabs" aria-label="Time filter tabs">
                <span>DAILY</span>
                <span>WEEKLY</span>
                <button type="button" onClick={() => openLevel2("capex", "Monthly Exposure")}>MONTHLY</button>
                <span>YEARLY</span>
                <span className="ref-legend"><span><i className="md-dot red" />Online</span><span><i className="md-dot amber" />Store</span></span>
              </div>
            </div>

            <div className="ref-chart-layout">
              <aside className="ref-earning-panel">
                <div>
                  <p className="ref-big-money">{formatMoney(dashboard.finance.totalCost)}</p>
                  <span className="ref-caption">Current Month Exposure</span>
                </div>
                <div>
                  <p className="ref-count-number">{Number(topMetrics[1]?.value?.replace(/[^0-9.-]/g, "") || dashboard.boardActions.length || 0).toLocaleString()}</p>
                  <span className="ref-caption">Current Month Signals</span>
                </div>
                <button type="button" className="ref-summary-pill" onClick={() => openLevel2("capex", "Monthly Financial Summary")}>Last Month Summary</button>
              </aside>

              <div className="ref-line-chart">
                <svg className="ref-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <g className="ref-chart-grid">
                    {[20, 40, 60, 80].map((y) => <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} />)}
                    {[16, 33, 50, 67, 84].map((x) => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="100" />)}
                  </g>
                  <defs>
                    <linearGradient id="refBlueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="refOrangeArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={chartData.capexArea} fill="url(#refBlueArea)" />
                  <polyline points={chartData.capexLine || "0,90 18,62 34,70 50,42 68,58 84,22 100,86"} fill="none" stroke="#8b5cf6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={chartData.opexLine || "0,88 18,70 34,42 50,76 68,64 84,34 100,88"} fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  {chartData.capex.map((point) => <circle key={`${point.item.month}-${point.x}`} cx={point.x} cy={point.y} r="1.8" fill="#fff" stroke="#8b5cf6" strokeWidth="1.2" />)}
                </svg>
                <div className="ref-chart-months">
                  {chartMonths.slice(-6).map((month, index) => <span key={`${month}-${index}`}>{month}</span>)}
                </div>
              </div>
            </div>

            <div className="ref-finance-strip">
              {financeChips.map((chip) => (
                <button type="button" className="ref-finance-chip" key={chip.label} onClick={() => openLevel2(chip.area, chip.title)}>
                  <span className={`ref-finance-icon ${chip.bg}`}><Icon name={chip.icon} /></span>
                  <span>{chip.label}<strong>{chip.value}</strong></span>
                </button>
              ))}
            </div>
          </article>

          <article className="ref-card ref-donut-card" aria-label="Risk and channel mix">
            <p className="ref-donut-title">Title</p>
            <button type="button" className="ref-donut-wrap" onClick={() => openLevel2("compliance", "Risk and Compliance Mix")}>
              <div className="ref-donut-ring" />
              <div className="ref-donut-hole">
                <div className="ref-donut-core"><Icon name="asset" /></div>
              </div>
            </button>
            <div className="ref-social-row">
              <button type="button" className="ref-social-item" onClick={() => openLevel2("risk", "Risk Exposure")}><strong>{Math.max(0, 100 - healthPercent)}%</strong><span><i className="md-dot purple" />Risk</span></button>
              <button type="button" className="ref-social-item" onClick={() => openLevel2("compliance", "Compliance Score")}><strong>{healthPercent}%</strong><span><i className="md-dot red" />Control</span></button>
              <button type="button" className="ref-social-item" onClick={() => openLevel2("saving", "Savings Opportunity")}><strong>{clamp(parseNumberFromText(formatMoney(dashboard.finance.potentialSavings), 12), 0, 99)}%</strong><span><i className="md-dot green" />Savings</span></button>
            </div>
          </article>
        </section>

        <section className="ref-tiles-grid" aria-label="Executive shortcut cards">
          {tiles.map((pillar, index) => (
            <button
              type="button"
              className={`ref-tile ${tileClasses[index % tileClasses.length]}`}
              key={pillar.id || pillar.title}
              onClick={() => openLevel2(pillar.area, pillar.title)}
            >
              <span className="ref-tile-icon"><Icon name={normalizeIcon(pillar.icon)} /></span>
              <span className="ref-tile-content">
                <span>{pillar.title}</span>
                <strong>{pillar.scoreValue}{pillar.scoreUnit || ""}</strong>
                <small>{pillar.secondTitle}: {pillar.secondValue}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="ref-bottom-grid">
          <article className="ref-activity-card">
            <h2 className="ref-section-title">Recent Activities</h2>
            <div className="ref-activity-stack">
              {dashboard.pillars.slice(0, 4).map((pillar, index) => {
                const firstDetail = pillar.details?.[0];
                return (
                  <button
                    type="button"
                    className="ref-activity-row"
                    key={`activity-${pillar.id}`}
                    onClick={() => openLevel2(pillar.area, firstDetail?.label || pillar.title, firstDetail?.key || "")}
                  >
                    <span className="ref-activity-time">{index === 0 ? "40 Mins Ago" : index === 1 ? "1 day ago" : index === 2 ? "40 Mins Ago" : "1 day ago"}</span>
                    <span className={`ref-activity-dot ${activityColors[index % activityColors.length]}`}><Icon name={normalizeIcon(pillar.icon)} /></span>
                    <span>
                      <strong>{firstDetail?.label || pillar.title}</strong>
                      <span>{firstDetail ? `${firstDetail.value} from ${pillar.title}` : pillar.scoreStatus}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="ref-order-card">
            <div className="ref-order-header">
              <div>
                <h2 className="ref-section-title">Order Status</h2>
                <p className="ref-section-subtitle">Overview of latest month</p>
              </div>
              <div className="ref-order-actions">
                <button type="button" className="ref-add-btn" onClick={() => openLevel2("actions", "Board Action Queue")}>Add</button>
                <button type="button" className="ref-icon-btn" onClick={refreshDashboard}><Icon name="filter" /></button>
                <button type="button" className="ref-icon-btn" onClick={() => openLevel2("actions", "Board Action Queue")}><Icon name="audit" /></button>
                <button type="button" className="ref-icon-btn" onClick={printDashboard}><Icon name="download" /></button>
                <span className="ref-search-box">Search</span>
                <button type="button" className="ref-icon-btn" onClick={printDashboard}><Icon name="download" /></button>
              </div>
            </div>

            <div className="ref-order-table-wrap">
              <table className="ref-order-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customers</th>
                    <th>From</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayActions.length === 0 ? (
                    <tr><td colSpan={5}>No executive action is required for this view.</td></tr>
                  ) : displayActions.map((action, index) => {
                    const target = parseActionTarget(action);
                    return (
                      <tr key={`${action.area}-${action.key}-${action.issue}`} onClick={() => openLevel2(target.area, action.issue, target.key)}>
                        <td>{String(index + 12386)}</td>
                        <td>{action.area}</td>
                        <td>{action.issue}</td>
                        <td>{action.impact}</td>
                        <td><span className={`ref-status-pill ${action.priority.toLowerCase()}`}>{action.priority === "High" ? "Process" : action.priority === "Medium" ? "Open" : "On Hold"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ref-pagination">
              <span>Showing 1 to {Math.max(1, displayActions.length)} entries</span>
              <span className="ref-page-dots"><span>‹</span><span>1</span><span className="active">2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>›</span></span>
            </div>
          </article>
        </section>
      </section>
    );
  }

  function renderBreakdownView() {
    const rows = (drill.rows || []) as DrillRow[];

    return (
      <section className="md-view-panel" aria-label="Executive breakdown view">
        <div className="md-view-header">
          <div>
            <span className="md-view-eyebrow">Level 2 - Executive Breakdown</span>
            <h2>{drill.title || "Management Breakdown"}</h2>
            <p>{Number(drill.total || rows.length || 0).toLocaleString()} item(s). Click any card to open Level 3 evidence.</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="primary" onClick={closeDrilldown}>Back to Overview</button>
            <button type="button" onClick={refreshDashboard}><Icon name="filter" /> Refresh</button>
          </div>
        </div>

        <div className="md-view-body">
          {drill.loading ? (
            <div className="md-state-panel">Loading breakdown...</div>
          ) : rows.length === 0 ? (
            <div className="md-state-panel">No breakdown item is available for this selection.</div>
          ) : (
            <div className="md-breakdown-grid">
              {rows.map((row) => (
                <button
                  type="button"
                  key={row.key || row.label}
                  className="md-breakdown-card"
                  onClick={() => openLevel3(row.level3Area || drill.area || "risk", row.level3Key || row.key, row.label)}
                >
                  <span>{row.label}</span>
                  <strong>{getDrillValue(row, drill.area)}</strong>
                  <small>{Number(row.count || 0).toLocaleString()} record(s)</small>
                  <em className="md-card-hint">Open Level 3 <Icon name="chevron" /></em>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderEvidenceView() {
    const rows = (drill.rows || []) as EvidenceRow[];

    return (
      <section className="md-view-panel" aria-label="Evidence detail view">
        <div className="md-view-header">
          <div>
            <span className="md-view-eyebrow">Level 3 - Evidence Detail</span>
            <h2>{drill.title || "Evidence View"}</h2>
            <p>{Number(drill.total || rows.length || 0).toLocaleString()} record(s) found for this selection.</p>
          </div>
          <div className="md-view-actions">
            <button type="button" className="primary" onClick={backDrilldown}>{drill.parent ? "Back to Breakdown" : "Back to Overview"}</button>
            <button type="button" onClick={closeDrilldown}>Close</button>
          </div>
        </div>

        <div className="md-view-body">
          {drill.loading ? (
            <div className="md-state-panel">Loading evidence...</div>
          ) : (
            <div className="md-table-wrap md-evidence-wrap">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Department</th>
                    <th>Category</th>
                    <th>Brand / Model</th>
                    <th>Status</th>
                    <th>Age</th>
                    <th>Risk</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No evidence record found for this selection.</td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.assetKey || `${row.objectAgent}-${row.assetId}-${row.deviceName}`}>
                        <td>{readText(row.deviceName)}</td>
                        <td>{readText(row.department)}</td>
                        <td>{readText(row.category)}</td>
                        <td>{readText(`${readText(row.brand, "")} ${readText(row.model, "")}`.trim())}</td>
                        <td>{readText(row.status)}</td>
                        <td>{readText(row.age)}</td>
                        <td>{readText(row.riskSeverity)} ({readText(row.riskScore, "0")})</td>
                        <td>{readText(row.replacementCost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="management-center-page">
      <style>{MANAGEMENT_DASHBOARD_INLINE_CSS}</style>
      <main className="management-module-root">
        <div className="md-content">
          <header className="md-header">
            <div>
              <h1>Management Dashboard</h1>
              <p>Executive Intelligence Cockpit</p>
              {dashboard.generatedAt && <span className="md-generated">Updated {new Date(dashboard.generatedAt).toLocaleString()}</span>}
            </div>

            <div className="md-toolbar">
              <button type="button"><Icon name="calendar" /> Current View</button>
              <button type="button" onClick={refreshDashboard}><Icon name="filter" /> Refresh Insight</button>
              <button type="button" className="download" onClick={printDashboard}><Icon name="download" /> Download Report</button>
            </div>
          </header>

          {loading && <div className="md-state-panel">Loading management insight...</div>}
          {!loading && error && <div className="md-state-panel md-state-error">{error}</div>}
          {!loading && !error && !hasDashboardData && <div className="md-state-panel">No management insight is available for the selected view.</div>}

          {!loading && !error && hasDashboardData && (
            drill.level === 2
              ? renderBreakdownView()
              : drill.level === 3
                ? renderEvidenceView()
                : renderOverview()
          )}
        </div>
      </main>
    </div>
  );
}
