export interface ContentSegment {
  type: 'text' | 'code'
  content: string
  language?: string
}

const LANG_MAP: Record<string, string> = {
  html: 'html',
  htm: 'html',
  css: 'css',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  json: 'json',
}

function normalizeLang(lang?: string): string {
  if (!lang) {
    return 'html'
  }
  return LANG_MAP[lang.toLowerCase()] || lang.toLowerCase()
}

/** 从 HTML 中拆出 style、script，各自独立成框 */
function splitHtmlCode(html: string): ContentSegment[] {
  const result: ContentSegment[] = []
  let htmlBody = html

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  htmlBody = htmlBody.replace(styleRegex, (_, css: string) => {
    const trimmed = css.trim()
    if (trimmed) {
      result.push({ type: 'code', language: 'css', content: trimmed })
    }
    return ''
  })

  const scriptRegex = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi
  htmlBody = htmlBody.replace(scriptRegex, (_, js: string) => {
    const trimmed = js.trim()
    if (trimmed) {
      result.push({ type: 'code', language: 'javascript', content: trimmed })
    }
    return ''
  })

  const trimmedHtml = htmlBody.trim()
  if (trimmedHtml) {
    result.unshift({ type: 'code', language: 'html', content: trimmedHtml })
  }

  return result.length > 0 ? result : [{ type: 'code', language: 'html', content: html }]
}

/** 展开 code 片段：html 内联样式/脚本拆成独立框 */
function expandCodeSegments(segments: ContentSegment[]): ContentSegment[] {
  const expanded: ContentSegment[] = []

  for (const seg of segments) {
    if (seg.type !== 'code') {
      expanded.push(seg)
      continue
    }

    const lang = normalizeLang(seg.language)
    if (lang === 'html' && /<style|<script/i.test(seg.content)) {
      expanded.push(...splitHtmlCode(seg.content))
    } else {
      expanded.push({ ...seg, language: lang })
    }
  }

  return expanded
}

/** 从 AI 回复中拆分普通文本与代码块 */
export function parseMessageSegments(content: string): ContentSegment[] {
  if (!content) {
    return []
  }

  const segments: ContentSegment[] = []
  const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fenceRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      pushTextSegment(segments, content.slice(lastIndex, match.index))
    }
    segments.push({
      type: 'code',
      language: normalizeLang(match[1]),
      content: match[2].trim(),
    })
    lastIndex = fenceRegex.lastIndex
  }

  if (lastIndex < content.length) {
    pushTextSegment(segments, content.slice(lastIndex))
  }

  const base = segments.length > 0 ? segments : [{ type: 'text' as const, content }]
  return expandCodeSegments(base)
}

function pushTextSegment(segments: ContentSegment[], text: string) {
  const trimmed = text.trim()
  if (!trimmed) {
    return
  }

  const htmlStart = trimmed.search(/<!DOCTYPE|<html/i)
  if (htmlStart >= 0) {
    if (htmlStart > 0) {
      segments.push({ type: 'text', content: trimmed.slice(0, htmlStart).trim() })
    }
    const htmlContent = trimmed.slice(htmlStart).trim()
    segments.push(...splitHtmlCode(htmlContent))
    return
  }

  segments.push({ type: 'text', content: trimmed })
}

/** 代码块标题展示名 */
export function getCodeLangLabel(language?: string): string {
  const map: Record<string, string> = {
    html: 'HTML',
    css: 'CSS',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    json: 'JSON',
  }
  return map[normalizeLang(language)] || (language?.toUpperCase() ?? 'CODE')
}
