# Weekly Bulletin Import

This importer lets the church upload a weekly bulletin PDF, review the parsed result, and then publish it to the existing public website data.

## Weekly Workflow

1. Sign in to Directus: `https://admin.lightoflife.org.nz/admin`
2. Open the left-side `周报上传` module.
3. Choose the weekly PDF and upload it.
4. Wait about one minute. The importer changes the status to `等待审核`.
5. Open `周报导入` / `weekly_bulletins` and check `解析预览摘要`.
6. If the preview is correct, change status to `请求发布` and save.
7. The importer publishes the data and changes status to `已发布`.

The public website keeps the same layout and styling. Only the Directus content records are updated.

## Uploading the PDF

Use the Directus `周报上传` module for weekly PDF uploads. It uses the current Directus login session, avoids the Directus file picker, and creates the import record automatically.

The standalone upload page at `https://admin.lightoflife.org.nz/weekly-upload/` is kept as a fallback if the module is temporarily unavailable.

The `PDF File` field in Directus uses the Directus file picker. It should offer upload from device, choose from library, and import from URL.

If you only see the file library:

1. Open the left-side `文件库`.
2. Upload the weekly PDF there.
3. Return to `周报导入`.
4. Open `PDF File` and choose the PDF you just uploaded.

If the upload button is missing for a non-admin user, check that the user's role has `create` permission for `directus_files` and `directus_folders`.

## What It Publishes

- `主日信息设置`
- `Sermons`
- `线上读经`
- `读经问题`
- `服事表`
- `服事表项目`
- `代祷事项`

## Install

From `/apps/website/lightoflife`:

```bash
ADMIN_PASSWORD='your-admin-password' DIRECTUS_URL='https://admin.lightoflife.org.nz' node scripts/setup-weekly-bulletins.mjs
docker compose up -d --build weekly_importer
```

## Status Meanings

- `已上传，等待解析`: A new PDF is waiting for the importer.
- `解析中`: The importer is reading the PDF.
- `等待审核`: The parser finished and the result needs review.
- `请求发布`: The reviewed result should be published.
- `已发布`: The website data has been updated.
- `失败`: Check `错误信息` and `PDF 原始文本`.

## Test a PDF Locally

```bash
cd infra/directus/weekly-importer
docker build -t lightoflife-weekly-importer-test .
docker run --rm -v "/path/to/folder:/pdfs:ro" lightoflife-weekly-importer-test npm run parse-local -- /pdfs/weekly.pdf
```

## Rollback

Every publish stores `published_snapshot` on the `周报导入` item. This is a manual rollback record for the collections touched during publishing.

## Parser Notes

The parser expects the weekly bulletin PDF layout to stay reasonably consistent. If a future PDF changes format, leave that item unpublished, check `PDF 原始文本`, then adjust the parser before publishing.
