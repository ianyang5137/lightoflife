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

async function findItem(token, collection, field, value) {
  const query = `/items/${collection}?filter[${field}][_eq]=${encodeURIComponent(value)}&limit=1`;
  const body = await request(query, { headers: jsonHeaders(token) });
  return body.data?.[0] || null;
}

async function upsertItem(token, collection, uniqueField, item) {
  const existing = await findItem(token, collection, uniqueField, item[uniqueField]);
  if (existing) {
    const body = await request(`/items/${collection}/${existing.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify(item)
    });
    console.log(`Updated ${collection}: ${item[uniqueField]}`);
    return body.data;
  }
  const body = await request(`/items/${collection}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(item)
  });
  console.log(`Created ${collection}: ${item[uniqueField]}`);
  return body.data;
}

async function findFileByTitle(token, title) {
  const body = await request(`/files?filter[title][_eq]=${encodeURIComponent(title)}&limit=1`, {
    headers: jsonHeaders(token)
  });
  return body.data?.[0] || null;
}

async function importFile(token, title, url) {
  const existing = await findFileByTitle(token, title);
  if (existing) return existing.id;
  const body = await request("/files/import", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      url,
      data: {
        title,
        description: "Imported from the existing Light of Life website."
      }
    })
  });
  console.log(`Imported file: ${title}`);
  return body.data.id;
}

const site = "https://www.lightoflife.org.nz";

const pages = [
  {
    slug: "home",
    title_zh: "首頁",
    title_en: "Home",
    body_zh: [
      "<h1>紐西蘭奧克蘭生命之光靈糧堂</h1>",
      "<p>在基督裡遇見生命之光，一同敬拜、成長，成為彼此扶持的屬靈家庭。</p>",
      "<blockquote>神愛世人，甚至將祂的獨生子賜給他們，叫一切信祂的，不至滅亡，反得永生。<br>約翰福音 3:16</blockquote>"
    ].join("\n"),
    body_en: [
      "<h1>Light of Life Church Auckland</h1>",
      "<p>Encounter the light of life in Christ, worship and grow together, and become a spiritual family that supports one another.</p>",
      "<blockquote>For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.<br>John 3:16</blockquote>"
    ].join("\n"),
    seo_title_zh: "紐西蘭奧克蘭生命之光靈糧堂｜奧克蘭華人教會",
    seo_title_en: "Light of Life Church Auckland | Auckland Chinese Church",
    seo_description_zh: "生命之光靈糧堂是一間位於 Mount Eden 的華人中文基督教會，主日崇拜每週日下午 3:30。",
    seo_description_en: "Light of Life Church is a Mandarin Chinese Christian church in Mount Eden, Auckland. Sunday service is held every Sunday at 3:30 PM.",
    status: "published"
  },
  {
    slug: "about",
    title_zh: "關於我們",
    title_en: "About Us",
    body_zh: "<p>生命之光靈糧堂盼望成為一個以基督為中心、以聖經為根基、以愛彼此連結的屬靈家庭。我們重視敬拜、真理、禱告、門徒訓練與社區關懷。</p>",
    body_en: "<p>Light of Life Church seeks to be a Christ-centered, Bible-rooted spiritual family connected by love. We value worship, truth, prayer, discipleship and care for the community.</p>",
    status: "published"
  },
  {
    slug: "gatherings",
    title_zh: "聚會時間",
    title_en: "Gathering Times",
    body_zh: "<p>主日崇拜每週日下午 3:30。主日證道後有小組聚會；主日崇拜期間有兒童主日學。</p>",
    body_en: "<p>Sunday worship is held every Sunday at 3:30 PM. Small groups meet after the message, and children's Sunday school runs during the service.</p>",
    status: "published"
  },
  {
    slug: "new-here",
    title_zh: "第一次來，也可以很安心",
    title_en: "Your First Visit Can Feel Peaceful",
    body_zh: "<p>聚會以中文為主，英文朋友也歡迎參與。接待同工會協助你找到座位、了解聚會流程。孩子可以參加兒童主日學，父母也可以更安心地專心參與崇拜和聽道。</p>",
    body_en: "<p>Our gathering is mainly in Mandarin, and English-speaking friends are also welcome. Our welcome team can help you find a seat and understand the flow of the service. Children may join Sunday school while parents take part in worship and the message.</p>",
    status: "published"
  },
  {
    slug: "giving",
    title_zh: "奉獻",
    title_en: "Giving",
    body_zh: "<p>奉獻帳戶名：Bread of Life Christian Church Light of Life<br>ASB 銀行帳號：12-3016-0054058-00<br>殖堂基金帳號：12-3016-0054058-50</p>",
    body_en: "<p>Account name: Bread of Life Christian Church Light of Life<br>ASB account: 12-3016-0054058-00<br>Church planting fund: 12-3016-0054058-50</p>",
    status: "published"
  },
  {
    slug: "contact",
    title_zh: "聯絡我們",
    title_en: "Contact",
    body_zh: "<p>地址：72 View Road, Mount Eden, Auckland 1024<br>聯絡人：鴻基牧師<br>Email：hongji6688@hotmail.com<br>電話：027 2888283</p>",
    body_en: "<p>Address: 72 View Road, Mount Eden, Auckland 1024<br>Contact: Pastor Hongji<br>Email: hongji6688@hotmail.com<br>Phone: 027 2888283</p>",
    status: "published"
  }
];

