import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig( () => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: tag => tag.startsWith('smart-')
      }
    }
  })],

  // 配置WebAssembly文件处理
  assetsInclude: ['**/*.wasm'],

  base: "./",
  // 优化依赖处理
  optimizeDeps: {
    include: ['blockly', '@blockly/field-colour'],
    exclude: []
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    mimeTypes: {
      'application/wasm': ['wasm']
    },
    port: 5000,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5001,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
