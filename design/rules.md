# 设备信息展示页 · 业务规则

| 项目 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 生效日期 | 2026-11-05 |
| 对应页面 | `device-info/index.html` |
| 适用范围 | PC / 移动端浏览器中打开该页面的所有场景 |
| 文档定位 | 定义「展示哪些设备信息、值怎么算、算不出来怎么显示、怎么交互」 |

---

## 1. 目标与范围

### 1.1 页面目标

1. 打开即展示当前访问终端与浏览器的真实运行时信息，无需任何配置或网络请求。
2. 所有指标必须在**浏览器本地**读取、计算、渲染，不依赖后端接口。
3. 在同一页面内可完成「查看 → 复制 → 导出」，便于用户反馈问题或填写兼容性记录。
4. 任何无法读取的字段，必须给出明确的可解释状态，不允许出现空白、`undefined`、`NaN` 或原生报错。

### 1.2 本期范围（In Scope）

- 7 个信息卡片：设备概览、屏幕与显示、浏览器环境、硬件与电源、网络、存储、能力检测。
- 顶部汇总条：连接状态、设备、系统、浏览器、视口。
- 3 个操作：重新读取、导出 JSON、复制报告。

### 1.3 不在本期范围（Out of Scope）

- 不做用户身份识别、不做设备指纹（Fingerprint）持久化。
- 不做服务端上报、埋点、日志回传。
- 不做历史趋势对比、不做多设备聚合看板。
- 不调用摄像头/麦克风/定位，仅查询其**授权状态**与**设备数量**。

---

## 2. 术语

| 术语 | 含义 |
| --- | --- |
| 同步数据 | 页面首帧渲染即可读取的字段，来自 `navigator` / `screen` / `window` 同步属性 |
| 异步数据 | 需要 Promise 或事件回调返回的字段，如电池、存储配额、权限状态 |
| 派生值 | 不是直接 API 返回值，而是由多条原始信息推断得出（如设备类型、操作系统） |
| 降级 | 因浏览器不支持或权限受限，字段无法取得真实值时的替代展示 |
| 不可用 | 统一的降级文案，表示「当前环境无法读取该信息」，与「值为 0」严格区分 |

---

## 3. 数据项规则总表

### 3.1 设备概览

| 字段 | 数据来源 | 取值规则 | 降级规则 |
| --- | --- | --- | --- |
| 设备类型 | UA + `navigator.maxTouchPoints` + `screen` 短边 | 见 §4.1 判定顺序 | 无法判定时回落「桌面」 |
| 操作系统 | `navigator.userAgent` 正则 | 见 §4.2，带主版本号 | 匹配全部失败 → 「未知系统」 |
| 平台标识 | `navigator.platform`，其次 `userAgentData.platform` | 原样输出 | 均为空 → 「不可用」 |
| 指令集架构 | `userAgentData.getHighEntropyValues()` 的 `architecture` + `bitness` | 拼接为 `x86 64 位` | API 不存在 → 「不可用（浏览器不支持）」 |
| 设备型号 | 同上，取 `model` | 原样输出（多为 Android 机型） | Chromium 桌面端通常为空 → 「不可用」 |
| 系统语言 | `navigator.language`，其次 `languages[0]` | 输出 BCP 47 标签，如 `zh-CN` | 全空 → 「不可用」 |
| 所在时区 | `Intl.DateTimeFormat().resolvedOptions().timeZone` + UTC 偏移 | 格式 `Asia/Shanghai (UTC+08:00)` | 取值异常 → 「不可用」 |

### 3.2 屏幕与显示

| 字段 | 数据来源 | 取值规则 | 降级规则 |
| --- | --- | --- | --- |
| 屏幕分辨率 | `screen.width` / `screen.height` | `1920 × 1080 px`，乘法符号两侧各一空格 | 不降级（恒有值） |
| 可用屏幕区域 | `screen.availWidth` / `availHeight` | 同上，扣除任务栏/系统栏 | 同上 |
| 浏览器视口 | `innerWidth` / `innerHeight` | 同上；窗口尺寸变化时实时更新 | 同上 |
| 像素比 DPR | `window.devicePixelRatio` | 保留 2 位小数，后缀 `×` | 取不到时按 `1.00 ×` |
| 色彩深度 | `screen.colorDepth` | 整数 + ` 位` | 取不到时按 24 位 |
| 屏幕方向 | `screen.orientation.type` | `landscape*` → 横向；`portrait*` → 纵向 | API 缺失时按视口宽高比推断 |

### 3.3 浏览器环境

