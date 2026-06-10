<template>
  <AuthFormLayout
    title="飞哥 AI 应用生成 - 用户注册"
    tip-text="已有账号"
    tip-link="/user/login"
    tip-link-text="去登录"
  >
    <a-form :model="formState" name="basic" autocomplete="off" @finish="handleSubmit">
      <a-form-item name="userAccount" :rules="[{ required: true, message: '请输入账号！' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" />
      </a-form-item>

      <a-form-item
        name="userPassword"
        :rules="[
          { required: true, message: '请输入密码！' },
          { min: 8, message: '密码长度不能小于8位！' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" />
      </a-form-item>

      <a-form-item
        name="checkPassword"
        :rules="[
          { required: true, message: '请再次输入密码！' },
          { min: 8, message: '密码长度不能小于8位！' },
          { validator: validateConfirmPassword },
        ]"
      >
        <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" />
      </a-form-item>

      <a-form-item>
        <a-button type="primary" html-type="submit" style="width: 100%"> 注册 </a-button>
      </a-form-item>
    </a-form>
  </AuthFormLayout>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { userRegister } from '@/api/userController.ts'
import AuthFormLayout from '@/components/AuthFormLayout.vue'

const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const router = useRouter()

const validateConfirmPassword = async (_rule: any, value: string) => {
  if (!value) {
    return Promise.reject('请再次输入密码！')
  }
  if (value !== formState.userPassword) {
    return Promise.reject('两次输入的密码不一致！')
  }
  return Promise.resolve()
}

const handleSubmit = async (values: any) => {
  const res = await userRegister(values)
  if (res.data.code === 0 && res.data.data) {
    message.success('注册成功，请登录')
    router.push({
      path: '/user/login',
      replace: true,
    })
  } else {
    message.error('注册失败' + res.data.message)
  }
}
</script>