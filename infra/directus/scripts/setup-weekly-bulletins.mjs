const DIRECTUS_URL = process.env.DIRECTUS_URL || "https://admin.lightoflife.org.nz";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "oyzpeng@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD is required");
  process.exit(1);
}

const jsonHeaders = (token) => ({
  "content-type": "application/json",
  ...(token ? { authorization: `Bearer ${token}` } : {})
});

async function request(path, options = {}) {
  const response = await fetch(`${DIRECTUS_URL}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || body?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${options.method || "GET"} ${path}: ${message}`);
  }
  return body;
}

async function login() {
  const body = await request("/auth/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  return body.data.access_token;
}

async function exists(path, token) {
  try {
    await request(path, { headers: jsonHeaders(token) });
    return true;
  } catch {
    return false;
  }
}

async function createCollection(token) {
  if (await exists("/collections/weekly_bulletins", token)) return;
  await request("/collections", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      collection: "weekly_bulletins",
      meta: {
        collection: "weekly_bulletins",
        icon: "upload_file",
        note: "上传周报 PDF，系统自动解析，审核后发布到前台。",
        singleton: false,
        accountability: "all",
        display_template: "{{title}}",
        translations: [
          { language: "zh-Hans", translation: "周报导入" },
          { language: "zh-Hant", translation: "週報導入" },
          { language: "en-US", translation: "Weekly Bulletin Import" }
        ],
        sort: 9
      },
      schema: { name: "weekly_bulletins" }
    })
  });
  console.log("Created collection: weekly_bulletins");
}

async function createField(token, field) {
  if (await exists(`/fields/weekly_bulletins/${field.field}`, token)) {
    await request(`/fields/weekly_bulletins/${field.field}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ meta: field.meta })
    });
    return;
  }
  await request("/fields/weekly_bulletins", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(field)
  });
  console.log(`Created field: weekly_bulletins.${field.field}`);
}

function input(field, note, width = "half", required = false) {
  return {
    field,
    type: "string",
    meta: { interface: "input", width, note, required },
    schema: { data_type: "varchar", max_length: 255, is_nullable: !required }
  };
}

function text(field, note) {
  return {
    field,
    type: "text",
    meta: { interface: "input-multiline", width: "full", note },
    schema: { data_type: "text", is_nullable: true }
  };
}

function date(field, note) {
  return {
    field,
    type: "date",
    meta: { interface: "datetime", width: "half", note },
    schema: { data_type: "date", is_nullable: true }
  };
}

function integer(field, note) {
  return {
    field,
    type: "integer",
    meta: { interface: "input", width: "half", note },
    schema: { data_type: "integer", is_nullable: true }
  };
}

function datetime(field, note) {
  return {
    field,
    type: "dateTime",
    meta: { interface: "datetime", width: "half", note },
    schema: { data_type: "timestamp with time zone", is_nullable: true }
  };
}

function file(field, note) {
  return {
    field,
    type: "uuid",
    meta: {
      interface: "file",
      special: ["file"],
      width: "full",
      note: `${note}。如果弹出文件库，请点击右上角新增/上传按钮上传 PDF。`
    },
    schema: { data_type: "uuid", is_nullable: true, foreign_key_table: "directus_files", foreign_key_column: "id" }
  };
}

function json(field, note) {
  return {
    field,
    type: "json",
    meta: { interface: "input-code", options: { language: "json" }, width: "full", note },
    schema: { data_type: "json", is_nullable: true }
  };
}

function status() {
  return {
    field: "process_status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      width: "half",
      note: "上传后保持“已上传”。系统解析完成后会改成“等待审核”。检查无误后改成“请求发布”。",
      options: {
        choices: [
          { text: "已上传，等待解析", value: "uploaded" },
          { text: "解析中", value: "parsing" },
          { text: "等待审核", value: "needs_review" },
          { text: "请求发布", value: "publish_requested" },
          { text: "已发布", value: "published" },
          { text: "失败", value: "failed" }
        ]
      }
    },
    schema: { data_type: "varchar", max_length: 32, default_value: "uploaded", is_nullable: false }
  };
}

async function setupFields(token) {
  const fields = [
    input("title", "标题，例如：2026年8月23日周报", "full", true),
    date("bulletin_date", "周报日期"),
    integer("issue_number", "期数"),
    file("pdf_file", "上传周报 PDF"),
    status(),
    text("parsed_summary", "解析预览摘要。请先检查这里，再请求发布。"),
    json("parsed_data", "机器解析后的结构化数据。通常不需要手动修改。"),
    text("raw_text", "PDF 原始文本，方便排查解析问题。"),
    text("error_message", "错误信息"),
    datetime("parsed_at", "解析时间"),
    datetime("published_at", "发布时间"),
    json("published_snapshot", "发布前备份快照")
  ];

  for (const field of fields) await createField(token, field);
}

async function findPolicy(token, name) {
  const data = await request(`/policies?filter[name][_eq]=${encodeURIComponent(name)}`, { headers: jsonHeaders(token) }).catch(() => ({ data: [] }));
  return data.data?.[0] || null;
}

async function ensurePermission(token, policyId, collection, action, fields = ["*"]) {
  const existing = await request(`/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=${collection}&filter[action][_eq]=${action}`, {
    headers: jsonHeaders(token)
  }).catch(() => ({ data: [] }));
  if (existing.data?.length) {
    await request(`/permissions/${existing.data[0].id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ fields })
    });
    return;
  }
  await request("/permissions", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ policy: policyId, collection, action, permissions: {}, validation: {}, presets: null, fields })
  });
}

async function setupRolePermissions(token) {
  for (const name of ["Light of Life Content Editor Policy", "Light of Life Roster Editor Policy", "Light of Life Prayer Editor Policy"]) {
    const policy = await findPolicy(token, name);
    if (!policy) continue;
    await ensurePermission(token, policy.id, "weekly_bulletins", "read");
    await ensurePermission(token, policy.id, "weekly_bulletins", "create");
    await ensurePermission(token, policy.id, "weekly_bulletins", "update");
    await ensurePermission(token, policy.id, "directus_files", "read");
    await ensurePermission(token, policy.id, "directus_files", "create");
    await ensurePermission(token, policy.id, "directus_files", "update");
    await ensurePermission(token, policy.id, "directus_folders", "read");
    await ensurePermission(token, policy.id, "directus_folders", "create");
    await ensurePermission(token, policy.id, "directus_folders", "update");
  }
}

async function main() {
  const token = await login();
  await createCollection(token);
  await setupFields(token);
  await setupRolePermissions(token);
  console.log("Weekly bulletin import collection is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
