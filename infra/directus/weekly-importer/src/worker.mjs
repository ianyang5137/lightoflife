import { mkdir } from "node:fs/promises";
import path from "node:path";
import { downloadAsset, getItems, login, patchItem } from "./directus.mjs";
import { parseBulletin } from "./parser.mjs";
import { publishBulletin } from "./publisher.mjs";

const intervalSeconds = Number(process.env.WEEKLY_IMPORT_INTERVAL_SECONDS || 60);
const workDir = "/tmp/weekly-importer";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function parseUploaded(token, bulletin) {
  if (!bulletin.pdf_file) {
    await patchItem(token, "weekly_bulletins", bulletin.id, {
      process_status: "failed",
      error_message: "没有上传 PDF 文件。"
    });
    return;
  }

  await patchItem(token, "weekly_bulletins", bulletin.id, {
    process_status: "parsing",
    error_message: null
  });

  const pdfPath = path.join(workDir, `${bulletin.id}.pdf`);
  await downloadAsset(token, bulletin.pdf_file, pdfPath);
  const result = await parseBulletin(pdfPath);
  await patchItem(token, "weekly_bulletins", bulletin.id, {
    bulletin_date: result.data.bulletinDate || bulletin.bulletin_date || null,
    issue_number: result.data.issueNumber || bulletin.issue_number || null,
    process_status: "needs_review",
    parsed_summary: result.data.summary,
    parsed_data: result.data,
    raw_text: result.rawText,
    parsed_at: new Date().toISOString(),
    error_message: null
  });
  console.log(`Parsed weekly bulletin ${bulletin.id}`);
}

async function runOnce() {
  await mkdir(workDir, { recursive: true });
  const token = await login();

  const uploaded = await getItems(token, "weekly_bulletins", "?filter[process_status][_eq]=uploaded&limit=5&fields=id,pdf_file,bulletin_date,issue_number");
  for (const bulletin of uploaded) {
    try {
      await parseUploaded(token, bulletin);
    } catch (error) {
      await patchItem(token, "weekly_bulletins", bulletin.id, {
        process_status: "failed",
        error_message: error.message
      }).catch(() => null);
      console.error(`Failed to parse weekly bulletin ${bulletin.id}`, error);
    }
  }

  const publishRequests = await getItems(token, "weekly_bulletins", "?filter[process_status][_eq]=publish_requested&limit=5&fields=*,parsed_data");
  for (const bulletin of publishRequests) {
    try {
      await publishBulletin(token, bulletin);
      console.log(`Published weekly bulletin ${bulletin.id}`);
    } catch (error) {
      await patchItem(token, "weekly_bulletins", bulletin.id, {
        process_status: "failed",
        error_message: error.message
      }).catch(() => null);
      console.error(`Failed to publish weekly bulletin ${bulletin.id}`, error);
    }
  }
}

while (true) {
  try {
    await runOnce();
  } catch (error) {
    console.error("Weekly importer cycle failed", error);
  }
  await sleep(Math.max(15, intervalSeconds) * 1000);
}
