<template>
  <div id="appManagePage">
    <!-- 搜索表单 -->
    <a-form layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="应用名称">
        <a-input v-model:value="searchParams.appName" placeholder="输入应用名称" />
      </a-form-item>
      <a-form-item label="用户 id">
        <a-input-number
          v-model:value="searchParams.userId"
          placeholder="用户 id"
          style="width: 120px"
        />
      </a-form-item>
      <a-form-item label="生成类型">
        <a-select
          v-model:value="searchParams.codeGenType"
          placeholder="全部"
          style="width: 160px"
          allow-clear
        >
          <a-select-option value="multi_file">原生多文件模式</a-select-option>
          <a-select-option value="html">原生单文件模式</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="优先级">
        <a-input-number
          v-model:value="searchParams.priority"
          placeholder="优先级"
          style="width: 120px"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
      </a-form-item>
    </a-form>
    <a-divider />
    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="data"
      :pagination="pagination"
      :scroll="{ x: 1220 }"
      @change="doTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'cover'">
          <a-image v-if="record.cover" :src="record.cover" :width="80" />
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'codeGenType'">
          {{ codeGenTypeLabel(record.codeGenType) }}
        </template>
        <template v-else-if="column.dataIndex === 'user'">
          <a-space v-if="record.user" :size="8">
            <a-avatar :src="record.user.userAvatar" :size="28" />
            <span>{{ record.user.userName }}</span>
          </a-space>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.dataIndex === 'priority'">
          <a-tag v-if="record.priority === 99" color="gold">精选</a-tag>
          <span v-else>{{ record.priority }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'deployedTime'">
          <span v-if="record.deployedTime">{{
            dayjs(record.deployedTime).format('YYYY-MM-DD HH:mm:ss')
          }}</span>
          <span v-else style="color: #bbb">未部署</span>
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="doEdit(record.id)">编辑</a-button>
            <a-button type="link" @click="doFeature(record)">
              {{ record.priority === 99 ? '取消精选' : '精选' }}
            </a-button>
            <a-popconfirm
              title="确定要删除该应用吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="doDelete(record.id)"
            >
              <a-button danger type="link">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { deleteAppByAdmin, listAppVoByPageByAdmin, updateAppByAdmin } from '@/api/appController.ts'

const codeGenTypeMap: Record<string, string> = {
  html: '原生单文件模式',
  multi_file: '原生多文件模式',
  react: '用户应用',
}
const codeGenTypeLabel = (type?: string) => codeGenTypeMap[type ?? ''] ?? (type || '-')

const columns = [
  { title: 'id', dataIndex: 'id', width: 80 },
  { title: '应用名称', dataIndex: 'appName', width: 150 },
  { title: '封面', dataIndex: 'cover', width: 100 },
  { title: '初始提示词', dataIndex: 'initPrompt', width: 160, ellipsis: true },
  { title: '生成类型', dataIndex: 'codeGenType', width: 150 },
  { title: '创建者', dataIndex: 'user', width: 140 },
  { title: '优先级', dataIndex: 'priority', width: 80 },
  { title: '部署时间', dataIndex: 'deployedTime', width: 180 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' },
]

const data = ref<API.AppVO[]>([])
const total = ref(0)

const searchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 10,
})

const fetchData = async () => {
  const res = await listAppVoByPageByAdmin({ ...searchParams })
  if (res.data.code === 0 && res.data.data) {
    data.value = res.data.data.records ?? []
    total.value = res.data.data.totalRow ?? 0
  } else {
    message.error('获取数据失败，' + res.data.message)
  }
}

const pagination = computed(() => ({
  current: searchParams.pageNum ?? 1,
  pageSize: searchParams.pageSize ?? 10,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}))

const doTableChange = (page: { current: number; pageSize: number }) => {
  searchParams.pageNum = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}

const doSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

const doEdit = (id?: number) => {
  if (!id) return
  window.open(`/app/edit/${id}`, '_blank')
}

const doFeature = async (record: API.AppVO) => {
  if (!record.id) return
  const isFeatured = record.priority === 99
  const res = await updateAppByAdmin({
    id: record.id,
    priority: isFeatured ? 0 : 99,
  })
  if (res.data.code === 0) {
    message.success(isFeatured ? '已取消精选' : '已设为精选')
    fetchData()
  } else {
    message.error('操作失败，' + res.data.message)
  }
}

const doDelete = async (id?: number) => {
  if (!id) return
  const res = await deleteAppByAdmin({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
    fetchData()
  } else {
    message.error('删除失败，' + res.data.message)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
#appManagePage {
  width: 100%;
  max-width: 1480px;
}
</style>
