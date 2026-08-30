import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const zhMap = [
  ["传道", "傳道"],
  ["传", "傳"],
  ["小组", "小組"],
  ["祷告", "禱告"],
  ["证道", "證道"],
  ["读经", "讀經"],
  ["问题", "問題"],
  ["经文", "經文"],
  ["讲员", "講員"],
  ["讲", "講"],
  ["本周", "本週"],
  ["下周", "下週"],
  ["礼拜", "禮拜"],
  ["儿童", "兒童"],
  ["餐饮", "餐飲"],
  ["茶点", "茶點"],
  ["凭", "憑"],
  ["耶稣", "耶穌"],
  ["希伯来书", "希伯來書"],
  ["姗", "姍"],
  ["爱", "愛"],
  ["玛", "瑪"],
  ["约", "約"],
  ["书", "書"],
  ["龙", "龍"],
  ["凯", "凱"],
  ["杨", "楊"],
  ["锐", "銳"],
  ["晓", "曉"],
  ["岚", "嵐"],
  ["伟", "偉"],
  ["苏", "蘇"],
  ["卫", "衛"],
  ["国", "國"],
  ["师", "師"],
  ["为", "為"],
  ["尔", "爾"],
  ["亲", "親"],
  ["兴", "興"],
  ["荣", "榮"],
  ["圣", "聖"],
  ["启", "啟"],
  ["广", "廣"],
  ["数", "數"],
  ["与", "與"],
  ["长", "長"],
  ["继续", "繼續"],
  ["墨尔本", "墨爾本"],
  ["福音中心", "福音中心"],
  ["教会", "教會"],
  ["晚会", "晚會"],
  ["主办", "主辦"],
  ["灵粮堂", "靈糧堂"],
  ["报名", "報名"],
  ["东区", "東區"],
  ["营会", "營會"],
  ["年龄", "年齡"],
  ["异象", "異象"],
  ["实践", "實踐"],
  ["灵修", "靈修"],
  ["带", "帶"],
  ["向外拓展", "向外拓展"],
  ["联络", "聯絡"],
  ["联系", "聯繫"],
  ["联繫", "聯繫"],
  ["周", "週"]
];

const roleLabels = [
  ["敬拜", "Worship"],
  ["證道", "Message"],
  ["會前禱告／司琴", "Pre-service Prayer / Pianist"],
  ["陪談", "Care Conversation"],
  ["迎賓", "Welcome"],
  ["PA", "PA"],
  ["PPT", "Slides"],
  ["晚餐服事", "Dinner Serving"],
  ["兒童牧區", "Children's Ministry"],
  ["青少年團契", "Youth Fellowship"],
  ["督堂", "Service Steward"]
];

