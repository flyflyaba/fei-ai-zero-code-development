<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowUpOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PaperClipOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import { deleteApp, deployApp, getAppVoById } from '@/api/appController.ts'
import { listAppChatHistory } from '@/api/chatHistoryController.ts'
import { chatToGenCodeSSE } from '@/utils/sse.ts'
import { getAppPreviewUrl } from '@/utils/appUtils.ts'
import logoImg from '@/assets/logo.png'
import { toIdString } from '@/utils/id.ts'
import { getErrorMessage } from '@/utils/requestUtils.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import ChatMessageContent from '@/components/ChatMessageContent.vue'

interface ChatMessage {
  id?: number
  role: 'user' | 'ai'
  content: string
  createTime?: string
}

const HISTORY_PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const appId = computed(() => toIdString(route.params.id as string))
const appInfo = ref<API.AppVO>({})
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const generating = ref(false)
const deploying = ref(false)
const showPreview = ref(false)
const previewUrl = ref('')
const messagesRef = ref<HTMLElement>()
const autoSent = ref(false)
const historyLoading = ref(false)
const loadingMore = ref(false)
const hasMoreHistory = ref(false)
const totalHistoryCount = ref(0)
const deployModalVisible = ref(false)
const deployUrl = ref('')
const appDetailModalVisible = ref(false)
const deleting = ref(false)

const generatingStatus = ref('正在生成代码...')
const statusTexts = ['正在生成代码...', '正在构建页面结构...', '正在优化样式...', '即将完成...']
let statusTimer: ReturnType<typeof setInterval> | null = null

const startStatusCycle = () => {
  let idx = 0
  generatingStatus.value = statusTexts[0]
  statusTimer = setInterval(() => {
    idx = (idx + 1) % statusTexts.length
    generatingStatus.value = statusTexts[idx]
  }, 3000)
}

const stopStatusCycle = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

const loginUser = computed(() => loginUserStore.loginUser)

const isOwner = computed(() => {
  if (!loginUser.value.id || !appInfo.value.user?.id) return false
  return loginUser.value.id === appInfo.value.user.id
})

const canViewHistory = computed(() => {
  if (!loginUser.value.id) return false
  if (loginUser.value.userRole === 'admin') return true
  return isOwner.value
})

const showAiThinking = computed(() => {
  if (!generating.value) {
    return false
  }
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'ai' && !last.content.trim()
})

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const convertHistoryToMessage = (record: API.ChatHistory): ChatMessage => ({
  id: record.id,
  role: record.messageType === 'user' ? 'user' : 'ai',
  content: record.message ?? '',
  createTime: record.createTime,
})

const sortMessagesAsc = (msgs: ChatMessage[]) =>
  [...msgs].sort((a, b) => {
    if (!a.createTime || !b.createTime) return 0
    return new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
  })

const shouldShowPreviewOnLoad = () => {
  if (!previewUrl.value) return false
  if (appInfo.value.codeGenType) return true
  return canViewHistory.value && totalHistoryCount.value >= 2
}

const loadChatHistory = async (loadMore = false) => {
  if (!appId.value) return

  if (loadMore) {
    loadingMore.value = true
  } else {
    historyLoading.value = true
  }

  try {
    const oldestCreateTime =
      loadMore && messages.value.length > 0 ? messages.value[0].createTime : undefined

    const res = await listAppChatHistory({
      appId: appId.value as unknown as number,
      pageSize: HISTORY_PAGE_SIZE,
      lastCreateTime: oldestCreateTime,
    })

    if (res.data.code === 0 && res.data.data) {
      const records = res.data.data.records ?? []
      totalHistoryCount.value = res.data.data.totalRow ?? 0
      const sortedBatch = sortMessagesAsc(records.map(convertHistoryToMessage))

      if (loadMore) {
        const el = messagesRef.value
        const prevScrollHeight = el?.scrollHeight ?? 0
        const existingIds = new Set(messages.value.map((m) => m.id))
        const toPrepend = sortedBatch.filter((m) => !m.id || !existingIds.has(m.id))
        messages.value = [...toPrepend, ...messages.value]
        await nextTick()
        if (el) {
          el.scrollTop = el.scrollHeight - prevScrollHeight
        }
      } else {
        messages.value = sortedBatch
        await scrollToBottom()
      }

      hasMoreHistory.value = messages.value.length < totalHistoryCount.value
    }
  } catch (error: unknown) {
    if (!loadMore) {
      messages.value = []
    }
    message.error('加载对话历史失败：' + getErrorMessage(error))
  } finally {
    historyLoading.value = false
    loadingMore.value = false
  }
}

