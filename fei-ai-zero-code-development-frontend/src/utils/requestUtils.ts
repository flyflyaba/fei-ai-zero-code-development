/**
 * 从 Axios 错误对象中提取可读的错误消息
 */
export function getErrorMessage(error: unknown, defaultMsg = '网络异常'): string {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || defaultMsg
}