function normalizeZh(value = "") {
  let text = String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([，。；：！？）])/g, "$1")
    .replace(/([（])\s+/g, "$1")
    .trim();
  for (const [from, to] of zhMap) text = text.replaceAll(from, to);
  return text;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function extractHeader(text) {
  const issue = firstMatch(text, [
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*第\s*(\d+)\s*期/,
    /第\s*(\d+)\s*期[\s\S]{0,60}?(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/
  ]);
  if (!issue) return {};
  if (issue[1].length === 4) {
    return {
      bulletinDate: `${issue[1]}-${issue[2].padStart(2, "0")}-${issue[3].padStart(2, "0")}`,
      issueNumber: Number(issue[4])
    };
  }
  return {
    bulletinDate: `${issue[2]}-${issue[3].padStart(2, "0")}-${issue[4].padStart(2, "0")}`,
    issueNumber: Number(issue[1])
  };
}

function extractSermon(text, bulletinDate) {
  const scriptureMatch = text.match(/經文[:：]\s*([^\n]+)/);
  const speakerMatch = text.match(/講員[:：]\s*([^\n]+)/);
  if (!scriptureMatch && !speakerMatch) return null;

  const beforeScripture = scriptureMatch ? text.slice(0, scriptureMatch.index) : text;
  const possibleTitles = beforeScripture
    .split("\n")
    .map(normalizeZh)
    .filter(Boolean)
    .reverse();
  const titleLine = possibleTitles.find((line) => /凭信奔跑|憑信奔跑|仰望耶穌|仰望耶稣/.test(line))
    || possibleTitles.find((line) => {
      if (!/[\u4e00-\u9fff]/.test(line)) return false;
      if (line.length < 3 || line.length > 24) return false;
      if (/\d|@|小組|團契|牧區|姐妹|弟兄|師母|傳道|聯繫|電話|主日|聚會|週|周|PM|AM/i.test(line)) return false;
      if (/生命之光|主日崇拜|敬拜|證道|會前|司琴|陪談|迎賓|督堂/.test(line)) return false;
      return true;
    });
  const titleFromContactLine = beforeScripture.match(/聯繫電話[ \t]+([^\n]+)/);
  const title = normalizeZh(titleFromContactLine?.[1] || titleLine || "");

  return {
    title_zh: title,
    title_en: "",
    speaker_zh: normalizeZh(speakerMatch?.[1] || ""),
    speaker_en: "",
    sermon_date: bulletinDate,
    content_zh: scriptureMatch ? normalizeZh(`經文：${scriptureMatch[1]}`) : "",
    content_en: "",
    status: "published"
  };
}

function extractBibleReading(text) {
  const progressTokens = [...text.matchAll(/(?:結|结|詩|诗|啟|启)[:：]?\s*\d+(?:[–—-]\d+)?/g)]
    .map((match) => normalizeZh(match[0]).replace("结", "結").replace("诗", "詩").replace("启", "啟"));
  const ezekiel = progressTokens
    .filter((item) => item.startsWith("結"))
    .flatMap((item) => [...item.matchAll(/\d+/g)].map((match) => Number(match[0])))
    .filter(Boolean);
  const otherReadings = progressTokens.filter((item) => !item.startsWith("結"));
  const scripture = ezekiel.length
    ? `《以西結書》第 ${Math.min(...ezekiel)}–${Math.max(...ezekiel)} 章${otherReadings.length ? `；${otherReadings.join("；")}` : ""}`
    : "";
  const questionsBlock = firstMatch(text, [
    /(?:思想問題|思考問題)[\s\S]*?((?:\s*\d+[,.，、]\s*[^\n]+[\n\r]*){1,6})/,
    /(?:問題)[\s\S]*?((?:\s*\d+[,.，、]\s*[^\n]+[\n\r]*){1,6})/
  ]);
  const questions = questionsBlock
    ? questionsBlock[1]
      .split(/\n+/)
      .map((line) => normalizeZh(line.replace(/^\s*\d+[,.，、]\s*/, "")))
      .filter(Boolean)
      .slice(0, 6)
    : [];

  return {
    title_zh: "線上讀經",
    title_en: "Online Bible Reading",
    time_zh: "每週二晚上 7:30",
    time_en: "Every Tuesday at 7:30 PM",
    scripture_zh: scripture,
    scripture_en: "",
    questions
  };
}

function extractRoster(text) {
  const compactText = normalizeZh(text);
  const weekMatch = firstMatch(compactText, [
    /本週[（(]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[）)]\s*下週[（(]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[）)]/,
    /本週[^\d]*(\d{1,2})\/(\d{1,2})\/(\d{4})[\s\S]{0,50}?下週[^\d]*(\d{1,2})\/(\d{1,2})\/(\d{4})/
  ]);
  const roster = {
    title_zh: "本週與下週主日服事表",
    title_en: "This Week and Next Week Service Roster",
    week_start: null,
    current_week_label: "",
    current_week_label_en: "",
    next_week_label: "",
    next_week_label_en: "",
    rows: []
  };

  if (weekMatch) {
    roster.week_start = `${weekMatch[3]}-${weekMatch[2].padStart(2, "0")}-${weekMatch[1].padStart(2, "0")}`;
    roster.current_week_label = `本週（${weekMatch[1]}/${weekMatch[2]}/${weekMatch[3]}）`;
    roster.current_week_label_en = `This Week (${weekMatch[1]}/${weekMatch[2]}/${weekMatch[3]})`;
    roster.next_week_label = `下週（${weekMatch[4]}/${weekMatch[5]}/${weekMatch[6]}）`;
    roster.next_week_label_en = `Next Week (${weekMatch[4]}/${weekMatch[5]}/${weekMatch[6]})`;
  }

  const lines = text.split("\n").filter((line) => normalizeZh(line));
  for (const [label, labelEn] of roleLabels) {
    const aliases = label === "會前禱告／司琴" ? [label, "會前禱告/司琴"] : [label];
    const candidateIndexes = lines
      .map((item, index) => [normalizeZh(item), index])
      .filter(([item]) => aliases.some((alias) => item.startsWith(alias)))
      .map(([, index]) => index);
    const lineIndex = label === "青少年團契"
      ? candidateIndexes.find((index) => /傳道|姐妹|弟兄/.test(normalizeZh(lines[index]))) ?? candidateIndexes[0]
      : candidateIndexes[0];
    const line = lines[lineIndex];
    if (!line) continue;
    const matchedLabel = aliases.find((alias) => normalizeZh(line).startsWith(alias)) || label;
    let values = line
      .replace(matchedLabel, "")
      .trim()
      .split(/\s{2,}|\t+/)
      .map(normalizeZh)
      .filter(Boolean);
    if (values.length < 2) {
      const fallback = normalizeZh(line.replace(label, "")).trim();
      const nextLines = lines.slice(lineIndex + 1, lineIndex + 8).map(normalizeZh).filter(Boolean);
      if (label === "晚餐服事") {
        values = fallback.match(/(.+?餐飲)\s*(.+(?:茶點|餐飲))$/)?.slice(1)
          || nextLines.filter((item) => /餐飲|茶點|餐点|茶点/.test(item)).slice(0, 2)
          || values;
      }
      if (label === "兒童牧區") {
        values = fallback.match(/^(\S+姐妹|\S+弟兄)\s+(\S+姐妹|\S+弟兄)$/)?.slice(1)
          || nextLines.filter((item) => /姐妹|弟兄/.test(item) && !/傳道/.test(item)).slice(0, 2)
          || values;
      }
      if (label === "青少年團契") values = fallback.match(/^(\S+傳道|\S+姐妹|\S+弟兄)\s+(\S+姐妹|\S+弟兄)$/)?.slice(1) || values;
    }
    roster.rows.push({
      item_zh: label,
      item_en: labelEn,
      current: (values[0] || "").replace(/\s*主\s*日\s*崇\s*拜\s*/g, ""),
      next: (values[1] || "").replace(/\s*主\s*日\s*崇\s*拜\s*/g, ""),
      emphasis: label === "晚餐服事"
    });
  }

  return roster;
}

function extractPrayerItems(text) {
  const start = text.search(/代禱事項|禱告事項|教\s*會\s*消\s*息\s*與\s*代\s*禱|\+\s*事\s*項/);
  if (start < 0) return [];
  const end = text.slice(start + 1).search(/\f/);
  const section = end > 0 ? text.slice(start, start + end) : text.slice(start);
  const collected = [];
  let current = null;
  for (const rawLine of section.split("\n")) {
    const firstContentIndex = rawLine.search(/\S/);
    if (firstContentIndex > 8) continue;
    const leftColumn = normalizeZh(rawLine.trimStart().split(/\s{2,}/)[0]);
    if (!leftColumn || /教會消息|事項/.test(leftColumn)) continue;
    const numbered = leftColumn.match(/^(\d+)[,.，、]\s*(.+)/);
    if (numbered) {
      if (current) collected.push(current);
      current = numbered[2];
      continue;
    }
    if (current) current = `${current} ${leftColumn}`;
  }
  if (current) collected.push(current);

  return collected
    .map((item) => item.replace(/\s{2,}/g, " ").trim())
    .filter((item) => item.length > 8)
    .slice(0, 5)
    .map((body, index) => ({
      title_zh: `代禱事項 ${index + 1}`,
      title_en: `Prayer Item ${index + 1}`,
      body_zh: body,
      body_en: "",
      item_type: "prayer",
      is_pinned: false,
      sort_order: index + 1,
      status: "published"
    }));
}

function buildSummary(data) {
  const lines = [];
  if (data.bulletinDate) lines.push(`周报日期：${data.bulletinDate}`);
  if (data.issueNumber) lines.push(`期数：${data.issueNumber}`);
  if (data.sermon?.title_zh) lines.push(`主日信息：${data.sermon.title_zh} / ${data.sermon.speaker_zh || ""}`);
  if (data.bibleReading?.scripture_zh) lines.push(`线上读经：${data.bibleReading.scripture_zh}`);
  if (data.roster?.rows?.length) lines.push(`服事表：解析到 ${data.roster.rows.length} 行`);
  if (data.prayerItems?.length) lines.push(`代祷事项：解析到 ${data.prayerItems.length} 条`);
  return lines.join("\n") || "已经读取 PDF，但暂未识别到可发布内容。请查看原始文本。";
}

export async function extractPdfText(pdfPath) {
  const { stdout } = await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
    maxBuffer: 1024 * 1024 * 8
  });
  return stdout;
}

export async function parseBulletin(pdfPath) {
  const rawText = await extractPdfText(pdfPath);
  const normalizedText = normalizeZh(rawText);
  const header = extractHeader(normalizedText);
  const data = {
    ...header,
    sermon: extractSermon(normalizedText, header.bulletinDate),
    bibleReading: extractBibleReading(normalizedText),
    roster: extractRoster(rawText),
    prayerItems: extractPrayerItems(rawText)
  };
  data.summary = buildSummary(data);
  return { data, rawText: normalizedText };
}
