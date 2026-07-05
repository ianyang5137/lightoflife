const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://127.0.0.1:8097";
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
  } catch (error) {
    if (String(error.message).includes("Forbidden")) throw error;
    return false;
  }
}

async function createCollection(token, collection, meta = {}) {
  if (await exists(`/collections/${collection}`, token)) {
    console.log(`Collection exists: ${collection}`);
    return;
  }
  await request("/collections", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      collection,
      meta: {
        collection,
        hidden: false,
        singleton: false,
        accountability: "all",
        ...meta
      },
      schema: { name: collection }
    })
  });
  console.log(`Created collection: ${collection}`);
}

async function createField(token, collection, field) {
  if (await exists(`/fields/${collection}/${field.field}`, token)) return;
  await request(`/fields/${collection}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(field)
  });
  console.log(`Created field: ${collection}.${field.field}`);
}

const fields = {
  pages: [
    stringField("slug", "Slug", true),
    stringField("title_zh", "中文标题"),
    stringField("title_en", "English Title"),
    textField("body_zh", "中文内容"),
    textField("body_en", "English Content"),
    stringField("seo_title_zh", "中文 SEO 标题"),
    stringField("seo_title_en", "English SEO Title"),
    textField("seo_description_zh", "中文 SEO 描述"),
    textField("seo_description_en", "English SEO Description"),
    statusField()
  ],
  sermons: [
    stringField("title_zh", "中文标题"),
    stringField("title_en", "English Title"),
    stringField("speaker_zh", "讲员"),
    stringField("speaker_en", "Speaker"),
    dateField("sermon_date", "日期"),
    textField("content_zh", "中文内容"),
    textField("content_en", "English Content"),
    stringField("audio_url", "音频链接"),
    stringField("youtube_url", "YouTube 链接"),
    fileField("cover_image", "封面图"),
    statusField()
  ],
  events: [
    stringField("title_zh", "中文标题"),
    stringField("title_en", "English Title"),
    dateField("event_date", "日期"),
    timeField("start_time", "开始时间"),
    timeField("end_time", "结束时间"),
    stringField("location_zh", "地点"),
    stringField("location_en", "Location"),
    textField("description_zh", "中文描述"),
    textField("description_en", "English Description"),
    fileField("cover_image", "封面图"),
    statusField()
  ],
  prayer_requests: [
    stringField("title_zh", "中文标题"),
    stringField("title_en", "English Title"),
    textField("content_zh", "中文内容"),
    textField("content_en", "English Content"),
    booleanField("is_public", "是否公开"),
    statusField()
  ],
  small_groups: [
    stringField("name_zh", "小组名"),
    stringField("name_en", "Group Name"),
    stringField("leader_zh", "负责人"),
    stringField("leader_en", "Leader"),
    stringField("meeting_time_zh", "时间"),
    stringField("meeting_time_en", "Time"),
    stringField("location_zh", "地点"),
    stringField("location_en", "Location"),
    textField("description_zh", "中文描述"),
    textField("description_en", "English Description"),
    statusField()
  ],
  announcements: [
    stringField("title_zh", "中文标题"),
    stringField("title_en", "English Title"),
    textField("content_zh", "中文内容"),
    textField("content_en", "English Content"),
    dateField("published_date", "发布日期"),
    statusField()
  ],
  gallery: [
    stringField("title_zh", "中文标题"),
    stringField("title_en", "English Title"),
    fileField("image", "图片"),
    stringField("category_zh", "分类"),
    stringField("category_en", "Category"),
    dateField("photo_date", "日期"),
    statusField()
  ],
  languages: [
    stringField("code", "Code", true),
    stringField("name", "Name"),
    booleanField("is_default", "Default")
  ]
};

const collectionMeta = {
  pages: { icon: "article", note: "网站页面内容" },
  sermons: { icon: "campaign", note: "每周讲道、音频与 YouTube 链接" },
  events: { icon: "event", note: "活动日历" },
  prayer_requests: { icon: "volunteer_activism", note: "代祷事项" },
  small_groups: { icon: "groups", note: "小组管理" },
  announcements: { icon: "notifications", note: "公告" },
  gallery: { icon: "photo_library", note: "相册" },
  languages: { icon: "translate", note: "网站语言设置" }
};

function stringField(field, name, required = false) {
  return {
    field,
    type: "string",
    meta: { interface: "input", width: "full", display: "raw", note: name, required },
    schema: { data_type: "varchar", max_length: 255, is_nullable: !required, is_unique: required }
  };
}

function textField(field, name) {
  return {
    field,
    type: "text",
    meta: { interface: "input-rich-text-html", width: "full", note: name },
    schema: { data_type: "text", is_nullable: true }
  };
}

function dateField(field, name) {
  return {
    field,
    type: "date",
    meta: { interface: "datetime", width: "half", note: name },
    schema: { data_type: "date", is_nullable: true }
  };
}

function timeField(field, name) {
  return {
    field,
    type: "time",
    meta: { interface: "datetime", width: "half", note: name },
    schema: { data_type: "time without time zone", is_nullable: true }
  };
}

function booleanField(field, name) {
  return {
    field,
    type: "boolean",
    meta: { interface: "boolean", width: "half", note: name },
    schema: { data_type: "boolean", default_value: false, is_nullable: false }
  };
}

function fileField(field, name) {
  return {
    field,
    type: "uuid",
    meta: {
      interface: "file-image",
      special: ["file"],
      width: "full",
      note: name
    },
    schema: { data_type: "uuid", is_nullable: true, foreign_key_table: "directus_files", foreign_key_column: "id" }
  };
}

function statusField() {
  return {
    field: "status",
    type: "string",
    meta: {
      interface: "select-dropdown",
      width: "half",
      options: {
        choices: [
          { text: "Draft", value: "draft" },
          { text: "Published", value: "published" },
          { text: "Archived", value: "archived" }
        ]
      }
    },
    schema: { data_type: "varchar", max_length: 32, default_value: "draft", is_nullable: false }
  };
}

async function findRole(token, name) {
  const data = await request(`/roles?filter[name][_eq]=${encodeURIComponent(name)}`, { headers: jsonHeaders(token) });
  return data.data?.[0] || null;
}

async function ensureRole(token, name, description) {
  const existing = await findRole(token, name);
  if (existing) return existing;
  const created = await request("/roles", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name, description, icon: name === "Editor" ? "edit" : "visibility" })
  });
  console.log(`Created role: ${name}`);
  return created.data;
}

async function findPolicy(token, name) {
  const data = await request(`/policies?filter[name][_eq]=${encodeURIComponent(name)}`, { headers: jsonHeaders(token) });
  return data.data?.[0] || null;
}

async function ensurePolicy(token, name, description) {
  const existing = await findPolicy(token, name);
  if (existing) return existing;
  const created = await request("/policies", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      name,
      description,
      icon: name.includes("Editor") ? "edit" : "visibility",
      app_access: true,
      admin_access: false,
      enforce_tfa: false
    })
  });
  console.log(`Created policy: ${name}`);
  return created.data;
}

async function ensureAccess(token, roleId, policyId) {
  const existing = await request(`/access?filter[role][_eq]=${encodeURIComponent(roleId)}&filter[policy][_eq]=${encodeURIComponent(policyId)}`, {
    headers: jsonHeaders(token)
  }).catch(() => ({ data: [] }));
  if (existing.data?.length) return;
  await request("/access", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ role: roleId, policy: policyId })
  });
  console.log(`Linked policy to role: ${roleId}`);
}

async function createPermission(token, policy, collection, action, fields = ["*"]) {
  await request("/permissions", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      policy,
      collection,
      action,
      permissions: {},
      validation: {},
      presets: null,
      fields
    })
  }).catch((error) => {
    if (!String(error.message).includes("already exists")) throw error;
  });
}

async function seedLanguages(token) {
  const existing = await request("/items/languages?limit=1", { headers: jsonHeaders(token) }).catch(() => ({ data: [] }));
  if (existing.data?.length) return;
  await request("/items/languages", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify([
      { code: "zh", name: "中文", is_default: true },
      { code: "en", name: "English", is_default: false }
    ])
  });
  console.log("Seeded languages");
}

async function main() {
  const token = await login();
  for (const collection of Object.keys(fields)) {
    await createCollection(token, collection, collectionMeta[collection]);
    for (const field of fields[collection]) {
      await createField(token, collection, field);
    }
  }

  const editor = await ensureRole(token, "Editor", "Can edit pages, announcements, events, sermons and gallery.");
  const viewer = await ensureRole(token, "Viewer", "Read-only website content access.");
  const editorPolicy = await ensurePolicy(token, "Light of Life Editor Policy", "Edit website content collections.");
  const viewerPolicy = await ensurePolicy(token, "Light of Life Viewer Policy", "Read website content collections.");
  await ensureAccess(token, editor.id, editorPolicy.id);
  await ensureAccess(token, viewer.id, viewerPolicy.id);

  const editorCollections = ["pages", "announcements", "events", "sermons", "gallery"];
  for (const collection of Object.keys(fields)) {
    await createPermission(token, viewerPolicy.id, collection, "read");
    if (editorCollections.includes(collection)) {
      for (const action of ["read", "create", "update", "delete"]) {
        await createPermission(token, editorPolicy.id, collection, action);
      }
    } else {
      await createPermission(token, editorPolicy.id, collection, "read");
    }
  }

  await seedLanguages(token);
  console.log("Directus initialization complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
