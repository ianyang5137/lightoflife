const config = window.LOL_CMS_CONFIG;
const client = window.supabase?.createClient(config.supabaseUrl, config.supabaseKey);

const sections = [
  { key: "gatherings", label: "聚會時間", kicker: "Gatherings" },
  { key: "messages", label: "主日信息", kicker: "Messages" },
  { key: "bible_reading", label: "線上讀經", kicker: "Bible Reading" },
  { key: "service_rosters", label: "服事表", kicker: "Serving Roster" },
  { key: "prayer_items", label: "代禱事項", kicker: "Prayer Items" }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  session: null,
  profile: null,
  permissions: [],
  currentSection: null
};

const loginPanel = $("[data-login-panel]");
const dashboard = $("[data-dashboard]");
const nav = $("[data-admin-nav]");
const body = $("[data-workspace-body]");
const title = $("[data-workspace-title]");
const kicker = $("[data-workspace-kicker]");
const saveStatus = $("[data-save-status]");

const setStatus = (message, isError = false) => {
  saveStatus.textContent = message || "";
  saveStatus.style.color = isError ? "#a33d35" : "";
};

const escapeHtml = (value = "") => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const lines = (value = "") => String(value)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const canAccess = (sectionKey) => {
  if (state.profile?.role === "admin") return true;
  return state.permissions.includes(sectionKey);
};

const sectionLabel = (key) => sections.find((section) => section.key === key)?.label || key;

const selectOne = async (table, query) => {
  const { data, error } = await query.single();
  if (error) throw error;
  return data;
};

const loadProfile = async () => {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) return null;
  return selectOne("profiles", client
    .from("profiles")
    .select("id,email,display_name,role,is_active")
    .eq("id", user.id)
  );
};

const loadPermissions = async () => {
  if (state.profile?.role === "admin") {
    state.permissions = sections.map((section) => section.key);
    return;
  }
  if (state.profile?.role !== "editor") {
    state.permissions = [];
    return;
  }
  const { data, error } = await client
    .from("section_permissions")
    .select("section_key")
    .eq("user_id", state.profile.id)
    .eq("can_edit", true);
  if (error) {
    body.innerHTML = `<div class="empty-state">還沒有安裝板塊權限表。請先在 Supabase SQL Editor 執行 <code>supabase/section-permissions.sql</code>。</div>`;
    throw error;
  }
  state.permissions = data.map((item) => item.section_key);
};

const showDashboard = () => {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  $("[data-user-summary]").textContent = `${state.profile.email} · ${state.profile.role}`;
};

const showLogin = () => {
  dashboard.hidden = true;
  loginPanel.hidden = false;
};

const renderNav = () => {
  const allowed = sections.filter((section) => canAccess(section.key));
  const userButton = state.profile.role === "admin"
    ? `<button type="button" data-section="users">用户與權限</button>`
    : "";
  nav.innerHTML = [
    ...allowed.map((section) => `<button type="button" data-section="${section.key}">${section.label}</button>`),
    userButton
  ].join("");

  $$("[data-section]", nav).forEach((button) => {
    button.addEventListener("click", () => renderSection(button.dataset.section));
  });

  const first = allowed[0]?.key || (state.profile.role === "admin" ? "users" : null);
  if (first) renderSection(first);
  else {
    body.innerHTML = `<div class="empty-state">你的帳號目前沒有可編輯的板塊，請聯絡管理員分配權限。</div>`;
  }
};

const setHeading = (sectionKey) => {
  $$("[data-section]", nav).forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionKey);
  });
  if (sectionKey === "users") {
    kicker.textContent = "Permissions";
    title.textContent = "用户與權限";
    return;
  }
  const section = sections.find((item) => item.key === sectionKey);
  kicker.textContent = section?.kicker || "Content";
  title.textContent = section?.label || "網站內容";
};

const loadSiteSection = async (sectionKey) => selectOne("site_sections", client
  .from("site_sections")
  .select("*")
  .eq("section_key", sectionKey)
);

