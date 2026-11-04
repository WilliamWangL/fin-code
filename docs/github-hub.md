# GitHub / GitLab 产品主页运维清单

这份文件记录 GitHub 上每个「可填写、可索引」的位置该填什么，以及为什么这样填。
所有英文文案可以直接复制粘贴；改完无需重新部署，与 `main` 的代码无关。

配套文件：[README.md](../README.md) 是仓库首屏落地页，[LICENSE](../LICENSE) 是授权声明。

## 1. 仓库 About 区（github.com/WilliamWangL/fin-code → 标题右侧 ⚙️）

**Description**（350 字符上限，前 160 字符会进 Google 摘要，不要换行）：

```
Bank identifier and routing data API. Validate IBANs, resolve SWIFT/BIC, IFSC, CNAPS, UK sort codes, Australian BSB, US ABA routing numbers and card BINs. REST + JSON, 5 official SDKs.
```

**Website**：

```
https://fincode.ecommica.com/en
```

**Topics**（正好 20 个，GitHub 上限；全部小写 + 连字符）：

```
banking-api, fintech, financial-data, iban, iban-validation, swift-code, bic,
ifsc, cnaps, sort-code, aba-routing-number, card-bin, bank-data, bank-directory,
routing-numbers, api, rest-api, sdk, typescript, java
```

要点：Topics 会生成 `github.com/topics/banking-api` 这类聚合页，是 GitHub 上除仓库页以外
唯一能被 Google 单独收录的入口，所以宁可用满 20 个也不要空着。

## 2. Social preview（Settings → Social preview）

- 规格：1280×640（2:1），PNG，小于 1 MB。
- 用途：被 Product Hunt、Slack、X、Discord 转发时的卡片图，同时进 Google 图片索引。
- 仓库内成品：`docs/assets/social-preview.png`（由 1792×1024 生成图裁切到 1280×640）。
- 上传后 GitHub 会缓存，改图后需要在同一页面重新上传才生效。

## 3. Release v1.0.0

4 个 SDK 仓库都打了 `v1.0.0` tag，主仓库却没有 Release，版本叙事是断的。
在仓库右侧 **Releases → Draft a new release**：

- Tag：`v1.0.0`，Target：`main`
- Title：`v1.0.0 — identifier lookups, bank directory, 5 SDKs`

Release notes：

```markdown
First public release of the FinCode platform.

**Data API**
- IBAN validation and bank resolution (`/v1/iban`, `/v1/iban/validate`)
- SWIFT/BIC, IFSC, CNAPS, UK/IE sort code, Australian BSB, US ABA routing and card BIN lookups
- Anonymous identifier lookups (rate limited per IP) and API-key access for directory endpoints
- Bank directory with cursor pagination, slug lookups and branch listings

**Portal**
- Developer accounts, API key management and per-endpoint usage reporting
- Subscription billing with plan entitlements

**Clients**
- TypeScript reference client (`apps/web/public/sdk/fincode.ts`)
- Python, Java, Go and PHP SDKs released as MIT-licensed repositories
```

Release 页是独立可索引 URL，且给外部文章提供了稳定的引用锚点。

## 4. 个人主页（github.com/WilliamWangL）

**Bio**（160 字符上限）：

```
Building FinCode — a global financial data API for IBAN, SWIFT/BIC, IFSC, CNAPS, sort codes, BSB, ABA routing numbers and card BINs.
```

**Pinned repositories**（Home → Customize your pins，固定 6 个，顺序如下）：

1. `fin-code` — 主仓库
2. `fincode-python`
3. `fincode-java`
4. `fincode-go`
5. `fincode-php`
6. `bank-data`（如果有可读内容）

`devtools`、`deals`、`river-ad-workspace`、`blog` 不要 pin —— 它们和 FinCode 无关，
会把主页的品牌信号稀释掉。

> 中期选项：建 GitHub Organization `fincode`，把 5 个仓库迁过去，主页变成 `github.com/fincode`，
> 与产品名完全一致。迁移会改动 `go get` 路径、Maven groupId、`apps/web/src/lib/docs.ts`
> 里的 `SDK_REPOS` 常量，属于一次性的集中改动，排在 P2。

## 5. 四个 SDK 仓库统一模板

对 `fincode-python` / `-java` / `-go` / `-php` 分别执行：

**README 第一行**（关键词放在 H1 里，这是最容易被搜索引擎抓到的位置）：

```markdown
# FinCode {Language} SDK — IBAN validation, SWIFT/BIC, IFSC, CNAPS, sort code, ABA routing and BIN lookup
```

**README 必须有的四段**：安装命令、5 行可运行的示例、端点列表（链接回
`https://fincode.ecommica.com/en/docs/api-reference`）、主仓库链接
（`https://github.com/WilliamWangL/fin-code`）。

**About 区**（每个仓库都填，缺一不可）：

- Description：`Official FinCode {Language} client — bank identifier and routing data API (IBAN, SWIFT/BIC, IFSC, CNAPS, sort code, ABA routing, card BIN).`
- Website：`https://fincode.ecommica.com/en/docs/sdks`
- Topics：`banking-api, fintech, iban, swift-code, ifsc, sdk, {language}`

## 6. GitLab 镜像

镜像只为了多一个独立域名下的产品页和一个代码搜索入口，不参与 CI。

一次性设置：

1. GitLab 建空仓库（不要初始化 README），例如 `WilliamWangL/fin-code`。
2. 生成一对专用 SSH key，把公钥加到 GitLab 的 Deploy Key，勾选 **Write access**。
3. GitHub 仓库 Settings → Secrets and variables → Actions：
   - Secret `GITLAB_SSH_PRIVATE_KEY`：上面私钥的完整内容
   - Variable `GITLAB_REPO`：`git@gitlab.com:WilliamWangL/fin-code.git`
4. 首次手动触发 `Mirror to GitLab` workflow 验证。

之后每次 push 到 `main` 都会镜像全部分支和 tag。GitLab 仓库页的 Description / Website /
Topics 用第 1 节同一套文案填一遍（GitLab 也支持 Topics，最多 20 个）。

注意：镜像会复制整个提交历史，包括 `.env.example` 里的任何内容 —— 所以泄露类问题
必须在**推送到 GitHub 之前**修好，事后清理历史成本极高。

## 7. 上线后 30 天的验收

| 指标 | 看哪里 | 合格线 |
| --- | --- | --- |
| 外部引荐站点 | 仓库 → Insights → Traffic → Referring sites | ≥3 个非 GitHub 域名 |
| 官网 referral | GA4 → 获取 → 流量获取 → 来源 `github.com` | 会话数持续非零 |
| 关键词可见性 | Google 搜 `bank routing number api github`、`ifsc api python` | 进前 3 页 |
| 仓库页质量 | 页面首屏是否 3 秒内说清「这是什么 API」 | 陌生人能复述 |
| SDK 一致性 | 4 个仓库 Description/Website/Topics 是否齐全 | 100% |

## 8. 不要做的事

- 不要改仓库名去堆关键词（`fincode-bank-iban-swift-ifsc-api` 会被当成 spam，
  而且会打断 4 个 SDK 文档里的链接）；关键词交给 Description、Topics 和 README。
- 不要在 README 里放一排徽章却没有内容 —— 这是最典型的低质仓库特征。
- 不要把 Website 字段指向一个 301 或 404 的地址。
- 不要在提 PR 到 awesome list 时同时改 5 个列表 —— 会触发 GitHub 的刷量判定，
  一周一个，并附上真实的使用说明。
