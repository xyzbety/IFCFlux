# IFC查看器

专为查看和分析IFC文件设计。本应用提供了直观的用户界面、高性能的3D渲染和丰富的交互功能，帮助建筑工程专业人员更高效地查看和管理BIM模型数据

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
此命令将启动Vite开发服务器，默认监听 http://localhost:1420

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
├── README.md               # 项目说明文档
├── app-icon.png            # 应用图标
├── index.html              # 入口HTML文件
├── package.json            # 前端依赖配置
├── pnpm-lock.yaml          # pnpm依赖锁文件
├── public/                 # 静态资源
│   ├── extractor.worker.js # Web Worker文件
│   ├── fonts/              # 字体文件
│   ├── textures/           # 纹理资源
│   └── web-ifc.wasm        # WebAssembly模块
├── src/                    # 前端源代码
│   ├── App.vue             # 根组件
│   ├── assets/             # 静态资源
│   ├── blockly/            # Blockly相关代码
│   ├── components/         # 自定义组件
│   ├── main.ts             # 主入口文件
│   ├── store/              # 状态管理
│   ├── style/              # 样式文件
│   ├── types.ts            # 类型定义
│   ├── utils/              # 工具函数
│   └── vite-env.d.ts       # Vite环境声明
├── src-tauri/              # Tauri桌面应用代码
│   ├── .gitignore
│   ├── Cargo.lock          # Rust依赖锁文件
│   ├── Cargo.toml          # Rust依赖配置
│   ├── build.rs            # 构建脚本
│   ├── capabilities/       # Tauri权限配置
│   ├── icons/              # 应用图标
│   ├── src/                # Rust源代码
│   └── tauri.conf.json     # Tauri配置文件
├── tsconfig.json           # TypeScript配置
├── tsconfig.node.json      # Node.js TypeScript配置
├── vite.config.ts          # Vite配置
```

## ⚙️ 配置

### Vite配置
开发服务器端口、代理和其他构建配置可以在 `vite.config.ts` 中修改。

### Tauri配置
桌面应用的窗口大小、图标、权限等配置可以在 `src-tauri/tauri.conf.json` 中修改。

### 应用配置
应用的默认设置和主题配置可以在 `src/utils/config.ts` 和 `src/utils/default.config.ts` 中修改。

## 📦 技术栈

- **前端框架**: Vue 3 Composition API
- **构建工具**: Vite 6
- **类型系统**: TypeScript 5
- **3D渲染引擎**: Babylon.js
- **桌面应用框架**: Tauri 2
- **UI组件库**: Smart Web Components
- **状态管理**: Vue内置响应式系统
- **样式预处理**: Less
- **BIM数据处理**: web-ifc

## 📖 使用指南

### 打开IFC文件
1. 点击菜单栏中的「文件」->「打开」
2. 在文件选择对话框中选择IFC文件
3. 等待文件加载完成后即可查看模型

### 模型操作
- **旋转**: 按住鼠标左键并拖动
- **平移**: 按住鼠标中键或Shift+鼠标左键并拖动
- **缩放**: 使用鼠标滚轮或按住Ctrl+鼠标左键并拖动
- **选择元素**: 点击模型中的元素

### 查看属性
1. 选择模型中的元素
2. 属性面板会自动显示该元素的详细信息

### 导出功能
1. 点击菜单栏中的「文件」->「导出」
2. 选择导出格式和保存位置
3. 点击「确定」完成导出

## 🤝 开发指南

### 代码规范
- 使用ESLint和Prettier保持代码风格一致
- 遵循Vue 3的最佳实践
- 为组件和函数添加适当的TypeScript类型注释
- 提交代码前运行`pnpm lint`检查代码规范

### 提交规范
- 使用语义化版本控制
- 提交消息格式: `type(scope): description`
  - type: feat, fix, docs, style, refactor, test, chore
  - scope: 可选，指定修改的范围
  - description: 简洁明了的描述

### 贡献指南
1. Fork本仓库
2. 创建特性分支: `git checkout -b feature/my-feature`
3. 提交修改: `git commit -am 'feat: add new feature'`
4. 推送到分支: `git push origin feature/my-feature`
5. 创建Pull Request

## ❗ 故障排除

### 常见问题
1. **Vite开发服务器启动失败**
   - 确保端口1420未被占用
   - 运行`pnpm install`重新安装依赖

2. **Tauri构建失败**
   - 确保已安装Rust和必要的构建工具
   - 检查`src-tauri/tauri.conf.json`配置是否正确

3. **IFC文件加载失败**
   - 确保文件格式正确
   - 尝试使用较小的IFC文件测试
   - 检查浏览器控制台是否有错误信息

## 📄 许可证

本项目采用MIT许可证。详情请见 [LICENSE](LICENSE) 文件。

## 📞 联系我们

如有问题或建议，请通过以下方式联系我们:
- 邮箱: contact@example.com
- GitHub: [https://github.com/your-username/ifc-viewer](https://github.com/your-username/ifc-viewer)
