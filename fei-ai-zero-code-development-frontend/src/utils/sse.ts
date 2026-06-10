import { API_BASE_URL } from '@/config/env'

export interface SSEHandlers {
  onMessage: (data: string) => void
  onDone?: () => void
  onError?: (error: Error) => void
}

/** 解析后端 SSE data 字段：格式为 {"d":"内容片段"} */
function parseSSEData(raw: string): string | null {
  if (!raw || raw === '[DONE]') {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as { d?: string }
    if (typeof parsed.d === 'string') {
      return parsed.d
    }
  } catch {
    // 非 JSON 时原样返回
  }
  return raw
}

function parseSSEEventBlock(block: string): { event?: string; data?: string } {
  let event: string | undefined
  let data: string | undefined
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      data = line.slice(5).trim()
    }
  }
  return { event, data }
}

function handleSSEBlock(block: string, onMessage: (data: string) => void) {
  const { event, data } = parseSSEEventBlock(block)
  if (event === 'done' || !data) {
    return
  }
  const content = parseSSEData(data)
  if (content) {
    onMessage(content)
  }
}

/**
 * 通过 SSE 调用代码生成对话接口
 */
export async function chatToGenCodeSSE(
  appId: number | string,
  message: string,
  handlers: SSEHandlers,
): Promise<void> {
  const { onMessage, onDone, onError } = handlers
  const url = `${API_BASE_URL}/app/chat/gen/code?appId=${appId}&message=${encodeURIComponent(message)}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })

    const contentType = response.headers.get('content-type') ?? ''

    // 后端异常时返回 JSON 而非 SSE 流
    if (!contentType.includes('text/event-stream')) {
      const text = await response.text()
      let errMsg = `请求失败 (${response.status})`
      try {
        const json = JSON.parse(text) as { message?: string; code?: number }
        if (json.message) {
          errMsg = json.message
        }
      } catch {
        if (text) {
          errMsg = text
        }
      }
      onError?.(new Error(errMsg))
      return
    }

    if (!response.ok) {
      onError?.(new Error(`请求失败: ${response.status}`))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError?.(new Error('无法读取响应流'))
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const eventBlock of events) {
        if (eventBlock.trim()) {
          handleSSEBlock(eventBlock, onMessage)
        }
      }
    }

    if (buffer.trim()) {
      handleSSEBlock(buffer, onMessage)
    }

    onDone?.()
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('网络异常，请确认后端已启动'))
  }
}