| 字段 | 数据来源 | 取值规则 | 降级规则 |
| --- | --- | --- | --- |
| 浏览器 | UA 正则 + `fullVersionList` 校正 | 浏览器名 + **主版本号**，如 `Chrome 141` | 全部不匹配 → 「未知浏览器」 |
| 渲染内核 | UA 特征 | Blink / Gecko / WebKit / Trident | 「不可用」 |
| 触控点数 | `navigator.maxTouchPoints` | 整数 + ` 点`，无触控显示 `0 点` | 按 0 处理 |
| Cookie 可用 | `navigator.cookieEnabled` | 可用 → 绿色「可用」；禁用 → 红色「已禁用」 | 不降级 |
| User Agent | `navigator.userAgent` | 完整原文，单行展示，允许自动换行 | 不降级 |

### 3.4 硬件与电源

| 字段 | 数据来源 | 取值规则 | 降级规则 |
| --- | --- | --- | --- |
| 逻辑核心数 | `navigator.hardwareConcurrency` | 整数 + ` 核` | 「不可用」 |
| 设备内存 | `navigator.deviceMemory` | 整数 + ` GB（近似）`；取值被浏览器取整为 0.25/0.5/1/2/4/8 | 「不可用」 |
| 显卡 / 渲染器 | WebGL `WEBGL_debug_renderer_info` → `UNMASKED_RENDERER_WEBGL`，否则 `gl.RENDERER` | 去空格原样输出，长文本整行展示 | WebGL 不可用 → 「不可用」 |
| WebGL 版本 | 依次尝试 `webgl2`、`webgl` | `WebGL 2 / WebGL 1` 并列输出 | 均失败 → 「不支持」 |
| 电池电量 | `navigator.getBattery()` 的 `level` | 百分比整数，如 `86%` | API 不存在或被拒绝 → 「不可用」 |
| 充电状态 | 同上，`charging` | 充电中（绿色）/ 未充电 | 「不可用」 |

### 3.5 网络

| 字段 | 数据来源 | 取值规则 | 降级规则 |
| --- | --- | --- | --- |
| 连接状态 | `navigator.onLine` | 在线（绿色）/ 离线（红色） | 不降级；`online`/`offline` 事件触发时实时刷新 |
| 有效连接类型 | `navigator.connection.effectiveType` | 转大写：`4G` / `3G` / `2G` / `SLOW-2G` | 无 `connection` 对象 → 「不可用」 |
| 下行带宽估算 | `connection.downlink` | 一位小数 + ` Mbps（估算）` | 「不可用」 |
| 往返延迟 RTT | `connection.rtt` | 整数 + ` ms` | 「不可用」 |
| 省流量模式 | `connection.saveData` | 已开启 / 关闭 | 「不可用」 |

### 3.6 存储

| 字段 | 数据来源 | 取值规则 | 降级规则 |
| --- | --- | --- | --- |
| 存储配额 | `navigator.storage.estimate().quota` | 自动换算单位（B/KB/MB/GB/TB），非字节级保留 1 位小数 | API 缺失 → 「不可用」 |
| 已用空间 | 同上，`usage` | 同上 | 「不可用」 |
| 占用比例 | `usage / quota` | 百分比保留 1 位小数；小于 0.1% 显示 `< 0.1 %` | 配额为 0 或异常 → 「不可用」 |

### 3.7 能力检测

| 字段 | 判定方式 | 输出 |
| --- | --- | --- |
| WebAssembly | `typeof WebAssembly === 'object'` | 支持 / 不支持 |
| Service Worker | `'serviceWorker' in navigator` | 支持 / 不支持 |
| IndexedDB | `!!window.indexedDB` | 支持 / 不支持 |
| 异步剪贴板 | `navigator.clipboard?.writeText` 存在 | 支持 / 不支持 |
| Web Share | `!!navigator.share` | 支持 / 不支持 |
| 全屏 API | `document.fullscreenEnabled` 或 webkit 前缀 | 支持 / 不支持 |
| 地理位置权限 | `navigator.permissions.query({name:'geolocation'})` | 已授权 / 已拒绝 / 未决定 |
| 通知权限 | 同上，`name:'notifications'` | 已授权 / 已拒绝 / 未决定 |

> 说明：能力检测只判断「接口是否存在」，不代表功能一定可用（例如 HTTPS 缺失时剪贴板接口存在但调用会失败）。

---

## 4. 派生判定规则

### 4.1 设备类型

按以下顺序**短路判定**，命中即停止：

1. UA 含 `iPad` → **平板**
2. UA 含 `Tablet` / `PlayBook` / `Silk` → **平板**
3. UA 含 `iPhone` / `iPod` → **手机**
4. UA 同时含 `Android` 与 `Mobile` → **手机**
5. 触控点数 > 0 且屏幕短边 ≥ 600px → **平板**
6. 触控点数 > 0 且屏幕短边 < 600px → **手机**
7. 其余 → **桌面**

