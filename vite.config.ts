import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function dashboardUiPatch() {
  return {
    name: 'dashboard-ui-patch',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;

      const exportStart = code.indexOf('          <button type="button" className="itops-pro-outline-btn"');
      const exportMarker = code.indexOf('<Download size={16} /> Export', exportStart);
      const exportEnd = exportMarker > -1 ? code.indexOf('          </button>', exportMarker) : -1;

      let next = code;
      if (exportStart > -1 && exportMarker > -1 && exportEnd > -1) {
        next = code.slice(0, exportStart) + code.slice(exportEnd + '          </button>'.length);
      }

      next = next.split("tone: 'amber',\n      progress: softwareMappingPercent,").join("tone: 'purple',\n      progress: softwareMappingPercent,");
      return next === code ? null : { code: next, map: null };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dashboardUiPatch(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
