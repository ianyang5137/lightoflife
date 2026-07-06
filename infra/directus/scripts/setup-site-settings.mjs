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
  if (await exists("/collections/site_settings", token)) return;
  await request("/collections", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      collection: "site_settings",
      meta: {
        collection: "site_settings",
        icon: "settings_applications",
        note: "网站基础信息、固定文案与常用开关。",
        hidden: false,
        singleton: true,
        accountability: "all",
        translations: [
          { language: "zh-Hans", translation: "基础信息" },
          { language: "zh-Hant", translation: "基礎信息" },
          { language: "en-US", translation: "Site Settings" }
        ],
        sort: 1
      },
      schema: { name: "site_settings" }
    })
  });
  console.log("Created collection: site_settings");
}

async function createField(token, field) {
  if (await exists(`/fields/site_settings/${field.field}`, token)) return;
  await request("/fields/site_settings", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(field)
  });
  console.log(`Created field: site_settings.${field.field}`);
}

const translations = {
  "brand.title": ["生命之光靈糧堂", "Light of Life Church"],
  "brand.subtitle": ["Light of Life Church Auckland", "Bread of Life Christian Church Auckland"],
  "hero.eyebrow": ["Auckland · Mandarin Christian Church", "Auckland · Mandarin Christian Church"],
  "hero.title": ["紐西蘭奧克蘭<br />生命之光靈糧堂", "Light of Life,<br />Bread of Life Christian Church"],
  "hero.copy": ["在基督裡遇見生命之光，一同敬拜、成長，成為彼此扶持的屬靈家庭。", "Encountering the light of life in Christ as we worship, grow, and become a spiritual family that supports one another."],
  "hero.primary": ["我是新朋友", "I am new"],
  "hero.secondary": ["查看聚會時間", "View gathering times"],
  "missionVerse.kicker": ["Church Verse", "Church Verse"],
  "missionVerse.text": ["神愛世人，甚至將祂的獨生子賜給他們，叫一切信祂的，不至滅亡，反得永生。", "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."],
  "missionVerse.reference": ["約翰福音 3:16", "John 3:16"],
  "welcome.kicker": ["Welcome Home", "Welcome Home"],
  "welcome.title": ["歡迎來到生命之光", "Welcome to Light of Life"],
  "welcome.copy": ["無論你是初次認識信仰、剛搬到奧克蘭，或正在尋找一間在奧克蘭中區的華人教會，我們都歡迎你來到生命之光靈糧堂。教會位於 Mount Eden，服事周邊華人家庭、學生、新移民與慕道朋友。", "Whether you are exploring faith, new to Auckland, or looking for a Chinese church in central Auckland, you are welcome at Light of Life Church. We are located in Mount Eden and serve Chinese families, students, new migrants, and friends exploring faith across nearby communities."],
  "welcome.copy2": ["我們以中文敬拜、聖經教導、小組聚會、兒童主日學與團契生活，一同在基督裡敬拜、讀經、禱告，並在彼此陪伴中一同成長。", "We gather for Mandarin worship, biblical teaching, small group gatherings, Children's Sunday School, and fellowship as we worship, pray, study Scripture, and grow together with care and companionship in Christ."],
  "about.kicker": ["About Us", "About Us"],
  "about.title": ["一間在奧克蘭服事華人社群的教會", "A church serving the Chinese community in Auckland"],
  "about.copy1": ["生命之光靈糧堂盼望成為一個以基督為中心、以聖經為根基、以愛彼此連結的屬靈家庭。", "Light of Life, Bread of Life Christian Church seeks to be a Christ-centred, Bible-grounded spiritual family connected by love."],
  "about.copy2": ["我們重視敬拜、真理、禱告、門徒訓練與社區關懷，也期待不同年齡和背景的人都能在這裡被接納、被建造、被差遣。", "We value worship, truth, prayer, discipleship, and care for the community, welcoming people of different ages and backgrounds to be received, built up, and sent out."],
  "services.kicker": ["Gatherings", "Gatherings"],
  "services.title": ["聚會時間", "Gathering Times"],
  "services.copy": ["歡迎你在主日與我們一同敬拜，也可以先聯絡鴻基牧師了解新朋友接待安排。", "You are welcome to worship with us on Sundays. You can also contact Pastor Hongji before your first visit."],
  "new.kicker": ["New Here", "New Here"],
  "new.title": ["第一次來，也可以很安心", "Feel at ease on your first visit"],
  "new.step1.title": ["聚會語言", "Language"],
  "new.step1.copy": ["以中文為主，英文朋友也歡迎參與。", "Our gatherings are mainly in Chinese, and English-speaking friends are also welcome."],
  "new.step2.title": ["抵達之後", "When you arrive"],
  "new.step2.copy": ["接待同工會協助你找到座位、了解聚會流程。", "Our welcome team can help you find a seat and understand the flow of the service."],
  "new.step3.title": ["孩子與父母", "Children and parents"],
  "new.step3.copy": ["孩子可以參加兒童主日學，在同工陪伴中聽聖經故事、活動與玩耍；父母也可以更安心地專心參與崇拜和聽道。", "Children can join Children's Sunday School, where caring helpers guide them through Bible stories, activities, and play, so parents can worship and listen to the message with greater peace of mind."],
  "new.link": ["聯絡我們安排第一次到訪", "Contact us before your first visit"],
  "ministries.kicker": ["Ministries", "Ministries"],
  "ministries.title": ["一起敬拜、成長、服事", "Worship, grow, and serve together"],
  "ministries.worship.title": ["敬拜與信息", "Worship and Teaching"],
  "ministries.worship.copy": ["以詩歌、禱告與聖經真理回應神的恩典。", "Responding to God's grace through songs, prayer, and biblical truth."],
  "ministries.discipleship.title": ["門徒成長", "Discipleship"],
  "ministries.discipleship.copy": ["透過課程、小組與陪伴，在信仰和生命中成熟。", "Growing in faith and life through classes, groups, and spiritual care."],
  "ministries.community.title": ["社區關懷", "Community Care"],
  "ministries.community.copy": ["以實際行動關心新移民、家庭、學生與城市需要。", "Serving new migrants, families, students, and the needs of the city in practical ways."],
  "messages.kicker": ["Messages & News", "Messages & News"],
  "messages.title": ["主日信息與線上讀經", "Messages and Online Bible Reading"],
  "messages.copy": ["透過 YouTube 收看主日信息，也歡迎每週在線上一同讀經、思想神的話語。", "Watch Sunday messages on YouTube, and join us online each week to read and reflect on God's Word together."],
  "giving.kicker": ["Giving", "Giving"],
  "giving.title": ["奉獻", "Giving"],
  "giving.copy": ["若你願意以奉獻支持教會事工，請使用以下銀行帳戶資料。", "If you would like to support the ministry of the church through giving, please use the bank details below."],
  "giving.note": ["轉帳時可於 Reference 填寫姓名或奉獻用途。", "For bank transfers, you may include your name or giving purpose in the reference."],
  "giving.account.label": ["奉獻帳戶名", "Account name"],
  "giving.account.value": ["Bread of Life Christian Church Light of Life", "Bread of Life Christian Church Light of Life"],
  "giving.asb.label": ["ASB銀行帳號", "ASB account number"],
  "giving.asb.value": ["12-3016-0054058-00", "12-3016-0054058-00"],
  "giving.fund.label": ["殖堂基金帳號", "Church planting fund account"],
  "giving.fund.value": ["12-3016-0054058-50", "12-3016-0054058-50"],
  "contact.kicker": ["Contact", "Contact"],
  "contact.title": ["聯絡我們", "Contact Us"],
  "contact.copy": ["歡迎聯絡我們了解聚會、探訪、小組或新朋友接待。", "Contact us to learn more about gatherings, visits, home groups, or first-time guest care."],
  "contact.address.label": ["地址", "Address"],
  "contact.address.value": ["72 View Road, Mount Eden, Auckland 1024", "72 View Road, Mount Eden, Auckland 1024"],
  "contact.pastor.label": ["聯絡人", "Contact"],
  "contact.pastor.value": ["鴻基牧師", "Pastor Hongji"],
  "contact.email.label": ["Email", "Email"],
  "contact.phone.label": ["電話", "Phone"],
  "contact.button": ["發送 Email", "Send Email"],
  "contact.mapButton": ["開啟地圖", "Open Map"],
  "footer.name": ["紐西蘭奧克蘭生命之光靈糧堂", "Light of Life, Bread of Life Christian Church in Auckland, New Zealand"],
  "footer.youtube": ["YouTube", "YouTube"],
  "footer.zoom": ["Zoom", "Zoom"],
  "footer.admin": ["登入", "Login"],
  "footer.copy": ["© 2026 Light of Life, Bread of Life Christian Church in Auckland, New Zealand.", "© 2026 Light of Life, Bread of Life Christian Church in Auckland, New Zealand."]
};