const saveSiteSection = async (sectionKey, payload) => {
  setStatus("正在保存...");
  const { error } = await client
    .from("site_sections")
    .update({ ...payload, updated_by: state.profile.id })
    .eq("section_key", sectionKey);
  if (error) throw error;
  setStatus("已保存");
};

const renderGatherings = async () => {
  const section = await loadSiteSection("gatherings");
  const items = section.content?.items || [];
  body.innerHTML = `
    <form class="stack" data-gatherings-form>
      <section class="panel">
        <h2>區塊標題</h2>
        <div class="form-grid">
          <label>中文標題<input name="title_zh" value="${escapeHtml(section.title_zh)}" /></label>
          <label>英文標題<input name="title_en" value="${escapeHtml(section.title_en)}" /></label>
        </div>
      </section>
      ${items.map((item, index) => `
        <section class="panel">
          <h2>${escapeHtml(item.title_zh || `聚會 ${index + 1}`)}</h2>
          <div class="form-grid">
            <label>中文名稱<input name="item_${index}_title_zh" value="${escapeHtml(item.title_zh)}" /></label>
            <label>英文名稱<input name="item_${index}_title_en" value="${escapeHtml(item.title_en)}" /></label>
            <label>中文時間<input name="item_${index}_time_zh" value="${escapeHtml(item.time_zh)}" /></label>
            <label>英文時間<input name="item_${index}_time_en" value="${escapeHtml(item.time_en)}" /></label>
            <label class="full">中文簡介<textarea name="item_${index}_description_zh">${escapeHtml(item.description_zh)}</textarea></label>
            <label class="full">英文簡介<textarea name="item_${index}_description_en">${escapeHtml(item.description_en)}</textarea></label>
            <label class="full">圖片路徑<input name="item_${index}_image" value="${escapeHtml(item.image)}" /></label>
          </div>
        </section>
      `).join("")}
      <div class="actions"><button class="primary-button" type="submit">保存聚會時間</button></div>
    </form>
  `;

  $("[data-gatherings-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updatedItems = items.map((item, index) => ({
      ...item,
      title_zh: form.get(`item_${index}_title_zh`),
      title_en: form.get(`item_${index}_title_en`),
      time_zh: form.get(`item_${index}_time_zh`),
      time_en: form.get(`item_${index}_time_en`),
      description_zh: form.get(`item_${index}_description_zh`),
      description_en: form.get(`item_${index}_description_en`),
      image: form.get(`item_${index}_image`)
    }));
    await saveSiteSection("gatherings", {
      title_zh: form.get("title_zh"),
      title_en: form.get("title_en"),
      content: { ...section.content, items: updatedItems }
    });
  });
};

const renderMessages = async () => {
  const section = await loadSiteSection("messages");
  const content = section.content || {};
  body.innerHTML = `
    <form class="panel" data-messages-form>
      <h2>主日信息</h2>
      <div class="form-grid">
        <label>中文標題<input name="title_zh" value="${escapeHtml(section.title_zh)}" /></label>
        <label>英文標題<input name="title_en" value="${escapeHtml(section.title_en)}" /></label>
        <label class="full">中文簡介<textarea name="description_zh">${escapeHtml(content.description_zh)}</textarea></label>
        <label class="full">英文簡介<textarea name="description_en">${escapeHtml(content.description_en)}</textarea></label>
        <label>YouTube 頻道連結<input name="youtube_url" value="${escapeHtml(content.youtube_url)}" /></label>
        <label>首頁預覽影片 ID<input name="video_id" value="${escapeHtml(content.video_id || "5iVDJWHDsdA")}" /></label>
        <label>中文按鈕文字<input name="button_zh" value="${escapeHtml(content.button_zh)}" /></label>
        <label>英文按鈕文字<input name="button_en" value="${escapeHtml(content.button_en)}" /></label>
      </div>
      <div class="actions"><button class="primary-button" type="submit">保存主日信息</button></div>
    </form>
  `;
  $("[data-messages-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveSiteSection("messages", {
      title_zh: form.get("title_zh"),
      title_en: form.get("title_en"),
      content: {
        ...content,
        description_zh: form.get("description_zh"),
        description_en: form.get("description_en"),
        youtube_url: form.get("youtube_url"),
        video_id: form.get("video_id"),
        button_zh: form.get("button_zh"),
        button_en: form.get("button_en")
      }
    });
  });
};

