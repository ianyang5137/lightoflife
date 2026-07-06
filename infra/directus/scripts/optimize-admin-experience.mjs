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

async function createCollection(token, collection, meta = {}) {
  if (await exists(`/collections/${collection}`, token)) return;
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

function field(field, type, dataType, meta = {}, schema = {}) {
  return {
    field,
    type,
    meta,
    schema: { data_type: dataType, is_nullable: true, ...schema }
  };
}

const input = (name, note, width = "half", required = false) => field(name, "string", "varchar", {
  interface: "input",
  width,
  note,
  required
}, { max_length: 255, is_nullable: !required });

const text = (name, note) => field(name, "text", "text", {
  interface: "input-multiline",
  width: "full",
  note
});

const bool = (name, note, defaultValue = true) => field(name, "boolean", "boolean", {
  interface: "boolean",
  width: "half",
  note
}, { default_value: defaultValue, is_nullable: false });

const integer = (name, note, defaultValue = 0) => field(name, "integer", "integer", {
  interface: "input",
  width: "half",
  note
}, { default_value: defaultValue, is_nullable: false });

const datetime = (name, note) => field(name, "dateTime", "timestamp with time zone", {
  interface: "datetime",
  width: "half",
  note
});

const image = (name, note) => field(name, "uuid", "uuid", {
  interface: "file-image",
  special: ["file"],
  width: "half",
  note
}, { foreign_key_table: "directus_files", foreign_key_column: "id" });

const status = () => field("status", "string", "varchar", {
  interface: "select-dropdown",
  width: "half",
  options: {
    choices: [
      { text: "发布", value: "published" },
      { text: "草稿", value: "draft" },
      { text: "隐藏", value: "archived" }
    ]
  },
  note: "普通同工如果不确定，请保持“发布”。"
}, { max_length: 32, default_value: "published", is_nullable: false });

const translations = (zh, en) => [
  { language: "zh-Hans", translation: zh },
  { language: "zh-Hant", translation: zh },
  { language: "en-US", translation: en }
];

async function setupCollections(token) {
  await createCollection(token, "homepage_announcements", {
    icon: "campaign",
    singleton: true,
    note: "首页顶部深绿色预告条。",
    translations: translations("顶部预告", "Top Announcement"),
    sort: 2
  });
  for (const item of [
    input("label_zh", "左侧小标题，例如：中區禱告會"),
    input("label_en", "English label"),
    input("headline_zh", "主要内容，例如：8月4日（週二）晚上 7:30–9:00"),
    input("headline_en", "English headline"),
    input("detail_zh", "补充说明，例如：將在本教會舉行"),
    input("detail_en", "English detail"),
    input("cta_zh", "按钮文字，例如：了解詳情"),
    input("cta_en", "Button text"),
    input("url", "点击后打开的链接，可以是 #updates 或完整网址", "full"),
    bool("visible", "是否显示顶部预告", true),
    status()
  ]) await createField(token, "homepage_announcements", item);

  await createCollection(token, "gathering_items", {
    icon: "event_available",
    note: "首页“聚会时间”三张卡片。逐条编辑，不需要改 JSON。",
    translations: translations("聚会时间卡片", "Gathering Cards"),
    sort: 3,
    sort_field: "sort_order",
    display_template: "{{title_zh}}"
  });
  for (const item of [
    input("title_zh", "中文名称，例如：主日崇拜", "half", true),
    input("title_en", "English title"),
    input("time_zh", "中文时间，例如：每週日下午 3:30"),
    input("time_en", "English time"),
    text("description_zh", "中文简介"),
    text("description_en", "English description"),
    image("image_file", "上传图片。建议 1200×800 或 1600×900。"),
    input("image_path", "旧图片路径兜底，例如 /assets/images/sunday-worship.jpg"),
    integer("sort_order", "排序，数字越小越靠前"),
    status()
  ]) await createField(token, "gathering_items", item);

  await createCollection(token, "message_settings", {
    icon: "smart_display",
    singleton: true,
    note: "主日信息卡片文字和 YouTube 频道按钮。",
    translations: translations("主日信息设置", "Message Settings"),
    sort: 4
  });
  for (const item of [
    input("title_zh", "中文标题，例如：主日信息"),
    input("title_en", "English title"),
    text("description_zh", "中文说明"),
    text("description_en", "English description"),
    input("button_zh", "中文按钮文字，例如：在線觀看"),
    input("button_en", "Button text"),
    input("youtube_url", "YouTube 频道链接", "full"),
    status()
  ]) await createField(token, "message_settings", item);

  await createCollection(token, "youtube_latest", {
    icon: "live_tv",
    singleton: true,
    note: "自动同步出来的最新 YouTube 视频。普通同工只看，不需要手动修改。",
    translations: translations("最新 YouTube 视频", "Latest YouTube Video"),
    sort: 5
  });
  for (const item of [
    input("video_id", "YouTube 视频 ID"),
    input("title", "视频标题"),
    datetime("published_at", "发布时间"),
    input("url", "观看链接", "full"),
    input("embed_url", "嵌入链接", "full"),
    input("thumbnail_url", "封面图链接", "full"),
    datetime("synced_at", "最后同步时间"),
    status()
  ]) await createField(token, "youtube_latest", item);

  await createCollection(token, "bible_readings", {
    icon: "menu_book",
    singleton: true,
    note: "线上读经入口、经文和 Zoom 信息。",
    translations: translations("线上读经", "Online Bible Reading"),
    sort: 6
  });
  for (const item of [
    input("title_zh", "中文标题，例如：線上讀經"),
    input("title_en", "English title"),
    input("time_zh", "中文时间，例如：每週二晚上 7:30"),
    input("time_en", "English time"),
    input("scripture_zh", "中文经文范围", "full"),
    input("scripture_en", "English scripture", "full"),
    input("zoom_url", "Zoom 链接", "full"),
    input("zoom_id", "Zoom 号码"),
    bool("visible", "是否显示线上读经", true),
    status()
  ]) await createField(token, "bible_readings", item);

  await createCollection(token, "bible_reading_questions", {
    icon: "format_list_numbered",
    note: "线上读经的思考问题。逐条编辑。",
    translations: translations("读经问题", "Bible Reading Questions"),
    sort: 7,
    sort_field: "sort_order",
    display_template: "{{question_zh}}"
  });
  for (const item of [
    text("question_zh", "中文问题"),
    text("question_en", "English question"),
    integer("sort_order", "排序，数字越小越靠前"),
    status()
  ]) await createField(token, "bible_reading_questions", item);
}

async function firstItem(token, collection, query = "") {
  const data = await request(`/items/${collection}?limit=1${query}`, { headers: jsonHeaders(token) }).catch(() => ({ data: [] }));
  return data.data?.[0] || null;
}

async function patchSingleton(token, collection, payload) {
  await request(`/items/${collection}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
}

async function createItem(token, collection, payload) {
  return request(`/items/${collection}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
}

async function clearCollection(token, collection) {
  const data = await request(`/items/${collection}?limit=-1&fields=id`, { headers: jsonHeaders(token) }).catch(() => ({ data: [] }));
  for (const item of data.data || []) {
    await request(`/items/${collection}/${item.id}`, { method: "DELETE", headers: jsonHeaders(token) });
  }
}

async function siteSection(token, key) {
  const data = await request(`/items/site_sections?filter[section_key][_eq]=${encodeURIComponent(key)}&limit=1`, { headers: jsonHeaders(token) });
  return data.data?.[0] || null;
}

async function seedFriendlyData(token) {
  const top = await siteSection(token, "top_announcement");
  if (top?.content) {
    await patchSingleton(token, "homepage_announcements", {
      ...top.content,
      detail_zh: top.content.detail_zh || "將在本教會舉行",
      visible: top.content.visible !== false,
      status: top.status || "published"
    });
  }

  const gatherings = await siteSection(token, "gatherings");
  if (Array.isArray(gatherings?.content?.items)) {
    await clearCollection(token, "gathering_items");
    for (const [index, item] of gatherings.content.items.entries()) {
      await createItem(token, "gathering_items", {
        title_zh: item.title_zh,
        title_en: item.title_en,
        time_zh: item.time_zh,
        time_en: item.time_en,
        description_zh: item.description_zh,
        description_en: item.description_en,
        image_path: item.image,
        sort_order: index + 1,
        status: "published"
      });
    }
  }

  const messages = await siteSection(token, "messages");
  if (messages?.content) {
    await patchSingleton(token, "message_settings", {
      title_zh: messages.title_zh,
      title_en: messages.title_en,
      description_zh: messages.content.description_zh,
      description_en: messages.content.description_en,
      button_zh: messages.content.button_zh,
      button_en: messages.content.button_en,
      youtube_url: messages.content.youtube_url,
      status: messages.status || "published"
    });
    await patchSingleton(token, "youtube_latest", {
      video_id: messages.content.video_id,
      title: messages.content.latest_video_title,
      published_at: messages.content.latest_video_published_at,
      url: messages.content.latest_video_url,
      embed_url: messages.content.video_embed_url,
      thumbnail_url: messages.content.latest_video_thumbnail_url,
      synced_at: messages.content.latest_video_synced_at,
      status: "published"
    });
  }

  const reading = await siteSection(token, "bible_reading");
  if (reading?.content) {
    await patchSingleton(token, "bible_readings", {
      title_zh: reading.title_zh,
      title_en: reading.title_en,
      time_zh: reading.content.time_zh,
      time_en: reading.content.time_en,
      scripture_zh: reading.content.scripture_zh,
      scripture_en: reading.content.scripture_en,
      zoom_url: reading.content.zoom_url,
      zoom_id: reading.content.zoom_id,
      visible: reading.content.visible !== false,
      status: reading.status || "published"
    });
    await clearCollection(token, "bible_reading_questions");
    const zh = Array.isArray(reading.content.questions_zh) ? reading.content.questions_zh : [];
    const en = Array.isArray(reading.content.questions_en) ? reading.content.questions_en : [];
    const count = Math.max(zh.length, en.length);
    for (let index = 0; index < count; index += 1) {
      await createItem(token, "bible_reading_questions", {
        question_zh: zh[index] || "",
        question_en: en[index] || "",
        sort_order: index + 1,
        status: "published"
      });
    }
  }
}

async function findPublicPolicy(token) {
  const data = await request("/policies?limit=100", { headers: jsonHeaders(token) });
  return data.data.find((policy) => policy.name === "$t:public_label" || policy.icon === "public");
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

async function ensurePublicRead(token) {
  const publicPolicy = await findPublicPolicy(token);
  if (!publicPolicy) throw new Error("Public policy not found");
  for (const collection of ["homepage_announcements", "gathering_items", "message_settings", "youtube_latest", "bible_readings", "bible_reading_questions"]) {
    await ensurePermission(token, publicPolicy.id, collection, "read");
  }
}

async function findRole(token, name) {
  const data = await request(`/roles?filter[name][_eq]=${encodeURIComponent(name)}`, { headers: jsonHeaders(token) });
  return data.data?.[0] || null;
}

async function ensureRole(token, name, description, icon) {
  const existing = await findRole(token, name);
  if (existing) return existing;
  const created = await request("/roles", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name, description, icon })
  });
  return created.data;
}

