import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { itopsSoftwareDrilldownTransform } from './src/utils/itopsSoftwareDrilldownTransform';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [itopsSoftwareDrilldownTransform(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
