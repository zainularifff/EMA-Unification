import React, { useEffect, useMemo, useState } from "react";

const MANAGEMENT_DASHBOARD_INLINE_CSS = `
:root {
  --font-main: "Inter", "Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --navy-950: #06142f;
  --navy-900: #0a1f44;
  --navy-800: #0e2b5c;
  --blue-700: #155eef;
  --blue-600: #2563eb;
  --blue-500: #3b82f6;
  --green-700: #047857;
  --green-600: #059669;
  --red-600: #dc2626;
  --red-500: #ef4444;
  --amber-600: #d97706;
  --amber-500: #f59e0b;
  --purple-600: #7c3aed;
  --slate-950: #08132b;
  --slate-800: #1e293b;
  --slate-700: #334155;
  --slate-600: #475569;
  --slate-500: #64748b;
  --slate-400: #94a3b8;
  --slate-300: #cbd5e1;
  --slate-200: #e2e8f0;
  --slate-100: #f1f5f9;
  --slate-50: #f8fafc;
  --white: #ffffff;
  --page: #f4f7fb;
  --border: 1px solid rgba(148, 163, 184, 0.28);
  --shadow-card: 0 16px 40px rgba(15, 23, 42, 0.08);
  --shadow-soft: 0 10px 26px rgba(15, 23, 42, 0.06);
  --radius-xl: 24px;
  --radius-lg: 18px;
  --radius-md: 14px;
  --radius-sm: 10px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--slate-950);
  background: var(--page);
  font-family: var(--font-main);
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

button,
table {
  font: inherit;
}

button {
  cursor: pointer;
}

.md-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
}

.md-shell {
  display: grid;
  grid-template-columns: 272px minmax(0, 1fr);
  min-height: 100vh;
  background:
    radial-gradient(circle at 70% -10%, rgba(37, 99, 235, 0.12), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #f3f7fc 48%, #eef4fb 100%);
}

.md-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  color: #dbeafe;
  background:
    radial-gradient(circle at 85% 0%, rgba(37, 99, 235, 0.32), transparent 34%),
    linear-gradient(180deg, #071a3b 0%, #06142f 58%, #030b1a 100%);
  box-shadow: 24px 0 48px rgba(2, 8, 23, 0.26);
}

.md-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 8px 22px;
}

.md-brand-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  color: #60a5fa;
  border: 1px solid rgba(191, 219, 254, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.md-brand strong {
  display: block;
  color: #fff;
  font-size: 30px;
  font-weight: 850;
  line-height: 1;
  letter-spacing: -0.05em;
}

.md-brand span {
  display: block;
  margin-top: 5px;
  color: rgba(219, 234, 254, 0.74);
  font-size: 12px;
  font-weight: 700;
}

.md-nav {
  flex: 1;
  overflow: auto;
  padding-right: 4px;
}

.md-nav-section {
  margin-bottom: 20px;
}

.md-nav-section p {
  margin: 0 0 9px;
  padding: 0 8px;
  color: rgba(219, 234, 254, 0.58);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.md-nav button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  margin: 0 0 4px;
  padding: 0 12px;
  color: rgba(226, 232, 240, 0.82);
  background: transparent;
  border: 0;
  border-radius: 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.md-nav button:hover,
.md-nav button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--blue-600), #0ea5e9);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.34);
  transform: translateX(2px);
}

.md-user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(191, 219, 254, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: #0f172a;
  font-weight: 900;
  border-radius: 50%;
  background: linear-gradient(135deg, #fff, #bfdbfe);
}

.md-user-card strong,
.md-user-card span,
.md-user-card small {
  display: block;
}

.md-user-card strong {
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.md-user-card span {
  margin-top: 2px;
  color: rgba(219, 234, 254, 0.7);
  font-size: 11px;
}

.md-user-card small {
  margin-top: 7px;
  color: #86efac;
  font-size: 11px;
  font-weight: 800;
}

.md-user-card i,
.live-dot::before {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 999px;
  background: #22c55e;
  content: "";
}

.md-main {
  min-width: 0;
  padding: 24px;
}

.md-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.md-header h1 {
  margin: 0;
  color: var(--slate-950);
  font-size: clamp(30px, 2.4vw, 42px);
  font-weight: 850;
  line-height: 1.04;
  letter-spacing: -0.05em;
}

.md-header p {
  margin: 7px 0 0;
  color: #1f335c;
  font-size: 17px;
  font-weight: 600;
}

.md-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.md-toolbar button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: var(--slate-950);
  border: var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  font-size: 13px;
  font-weight: 800;
}

.md-toolbar .download {
  padding-inline: 20px;
}

.md-toolbar .icon-button {
  width: 44px;
  padding: 0;
  justify-content: center;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  overflow: hidden;
  margin-bottom: 22px;
  border: var(--border);
  border-radius: var(--radius-xl);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--shadow-card);
}

.kpi-card {
  position: relative;
  min-height: 124px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-right: var(--border);
}

.kpi-card:last-child {
  border-right: 0;
}

.kpi-card h2 {
  margin: 0 0 12px;
  color: var(--slate-950);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.kpi-value {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.kpi-value strong {
  color: var(--slate-950);
  font-size: 30px;
  font-weight: 850;
  line-height: 1;
  letter-spacing: -0.04em;
}

.kpi-card.tone-green .kpi-value strong,
.text-green {
  color: var(--green-700);
}

.kpi-card.tone-blue .kpi-value strong,
.text-blue {
  color: var(--blue-700);
}

.kpi-card.tone-red .kpi-value strong,
.text-red {
  color: var(--red-600);
}

.kpi-card.tone-amber .kpi-value strong,
.text-amber {
  color: var(--amber-600);
}

.text-purple {
  color: var(--purple-600);
}

.text-navy {
  color: var(--slate-950);
}

.kpi-value span {
  color: var(--slate-700);
  font-size: 16px;
  font-weight: 800;
}

.kpi-card .kpi-trend,
.kpi-card > div > p {
  margin: 12px 0 0;
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 750;
}

.kpi-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.tone-green .kpi-icon,
.status-badge.tone-green,
.pillar-number.tone-green {
  color: var(--green-700);
  background: #dff7ec;
}

.tone-blue .kpi-icon,
.status-badge.tone-blue,
.pillar-number.tone-blue {
  color: var(--blue-700);
  background: #e5efff;
}

.tone-red .kpi-icon,
.status-badge.tone-red,
.pillar-number.tone-red {
  color: var(--red-600);
  background: #ffe8e8;
}

.tone-amber .kpi-icon,
.status-badge.tone-amber,
.pillar-number.tone-amber {
  color: var(--amber-600);
  background: #fff3d7;
}

.tone-purple .kpi-icon,
.status-badge.tone-purple,
.pillar-number.tone-purple {
  color: var(--purple-600);
  background: #ede9fe;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.pillar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.pillar-card {
  min-height: 370px;
  display: flex;
  flex-direction: column;
  padding: 22px 22px 18px;
  border: var(--border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-soft);
}

.pillar-card header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: var(--border);
}

.pillar-number {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 950;
}

.pillar-card h2 {
  margin: 0;
  color: #071a3b;
  font-size: 19px;
  font-weight: 850;
  letter-spacing: -0.025em;
}

.pillar-summary {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 20px;
  padding: 24px 0 22px;
}

.pillar-summary > div + div {
  padding-left: 20px;
  border-left: var(--border);
}

.pillar-card h3 {
  margin: 0 0 12px;
  color: #0b1e44;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pillar-score {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 10px;
}

.pillar-score strong,
.pillar-metric {
  color: var(--slate-950);
  font-size: 34px;
  font-weight: 850;
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.pillar-card.tone-red .pillar-score strong,
.pillar-card.tone-red .pillar-metric {
  color: var(--red-600);
}

.pillar-card.tone-blue .pillar-score strong,
.pillar-card.tone-blue .pillar-metric {
  color: var(--blue-700);
}

.pillar-card.tone-purple .pillar-score strong,
.pillar-card.tone-purple .pillar-metric {
  color: var(--purple-600);
}

.pillar-card.tone-green .pillar-score strong,
.pillar-card.tone-green .pillar-metric {
  color: var(--green-700);
}

.pillar-score span {
  color: var(--slate-700);
  font-size: 16px;
  font-weight: 800;
}

.pillar-summary p {
  margin: 12px 0 0;
  color: var(--slate-600);
  font-size: 13px;
  line-height: 1.45;
  font-weight: 650;
}

.pillar-details {
  padding-top: 18px;
  border-top: var(--border);
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  color: var(--slate-700);
  font-size: 13px;
  font-weight: 700;
}

.detail-row span {
  position: relative;
  padding-left: 20px;
}

.detail-row span::before {
  position: absolute;
  left: 0;
  top: 50%;
  width: 8px;
  height: 8px;
  border: 2px solid #9db1cf;
  border-radius: 999px;
  transform: translateY(-50%);
  content: "";
}

.detail-row strong {
  font-weight: 900;
  white-space: nowrap;
}

.link-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  margin-top: auto;
  padding: 14px 0 0;
  color: var(--blue-700);
  border: 0;
  background: transparent;
  font-size: 14px;
  font-weight: 900;
}

.link-button .md-icon {
  width: 16px;
  height: 16px;
}

.lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(520px, 0.95fr);
  gap: 18px;
  margin-bottom: 18px;
}

.panel {
  border: var(--border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.panel-header {
  padding: 18px 20px 10px;
}

.panel-header h2 {
  margin: 0;
  color: #071a3b;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.panel-header p {
  margin: 5px 0 0;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
}

.finance-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.9fr 1fr;
  gap: 0;
  border-top: var(--border);
}

.finance-card {
  min-height: 250px;
  padding: 20px;
  border-right: var(--border);
}

.finance-card:last-child {
  border-right: 0;
}

.chart-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.chart-heading h3 {
  margin: 0;
  color: #0b1e44;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.chart-heading span {
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 150px;
  padding: 12px 4px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
}

.bar-month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 800;
}

.bar-stack {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 118px;
}

.bar {
  position: relative;
  display: block;
  width: 15px;
  min-height: 16px;
  border-radius: 7px 7px 2px 2px;
}

.bar.capex {
  background: linear-gradient(180deg, #60a5fa, #2563eb);
}

.bar.opex {
  background: linear-gradient(180deg, #34d399, #059669);
}

.bar em {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4px);
  transform: translateX(-50%);
  color: var(--slate-600);
  font-size: 9px;
  font-style: normal;
  font-weight: 850;
}

.legend-row,
.donut-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 16px;
  color: var(--slate-700);
  font-size: 12px;
  font-weight: 800;
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  margin-right: 7px;
  border-radius: 999px;
}

.dot.blue {
  background: var(--blue-600);
}

.dot.green {
  background: var(--green-600);
}

.donut-wrap {
  display: flex;
  align-items: center;
  gap: 22px;
}

.donut-chart {
  position: relative;
  display: grid;
  place-items: center;
  width: 142px;
  height: 142px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: conic-gradient(var(--blue-600) 0 62%, var(--green-600) 62% 100%);
}

.donut-chart::after {
  position: absolute;
  inset: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.16);
  content: "";
}

.donut-chart div {
  position: relative;
  z-index: 1;
  text-align: center;
}

.donut-chart strong,
.donut-chart span {
  display: block;
}

.donut-chart strong {
  color: var(--slate-950);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.donut-chart span {
  margin-top: 2px;
  color: var(--slate-500);
  font-size: 10px;
  font-weight: 800;
}

.donut-legend {
  display: grid;
  gap: 14px;
  margin: 0;
}

.donut-legend div {
  color: var(--slate-600);
  font-size: 12px;
  font-weight: 800;
}

.donut-legend strong {
  display: block;
  margin-top: 5px;
  color: var(--slate-950);
  font-size: 16px;
  font-weight: 900;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-metrics div {
  min-height: 70px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  background: linear-gradient(180deg, #fff, #f8fbff);
}

.summary-metrics span,
.summary-metrics strong {
  display: block;
}

.summary-metrics span {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.summary-metrics strong {
  margin-top: 7px;
  color: var(--slate-950);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.action-panel {
  min-width: 0;
}

.action-table-wrap {
  overflow-x: auto;
  border-top: var(--border);
}

.action-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 740px;
}

.action-table th,
.action-table td {
  padding: 13px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  color: var(--slate-800);
  font-size: 12px;
  font-weight: 750;
  text-align: left;
  vertical-align: top;
}

.action-table th {
  color: #0b1e44;
  background: #f8fbff;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.priority {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 950;
}

.priority-high {
  color: var(--red-600);
  background: #ffe8e8;
}

.priority-medium {
  color: var(--amber-600);
  background: #fff3d7;
}

.priority-low {
  color: var(--blue-700);
  background: #e5efff;
}

.data-sources {
  padding: 17px 20px;
  border: var(--border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--shadow-soft);
}

.data-sources strong {
  display: block;
  margin-bottom: 14px;
  color: #071a3b;
  font-size: 13px;
  font-weight: 950;
  text-transform: uppercase;
}

.data-sources strong span {
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 800;
  text-transform: none;
}

.data-sources div {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
}

.data-sources div > span {
  min-height: 58px;
  display: grid;
  align-content: center;
  gap: 4px;
  padding: 10px;
  color: #0b1e44;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: linear-gradient(180deg, #fff, #f8fbff);
  font-size: 11px;
  font-weight: 850;
}

.data-sources small {
  display: block;
  color: var(--slate-500);
  font-size: 10px;
  font-weight: 750;
}

.md-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 16px 0 0;
  color: #24456f;
  font-size: 12px;
  font-weight: 750;
}

@media (max-width: 1480px) {
  .kpi-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .kpi-card:nth-child(3) {
    border-right: 0;
  }

  .kpi-card:nth-child(n + 4) {
    border-top: var(--border);
  }

  .pillar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lower-grid {
    grid-template-columns: 1fr;
  }

  .data-sources div {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1120px) {
  .md-shell {
    grid-template-columns: 1fr;
  }

  .md-sidebar {
    position: static;
    height: auto;
  }

  .md-header {
    flex-direction: column;
  }

  .finance-grid {
    grid-template-columns: 1fr;
  }

  .finance-card {
    border-right: 0;
    border-bottom: var(--border);
  }

  .finance-card:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 760px) {
  .md-main {
    padding: 16px;
  }

  .kpi-strip,
  .pillar-grid {
    grid-template-columns: 1fr;
  }

  .kpi-card {
    border-right: 0;
    border-top: var(--border);
  }

  .kpi-card:first-child {
    border-top: 0;
  }

  .pillar-summary,
  .summary-metrics,
  .data-sources div {
    grid-template-columns: 1fr;
  }

  .pillar-summary > div + div {
    padding-left: 0;
    padding-top: 18px;
    border-left: 0;
    border-top: var(--border);
  }

  .donut-wrap {
    align-items: flex-start;
    flex-direction: column;
  }
}

/* ------------------------------------------------------------
   Global layout integration
   Uses src/components/Sidebar, src/components/TopNavbar and src/components/Footer.
   The old dashboard-specific sidebar is no longer rendered.
------------------------------------------------------------ */
.md-shell {
  grid-template-columns: 272px minmax(0, 1fr);
}

.md-shell.md-shell-collapsed {
  grid-template-columns: 88px minmax(0, 1fr);
}

.md-main {
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.md-content {
  flex: 1;
  min-width: 0;
  padding: 24px;
}

.md-main > .app-footer {
  margin-top: auto;
}

@media (max-width: 1180px) {
  .md-shell,
  .md-shell.md-shell-collapsed {
    grid-template-columns: 88px minmax(0, 1fr);
  }

  .md-content {
    padding: 18px;
  }
}

@media (max-width: 780px) {
  .md-shell,
  .md-shell.md-shell-collapsed {
    grid-template-columns: 1fr;
  }

  .md-shell > .ema-sidebar {
    display: none;
  }

  .md-content {
    padding: 14px;
  }
}


/* ------------------------------------------------------------
   Report.tsx style integration
   This page should be rendered inside the existing global app layout.
   Do not render Sidebar / TopNavbar / Footer inside this component.
------------------------------------------------------------ */
.management-center-page {
  min-height: 100vh;
  color: var(--slate-950);
  background:
    radial-gradient(circle at 70% -10%, rgba(37, 99, 235, 0.12), transparent 28%),
    linear-gradient(135deg, #f8fbff 0%, #f3f7fc 48%, #eef4fb 100%);
}

.management-module-root {
  width: 100%;
  min-width: 0;
  padding: 24px;
}

.management-center-page .md-content {
  width: 100%;
  max-width: 1840px;
  min-width: 0;
  margin: 0 auto;
  padding: 0;
}

@media (max-width: 1180px) {
  .management-module-root {
    padding: 18px;
  }
}

@media (max-width: 780px) {
  .management-module-root {
    padding: 14px;
  }
}

/* Append to ManagementDashboard.css */

.md-generated {
  display: inline-flex;
  margin-top: 8px;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 750;
}

.md-state-panel {
  margin-bottom: 18px;
  padding: 16px 18px;
  color: var(--slate-700);
  border: var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-soft);
  font-size: 13px;
  font-weight: 800;
}

.md-state-error {
  color: var(--red-600);
  background: #fff7f7;
}

.kpi-clickable,
.pillar-clickable,
.detail-row-clickable,
.bar-button {
  appearance: none;
  border: 0;
  text-align: left;
  background: transparent;
}

.kpi-clickable {
  width: 100%;
}

.kpi-clickable:hover,
.pillar-clickable:hover,
.detail-row-clickable:hover,
.md-drill-card:hover,
.bar-button:hover {
  filter: brightness(0.985);
}

.pillar-clickable {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 20px;
  padding: 24px 0 22px;
  color: inherit;
}

.detail-row-clickable {
  width: 100%;
  padding-inline: 0;
}

.md-drill-panel {
  margin-bottom: 18px;
  border: var(--border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.md-drill-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: var(--border);
  background: linear-gradient(180deg, #fff, #f8fbff);
}

.md-drill-header span {
  display: block;
  margin-bottom: 4px;
  color: var(--blue-700);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.md-drill-header h2 {
  margin: 0;
  color: #071a3b;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.md-drill-header p {
  margin: 6px 0 0;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 800;
}

.md-drill-header button {
  min-height: 38px;
  padding: 0 14px;
  color: var(--slate-800);
  border: var(--border);
  border-radius: 11px;
  background: #fff;
  font-size: 12px;
  font-weight: 900;
}

.md-drill-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

.md-drill-card {
  min-height: 112px;
  padding: 16px;
  color: var(--slate-800);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 16px;
  background: linear-gradient(180deg, #fff, #f8fbff);
  text-align: left;
}

.md-drill-card span,
.md-drill-card strong,
.md-drill-card small {
  display: block;
}

.md-drill-card span {
  color: #0b1e44;
  font-size: 13px;
  font-weight: 900;
}

.md-drill-card strong {
  margin-top: 12px;
  color: var(--slate-950);
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.md-drill-card small {
  margin-top: 6px;
  color: var(--slate-500);
  font-size: 11px;
  font-weight: 800;
}

.bar-button {
  color: inherit;
}

.action-table tbody tr {
  cursor: pointer;
}

@media (max-width: 1180px) {
  .md-drill-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .pillar-clickable,
  .md-drill-grid {
    grid-template-columns: 1fr;
  }
}

/* ------------------------------------------------------------
   Management Dashboard merged interactive states
------------------------------------------------------------ */
.kpi-clickable:focus-visible,
.pillar-clickable:focus-visible,
.detail-row-clickable:focus-visible,
.md-drill-card:focus-visible,
.bar-button:focus-visible,
.md-toolbar button:focus-visible,
.md-drill-header button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.25);
  outline-offset: 3px;
}

.md-donut-dynamic {
  background: conic-gradient(var(--blue-600) 0 var(--md-tangible, 62%), var(--green-600) var(--md-tangible, 62%) 100%);
}

.md-chart-empty {
  width: 100%;
  align-self: center;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.md-evidence-wrap {
  border-top: 0;
}

.md-evidence-table td:first-child {
  color: #0b1e44;
  font-weight: 900;
}

@media print {
  .md-toolbar,
  .md-drill-header button {
    display: none !important;
  }

  .management-center-page {
    background: #fff !important;
  }

  .panel,
  .pillar-card,
  .kpi-strip,
  .md-drill-panel {
    box-shadow: none !important;
  }
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
  "dashboard",
  "shield",
  "wallet",
  "risk",
  "audit",
  "saving",
  "users",
  "alert",
  "calendar",
  "download",
  "filter",
  "endpoint",
  "service",
  "software",
  "remote",
  "job",
  "pin",
  "asset",
  "network",
  "settings",
  "chevron",
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
        ? `${featureName} endpoint is returning the frontend HTML page. Check that the backend route exists and Vite proxy / API base URL points to the Express server.`
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

  if (area === "capex-category" || area === "capex-department") {
    area = "capex";
  }

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


function StatusBadge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}

function CostMix({ finance }: { finance: FinanceData }) {
  const total = Math.max(Number(finance.totalCost || 0), 1);
  const tangiblePct = Math.round((Number(finance.tangibleCost || 0) / total) * 100);
  const intangiblePct = Math.max(0, 100 - tangiblePct);

  return (
    <div className="donut-wrap" aria-label="Tangible and intangible cost composition">
      <div
        className="donut-chart md-donut-dynamic"
        style={{ "--md-tangible": `${tangiblePct}%` } as React.CSSProperties}
      >
        <div>
          <strong>{formatMoney(finance.totalCost)}</strong>
          <span>Total Cost</span>
        </div>
      </div>
      <div className="donut-legend">
        <div><i className="dot blue" /> Tangible Cost <strong>{formatMoney(finance.tangibleCost)} ({tangiblePct}%)</strong></div>
        <div><i className="dot green" /> Intangible Cost <strong>{formatMoney(finance.intangibleCost)} ({intangiblePct}%)</strong></div>
      </div>
    </div>
  );
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

  const capexMax = useMemo(() => {
    const values = dashboard.finance.capexOpex.flatMap((item) => [Number(item.capex || 0), Number(item.opex || 0)]);
    return Math.max(...values, 1);
  }, [dashboard.finance.capexOpex]);

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
    setDrill({ level: 3, area, key, title, rows: [], total: 0, loading: true });

    fetchDashboardDrilldown(area, key, 3)
      .then((data) => setDrill({ level: 3, area, key, title: data.title || title, rows: data.rows || [], total: data.total || 0 }))
      .catch(() => setDrill({ level: 3, area, key, title, rows: [], total: 0, loading: false }));
  }

  function closeDrilldown() {
    setDrill({ level: 1 });
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
            <>
              <section className="kpi-strip" aria-label="Executive KPI summary">
                {dashboard.executiveKpis.map((kpi) => (
                  <button
                    type="button"
                    className={`kpi-card kpi-clickable tone-${kpi.tone}`}
                    key={kpi.id || kpi.title}
                    onClick={() => openLevel2(kpi.area, kpi.title)}
                  >
                    <div>
                      <h2>{kpi.title}</h2>
                      <div className="kpi-value">
                        <strong>{kpi.value}</strong>
                        {kpi.subValue && <span>{kpi.subValue}</span>}
                        {kpi.note && <StatusBadge tone={kpi.tone}>{kpi.note}</StatusBadge>}
                      </div>
                      {kpi.trend && <p className="kpi-trend">{kpi.trend}</p>}
                    </div>
                    <span className="kpi-icon"><Icon name={normalizeIcon(kpi.icon)} /></span>
                  </button>
                ))}
              </section>

              <section className="pillar-grid" aria-label="Strategic dashboard pillars">
                {dashboard.pillars.map((pillar) => (
                  <article className={`pillar-card tone-${pillar.tone}`} key={pillar.id || pillar.title}>
                    <header>
                      <span className={`pillar-number tone-${pillar.tone}`}>{pillar.index}</span>
                      <h2>{pillar.title}</h2>
                    </header>

                    <button type="button" className="pillar-summary pillar-clickable" onClick={() => openLevel2(pillar.area, pillar.title)}>
                      <div>
                        <h3>{pillar.scoreTitle}</h3>
                        <div className="pillar-score">
                          <strong>{pillar.scoreValue}</strong>
                          {pillar.scoreUnit && <span>{pillar.scoreUnit}</span>}
                        </div>
                        <StatusBadge tone={pillar.statusTone}>{pillar.scoreStatus}</StatusBadge>
                      </div>

                      <div>
                        <h3>{pillar.secondTitle}</h3>
                        <strong className="pillar-metric">{pillar.secondValue}</strong>
                        {pillar.secondNote && <p>{pillar.secondNote}</p>}
                      </div>
                    </button>

                    <div className="pillar-details">
                      <h3>{pillar.detailsTitle}</h3>
                      {pillar.details.map((item) => (
                        <button
                          type="button"
                          className="detail-row detail-row-clickable"
                          key={item.label}
                          onClick={() => openLevel3(pillar.area, item.key || item.label, item.label)}
                        >
                          <span>{item.label}</span>
                          <strong className={item.tone ? `text-${item.tone}` : ""}>{item.value}</strong>
                        </button>
                      ))}
                    </div>

                    <button className="link-button" type="button" onClick={() => openLevel2(pillar.area, pillar.title)}>
                      {pillar.footerText}
                      <Icon name="chevron" />
                    </button>
                  </article>
                ))}
              </section>

              {drill.level > 1 && (
                <section className="md-drill-panel">
                  <div className="md-drill-header">
                    <div>
                      <span>{drill.level === 2 ? "Management Breakdown" : "Evidence View"}</span>
                      <h2>{drill.title}</h2>
                      <p>{Number(drill.total || 0).toLocaleString()} record(s)</p>
                    </div>
                    <button type="button" onClick={closeDrilldown}>Close</button>
                  </div>

                  {drill.loading ? (
                    <div className="md-state-panel">Loading detail...</div>
                  ) : drill.level === 2 ? (
                    <div className="md-drill-grid">
                      {(drill.rows as DrillRow[] || []).map((row) => (
                        <button
                          type="button"
                          key={row.key || row.label}
                          className="md-drill-card"
                          onClick={() => openLevel3(row.level3Area || drill.area || "risk", row.level3Key || row.key, row.label)}
                        >
                          <span>{row.label}</span>
                          <strong>{getDrillValue(row, drill.area)}</strong>
                          <small>{Number(row.count || 0).toLocaleString()} record(s)</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="action-table-wrap md-evidence-wrap">
                      <table className="action-table md-evidence-table">
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
                          {(drill.rows as EvidenceRow[] || []).length === 0 ? (
                            <tr>
                              <td colSpan={8}>No evidence record found for this selection.</td>
                            </tr>
                          ) : (
                            (drill.rows as EvidenceRow[]).map((row) => (
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
                </section>
              )}

              <section className="lower-grid">
                <article className="panel financial-panel">
                  <header className="panel-header">
                    <h2>Financial Overview</h2>
                    <p>CAPEX exposure, risk cost and savings opportunity.</p>
                  </header>

                  <div className="finance-grid">
                    <div className="finance-card capex-card">
                      <div className="chart-heading">
                        <h3>CAPEX Exposure</h3>
                        <span>{formatMoney(dashboard.finance.capexYtd)}</span>
                      </div>

                      <div className="bar-chart" aria-label="CAPEX exposure by category">
                        {dashboard.finance.capexOpex.length === 0 ? (
                          <div className="md-chart-empty">No CAPEX exposure detected.</div>
                        ) : (
                          dashboard.finance.capexOpex.map((item) => (
                            <button
                              type="button"
                              className="bar-month bar-button"
                              key={item.month}
                              onClick={() => openLevel3("capex", item.month, item.month)}
                            >
                              <div className="bar-stack">
                                <span
                                  className="bar capex"
                                  style={{ height: `${Math.max((Number(item.capex || 0) / capexMax) * 118, 16)}px` }}
                                  title={formatMoney(item.capex)}
                                >
                                  <em>{formatMoney(item.capex).replace("RM ", "")}</em>
                                </span>
                              </div>
                              <small>{item.month}</small>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="legend-row">
                        <span><i className="dot blue" /> CAPEX {formatMoney(dashboard.finance.capexYtd)}</span>
                        <span><i className="dot green" /> Opportunity {formatMoney(dashboard.finance.potentialSavings)}</span>
                      </div>
                    </div>

                    <div className="finance-card">
                      <div className="chart-heading">
                        <h3>Tangible vs Intangible Cost</h3>
                        <span>Current Composition</span>
                      </div>
                      <CostMix finance={dashboard.finance} />
                    </div>

                    <div className="finance-card summary-card">
                      <div className="chart-heading">
                        <h3>Cost Decision Summary</h3>
                        <span>Board-level numbers</span>
                      </div>
                      <div className="summary-metrics">
                        <div><span>CAPEX</span><strong>{formatMoney(dashboard.finance.capexYtd)}</strong></div>
                        <div><span>OPEX</span><strong>{formatMoney(dashboard.finance.opexYtd)}</strong></div>
                        <div><span>Total Cost</span><strong>{formatMoney(dashboard.finance.totalCost)}</strong></div>
                        <div><span>Risk Cost</span><strong className="text-red">{formatMoney(dashboard.finance.riskCost)}</strong></div>
                        <div><span>Avg Monthly Cost</span><strong>{formatMoney(dashboard.finance.avgMonthlyCost)}</strong></div>
                        <div><span>Potential Savings</span><strong className="text-green">{formatMoney(dashboard.finance.potentialSavings)}</strong></div>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="panel action-panel">
                  <header className="panel-header">
                    <h2>Board Action Queue</h2>
                    <p>Only items requiring executive decision.</p>
                  </header>

                  <div className="action-table-wrap">
                    <table className="action-table">
                      <thead>
                        <tr>
                          <th>Priority</th>
                          <th>Area</th>
                          <th>Issue</th>
                          <th>Financial Impact</th>
                          <th>Decision Needed</th>
                          <th>Target Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.boardActions.length === 0 ? (
                          <tr>
                            <td colSpan={6}>No executive action is required for this view.</td>
                          </tr>
                        ) : (
                          dashboard.boardActions.map((action) => {
                            const target = parseActionTarget(action);
                            return (
                              <tr key={`${action.area}-${action.key}-${action.issue}`} onClick={() => openLevel3(target.area, target.key, action.issue)}>
                                <td><span className={`priority priority-${action.priority.toLowerCase()}`}>{action.priority}</span></td>
                                <td>{action.area}</td>
                                <td>{action.issue}</td>
                                <td>{action.impact}</td>
                                <td>{action.decision}</td>
                                <td>{action.targetDate}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
