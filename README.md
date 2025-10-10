# IFCFlux

专为查看和分析IFC文件设计。本应用提供了直观的用户界面、高性能的3D渲染和丰富的交互功能，帮助建筑工程专业人员更高效地查看和管理BIM模型数据

## 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite 6
- **类型系统**: TypeScript 5
- **3D渲染引擎**: Babylon
- **桌面应用框架**: Tauri 2
- **UI组件库**: Smart Web Components
- **状态管理**: Pinia
- **样式预处理**: Less
- **BIM数据处理**: web-ifc



## 功能特性

- **专业IFC文件查看**：支持加载、渲染和交互式浏览IFC格式的BIM模型
- **高性能3D渲染**：基于Babylon.js实现的高质量3D可视化引擎
- **直观的用户界面**：采用Ribbon风格界面，提供丰富的操作工具和选项
- **跨平台支持**：基于Tauri框架，可在Windows、macOS和Linux上运行
- **Vue 3 + TypeScript**：利用现代前端技术栈确保代码质量和开发效率
- **Vite极速构建**：享受毫秒级的热模块替换和快速的开发体验
- **Smart Web Components集成**：提供专业级的UI组件支持

## 快速开始

### 前置要求

- Node.js 18.0.0 或更高版本
- Rust 1.70.0 或更高版本 (用于Tauri桌面应用构建)
- pnpm 8.0.0 或更高版本 (推荐)

### 安装依赖

```bash
pnpm install
```

### 开发模式


```bash
// 启动前端开发模式
pnpm dev
```
此命令将启动Vite开发服务器，默认监听 http://localhost:5000

```bash
// 启动桌面应用开发模式
pnpm tauri dev
```
此命令将启动Tauri开发模式，同时构建前端资源并启动桌面应用

### 生产构建

```bash
// 构建前端资源
pnpm build
```
此命令将构建优化后的前端资源到`dist`目录

```bash
// 构建桌面应用
pnpm tauri build
```
此命令将根据当前操作系统构建相应的桌面应用安装包

## 项目结构

```
ifcflux/
├── .gitignore              # Git忽略文件配置
├── .npmrc                  # npm配置文件
├── index.html              # 入口HTML文件
├── package.json            # 前端依赖配置
├── pnpm-lock.yaml          # pnpm依赖锁文件
├── README.md               # 项目说明文档
├── tsconfig.json           # TypeScript配置
├── tsconfig.node.json      # Node.js环境的TypeScript配置
├── vite.config.ts          # Vite构建工具配置
├── public/                 # 静态资源目录
│   ├── extractor.worker.js # Web Worker脚本
│   ├── favicon.png         # 网站图标
│   ├── logo.png            # 应用Logo
│   ├── fonts/              # 字体文件
│   ├── icons/              # SVG图标
│   └── web-ifc/            # Web-IFC库相关文件
├── src/                    # 前端源代码目录
│   ├── App.vue             # 主应用组件
│   ├── main.ts             # 应用入口文件
│   ├── types.ts            # 全局TypeScript类型定义
│   ├── vite-env.d.ts       # Vite环境变量的类型声明
│   ├── components/         # Vue组件
│   ├── composables/        # Vue组合式函数 (Hooks)
│   ├── services/           # 应用的核心服务
│   ├── store/              # 状态管理
│   ├── styles/             # 全局样式和变量
│   └── utils/              # 工具函数
└── src-tauri/              # Tauri桌面应用源代码
    ├── .gitignore          # Tauri相关的Git忽略配置
    ├── build.rs            # Rust构建脚本
    ├── Cargo.lock          # Rust依赖锁文件
    ├── Cargo.toml          # Rust项目和依赖配置
    ├── tauri.conf.json     # Tauri应用配置文件
    ├── capabilities/       # Tauri能力和权限配置
    ├── icons/              # 应用图标
    └── src/                # Rust源代码
```

## 配置

### Vite配置
开发服务器端口、代理和其他构建配置可以在 `vite.config.ts` 中修改。

### Tauri配置
桌面应用的窗口大小、图标、权限等配置可以在 `src-tauri/tauri.conf.json` 中修改。

### 应用配置
应用的默认设置和主题配置可以在 `src/utils/config.ts` 和 `src/utils/default.config.ts` 中修改。