const loadAppInfo = async () => {
  if (!appId.value) {
    message.error('应用 ID 无效')
    router.push('/')
    return
  }
  try {
    const res = await getAppVoById({ id: appId.value })
    if (res.data.code === 0 && res.data.data) {
      appInfo.value = res.data.data
      previewUrl.value = getAppPreviewUrl(res.data.data)
    } else {
      message.error('获取应用信息失败：' + (res.data.message || '未知错误'))
      router.push('/')
    }
  } catch (error: unknown) {
    message.error('获取应用信息失败：' + getErrorMessage(error))
    router.push('/')
  }
}

const sendMessage = async (text: string) => {
  const msg = text.trim()
  if (!msg || generating.value) {
    return
  }

  messages.value.push({ role: 'user', content: msg })
  messages.value.push({ role: 'ai', content: '' })
  inputMessage.value = ''
  generating.value = true
  showPreview.value = false
  startStatusCycle()
  await scrollToBottom()

  const aiIndex = messages.value.length - 1

  await chatToGenCodeSSE(appId.value, msg, {
    onMessage: (data) => {
      messages.value[aiIndex].content += data
      scrollToBottom()
    },
    onDone: async () => {
      generating.value = false
      stopStatusCycle()
      showPreview.value = true
      await loadAppInfo()
      scrollToBottom()
    },
    onError: (error) => {
      generating.value = false
      stopStatusCycle()
      message.error('生成失败：' + error.message)
    },
  })
}

const handleSend = () => {
  sendMessage(inputMessage.value)
}

const handleDeploy = async () => {
  deploying.value = true
  try {
    const res = await deployApp({ appId: appId.value })
    if (res.data.code === 0 && res.data.data) {
      deployUrl.value = res.data.data
      deployModalVisible.value = true
    } else {
      message.error('部署失败，' + res.data.message)
    }
  } catch (error: unknown) {
    message.error('部署失败：' + getErrorMessage(error))
  } finally {
    deploying.value = false
  }
}

const goAppDetail = () => {
  appDetailModalVisible.value = true
}

const goEditPage = () => {
  router.push(`/app/edit/${appId.value}`)
}

const handleDeleteApp = async () => {
  deleting.value = true
  try {
    const id = Number(appId.value)
    if (isNaN(id)) {
      message.error('应用 ID 无效')
      return
    }
    const res = await deleteApp({ id })
    if (res.data.code === 0) {
      message.success('删除成功')
      appDetailModalVisible.value = false
      router.push('/')
    } else {
      message.error('删除失败，' + res.data.message)
    }
  } catch (error: unknown) {
    message.error('删除失败：' + getErrorMessage(error))
  } finally {
    deleting.value = false
  }
}

const openDeployUrl = () => {
  window.open(deployUrl.value, '_blank')
}

onBeforeUnmount(() => {
  stopStatusCycle()
})

onMounted(async () => {
  await loginUserStore.fetchLoginUser()
  await loadAppInfo()
  if (canViewHistory.value) {
    await loadChatHistory()
  }

  if (isOwner.value && !messages.value.length && appInfo.value.initPrompt && !autoSent.value) {
    autoSent.value = true
    await sendMessage(appInfo.value.initPrompt)
  } else if (shouldShowPreviewOnLoad()) {
    showPreview.value = true
  }
})
</script>

