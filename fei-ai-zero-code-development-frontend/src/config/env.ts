/**
 * 环境变量配置
 *
 * 所有环境相关参数在此集中管理，通过 .env.development / .env.production 切换。
 * 新增环境变量时：
 *   1. 在 .env.development 和 .env.production 中以 VITE_ 前缀声明
 *   2. 在本文件中添加对应的导出项
 */

// 应用部署域名
export const DEPLOY_DOMAIN = import.meta.env.VITE_DEPLOY_DOMAIN || 'http://localhost'

// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8123/api'

// 静态资源地址
export const STATIC_BASE_URL = `${API_BASE_URL}/static`

// 获取部署应用的完整 URL
export const getDeployUrl = (deployKey: string) => {
  return `${DEPLOY_DOMAIN}/${deployKey}`
}

// 获取静态资源预览 URL
export const getStaticPreviewUrl = (codeGenType: string, appId: string) => {
  return `${STATIC_BASE_URL}/${codeGenType}_${appId}/`
}
