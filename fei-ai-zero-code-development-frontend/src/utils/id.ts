/** 将雪花 ID 等统一转为字符串，避免 Number 精度丢失 */
export function toIdString(id: string | number | undefined | null): string {
  if (id === undefined || id === null || id === '') {
    return ''
  }
  return String(id)
}
