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

export async function handler() {
  try {
    const token = await getTenantAccessToken();
    const records = await fetchAllRecords(token);
    return json(200, {
      ok: true,
      source: "feishu-bitable",
      updatedAt: new Date().toISOString(),
      records: records.map(normalizeRecord)
    });
  } catch (error) {
    return json(500, {
      ok: false,
      message: error.message || "读取飞书数据失败"
    });
  }
}
