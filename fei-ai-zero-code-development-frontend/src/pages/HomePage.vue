<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowUpOutlined, PaperClipOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import { addApp, listGoodAppVoByPage, listMyAppVoByPage } from '@/api/appController.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import AppCard from '@/components/AppCard.vue'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const prompt = ref('')
const creating = ref(false)

const quickPrompts = [
  {
    label: '个人博客网站',
    prompt:
      '创建一个现代化的个人博客网站，包含文章列表、详情页、分类标签、搜索功能、评论系统和个人简介页面。采用简洁的设计风格，支持响应式布局，文章支持Markdown格式，首页展示最新文章和热门推荐。',
  },
  {
    label: '企业网站',
    prompt:
      '创建一个专业企业官网，包含公司简介、核心业务、成功案例、团队介绍和联系我们等模块，风格简洁大气',
  },
  {
    label: '电商运营后台',
    prompt:
      '创建一个电商运营后台管理系统，包含数据概览看板、订单管理、商品管理、用户管理和营销活动配置，界面清晰易用',
  },
  {
    label: '波普风电商页面',
    prompt:
      '创建一个波普风电商首页，风格大胆鲜艳，包含商品轮播、分类导航、热销推荐和促销专区，布局活泼有冲击力',
  },
]

// 我的应用
const myApps = ref<API.AppVO[]>([])
const myTotal = ref(0)
const mySearchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 6,
  sortField: 'createTime',
  sortOrder: 'desc',
})

// 精选应用
const goodApps = ref<API.AppVO[]>([])
const goodTotal = ref(0)
const goodSearchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 6,
  sortField: 'createTime',
  sortOrder: 'desc',
})

const isLoggedIn = computed(() => !!loginUserStore.loginUser.id)

const myPagination = computed(() => ({
  current: mySearchParams.pageNum ?? 1,
  pageSize: mySearchParams.pageSize ?? 6,
  total: myTotal.value,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 个应用`,
}))

const goodPagination = computed(() => ({
  current: goodSearchParams.pageNum ?? 1,
  pageSize: goodSearchParams.pageSize ?? 6,
  total: goodTotal.value,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 个应用`,
}))

const fetchMyApps = async () => {
  if (!isLoggedIn.value) {
    return
  }
  const res = await listMyAppVoByPage({ ...mySearchParams })
  if (res.data.code === 0 && res.data.data) {
    myApps.value = res.data.data.records ?? []
    myTotal.value = res.data.data.totalRow ?? 0
  }
}

const fetchGoodApps = async () => {
  const res = await listGoodAppVoByPage({ ...goodSearchParams })
  if (res.data.code === 0 && res.data.data) {
    goodApps.value = res.data.data.records ?? []
    goodTotal.value = res.data.data.totalRow ?? 0
  }
}

const handleMyPageChange = (page: number) => {
  mySearchParams.pageNum = page
  fetchMyApps()
}

const handleGoodPageChange = (page: number) => {
  goodSearchParams.pageNum = page
  fetchGoodApps()
}

const handleCreateApp = async () => {
  const text = prompt.value.trim()
  if (!text) {
    message.warning('请输入提示词')
    return
  }
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push(`/user/login?redirect=${encodeURIComponent('/')}`)
    return
  }
  creating.value = true
  try {
    const res = await addApp({ initPrompt: text })
    if (res.data.code === 0 && res.data.data) {
      await router.push({
        path: `/app/chat/${res.data.data}`,
        query: { autoSend: '1' },
      })
      // 跳转成功后保持 loading，避免图标闪回
      return
    }
    message.error('创建失败，' + res.data.message)
    creating.value = false
  } catch {
    message.error('创建失败')
    creating.value = false
  }
}

const handleQuickPrompt = (item: { label: string; prompt: string }) => {
  prompt.value = item.prompt
}

onMounted(() => {
  fetchMyApps()
  fetchGoodApps()
})
</script>

<template>
  <div id="homePage">
    <!-- 顶部标题区 -->
    <section class="hero-section">
      <h1 class="hero-title">一句话呈所想</h1>
      <p class="hero-subtitle">与 AI 对话轻松创建应用和网站</p>

      <!-- 提示词输入框 -->
      <div class="prompt-box">
        <a-textarea
          v-model:value="prompt"
          :auto-size="{ minRows: 4, maxRows: 8 }"
          placeholder="使用 NoCode 创建一个高效的小工具，帮我计算......"
          :bordered="false"
          class="prompt-input"
          @keydown.enter.ctrl="handleCreateApp"
        />
        <div class="prompt-actions">
          <div class="prompt-actions-left">
            <a-button type="text" size="small" disabled>
              <PaperClipOutlined />
              上传
            </a-button>
            <a-button type="text" size="small" disabled>
              <ThunderboltOutlined />
              优化
            </a-button>
          </div>
          <a-button
            type="primary"
            shape="circle"
            :loading="creating"
            class="send-btn"
            @click="handleCreateApp"
          >
            <template #icon>
              <ArrowUpOutlined />
            </template>
          </a-button>
        </div>
      </div>

      <!-- 快捷提示词 -->
      <div class="quick-prompts">
        <a-button
          v-for="item in quickPrompts"
          :key="item.label"
          class="quick-prompt-btn"
          @click="handleQuickPrompt(item)"
        >
          {{ item.label }}
        </a-button>
      </div>
    </section>

    <!-- 我的作品 -->
    <section v-if="isLoggedIn" class="apps-section">
      <h2 class="section-title">我的作品</h2>
      <a-spin :spinning="false">
        <a-row v-if="myApps.length" :gutter="[24, 24]">
          <a-col v-for="app in myApps" :key="app.id" :xs="24" :sm="12" :md="8">
            <AppCard :app="app" />
          </a-col>
        </a-row>
        <a-empty v-else description="暂无作品，快去创建吧" />
        <div class="pagination-wrap">
          <a-pagination v-bind="myPagination" @change="handleMyPageChange" />
        </div>
      </a-spin>
    </section>

    <!-- 精选案例 -->
    <section class="apps-section">
      <h2 class="section-title">精选案例</h2>
      <a-row v-if="goodApps.length" :gutter="[24, 24]">
        <a-col v-for="app in goodApps" :key="app.id" :xs="24" :sm="12" :md="8">
          <AppCard :app="app" show-tag show-author />
        </a-col>
      </a-row>
      <a-empty v-else description="暂无精选案例" />
      <div class="pagination-wrap">
        <a-pagination v-bind="goodPagination" @change="handleGoodPageChange" />
      </div>
    </section>
  </div>
</template>

<style scoped>
#homePage {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 48px;
}

.hero-section {
  text-align: center;
  padding: 48px 0 32px;
  background: linear-gradient(180deg, #fff 0%, rgba(224, 247, 250, 0.5) 100%);
  border-radius: 16px;
  margin-bottom: 48px;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #1a1a1a;
}

.hero-subtitle {
  font-size: 16px;
  color: #888;
  margin: 0 0 32px;
}

.prompt-box {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  padding: 16px 20px 12px;
  text-align: left;
}

.prompt-input {
  font-size: 15px;
  resize: none;
}

.prompt-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.prompt-actions-left {
  display: flex;
  gap: 4px;
}

.send-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  padding: 0;
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.send-btn:hover {
  background: #333 !important;
  border-color: #333 !important;
}

.send-btn :deep(.anticon) {
  font-size: 16px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding: 0 16px;
}

.quick-prompt-btn {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #e8e8e8;
  font-size: 13px;
}

.apps-section {
  margin-bottom: 48px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 24px;
  color: #1a1a1a;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
