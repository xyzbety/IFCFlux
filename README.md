# IFCFlux

专为查看和分析IFC文件设计。本应用提供了直观的用户界面、高性能的3D渲染和丰富的交互功能，帮助建筑工程专业人员更高效地查看和管理BIM模型数据

## 技术栈

- **前端框架**: Vue 3 Composition API
- **构建工具**: Vite 6
- **类型系统**: TypeScript 5
- **3D渲染引擎**: Babylon.js
- **桌面应用框架**: Tauri 2
- **UI组件库**: Smart Web Components
- **状态管理**: Vue内置响应式系统
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
ifc-viewer/
├── .gitignore              # Git忽略文件配置
├── .npmrc                  # npm配置文件
├── index.html              # 入口HTML文件
├── package.json            # 前端依赖配置
├── pnpm-lock.yaml          # pnpm依赖锁文件
├── README.md               # 项目说明文档
├── tsconfig.json           # TypeScript配置
├── tsconfig.node.json      # Node.js TypeScript配置
├── vite.config.ts          # Vite配置
├── public/                 # 静态资源
│   ├── extractor.worker.js # Web Worker文件
│   ├── favicon.png         # 网站图标
│   ├── logo.png            # 应用Logo
│   ├── fonts/              # 字体文件
│   │   ├── SarasaUiSC-Bold.woff2
│   │   └── SarasaUiSC-Regular.woff2
│   ├── icons/              # SVG图标文件
│   │   ├── 测量.svg
│   │   ├── 视图.svg
│   │   ├── 属性.svg
│   │   ├── 结构.svg
│   │   ├── arrow-down.svg
│   │   ├── arrow-right.svg
│   │   └── ... (更多功能图标)
│   └── textures/           # 纹理资源
│       └── tex_1.png
├── src/                    # 前端源代码
│   ├── App.vue             # 主应用组件
│   ├── main.ts             # 应用入口文件
│   ├── types.ts            # TypeScript类型定义
│   ├── vite-env.d.ts       # Vite环境类型声明
│   ├── blockly/            # Blockly可视化编程
│   │   ├── animation.ts    # 动画相关
│   │   ├── blocks.ts       # 自定义块定义
│   │   ├── generator.ts    # 代码生成器
│   │   └── toolbox.ts      # 工具箱配置
│   ├── components/         # Vue组件
│   │   ├── Check.vue       # 检查结果组件
│   │   ├── Dialog.vue      # 通用对话框组件
│   │   ├── DialogR.vue     # 右侧对话框组件
│   │   ├── KhanonViewer.vue # 3D查看器组件
│   │   ├── PropertyTable.vue # 属性表组件
│   │   ├── Ribbon.vue      # 功能区组件
│   │   ├── StructureTree.vue # 构件树组件
│   │   └── check/          # 检查相关子组件
│   │       ├── circleProgress.vue # 圆形进度条
│   │       ├── demo.vue    # 演示组件
│   │       ├── info.vue    # 信息展示
│   │       ├── ruleDetail.vue # 规则详情
│   │       └── ruleTree.vue # 规则树
│   ├── store/              # Pinia状态管理
│   │   └── index.ts        # 主状态存储
│   ├── style/              # 样式文件
│   │   ├── font-family.less # 字体样式
│   │   ├── index.less      # 主样式文件
│   │   ├── layout.less     # 布局样式
│   │   ├── reset.less      # 重置样式
│   │   └── variables.less  # 样式变量
│   └── utils/              # 工具函数
│       ├── camera.ts       # 相机控制
│       ├── config.ts       # 表格配置
│       ├── default.config.ts # 默认配置
│       ├── ifc-api.ts      # IFC API封装
│       ├── ifcMap.ts       # IFC类型映射表
│       ├── ifcspacegen.ts  # IFC空间生成
│       ├── scene.ts        # 场景管理
│       ├── ifcLoader/      # IFC文件加载器
│       │   ├── IfcExplosion.ts # 爆炸视图
│       │   └── IfcLoader.js # 主加载器
│       ├── measure/        # 测量工具
│       │   ├── measure.d.ts # 类型定义
│       │   └── measure.js  # 测量实现
│       └── slice/          # 剖切工具
│           ├── sliceBox.ts # 盒式剖切
│           ├── slicePlane.ts # 平面剖切
│           ├── type.ts     # 类型定义
│           └── utils.ts    # 工具函数
└── src-tauri/              # Tauri桌面应用代码
    ├── .gitignore          # Tauri Git忽略配置
    ├── build.rs            # 构建脚本
    ├── Cargo.lock          # Rust依赖锁文件
    ├── Cargo.toml          # Rust依赖配置
    ├── tauri.conf.json     # Tauri配置文件
    ├── capabilities/       # Tauri权限配置
    │   └── default.json    # 默认权限
    ├── icons/              # 应用图标
    │   ├── 32x32.png
    │   ├── 128x128.png
    │   ├── icon.ico
    │   ├── icon.png
    │   ├── android/        # Android平台图标
    │   └── ios/            # iOS平台图标
    └── src/                # Rust源代码
        ├── lib.rs          # 库文件
        └── main.rs         # 主程序入口
```

## ⚙️ 配置

### Vite配置
开发服务器端口、代理和其他构建配置可以在 `vite.config.ts` 中修改。

### Tauri配置
桌面应用的窗口大小、图标、权限等配置可以在 `src-tauri/tauri.conf.json` 中修改。

### 应用配置
应用的默认设置和主题配置可以在 `src/utils/config.ts` 和 `src/utils/default.config.ts` 中修改。