const renderBibleReading = async () => {
  const section = await loadSiteSection("bible_reading");
  const content = section.content || {};
  body.innerHTML = `
    <form class="panel" data-bible-form>
      <h2>線上讀經</h2>
      <div class="form-grid">
        <label>中文標題<input name="title_zh" value="${escapeHtml(section.title_zh)}" /></label>
        <label>英文標題<input name="title_en" value="${escapeHtml(section.title_en)}" /></label>
        <label>中文時間<input name="time_zh" value="${escapeHtml(content.time_zh)}" /></label>
        <label>英文時間<input name="time_en" value="${escapeHtml(content.time_en)}" /></label>
        <label>Zoom 號碼<input name="zoom_id" value="${escapeHtml(content.zoom_id)}" /></label>
        <label>Zoom 連結<input name="zoom_url" value="${escapeHtml(content.zoom_url)}" /></label>
        <label>中文經文<input name="scripture_zh" value="${escapeHtml(content.scripture_zh)}" /></label>
        <label>英文經文<input name="scripture_en" value="${escapeHtml(content.scripture_en)}" /></label>
        <label class="full">中文思想問題（一行一題）<textarea name="questions_zh">${escapeHtml((content.questions_zh || []).join("\n"))}</textarea></label>
        <label class="full">英文思想問題（一行一題）<textarea name="questions_en">${escapeHtml((content.questions_en || []).join("\n"))}</textarea></label>
      </div>
      <div class="actions"><button class="primary-button" type="submit">保存線上讀經</button></div>
    </form>
  `;
  $("[data-bible-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await saveSiteSection("bible_reading", {
      title_zh: form.get("title_zh"),
      title_en: form.get("title_en"),
      content: {
        ...content,
        time_zh: form.get("time_zh"),
        time_en: form.get("time_en"),
        zoom_id: form.get("zoom_id"),
        zoom_url: form.get("zoom_url"),
        scripture_zh: form.get("scripture_zh"),
        scripture_en: form.get("scripture_en"),
        questions_zh: lines(form.get("questions_zh")),
        questions_en: lines(form.get("questions_en"))
      }
    });
  });
};

const loadLatestRoster = async () => {
  const { data, error } = await client
    .from("service_rosters")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data[0];
};

const renderRoster = async () => {
  const roster = await loadLatestRoster();
  if (!roster) {
    body.innerHTML = `<div class="empty-state">還沒有服事表資料，請先在資料庫建立第一份服事表。</div>`;
    return;
  }
  body.innerHTML = `
    <form class="stack" data-roster-form>
      <section class="panel">
        <h2>日期與標題</h2>
        <div class="form-grid">
          <label>中文標題<input name="title_zh" value="${escapeHtml(roster.title_zh)}" /></label>
          <label>英文標題<input name="title_en" value="${escapeHtml(roster.title_en)}" /></label>
          <label>本週日期標籤<input name="current_week_label" value="${escapeHtml(roster.current_week_label)}" /></label>
          <label>下週日期標籤<input name="next_week_label" value="${escapeHtml(roster.next_week_label)}" /></label>
        </div>
      </section>
      <section class="panel">
        <h2>服事人員</h2>
        <div class="roster-grid">
          ${roster.rows.map((row, index) => `
            <div class="roster-row">
              <strong>${escapeHtml(row.item_zh || row.item_en)}</strong>
              <label>本週<input name="row_${index}_current" value="${escapeHtml(row.current)}" /></label>
              <label>下週<input name="row_${index}_next" value="${escapeHtml(row.next)}" /></label>
            </div>
          `).join("")}
        </div>
      </section>
      <div class="actions"><button class="primary-button" type="submit">保存服事表</button></div>
    </form>
  `;
  $("[data-roster-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rows = roster.rows.map((row, index) => ({
      ...row,
      current: form.get(`row_${index}_current`),
      next: form.get(`row_${index}_next`)
    }));
    setStatus("正在保存...");
    const { error } = await client
      .from("service_rosters")
      .update({
        title_zh: form.get("title_zh"),
        title_en: form.get("title_en"),
        current_week_label: form.get("current_week_label"),
        next_week_label: form.get("next_week_label"),
        rows,
        updated_by: state.profile.id
      })
      .eq("id", roster.id);
    if (error) throw error;
    setStatus("已保存");
  });
};

