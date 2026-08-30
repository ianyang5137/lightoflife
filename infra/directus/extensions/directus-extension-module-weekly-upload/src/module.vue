<template>
  <private-view title="周报上传">
    <template #actions:primary>
      <v-button
        :disabled="isBusy || !selectedFile"
        :loading="isBusy"
        @click="uploadBulletin"
      >
        上传
      </v-button>
    </template>

    <div class="weekly-upload">
      <header class="page-head">
        <p>上传本周周报 PDF，系统会自动解析并生成待审核内容。</p>
      </header>

      <div class="workspace">
        <section class="panel">
          <h2>文件</h2>

          <label class="file-drop" :class="{ active: selectedFile }">
            <input
              ref="fileInput"
              type="file"
              accept="application/pdf,.pdf"
              @change="selectFile"
            />
            <span class="material-symbols-outlined">upload_file</span>
            <strong>{{ selectedFile ? selectedFile.name : '选择 PDF 文件' }}</strong>
            <small>{{ selectedFile ? fileSize : '支持每周周报 PDF' }}</small>
          </label>

          <label class="field">
            <span>标题</span>
            <input v-model="title" type="text" placeholder="例如：周报2026年8月30日 641期" />
          </label>

          <div class="button-row">
            <v-button
              :disabled="isBusy || !selectedFile"
              :loading="isBusy"
              @click="uploadBulletin"
            >
              上传并解析
            </v-button>
            <v-button v-if="selectedFile && !isBusy" secondary @click="clearSelection">
              清除
            </v-button>
          </div>

          <p v-if="message" class="message" :class="messageType">
            {{ message }}
          </p>
        </section>

        <aside class="panel progress-panel">
          <h2>进度</h2>

          <ol class="steps">
            <li
              v-for="step in steps"
              :key="step.key"
              :class="{ current: step.key === currentStep, done: step.done }"
            >
              <span class="dot">
                <span v-if="step.done" class="material-symbols-outlined">check</span>
              </span>
              <div>
                <strong>{{ step.title }}</strong>
                <small>{{ step.description }}</small>
              </div>
            </li>
          </ol>

          <div v-if="createdItemUrl" class="next-actions">
            <v-button :href="createdItemUrl">打开审核记录</v-button>
            <v-button secondary href="/admin/content/weekly_bulletins">查看历史</v-button>
          </div>
        </aside>
      </div>
    </div>
  </private-view>
</template>