<template>
  <div id="appChatPage">
    <div class="chat-main">
      <!-- 左侧对话区 -->
      <div class="chat-panel">
        <div class="chat-header">
          <span class="chat-app-name">{{ appInfo.appName || '未命名应用' }}</span>
        </div>
        <div ref="messagesRef" class="messages-area">
          <div v-if="hasMoreHistory" class="load-more-wrap">
            <a-button type="link" :loading="loadingMore" @click="loadChatHistory(true)">
              加载更多
            </a-button>
          </div>
          <div v-if="historyLoading" class="history-loading">
            <a-spin size="small" />
            <span>加载对话历史中...</span>
          </div>
          <template v-for="(msg, index) in messages" :key="msg.id ?? `msg-${index}`">
            <!-- 用户消息 -->
            <div v-if="msg.role === 'user'" class="message-row message-user">
              <div class="message-bubble user-bubble">
                <p class="user-text">{{ msg.content }}</p>
              </div>
              <a-avatar class="user-avatar" :size="36" :src="loginUser.userAvatar">
                {{ (loginUser.userName ?? '我').charAt(0) }}
              </a-avatar>
            </div>

            <!-- AI 消息 -->
            <div v-else class="message-row message-ai">
              <div class="ai-avatar-wrap">
                <img class="ai-avatar" :src="logoImg" alt="AI" />
              </div>
              <div class="message-bubble ai-bubble">
                <ChatMessageContent v-if="msg.content.trim()" :content="msg.content" />
                <span v-else-if="generating && index === messages.length - 1" class="typing-cursor"
                  >|</span
                >
              </div>
            </div>
          </template>

          <!-- AI 正在思考 -->
          <div v-if="showAiThinking" class="message-row message-ai ai-thinking-row">
            <div class="ai-avatar-wrap">
              <img class="ai-avatar" :src="logoImg" alt="AI" />
            </div>
            <div class="ai-thinking">
              <span class="thinking-label">AI 正在思考</span>
              <span class="thinking-dots"> <span /><span /><span /> </span>
            </div>
          </div>

          <div v-if="!historyLoading && !messages.length" class="empty-chat">
            开始对话，描述你想要的网站或应用
          </div>
          <div class="scroll-anchor" />
        </div>

        <!-- 输入框 -->
        <div v-if="!isOwner" class="view-mode-notice">当前为只读模式，无法发送消息</div>
        <div v-else class="input-area">
          <a-textarea
            v-model:value="inputMessage"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            placeholder="描述越详细，页面越具体，可以一步一步完善生成效果"
            :bordered="false"
            :disabled="generating"
            @keydown.enter.ctrl="handleSend"
          />
          <div class="input-actions">
            <div class="input-actions-left">
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
              :loading="generating"
              class="send-btn"
              @click="handleSend"
            >
              <ArrowUpOutlined />
            </a-button>
          </div>
        </div>
      </div>

      <!-- 右侧预览区 -->
      <div class="preview-panel">
        <div class="preview-toolbar">
          <h3 class="preview-title">生成后的网页展示</h3>
          <a-space :size="8">
            <a-button v-if="isOwner" @click="goAppDetail">
              <InfoCircleOutlined />
              应用详情
            </a-button>
            <a-button v-if="isOwner" type="primary" :loading="deploying" @click="handleDeploy">
              <CloudUploadOutlined />
              部署
            </a-button>
          </a-space>
        </div>
        <div class="preview-body">
          <div v-if="showPreview && previewUrl" class="preview-content">
            <iframe :src="previewUrl" class="preview-iframe" title="应用预览" />
          </div>
          <div v-else-if="generating" class="preview-generating">
            <div class="generating-ring">
              <div class="ring-outer" />
              <div class="ring-inner" />
              <div class="ring-core" />
            </div>
            <p class="generating-text">{{ generatingStatus }}</p>
            <p class="generating-sub">AI 正在为你生成页面，请稍候...</p>
          </div>
          <div v-else class="preview-placeholder">
            <p>生成完成后将在此展示网页效果</p>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      v-model:open="deployModalVisible"
      title="部署成功"
      :footer="null"
      :mask-closable="true"
      centered
      width="480px"
    >
      <div class="deploy-success-content">
        <div class="deploy-success-icon">
          <CheckCircleOutlined />
        </div>
        <p class="deploy-success-text">您的网站已成功部署！</p>
        <div class="deploy-url-box">
          <span class="deploy-url-label">访问链接：</span>
          <a :href="deployUrl" target="_blank" class="deploy-url-link">{{ deployUrl }}</a>
        </div>
        <div class="deploy-success-actions">
          <a-button type="primary" size="large" @click="openDeployUrl"> 立即访问 </a-button>
          <a-button size="large" @click="deployModalVisible = false"> 关闭 </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="appDetailModalVisible"
      title="应用详情"
      :footer="null"
      :mask-closable="true"
      centered
      width="520px"
    >
      <div class="app-detail-content">
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="应用名称">
            {{ appInfo.appName || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建者">
            {{ appInfo.user?.userName || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ appInfo.createTime || '-' }}
          </a-descriptions-item>
        </a-descriptions>
        <div class="app-detail-actions">
          <a-button type="primary" @click="goEditPage">
            <EditOutlined />
            修改
          </a-button>
          <a-popconfirm
            title="确定要删除该应用吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDeleteApp"
          >
            <a-button danger :loading="deleting">
              <DeleteOutlined />
              删除
            </a-button>
          </a-popconfirm>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
#appChatPage {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.chat-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.view-mode-notice {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.chat-panel {
  width: 440px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  background: #fff;
  border-right: 1px solid #f0f0f0;
}

.chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  flex-shrink: 0;
}

