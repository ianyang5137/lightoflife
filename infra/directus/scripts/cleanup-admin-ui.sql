BEGIN;
CREATE TABLE IF NOT EXISTS service_roster_rows (
  id serial PRIMARY KEY,
  roster_id integer REFERENCES service_rosters(id) ON DELETE CASCADE,
  item_zh varchar(255),
  item_en varchar(255),
  current varchar(255),
  next varchar(255),
  emphasis boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
TRUNCATE service_roster_rows RESTART IDENTITY;
INSERT INTO service_roster_rows (roster_id, item_zh, item_en, current, next, emphasis, sort_order)
SELECT
  sr.id,
  elem.value->>'item_zh',
  elem.value->>'item_en',
  elem.value->>'current',
  elem.value->>'next',
  coalesce((elem.value->>'emphasis')::boolean, false),
  elem.ordinality
FROM service_rosters sr
CROSS JOIN LATERAL json_array_elements(sr.rows) WITH ORDINALITY AS elem(value, ordinality)
WHERE sr.rows IS NOT NULL;
INSERT INTO directus_collections (collection, icon, note, hidden, singleton, translations, sort, sort_field, display_template)
VALUES ('service_roster_rows','format_list_numbered','服事表每一行明细。',true,false,'[{"language":"zh-Hans","translation":"服事表明细"},{"language":"zh-Hant","translation":"服事表明細"},{"language":"en-US","translation":"Serving Roster Rows"}]'::json,9,'sort_order','{{item_zh}}')
ON CONFLICT (collection) DO UPDATE SET icon=excluded.icon,note=excluded.note,hidden=excluded.hidden,translations=excluded.translations,sort=excluded.sort,sort_field=excluded.sort_field,display_template=excluded.display_template;
DELETE FROM directus_fields WHERE collection = 'service_roster_rows';
INSERT INTO directus_fields (collection, field, special, interface, display, readonly, hidden, sort, width, translations, note, required) VALUES
('service_roster_rows','id',NULL,'numeric',NULL,false,true,1,'half','[{"language":"zh-Hans","translation":"ID"},{"language":"zh-Hant","translation":"ID"},{"language":"en-US","translation":"ID"}]'::json,NULL,false),
('service_roster_rows','roster_id','m2o','select-dropdown-m2o','related-values',false,true,2,'full','[{"language":"zh-Hans","translation":"所属服事表"},{"language":"zh-Hant","translation":"所屬服事表"},{"language":"en-US","translation":"Roster"}]'::json,NULL,true),
('service_roster_rows','item_zh',NULL,'input',NULL,false,false,3,'half','[{"language":"zh-Hans","translation":"服事项目"},{"language":"zh-Hant","translation":"服事項目"},{"language":"en-US","translation":"Item Chinese"}]'::json,NULL,true),
('service_roster_rows','item_en',NULL,'input',NULL,false,false,4,'half','[{"language":"zh-Hans","translation":"服事项目英文"},{"language":"zh-Hant","translation":"服事項目英文"},{"language":"en-US","translation":"Item English"}]'::json,NULL,false),
('service_roster_rows','current',NULL,'input',NULL,false,false,5,'half','[{"language":"zh-Hans","translation":"本周服事"},{"language":"zh-Hant","translation":"本週服事"},{"language":"en-US","translation":"This Week"}]'::json,NULL,false),
('service_roster_rows','next',NULL,'input',NULL,false,false,6,'half','[{"language":"zh-Hans","translation":"下周服事"},{"language":"zh-Hant","translation":"下週服事"},{"language":"en-US","translation":"Next Week"}]'::json,NULL,false),
('service_roster_rows','emphasis',NULL,'boolean',NULL,false,false,7,'half','[{"language":"zh-Hans","translation":"加粗显示"},{"language":"zh-Hant","translation":"加粗顯示"},{"language":"en-US","translation":"Bold"}]'::json,'通常用于晚餐服事。',false),
('service_roster_rows','sort_order',NULL,'input',NULL,false,false,8,'half','[{"language":"zh-Hans","translation":"排序"},{"language":"zh-Hant","translation":"排序"},{"language":"en-US","translation":"Sort"}]'::json,NULL,false);
DELETE FROM directus_fields WHERE collection = 'service_rosters' AND field = 'rows_items';
INSERT INTO directus_fields (collection, field, special, interface, display, readonly, hidden, sort, width, translations, note, required)
VALUES ('service_rosters','rows_items','o2m','list-o2m',NULL,false,false,9,'full','[{"language":"zh-Hans","translation":"服事明细"},{"language":"zh-Hant","translation":"服事明細"},{"language":"en-US","translation":"Serving Rows"}]'::json,'逐行编辑服事项目、本周与下周服事人员。',false);
DELETE FROM directus_relations WHERE many_collection = 'service_roster_rows' AND many_field = 'roster_id';
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_field, sort_field, one_deselect_action)
VALUES ('service_roster_rows','roster_id','service_rosters','rows_items','sort_order','delete');
UPDATE directus_fields SET hidden = true, sort = 99, note = '技术兜底字段，前台旧版兼容使用；请编辑“服事明细”。' WHERE collection = 'service_rosters' AND field = 'rows';
UPDATE directus_collections SET note='前台实际使用的代祷事项。',icon='volunteer_activism',sort=6,translations='[{"language":"zh-Hans","translation":"代祷事项"},{"language":"zh-Hant","translation":"代禱事項"},{"language":"en-US","translation":"Prayer Items"}]'::json WHERE collection='prayer_items';
UPDATE directus_collections SET hidden=true,note='已合并到 Prayer Items，请不要使用。' WHERE collection='prayer_requests';
UPDATE directus_collections SET translations = CASE collection
WHEN 'announcements' THEN '[{"language":"zh-Hans","translation":"公告"},{"language":"zh-Hant","translation":"公告"},{"language":"en-US","translation":"Announcements"}]'::json
WHEN 'events' THEN '[{"language":"zh-Hans","translation":"活动日历"},{"language":"zh-Hant","translation":"活動日曆"},{"language":"en-US","translation":"Events"}]'::json
WHEN 'gallery' THEN '[{"language":"zh-Hans","translation":"相册"},{"language":"zh-Hant","translation":"相冊"},{"language":"en-US","translation":"Gallery"}]'::json
WHEN 'languages' THEN '[{"language":"zh-Hans","translation":"语言"},{"language":"zh-Hant","translation":"語言"},{"language":"en-US","translation":"Languages"}]'::json
WHEN 'pages' THEN '[{"language":"zh-Hans","translation":"页面"},{"language":"zh-Hant","translation":"頁面"},{"language":"en-US","translation":"Pages"}]'::json
WHEN 'sermons' THEN '[{"language":"zh-Hans","translation":"主日信息"},{"language":"zh-Hant","translation":"主日信息"},{"language":"en-US","translation":"Sermons"}]'::json
WHEN 'service_rosters' THEN '[{"language":"zh-Hans","translation":"服事表"},{"language":"zh-Hant","translation":"服事表"},{"language":"en-US","translation":"Service Rosters"}]'::json
WHEN 'site_sections' THEN '[{"language":"zh-Hans","translation":"首页区块"},{"language":"zh-Hant","translation":"首頁區塊"},{"language":"en-US","translation":"Homepage Sections"}]'::json
WHEN 'small_groups' THEN '[{"language":"zh-Hans","translation":"小组"},{"language":"zh-Hant","translation":"小組"},{"language":"en-US","translation":"Small Groups"}]'::json
ELSE translations END,
sort = CASE collection WHEN 'site_sections' THEN 1 WHEN 'service_rosters' THEN 5 WHEN 'prayer_items' THEN 6 WHEN 'sermons' THEN 3 WHEN 'announcements' THEN 4 WHEN 'events' THEN 7 WHEN 'gallery' THEN 8 WHEN 'pages' THEN 9 WHEN 'small_groups' THEN 10 WHEN 'languages' THEN 11 ELSE sort END
WHERE collection IN ('announcements','events','gallery','languages','pages','sermons','service_rosters','site_sections','small_groups');
UPDATE directus_fields SET translations = CASE field
WHEN 'title_zh' THEN '[{"language":"zh-Hans","translation":"中文标题"},{"language":"zh-Hant","translation":"中文標題"},{"language":"en-US","translation":"Chinese Title"}]'::json
WHEN 'title_en' THEN '[{"language":"zh-Hans","translation":"英文标题"},{"language":"zh-Hant","translation":"英文標題"},{"language":"en-US","translation":"English Title"}]'::json
WHEN 'body_zh' THEN '[{"language":"zh-Hans","translation":"中文内容"},{"language":"zh-Hant","translation":"中文內容"},{"language":"en-US","translation":"Chinese Content"}]'::json
WHEN 'body_en' THEN '[{"language":"zh-Hans","translation":"英文内容"},{"language":"zh-Hant","translation":"英文內容"},{"language":"en-US","translation":"English Content"}]'::json
WHEN 'item_type' THEN '[{"language":"zh-Hans","translation":"类型"},{"language":"zh-Hant","translation":"類型"},{"language":"en-US","translation":"Type"}]'::json
WHEN 'is_pinned' THEN '[{"language":"zh-Hans","translation":"置顶"},{"language":"zh-Hant","translation":"置頂"},{"language":"en-US","translation":"Pinned"}]'::json
WHEN 'sort_order' THEN '[{"language":"zh-Hans","translation":"排序"},{"language":"zh-Hant","translation":"排序"},{"language":"en-US","translation":"Sort"}]'::json
WHEN 'status' THEN '[{"language":"zh-Hans","translation":"状态"},{"language":"zh-Hant","translation":"狀態"},{"language":"en-US","translation":"Status"}]'::json
ELSE translations END WHERE collection='prayer_items';
UPDATE directus_fields SET translations = CASE field
WHEN 'title_zh' THEN '[{"language":"zh-Hans","translation":"中文标题"},{"language":"zh-Hant","translation":"中文標題"},{"language":"en-US","translation":"Chinese Title"}]'::json
WHEN 'title_en' THEN '[{"language":"zh-Hans","translation":"英文标题"},{"language":"zh-Hant","translation":"英文標題"},{"language":"en-US","translation":"English Title"}]'::json
WHEN 'week_start' THEN '[{"language":"zh-Hans","translation":"本周日期"},{"language":"zh-Hant","translation":"本週日期"},{"language":"en-US","translation":"Week Start"}]'::json
WHEN 'current_week_label' THEN '[{"language":"zh-Hans","translation":"本周标题"},{"language":"zh-Hant","translation":"本週標題"},{"language":"en-US","translation":"This Week Label"}]'::json
WHEN 'current_week_label_en' THEN '[{"language":"zh-Hans","translation":"本周标题英文"},{"language":"zh-Hant","translation":"本週標題英文"},{"language":"en-US","translation":"This Week Label English"}]'::json
WHEN 'next_week_label' THEN '[{"language":"zh-Hans","translation":"下周标题"},{"language":"zh-Hant","translation":"下週標題"},{"language":"en-US","translation":"Next Week Label"}]'::json
WHEN 'next_week_label_en' THEN '[{"language":"zh-Hans","translation":"下周标题英文"},{"language":"zh-Hant","translation":"下週標題英文"},{"language":"en-US","translation":"Next Week Label English"}]'::json
WHEN 'rows' THEN '[{"language":"zh-Hans","translation":"旧版明细 JSON"},{"language":"zh-Hant","translation":"舊版明細 JSON"},{"language":"en-US","translation":"Legacy Rows JSON"}]'::json
WHEN 'status' THEN '[{"language":"zh-Hans","translation":"状态"},{"language":"zh-Hant","translation":"狀態"},{"language":"en-US","translation":"Status"}]'::json
ELSE translations END WHERE collection='service_rosters';
UPDATE directus_users SET language='zh-Hans' WHERE email='oyzpeng@gmail.com';
INSERT INTO directus_permissions (collection, action, permissions, validation, presets, fields, policy)
SELECT 'service_roster_rows','read','{}'::json,NULL,NULL,'*',id FROM directus_policies WHERE name='$t:public_label' AND NOT EXISTS (SELECT 1 FROM directus_permissions p WHERE p.collection='service_roster_rows' AND p.action='read' AND p.policy=directus_policies.id);
COMMIT;