const loadPrayerItems = async () => {
  const { data, error } = await client
    .from("prayer_items")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

const renderPrayer = async () => {
  const items = await loadPrayerItems();
  body.innerHTML = `
    <div class="stack">
      ${items.map((item, index) => `
        <form class="panel" data-prayer-form data-id="${item.id}">
          <h2>代禱事項 ${index + 1}</h2>
          <div class="form-grid">
            <label>中文標題<input name="title_zh" value="${escapeHtml(item.title_zh)}" /></label>
            <label>英文標題<input name="title_en" value="${escapeHtml(item.title_en)}" /></label>
            <label class="full">中文內容<textarea name="body_zh">${escapeHtml(item.body_zh)}</textarea></label>
            <label class="full">英文內容<textarea name="body_en">${escapeHtml(item.body_en)}</textarea></label>
          </div>
          <div class="actions"><button class="primary-button" type="submit">保存這一項</button></div>
        </form>
      `).join("")}
      <form class="panel" data-new-prayer-form>
        <h2>新增代禱事項</h2>
        <div class="form-grid">
          <label>中文標題<input name="title_zh" /></label>
          <label>英文標題<input name="title_en" /></label>
          <label class="full">中文內容<textarea name="body_zh"></textarea></label>
          <label class="full">英文內容<textarea name="body_en"></textarea></label>
        </div>
        <div class="actions"><button class="secondary-button" type="submit">新增</button></div>
      </form>
    </div>
  `;
  $$("[data-prayer-form]").forEach((formElement) => {
    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setStatus("正在保存...");
      const { error } = await client
        .from("prayer_items")
        .update({
          title_zh: form.get("title_zh"),
          title_en: form.get("title_en"),
          body_zh: form.get("body_zh"),
          body_en: form.get("body_en"),
          updated_by: state.profile.id
        })
        .eq("id", event.currentTarget.dataset.id);
      if (error) throw error;
      setStatus("已保存");
    });
  });
  $("[data-new-prayer-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("正在新增...");
    const { error } = await client
      .from("prayer_items")
      .insert({
        title_zh: form.get("title_zh"),
        title_en: form.get("title_en"),
        body_zh: form.get("body_zh"),
        body_en: form.get("body_en"),
        item_type: "prayer",
        status: "published",
        sort_order: items.length + 1,
        published_at: new Date().toISOString(),
        created_by: state.profile.id,
        updated_by: state.profile.id
      });
    if (error) throw error;
    setStatus("已新增");
    renderPrayer();
  });
};

