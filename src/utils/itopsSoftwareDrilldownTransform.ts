import type { Plugin } from 'vite';

export function itopsSoftwareDrilldownTransform(): Plugin {
  return {
    name: 'itops-software-drilldown-transform',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;
      const next = code.replace(/Software Categories/g, 'Software Category Graph');
      return next === code ? null : { code: next, map: null };
    },
  };
}