const events = [
  {
    title_zh: "中區禱告會",
    title_en: "Central Auckland Prayer Meeting",
    event_date: "2026-08-04",
    start_time: "19:30:00",
    end_time: "21:00:00",
    location_zh: "生命之光靈糧堂",
    location_en: "Light of Life Church",
    description_zh: "中區禱告會將於 8月4日（週二）晚上 7:30–9:00 在本教會舉行。請弟兄姊妹預留時間參加，同心為教會及城市守望禱告。",
    description_en: "The Central Auckland Prayer Meeting will be held at our church on Tuesday, 4 August, from 7:30 to 9:00 PM. We invite brothers and sisters to join in prayer for the church and the city.",
    status: "published"
  },
  {
    title_zh: "線上讀經",
    title_en: "Online Bible Reading",
    event_date: "2026-07-07",
    start_time: "19:30:00",
    end_time: "20:30:00",
    location_zh: "Zoom 842 707 8200",
    location_en: "Zoom 842 707 8200",
    description_zh: "每週二晚上 7:30，一起讀經、分享與彼此勉勵。本次經文：《以賽亞書》19:16–25；《箴言》8–13。",
    description_en: "Every Tuesday at 7:30 PM, we read Scripture, share and encourage one another. Current reading: Isaiah 19:16–25; Proverbs 8–13.",
    status: "published"
  }
];

const sermons = [
  {
    title_zh: "讓基督塑造我們的心",
    title_en: "Let Christ Shape Our Hearts",
    speaker_zh: "Angela 傳道",
    speaker_en: "Angela",
    sermon_date: "2026-07-05",
    content_zh: "<p>本週主日信息：讓基督塑造我們的心。經文：希伯來書 5:1–14。</p>",
    content_en: "<p>This week's Sunday message: Let Christ Shape Our Hearts. Scripture: Hebrews 5:1–14.</p>",
    audio_url: "",
    youtube_url: "https://www.youtube.com/@生命之光灵粮堂教会",
    status: "published"
  }
];

const announcements = [
  {
    title_zh: "中區禱告會",
    title_en: "Central Auckland Prayer Meeting",
    content_zh: "中區禱告會 8月4日（週二）晚上 7:30–9:00，將在本教會舉行。請弟兄姊妹預留時間參加，同心為教會及城市守望禱告。",
    content_en: "The Central Auckland Prayer Meeting will be held at our church on Tuesday, 4 August, from 7:30 to 9:00 PM.",
    published_date: "2026-07-05",
    status: "published"
  },
  {
    title_zh: "「從懷疑到相信」培訓",
    title_en: "From Doubt to Faith Training",
    content_zh: "5月9日開始每週六「從懷疑到相信」培訓開始，請組長同工們預備心，堅持上完全部課程，求主記念我們為福音分別出的時間。",
    content_en: "The From Doubt to Faith training began on Saturday, 9 May. May the Lord remember the time set apart for the gospel.",
    published_date: "2026-07-05",
    status: "published"
  },
  {
    title_zh: "預備受洗人員",
    title_en: "Preparing Baptism Candidates",
    content_zh: "請各小組及牧養同工留意並預備受洗人員名單，也請弟兄姊妹為即將受洗的弟兄姊妹提名代禱。",
    content_en: "Small group and pastoral coworkers are encouraged to prepare baptism candidate names and pray for those preparing for baptism.",
    published_date: "2026-07-05",
    status: "published"
  }
];