<script>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const STATUS_LABELS = {
  uploaded: '已提交，等待解析',
  parsing: '正在解析 PDF',
  needs_review: '解析完成，请审核',
  publish_requested: '等待发布',
  published: '已发布',
  failed: '解析失败',
};

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
    const isPolling = ref(false);
    const uploadStage = ref('idle');
    const processStatus = ref('');
    const message = ref('');
    const messageType = ref('info');
    const createdItemId = ref(null);
    const createdItemUrl = ref('');
    let pollTimer = null;

    const isBusy = computed(() => isUploading.value || isPolling.value);

    const fileSize = computed(() => {
      if (!selectedFile.value) return '';
      const mb = selectedFile.value.size / 1024 / 1024;
      return `${mb.toFixed(1)} MB`;
    });

    const currentStep = computed(() => {
      if (processStatus.value === 'failed') return 'review';
      if (['needs_review', 'publish_requested', 'published'].includes(processStatus.value)) return 'review';
      if (['uploaded', 'parsing'].includes(processStatus.value) || isPolling.value) return 'parse';
      if (uploadStage.value === 'record') return 'record';
      if (uploadStage.value === 'upload') return 'upload';
      return 'select';
    });

    const steps = computed(() => [
      {
        key: 'select',
        title: '选择文件',
        description: selectedFile.value ? selectedFile.value.name : '选择本周 PDF',
        done: Boolean(selectedFile.value) || uploadStage.value !== 'idle',
      },
      {
        key: 'upload',
        title: '上传文件',
        description: uploadStage.value === 'upload' ? '正在上传到后台文件库' : '等待上传',
        done: ['record', 'done'].includes(uploadStage.value) || Boolean(createdItemId.value),
      },
      {
        key: 'record',
        title: '创建记录',
        description: createdItemId.value ? '导入记录已创建' : '等待创建审核记录',
        done: Boolean(createdItemId.value),
      },
      {
        key: 'parse',
        title: '自动解析',
        description: STATUS_LABELS[processStatus.value] || '上传后自动开始',
        done: ['needs_review', 'publish_requested', 'published'].includes(processStatus.value),
      },
      {
        key: 'review',
        title: '审核发布',
        description: processStatus.value === 'failed' ? '请打开记录查看错误' : '确认后改为“请求发布”',
        done: processStatus.value === 'published',
      },
    ]);

    function setMessage(type, text) {
      messageType.value = type;
      message.value = text;
    }

    function stopPolling() {
      if (pollTimer) window.clearTimeout(pollTimer);
      pollTimer = null;
      isPolling.value = false;
    }

    function clearSelection() {
      selectedFile.value = null;
      title.value = '';
      message.value = '';
      if (fileInput.value) fileInput.value.value = '';
    }

    function selectFile(event) {
      const [file] = event.target.files || [];
      stopPolling();
      selectedFile.value = file || null;
      createdItemId.value = null;
      createdItemUrl.value = '';
      processStatus.value = '';
      uploadStage.value = 'idle';
      if (file && !title.value.trim()) title.value = stripExtension(file.name);
      if (file) setMessage('info', '文件已选择，点击上传即可开始。');
    }

    async function refreshStatus(itemId) {
      const response = await api.get(`/items/weekly_bulletins/${itemId}`, {
        params: { fields: 'id,process_status,parsed_summary,error_message' },
      });

      const item = response.data?.data;
      processStatus.value = item?.process_status || '';

      if (item?.process_status === 'needs_review') {
        stopPolling();
        setMessage('success', '解析完成，请打开审核记录确认内容。');
        return;
      }

      if (item?.process_status === 'failed') {
        stopPolling();
        setMessage('error', item?.error_message || '解析失败，请打开记录查看详情。');
        return;
      }

      pollTimer = window.setTimeout(() => refreshStatus(itemId), 5000);
    }

    async function uploadBulletin() {
      if (!selectedFile.value) {
        setMessage('error', '请先选择 PDF 文件。');
        return;
      }

      stopPolling();
      isUploading.value = true;
      createdItemId.value = null;
      createdItemUrl.value = '';
      processStatus.value = '';
      uploadStage.value = 'upload';
      setMessage('info', '正在上传文件...');

      try {
        const formData = new FormData();
        formData.append('title', title.value.trim() || stripExtension(selectedFile.value.name));
        formData.append('file', selectedFile.value);

        const fileResponse = await api.post('/files', formData);
        const fileId = fileResponse.data?.data?.id;
        if (!fileId) throw new Error('文件上传成功，但没有返回文件 ID。');

        uploadStage.value = 'record';
        setMessage('info', '正在创建导入记录...');

        const itemResponse = await api.post('/items/weekly_bulletins', {
          title: title.value.trim() || stripExtension(selectedFile.value.name),
          pdf_file: fileId,
          process_status: 'uploaded',
        });

        const itemId = itemResponse.data?.data?.id;
        if (!itemId) throw new Error('导入记录创建失败。');

        createdItemId.value = itemId;
        createdItemUrl.value = `/admin/content/weekly_bulletins/${itemId}`;
        uploadStage.value = 'done';
        processStatus.value = 'uploaded';
        setMessage('info', '已提交，正在等待自动解析...');

        selectedFile.value = null;
        title.value = '';
        if (fileInput.value) fileInput.value.value = '';

        isPolling.value = true;
        pollTimer = window.setTimeout(() => refreshStatus(itemId), 3000);
      } catch (error) {
        const reason = error?.response?.data?.errors?.[0]?.message || error?.message || '未知错误';
        uploadStage.value = 'idle';
        setMessage('error', `上传失败：${reason}`);
      } finally {
        isUploading.value = false;
      }
    }

    onBeforeUnmount(stopPolling);

    return {
      clearSelection,
      createdItemUrl,
      currentStep,
      fileInput,
      fileSize,
      isBusy,
      message,
      messageType,
      selectedFile,
      selectFile,
      steps,
      title,
      uploadBulletin,
    };
  },
};
</script>

<style scoped>
.weekly-upload {
  display: grid;
  gap: 24px;
  max-width: 1120px;
  padding: 28px;
}

.page-head p {
  max-width: 640px;
  margin: 0;
  color: var(--foreground-subdued);
  font-size: 16px;
  line-height: 1.6;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
}

.panel {
  border: 1px solid var(--border-normal);
  border-radius: 8px;
  background: var(--background-page);
  padding: 24px;
}

.panel h2 {
  margin: 0 0 18px;
  color: var(--foreground-normal);
  font-size: 18px;
  line-height: 1.3;
}

.file-drop {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 4px 14px;
  align-items: center;
  min-height: 112px;
  margin-bottom: 20px;
  padding: 22px;
  border: 1px dashed var(--border-normal);
  border-radius: 8px;
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
  grid-row: span 2;
  color: var(--primary);
  font-size: 34px;
}

.file-drop strong {
  max-width: 100%;
  color: var(--foreground-normal);
  font-size: 16px;
  overflow-wrap: anywhere;
}

.file-drop small {
  color: var(--foreground-subdued);
}

.field {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
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

.button-row,
.next-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.message {
  margin: 18px 0 0;
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

.progress-panel {
  align-self: start;
}

.steps {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.steps li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  color: var(--foreground-subdued);
}

.steps li.current strong {
  color: var(--primary);
}

.steps li.done strong {
  color: var(--foreground-normal);
}

.dot {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-normal);
  border-radius: 999px;
}

.current .dot {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.done .dot {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--background-page);
}

.dot .material-symbols-outlined {
  font-size: 16px;
}

.steps strong,
.steps small {
  display: block;
}

.steps strong {
  margin-bottom: 4px;
  font-size: 14px;
}

.steps small {
  line-height: 1.5;
}

.next-actions {
  margin-top: 24px;
}

@media (max-width: 960px) {
  .weekly-upload {
    padding: 20px;
  }

  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
