(function () {
  const config = window.LOL_CMS_CONFIG;
  if (!config?.directusUrl && (!config?.supabaseUrl || !config?.supabaseKey)) return;

  const language = document.documentElement.lang?.startsWith("en") ? "en" : "zh";
  const supabaseHeaders = {
    apikey: config.supabaseKey
  };

  const escapeHtml = (value = "") => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const get = async (path) => {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, { headers: supabaseHeaders });
    if (!response.ok) throw new Error(`CMS request failed: ${response.status}`);
    return response.json();
  };

  const getDirectus = async (path) => {
    const response = await fetch(`${config.directusUrl}/items/${path}`);
    if (!response.ok) throw new Error(`Directus request failed: ${response.status}`);
    const payload = await response.json();
    return payload.data || [];
  };

  const text = (zh, en) => (language === "en" ? en || zh || "" : zh || en || "");
  const siteSettingKeys = [
    "brand.title",
    "brand.subtitle",
    "hero.eyebrow",
    "hero.title",
    "hero.copy",
    "hero.primary",
    "hero.secondary",
    "missionVerse.kicker",
    "missionVerse.text",
    "missionVerse.reference",
    "welcome.kicker",
    "welcome.title",
    "welcome.copy",
    "welcome.copy2",
    "about.kicker",
    "about.title",
    "about.copy1",
    "about.copy2",
    "services.kicker",
    "services.title",
    "services.copy",
    "new.kicker",
    "new.title",
    "new.step1.title",
    "new.step1.copy",
    "new.step2.title",
    "new.step2.copy",
    "new.step3.title",
    "new.step3.copy",
    "new.link",
    "ministries.kicker",
    "ministries.title",
    "ministries.worship.title",
    "ministries.worship.copy",
    "ministries.discipleship.title",
    "ministries.discipleship.copy",
    "ministries.community.title",
    "ministries.community.copy",
    "messages.kicker",
    "messages.title",
    "messages.copy",
    "giving.kicker",
    "giving.title",
    "giving.copy",
    "giving.note",
    "giving.account.label",
    "giving.account.value",
    "giving.asb.label",
    "giving.asb.value",
    "giving.fund.label",
    "giving.fund.value",
    "contact.kicker",
    "contact.title",
    "contact.copy",
    "contact.address.label",
    "contact.address.value",
    "contact.pastor.label",
    "contact.pastor.value",
    "contact.email.label",
    "contact.phone.label",
    "contact.button",
    "contact.mapButton",
    "footer.name",
    "footer.youtube",
    "footer.zoom",
    "footer.admin",
    "footer.copy"
  ];

  const settingField = (key, lang) => `${key.replaceAll(".", "_")}_${lang}`;
  const settingText = (settings, key) => text(settings?.[settingField(key, "zh")], settings?.[settingField(key, "en")]);

  const setText = (selector, value, root = document) => {
    const element = root.querySelector(selector);
    if (element && value) element.textContent = value;
  };

  const setVisible = (selector, visible) => {
    if (visible !== false) return;
    const element = document.querySelector(selector);
    if (element) element.hidden = true;
  };

  const configureLink = (element, href) => {
    if (!element || !href) return;
    element.href = href;
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      element.target = "_blank";
      element.rel = "noopener";
    } else {
      element.removeAttribute("target");
      element.removeAttribute("rel");
    }
  };

  const assetUrl = (file) => {
    if (!file) return "";
    if (typeof file === "string") return `${config.directusUrl}/assets/${file}`;
    return file.id ? `${config.directusUrl}/assets/${file.id}` : "";
  };

  const renderSiteSettings = (settings) => {
    if (!settings || Array.isArray(settings)) return;
    siteSettingKeys.forEach((key) => {
      const value = settingText(settings, key);
      if (!value) return;
      document.querySelectorAll(`[data-i18n="${key}"]`).forEach((element) => {
        element.textContent = value;
      });
      document.querySelectorAll(`[data-i18n-html="${key}"]`).forEach((element) => {
        element.innerHTML = value;
      });
    });

    setVisible(".topbar-event", settings.show_top_announcement);
    setVisible(".topbar-action", settings.show_top_announcement);
    setVisible(".mission-verse", settings.show_church_verse);
    setVisible("#ministries", settings.show_ministries);
    setVisible("#messages .video-preview", settings.show_youtube_preview);
    setVisible("#messages .scripture-card", settings.show_bible_reading);
    setVisible("#serving-tab", settings.show_service_roster);
    setVisible("#serving-panel", settings.show_service_roster);
    setVisible("#prayer-tab", settings.show_prayer_items);
    setVisible("#prayer-panel", settings.show_prayer_items);
    setVisible("#giving", settings.show_giving);
    setVisible("[data-back-to-top]", settings.show_back_to_top);

    if (settings.contact_email_value) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
        link.href = `mailto:${settings.contact_email_value}`;
        if (link.closest(".contact-list")) link.textContent = settings.contact_email_value;
      });
    }
    if (settings.contact_phone_value) {
      document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
        link.href = `tel:${settings.contact_phone_value.replaceAll(" ", "")}`;
        link.textContent = settings.contact_phone_value;
      });
    }
    const footerLinks = document.querySelectorAll(".footer-links a");
    configureLink(document.querySelector(".youtube-button"), settings.youtube_url);
    configureLink(footerLinks[0], settings.youtube_url);
    configureLink(document.querySelector(".zoom-action-row a"), settings.zoom_url);
    configureLink(footerLinks[1], settings.zoom_url);
    configureLink(document.querySelector(".contact-actions .button-outline"), settings.map_url);
    configureLink(footerLinks[2], settings.admin_url);
  };

  const renderTopAnnouncement = (section) => {
    const content = section?.content || {};
    const eventLink = document.querySelector(".topbar-event");
    const actionLink = document.querySelector(".topbar-action");
    if (!eventLink || !actionLink) return;
    const label = text(content.label_zh, content.label_en);
    const headline = text(content.headline_zh, content.headline_en);
    const detail = text(content.detail_zh, content.detail_en);
    const cta = text(content.cta_zh, content.cta_en);
    const url = content.url || "#updates";

    const spans = eventLink.querySelectorAll("span");
    if (spans[0] && label) spans[0].textContent = label;
    if (spans[1] && headline) spans[1].textContent = headline;
    if (spans[2] && detail) spans[2].textContent = detail;
    if (cta) actionLink.textContent = cta;
    configureLink(eventLink, url);
    configureLink(actionLink, url);
  };

  const renderTopAnnouncementItem = (item) => {
    if (!item || item.visible === false || item.status === "archived" || item.status === "draft") return;
    renderTopAnnouncement({
      content: {
        label_zh: item.label_zh,
        label_en: item.label_en,
        headline_zh: item.headline_zh,
        headline_en: item.headline_en,
        detail_zh: item.detail_zh,
        detail_en: item.detail_en,
        cta_zh: item.cta_zh,
        cta_en: item.cta_en,
        url: item.url
      }
    });
  };

  const renderGatherings = (section) => {
    const items = section?.content?.items;
    if (!Array.isArray(items)) return;
    const cards = document.querySelectorAll("#services .info-card");
    items.slice(0, cards.length).forEach((item, index) => {
      const card = cards[index];
      if (!card) return;
      setText("h3", text(item.title_zh, item.title_en), card);
      setText("h3 + p", text(item.time_zh, item.time_en), card);
      setText("h3 + p + p", text(item.description_zh, item.description_en), card);
      const image = card.querySelector("img");
      if (image && item.image) image.src = item.image;
    });
  };

  const renderGatheringItems = (items) => {
    if (!Array.isArray(items) || !items.length) return;
    const cards = document.querySelectorAll("#services .info-card");
    items.slice(0, cards.length).forEach((item, index) => {
      const card = cards[index];
      if (!card) return;
      setText("h3", text(item.title_zh, item.title_en), card);
      setText("h3 + p", text(item.time_zh, item.time_en), card);
      setText("h3 + p + p", text(item.description_zh, item.description_en), card);
      const image = card.querySelector("img");
      const src = assetUrl(item.image_file) || item.image_path;
      if (image && src) image.src = src;
    });
  };

  const youtubeEmbedUrl = (content) => {
    if (content?.video_embed_url) return content.video_embed_url;
    if (content?.video_id) return `https://www.youtube.com/embed/${content.video_id}`;
    return "";
  };

  const renderMessages = (section) => {
    const content = section?.content || {};
    const card = document.querySelector("#messages .online-card");
    if (!card) return;
    setText("h3", text(section.title_zh, section.title_en), card);
    setText("h3 + p", text(content.description_zh, content.description_en), card);
    const button = card.querySelector("a.button");
    if (button && content.youtube_url) button.href = content.youtube_url;
    const buttonText = button?.querySelector("span");
    if (buttonText) buttonText.textContent = text(content.button_zh, content.button_en) || buttonText.textContent;
    const iframe = card.querySelector("iframe");
    const embedUrl = youtubeEmbedUrl(content);
    if (iframe && embedUrl) iframe.src = embedUrl;
  };

  const renderMessagesData = (settings, latest) => {
    if (!settings && !latest) return;
    const card = document.querySelector("#messages .online-card");
    if (!card) return;
    if (settings?.status !== "draft" && settings?.status !== "archived") {
      setText("h3", text(settings?.title_zh, settings?.title_en), card);
      setText("h3 + p", text(settings?.description_zh, settings?.description_en), card);
      const button = card.querySelector("a.button");
      if (button && settings?.youtube_url) button.href = settings.youtube_url;
      const buttonText = button?.querySelector("span");
      if (buttonText) buttonText.textContent = text(settings?.button_zh, settings?.button_en) || buttonText.textContent;
    }
    const iframe = card.querySelector("iframe");
    const embedUrl = latest?.embed_url || (latest?.video_id ? `https://www.youtube.com/embed/${latest.video_id}` : "");
    if (iframe && embedUrl) iframe.src = embedUrl;
  };

  const renderBibleReading = (section) => {
    const content = section?.content || {};
    const card = document.querySelector("#messages .scripture-card");
    if (!card) return;
    setText("h3", text(section.title_zh, section.title_en), card);
    setText("h3 + p", text(content.time_zh, content.time_en), card);
    setText(".scripture-passage", language === "en"
      ? `Current reading: ${content.scripture_en || content.scripture_zh || ""}`
      : `本次經文：${content.scripture_zh || content.scripture_en || ""}`,
      card
    );
    const questions = language === "en" ? content.questions_en : content.questions_zh;
    const list = card.querySelector(".question-list ol");
    if (list && Array.isArray(questions)) {
      list.innerHTML = questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("");
    }
    const zoomLink = card.querySelector(".zoom-action-row a");
    if (zoomLink && content.zoom_url) zoomLink.href = content.zoom_url;
    const zoomCode = card.querySelector(".zoom-code");
    if (zoomCode && content.zoom_id) zoomCode.textContent = `Zoom （${content.zoom_id}）`;
  };

  const renderBibleReadingData = (reading, questions) => {
    if (!reading || reading.visible === false || reading.status === "draft" || reading.status === "archived") return;
    const card = document.querySelector("#messages .scripture-card");
    if (!card) return;
    setText("h3", text(reading.title_zh, reading.title_en), card);
    setText("h3 + p", text(reading.time_zh, reading.time_en), card);
    setText(".scripture-passage", language === "en"
      ? `Current reading: ${reading.scripture_en || reading.scripture_zh || ""}`
      : `本次經文：${reading.scripture_zh || reading.scripture_en || ""}`,
      card
    );
    const list = card.querySelector(".question-list ol");
    if (list && Array.isArray(questions) && questions.length) {
      list.innerHTML = questions
        .map((question) => `<li>${escapeHtml(text(question.question_zh, question.question_en))}</li>`)
        .join("");
    }
    const zoomLink = card.querySelector(".zoom-action-row a");
    if (zoomLink && reading.zoom_url) zoomLink.href = reading.zoom_url;
    const zoomCode = card.querySelector(".zoom-code");
    if (zoomCode && reading.zoom_id) zoomCode.textContent = `Zoom （${reading.zoom_id}）`;
  };

  const renderRoster = (roster) => {
    if (!roster?.rows?.length) return;
    const table = document.querySelector("#serving-panel .roster-table");
    if (!table) return;
    const caption = table.querySelector("caption");
    if (caption) caption.textContent = text(roster.title_zh, roster.title_en);
    const headings = table.querySelectorAll("thead th");
    if (headings[1]) headings[1].textContent = language === "en"
      ? roster.current_week_label_en || roster.current_week_label || "This Week"
      : roster.current_week_label || "本週";
    if (headings[2]) headings[2].textContent = language === "en"
      ? roster.next_week_label_en || roster.next_week_label || "Next Week"
      : roster.next_week_label || "下週";
    const body = table.querySelector("tbody");
    body.innerHTML = roster.rows.map((row) => {
      const currentText = escapeHtml(row.current);
      const nextText = escapeHtml(row.next);
      const current = row.emphasis ? `<strong>${currentText}</strong>` : currentText;
      const next = row.emphasis ? `<strong>${nextText}</strong>` : nextText;
      return `<tr><th scope="row">${escapeHtml(text(row.item_zh, row.item_en))}</th><td>${current}</td><td>${next}</td></tr>`;
    }).join("");
  };

  const renderPrayerItems = (items) => {
    if (!items?.length) return;
    const list = document.querySelector("#prayer-panel .prayer-list");
    if (!list) return;
    list.innerHTML = items
      .map((item) => `<li>${escapeHtml(text(item.body_zh, item.body_en))}</li>`)
      .join("");
  };

  const loadDirectusContent = async () => {
    const settings = await getDirectus("site_settings");
    renderSiteSettings(settings);

    const sections = await getDirectus("site_sections?filter[status][_eq]=published&fields=section_key,title_zh,title_en,content");
    const byKey = Object.fromEntries(sections.map((section) => [section.section_key, section]));

    const [topAnnouncement, gatheringItems, messageSettings, youtubeLatest, bibleReadings, bibleQuestions] = await Promise.all([
      getDirectus("homepage_announcements").catch(() => null),
      getDirectus("gathering_items?filter[status][_eq]=published&fields=title_zh,title_en,time_zh,time_en,description_zh,description_en,image_path,image_file,sort_order,status&sort=sort_order").catch(() => []),
      getDirectus("message_settings").catch(() => null),
      getDirectus("youtube_latest").catch(() => null),
      getDirectus("bible_readings").catch(() => null),
      getDirectus("bible_reading_questions?filter[status][_eq]=published&fields=question_zh,question_en,sort_order,status&sort=sort_order").catch(() => [])
    ]);

    renderTopAnnouncementItem(topAnnouncement);
    if (!topAnnouncement) renderTopAnnouncement(byKey.top_announcement);
    if (gatheringItems.length) renderGatheringItems(gatheringItems);
    else renderGatherings(byKey.gatherings);
    if (messageSettings || youtubeLatest) renderMessagesData(messageSettings, youtubeLatest);
    else renderMessages(byKey.messages);
    if (bibleReadings) renderBibleReadingData(bibleReadings, bibleQuestions);
    else renderBibleReading(byKey.bible_reading);

    const rosters = await getDirectus("service_rosters?filter[status][_eq]=published&fields=id,title_zh,title_en,current_week_label,current_week_label_en,next_week_label,next_week_label_en,rows&sort=-week_start&limit=1");
    if (rosters[0]?.id) {
      const rosterRows = await getDirectus(`service_roster_rows?filter[roster_id][_eq]=${rosters[0].id}&fields=item_zh,item_en,current,next,emphasis,sort_order&sort=sort_order`);
      renderRoster({ ...rosters[0], rows: rosterRows.length ? rosterRows : rosters[0].rows });
    } else {
      renderRoster(rosters[0]);
    }

    const prayerItems = await getDirectus("prayer_items?filter[status][_eq]=published&fields=body_zh,body_en,is_pinned,sort_order&sort=-is_pinned,sort_order");
    renderPrayerItems(prayerItems);
  };

  const loadSupabaseContent = async () => {
    const sections = await get("site_sections?status=eq.published&select=section_key,title_zh,title_en,content");
    const byKey = Object.fromEntries(sections.map((section) => [section.section_key, section]));
    renderTopAnnouncement(byKey.top_announcement);
    renderGatherings(byKey.gatherings);
    renderMessages(byKey.messages);
    renderBibleReading(byKey.bible_reading);

    const rosters = await get("service_rosters?status=eq.published&select=title_zh,title_en,current_week_label,next_week_label,rows&order=week_start.desc&limit=1");
    renderRoster(rosters[0]);

    const prayerItems = await get("prayer_items?status=eq.published&select=body_zh,body_en,is_pinned,sort_order,created_at&order=is_pinned.desc,sort_order.asc,created_at.desc");
    renderPrayerItems(prayerItems);
  };

  const loadCmsContent = async () => {
    try {
      if (config.directusUrl) {
        await loadDirectusContent();
      } else {
        await loadSupabaseContent();
      }
    } catch (error) {
      if (config.directusUrl && config.supabaseUrl && config.supabaseKey) {
        try {
          await loadSupabaseContent();
          return;
        } catch (fallbackError) {
          console.warn("CMS content fallback used.", fallbackError);
        }
      } else {
        console.warn("CMS content fallback used.", error);
      }
    }
  };

  loadCmsContent();
})();
