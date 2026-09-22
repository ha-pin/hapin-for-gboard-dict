# Hapin for Gboard

把 Hapin 哈萨克语词库转换为可导入 Google Gboard 的个人字典：

- `u` 开头：输入阿拉伯文字的哈萨克语；
- `v` 开头：输入西里尔文字的哈萨克语；
- emoji：同一助记码同时支持 `u`、`v` 两种前缀。
- 仅在 Gboard 简体中文（`zh-CN`）或繁体中文（`zh-TW`）键盘下生效；
- 两种中文语言分别打包，不会混在同一个 TXT 或 ZIP 中。

词库来源于 [`ha-pin/rime-cloverpinyin`](https://github.com/ha-pin/rime-cloverpinyin/tree/master/src)，固定在提交 `27d3cab2b02b39857fe872c9a3b5bbbd9122f597`。本仓库通过 GitHub Releases 提供可导入文件，并保留可重复构建脚本和上游原始数据。

## 下载

| 适用键盘 | Gboard 导入包 | 纯文本词典 |
| --- | --- | --- |
| 简体中文（`zh-CN`） | [`PersonalDictionary-hapin-zh-CN.zip`](https://github.com/ha-pin/hapin-for-gboard-dict/releases/latest/download/PersonalDictionary-hapin-zh-CN.zip) | [`dictionary-zh-CN.txt`](https://github.com/ha-pin/hapin-for-gboard-dict/releases/latest/download/dictionary-zh-CN.txt) |
| 繁体中文（`zh-TW`） | [`PersonalDictionary-hapin-zh-TW.zip`](https://github.com/ha-pin/hapin-for-gboard-dict/releases/latest/download/PersonalDictionary-hapin-zh-TW.zip) | [`dictionary-zh-TW.txt`](https://github.com/ha-pin/hapin-for-gboard-dict/releases/latest/download/dictionary-zh-TW.txt) |

通常只需下载 ZIP。TXT 用于检查内容或供其他工具二次转换。每个语言包包含 8,692 条去重记录。

## 安装

1. 从上表或[最新 Release](https://github.com/ha-pin/hapin-for-gboard-dict/releases/latest) 下载需要的文件，不要解压：
   - 简体中文使用 `PersonalDictionary-hapin-zh-CN.zip`；
   - 繁体中文使用 `PersonalDictionary-hapin-zh-TW.zip`；
   - 两种键盘都需要时，分别下载并导入两个 ZIP。
2. 确保 Gboard 已添加对应的中文键盘，再打开 **Gboard 设置 → 字典 → 个人字典 → 所有语言**。
3. 点右上角三点菜单，选择 **导入**，然后选择对应 ZIP。每个文件只包含文件名所示的一个语言标签。
4. 切换到对应中文键盘的拼音等英文字母布局，输入完整快捷码，在候选栏选择对应文字或 emoji；其他语言键盘不会使用这些词条。

部分 Gboard/Android 版本会把菜单翻译为“单词列表”。若文件选择器单击 ZIP 没有反应，可尝试长按文件后选择“打开”。不要重复导入同一个 ZIP；Gboard 不会自动去重已经存在的个人字典记录。

示例：

| 输入 | 输出 | 类型 |
| --- | --- | --- |
| `usalyemyetsez` | `سالەمەتسىز` | 阿拉伯哈萨克文 |
| `vsalyemyetsez` | `сәлеметсіз` | 西里尔哈萨克文 |
| `ujurek` / `vjurek` | `❤` | emoji |
| `ualma` / `valma` | `🍎`、`🍏` | emoji 候选 |

> [!NOTE]
> 这是 Gboard 的“个人字典快捷短语”方案，不是对闭源 Gboard 输入引擎的修改。通常要输入完整编码后从候选栏选择结果；候选排序和一次显示多少个同码词由 Gboard 决定。

## 更新或删除已导入词典

Gboard 不保存导入批次信息，也没有按 ZIP 整批卸载的功能。直接导入新版不会替换旧版，反而可能产生重复记录。

- 删除少量词条：进入 **Gboard 设置 → 字典 → 个人字典 → 简体中文/繁体中文**，打开词条后点垃圾桶。
- 删除整套词典：先导出需要保留的个人词条，再进入 Android **设置 → 应用 → Gboard → 存储和缓存 → 清除存储空间/清除应用数据**。这会同时清除 Gboard 的其他个人词条、学习记录和偏好设置，之后需要重新配置 Gboard。
- **删除已学习的字词** 只针对 Gboard 从输入行为中学习的内容，不应当作导入词典的卸载功能。

若只是从单一中文包切换到另一中文包，仍建议先清除旧词条，再导入目标 ZIP。

## 重新构建

需要 Node.js 22 与 pnpm：

```sh
pnpm install --frozen-lockfile
make build
make typecheck test
```

默认分别生成两套互不混合的文件：

- `dist/dictionary-zh-CN.txt`：仅含简体中文语言标签的 Gboard v2 UTF-8 TSV；
- `dist/PersonalDictionary-hapin-zh-CN.zip`：简体中文导入包；
- `dist/dictionary-zh-TW.txt`：仅含繁体中文语言标签的 Gboard v2 UTF-8 TSV；
- `dist/PersonalDictionary-hapin-zh-TW.zip`：繁体中文导入包。

每个 ZIP 根目录内都只有 Gboard 要求的 `dictionary.txt`，内容与同语言的外部 TXT 完全一致。

`dist/` 是本地构建目录，已被 Git 忽略。每次提交或合并到 `main` 后，[GitHub Actions](.github/workflows/release.yml) 会重新构建并测试词库，以 `build-<运行编号>` 标签创建 Release，上传两套 ZIP、两份 TXT 和 `SHA256SUMS`。

默认分别构建 `zh-CN`（简体中文）和 `zh-TW`（繁体中文），因此只在这两种 Gboard 中文键盘下生效，不会污染其他语言的候选。每个语言标签始终生成独立文件。

如需改为其他单一语言，可运行：

```sh
pnpm build --language-tag kk
```

也可以重复参数，绑定多个语言：

```sh
pnpm build --language-tag zh-CN --language-tag zh-TW
```

## 更新上游词库

先检出上游仓库并核对希望采用的提交，再运行：

```sh
pnpm sync-upstream /path/to/rime-cloverpinyin
make build test
```

更新时也应同步修改 `scripts/sync_upstream.ts` 中的 `UPSTREAM_COMMIT`。来源、提交号及每个 vendored 文件的 SHA-256 记录在 [`vendor/rime-cloverpinyin/UPSTREAM.txt`](vendor/rime-cloverpinyin/UPSTREAM.txt)。

## 数据与许可

转换脚本和本项目按根目录 [`LICENSE`](LICENSE) 的 GPL-3.0 发布。上游 Hapin 数据的许可副本位于 [`vendor/rime-cloverpinyin/LICENSE`](vendor/rime-cloverpinyin/LICENSE)，详细归属见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
