# 逻辑小实验室 · TurboWarp v0.1.0

借鉴 `D:\soft\logic-circuit` 的逻辑工坊，重新设计成适合 Scratch 舞台的 6×4 网格电路沙盒。独立作品，原项目未修改。全部逻辑可在积木区编辑，只有内置画笔扩展，无自定义 JavaScript 扩展。

打开 TurboWarp 编辑器，从「文件 → 从电脑中上传」加载 `dist/logic-lab.sb3`，点绿旗开始。浏览器验收时已在独立自动化浏览器打开完整舞台。

## 怎么玩

1. 左侧选输入、NAND、NOT、AND、OR 或输出，再点空格放置。
2. 选「连线」，先点输入或逻辑门作为来源，再点目标。双输入门点上半格接 A，下半格接 B；单输入门自动接 A。再次点同一来源取消。
3. 回到左侧任一元件工具，再点已有输入开关切换 0/1。浅绿色是 1，灰蓝色是 0；计算自动完成。
4. 「移动」依次点元件、空格，全部入线和出线随之迁移。「删除」删除元件及相关线。「撤销」恢复最近一次有效编辑（含输入切换、清空与示例）。
5. 「清空」要在 3 秒内再点一次；点格子或其他工具可取消。「示例」恢复双输入 NAND 电路：仅当两个输入都为 1 时，灯为 0。
6. 用编辑器文件菜单保存 SB3。再次加载后点绿旗，会保留电路和输入值，并重新建立舞台元件。

一个端口只接一个来源，再接即替换；一个来源可连接多个目标。悬空输入为 0。组合反馈被拒绝。导线交叉不相连。顶部当前模式、左侧当前元件与选定来源会高亮。

## 文件与复现

- `dist/logic-lab.sb3`：推荐使用的初始 NAND 示例，输入均为 0。
- `dist/logic-lab-saved.sb3`：真实 VM 导出并重新加载通过的示例，保留测试时输入状态。
- `dist/project.json`、`src/`：结构与源码；`evidence/editor-test.json`：最新真实交互报告及逐状态数据。
- `evidence/final-stage.png`、`evidence/mobile-stage.png`：桌面和窄屏证据。
- `doc/第一版本测试报告.md`：测试范围、结果和限制。

本机 PowerShell：

```powershell
Set-Location D:\soft\turbowarp-logic-lab
node src/build-project.mjs
node --test tests/*.test.mjs
node scripts/test-editor.mjs
```

依赖只有锁定 JSZip 3.10.1；测试复用旁边 `turbowarp-codex-bridge` 的 Playwright 及浏览器配置，不再安装浏览器或修改 MCP。迁移机器需先配置这些本地测试依赖路径。Node 不在 PATH 时用 `C:\Users\25133\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`。

首次恢复依赖可用现有 pnpm，`install --frozen-lockfile --offline --ignore-scripts --store-dir D:\soft\turbowarp-codex-bridge\.pnpm-store`。Windows 限制可能需要允许 pnpm 创建项目链接、允许测试启动浏览器；仍保留 Chromium 自身沙箱。

## 本版边界

24 格、单比特、组合电路。没有总线、寄存器、封装门、无限画布、三维模式；不能导入原网页的 JSON 存档。线路较多时可能共线或交叉，只以端口引用决定连接。窄屏按比例缩放，建议横屏操作。源码可编辑，SB3 可独立加载到 TurboWarp，无需运行 Node。

本项目没有改动 Codex 配置，也没有新增服务器或后台服务。回滚可使用本地 Git 提交或重新加载旧 SB3；删除本项目不影响原逻辑工坊及 MCP 环境。


## 游戏大厅离线网页版

`web-dist/index.html` 由已有 SB3 和固定版本 TurboWarp Packager 生成，直接离线打开即可；算法、舞台及操作仍由原生积木执行。运行不依赖 TurboWarp 网站。手机可触摸操作。完成操作后自动保存到本机，连线未完成时保留上一份完整存档。损坏存档不会被自动替换。

`node scripts/build-web.mjs` 只生成 web-dist，不覆盖原 SB3；`node scripts/test-web.mjs` 在独立浏览器阻断外网进行真实鼠标、触摸、恢复及错误态验证。测试复用 Bridge 的浏览器工具链，不修改 Bridge 的配置。

大厅接入身份见 game-hub.integration.json，当前资源协议 2、桥协议 1。源仓库保持私有；大厅仅分发 web-dist 内有明确许可的运行资源，不包含开发日志或机器配置。不制作独立 APK。大厅登记与发行进展见 doc/大厅网页接入实施计划.md。
