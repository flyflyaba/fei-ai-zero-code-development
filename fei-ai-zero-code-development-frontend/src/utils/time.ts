import dayjs from 'dayjs'

/** 格式化日期时间 */
export function formatTime(time?: string): string {
  if (!time) {
    return '-'
  }
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
