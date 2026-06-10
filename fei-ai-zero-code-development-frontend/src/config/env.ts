/**
 * 环境变量统一配置
 *
 * 所有环境相关参数在此集中管理，通过 .env.development / .env.production 切换。
 * 新增环境变量时：
 *   1. 在 .env.development 和 .env.production 中以 VITE_ 前缀声明
 *   2. 在本文件中添加对应的导出项
 */
export const envConfig = {
  /** API 请求基础路径 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL as string,

  /** 静态资源访问基础 URL */
  staticBaseUrl: import.meta.env.VITE_STATIC_BASE_URL as string,

  /** 应用标题 */
  appTitle: import.meta.env.VITE_APP_TITLE as string,

  /** 当前模式 */
  mode: import.meta.env.MODE as string,

  /** 是否为开发环境 */
  isDev: import.meta.env.DEV as boolean,

  /** 是否为生产环境 */
  isProd: import.meta.env.PROD as boolean,
} as const