const classes = [
  "ema-tree-final-clean",
  "ema-tree-layout-reserve-final",
  "ema-hide-tree-panel-title",
  "ema-network-table-final-fix",
  "ema-app-restriction-ui-final",
  "ema-app-restriction-safe",
  "ema-appres-package-ui-final",
  "ema-appres-reset-damage",
  "ema-web-domain-list-final",
  "ema-mgmt-compact-final",
  "ema-patch-device-cell-fix"
];

if (typeof document !== "undefined") {
  for (const cls of classes) document.body.classList.remove(cls);
}

export {};