async function findPolicy(token, name) {
  const data = await request(`/policies?filter[name][_eq]=${encodeURIComponent(name)}`, { headers: jsonHeaders(token) });
  return data.data?.[0] || null;
}

async function ensurePolicy(token, name, description, icon) {
  const existing = await findPolicy(token, name);
  if (existing) return existing;
  const created = await request("/policies", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name, description, icon, app_access: true, admin_access: false, enforce_tfa: false })
  });
  return created.data;
}

async function ensureAccess(token, roleId, policyId) {
  const existing = await request(`/access?filter[role][_eq]=${roleId}&filter[policy][_eq]=${policyId}`, { headers: jsonHeaders(token) }).catch(() => ({ data: [] }));
  if (existing.data?.length) return;
  await request("/access", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ role: roleId, policy: policyId })
  });
}

async function setupRoles(token) {
  const roleSpecs = [
    ["Content Editor", "编辑基础信息、首页内容、公告、活动、讲道和相册。", "edit", ["site_settings", "homepage_announcements", "gathering_items", "message_settings", "bible_readings", "bible_reading_questions", "announcements", "events", "sermons", "gallery", "small_groups"]],
    ["Roster Editor", "只编辑服事表。", "table_chart", ["service_rosters", "service_roster_rows"]],
    ["Prayer Editor", "只编辑代祷事项。", "volunteer_activism", ["prayer_items"]],
    ["Media Editor", "编辑主日信息、YouTube 信息和相册。", "perm_media", ["message_settings", "youtube_latest", "sermons", "gallery"]],
    ["Viewer", "只读网站内容。", "visibility", []]
  ];
  const readable = ["site_settings", "homepage_announcements", "gathering_items", "message_settings", "youtube_latest", "bible_readings", "bible_reading_questions", "announcements", "events", "sermons", "gallery", "small_groups", "service_rosters", "service_roster_rows", "prayer_items"];
  for (const [name, description, icon, editable] of roleSpecs) {
    const role = await ensureRole(token, name, description, icon);
    const policy = await ensurePolicy(token, `Light of Life ${name} Policy`, description, icon);
    await ensureAccess(token, role.id, policy.id);
    for (const collection of readable) await ensurePermission(token, policy.id, collection, "read");
    for (const collection of editable) {
      for (const action of ["create", "update"]) await ensurePermission(token, policy.id, collection, action);
      if (name === "Content Editor" || name === "Media Editor" || name === "Prayer Editor") {
        await ensurePermission(token, policy.id, collection, "delete");
      }
    }
  }
}

async function main() {
  const token = await login();
  await setupCollections(token);
  await seedFriendlyData(token);
  await ensurePublicRead(token);
  await setupRoles(token);
  console.log("Directus admin experience optimized.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