const htmlKeys = new Set(["hero.title"]);
const longKeys = new Set(Object.keys(translations).filter((key) => /copy|text|note/.test(key)));
const labelMap = {
  brand: "品牌",
  hero: "首页首屏",
  missionVerse: "教会经文",
  welcome: "欢迎区块",
  about: "关于我们",
  services: "聚会时间",
  new: "新朋友",
  ministries: "事工",
  messages: "主日信息",
  giving: "奉献",
  contact: "联系",
  footer: "页脚"
};
const keyToField = (key, lang) => `${key.replaceAll(".", "_")}_${lang}`;
const keyLabel = (key, langName) => `${labelMap[key.split(".")[0]] || key} ${key.split(".").slice(1).join(" ")} ${langName}`;

function textField(field, note, multiline = false) {
  return {
    field,
    type: "text",
    meta: { interface: multiline ? "input-multiline" : "input", width: multiline ? "full" : "half", note },
    schema: { data_type: "text", is_nullable: true }
  };
}

function booleanField(field, note) {
  return {
    field,
    type: "boolean",
    meta: { interface: "boolean", width: "half", note },
    schema: { data_type: "boolean", default_value: true, is_nullable: false }
  };
}

async function setupFields(token) {
  await createField(token, booleanField("show_top_announcement", "显示顶部预告"));
  await createField(token, booleanField("show_church_verse", "显示 Church Verse 经文区块"));
  await createField(token, booleanField("show_ministries", "显示事工区块"));
  await createField(token, booleanField("show_youtube_preview", "显示 YouTube 视频预览"));
  await createField(token, booleanField("show_bible_reading", "显示线上读经"));
  await createField(token, booleanField("show_service_roster", "显示服事表"));
  await createField(token, booleanField("show_prayer_items", "显示代祷事项"));
  await createField(token, booleanField("show_giving", "显示奉献区块"));
  await createField(token, booleanField("show_back_to_top", "显示返回顶部按钮"));
  await createField(token, textField("contact_email_value", "联系 Email"));
  await createField(token, textField("contact_phone_value", "联系电话"));
  await createField(token, textField("youtube_url", "YouTube 频道链接"));
  await createField(token, textField("zoom_url", "Zoom 会议链接"));
  await createField(token, textField("map_url", "Google Maps 链接"));
  await createField(token, textField("admin_url", "后台登录链接"));
  for (const key of Object.keys(translations)) {
    await createField(token, textField(keyToField(key, "zh"), keyLabel(key, "中文"), longKeys.has(key) || htmlKeys.has(key)));
    await createField(token, textField(keyToField(key, "en"), keyLabel(key, "英文"), longKeys.has(key) || htmlKeys.has(key)));
  }
}

