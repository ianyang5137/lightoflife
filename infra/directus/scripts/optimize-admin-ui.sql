BEGIN;

UPDATE directus_collections SET
  sort = CASE collection
    WHEN 'site_settings' THEN 1
    WHEN 'homepage_announcements' THEN 2
    WHEN 'gathering_items' THEN 3
    WHEN 'message_settings' THEN 4
    WHEN 'youtube_latest' THEN 5
    WHEN 'bible_readings' THEN 6
    WHEN 'bible_reading_questions' THEN 7
    WHEN 'service_rosters' THEN 8
    WHEN 'prayer_items' THEN 9
    WHEN 'announcements' THEN 10
    WHEN 'events' THEN 11
    WHEN 'sermons' THEN 12
    WHEN 'gallery' THEN 13
    WHEN 'small_groups' THEN 14
    ELSE sort
  END,
  hidden = CASE collection
    WHEN 'site_sections' THEN true
    WHEN 'pages' THEN true
    WHEN 'languages' THEN true
    WHEN 'prayer_requests' THEN true
    WHEN 'service_roster_rows' THEN true
    ELSE hidden
  END,
  note = CASE collection
    WHEN 'site_sections' THEN '技术兜底集合：前台旧版兼容使用；日常请编辑顶部预告、聚会时间卡片、主日信息设置、线上读经。'
    WHEN 'homepage_announcements' THEN '首页最顶部的活动/通知条。'
    WHEN 'gathering_items' THEN '首页“聚会时间”的三张卡片，可上传图片或填写旧图片路径。'
    WHEN 'message_settings' THEN '主日信息卡片文字、按钮和频道链接。'
    WHEN 'youtube_latest' THEN '自动同步的最新 YouTube 视频，只读查看即可。'
    WHEN 'bible_readings' THEN '线上读经时间、经文范围和 Zoom 信息。'
    WHEN 'bible_reading_questions' THEN '线上读经思考问题，逐条编辑。'
    ELSE note
  END
WHERE collection IN (
  'site_settings','homepage_announcements','gathering_items','message_settings','youtube_latest',
  'bible_readings','bible_reading_questions','service_rosters','prayer_items','announcements',
  'events','sermons','gallery','small_groups','site_sections','pages','languages','prayer_requests','service_roster_rows'
);

UPDATE directus_collections SET translations = CASE collection
  WHEN 'homepage_announcements' THEN '[{"language":"zh-Hans","translation":"顶部预告"},{"language":"zh-Hant","translation":"頂部預告"},{"language":"en-US","translation":"Top Announcement"}]'::json
  WHEN 'gathering_items' THEN '[{"language":"zh-Hans","translation":"聚会时间卡片"},{"language":"zh-Hant","translation":"聚會時間卡片"},{"language":"en-US","translation":"Gathering Cards"}]'::json
  WHEN 'message_settings' THEN '[{"language":"zh-Hans","translation":"主日信息设置"},{"language":"zh-Hant","translation":"主日信息設定"},{"language":"en-US","translation":"Message Settings"}]'::json
  WHEN 'youtube_latest' THEN '[{"language":"zh-Hans","translation":"最新 YouTube 视频"},{"language":"zh-Hant","translation":"最新 YouTube 影片"},{"language":"en-US","translation":"Latest YouTube Video"}]'::json
  WHEN 'bible_readings' THEN '[{"language":"zh-Hans","translation":"线上读经"},{"language":"zh-Hant","translation":"線上讀經"},{"language":"en-US","translation":"Online Bible Reading"}]'::json
  WHEN 'bible_reading_questions' THEN '[{"language":"zh-Hans","translation":"读经问题"},{"language":"zh-Hant","translation":"讀經問題"},{"language":"en-US","translation":"Bible Reading Questions"}]'::json
  ELSE translations
END
WHERE collection IN ('homepage_announcements','gathering_items','message_settings','youtube_latest','bible_readings','bible_reading_questions');

UPDATE directus_fields SET hidden = true
WHERE field = 'id'
  AND collection IN ('homepage_announcements','gathering_items','message_settings','youtube_latest','bible_readings','bible_reading_questions');

UPDATE directus_fields SET hidden = true, note = '技术兜底字段，日常请使用新拆分出来的友好栏目编辑。'
WHERE collection = 'site_sections';

UPDATE directus_fields SET readonly = true
WHERE collection = 'youtube_latest'
  AND field IN ('video_id','title','published_at','url','embed_url','thumbnail_url','synced_at');

UPDATE directus_fields SET hidden = true
WHERE collection = 'youtube_latest'
  AND field = 'status';

UPDATE directus_fields SET hidden = true
WHERE collection IN ('homepage_announcements','message_settings','bible_readings')
  AND field = 'status';

UPDATE directus_fields SET
  width = CASE
    WHEN field LIKE '%_zh' OR field LIKE '%_en' THEN 'half'
    WHEN field IN ('description_zh','description_en','question_zh','question_en') THEN 'full'
    ELSE width
  END
WHERE collection IN ('homepage_announcements','gathering_items','message_settings','bible_readings','bible_reading_questions');

