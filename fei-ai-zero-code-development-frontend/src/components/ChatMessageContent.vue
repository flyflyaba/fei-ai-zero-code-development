<template>
  <div class="chat-message-content">
    <template v-for="(segment, idx) in segments" :key="idx">
      <p v-if="segment.type === 'text'" class="text-segment">{{ segment.content }}</p>
      <div v-else class="code-block">
        <div class="code-block-header">
          <span>{{ getCodeLangLabel(segment.language) }}</span>
        </div>
        <pre class="code-block-body"><code
          :class="'lang-' + (segment.language || 'html')"
          v-html="highlightCode(segment.content, segment.language)"
        /></pre>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import { getCodeLangLabel, parseMessageSegments } from '@/utils/parseMessage.ts'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('json', json)

const props = defineProps<{
  content: string
}>()

const segments = computed(() => parseMessageSegments(props.content))

const highlightCode = (code: string, language?: string) => {
  if (!code) {
    return ''
  }
  const lang = language?.toLowerCase() || 'html'
  if (hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value
  }
  return hljs.highlightAuto(code).value
}
</script>

<style scoped>
.chat-message-content {
  font-size: 14px;
  line-height: 1.6;
}

.text-segment {
  margin: 0 0 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-segment:last-child {
  margin-bottom: 0;
}

.code-block {
  margin: 8px 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
}

.code-block-header {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  background: #f0f0f0;
  border-bottom: 1px solid #e8e8e8;
}

.code-block:has(.lang-html) .code-block-header {
  color: #c2410c;
  background: #fff7ed;
}

.code-block:has(.lang-css) .code-block-header {
  color: #1d4ed8;
  background: #eff6ff;
}

.code-block:has(.lang-javascript) .code-block-header {
  color: #a16207;
  background: #fefce8;
}

.code-block-body {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  background: #fff;
}

.code-block-body code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}
</style>
