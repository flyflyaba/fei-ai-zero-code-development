<template>
  <div id="authFormPage">
    <h2 class="title">{{ title }}</h2>
    <div class="desc">不需要写一行代码，就能生成完整应用</div>
    <slot />
    <div class="tips">
      {{ tipText }}
      <RouterLink :to="tipLink">{{ tipLinkText }}</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  tipText: string
  tipLink: string
  tipLinkText: string
}>()
</script>

<style scoped>
#authFormPage {
  max-width: 480px;
  margin: 0 auto;
}

.title {
  text-align: center;
  margin-bottom: 16px;
}

.desc {
  text-align: center;
  color: #bbb;
  margin-bottom: 16px;
}

.tips {
  text-align: right;
  color: #bbb;
  font-size: 13px;
  margin-bottom: 16px;
}
</style>