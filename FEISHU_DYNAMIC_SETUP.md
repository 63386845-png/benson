# 飞书驱动动态页面配置说明

## 目标

把飞书多维表格作为后台数据源，Netlify 网页作为客户前台。你在飞书里更新客户进度、任务、交付物和点评，客户刷新网页即可看到最新状态。

## 需要准备

1. 飞书开放平台自建应用
2. 飞书多维表格
3. Netlify 站点环境变量

## 飞书侧配置

1. 打开飞书开放平台，创建一个企业自建应用。
2. 记录应用的 `App ID` 和 `App Secret`。
3. 给应用添加多维表格读取权限。
4. 将应用发布/安装到你的飞书组织。
5. 打开目标多维表格，确保应用有权限访问这张表。
6. 从多维表格链接中获取：
   - `app_token`，也叫 `base_token`
   - `table_id`
   - 可选：`view_id`

建议多维表格字段。字段名请尽量照抄，网页会优先读取这些字段：

| 字段名 | 说明 |
| --- | --- |
| 学员姓名 | 展示在后台卡片上的名字 |
| 客户类型 | 例如：私教学员 · 年度陪跑 |
| 当前阶段 | 当前推进阶段 |
| 进度百分比 | 0-100 的数字，不需要写百分号 |
| 下一动作 | 下一步要推进的关键动作 |
| 下次会议时间 | 可选，填写后卡片优先展示会议时间 |
| 状态 | `coaching`、`launch`、`done`，多个状态可以用空格隔开 |
| 交付页链接 | 学员专属网页链接 |
| 知识库链接 | 学员飞书知识库链接 |
| 会议纪要链接 | 最近一次会议纪要 |
| 待补齐模块 | 例如：短视频获客、直播获客、朋友圈销转 |
| 摘要 | 一句话说明该学员当前项目 |

## Netlify 侧环境变量

在 Netlify 项目后台找到：

`Project configuration` -> `Environment variables`

新增这些变量：

```txt
FEISHU_APP_ID=你的飞书应用 App ID
FEISHU_APP_SECRET=你的飞书应用 App Secret
FEISHU_BITABLE_APP_TOKEN=你的多维表格 app_token/base_token
FEISHU_BITABLE_TABLE_ID=你的 table_id
FEISHU_BITABLE_VIEW_ID=可选，不填则读取整张表
```

## 页面入口

动态驾驶舱页面：

```txt
/feishu-dashboard.html
```

例如：

```txt
https://你的站点.netlify.app/feishu-dashboard.html
```

## 重要说明

- 飞书 App Secret 不能写在前端网页里，所以本项目用 Netlify Function 作为安全中转。
- tenant_access_token 由后台函数临时获取，不会展示给客户。
- 根据飞书官方接口机制，tenant_access_token 会过期，后台函数每次读取时会重新获取。
- 根据 Netlify 官方说明，函数可以通过环境变量读取密钥，前端页面不会直接暴露这些密钥。

## 参考

- 飞书开放平台多维表格 API：`/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records`
- 飞书访问凭证：`tenant_access_token`
- Netlify Functions 环境变量：Netlify 函数运行时可读取项目环境变量
