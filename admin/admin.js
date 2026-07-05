const config = window.LOL_CMS_CONFIG;
const client = window.supabase?.createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});
const supabaseUsersUrl = "https://supabase.com/dashboard/project/odthwmpyhaqagdphcooi/auth/users";

const sections = [
  { key: "top_announcement", label: "顶部预告", kicker: "Announcement" },
  { key: "gatherings", label: "聚會時間", kicker: "Gatherings" },
  { key: "messages", label: "主日信息", kicker: "Messages" },
  { key: "bible_reading", label: "線上讀經", kicker: "Bible Reading" },
  { key: "service_rosters", label: "服事表", kicker: "Serving Roster" },
  { key: "prayer_items", label: "代禱事項", kicker: "Prayer Items" }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const state = {
  authUser: null,
  session: null,
  profile: null,
  permissions: [],
  currentSection: null,
  renderToken: 0
};

const loginPanel = $("[data-login-panel]");
const dashboard = $("[data-dashboard]");
const nav = $("[data-admin-nav]");
const body = $("[data-workspace-body]");
const title = $("[data-workspace-title]");
const kicker = $("[data-workspace-kicker]");
const saveStatus = $("[data-save-status]");
const authKicker = $("[data-auth-kicker]");
const authTitle = $("[data-auth-title]");
const loginForm = $("[data-login-form]");
const registerForm = $("[data-register-form]");
const requestPanel = $("[data-request-panel]");
let statusTimer = null;

const setStatus = (message, isError = false, autoClear = true) => {
  window.clearTimeout(statusTimer);
  saveStatus.textContent = message || "";
  saveStatus.classList.toggle("error", isError);
  if (message && autoClear) {
    statusTimer = window.setTimeout(() => setStatus("", false, false), 3200);
  }
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

const isAdmin = () => state.profile?.role === "admin";

const sectionLabel = (key) => sections.find((section) => section.key === key)?.label || key;

const authRedirectUrl = `${window.location.origin}/admin/`;

const titleField = (name, label, value) => {
  const disabled = isAdmin() ? "" : " disabled";
  return `<label>${label}<input name="${name}" value="${escapeHtml(value)}"${disabled} /></label>`;
};

const lockedTitleNote = () => isAdmin()
  ? ""
  : `<p class="field-note full">此區塊的一級中英文標題只有管理員可以修改。</p>`;

const titlePayload = (source, form) => ({
  title_zh: isAdmin() ? form.get("title_zh") : source.title_zh,
  title_en: isAdmin() ? form.get("title_en") : source.title_en
});

const imagePathField = (name, value = "") => `
  <label class="full image-path-field">
    圖片路徑
    <input name="${name}" value="${escapeHtml(value)}" data-image-path-input />
    <span class="image-preview-label">目前圖片預覽</span>
    <span class="image-preview-frame">
      ${value
        ? `<img src="${escapeHtml(value)}" alt="圖片預覽" data-image-preview />`
        : `<span class="image-preview-empty" data-image-preview-empty>尚未設定圖片路徑</span>`}
    </span>
  </label>
`;

const bindImagePreviews = (root = document) => {
  $$("[data-image-path-input]", root).forEach((input) => {
    const field = input.closest(".image-path-field");
    const frame = $(".image-preview-frame", field);
    const render = (src) => {
      if (!frame) return;
      const trimmed = String(src || "").trim();
      frame.innerHTML = trimmed
        ? `<img src="${escapeHtml(trimmed)}" alt="圖片預覽" data-image-preview />`
        : `<span class="image-preview-empty" data-image-preview-empty>尚未設定圖片路徑</span>`;
    };
    input.addEventListener("input", () => render(input.value));
  });

  $$("[data-image-file-input]", root).forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const pathInput = input.form?.elements[input.dataset.pathTarget];
      if (!pathInput) return;
      const field = pathInput.closest(".image-path-field");
      const frame = $(".image-preview-frame", field);
      if (!frame) return;
      const previewUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => URL.revokeObjectURL(previewUrl);
      image.alt = "即將上傳的圖片預覽";
      image.src = previewUrl;
      frame.replaceChildren(image);
    });
  });
};

