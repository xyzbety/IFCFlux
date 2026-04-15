import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";

// 获取开发主机地址，用于Tauri开发环境
const host = process.env.TAURI_DEV_HOST;

// Vite配置定义: https://vitejs.dev/config/
export default defineConfig(() => ({
  // 路径解析配置
  resolve: {
    alias: {
      // 将@符号映射到src目录
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // Vite插件配置
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 配置自定义元素，以smart-开头的标签将被视为自定义元素
          isCustomElement: tag => tag.startsWith('smart-')
        }
      }
    }),
    viteStaticCopy({
      targets: [
        {
          // 从 web-ifc 包中拷贝 wasm 到 /web-ifc/
          src: 'node_modules/web-ifc/*.wasm',
          dest: 'web-ifc',
          rename: { stripBase: true }
        },
        {
          // 从 duckdb-wasm 包中拷贝 wasm 到 /duckdb/
          src: [
            'node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
            'node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm'
          ],
          dest: 'duckdb',
          rename: { stripBase: true }
        },
        {
          // 从 duckdb-wasm 包中拷贝 worker 到 /duckdb/
          src: [
            'node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
            'node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js'
          ],
          dest: 'duckdb',
          rename: { stripBase: true }
        }
      ]
    })
  ],

  // 资源包含配置，允许处理WebAssembly文件
  assetsInclude: ['**/*.wasm'],

  // 基础路径配置，设置为相对路径，适配Tauri桌面应用
  base: "./",

  // 依赖优化配置
  optimizeDeps: {
    include: ['blockly', '@blockly/field-colour'],
    exclude: ['web-ifc']
  },

  // smart-webcomponents 的样式在 lightningcss 压缩时会触发语法解析错误
  // 切回 esbuild 可以稳定通过构建，同时保留 CSS 压缩。
  build: {
    cssMinify: 'esbuild',
  },

  // Tauri开发特定的Vite配置

  // 禁用清屏，防止Vite掩盖Rust错误信息
  clearScreen: false,

  // 服务器配置
  server: {
    // MIME类型配置
    mimeTypes: {
      'application/wasm': ['wasm']
    },
    // 固定端口配置，Tauri需要固定端口
    port: 5000,
    // 严格端口模式，如果端口被占用则启动失败
    strictPort: true,
    // 主机配置，开发环境下使用环境变量中的主机地址
    host: host || false,
    // 热更新模块配置
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5001,
        }
      : undefined,
    // 文件监听配置
    watch: {
      // 忽略对`src-tauri`目录的监听
      ignored: ["**/src-tauri/**"],
    },
  },
}));
