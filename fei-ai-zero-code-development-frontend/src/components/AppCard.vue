<template>
  <div class="app-card" @click="handleClick">
    <div class="app-card-cover">
      <img v-if="app.cover" :src="app.cover" :alt="app.appName" />
      <div v-else class="app-card-placeholder">
        <img class="placeholder-logo" :src="logoImg" alt="" />
      </div>
      <div class="app-card-overlay">
        <a-button type="primary" size="small" @click.stop="handleChat">查看对话</a-button>
        <a-button v-if="isDeployed" size="small" @click.stop="handlePreview">查看作品</a-button>
      </div>
    </div>
    <div class="app-card-body">
      <div class="app-card-title-row">
        <h3 class="app-card-title">{{ app.appName || '未命名应用' }}</h3>
        <a-tag v-if="showTag" :color="typeTag.color">{{ typeTag.label }}</a-tag>
      </div>
      <p v-if="showTime" class="app-card-time">{{ formatCreateTime(app.createTime) }}</p>
      <div v-if="showAuthor && app.user" class="app-card-author">
        <a-avatar :size="24" :src="app.user.userAvatar" />
        <span>{{ app.user.userName ?? '匿名用户' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatCreateTime, getAppPreviewUrl, getAppTypeTag } from '@/utils/appUtils.ts'
import { toIdString } from '@/utils/id.ts'
import logoImg from '@/assets/logo.png'

const router = useRouter()

const props = withDefaults(
  defineProps<{
    app: API.AppVO
    showTag?: boolean
    showTime?: boolean
    showAuthor?: boolean
    viewMode?: boolean
  }>(),
  {
    showTag: false,
    showTime: true,
    showAuthor: false,
    viewMode: false,
  },
)

const emit = defineEmits<{
  click: [app: API.AppVO]
}>()

const typeTag = computed(() => getAppTypeTag(props.app.codeGenType))

const isDeployed = computed(() => !!props.app.deployedTime)

const handleClick = () => {
  emit('click', props.app)
}

const handleChat = () => {
  const id = toIdString(props.app.id)
  if (id) {
    const query = props.viewMode ? { view: '1' } : {}
    router.push({ path: `/app/chat/${id}`, query })
  }
}

const handlePreview = () => {
  const url = getAppPreviewUrl(props.app)
  if (url) {
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.app-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
  border: 1px solid #f0f0f0;
}

.app-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.app-card-cover {
  aspect-ratio: 16 / 10;
  background: #f5f5f5;
  overflow: hidden;
  position: relative;
}

.app-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.placeholder-logo {
  width: 48px;
  height: 48px;
  opacity: 0.4;
}

.app-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.app-card:hover .app-card-overlay {
  opacity: 1;
}

.app-card-body {
  padding: 12px 16px 16px;
}

.app-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.app-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.app-card-time {
  margin: 8px 0 0;
  font-size: 13px;
  color: #999;
}

.app-card-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: #666;
}
</style>
