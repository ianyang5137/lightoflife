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

function stringField(field, required = false) {
  return {
    field,
    type: "string",
    meta: { interface: "input", width: "full", required },
    schema: { data_type: "varchar", max_length: 255, is_nullable: !required, is_unique: required }
  };
}

function textField(field) {
  return {
    field,
    type: "text",
    meta: { interface: "input-multiline", width: "full" },
    schema: { data_type: "text", is_nullable: true }
  };
}

function jsonField(field) {
  return {
    field,
    type: "json",
    meta: { interface: "input-code", options: { language: "json" }, width: "full" },
    schema: { data_type: "json", is_nullable: true }
  };
}

function dateField(field) {
  return {
    field,
    type: "date",
    meta: { interface: "datetime", width: "half" },
    schema: { data_type: "date", is_nullable: true }
  };
}

function booleanField(field) {
  return {
    field,
    type: "boolean",
    meta: { interface: "boolean", width: "half" },
    schema: { data_type: "boolean", default_value: false, is_nullable: false }
  };
}

function integerField(field) {
  return {
    field,
    type: "integer",
    meta: { interface: "input", width: "half" },
    schema: { data_type: "integer", default_value: 0, is_nullable: false }
  };
}

async function setupFrontendCollections(token) {
  await createCollection(token, "site_sections", { icon: "web", note: "Frontend dynamic sections used by the public website." });
  for (const field of [
    stringField("section_key", true),
    stringField("title_zh"),
    stringField("title_en"),
    jsonField("content"),
    stringField("status")
  ]) await createField(token, "site_sections", field);

  await createCollection(token, "service_rosters", { icon: "table_chart", note: "Frontend serving roster." });
  for (const field of [
    stringField("title_zh"),
    stringField("title_en"),
    dateField("week_start"),
    stringField("current_week_label"),
    stringField("current_week_label_en"),
    stringField("next_week_label"),
    stringField("next_week_label_en"),
    jsonField("rows"),
    stringField("status")
  ]) await createField(token, "service_rosters", field);

  await createCollection(token, "prayer_items", { icon: "format_list_numbered", note: "Frontend prayer items." });
  for (const field of [
    stringField("title_zh"),
    stringField("title_en"),
    textField("body_zh"),
    textField("body_en"),
    stringField("item_type"),
    booleanField("is_pinned"),
    integerField("sort_order"),
    stringField("status")
  ]) await createField(token, "prayer_items", field);
}

async function findPublicPolicy(token) {
  const data = await request("/policies?limit=100", { headers: jsonHeaders(token) });
  return data.data.find((policy) => policy.name === "$t:public_label" || policy.icon === "public");
}

async function ensurePublicRead(token, collection) {
  const publicPolicy = await findPublicPolicy(token);
  if (!publicPolicy) throw new Error("Directus public policy not found");
  const existing = await request(`/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=${collection}&filter[action][_eq]=read`, {
    headers: jsonHeaders(token)
  }).catch(() => ({ data: [] }));
  if (existing.data?.length) return;
  await request("/permissions", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      policy: publicPolicy.id,
      collection,
      action: "read",
      permissions: {},
      validation: {},
      presets: null,
      fields: ["*"]
    })
  });
  console.log(`Enabled public read: ${collection}`);
}

async function upsertByField(token, collection, field, item) {
  const existing = await request(`/items/${collection}?filter[${field}][_eq]=${encodeURIComponent(item[field])}&limit=1`, {
    headers: jsonHeaders(token)
  });
  if (existing.data?.[0]) {
    await request(`/items/${collection}/${existing.data[0].id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify(item)
    });
    console.log(`Updated ${collection}: ${item[field]}`);
    return;
  }
  await request(`/items/${collection}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(item)
  });
  console.log(`Created ${collection}: ${item[field]}`);
}

async function clearCollection(token, collection) {
  const data = await request(`/items/${collection}?limit=-1&fields=id`, { headers: jsonHeaders(token) });
  for (const item of data.data || []) {
    await request(`/items/${collection}/${item.id}`, {
      method: "DELETE",
      headers: jsonHeaders(token)
    });
  }
}

