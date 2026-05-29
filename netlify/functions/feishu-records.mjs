const FEISHU_TOKEN_URL = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function env(name) {
  return process.env[name] || "";
}

async function getTenantAccessToken() {
  const appId = env("FEISHU_APP_ID");
  const appSecret = env("FEISHU_APP_SECRET");

  if (!appId || !appSecret) {
    throw new Error("缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET 环境变量");
  }

  const response = await fetch(FEISHU_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  });

  const data = await response.json();
  if (!response.ok || data.code !== 0) {
    throw new Error(data.msg || "获取 tenant_access_token 失败");
  }

  return data.tenant_access_token;
}

async function fetchAllRecords(token) {
  const appToken = env("FEISHU_BITABLE_APP_TOKEN");
  const tableId = env("FEISHU_BITABLE_TABLE_ID");
  const viewId = env("FEISHU_BITABLE_VIEW_ID");

  if (!appToken || !tableId) {
    throw new Error("缺少 FEISHU_BITABLE_APP_TOKEN 或 FEISHU_BITABLE_TABLE_ID 环境变量");
  }

  const records = [];
  let pageToken = "";

  do {
    const url = new URL(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    url.searchParams.set("page_size", "100");
    if (pageToken) url.searchParams.set("page_token", pageToken);
    if (viewId) url.searchParams.set("view_id", viewId);

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8"
      }
    });

    const data = await response.json();
    if (!response.ok || data.code !== 0) {
      throw new Error(data.msg || "读取飞书多维表格记录失败");
    }

    records.push(...(data.data?.items || []));
    pageToken = data.data?.page_token || "";
  } while (pageToken);

  return records;
}

function normalizeValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map(normalizeValue).filter(Boolean).join("、");
  }
  if (typeof value === "object") {
    if ("text" in value) return value.text;
    if ("name" in value) return value.name;
    if ("value" in value) return value.value;
    if ("link" in value && "text" in value) return value.text || value.link;
    return JSON.stringify(value);
  }
  return String(value);
}

function normalizeRecord(record) {
  const fields = record.fields || {};
  const normalized = {};
  for (const [key, value] of Object.entries(fields)) {
    normalized[key] = normalizeValue(value);
  }
  return {
    id: record.record_id,
    fields: normalized
  };
}

function pick(fields, keys, fallback = "") {
  for (const key of keys) {
    if (fields[key]) return fields[key];
  }
  return fallback;
}

function normalizeStudent(record) {
  const fields = record.fields || {};
  const progressText = pick(fields, ["进度百分比", "进度", "完成进度"], "0").replace("%", "");
  const progress = Math.max(0, Math.min(100, Number.parseInt(progressText, 10) || 0));
  return {
    id: record.id,
    name: pick(fields, ["学员姓名", "客户名称", "姓名", "学员"], "未命名学员"),
    type: pick(fields, ["客户类型", "类型"], "私教学员 · 年度陪跑"),
    stage: pick(fields, ["当前阶段", "阶段"], "待同步"),
    progress,
    nextAction: pick(fields, ["下一动作", "下一步动作", "本周任务"], "待安排"),
    nextMeeting: pick(fields, ["下次会议时间", "下次会议"], ""),
    status: pick(fields, ["状态", "完成状态"], "coaching"),
    summary: pick(fields, ["摘要", "项目说明", "备注"], ""),
    deliveryUrl: pick(fields, ["交付页链接", "网页链接"], ""),
    wikiUrl: pick(fields, ["知识库链接", "飞书知识库链接", "档案链接"], ""),
    meetingUrl: pick(fields, ["会议纪要链接"], ""),
    missingModules: pick(fields, ["待补齐模块"], "")
  };
}

export async function handler() {
  try {
    const token = await getTenantAccessToken();
    const records = await fetchAllRecords(token);
    return json(200, {
      ok: true,
      source: "feishu-bitable",
      updatedAt: new Date().toISOString(),
      records: records.map(normalizeRecord),
      students: records.map(normalizeRecord).map(normalizeStudent)
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: error.message || "读取飞书数据失败"
    });
  }
}
