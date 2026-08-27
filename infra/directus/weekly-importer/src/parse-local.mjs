import { parseBulletin } from "./parser.mjs";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: npm run parse-local -- /path/to/weekly-bulletin.pdf");
  process.exit(1);
}

const result = await parseBulletin(pdfPath);
console.log(JSON.stringify(result.data, null, 2));