const renderUsers = async () => {
  if (state.profile.role !== "admin") return;
  const [{ data: profiles, error: profileError }, { data: permissions, error: permissionError }] = await Promise.all([
    client.from("profiles").select("id,email,display_name,role,is_active").order("email"),
    client.from("section_permissions").select("user_id,section_key,can_edit")
  ]);
  if (profileError) throw profileError;
  if (permissionError) throw permissionError;
  body.innerHTML = `
    <div class="stack">
      <div class="empty-state">新增用户請先到 Supabase Authentication 建立帳號；用户第一次建立後會出現在這裡。普通用户只能編輯被勾選的板塊。</div>
      ${profiles.map((profile) => {
        const userPermissions = permissions
          .filter((permission) => permission.user_id === profile.id && permission.can_edit)
          .map((permission) => permission.section_key);
        return `
          <form class="panel" data-user-form data-id="${profile.id}">
            <h2>${escapeHtml(profile.email)}</h2>
            <div class="form-grid">
              <label>顯示名稱<input name="display_name" value="${escapeHtml(profile.display_name)}" /></label>
              <label>角色
                <select name="role">
                  ${["admin", "editor", "viewer"].map((role) => `<option value="${role}" ${profile.role === role ? "selected" : ""}>${role}</option>`).join("")}
                </select>
              </label>
            </div>
            <h3>可編輯板塊</h3>
            <div class="permission-grid">
              ${sections.map((section) => `
                <label class="checkbox-label">
                  <input type="checkbox" name="section" value="${section.key}" ${userPermissions.includes(section.key) ? "checked" : ""} />
                  ${section.label}
                </label>
              `).join("")}
            </div>
            <div class="actions"><button class="primary-button" type="submit">保存用户權限</button></div>
          </form>
        `;
      }).join("")}
    </div>
  `;
  $$("[data-user-form]").forEach((formElement) => {
    formElement.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const userId = event.currentTarget.dataset.id;
      const allowedSections = form.getAll("section");
      setStatus("正在保存用户...");
      const { error: profileUpdateError } = await client
        .from("profiles")
        .update({
          display_name: form.get("display_name"),
          role: form.get("role")
        })
        .eq("id", userId);
      if (profileUpdateError) throw profileUpdateError;
      const { error: deleteError } = await client
        .from("section_permissions")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;
      if (allowedSections.length) {
        const { error: insertError } = await client
          .from("section_permissions")
          .insert(allowedSections.map((sectionKey) => ({
            user_id: userId,
            section_key: sectionKey,
            can_edit: true,
            assigned_by: state.profile.id
          })));
        if (insertError) throw insertError;
      }
      setStatus("用户權限已保存");
    });
  });
};

const renderSection = async (sectionKey) => {
  try {
    setStatus("");
    state.currentSection = sectionKey;
    setHeading(sectionKey);
    body.innerHTML = `<div class="empty-state">正在載入 ${sectionLabel(sectionKey)}...</div>`;
    if (sectionKey === "gatherings") await renderGatherings();
    if (sectionKey === "messages") await renderMessages();
    if (sectionKey === "bible_reading") await renderBibleReading();
    if (sectionKey === "service_rosters") await renderRoster();
    if (sectionKey === "prayer_items") await renderPrayer();
    if (sectionKey === "users") await renderUsers();
  } catch (error) {
    console.error(error);
    body.innerHTML = `<div class="empty-state">載入或保存時出錯：${escapeHtml(error.message)}</div>`;
    setStatus(error.message, true);
  }
};

const initialize = async () => {
  if (!client) {
    $("[data-login-message]").textContent = "Supabase 設定未載入。";
    return;
  }
  const { data } = await client.auth.getSession();
  state.session = data.session;
  if (!state.session) {
    showLogin();
    return;
  }
  state.profile = await loadProfile();
  if (!state.profile?.is_active) {
    await client.auth.signOut();
    showLogin();
    $("[data-login-message]").textContent = "帳號未啟用，請聯絡管理員。";
    return;
  }
  await loadPermissions();
  showDashboard();
  renderNav();
};

$("[data-login-form]").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("[data-login-message]");
  const form = new FormData(event.currentTarget);
  message.textContent = "登入中...";
  const { error } = await client.auth.signInWithPassword({
    email: form.get("email"),
    password: form.get("password")
  });
  if (error) {
    message.textContent = error.message;
    return;
  }
  message.textContent = "";
  initialize();
});

$("[data-sign-out]").addEventListener("click", async () => {
  await client.auth.signOut();
  location.reload();
});

initialize();
