import { envConfig } from '@/config/env'

export { envConfig }

/** @deprecated 使用 envConfig.apiBaseUrl 替代 */
export const API_BASE = envConfig.apiBaseUrl