const formatSections = (sectionKeys = []) => sectionKeys
  .map((key) => sectionLabel(key))
  .join("、") || "未選擇";

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const withTimeout = (promise, label = "請求", ms = 12000) => Promise.race([
  promise,
  new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(`${label} 超時，請稍後再試`)), ms);
  })
]);

const runQuery = async (queryFactory, label = "資料讀取") => {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await withTimeout(queryFactory(), label);
      if (result.error) throw result.error;
      return result.data;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await wait(500);
    }
  }
  throw lastError;
};

const selectOne = async (label, queryFactory) => {
  const data = await runQuery(() => queryFactory().single(), label);
  return data;
};

const selectMaybeOne = async (label, queryFactory) => {
  const data = await runQuery(() => queryFactory().maybeSingle(), label);
  return data;
};

const isCurrentRender = (token) => token === state.renderToken;

const renderTimed = (work, label) => withTimeout(work(), label, 14000);

const uploadImage = async (file, folder = "general") => {
  if (!file || file.size === 0) return "";
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const fileName = `${folder}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
  setStatus("正在上傳圖片...", false, false);
  const { error } = await client.storage
    .from("site-media")
    .upload(fileName, file, {
      cacheControl: "31536000",
      upsert: false
    });
  if (error) throw error;
  const { data } = client.storage.from("site-media").getPublicUrl(fileName);
  setStatus("圖片已上傳，正在保存內容...", false, false);
  return data.publicUrl;
};

const loadProfile = async () => {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  state.authUser = user;
  if (!user) return null;
  const profile = await selectMaybeOne("讀取用户資料", () => client
    .from("profiles")
    .select("id,email,display_name,role,is_active")
    .eq("id", user.id)
  );
  if (profile) return profile;

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "";
  const inserted = await selectOne("建立用户資料", () => client
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      display_name: displayName,
      role: "viewer",
      is_active: false
    })
    .select("id,email,display_name,role,is_active")
  );
  return inserted;
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
  const data = await runQuery(() => client
    .from("section_permissions")
    .select("section_key")
    .eq("user_id", state.profile.id)
    .eq("can_edit", true), "讀取板塊權限");
  if (!data) {
    body.innerHTML = `<div class="empty-state">還沒有安裝板塊權限表。請先在 Supabase SQL Editor 執行 <code>supabase/section-permissions.sql</code>。</div>`;
  }
  state.permissions = data.map((item) => item.section_key);
};

const showDashboard = () => {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  $("[data-user-summary]").textContent = `${state.profile.email} · ${state.profile.role}`;
};

const showLogin = () => {
  dashboard.hidden = true;
  loginPanel.hidden = false;
  setAuthMode("login");
};

const renderRegisterSections = () => {
  const target = $("[data-register-sections]");
  if (!target) return;
  target.innerHTML = `
    <p class="field-note">希望申請編輯的板塊</p>
    ${sections.map((section) => `
      <label class="checkbox-label">
        <input type="checkbox" name="section" value="${section.key}" />
        ${section.label}
      </label>
    `).join("")}
  `;
};

const setAuthMode = (mode) => {
  authKicker.textContent = mode === "register" ? "Account Request" : "Website Admin";
  authTitle.textContent = mode === "register" ? "申請後台帳號" : "生命之光靈糧堂後台";
  loginForm.hidden = mode !== "login";
  registerForm.hidden = mode !== "register";
  requestPanel.hidden = true;
  $("[data-show-register]").hidden = mode !== "login";
  $("[data-show-login]").hidden = mode === "login";
  if (mode === "register") renderRegisterSections();
};

const requestStatusLabel = (status) => ({
  pending: "等待審核",
  approved: "已批准",
  rejected: "已拒絕"
}[status] || status);

const saveAccessRequest = async (form) => {
  const requestedSections = form.getAll("section");
  const displayName = form.get("display_name") || state.profile?.display_name || "";
  const note = form.get("note") || "";
  await runQuery(() => client
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", state.profile.id), "更新申請人資料");
  await runQuery(() => client
    .from("admin_access_requests")
    .upsert({
      user_id: state.profile.id,
      email: state.profile.email,
      display_name: displayName,
      requested_sections: requestedSections,
      note,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_note: null
    }, { onConflict: "user_id" }), "送出帳號申請");
};

const loadOwnAccessRequest = async () => selectMaybeOne("讀取帳號申請", () => client
  .from("admin_access_requests")
  .select("*")
  .eq("user_id", state.profile.id)
);

const renderRequestGate = async () => {
  dashboard.hidden = true;
  loginPanel.hidden = false;
  loginForm.hidden = true;
  registerForm.hidden = true;
  requestPanel.hidden = false;
  $("[data-show-register]").hidden = true;
  $("[data-show-login]").hidden = false;
  authKicker.textContent = "Account Review";
  authTitle.textContent = "帳號審核";

  const request = await loadOwnAccessRequest();
  const metadata = state.authUser?.user_metadata || {};
  const defaultSections = request?.requested_sections || metadata.requested_sections || [];
  const defaultName = request?.display_name || state.profile?.display_name || metadata.display_name || "";
  const defaultNote = request?.note || metadata.request_note || "";
  if (request?.status === "pending" || request?.status === "approved") {
    requestPanel.innerHTML = `
      <div class="request-summary">
        <span class="request-status ${escapeHtml(request.status)}">${requestStatusLabel(request.status)}</span>
        <p>你的 Email 已驗證，後台權限正在等待管理員審核。</p>
        <p><strong>申請板塊：</strong>${escapeHtml(formatSections(request.requested_sections))}</p>
        ${request.note ? `<p><strong>申請說明：</strong>${escapeHtml(request.note)}</p>` : ""}
        <button class="secondary-button" type="button" data-local-sign-out>退出登入</button>
      </div>
    `;
    $("[data-local-sign-out]").addEventListener("click", async (event) => handleSignOut(event));
    return;
  }

  requestPanel.innerHTML = `
    <form data-access-request-form>
      ${request?.status === "rejected" ? `<p class="form-message">上一次申請未通過，可以修改資料後重新送出。</p>` : ""}
      <label>
        姓名
        <input name="display_name" value="${escapeHtml(defaultName)}" required />
      </label>
      <label class="full">
        申請說明
        <textarea name="note" placeholder="例如：我負責服事表、代禱事項或主日信息更新。">${escapeHtml(defaultNote)}</textarea>
      </label>
      <div class="register-sections">
        <p class="field-note">希望申請編輯的板塊</p>
        ${sections.map((section) => `
          <label class="checkbox-label">
            <input type="checkbox" name="section" value="${section.key}" ${defaultSections.includes(section.key) ? "checked" : ""} />
            ${section.label}
          </label>
        `).join("")}
      </div>
      <button class="primary-button" type="submit">送出審核</button>
      <p class="form-message" data-request-message></p>
    </form>
  `;
  $("[data-access-request-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("[data-request-message]");
    message.textContent = "正在送出...";
    try {
      await saveAccessRequest(new FormData(event.currentTarget));
      message.textContent = "申請已送出，請等待管理員審核。";
      await renderRequestGate();
    } catch (error) {
      console.error(error);
      message.textContent = `送出失敗：${error.message}`;
    }
  });
};

const resetLocalSession = () => {
  state.session = null;
  state.profile = null;
  state.permissions = [];
  state.currentSection = null;
  state.renderToken += 1;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && key.includes("auth-token"))
    .forEach((key) => window.localStorage.removeItem(key));
  nav.innerHTML = "";
  body.innerHTML = "";
  $("[data-user-summary]").textContent = "";
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

const loadSiteSection = async (sectionKey) => selectOne(`讀取 ${sectionLabel(sectionKey)}`, () => client
  .from("site_sections")
  .select("*")
  .eq("section_key", sectionKey)
);

const defaultTopAnnouncementSection = {
  section_key: "top_announcement",
  title_zh: "顶部预告",
  title_en: "Top Announcement",
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
};

const loadTopAnnouncementSection = async () => {
  const section = await selectMaybeOne("讀取顶部预告", () => client
    .from("site_sections")
    .select("*")
    .eq("section_key", "top_announcement")
  );
  return section || defaultTopAnnouncementSection;
};

const saveSiteSection = async (sectionKey, payload) => {
  setStatus("正在保存...", false, false);
  await runQuery(() => client
    .from("site_sections")
    .update({ ...payload, updated_by: state.profile.id })
    .eq("section_key", sectionKey), `保存 ${sectionLabel(sectionKey)}`);
  setStatus("已保存");
};

const saveTopAnnouncementSection = async (payload) => {
  setStatus("正在保存...", false, false);
  await runQuery(() => client
    .from("site_sections")
    .insert({
      section_key: "top_announcement",
      status: "published",
      published_at: new Date().toISOString(),
      ...payload,
      updated_by: state.profile.id
    }), "建立顶部预告");
  setStatus("已保存");
};

const runSave = async (event, action, successMessage = "已保存") => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = event.submitter || form.querySelector("button[type='submit']");
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = "保存中...";
  }
  setStatus("正在保存...", false, false);
  try {
    await action(new FormData(form), form);
    setStatus(successMessage);
  } catch (error) {
    console.error(error);
    setStatus(`保存失敗：${error.message}`, true, false);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
};

const renderGatherings = async (token) => {
  const section = await loadSiteSection("gatherings");
  if (!isCurrentRender(token)) return;
  const items = section.content?.items || [];
  body.innerHTML = `
    <form class="stack" data-gatherings-form>
      <section class="panel">
        <h2>區塊標題</h2>
        <div class="form-grid">
          ${titleField("title_zh", "中文標題", section.title_zh)}
          ${titleField("title_en", "英文標題", section.title_en)}
          ${lockedTitleNote()}
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
            ${imagePathField(`item_${index}_image`, item.image)}
            <label class="full upload-field">
              從本機上傳圖片
              <input type="file" name="item_${index}_image_file" accept="image/*" data-image-file-input data-path-target="item_${index}_image" />
              <span>可從電腦或手機選擇圖片；保存後會上傳到 Supabase Storage 並自動替換圖片路徑。</span>
            </label>
          </div>
        </section>
      `).join("")}
      <div class="actions"><button class="primary-button" type="submit">保存聚會時間</button></div>
    </form>
  `;
  bindImagePreviews($("[data-gatherings-form]"));

  $("[data-gatherings-form]").addEventListener("submit", (event) => runSave(event, async (form) => {
    const updatedItems = await Promise.all(items.map(async (item, index) => {
      const imageFile = form.get(`item_${index}_image_file`);
      const uploadedUrl = imageFile instanceof File && imageFile.size > 0
        ? await uploadImage(imageFile, `gatherings/${item.key || `item-${index + 1}`}`)
        : "";
      return {
        ...item,
        title_zh: form.get(`item_${index}_title_zh`),
        title_en: form.get(`item_${index}_title_en`),
        time_zh: form.get(`item_${index}_time_zh`),
        time_en: form.get(`item_${index}_time_en`),
        description_zh: form.get(`item_${index}_description_zh`),
        description_en: form.get(`item_${index}_description_en`),
        image: uploadedUrl || form.get(`item_${index}_image`)
      };
    }));
    await saveSiteSection("gatherings", {
      ...titlePayload(section, form),
      content: { ...section.content, items: updatedItems }
    });
  }, "聚會時間已保存"));
};