.chat-app-name {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.load-more-wrap {
  text-align: center;
  margin-bottom: 12px;
}

.history-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #999;
  font-size: 13px;
  padding: 8px 0 16px;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}

.message-user {
  flex-direction: row;
  justify-content: flex-end;
}

.message-ai {
  flex-direction: row;
}

.user-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 12px 12px 4px 12px;
  background: #1677ff;
  color: #fff;
}

.user-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
}

.user-avatar {
  flex-shrink: 0;
  background: #1677ff;
}

.ai-avatar-wrap {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  background: #fff;
}

.ai-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ai-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 4px 12px 12px 12px;
  background: #f5f5f5;
}

.typing-cursor {
  animation: blink 1s infinite;
  color: #1677ff;
  font-weight: bold;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.ai-thinking-row {
  align-items: center;
}

.ai-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
}

.thinking-label {
  font-weight: 500;
}

.thinking-dots span {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin: 0 2px;
  border-radius: 50%;
  background: #1677ff;
  animation: dotBounce 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) {
  animation-delay: -0.32s;
}
.thinking-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes dotBounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.empty-chat {
  text-align: center;
  color: #999;
  padding: 48px 16px;
}

.scroll-anchor {
  height: 1px;
}

.input-area {
  border-top: 1px solid #f0f0f0;
  padding: 12px 16px;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.input-actions-left {
  display: flex;
  gap: 4px;
}

.send-btn {
  width: 36px;
  height: 36px;
  background: #1a1a1a;
  border-color: #1a1a1a;
}

/* 右侧预览区 */
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  background: #fafafa;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.preview-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 32px;
}

.preview-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
}

.preview-content {
  width: 100%;
  height: 100%;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.preview-placeholder {
  text-align: center;
  color: #999;
  font-size: 15px;
}

/* 生成中动画 */
.preview-generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.generating-ring {
  position: relative;
  width: 80px;
  height: 80px;
}

.ring-outer {
  position: absolute;
  inset: 0;
  border: 3px solid #e8e8e8;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.ring-inner {
  position: absolute;
  inset: 8px;
  border: 3px solid #e8e8e8;
  border-bottom-color: #52c41a;
  border-radius: 50%;
  animation: spin 1.5s linear infinite reverse;
}

.ring-core {
  position: absolute;
  inset: 20px;
  background: linear-gradient(135deg, #1677ff, #52c41a);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.generating-text {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  animation: fadeSwitch 3s ease-in-out infinite;
}

.generating-sub {
  margin: 0;
  font-size: 13px;
  color: #999;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@keyframes fadeSwitch {
  0%,
  100% {
    opacity: 1;
  }
  45% {
    opacity: 0.6;
  }
  55% {
    opacity: 0.6;
  }
}

.deploy-success-content {
  text-align: center;
  padding: 16px 0;
}

.deploy-success-icon {
  font-size: 56px;
  color: #52c41a;
  margin-bottom: 16px;
}

.deploy-success-text {
  font-size: 16px;
  color: #333;
  margin: 0 0 20px;
}

.deploy-url-box {
  background: #f6f8fa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
  word-break: break-all;
}

.deploy-url-label {
  font-size: 13px;
  color: #888;
  display: block;
  margin-bottom: 4px;
}

.deploy-url-link {
  font-size: 14px;
  color: #1677ff;
  text-decoration: none;
}

.deploy-url-link:hover {
  text-decoration: underline;
}

.deploy-success-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.app-detail-content {
  padding: 8px 0;
}

.app-detail-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
</style>
