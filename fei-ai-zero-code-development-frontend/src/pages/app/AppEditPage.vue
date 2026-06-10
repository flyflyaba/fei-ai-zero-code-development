<template>
  <div id="appEditPage">
    <h2 class="title">编辑应用信息</h2>
    <a-spin :spinning="loading">
      <a-form v-if="appInfo.id" :model="formState" layout="vertical" @finish="handleSubmit">
        <a-form-item
          label="应用名称"
          name="appName"
          :rules="[{ required: true, message: '请输入应用名称' }]"
        >
          <a-input v-model:value="formState.appName" placeholder="请输入应用名称" />
        </a-form-item>

        <a-form-item label="初始提示词">
          <a-textarea
            :value="appInfo.initPrompt || '-'"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            disabled
          />
        </a-form-item>

        <a-form-item label="生成类型">
          <a-input :value="appInfo.codeGenType || '-'" disabled />
        </a-form-item>

        <a-form-item label="部署密钥">
          <a-input :value="appInfo.deployKey || '-'" disabled />
        </a-form-item>

        <template v-if="isAdmin">
          <a-form-item label="应用封面" name="cover">
            <a-input v-model:value="formState.cover" placeholder="请输入封面图片 URL" />
          </a-form-item>
          <a-form-item label="优先级" name="priority">
            <a-input-number v-model:value="formState.priority" :min="0" style="width: 100%" />
          </a-form-item>
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">保存修改</a-button>
            <a-button @click="handleReset">重置</a-button>
            <a-button @click="goToChat">重新进入对话</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-spin>

    <div v-if="appInfo.id" class="app-info-table">
      <h3 class="table-title">应用信息</h3>
      <a-table
        :columns="infoColumns"
        :data-source="infoData"
        :pagination="false"
        bordered
        size="small"
        class="info-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'col1' || column.key === 'col3'">
            <span class="cell-label">{{ record[column.key] }}</span>
          </template>
          <template v-else-if="column.key === 'col4' && record.col4 === 'previewUrl'">
            <a :href="previewUrl" target="_blank">查看预览</a>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, updateApp, updateAppByAdmin } from '@/api/appController.ts'
import { getAppPreviewUrl } from '@/utils/appUtils.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { toIdString } from '@/utils/id.ts'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = computed(() => toIdString(route.params.id as string))
const isAdmin = computed(() => loginUserStore.loginUser.userRole === 'admin')

const loading = ref(true)
const submitting = ref(false)
const appInfo = ref<API.AppVO>({})

const formState = reactive({
  appName: '',
  cover: '',
  priority: 0,
})

const formatTime = (time?: string) => {
  if (!time) return '-'
  return time.replace('T', ' ')
}

const previewUrl = computed(() => getAppPreviewUrl(appInfo.value))

const infoColumns = [
  { title: '', dataIndex: 'col1', key: 'col1', width: '15%' },
  { title: '', dataIndex: 'col2', key: 'col2', width: '35%' },
  { title: '', dataIndex: 'col3', key: 'col3', width: '15%' },
  { title: '', dataIndex: 'col4', key: 'col4', width: '35%' },
]

const infoData = computed(() => [
  {
    col1: '应用ID',
    col2: appInfo.value.id ?? '-',
    col3: '创建者',
    col4: appInfo.value.user?.userName ?? '-',
  },
  {
    col1: '创建时间',
    col2: formatTime(appInfo.value.createTime),
    col3: '更新时间',
    col4: formatTime(appInfo.value.updateTime),
  },
  {
    col1: '部署时间',
    col2: appInfo.value.deployedTime ? formatTime(appInfo.value.deployedTime) : '未部署',
    col3: '访问链接',
    col4: 'previewUrl',
  },
])

const loadAppInfo = async () => {
  loading.value = true
  try {
    const res = await getAppVoById({ id: appId.value })
    if (res.data.code === 0 && res.data.data) {
      appInfo.value = res.data.data
      formState.appName = res.data.data.appName ?? ''
      formState.cover = res.data.data.cover ?? ''
      formState.priority = res.data.data.priority ?? 0

      const loginUser = loginUserStore.loginUser
      if (!isAdmin.value && res.data.data.userId !== loginUser.id) {
        message.error('无权编辑此应用')
        router.push('/')
      }
    } else {
      message.error('获取应用信息失败')
      router.push('/')
    }
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  formState.appName = appInfo.value.appName ?? ''
  formState.cover = appInfo.value.cover ?? ''
  formState.priority = appInfo.value.priority ?? 0
  message.info('已重置')
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    let res
    if (isAdmin.value) {
      res = await updateAppByAdmin({
        id: appId.value,
        appName: formState.appName,
        cover: formState.cover,
        priority: formState.priority,
      })
    } else {
      res = await updateApp({
        id: appId.value,
        appName: formState.appName,
      })
    }
    if (res.data.code === 0) {
      message.success('保存成功')
      await loadAppInfo()
    } else {
      message.error('保存失败，' + res.data.message)
    }
  } finally {
    submitting.value = false
  }
}

const goToChat = () => {
  router.push(`/app/chat/${appId.value}`)
}

onMounted(() => {
  loadAppInfo()
})
</script>

<style scoped>
#appEditPage {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 24px;
}

.title {
  margin-bottom: 24px;
}

.table-title {
  margin: 32px 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.app-info-table {
  margin-top: 8px;
}

.info-table :deep(.ant-table-cell) {
  background: #f5f5f5;
  white-space: nowrap;
}

.cell-label {
  font-weight: 600;
}
</style>
