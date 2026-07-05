-- Weekly bulletin update: 2026-07-05, issue 633
-- Run this in Supabase SQL Editor to update the live CMS data used by the front page.
begin;

update public.site_sections
set content = coalesce(content, '{}'::jsonb) || '{"description_zh": "本週主日信息：讓基督塑造我們的心。經文：希伯來書 5:1–14，講員：Angela 傳道。", "description_en": "This week''s Sunday message: Let Christ Shape Our Hearts. Scripture: Hebrews 5:1–14. Speaker: Angela."}'::jsonb, updated_at = now()
where section_key = 'messages';

update public.site_sections
set content = coalesce(content, '{}'::jsonb) || '{"scripture_zh": "《以賽亞書》19:16–25；《箴言》8–13", "scripture_en": "Isaiah 19:16–25; Proverbs 8–13", "questions_zh": ["本週禱讀經文：以賽亞書 19:16–25。", "全年讀經進度：箴言 8–13。", "一起在讀經中思想神的話語，彼此分享與代禱。"], "questions_en": ["This week''s prayer reading: Isaiah 19:16–25.", "Annual reading progress: Proverbs 8–13.", "Reflect on God''s Word together, then share and pray for one another."]}'::jsonb, updated_at = now()
where section_key = 'bible_reading';

update public.service_rosters
set week_start = '2026-07-05',
    next_week_start = '2026-07-12',
    current_week_label = '本週（5/7/2026）',
    next_week_label = '下週（12/7/2026）',
    rows = '[{"item_zh": "敬拜", "item_en": "Worship", "current": "Sunny姐妹／Mary姐妹／小敏姐妹", "next": "芷茜姐妹"}, {"item_zh": "證道", "item_en": "Message", "current": "Angela傳道", "next": "楊銳傳道"}, {"item_zh": "會前禱告／司琴", "item_en": "Pre-service Prayer / Pianist", "current": "可可姐妹／Ruby姐妹", "next": "小敏姐妹／Ruby姐妹"}, {"item_zh": "陪談", "item_en": "Care Conversation", "current": "Irene姐妹", "next": "Nita姐妹"}, {"item_zh": "迎賓", "item_en": "Welcome", "current": "靜巧姐妹", "next": "熊熊姐妹"}, {"item_zh": "PA", "item_en": "PA", "current": "林晶弟兄", "next": "范弟兄"}, {"item_zh": "PPT", "item_en": "Slides", "current": "姍姍姐妹", "next": "林晶弟兄"}, {"item_zh": "晚餐服事", "item_en": "Dinner Serving", "current": "青少年團契聚點", "next": "撒母耳小組聚點", "emphasis": true}, {"item_zh": "兒童牧區", "item_en": "Children''s Ministry", "current": "Jessica姐妹", "next": "文香姐妹"}, {"item_zh": "青少年團契", "item_en": "Youth Fellowship", "current": "心心姐妹", "next": "啟文弟兄"}, {"item_zh": "督堂", "item_en": "Service Steward", "current": "魏宇峻長老", "next": "魏宇峻長老"}]'::jsonb,
    updated_at = now()
where id = '6e64234d-1b21-4053-8e4c-6fc004d836a2';

delete from public.prayer_items;

insert into public.prayer_items (title_zh, body_zh, item_type, is_pinned, sort_order, status, published_at, created_at, updated_at)
values
  ('為墨爾本福音中心禱告', '繼續為墨爾本福音中心禱告，求主親自托住安彥牧師與曉春師母手中的事工，使福音廣傳，得救的人數天天加增，教會被主興旺與拓展，榮耀主的聖名。', 'prayer', true, 1, 'published', now(), now(), now()),
  ('「從懷疑到相信」培訓', '5月9日開始每週六「從懷疑到相信」培訓開始，請組長同工們預備心，堅持上完全部課程，求主記念我們為福音分別出的時間。', 'news', false, 2, 'published', now(), now(), now()),
  ('中區禱告會', '中區禱告會 8月4日（週二）晚上 7:30–9:00，將在本教會舉行。請弟兄姊妹預留時間參加，同心為教會及城市守望禱告。', 'announcement', false, 3, 'published', now(), now(), now()),
  ('預備受洗人員', '預備受洗人員請各小組及牧養同工留意並預備受洗人員名單，也請弟兄姊妹為即將受洗的弟兄姊妹提名代禱，求主堅固他們的信心，引導他們在真道上扎根成長。', 'prayer', false, 4, 'published', now(), now(), now()),
  ('2024年教會異象目標', '2024年教會異象目標：聯結｜委身｜建造。具體實踐：每日一刻靈修，一人帶一人信主，教會持續向外拓展。', 'prayer', false, 5, 'published', now(), now(), now());

commit;