const sections = [
  {
    section_key: "top_announcement",
    title_zh: "顶部预告",
    title_en: "Top Announcement",
    status: "published",
    content: {
      label_zh: "中區禱告會",
      label_en: "Central Auckland Prayer Meeting",
      headline_zh: "8月4日（週二）晚上 7:30–9:00",
      headline_en: "4 Aug (Tue), 7:30–9:00 PM",
      detail_zh: "將在本教會舉行",
      detail_en: "Held at our church",
      cta_zh: "了解詳情",
      cta_en: "Learn more",
      url: "#updates"
    }
  },
  {
    section_key: "gatherings",
    title_zh: "聚會時間",
    title_en: "Gathering Times",
    status: "published",
    content: {
      items: [
        {
          title_zh: "主日崇拜",
          title_en: "Sunday Service",
          time_zh: "每週日下午 3:30",
          time_en: "Sundays at 3:30 PM",
          description_zh: "詩歌敬拜、聖經信息、禱告與團契。",
          description_en: "Worship, biblical teaching, prayer, and fellowship.",
          image: "/assets/images/sunday-worship.jpg"
        },
        {
          title_zh: "小組聚會",
          title_en: "Small Group Gathering",
          time_zh: "主日證道後 · 教會場地",
          time_en: "After the Sunday message · At church",
          description_zh: "證道後分組分享信息、交流生活近況，彼此代禱與扶持。",
          description_en: "After the message, we gather in groups to reflect, share life updates, and pray for one another.",
          image: "/assets/images/home-group.jpg"
        },
        {
          title_zh: "兒童主日學",
          title_en: "Children's Sunday School",
          time_zh: "主日崇拜期間",
          time_en: "During Sunday Service",
          description_zh: "透過聖經小故事、詩歌、手作與陪伴，幫助孩子從小認識神的話語，在愛與真理中成長。",
          description_en: "Through Bible stories, songs, activities, and caring guidance, children are helped to know God's Word and grow in love and truth.",
          image: "/assets/images/children-sunday-school.jpg"
        }
      ]
    }
  },
  {
    section_key: "messages",
    title_zh: "主日信息",
    title_en: "Sunday Messages",
    status: "published",
    content: {
      description_zh: "本週主日信息：讓基督塑造我們的心。經文：希伯來書 5:1–14，講員：Angela 傳道。",
      description_en: "This week's Sunday message: Let Christ Shape Our Hearts. Scripture: Hebrews 5:1–14. Speaker: Angela.",
      youtube_url: "https://www.youtube.com/@生命之光灵粮堂教会",
      button_zh: "在線觀看",
      button_en: "Watch on YouTube",
      video_id: "5iVDJWHDsdA",
      video_embed_url: "https://www.youtube.com/embed/5iVDJWHDsdA"
    }
  },
  {
    section_key: "bible_reading",
    title_zh: "線上讀經",
    title_en: "Online Bible Reading",
    status: "published",
    content: {
      time_zh: "每週二晚上 7:30，一起讀經、分享與彼此勉勵。",
      time_en: "Every Tuesday at 7:30 PM, we read Scripture, share, and encourage one another online.",
      scripture_zh: "《以賽亞書》19:16–25；《箴言》8–13",
      scripture_en: "Isaiah 19:16–25; Proverbs 8–13",
      questions_zh: [
        "本週禱讀經文：以賽亞書 19:16–25。",
        "全年讀經進度：箴言 8–13。",
        "一起在讀經中思想神的話語，彼此分享與代禱。"
      ],
      questions_en: [
        "This week's prayer reading: Isaiah 19:16–25.",
        "Annual reading progress: Proverbs 8–13.",
        "Reflect on God's Word together, then share and pray for one another."
      ],
      zoom_url: "https://zoom.us/j/8427078200",
      zoom_id: "842 707 8200"
    }
  }
];

const roster = {
  title_zh: "本週與下週主日服事表",
  title_en: "This Week and Next Week Sunday Serving Roster",
  week_start: "2026-07-05",
  current_week_label: "本週（5/7/2026）",
  current_week_label_en: "This Week (5/7/2026)",
  next_week_label: "下週（12/7/2026）",
  next_week_label_en: "Next Week (12/7/2026)",
  status: "published",
  rows: [
    { item_zh: "敬拜", item_en: "Worship", current: "Sunny姐妹／Mary姐妹／小敏姐妹", next: "芷茜姐妹" },
    { item_zh: "證道", item_en: "Message", current: "Angela傳道", next: "楊銳傳道" },
    { item_zh: "會前禱告／司琴", item_en: "Pre-service Prayer / Pianist", current: "可可姐妹／Ruby姐妹", next: "小敏姐妹／Ruby姐妹" },
    { item_zh: "陪談", item_en: "Care Conversation", current: "Irene姐妹", next: "Nita姐妹" },
    { item_zh: "迎賓", item_en: "Welcome", current: "靜巧姐妹", next: "熊熊姐妹" },
    { item_zh: "PA", item_en: "PA", current: "林晶弟兄", next: "范弟兄" },
    { item_zh: "PPT", item_en: "Slides", current: "姍姍姐妹", next: "林晶弟兄" },
    { item_zh: "晚餐服事", item_en: "Dinner Serving", current: "青少年團契聚點", next: "撒母耳小組聚點", emphasis: true },
    { item_zh: "兒童牧區", item_en: "Children's Ministry", current: "Jessica姐妹", next: "文香姐妹" },
    { item_zh: "青少年團契", item_en: "Youth Fellowship", current: "心心姐妹", next: "啟文弟兄" },
    { item_zh: "督堂", item_en: "Service Steward", current: "魏宇峻長老", next: "魏宇峻長老" }
  ]
};

