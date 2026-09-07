import { API_BASE_URL } from '@/config/env'

export interface SSEHandlers {
  onMessage: (data: string) => void
  onDone?: () => void
  onError?: (error: Error) => void
  /** 处理 business-error 事件（后端限流等业务错误） */
  onBusinessError?: (errorData: { message?: string }) => void
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

/** 返回 true 表示收到 business-error 事件 */
function handleSSEBlock(
  block: string,
  onMessage: (data: string) => void,
  onBusinessError?: SSEHandlers['onBusinessError'],
): boolean {
  const { event, data } = parseSSEEventBlock(block)
  if (event === 'business-error') {
    let errorData: { message?: string } = {}
    if (data) {
      try {
        errorData = JSON.parse(data)
      } catch {
        // 解析失败时由调用方使用默认提示
      }
    }
    onBusinessError?.(errorData)
    return true
  }
  if (event === 'done' || !data) {
    return false
  }
  const content = parseSSEData(data)
  if (content) {
    onMessage(content)
  }
  return false
}

/**
 * 通过 SSE 调用代码生成对话接口
 */
export async function chatToGenCodeSSE(
  appId: number | string,
  message: string,
  handlers: SSEHandlers,
): Promise<void> {
  const { onMessage, onDone, onError, onBusinessError } = handlers
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
    let businessErrorOccurred = false

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
          if (handleSSEBlock(eventBlock, onMessage, onBusinessError)) {
            businessErrorOccurred = true
          }
        }
      }
    }

    if (buffer.trim() && handleSSEBlock(buffer, onMessage, onBusinessError)) {
      businessErrorOccurred = true
    }

    // 业务错误（如限流）后不触发 onDone，避免误走"生成完成"逻辑
    if (!businessErrorOccurred) {
      onDone?.()
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error('网络异常，请确认后端已启动'))
  }
}
