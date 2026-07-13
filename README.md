# 292笔记

一个无需安装依赖的本地笔记应用。双击 `index.html` 即可使用，也可以通过任意静态文件服务器运行。

## 功能
- 左侧笔记列表，右侧内容编辑
- 新建、删除、搜索、置顶、排序
- 自动保存至浏览器 `localStorage`
- 深色模式及移动端适配
- 快捷键：`Ctrl/Cmd + N` 新建，`Ctrl/Cmd + K` 搜索

## 测试
需要 Node.js 18 或更高版本：

```powershell
node --test note-model.test.js
```


