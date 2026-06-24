import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { getDeployUrl, getStaticPreviewUrl } from '@/config/env'
import { toIdString } from '@/utils/id.ts'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** 获取应用静态预览地址（生成后的网站浏览地址） */
export function getAppPreviewUrl(app: API.AppVO): string {
  return getStaticPreviewUrl(app.codeGenType ?? '', toIdString(app.id))
}

/** 获取应用部署地址（localhost/{deployKey}） */
export function getAppDeployUrl(app: API.AppVO): string {
  if (!app.deployKey) {
    return ''
  }
  return getDeployUrl(app.deployKey)
}

/** 是否已部署作品（有 deployKey 即可查看作品） */
export function hasDeployWork(app: API.AppVO): boolean {
  return !!app.deployKey
}

/** 格式化相对创建时间 */
export function formatCreateTime(time?: string): string {
  if (!time) {
    return ''
  }
  return `创建于 ${dayjs(time).fromNow()}`
}

/** 根据 codeGenType 返回展示标签 */
export function getAppTypeTag(codeGenType?: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    html: { label: '网站', color: 'blue' },
    multi_file: { label: '工具', color: 'orange' },
    react: { label: '用户应用', color: 'purple' },
  }
  return map[codeGenType ?? ''] ?? { label: '应用', color: 'default' }
}
