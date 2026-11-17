# 秒懂 Miaodong

划一下，秒懂。选中读不懂的词、术语或句子，在原位给出**结合上下文**的解释，并把结果一键存入 ima 知识库。

同一套核心逻辑，三个形态：

| 形态 | 目录 | 状态 |
|---|---|---|
| Chrome 扩展（Manifest V3） | 仓库根目录 | 功能完整 |
| Safari Web Extension（容器 App） | `safari/` | 与 Chrome 端同步 |
| macOS 原生菜单栏 App（Swift/SwiftUI） | `macos/` | 核心功能完整 |

无 Electron、无 WebView、无第三方运行时依赖。

---

## 核心特性

- **结合上下文的解释**：不是词典义。请求带上选区全文、所在段落、前文和后文（各有长度上限），并注明页面标题与站点
- **先选中，后请求**：默认划词后先显示「懂」按钮，点击才发起模型请求；也可切换为松开鼠标直接解释
- **四段式输出**：【释义】【语境】【延伸】【翻译】，支持流式渲染
- **追问**：卡片内继续提问，或点「再详细一点」，保留完整对话上下文
- **14 个服务商**：全部走 OpenAI 兼容接口，切换预设自动填 Base URL 和默认模型
- **ima 知识库**：解释结果通过 ima 官方 OpenAPI 直接推送为 ima 笔记（可指定笔记本）
- **实用细节**：一键复制、图钉固定、快捷键 Alt+Shift+E、右键菜单、本地历史、Markdown/JSON 导出、网站黑名单（支持子域名通配）
- **健壮性**：SSE 流式解析兼容半包/CRLF/多字节、普通 JSON 响应兜底、401/403/404/429 中文错误提示、400 时自动移除 `temperature` 或 `max_tokens` 重试一次

## 支持的服务商

DeepSeek、豆包（火山方舟，填 `ep-` 接入点）、通义千问、Kimi、智谱 GLM、MiniMax、文心（百度千帆）、腾讯混元、讯飞星火、阶跃星辰、OpenRouter、硅基流动、OpenAI，以及任意 OpenAI 兼容接口（自定义）。

---

## 安装

### 方式一：双击安装包（推荐）

`installer/秒懂安装包.dmg`，双击挂载后运行「安装秒懂」，选择：

- **Chrome 浏览器版**：自动打开 `chrome://extensions` 并复制扩展路径，按指引「开发者模式 → 加载已解压的扩展程序」
- **Safari 浏览器版**：自动装入「应用程序」，在 Safari 设置 → 扩展中允许，并把「所有网站」权限设为允许

### Chrome 手动安装

1. 下载本仓库
2. `chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选择仓库根目录（含 `manifest.json`）

### Safari 手动安装

```bash
xcodebuild -project safari/Miaodong/Miaodong.xcodeproj -scheme Miaodong -configuration Release build
```

或用 Xcode 打开 `safari/Miaodong/Miaodong.xcodeproj` 直接运行。`safari/dist/Miaodong.app` 有预构建版本。

### macOS 原生 App

用 Xcode 打开 `macos/Miaodong.xcodeproj`（需要 Xcode 16+，macOS 14+）运行，或在 `macos/dist/` 使用预构建的 universal 版本（Intel + Apple Silicon 原生双架构）。首次使用需在 系统设置 → 隐私与安全性 → 辅助功能 中授权。

---

## ima 知识库集成

1. 打开 [ima 开放接口页](https://ima.qq.com/agent-interface) 获取 **Client ID** 和 **API Key**
2. 秒懂设置页 →「ima 知识库」→ 填入凭证 → 保存 → 「刷新列表」选择接收笔记本
3. 解释卡片上点云上传图标，解释直接推送为 ima 笔记

未配置凭证时自动降级：Markdown 文件保存到 `下载/秒懂笔记/`，可在 ima 客户端批量导入。凭证只发往 `ima.qq.com`，保存在本机。

---

## 隐私说明

- **请求内容**：模型请求包含选区文字、所在段落、前后文、页面标题和站点；不在黑名单外偷偷扩大收集范围
- **密钥**：模型 API Key 和 ima 凭证仅存本机（扩展用 `chrome.storage.local`，原生 App 用 Keychain），不进历史、不进导出、不进日志
- **历史**：只存本地，导出文件不含任何密钥

---

## 项目结构

```
├── manifest.json          # Chrome MV3 清单
├── background.js          # Service Worker：流式请求、服务商预设、ima OpenAPI
├── content.js             # 内容脚本：划词、「懂」按钮、卡片 UI、上下文提取、提示词
├── popup.* / options.*    # 弹窗与设置页
├── safari/                # Safari 容器 App + Web Extension（官方转换器生成）
│   ├── Miaodong/Miaodong.xcodeproj
│   └── dist/              # 预构建 Safari 版
├── macos/                 # 原生菜单栏 App（Swift/SwiftUI/AppKit）
│   ├── Miaodong/          # App 源码：Selection（划词/AX）、Explanation（流式/会话）、Domain、Persistence、UI
│   ├── MiaodongTests/     # 36 项 XCTest
│   └── dist/              # 预构建 universal 版
└── installer/             # DMG 安装包与 AppleScript 安装器源码
```

## 构建与测试

```bash
# macOS 原生 App + 单元测试
xcodebuild -project macos/Miaodong.xcodeproj -scheme Miaodong test

# Safari 版
xcodebuild -project safari/Miaodong/Miaodong.xcodeproj -scheme Miaodong -configuration Release build
```

修改根目录扩展代码后，需把变更文件同步到 `safari/Miaodong/Miaodong Extension/Resources/` 再重新构建 Safari 版（该工程为官方转换器生成的显式文件列表，新增文件还需登记进 `project.pbxproj`）。

---

## 当前进度（2026-11）

**已完成**

- Chrome 扩展：全部功能（划词、上下文解释、流式、追问、历史、导出、黑名单、快捷键、右键菜单）
- 服务商 14 个；OpenRouter 与硅基流动为最新加入
- ima 官方 OpenAPI 集成：`import_doc` 笔记推送、`list_notebook` 笔记本选择、完整中文错误码映射、未配置时下载降级
- Safari 版与 Chrome 端代码同步（manifest 警告项：`open_in_tab`、`match_about_blank` 为 Safari 不支持，影响很小）
- macOS 原生 App：划词（全局鼠标监听 + AX 选区/上下文提取与明确降级，不伪造段落）、「懂」按钮、流式卡片、追问、Keychain、设置、历史、36 项单元测试全部通过、universal 双架构构建
- DMG 安装包（含版本选择安装器）

**进行中 / 待办**

- [ ] ima 鉴权验证收尾：部分账号在开放接口页的 Key 需重新生成后生效（排查中，端点与协议已验证连通）
- [ ] macOS 原生 App 同步 OpenRouter、硅基流动两个服务商（当前为 12 个）
- [ ] macOS 原生 App 接入 ima 推送
- [ ] Chrome Web Store 与 Mac App Store 上架（需开发者账号、图标资产、隐私政策、notarization）
- [ ] 笔记本多于 20 个时 `list_notebook` 游标翻页

## 已知限制

- Chrome 不允许本地分发扩展静默安装，首次安装需手动「加载已解压的扩展程序」
- Safari 版设置页在扩展弹窗内打开而非新标签页（`open_in_tab` 不支持）
- 原生 App 的划词上下文质量取决于目标应用对辅助功能（AX API）的暴露程度：只能取到选区时明确降级，不伪造段落；密码字段一律不读取
- 未做 Apple notarization，安装包发给他人时首次打开需右键 → 打开或在系统设置中放行
