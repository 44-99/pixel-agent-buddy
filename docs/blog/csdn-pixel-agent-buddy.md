# 从 OpenClaw/3D 到 Claude Code、Codex：我重做了一个隐私优先的 Hooks 像素桌宠

> 项目地址：[Pixel Agent Buddy](https://github.com/44-99/pixel-agent-buddy)
>
> Windows 下载：[GitHub Release v0.2.1-beta.1](https://github.com/44-99/pixel-agent-buddy/releases/tag/v0.2.1-beta.1)
>
> CSDN 文章：[公开阅读地址](https://blog.csdn.net/csy20070422/article/details/163131803)

![Pixel Agent Buddy：Claude Code 与 Codex 像素桌宠](https://44-99.github.io/pixel-agent-buddy/assets/hero.png)

现在我经常把 Claude Code 或 Codex 放在终端里跑任务，自己切去看文档、浏览器或者另一个项目。问题也随之出现：任务到底还在执行、已经完成，还是卡在权限确认？为了看一眼状态，我不得不反复切回终端。

于是我做了 **Pixel Agent Buddy**：一个 Windows 像素桌宠，把 Claude Code 和 Codex 的原生生命周期 Hooks 转换成桌面状态。它只回答一个问题：

> “Agent 现在在干什么？”

它不是新的 AI 客户端，不接管权限，不做聊天、记忆、RPG 或远程控制，也不会读取 Prompt 和代码。目前项目以 MIT 协议开源，并提供 Windows 安装版和便携版。

## 这其实是一次产品方向重做

这个项目最初来自 OpenClaw 爆火时的想法。当时我做过 OpenClaw Gateway 适配，也尝试过 3D 桌宠。但几个月后再看，两个前提都变了：

1. 我自己的主力工具已经变成 Claude Code 和 Codex；
2. 手搓 3D 模型的成本高，效果却很难超过成熟资产，迭代速度也明显慢于 2D。

继续保留旧方向只会让项目变成一个没人真正使用的“功能遗址”。所以这次没有做兼容 fallback，而是直接删除 OpenClaw、Three.js、VRM/GLB、Python 后端等旧实现，重新确定定位：

> **面向 Claude Code 和 Codex 的、隐私优先的环境式状态提示。**

形象也改成两套原创透明像素 PNG：Claude Code 是暖色小螃蟹，Codex 是终端机械蟹。2D 不仅更适合个人开发者维护，也能用 CSS 快速完成待机、思考、工作、审批、成功、错误和睡眠状态动画。

## 为什么坚持使用原生 Hooks

桌宠要知道 Agent 状态，大致有三种办法：

- 轮询日志；
- 读取 Transcript；
- 使用 Agent 官方提供的生命周期 Hooks。

前两种方式看似通用，但边界很难控制：格式可能随版本变化，也很容易把用户的 Prompt、代码、工具输入输出一起读进来。Pixel Agent Buddy 只采用第三种方式。

当前数据流很简单：

```text
Claude Code Hooks ─┐
                   ├─> Agent adapter ─> 字段白名单清洗
Codex Hooks ───────┘                         │
                                            ├─> 带随机 Token 的 127.0.0.1 HTTP
                                            ├─> 多会话状态仲裁
                                            └─> Electron 2D 桌宠
```

Claude Code 与 Codex 的事件名称和字段并不完全相同，因此项目为两者保留独立 adapter，再统一成内部事件协议。例如下面这段归一化逻辑只构造新的白名单对象，不会把原始 Hook payload 整包转发：

```javascript
// src/event-protocol.cjs（节选）
return {
  version: 1,
  agent,
  sessionId,
  parentSessionId,
  subagentId,
  agentType,
  event,
  state,
  cwd,
  project: cwd ? path.basename(cwd) : '',
  toolName,
  title: copy.title,
  detail: detailFor(event, toolName, agentType) || copy.detail,
  timestamp: Date.now()
};
```

这也是项目最重要的产品约束：**隐私不是一句宣传语，而是协议层的字段白名单。**

## 桌宠明确不会接收什么

Hook 可以发送的内容只有：

- Agent 类型；
- 会话、父会话和子 Agent 标识；
- 生命周期事件与归一化状态；
- 当前工作目录及项目目录名；
- 工具名称；
- 本地时间戳。

以下内容不会被转发：

- Prompt 或扩展后的 Prompt；
- 源代码和文件内容；
- `tool_input`、`tool_response`；
- Transcript、助手回复；
- 环境变量、API Key；
- Allow、Deny、Always 等权限决定。

传输只发生在 `127.0.0.1`，每次应用启动都会生成随机 Bearer Token。Hook 失败时采用 fail-open：即使桌宠未运行、配置损坏或请求超时，也不能阻塞 Claude Code/Codex 本身。权限决定始终留在原生 CLI 中。

## 下载版为什么不再要求 Node.js

源码开发需要 Node.js，但普通用户不应该为了一个桌宠额外配置运行时。

现在打包后的应用本身可以作为 Hook runner：

```text
Pixel Agent Buddy.exe --pixel-agent-buddy-hook --agent claude-code
Pixel Agent Buddy.exe --pixel-agent-buddy-hook --agent codex
```

Electron 主进程检测到这个参数后，不创建桌面窗口，而是读取 Hook 的标准输入，完成字段清洗并把事件发给已经运行的桌宠。这样 GitHub Release 里的安装版和便携版都可以独立工作。

这里还踩过一个真实的坑：开发环境中的 Node Hook 正常，但打包后的 Electron EXE 一直读不到管道输入。最后发现 Electron 启动阶段可能错过异步 `process.stdin` 监听，改为同步读取文件描述符 0 后才稳定：

```javascript
const raw = fs.readFileSync(0, 'utf8');
```

现在 Release 工作流会在 Windows runner 上启动真实的打包 EXE，向它写入 Hook stdin，并验证它确实只发送清洗后的事件。如果 `tool_input` 等字段意外出现，构建会直接失败。

## 首次启动不应该靠猜

早期版本只弹出一个“是否安装 Hooks”的系统对话框。它虽然能用，但用户看不到 CLI 是否被检测到、Hook 写到了哪里、当前运行的是源码 Node runner 还是下载版自包含 runner。

`v0.2.1-beta.1` 新增了首次启动与诊断界面：

![Pixel Agent Buddy 首次启动和诊断界面](https://44-99.github.io/pixel-agent-buddy/assets/setup-and-diagnostics.png)

现在可以直接看到：

- Claude Code/Codex CLI 版本；
- Hook 是否安装、配置 JSON 是否有效；
- Hook runner 模式；
- 本地状态服务端口；
- 最近一次 Agent 状态；
- 一键安装/修复和测试动画。

更新检查也不是后台请求。只有用户主动点击“手动检查更新”时，应用才访问公开的 GitHub Releases API。

## 如何体验

目前支持 Windows 10/11。最简单的方式是：

1. 从 [GitHub Release](https://github.com/44-99/pixel-agent-buddy/releases/tag/v0.2.1-beta.1) 下载安装版或便携版；
2. 启动 Pixel Agent Buddy；
3. 在首次引导中连接检测到的 Claude Code/Codex；
4. 点击测试按钮，确认桌宠出现“任务完成”动画；
5. 正常使用 Claude Code 或 Codex，桌宠会自动切换形象与状态。

如果从源码运行：

```powershell
git clone https://github.com/44-99/pixel-agent-buddy.git
cd pixel-agent-buddy
npm install
npm run install:hooks
npm start
```

检查本机连接状态：

```powershell
npm run doctor
```

卸载时只会移除 Pixel Agent Buddy 管理的条目，不会删除其他工具写入的 Hooks：

```powershell
npm run uninstall:hooks
```

## 当前限制也说清楚

这个项目目前仍是 Beta，我不打算把所有桌宠功能都塞进来：

- 当前只支持 Windows；
- 只适配 Claude Code 和 Codex；
- 不会代替用户点击权限允许/拒绝；
- 安装包暂未购买代码签名证书，Windows 可能显示 SmartScreen 提示；
- Agent 的 Hooks 接口仍可能随版本变化，需要持续做兼容验证；
- 当前动画以状态驱动的 2D/CSS 动效为主，还不是大型逐帧精灵系统。

这些限制与项目定位有关。Pixel Agent Buddy 想做的是一个安静、透明、可验证的桌面信号，而不是另一个复杂的 Agent 平台。

## 写在最后

从 OpenClaw Gateway 和 3D 桌宠，转向 Claude Code/Codex 原生 Hooks 与 2D 像素形象，这次重做最大的收获不是“功能更多”，而是终于知道这个项目应该拒绝什么。

如果你也经常把 Agent 放在后台跑长任务，可以试试当前预发行版：

- GitHub：[https://github.com/44-99/pixel-agent-buddy](https://github.com/44-99/pixel-agent-buddy)
- 下载：[v0.2.1-beta.1](https://github.com/44-99/pixel-agent-buddy/releases/tag/v0.2.1-beta.1)
- 官网：[https://44-99.github.io/pixel-agent-buddy/](https://44-99.github.io/pixel-agent-buddy/)

我目前最想收集两类反馈：

1. 你的 Claude Code/Codex 版本能否正常触发 Hooks？
2. 你最容易错过的是“任务完成”“权限等待”，还是“执行失败”？

欢迎在 GitHub Issues 里告诉我。项目还小，真实使用反馈比继续凭想象堆功能更重要。