const prayerItems = [
  {
    title_zh: "為墨爾本福音中心禱告",
    title_en: "Pray for Melbourne Gospel Centre",
    body_zh: "繼續為墨爾本福音中心禱告，求主親自托住安彥牧師與曉春師母手中的事工，使福音廣傳，得救的人數天天加增，教會被主興旺與拓展，榮耀主的聖名。",
    body_en: "Continue to pray for the Melbourne Gospel Centre. May the Lord personally sustain Pastor Anyan, Pastor Xiaochun, and the ministry in their hands, that the gospel would spread, people would be saved daily, and the church would be strengthened and expanded for the glory of the Lord.",
    item_type: "prayer",
    is_pinned: true,
    sort_order: 1,
    status: "published"
  },
  {
    title_zh: "「從懷疑到相信」培訓",
    title_en: "From Doubt to Faith Training",
    body_zh: "5月9日開始每週六「從懷疑到相信」培訓開始，請組長同工們預備心，堅持上完全部課程，求主記念我們為福音分別出的時間。",
    body_en: "The From Doubt to Faith training began on Saturday, 9 May. Please pray that group leaders and coworkers would prepare their hearts and complete the whole course. May the Lord remember the time set apart for the gospel.",
    item_type: "news",
    is_pinned: false,
    sort_order: 2,
    status: "published"
  },
  {
    title_zh: "中區禱告會",
    title_en: "Central Auckland Prayer Meeting",
    body_zh: "中區禱告會 8月4日（週二）晚上 7:30–9:00，將在本教會舉行。請弟兄姊妹預留時間參加，同心為教會及城市守望禱告。",
    body_en: "The Central Auckland Prayer Meeting will be held at our church on Tuesday, 4 August, from 7:30 to 9:00 PM. Please set aside time to join us as we pray together for the church and the city.",
    item_type: "announcement",
    is_pinned: false,
    sort_order: 3,
    status: "published"
  },
  {
    title_zh: "預備受洗人員",
    title_en: "Preparing Baptism Candidates",
    body_zh: "預備受洗人員請各小組及牧養同工留意並預備受洗人員名單，也請弟兄姊妹為即將受洗的弟兄姊妹提名代禱，求主堅固他們的信心，引導他們在真道上扎根成長。",
    body_en: "Small group and pastoral coworkers are encouraged to prepare baptism candidate names. Please also pray for those preparing for baptism, asking the Lord to strengthen their faith and root them in the truth.",
    item_type: "prayer",
    is_pinned: false,
    sort_order: 4,
    status: "published"
  },
  {
    title_zh: "2024年教會異象目標",
    title_en: "Church Vision Goal",
    body_zh: "2024年教會異象目標：聯結｜委身｜建造。具體實踐：每日一刻靈修，一人帶一人信主，教會持續向外拓展。",
    body_en: "Church vision goal: Connect | Commit | Build. Practical steps: daily devotional time, each person leading one person to faith, and the church continuing to expand outward.",
    item_type: "prayer",
    is_pinned: false,
    sort_order: 5,
    status: "published"
  }
];

async function main() {
  const token = await login();
  await setupFrontendCollections(token);
  for (const collection of ["site_sections", "service_rosters", "prayer_items"]) {
    await ensurePublicRead(token, collection);
  }
  for (const section of sections) await upsertByField(token, "site_sections", "section_key", section);
  await clearCollection(token, "service_rosters");
  await request("/items/service_rosters", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(roster)
  });
  console.log("Seeded service_rosters");
  await clearCollection(token, "prayer_items");
  for (const item of prayerItems) {
    await request("/items/prayer_items", {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify(item)
    });
  }
  console.log("Seeded prayer_items");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
