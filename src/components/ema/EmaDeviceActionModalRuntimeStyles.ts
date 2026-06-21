const STYLE_ID = "ema-device-action-modal-runtime-styles";

const css = `
.ema-modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483300 !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(15, 23, 42, .58) !important;
  backdrop-filter: blur(4px) !important;
  padding: 1.25rem !important;
}

.ema-modal {
  width: min(42rem, calc(100vw - 2.5rem)) !important;
  max-height: min(46rem, calc(100vh - 2.5rem)) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border: 1px solid #dbeafe !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  box-shadow: 0 30px 80px rgba(15, 23, 42, .42) !important;
}

.ema-modal.ema-modal-geo,
.ema-modal.ema-modal-geo-v2 {
  width: min(78rem, calc(100vw - 2.5rem)) !important;
}

.ema-modal-header {
  flex: 0 0 auto !important;
  min-height: 4.6rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  padding: 1rem 1.15rem !important;
  color: #ffffff !important;
}

.ema-modal-header.blue,
.ema-modal-header.green {
  background: linear-gradient(135deg, #172554 0%, #2563eb 100%) !important;
}

.ema-modal-header.red {
  background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%) !important;
}

.ema-modal-title {
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: .75rem !important;
}

.ema-modal-title > svg,
.ema-modal-title > i {
  width: 2.15rem !important;
  height: 2.15rem !important;
  flex: 0 0 2.15rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .75rem !important;
  background: rgba(255, 255, 255, .13) !important;
  color: #ffffff !important;
  padding: .45rem !important;
}

.ema-modal-title > div {
  min-width: 0 !important;
  display: grid !important;
  gap: .18rem !important;
}

.ema-modal-title strong {
  display: block !important;
  margin: 0 !important;
  color: #ffffff !important;
  font-size: .86rem !important;
  font-weight: 950 !important;
  letter-spacing: .08em !important;
  line-height: 1.1 !important;
  text-transform: uppercase !important;
}

.ema-modal-title span {
  display: block !important;
  max-width: 100% !important;
  overflow: hidden !important;
  color: rgba(255, 255, 255, .9) !important;
  font-size: .78rem !important;
  font-weight: 850 !important;
  line-height: 1.2 !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ema-modal-close {
  width: 2.3rem !important;
  height: 2.3rem !important;
  flex: 0 0 2.3rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: .75rem !important;
  background: rgba(255, 255, 255, .16) !important;
  color: #ffffff !important;
  padding: 0 !important;
}

.ema-modal-close:hover {
  background: rgba(255, 255, 255, .24) !important;
}

.ema-modal-body {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  display: grid !important;
  gap: 1rem !important;
  overflow: auto !important;
  padding: 1.1rem !important;
  background: #ffffff !important;
}

.ema-modal-footer {
  flex: 0 0 auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: .65rem !important;
  border-top: 1px solid #dbe7f5 !important;
  background: #f8fafc !important;
  padding: .9rem 1.1rem !important;
}

.ema-modal-footer.embedded {
  border-top: 0 !important;
  background: transparent !important;
  padding: .25rem 0 0 !important;
}

.ema-btn {
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: .45rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .75rem !important;
  padding: 0 .95rem !important;
  font-size: .82rem !important;
  font-weight: 950 !important;
  line-height: 1 !important;
  text-decoration: none !important;
  box-shadow: 0 6px 14px rgba(15, 23, 42, .04) !important;
}

.ema-btn.link {
  background: #ffffff !important;
  color: #2563eb !important;
}

.ema-btn.primary {
  border-color: #2563eb !important;
  background: #2563eb !important;
  color: #ffffff !important;
}

.ema-btn.danger {
  border-color: #dc2626 !important;
  background: #dc2626 !important;
  color: #ffffff !important;
}

.ema-btn:disabled {
  cursor: not-allowed !important;
  opacity: .55 !important;
}

.ema-device-target-card,
.ema-preview-card,
.ema-info-banner {
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: .8rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #f8fafc !important;
  padding: .85rem !important;
}

.ema-device-target-card > svg,
.ema-info-banner > svg,
.ema-preview-card > svg {
  width: 2.1rem !important;
  height: 2.1rem !important;
  flex: 0 0 2.1rem !important;
  display: inline-grid !important;
  place-items: center !important;
  border-radius: .7rem !important;
  background: #eff6ff !important;
  color: #2563eb !important;
  padding: .45rem !important;
}

.ema-device-target-card > div,
.ema-info-banner > div,
.ema-preview-card > div {
  min-width: 0 !important;
  display: grid !important;
  gap: .16rem !important;
}

.ema-device-target-card strong,
.ema-info-banner strong,
.ema-preview-card strong {
  display: block !important;
  margin: 0 !important;
  color: #0f172a !important;
  font-size: .96rem !important;
  font-weight: 950 !important;
  line-height: 1.2 !important;
  overflow-wrap: anywhere !important;
}

.ema-device-target-card span,
.ema-info-banner span,
.ema-preview-card span,
.ema-preview-card > span {
  display: block !important;
  margin: 0 !important;
  color: #64748b !important;
  font-size: .78rem !important;
  font-weight: 750 !important;
  line-height: 1.25 !important;
  overflow-wrap: anywhere !important;
}

.ema-info-banner.yellow {
  border-color: #fde68a !important;
  background: #fffbeb !important;
}

.ema-info-banner.yellow > svg {
  background: #fef3c7 !important;
  color: #b45309 !important;
}

.ema-info-banner.red {
  border-color: #fecaca !important;
  background: #fff1f2 !important;
}

.ema-info-banner.red > svg {
  background: #fee2e2 !important;
  color: #dc2626 !important;
}

.ema-info-banner.blue {
  border-color: #bfdbfe !important;
  background: #eff6ff !important;
}

.ema-check,
.ema-option-card {
  min-width: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: .65rem !important;
  color: #0f172a !important;
  font-size: .86rem !important;
  font-weight: 850 !important;
  line-height: 1.25 !important;
}

.ema-check input,
.ema-option-card input {
  width: 1rem !important;
  height: 1rem !important;
  flex: 0 0 1rem !important;
  margin: 0 !important;
  accent-color: #2563eb !important;
}

.ema-check span {
  display: inline-block !important;
  margin: 0 !important;
}

.ema-option-card {
  align-items: flex-start !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  padding: .85rem !important;
}

.ema-option-card > div {
  display: grid !important;
  gap: .15rem !important;
}

.ema-option-card strong {
  color: #0f172a !important;
  font-size: .86rem !important;
  font-weight: 950 !important;
  line-height: 1.2 !important;
}

.ema-option-card span {
  color: #64748b !important;
  font-size: .76rem !important;
  font-weight: 750 !important;
  line-height: 1.25 !important;
}

.ema-form-group {
  min-width: 0 !important;
  display: grid !important;
  gap: .45rem !important;
}

.ema-form-group label,
.ema-modal-section-title {
  color: #334155 !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  letter-spacing: .06em !important;
  line-height: 1.1 !important;
  text-transform: uppercase !important;
}

.ema-form-group input,
.ema-form-group textarea,
.ema-form-group select {
  width: 100% !important;
  min-width: 0 !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: .8rem .9rem !important;
  font-size: .9rem !important;
  font-weight: 650 !important;
  line-height: 1.35 !important;
  outline: 0 !important;
  box-shadow: 0 5px 12px rgba(15, 23, 42, .03) !important;
}

.ema-form-group textarea {
  min-height: 7.5rem !important;
  resize: vertical !important;
}

.ema-form-group input:focus,
.ema-form-group textarea:focus,
.ema-form-group select:focus {
  border-color: #93c5fd !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .08) !important;
}

.ema-form-error {
  border: 1px solid #fecaca !important;
  border-radius: .75rem !important;
  background: #fff1f2 !important;
  color: #be123c !important;
  padding: .65rem .75rem !important;
  font-size: .8rem !important;
  font-weight: 850 !important;
}

.ema-session-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: .75rem !important;
}

.ema-session-grid button {
  min-height: 4.5rem !important;
  display: grid !important;
  place-items: center !important;
  gap: .35rem !important;
  border: 1px solid #dbe7f5 !important;
  border-radius: .9rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: .84rem !important;
  font-weight: 950 !important;
}

.ema-session-grid button.is-active {
  border-color: #60a5fa !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  box-shadow: inset 3px 0 0 #2563eb !important;
}

.ema-geo-redesign-body {
  grid-template-columns: minmax(0, 1.35fr) minmax(20rem, .75fr) !important;
  align-items: stretch !important;
}

.ema-geo-redesign-left,
.ema-geo-history-modern {
  min-width: 0 !important;
  display: grid !important;
  gap: 1rem !important;
  align-content: start !important;
}

.ema-geo-current-card,
.ema-geo-map-shell,
.ema-geo-history-modern {
  border: 1px solid #dbe7f5 !important;
  border-radius: 1rem !important;
  background: #ffffff !important;
  overflow: hidden !important;
  box-shadow: 0 10px 22px rgba(15, 23, 42, .04) !important;
}

.ema-geo-current-card {
  padding: 1rem !important;
}

.ema-geo-current-head {
  display: grid !important;
  grid-template-columns: 2.4rem minmax(0, 1fr) auto !important;
  gap: .8rem !important;
  align-items: center !important;
}

.ema-geo-current-icon {
  width: 2.4rem !important;
  height: 2.4rem !important;
  display: grid !important;
  place-items: center !important;
  border-radius: .8rem !important;
  background: #ecfdf5 !important;
  color: #059669 !important;
}

.ema-geo-current-head span,
.ema-geo-map-shell-head span,
.ema-geo-history-modern-head span,
.ema-geo-current-grid small {
  color: #64748b !important;
  font-size: .7rem !important;
  font-weight: 950 !important;
  letter-spacing: .06em !important;
  text-transform: uppercase !important;
}

.ema-geo-current-head strong,
.ema-geo-map-shell-head strong,
.ema-geo-history-modern-head strong,
.ema-geo-current-grid strong {
  display: block !important;
  color: #0f172a !important;
  font-size: .95rem !important;
  font-weight: 950 !important;
  line-height: 1.2 !important;
  overflow-wrap: anywhere !important;
}

.ema-geo-current-head p {
  margin: .15rem 0 0 !important;
  color: #64748b !important;
  font-size: .78rem !important;
  font-weight: 750 !important;
}

.ema-geo-current-state {
  display: inline-flex !important;
  align-items: center !important;
  gap: .35rem !important;
  border-radius: 999px !important;
  background: #f1f5f9 !important;
  color: #475569 !important;
  padding: .38rem .65rem !important;
  font-size: .72rem !important;
  font-weight: 950 !important;
  white-space: nowrap !important;
}

.ema-geo-current-state span {
  width: .45rem !important;
  height: .45rem !important;
  border-radius: 999px !important;
  background: currentColor !important;
}

.ema-geo-current-state.is-success {
  background: #dcfce7 !important;
  color: #15803d !important;
}

.ema-geo-current-state.is-loading {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
}

.ema-geo-current-grid {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: .65rem !important;
  margin-top: 1rem !important;
}

.ema-geo-current-grid > div {
  border: 1px solid #e2e8f0 !important;
  border-radius: .8rem !important;
  background: #f8fafc !important;
  padding: .75rem !important;
}

.ema-geo-current-grid > div.is-wide {
  grid-column: 1 / -1 !important;
}

.ema-geo-map-shell-head,
.ema-geo-history-modern-head {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .75rem !important;
  border-bottom: 1px solid #dbe7f5 !important;
  padding: .9rem !important;
}

.ema-geo-map-frame {
  min-height: 19rem !important;
  position: relative !important;
  overflow: hidden !important;
  background: #f8fafc !important;
}

.ema-geo-map-frame iframe {
  width: 100% !important;
  height: 100% !important;
  min-height: 19rem !important;
  border: 0 !important;
}

.ema-geo-empty,
.ema-geo-history-empty-modern {
  min-height: 14rem !important;
  display: grid !important;
  place-items: center !important;
  align-content: center !important;
  gap: .35rem !important;
  color: #64748b !important;
  text-align: center !important;
}

.ema-geo-history-modern {
  max-height: 100% !important;
}

.ema-geo-history-list-modern {
  display: grid !important;
  gap: .65rem !important;
  padding: .9rem !important;
  overflow: auto !important;
}

.ema-geo-history-item-modern {
  display: grid !important;
  grid-template-columns: 2rem minmax(0, 1fr) !important;
  gap: .65rem !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: .85rem !important;
  background: #f8fafc !important;
  padding: .75rem !important;
}

.ema-geo-history-index-modern {
  width: 2rem !important;
  height: 2rem !important;
  display: grid !important;
  place-items: center !important;
  border-radius: .65rem !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  font-weight: 950 !important;
}

.ema-geo-history-content-modern {
  min-width: 0 !important;
  display: grid !important;
  gap: .35rem !important;
}

.ema-geo-history-date-modern,
.ema-geo-history-meta-modern,
.ema-geo-footer {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .65rem !important;
}

.ema-geo-history-content-modern p {
  margin: 0 !important;
  color: #334155 !important;
  font-size: .78rem !important;
  font-weight: 750 !important;
  line-height: 1.25 !important;
  overflow-wrap: anywhere !important;
}

.ema-geo-history-meta-modern span {
  border-radius: .55rem !important;
  background: #ffffff !important;
  color: #475569 !important;
  padding: .28rem .45rem !important;
  font-size: .7rem !important;
  font-weight: 850 !important;
}

@media (max-width: 960px) {
  .ema-geo-redesign-body,
  .ema-geo-current-head,
  .ema-geo-current-grid,
  .ema-session-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .ema-geo-current-state {
    justify-self: start !important;
  }
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
