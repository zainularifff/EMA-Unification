const STYLE_ID = "ema-select-runtime-styles";
const SELECT_MARK = "emaSelectUpgraded";

const css = `
.ema-select-native-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
  overflow: hidden !important;
}

.ema-select-upgrade {
  position: relative !important;
  width: 100% !important;
  min-width: 0 !important;
}

.ema-select-trigger {
  width: 100% !important;
  min-height: 2.45rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .65rem !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .8rem !important;
  background: #ffffff !important;
  color: #0f172a !important;
  padding: 0 .85rem !important;
  font-size: .82rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  text-align: left !important;
  box-shadow: 0 6px 14px rgba(15, 23, 42, .035) !important;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease !important;
}

.ema-select-trigger:hover,
.ema-select-trigger[aria-expanded="true"] {
  border-color: #93c5fd !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .08) !important;
}

.ema-select-trigger:disabled {
  cursor: not-allowed !important;
  opacity: .5 !important;
  background: #f8fafc !important;
}

.ema-select-trigger-text {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.ema-select-trigger-caret {
  width: .7rem !important;
  height: .7rem !important;
  flex: 0 0 .7rem !important;
  border-right: 2px solid #475569 !important;
  border-bottom: 2px solid #475569 !important;
  transform: rotate(45deg) translateY(-2px) !important;
}

.ema-select-menu {
  position: fixed !important;
  z-index: 2147483647 !important;
  display: grid !important;
  gap: .25rem !important;
  overflow: auto !important;
  border: 1px solid #d8e4f2 !important;
  border-radius: .85rem !important;
  background: #ffffff !important;
  padding: .35rem !important;
  box-shadow: 0 20px 45px rgba(15, 23, 42, .22) !important;
}

.ema-select-option {
  width: 100% !important;
  min-height: 2.35rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: .55rem !important;
  border: 0 !important;
  border-radius: .65rem !important;
  background: transparent !important;
  color: #0f172a !important;
  padding: 0 .75rem !important;
  font-size: .82rem !important;
  font-weight: 850 !important;
  text-align: left !important;
}

.ema-select-option:hover,
.ema-select-option.is-selected {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

.ema-select-option-check {
  color: #2563eb !important;
  font-weight: 950 !important;
}
`;

type UpgradedSelect = HTMLSelectElement & { [SELECT_MARK]?: "true" };

let openMenu: HTMLDivElement | null = null;
let openTrigger: HTMLButtonElement | null = null;

function ensureStyles() {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.textContent = css;
  else {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

function closeMenu() {
  if (openMenu) openMenu.remove();
  if (openTrigger) openTrigger.setAttribute("aria-expanded", "false");
  openMenu = null;
  openTrigger = null;
}

function getSelectedText(select: HTMLSelectElement) {
  const option = select.selectedOptions?.[0] || Array.from(select.options).find((item) => item.value === select.value) || select.options[0];
  return option?.textContent?.trim() || "Select";
}

function positionMenu(button: HTMLButtonElement, menu: HTMLDivElement) {
  const rect = button.getBoundingClientRect();
  const viewportPadding = 12;
  const width = Math.max(rect.width, 190);
  const estimatedHeight = Math.min(280, Math.max(44, menu.childElementCount * 40 + 10));
  const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
  const availableAbove = rect.top - viewportPadding;
  const openAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;
  const maxHeight = Math.max(96, Math.min(estimatedHeight, openAbove ? availableAbove : availableBelow));
  const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
  const top = openAbove
    ? Math.max(viewportPadding, rect.top - maxHeight - 8)
    : Math.min(rect.bottom + 8, window.innerHeight - maxHeight - viewportPadding);

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.width = `${width}px`;
  menu.style.maxHeight = `${maxHeight}px`;
}

function openSelect(select: HTMLSelectElement, button: HTMLButtonElement, textNode: HTMLSpanElement) {
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "ema-select-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", select.getAttribute("aria-label") || "EMA select");

  Array.from(select.options).forEach((option) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `ema-select-option${option.value === select.value ? " is-selected" : ""}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", option.value === select.value ? "true" : "false");
    item.disabled = option.disabled;

    const label = document.createElement("span");
    label.textContent = option.textContent || option.value;
    item.appendChild(label);

    if (option.value === select.value) {
      const check = document.createElement("span");
      check.className = "ema-select-option-check";
      check.textContent = "✓";
      item.appendChild(check);
    }

    item.addEventListener("click", () => {
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      textNode.textContent = getSelectedText(select);
      closeMenu();
    });

    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  button.setAttribute("aria-expanded", "true");
  positionMenu(button, menu);
  openMenu = menu;
  openTrigger = button;
}

function upgradeSelect(select: UpgradedSelect) {
  if (select[SELECT_MARK] === "true") return;
  const host = select.closest(".ema-filter-field, .ema-toolbar, main[data-section='users'], .ema-module-root");
  if (!host) return;

  select[SELECT_MARK] = "true";
  select.classList.add("ema-select-native-hidden");

  const wrapper = document.createElement("div");
  wrapper.className = "ema-select-upgrade";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ema-select-trigger";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const text = document.createElement("span");
  text.className = "ema-select-trigger-text";
  text.textContent = getSelectedText(select);

  const caret = document.createElement("span");
  caret.className = "ema-select-trigger-caret";
  caret.setAttribute("aria-hidden", "true");

  button.appendChild(text);
  button.appendChild(caret);
  wrapper.appendChild(button);
  select.insertAdjacentElement("afterend", wrapper);

  const sync = () => {
    button.disabled = select.disabled;
    text.textContent = getSelectedText(select);
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (select.disabled) return;
    if (openTrigger === button) closeMenu();
    else openSelect(select, button, text);
  });

  select.addEventListener("change", sync);
  new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true });
  sync();
}

function upgradeAllSelects() {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLSelectElement>(".ema-filter-field select, .ema-toolbar select, main[data-section='users'] select, .ema-module-root select").forEach((select) => upgradeSelect(select as UpgradedSelect));
}

if (typeof document !== "undefined") {
  ensureStyles();
  upgradeAllSelects();

  new MutationObserver(() => upgradeAllSelects()).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    const target = event.target as Node;
    if (openMenu?.contains(target) || openTrigger?.contains(target)) return;
    closeMenu();
  });
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);
}

export {};