const renderTopAnnouncement = async (token) => {
  const section = await loadTopAnnouncementSection();
  if (!isCurrentRender(token)) return;
  const content = section.content || {};
  body.innerHTML = `
    <form class="panel" data-top-announcement-form>
      <h2>顶部预告</h2>
      <div class="form-grid">
        ${titleField("title_zh", "中文管理標題", section.title_zh)}
        ${titleField("title_en", "英文管理標題", section.title_en)}
        ${lockedTitleNote()}
        <label>中文名称<input name="label_zh" value="${escapeHtml(content.label_zh)}" /></label>
        <label>英文名称<input name="label_en" value="${escapeHtml(content.label_en)}" /></label>
        <label>中文时间/主题<input name="headline_zh" value="${escapeHtml(content.headline_zh)}" /></label>
        <label>英文时间/主题<input name="headline_en" value="${escapeHtml(content.headline_en)}" /></label>
        <label class="full">中文补充说明<textarea name="detail_zh">${escapeHtml(content.detail_zh)}</textarea></label>
        <label class="full">英文补充说明<textarea name="detail_en">${escapeHtml(content.detail_en)}</textarea></label>
        <label>中文按钮文字<input name="cta_zh" value="${escapeHtml(content.cta_zh)}" /></label>
        <label>英文按钮文字<input name="cta_en" value="${escapeHtml(content.cta_en)}" /></label>
        <label class="full">链接<input name="url" value="${escapeHtml(content.url || "#updates")}" /></label>
      </div>
      <div class="actions"><button class="primary-button" type="submit">保存顶部预告</button></div>
    </form>
  `;
  $("[data-top-announcement-form]").addEventListener("submit", (event) => runSave(event, async (form) => {
    const payload = {
      ...titlePayload(section, form),
      content: {
        ...content,
        label_zh: form.get("label_zh"),
        label_en: form.get("label_en"),
        headline_zh: form.get("headline_zh"),
        headline_en: form.get("headline_en"),
        detail_zh: form.get("detail_zh"),
        detail_en: form.get("detail_en"),
        cta_zh: form.get("cta_zh"),
        cta_en: form.get("cta_en"),
        url: form.get("url")
      }
    };
    if (section.id) {
      await saveSiteSection("top_announcement", payload);
    } else {
      await saveTopAnnouncementSection(payload);
    }
  }, "顶部预告已保存"));
};

