# Weekly Bulletin Import

This importer lets the church upload a weekly bulletin PDF, review the parsed result, and then publish it to the existing public website data.

## Weekly Workflow

1. Open Directus: `https://admin.lightoflife.org.nz/admin/`
2. Open `周报导入`.
3. Create a new item.
4. Fill `标题`, upload the weekly PDF, and keep status as `已上传，等待解析`.
5. Wait about one minute. The importer changes the status to `等待审核`.
6. Check `解析预览摘要`.
7. If the preview is correct, change status to `请求发布` and save.
8. The importer publishes the data and changes status to `已发布`.

The public website keeps the same layout and styling. Only the Directus content records are updated.

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