UPDATE directus_fields SET translations = CASE field
  WHEN 'label_zh' THEN '[{"language":"zh-Hans","translation":"小标题"},{"language":"zh-Hant","translation":"小標題"},{"language":"en-US","translation":"Label Chinese"}]'::json
  WHEN 'label_en' THEN '[{"language":"zh-Hans","translation":"小标题英文"},{"language":"zh-Hant","translation":"小標題英文"},{"language":"en-US","translation":"Label English"}]'::json
  WHEN 'headline_zh' THEN '[{"language":"zh-Hans","translation":"主要内容"},{"language":"zh-Hant","translation":"主要內容"},{"language":"en-US","translation":"Headline Chinese"}]'::json
  WHEN 'headline_en' THEN '[{"language":"zh-Hans","translation":"主要内容英文"},{"language":"zh-Hant","translation":"主要內容英文"},{"language":"en-US","translation":"Headline English"}]'::json
  WHEN 'detail_zh' THEN '[{"language":"zh-Hans","translation":"补充说明"},{"language":"zh-Hant","translation":"補充說明"},{"language":"en-US","translation":"Detail Chinese"}]'::json
  WHEN 'detail_en' THEN '[{"language":"zh-Hans","translation":"补充说明英文"},{"language":"zh-Hant","translation":"補充說明英文"},{"language":"en-US","translation":"Detail English"}]'::json
  WHEN 'cta_zh' THEN '[{"language":"zh-Hans","translation":"按钮文字"},{"language":"zh-Hant","translation":"按鈕文字"},{"language":"en-US","translation":"Button Chinese"}]'::json
  WHEN 'cta_en' THEN '[{"language":"zh-Hans","translation":"按钮文字英文"},{"language":"zh-Hant","translation":"按鈕文字英文"},{"language":"en-US","translation":"Button English"}]'::json
  WHEN 'url' THEN '[{"language":"zh-Hans","translation":"链接"},{"language":"zh-Hant","translation":"連結"},{"language":"en-US","translation":"URL"}]'::json
  WHEN 'visible' THEN '[{"language":"zh-Hans","translation":"显示"},{"language":"zh-Hant","translation":"顯示"},{"language":"en-US","translation":"Visible"}]'::json
  WHEN 'title_zh' THEN '[{"language":"zh-Hans","translation":"中文标题"},{"language":"zh-Hant","translation":"中文標題"},{"language":"en-US","translation":"Chinese Title"}]'::json
  WHEN 'title_en' THEN '[{"language":"zh-Hans","translation":"英文标题"},{"language":"zh-Hant","translation":"英文標題"},{"language":"en-US","translation":"English Title"}]'::json
  WHEN 'time_zh' THEN '[{"language":"zh-Hans","translation":"中文时间"},{"language":"zh-Hant","translation":"中文時間"},{"language":"en-US","translation":"Chinese Time"}]'::json
  WHEN 'time_en' THEN '[{"language":"zh-Hans","translation":"英文时间"},{"language":"zh-Hant","translation":"英文時間"},{"language":"en-US","translation":"English Time"}]'::json
  WHEN 'description_zh' THEN '[{"language":"zh-Hans","translation":"中文简介"},{"language":"zh-Hant","translation":"中文簡介"},{"language":"en-US","translation":"Chinese Description"}]'::json
  WHEN 'description_en' THEN '[{"language":"zh-Hans","translation":"英文简介"},{"language":"zh-Hant","translation":"英文簡介"},{"language":"en-US","translation":"English Description"}]'::json
  WHEN 'image_file' THEN '[{"language":"zh-Hans","translation":"上传图片"},{"language":"zh-Hant","translation":"上傳圖片"},{"language":"en-US","translation":"Uploaded Image"}]'::json
  WHEN 'image_path' THEN '[{"language":"zh-Hans","translation":"旧图片路径"},{"language":"zh-Hant","translation":"舊圖片路徑"},{"language":"en-US","translation":"Fallback Image Path"}]'::json
  WHEN 'sort_order' THEN '[{"language":"zh-Hans","translation":"排序"},{"language":"zh-Hant","translation":"排序"},{"language":"en-US","translation":"Sort"}]'::json
  WHEN 'button_zh' THEN '[{"language":"zh-Hans","translation":"按钮文字"},{"language":"zh-Hant","translation":"按鈕文字"},{"language":"en-US","translation":"Button Chinese"}]'::json
  WHEN 'button_en' THEN '[{"language":"zh-Hans","translation":"按钮文字英文"},{"language":"zh-Hant","translation":"按鈕文字英文"},{"language":"en-US","translation":"Button English"}]'::json
  WHEN 'youtube_url' THEN '[{"language":"zh-Hans","translation":"YouTube 频道链接"},{"language":"zh-Hant","translation":"YouTube 頻道連結"},{"language":"en-US","translation":"YouTube Channel URL"}]'::json
  WHEN 'scripture_zh' THEN '[{"language":"zh-Hans","translation":"中文经文范围"},{"language":"zh-Hant","translation":"中文經文範圍"},{"language":"en-US","translation":"Chinese Scripture"}]'::json
  WHEN 'scripture_en' THEN '[{"language":"zh-Hans","translation":"英文经文范围"},{"language":"zh-Hant","translation":"英文經文範圍"},{"language":"en-US","translation":"English Scripture"}]'::json
  WHEN 'zoom_url' THEN '[{"language":"zh-Hans","translation":"Zoom 链接"},{"language":"zh-Hant","translation":"Zoom 連結"},{"language":"en-US","translation":"Zoom URL"}]'::json
  WHEN 'zoom_id' THEN '[{"language":"zh-Hans","translation":"Zoom 号码"},{"language":"zh-Hant","translation":"Zoom 號碼"},{"language":"en-US","translation":"Zoom ID"}]'::json
  WHEN 'question_zh' THEN '[{"language":"zh-Hans","translation":"中文问题"},{"language":"zh-Hant","translation":"中文問題"},{"language":"en-US","translation":"Chinese Question"}]'::json
  WHEN 'question_en' THEN '[{"language":"zh-Hans","translation":"英文问题"},{"language":"zh-Hant","translation":"英文問題"},{"language":"en-US","translation":"English Question"}]'::json
  ELSE translations
END
WHERE collection IN ('homepage_announcements','gathering_items','message_settings','bible_readings','bible_reading_questions');

COMMIT;