const renderMessages = async (token) => {
  const section = await loadSiteSection("messages");
  if (!isCurrentRender(token)) return;
  const content = section.content || {};
  body.innerHTML = `
    <form class="panel" data-messages-form>
      <h2>主日信息</h2>
      <div class="form-grid">
        ${titleField("title_zh", "中文標題", section.title_zh)}
        ${titleField("title_en", "英文標題", section.title_en)}
        ${lockedTitleNote()}
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
  $("[data-messages-form]").addEventListener("submit", (event) => runSave(event, async (form) => {
    await saveSiteSection("messages", {
      ...titlePayload(section, form),
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
  }, "主日信息已保存"));
};

const renderBibleReading = async (token) => {
  const section = await loadSiteSection("bible_reading");
  if (!isCurrentRender(token)) return;
  const content = section.content || {};
  body.innerHTML = `
    <form class="panel" data-bible-form>
      <h2>線上讀經</h2>
      <div class="form-grid">
        ${titleField("title_zh", "中文標題", section.title_zh)}
        ${titleField("title_en", "英文標題", section.title_en)}
        ${lockedTitleNote()}
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
  $("[data-bible-form]").addEventListener("submit", (event) => runSave(event, async (form) => {
    await saveSiteSection("bible_reading", {
      ...titlePayload(section, form),
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
  }, "線上讀經已保存"));
};

const loadLatestRoster = async () => {
  const data = await runQuery(() => client
    .from("service_rosters")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1), "讀取服事表");
  return data[0];
};

const renderRoster = async (token) => {
  const roster = await loadLatestRoster();
  if (!isCurrentRender(token)) return;
  if (!roster) {
    body.innerHTML = `<div class="empty-state">還沒有服事表資料，請先在資料庫建立第一份服事表。</div>`;
    return;
  }
  body.innerHTML = `
    <form class="stack" data-roster-form>
      <section class="panel">
        <h2>日期與標題</h2>
        <div class="form-grid">
          ${titleField("title_zh", "中文標題", roster.title_zh)}
          ${titleField("title_en", "英文標題", roster.title_en)}
          ${lockedTitleNote()}
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
  $("[data-roster-form]").addEventListener("submit", (event) => runSave(event, async (form) => {
    const rows = roster.rows.map((row, index) => ({
      ...row,
      current: form.get(`row_${index}_current`),
      next: form.get(`row_${index}_next`)
    }));
    await runQuery(() => client
      .from("service_rosters")
      .update({
        ...titlePayload(roster, form),
        current_week_label: form.get("current_week_label"),
        next_week_label: form.get("next_week_label"),
        rows,
        updated_by: state.profile.id
      })
      .eq("id", roster.id), "保存服事表");
  }, "服事表已保存"));
};

const loadPrayerItems = async () => {
  const data = await runQuery(() => client
    .from("prayer_items")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false }), "讀取代禱事項");
  return data;
};

const renderPrayer = async (token) => {
  const items = await loadPrayerItems();
  if (!isCurrentRender(token)) return;
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
          <div class="actions">
            <button class="primary-button" type="submit">保存這一項</button>
            <button class="danger-button" type="button" data-delete-prayer>刪除這一項</button>
          </div>
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
    formElement.addEventListener("submit", (event) => runSave(event, async (form, currentForm) => {
      await runQuery(() => client
        .from("prayer_items")
        .update({
          title_zh: form.get("title_zh"),
          title_en: form.get("title_en"),
          body_zh: form.get("body_zh"),
          body_en: form.get("body_en"),
          updated_by: state.profile.id
        })
        .eq("id", currentForm.dataset.id), "保存代禱事項");
    }, "代禱事項已保存"));

    $("[data-delete-prayer]", formElement).addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (!window.confirm("確定要刪除這一項代禱事項嗎？")) return;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "刪除中...";
      setStatus("正在刪除...", false, false);
      try {
        await runQuery(() => client
          .from("prayer_items")
          .delete()
          .eq("id", formElement.dataset.id), "刪除代禱事項");
        setStatus("代禱事項已刪除");
        await renderPrayer(state.renderToken);
      } catch (error) {
        console.error(error);
        setStatus(`刪除失敗：${error.message}`, true, false);
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  });
  $("[data-new-prayer-form]").addEventListener("submit", (event) => runSave(event, async (form) => {
    await runQuery(() => client
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
      }), "新增代禱事項");
    await renderPrayer(state.renderToken);
  }, "代禱事項已新增"));
};

const renderUsers = async (token) => {
  if (state.profile.role !== "admin") return;
  const [profiles, permissions] = await Promise.all([
    runQuery(() => client.from("profiles").select("id,email,display_name,role,is_active").order("email"), "讀取用户"),
    runQuery(() => client.from("section_permissions").select("user_id,section_key,can_edit"), "讀取用户權限")
  ]);
  if (!isCurrentRender(token)) return;
  body.innerHTML = `
    <div class="stack">
      <div class="empty-state">
        新用户可以自行申請後台帳號並驗證 Email，也可以到
        <a href="${supabaseUsersUrl}" target="_blank" rel="noopener">Supabase Authentication → Users</a>
        手動建立。用户出現在這裡後，請設定角色、啟用狀態與可編輯板塊；普通用户只能編輯被勾選的板塊。
      </div>
      ${profiles.map((profile) => {
        const userPermissions = permissions
          .filter((permission) => permission.user_id === profile.id && permission.can_edit)
          .map((permission) => permission.section_key);
        return `
          <details class="panel user-row">
            <summary>
              <span>
                <strong>${escapeHtml(profile.email)}</strong>
                <small>${escapeHtml(profile.display_name || "未填姓名")}</small>
              </span>
              <span class="user-meta">
                ${escapeHtml(profile.role)}
                <span class="status-pill ${profile.is_active ? "active" : "inactive"}">${profile.is_active ? "已啟用" : "未啟用"}</span>
              </span>
            </summary>
            <form data-user-form data-id="${profile.id}">
              <div class="form-grid">
                <label>顯示名稱<input name="display_name" value="${escapeHtml(profile.display_name)}" /></label>
                <label>角色
                  <select name="role">
                    ${["admin", "editor", "viewer"].map((role) => `<option value="${role}" ${profile.role === role ? "selected" : ""}>${role}</option>`).join("")}
                  </select>
                </label>
                <label class="checkbox-label user-active-toggle">
                  <input type="checkbox" name="is_active" ${profile.is_active ? "checked" : ""} />
                  啟用此帳號
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
          </details>
        `;
      }).join("")}
    </div>
  `;
  $$("[data-user-form]").forEach((formElement) => {
    formElement.addEventListener("submit", (event) => runSave(event, async (form, currentForm) => {
      const userId = currentForm.dataset.id;
      const allowedSections = form.getAll("section");
      await runQuery(() => client
        .from("profiles")
        .update({
          display_name: form.get("display_name"),
          role: form.get("role"),
          is_active: form.has("is_active")
        })
        .eq("id", userId), "保存用户角色");
      await runQuery(() => client
        .from("section_permissions")
        .delete()
        .eq("user_id", userId), "更新用户板塊權限");
      if (allowedSections.length) {
        await runQuery(() => client
          .from("section_permissions")
          .insert(allowedSections.map((sectionKey) => ({
            user_id: userId,
            section_key: sectionKey,
            can_edit: true,
            assigned_by: state.profile.id
          }))), "寫入用户板塊權限");
      }
    }, "用户權限已保存"));
  });
};

const loadAccessRequests = async () => runQuery(() => client
  .from("admin_access_requests")
  .select("*")
  .order("status", { ascending: false })
  .order("created_at", { ascending: false }), "讀取帳號申請");

const renderAccessRequests = async (token) => {
  if (state.profile.role !== "admin") return;
  const requests = await loadAccessRequests();
  if (!isCurrentRender(token)) return;
  body.innerHTML = `
    <div class="stack">
      ${requests.length ? requests.map((request) => `
        <form class="panel request-card" data-access-review-form data-id="${request.id}" data-user-id="${request.user_id}">
          <header>
            <div>
              <h2>${escapeHtml(request.display_name || request.email)}</h2>
              <small>${escapeHtml(request.email)} · ${new Date(request.created_at).toLocaleString("zh-Hant")}</small>
            </div>
            <span class="request-status ${escapeHtml(request.status)}">${requestStatusLabel(request.status)}</span>
          </header>
          <p><strong>申請板塊：</strong>${escapeHtml(formatSections(request.requested_sections))}</p>
          ${request.note ? `<p><strong>申請說明：</strong>${escapeHtml(request.note)}</p>` : ""}
          <div class="permission-grid">
            ${sections.map((section) => `
              <label class="checkbox-label">
                <input type="checkbox" name="section" value="${section.key}" ${(request.requested_sections || []).includes(section.key) ? "checked" : ""} ${request.status !== "pending" ? "disabled" : ""} />
                ${section.label}
              </label>
            `).join("")}
          </div>
          <label class="full">審核備註<textarea name="review_note" ${request.status !== "pending" ? "disabled" : ""}>${escapeHtml(request.review_note)}</textarea></label>
          <div class="actions">
            ${request.status === "pending" ? `
              <button class="primary-button" type="submit" name="decision" value="approved">批准並開通</button>
              <button class="danger-button" type="submit" name="decision" value="rejected">拒絕</button>
            ` : ""}
          </div>
        </form>
      `).join("") : `<div class="empty-state">目前沒有帳號申請。</div>`}
    </div>
  `;
  $$("[data-access-review-form]").forEach((formElement) => {
    formElement.addEventListener("submit", (event) => runSave(event, async (form, currentForm) => {
      const decision = event.submitter?.value;
      const requestId = currentForm.dataset.id;
      const userId = currentForm.dataset.userId;
      const allowedSections = form.getAll("section");
      if (decision === "approved") {
        await runQuery(() => client
          .from("profiles")
          .update({ role: "editor", is_active: true })
          .eq("id", userId), "開通用户");
        await runQuery(() => client
          .from("section_permissions")
          .delete()
          .eq("user_id", userId), "更新用户板塊權限");
        if (allowedSections.length) {
          await runQuery(() => client
            .from("section_permissions")
            .insert(allowedSections.map((sectionKey) => ({
              user_id: userId,
              section_key: sectionKey,
              can_edit: true,
              assigned_by: state.profile.id
            }))), "寫入用户板塊權限");
        }
      } else {
        await runQuery(() => client
          .from("profiles")
          .update({ role: "viewer", is_active: false })
          .eq("id", userId), "拒絕用户");
      }
      await runQuery(() => client
        .from("admin_access_requests")
        .update({
          status: decision,
          reviewed_by: state.profile.id,
          reviewed_at: new Date().toISOString(),
          review_note: form.get("review_note")
        })
        .eq("id", requestId), "更新審核狀態");
      await renderAccessRequests(state.renderToken);
    }, "帳號申請已處理"));
  });
};

const renderSection = async (sectionKey) => {
  const token = state.renderToken + 1;
  state.renderToken = token;
  try {
    setStatus("");
    state.currentSection = sectionKey;
    setHeading(sectionKey);
    body.innerHTML = `<div class="empty-state">正在載入 ${sectionLabel(sectionKey)}...</div>`;
    if (sectionKey === "top_announcement") await renderTimed(() => renderTopAnnouncement(token), "載入顶部预告");
    if (sectionKey === "gatherings") await renderTimed(() => renderGatherings(token), "載入聚會時間");
    if (sectionKey === "messages") await renderTimed(() => renderMessages(token), "載入主日信息");
    if (sectionKey === "bible_reading") await renderTimed(() => renderBibleReading(token), "載入線上讀經");
    if (sectionKey === "service_rosters") await renderTimed(() => renderRoster(token), "載入服事表");
    if (sectionKey === "prayer_items") await renderTimed(() => renderPrayer(token), "載入代禱事項");
    if (sectionKey === "users") await renderTimed(() => renderUsers(token), "載入用户與權限");
  } catch (error) {
    console.error(error);
    if (!isCurrentRender(token)) return;
    state.renderToken += 1;
    body.innerHTML = `<div class="empty-state">載入或保存時出錯：${escapeHtml(error.message)}</div>`;
    setStatus(error.message, true);
  }
};

const initialize = async () => {
  try {
    if (!client) {
      showLogin();
      $("[data-login-message]").textContent = "Supabase 設定未載入。";
      return;
    }
    const { data } = await withTimeout(client.auth.getSession(), "檢查登入狀態", 10000);
    state.session = data.session;
    if (!state.session) {
      showLogin();
      return;
    }
    state.profile = await loadProfile();
    if (!state.profile?.is_active) {
      await renderRequestGate();
      return;
    }
    await loadPermissions();
    showDashboard();
    renderNav();
  } catch (error) {
    console.error(error);
    showLogin();
    $("[data-login-message]").textContent = `後台載入失敗：${error.message}`;
  }
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("[data-login-message]");
  const form = new FormData(event.currentTarget);
  message.textContent = "登入中...";
  try {
    const { error } = await withTimeout(client.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password")
    }), "登入", 10000);
    if (error) {
      message.textContent = error.message;
      return;
    }
    message.textContent = "";
    initialize();
  } catch (error) {
    console.error(error);
    message.textContent = `登入失敗：${error.message}`;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = $("[data-register-message]");
  const form = new FormData(event.currentTarget);
  const button = event.submitter;
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = "送出中...";
  }
  message.textContent = "正在建立帳號...";
  const requestedSections = form.getAll("section");
  try {
    const { data, error } = await withTimeout(client.auth.signUp({
      email: form.get("email"),
      password: form.get("password"),
      options: {
        emailRedirectTo: authRedirectUrl,
        data: {
          display_name: form.get("display_name"),
          requested_sections: requestedSections,
          request_note: form.get("note")
        }
      }
    }), "建立帳號", 10000);
    if (error) {
      message.textContent = error.message;
      return;
    }
    if (data.session) {
      state.session = data.session;
      await initialize();
      return;
    }
    message.textContent = "驗證 Email 已寄出。請到信箱點擊驗證連結，驗證後回到後台提交審核。";
  } catch (error) {
    console.error(error);
    message.textContent = `建立帳號失敗：${error.message}`;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
});

$("[data-show-register]").addEventListener("click", () => setAuthMode("register"));
$("[data-show-login]").addEventListener("click", () => setAuthMode("login"));

const handleSignOut = async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "退出中...";
  setStatus("正在退出登入...", false, false);

  resetLocalSession();
  showLogin();
  $("[data-login-message]").textContent = "已退出登入。";

  try {
    await withTimeout(client.auth.signOut(), "退出登入", 5000);
  } catch (error) {
    console.warn(error);
    setStatus("已回到登入頁，遠端登出稍後會自動同步。", false);
  } finally {
    button.disabled = false;
    button.textContent = "退出登入";
    setStatus("");
  }
};

$("[data-sign-out]").addEventListener("click", handleSignOut);

initialize();
