import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { nodeExternals } from 'rollup-plugin-node-externals'
import MagicString from 'magic-string'


// ref: https://blog.rxliuli.com/p/49fb661c297b4544a208ea898c77e5a0/
function shims(): Plugin {
  return {
    name: 'node-shims',
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js')) {
        return
      }
      // console.log('transform', chunk.fileName)
      const s = new MagicString(code)
      s.prepend(`
import __path from 'path'
import { fileURLToPath as __fileURLToPath } from 'url'
import { createRequire as __createRequire } from 'module'

const __getFilename = () => __fileURLToPath(import.meta.url)
const __getDirname = () => __path.dirname(__getFilename())
const __dirname = __getDirname()
const __filename = __getFilename()
const self = globalThis
const require = __createRequire(import.meta.url)
`)
      return {
        code: s.toString(),
        map: s.generateMap(),
      }
    },
    apply: 'build',
  }
}

function externals(): Plugin {
  return {
    ...nodeExternals(),
    name: 'node-externals',
    enforce: 'pre', // 关键是要在 vite 默认的依赖解析插件之前运行
    apply: 'build',
  }
}

function config(options?: { entry?: string }): Plugin {
  const entry = options?.entry ?? 'src/index.ts'
  return {
    name: 'node-config',
    config() {
      return {
        build: {
          lib: {
            entry,
            formats: ['es', 'cjs'],
            fileName: path.basename(entry, path.extname(entry)),
          },
        },
        resolve: {
          // 修改解析方式默认为 node 而非 browser
          mainFields: ['module', 'jsnext:main', 'jsnext'],
          conditions: ['node'],
        },
      }
    },
    apply: 'build',
  }
}

export function node(): Plugin[] {
  return [shims(), externals(), config()]
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig( () => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'duckdb': 'duckdb-async',
    },
  },
  plugins: [node(), vue({
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
    include: ['blockly', '@blockly/field-colour', 'duckdb-async'],
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