async function ensurePublicRead(token) {
  const policies = await request("/policies?limit=100", { headers: jsonHeaders(token) });
  const publicPolicy = policies.data.find((policy) => policy.name === "$t:public_label" || policy.icon === "public");
  if (!publicPolicy) throw new Error("Directus public policy not found");
  const existing = await request(`/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=site_settings&filter[action][_eq]=read`, {
    headers: jsonHeaders(token)
  }).catch(() => ({ data: [] }));
  if (existing.data?.length) return;
  await request("/permissions", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ policy: publicPolicy.id, collection: "site_settings", action: "read", permissions: {}, validation: {}, presets: null, fields: ["*"] })
  });
}

async function seedSettings(token) {
  const payload = {
    show_top_announcement: true,
    show_church_verse: true,
    show_ministries: true,
    show_youtube_preview: true,
    show_bible_reading: true,
    show_service_roster: true,
    show_prayer_items: true,
    show_giving: true,
    show_back_to_top: true,
    contact_email_value: "hongji6688@hotmail.com",
    contact_phone_value: "027 2888283",
    youtube_url: "https://www.youtube.com/@生命之光灵粮堂教会",
    zoom_url: "https://zoom.us/j/8427078200",
    map_url: "https://www.google.com/maps/search/?api=1&query=72%20View%20Road%2C%20Mount%20Eden%2C%20Auckland%201024",
    admin_url: "https://admin.lightoflife.org.nz/admin/"
  };
  for (const [key, [zh, en]] of Object.entries(translations)) {
    payload[keyToField(key, "zh")] = zh;
    payload[keyToField(key, "en")] = en;
  }
  await request("/items/site_settings", {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
  console.log("Seeded site_settings");
}

async function main() {
  const token = await login();
  await createCollection(token);
  await setupFields(token);
  await ensurePublicRead(token);
  await seedSettings(token);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
