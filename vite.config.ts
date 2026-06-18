import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    itopsSoftwareDrilldownTransform(),
    {
      name: 'itops-software-template-output-fix',
      enforce: 'pre',
      transform(code, id) {
        if (!id.replace(/\\/g, '/').endsWith('/src/pages/Dashboard.tsx')) return null;
        const next = code.replace(/\\\$\{/g, '${');
        return next === code ? null : { code: next, map: null };
      },
    },
    react(),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
