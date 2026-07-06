const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.PUBLIC_URL || "https://admin.lightoflife.org.nz";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "oyzpeng@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SECTION_KEY = process.env.YOUTUBE_SECTION_KEY || "messages";

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD is required");
  process.exit(1);
}

if (!YOUTUBE_CHANNEL_ID) {
  console.error("YOUTUBE_CHANNEL_ID is required");
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

function textBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return "";
  const valueStart = startIndex + start.length;
  const endIndex = source.indexOf(end, valueStart);
  if (endIndex < 0) return "";
  return source.slice(valueStart, endIndex)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

async function latestFromRss() {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(YOUTUBE_CHANNEL_ID)}`);
  if (!response.ok) throw new Error(`YouTube RSS failed: ${response.status}`);
  const xml = await response.text();
  const entry = textBetween(xml, "<entry>", "</entry>");
  if (!entry) throw new Error("YouTube RSS did not return any videos");
  const videoId = textBetween(entry, "<yt:videoId>", "</yt:videoId>");
  if (!videoId) throw new Error("YouTube RSS video id not found");
  return {
    video_id: videoId,
    title: textBetween(entry, "<title>", "</title>"),
    published_at: textBetween(entry, "<published>", "</published>"),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    embed_url: `https://www.youtube.com/embed/${videoId}`,
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  };
}

async function latestFromApi() {
  if (!YOUTUBE_API_KEY) return null;
  const params = new URLSearchParams({
    part: "snippet",
    channelId: YOUTUBE_CHANNEL_ID,
    type: "video",
    eventType: "completed",
    order: "date",
    maxResults: "1",
    key: YOUTUBE_API_KEY
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || `YouTube API failed: ${response.status}`);
  }
  const item = body.items?.[0];
  if (!item?.id?.videoId) return null;
  return {
    video_id: item.id.videoId,
    title: item.snippet?.title || "",
    published_at: item.snippet?.publishedAt || "",
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    embed_url: `https://www.youtube.com/embed/${item.id.videoId}`,
    thumbnail_url: item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
  };
}

async function getLatestVideo() {
  try {
    const apiVideo = await latestFromApi();
    if (apiVideo) return apiVideo;
  } catch (error) {
    console.warn(`YouTube API skipped: ${error.message}`);
  }
  return latestFromRss();
}

async function updateDirectus(video) {
  const token = await login();
  const sections = await request(`/items/site_sections?filter[section_key][_eq]=${encodeURIComponent(SECTION_KEY)}&limit=1`, {
    headers: jsonHeaders(token)
  });
  const section = sections.data?.[0];
  if (!section) throw new Error(`Directus section not found: ${SECTION_KEY}`);

  const content = {
    ...(section.content || {}),
    video_id: video.video_id,
    video_embed_url: video.embed_url,
    latest_video_title: video.title,
    latest_video_published_at: video.published_at,
    latest_video_url: video.url,
    latest_video_thumbnail_url: video.thumbnail_url,
    latest_video_synced_at: new Date().toISOString()
  };

  await request(`/items/site_sections/${section.id}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ content })
  });
}

async function main() {
  const video = await getLatestVideo();
  await updateDirectus(video);
  console.log(`[${new Date().toISOString()}] synced YouTube latest video: ${video.video_id} ${video.title}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
