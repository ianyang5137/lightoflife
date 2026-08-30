<template>
  <private-view title="周报上传">
    <template #actions:primary>
      <v-button
        :disabled="isUploading || !selectedFile"
        :loading="isUploading"
        @click="uploadBulletin"
      >
        上传并开始解析
      </v-button>
    </template>

    <div class="weekly-upload">
      <section class="upload-panel">
        <div class="intro">
          <p class="eyebrow">每周周报</p>
          <h2>上传 PDF 后，系统会自动解析并填充网站内容。</h2>
          <p>
            上传完成后会建立一条“待检查”的周报记录。解析器会自动读取主日信息、读经、服事表和代祷事项；
            检查无误后，把状态改为“请求发布”即可更新前台页面。
          </p>
        </div>

        <label class="file-drop" :class="{ active: selectedFile }">
          <input
            ref="fileInput"
            type="file"
            accept="application/pdf,.pdf"
            @change="selectFile"
          />
          <span class="material-symbols-outlined">picture_as_pdf</span>
          <strong>{{ selectedFile ? selectedFile.name : '选择周报 PDF' }}</strong>
          <small>{{ selectedFile ? fileSize : '只需要选择本周 PDF 文件' }}</small>
        </label>

        <label class="field">
          <span>标题</span>
          <input v-model="title" type="text" placeholder="例如：周报2026年8月30日 641期" />
        </label>

        <div v-if="message" class="message" :class="messageType">
          {{ message }}
        </div>

        <div v-if="createdItemUrl" class="next-actions">
          <v-button secondary :href="createdItemUrl">打开周报记录</v-button>
          <v-button secondary href="/admin/content/weekly_bulletins">查看导入历史</v-button>
        </div>
      </section>

      <aside class="guide">
        <h3>发布流程</h3>
        <ol>
          <li>选择本周 PDF 并上传。</li>
          <li>等待 1 分钟左右，打开记录检查解析结果。</li>
          <li>确认无误后，将状态改成“请求发布”并保存。</li>
        </ol>
      </aside>
    </div>
  </private-view>
</template>

<script>
import { computed, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

function stripExtension(fileName) {
  return fileName.replace(/\.pdf$/i, '');
}

export default {
  setup() {
    const api = useApi();
    const selectedFile = ref(null);
    const fileInput = ref(null);
    const title = ref('');
    const isUploading = ref(false);
    const message = ref('');
    const messageType = ref('info');
    const createdItemUrl = ref('');

    const fileSize = computed(() => {
      if (!selectedFile.value) return '';
      const mb = selectedFile.value.size / 1024 / 1024;
      return `${mb.toFixed(1)} MB`;
    });

    function setMessage(type, text) {
      messageType.value = type;
      message.value = text;
    }

    function selectFile(event) {
      const [file] = event.target.files || [];
      selectedFile.value = file || null;
      createdItemUrl.value = '';
      if (file && !title.value.trim()) title.value = stripExtension(file.name);
      if (file) setMessage('info', '文件已选择，可以上传。');
    }

    async function uploadBulletin() {
      if (!selectedFile.value) {
        setMessage('error', '请先选择一个 PDF 文件。');
        return;
      }

      isUploading.value = true;
      createdItemUrl.value = '';
      setMessage('info', '正在上传 PDF...');

      try {
        const formData = new FormData();
        formData.append('title', title.value.trim() || stripExtension(selectedFile.value.name));
        formData.append('file', selectedFile.value);

        const fileResponse = await api.post('/files', formData);
        const fileId = fileResponse.data?.data?.id;
        if (!fileId) throw new Error('文件上传成功，但没有返回文件 ID。');

        setMessage('info', '文件已上传，正在建立周报记录...');

        const itemResponse = await api.post('/items/weekly_bulletins', {
          title: title.value.trim() || stripExtension(selectedFile.value.name),
          pdf_file: fileId,
          process_status: 'uploaded',
        });

        const itemId = itemResponse.data?.data?.id;
        createdItemUrl.value = itemId ? `/admin/content/weekly_bulletins/${itemId}` : '/admin/content/weekly_bulletins';
        setMessage('success', '已提交。系统会在约 1 分钟内自动解析，请打开记录检查结果。');

        selectedFile.value = null;
        title.value = '';
        if (fileInput.value) fileInput.value.value = '';
      } catch (error) {
        const reason = error?.response?.data?.errors?.[0]?.message || error?.message || '未知错误';
        setMessage('error', `上传失败：${reason}`);
      } finally {
        isUploading.value = false;
      }
    }

    return {
      createdItemUrl,
      fileInput,
      fileSize,
      isUploading,
      message,
      messageType,
      selectedFile,
      selectFile,
      title,
      uploadBulletin,
    };
  },
};
</script>

<style scoped>
.weekly-upload {
  display: grid;
  grid-template-columns: minmax(0, 680px) 280px;
  gap: 32px;
  padding: 32px;
}

.upload-panel,
.guide {
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  background: var(--background-page);
}

.upload-panel {
  padding: 32px;
}

.intro {
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary);
  font-weight: 700;
}

h2 {
  max-width: 560px;
  margin: 0 0 12px;
  font-size: 28px;
  line-height: 1.25;
}

p {
  max-width: 600px;
  margin: 0;
  color: var(--foreground-subdued);
  line-height: 1.7;
}

.file-drop {
  display: grid;
  place-items: center;
  min-height: 220px;
  margin-bottom: 24px;
  padding: 28px;
  border: 1px dashed var(--border-normal);
  border-radius: 8px;
  color: var(--foreground-subdued);
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.file-drop:hover,
.file-drop.active {
  border-color: var(--primary);
  background: var(--background-normal);
}

.file-drop input {
  display: none;
}

.file-drop .material-symbols-outlined {
  margin-bottom: 10px;
  color: var(--primary);
  font-size: 42px;
}

.file-drop strong {
  max-width: 100%;
  color: var(--foreground-normal);
  font-size: 18px;
  overflow-wrap: anywhere;
}

.file-drop small {
  margin-top: 8px;
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.field span {
  color: var(--foreground-normal);
  font-weight: 700;
}

.field input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border-normal);
  border-radius: 6px;
  background: var(--background-input);
  color: var(--foreground-normal);
}

.message {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 6px;
  line-height: 1.6;
}

.message.info {
  background: var(--background-normal);
  color: var(--foreground-normal);
}

.message.success {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  color: var(--success);
}

.message.error {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}

.next-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.guide {
  align-self: start;
  padding: 24px;
}

.guide h3 {
  margin: 0 0 14px;
  font-size: 18px;
}

.guide ol {
  display: grid;
  gap: 12px;
  margin: 0;
  padding-left: 20px;
  color: var(--foreground-subdued);
  line-height: 1.6;
}

@media (max-width: 960px) {
  .weekly-upload {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .upload-panel,
  .guide {
    padding: 22px;
  }
}
</style>