const prayerRequests = [
  {
    title_zh: "為墨爾本福音中心禱告",
    title_en: "Pray for Melbourne Gospel Centre",
    content_zh: "繼續為墨爾本福音中心禱告，求主親自托住安彥牧師與曉春師母手中的事工，使福音廣傳，得救的人數天天加增，教會被主興旺與拓展，榮耀主的聖名。",
    content_en: "Continue to pray for Melbourne Gospel Centre. May the Lord sustain Pastor Anyan and Mrs Xiaochun in their ministry, spread the gospel, add to those being saved and build up the church.",
    is_public: true,
    status: "published"
  },
  {
    title_zh: "中區禱告會",
    title_en: "Central Auckland Prayer Meeting",
    content_zh: "為 8月4日 中區禱告會禱告，求主帶領弟兄姊妹同心守望，也為教會和城市代求。",
    content_en: "Pray for the Central Auckland Prayer Meeting on 4 August, that brothers and sisters would watch and pray together for the church and the city.",
    is_public: true,
    status: "published"
  },
  {
    title_zh: "2024年教會異象目標",
    title_en: "Church Vision",
    content_zh: "2024年教會異象目標：聯結｜委身｜建造。具體實踐：每日一刻靈修，一人帶一人信主，教會持續向外拓展。",
    content_en: "Church vision: Connect, Commit, Build. Practice: daily devotion, one person leading another to Christ, and continuing outward growth.",
    is_public: true,
    status: "published"
  }
];

const smallGroups = [
  {
    name_zh: "小組聚會",
    name_en: "Small Group Gathering",
    leader_zh: "各小組同工",
    leader_en: "Small group coworkers",
    meeting_time_zh: "主日證道後",
    meeting_time_en: "After the Sunday message",
    location_zh: "教會場地",
    location_en: "Church venue",
    description_zh: "證道後分組分享信息、交流生活近況，彼此代禱與扶持。",
    description_en: "After the message, groups share reflections, life updates, prayer and support for one another.",
    status: "published"
  },
  {
    name_zh: "青少年團契",
    name_en: "Youth Fellowship",
    leader_zh: "青少年團契同工",
    leader_en: "Youth fellowship coworkers",
    meeting_time_zh: "按教會安排",
    meeting_time_en: "As scheduled by the church",
    location_zh: "教會場地",
    location_en: "Church venue",
    description_zh: "陪伴青少年在信仰、生活和群體中成長。",
    description_en: "Supporting young people as they grow in faith, life and community.",
    status: "published"
  }
];

const gallery = [
  {
    title_zh: "生命之光靈糧堂聚會地點外觀",
    title_en: "Light of Life Church Building",
    imageTitle: "church-building",
    imageUrl: `${site}/assets/images/church-building.jpg`,
    category_zh: "教會環境",
    category_en: "Church Venue",
    photo_date: "2026-07-05",
    status: "published"
  },
  {
    title_zh: "主日崇拜敬拜場景",
    title_en: "Sunday Worship",
    imageTitle: "sunday-worship",
    imageUrl: `${site}/assets/images/sunday-worship.jpg`,
    category_zh: "主日崇拜",
    category_en: "Sunday Worship",
    photo_date: "2026-07-05",
    status: "published"
  },
  {
    title_zh: "小組聚會團契分享",
    title_en: "Small Group Fellowship",
    imageTitle: "home-group",
    imageUrl: `${site}/assets/images/home-group.jpg`,
    category_zh: "小組",
    category_en: "Small Groups",
    photo_date: "2026-07-05",
    status: "published"
  },
  {
    title_zh: "兒童主日學",
    title_en: "Children's Sunday School",
    imageTitle: "children-sunday-school",
    imageUrl: `${site}/assets/images/children-sunday-school.jpg`,
    category_zh: "兒童",
    category_en: "Children",
    photo_date: "2026-07-05",
    status: "published"
  },
  {
    title_zh: "第一次來也可以很安心",
    title_en: "New Visitor Welcome",
    imageTitle: "new-visitor-welcome-people",
    imageUrl: `${site}/assets/images/new-visitor-welcome-people.jpg`,
    category_zh: "新朋友",
    category_en: "New Visitors",
    photo_date: "2026-07-05",
    status: "published"
  }
];

async function main() {
  const token = await login();

  for (const page of pages) await upsertItem(token, "pages", "slug", page);
  for (const event of events) await upsertItem(token, "events", "title_zh", event);
  for (const sermon of sermons) await upsertItem(token, "sermons", "title_zh", sermon);
  for (const announcement of announcements) await upsertItem(token, "announcements", "title_zh", announcement);
  for (const item of prayerRequests) await upsertItem(token, "prayer_requests", "title_zh", item);
  for (const group of smallGroups) await upsertItem(token, "small_groups", "name_zh", group);

  for (const item of gallery) {
    const fileId = await importFile(token, item.imageTitle, item.imageUrl);
    const { imageTitle, imageUrl, ...payload } = item;
    await upsertItem(token, "gallery", "title_zh", { ...payload, image: fileId });
  }

  console.log("Current website content has been seeded into Directus.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