> 补充：触控判定同时接受 `'ontouchstart' in window` 作为「有触控能力」的兜底信号，用于覆盖 `maxTouchPoints` 缺失的老浏览器。

### 4.2 操作系统

按顺序匹配，命中即停止：

| 序号 | 匹配特征 | 输出 |
| --- | --- | --- |
| 1 | `Windows NT 10.0` | Windows 10 / 11 |
| 2 | `Windows NT 6.3` | Windows 8.1 |
| 3 | `Windows NT 6.1` | Windows 7 |
| 4 | 含 `Windows` | Windows |
| 5 | `Android x.y` | Android + 版本号 |
| 6 | `iPhone OS x_y` | iOS + 版本号（`_` 还原为 `.`） |
| 7 | `iPad; CPU OS x_y` | iPadOS + 版本号 |
| 8 | `Mac OS X x_y_z` | macOS + 版本号 |
| 9 | `CrOS` | ChromeOS |
| 10 | `Ubuntu` / `Linux` | Ubuntu / Linux |
| 11 | 全部失败 | 未知系统 |

> Windows 10 与 11 的 UA 均为 `Windows NT 10.0`，无法用 UA 区分，因此合并展示。

### 4.3 浏览器

匹配优先级（避免 Edge/Opera 被误判为 Chrome）：

`Edg` → `OPR` → `Firefox` → `MicroMessenger` → `QQBrowser` → `UCBrowser` → `Chrome` → `Safari (Version/)` → `Safari` → 未知浏览器

### 4.4 渲染内核

- UA 含 `AppleWebKit` 且含 `Chrome` / `Edg` / `OPR` → **Blink**
- UA 含 `Gecko/` 且含 `Firefox` → **Gecko**
- UA 含 `AppleWebKit` → **WebKit**
- UA 含 `Trident` → **Trident**

### 4.5 屏幕方向

1. 优先使用 `screen.orientation.type`，含 `landscape` → 横向，含 `portrait` → 纵向。
2. 该 API 缺失时，用 `innerWidth >= innerHeight` 判断，成立为横向，否则纵向。

---

## 5. 展示规则

### 5.1 布局与顺序

1. 卡片顺序固定：设备概览 → 屏幕与显示 → 浏览器环境 → 硬件与电源 → 网络 → 存储 → 能力检测。
2. 卡片采用自适应网格，最小列宽 320px，窗口变宽时自动增列，不改变卡片内部顺序。
3. 卡片内字段顺序固定，与 §3 各表顺序一致。
4. 顶部汇总条固定在页头下方，始终可见；页面滚动时页头吸顶（sticky）。

### 5.2 格式规范

| 规则 | 说明 |
| --- | --- |
| 尺寸 | `宽 × 高 px`，使用 `×`，两侧各一个空格 |
| 数值单位 | 数值与单位之间一个空格，如 `8 核`、`16 GB（近似）` |
| 布尔状态 | 统一为肯定/否定短语（支持/不支持、在线/离线、可用/已禁用），不出现 `true`/`false` |
| 长文本 | User Agent、显卡型号等超长值使用整行展示（标签在上、值在下），允许任意位置断行 |
| 空值占位 | 加载中显示 `…`；加载完成无值显示 `不可用` |
| 禁止内容 | 不出现 `undefined`、`null`、`NaN`、`[object Object]`、原生异常堆栈 |

### 5.3 颜色语义

| 状态 | 颜色 | 使用场景 |
| --- | --- | --- |
| 正常 / 肯定 | 绿色 | 在线、Cookie 可用、充电中 |
| 异常 / 否定 | 红色 | 离线、Cookie 已禁用 |
| 标志性标签 | 蓝色胶囊 | 设备类型 |
| 缺失 | 浅灰 | 所有「不可用」 |

> 同一字段的语义色只在状态明确时使用；「不可用」一律使用中性灰，不使用红色，避免被误解为故障。

### 5.4 实时更新规则

| 触发事件 | 更新字段 |
| --- | --- |
| `window.resize` | 浏览器视口、屏幕方向、汇总条视口 |
| `window.online` / `window.offline` | 连接状态、页头状态点与状态文本 |
| 电池 `levelchange` / `chargingchange` | 电池电量、充电状态 |
| 点击「重新读取」 | 全部字段重算并重绘，生成时间刷新 |

---

## 6. 降级与权限规则

