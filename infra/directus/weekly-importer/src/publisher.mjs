import { createItem, deleteItem, getItems, patchItem, patchSingleton } from "./directus.mjs";

async function clearCollection(token, collection) {
  const items = await getItems(token, collection, "?limit=-1&fields=id");
  for (const item of items) await deleteItem(token, collection, item.id);
}

async function upsertByField(token, collection, field, payload) {
  const value = encodeURIComponent(payload[field] || "");
  const existing = await getItems(token, collection, `?filter[${field}][_eq]=${value}&limit=1&fields=id`);
  if (existing[0]) {
    await patchItem(token, collection, existing[0].id, payload);
    return existing[0].id;
  }
  const created = await createItem(token, collection, payload);
  return created.data?.id;
}

async function snapshot(token) {
  const [messageSettings, bibleReadings, questions, rosters, rosterRows, prayerItems] = await Promise.all([
    getItems(token, "message_settings").catch(() => null),
    getItems(token, "bible_readings").catch(() => null),
    getItems(token, "bible_reading_questions", "?limit=-1&sort=sort_order").catch(() => []),
    getItems(token, "service_rosters", "?limit=3&sort=-week_start").catch(() => []),
    getItems(token, "service_roster_rows", "?limit=-1&sort=sort_order").catch(() => []),
    getItems(token, "prayer_items", "?limit=-1&sort=sort_order").catch(() => [])
  ]);
  return { messageSettings, bibleReadings, questions, rosters, rosterRows, prayerItems };
}

export async function publishBulletin(token, bulletin) {
  const data = bulletin.parsed_data || {};
  const before = await snapshot(token);

  if (data.sermon) {
    await patchSingleton(token, "message_settings", {
      title_zh: "主日信息",
      title_en: "Sunday Messages",
      description_zh: data.sermon.content_zh || "透過 YouTube 收看主日信息、敬拜與近期聚會更新。",
      description_en: data.sermon.content_en || "Watch Sunday messages, worship, and recent updates on YouTube.",
      button_zh: "在線觀看",
      button_en: "Watch Online",
      status: "published"
    }).catch(() => null);
    await upsertByField(token, "sermons", "title_zh", data.sermon).catch(() => null);
  }

  if (data.bibleReading) {
    await patchSingleton(token, "bible_readings", {
      title_zh: data.bibleReading.title_zh || "線上讀經",
      title_en: data.bibleReading.title_en || "Online Bible Reading",
      time_zh: data.bibleReading.time_zh || "每週二晚上 7:30",
      time_en: data.bibleReading.time_en || "Every Tuesday at 7:30 PM",
      scripture_zh: data.bibleReading.scripture_zh || "",
      scripture_en: data.bibleReading.scripture_en || "",
      visible: true,
      status: "published"
    }).catch(() => null);

    if (Array.isArray(data.bibleReading.questions) && data.bibleReading.questions.length) {
      await clearCollection(token, "bible_reading_questions");
      for (const [index, question] of data.bibleReading.questions.entries()) {
        await createItem(token, "bible_reading_questions", {
          question_zh: question,
          question_en: "",
          sort_order: index + 1,
          status: "published"
        });
      }
    }
  }

  if (data.roster?.rows?.length) {
    const rosterId = await upsertByField(token, "service_rosters", "week_start", {
      title_zh: data.roster.title_zh || "本週與下週主日服事表",
      title_en: data.roster.title_en || "This Week and Next Week Service Roster",
      week_start: data.roster.week_start || data.bulletinDate,
      current_week_label: data.roster.current_week_label || "",
      current_week_label_en: data.roster.current_week_label_en || "",
      next_week_label: data.roster.next_week_label || "",
      next_week_label_en: data.roster.next_week_label_en || "",
      rows: data.roster.rows,
      status: "published"
    });
    const existingRows = await getItems(token, "service_roster_rows", `?filter[roster_id][_eq]=${rosterId}&limit=-1&fields=id`);
    for (const row of existingRows) await deleteItem(token, "service_roster_rows", row.id);
    for (const [index, row] of data.roster.rows.entries()) {
      await createItem(token, "service_roster_rows", {
        roster_id: rosterId,
        item_zh: row.item_zh,
        item_en: row.item_en,
        current: row.current,
        next: row.next,
        emphasis: row.emphasis === true,
        sort_order: index + 1
      });
    }
  }

  if (Array.isArray(data.prayerItems) && data.prayerItems.length) {
    await clearCollection(token, "prayer_items");
    for (const item of data.prayerItems) await createItem(token, "prayer_items", item);
  }

  await patchItem(token, "weekly_bulletins", bulletin.id, {
    process_status: "published",
    published_at: new Date().toISOString(),
    published_snapshot: before,
    error_message: null
  });
}
