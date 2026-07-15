# 292笔记

292笔记现在是一个基于 Electron + React + TypeScript 的本地桌面笔记客户端。界面保留原来的轻量侧边栏和编辑器体验，笔记数据由 Electron 主进程保存到系统应用数据目录中的 JSON 文件。

## 功能
- 左侧笔记列表，右侧内容编辑
- 新建、删除、搜索、置顶、排序
- 自动保存到本机应用数据目录
- 深色模式及移动端窄窗口适配
- 快捷键：`Ctrl/Cmd + N` 新建，`Ctrl/Cmd + K` 搜索

## 开发
需要 Node.js 18 或更高版本。

```powershell
npm install
npm run dev
```

## 验证

```powershell
npm test
npm run typecheck
npm run build
```

测试覆盖模型逻辑、Electron 文件存储和 React 核心交互。