1. **先渲染后补全**：同步字段在首帧立即显示；异步字段先占位 `…`，最多 3 秒内返回真实值或降级为「不可用」。
2. **失败不阻塞**：任一异步接口（电池、存储、权限、UA-CH）失败或被拒绝，只影响自身字段，其余卡片照常渲染。
3. **不做权限请求**：页面不主动弹出定位、通知、摄像头授权框，只读取 `navigator.permissions.query` 的既有状态。
4. **不做设备枚举详情**：`enumerateDevices` 仅在内部统计摄像头/麦克风数量，不展示设备名称与 ID。
5. **安全上下文限制**：`navigator.clipboard`、`serviceWorker`、`getHighEntropyValues` 等在非 HTTPS（file:// 除外）环境下可能不可用，此时按「不可用 / 不支持」展示，不视为缺陷。
6. **浏览器差异**：Firefox 已移除 `getBattery`、Safari 不支持 `deviceMemory` 与 `connection`，均属预期降级。

---

## 7. 隐私与安全规则

1. **零上传**：页面不发起任何网络请求，不加载第三方统计、字体或 CDN 资源。
2. **零持久化**：不使用 Cookie、localStorage、sessionStorage、IndexedDB 保存任何采集结果。
3. **本地生成**：复制与导出动作全部在浏览器内存中完成，导出文件由用户本地保存。
4. **最小化采集**：不读取剪贴板内容、不读取摄像头画面、不读取本地文件、不解析设备唯一标识。
5. **可核对性**：页面底部明确声明「信息由浏览器本地实时读取，不经过服务器」，保证告知透明。

---

## 8. 兼容性与验收标准

### 8.1 兼容性基线

| 环境 | 预期表现 |
| --- | --- |
| Chrome / Edge 最新版（桌面） | 全部字段可用（UA-CH 提供架构与型号） |
| Safari 17+（macOS / iOS） | 架构、型号、内存、连接类型为「不可用」，其余正常 |
| Firefox 最新版 | 电池、内存、连接类型为「不可用」，其余正常 |
| Android Chrome | 设备型号有值，触控点数 > 0，设备类型判定为手机 |
| 微信内置浏览器 | 浏览器字段显示「微信内置浏览器」，其余按内核能力降级 |
| 视口宽度 375px | 卡片单列纵向排列，文字不溢出、不横向滚动 |

### 8.2 验收用例

| 编号 | 场景 | 预期结果 |
| --- | --- | --- |
| AC-01 | 首次打开页面 | 首帧内 6 张以上卡片可见，异步字段显示 `…`，1 秒内补全为真实值或「不可用」 |
| AC-02 | 任意浏览器全量扫描 | 页面中不出现 `undefined` / `NaN` / `null` / `[object Object]` |
| AC-03 | 拉伸窗口宽度 | 视口尺寸与汇总条同步更新，卡片列数随宽度变化 |
| AC-04 | 断网后恢复 | 状态点变红显示「离线」，恢复后变绿显示「在线」，无需刷新页面 |
| AC-05 | 点击「复制报告」 | 剪贴板得到结构化 JSON，含生成时间与各卡片分组；无权限时降级为 `execCommand` 并提示成功 |
| AC-06 | 点击「导出 JSON」 | 下载 `device-info-YYYYMMDD-HHmm.json`，内容与复制结果一致 |
| AC-07 | 点击「重新读取」 | 所有数值重算，底部生成时间更新为当前时刻 |
| AC-08 | 拒绝定位/通知权限后访问 | 对应字段显示「已拒绝」，页面无报错 |
| AC-09 | 移动端横竖屏切换 | 屏幕方向字段随之切换为横向/纵向 |
| AC-10 | 页面离线打开（file://） | 除需要安全上下文的字段降级外，页面正常渲染与导出 |

### 8.3 质量红线

1. 控制台无未捕获异常（Uncaught Error）。
2. 单文件自包含，不依赖任何外部资源，断网可完整运行。
3. 首屏渲染时间在普通 PC 上低于 200ms。
4. 380px 窄屏下无横向滚动条。

---

## 9. 已知限制

| 限制 | 原因 | 影响 |
| --- | --- | --- |
| 无法区分 Windows 10 与 11 | UA 均为 `Windows NT 10.0` | 合并展示 |
| 设备内存为近似值 | 规范要求浏览器取整并做隐私模糊 | 只能作为量级参考 |
| 电池信息在部分浏览器缺失 | Firefox 已移除 `getBattery` | 显示「不可用」 |
| 桌面端型号为空 | UA-CH 仅在移动端提供 `model` | 显示「不可用」 |
| 连接类型为估算值 | `downlink` / `rtt` 由浏览器粗略测算 | 仅供参考，不作测速依据 |
| 权限状态可能滞后 | `permissions.query` 返回缓存状态 | 以实际调用结果为准 |

---

## 10. 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
| --- | --- | --- | --- |
| v1.0 | 2026-11-05 | 首版：定义 7 个卡片、40 项字段的采集与展示规则，明确降级、隐私与验收标准 | — |
