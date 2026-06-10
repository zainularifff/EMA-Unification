# UI Stable V5 Hotfix

This hotfix fixes the broken Report UI caused by existing global EMA layout CSS overriding the new report studio styles.

## Files changed

- `src/pages/Report.tsx`
  - imports `../styles/report-studio-stable.css` after existing report CSS.

- `src/styles/report-studio-stable.css`
  - final scoped override under `.report-studio-redesign-v2`
  - restores readable colors
  - fixes category panel text contrast
  - fixes report analysis panel contrast
  - fixes report card grid and config panel sizing
  - uses `!important` only inside the report module scope to avoid affecting other EMA pages

## Important

Copy both files into your project:

- `src/pages/Report.tsx`
- `src/styles/report-studio-stable.css`

Then restart Vite/dev server and hard refresh the browser.
