import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';
import { hardwarePaginationFixTransform } from './src/utils/hardwarePaginationFixTransform';

export default defineConfig({
  plugins: [itopsSoftwareDrilldownTransform(), hardwarePaginationFixTransform(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
