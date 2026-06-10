<template>
  <a-layout class="basic-layout">
    <!-- 顶部导航栏 -->
    <GlobalHeader />

    <!-- 主要内容区域 -->
    <a-layout-content :class="isNoPadding ? 'main-content-no-padding' : 'main-content'">
      <router-view />
    </a-layout-content>

    <!-- 底部版权信息 -->
    <GlobalFooter v-if="!isNoPadding" />
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'

const route = useRoute()
const isNoPadding = computed(() => route.meta.noPadding === true)
</script>

<style scoped>
.basic-layout {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #eef9fb 45%, #dff3f7 100%);
}

.main-content {
  padding: 24px;
  background: transparent;
  margin: 0 auto 56px;
  max-width: 1200px;
}

.main-content-no-padding {
  padding: 0;
  background: transparent;
  height: calc(100vh - 64px);
  overflow: hidden;
}
</style>
