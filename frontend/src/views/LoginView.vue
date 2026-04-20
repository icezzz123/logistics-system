<template>
  <section class="login-view">
    <div class="login-view__art">
      <p class="eyebrow">Cross-Border Workflow</p>
      <h1>跨境物流作业系统</h1>
      <p class="summary">
        系统围绕订单、站点、分拣、运输、追踪与异常处理构建统一作业链路，支持客户自助下单、物流追踪查询以及异常反馈闭环。
      </p>
      <div class="login-view__signal-grid">
        <article>
          <span>用户与权限</span>
          <strong>JWT + RBAC</strong>
        </article>
        <article>
          <span>业务主链</span>
          <strong>订单 / 分拣 / 运输 / 追踪</strong>
        </article>
        <article>
          <span>服务能力</span>
          <strong>地址簿 / 预警 / 异常闭环</strong>
        </article>
      </div>
    </div>

    <div class="login-view__panel">
      <div class="login-card">
        <div class="login-card__switch">
          <button
            type="button"
            class="login-card__switch-item"
            :class="{ 'is-active': activeMode === 'login' }"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            type="button"
            class="login-card__switch-item"
            :class="{ 'is-active': activeMode === 'register' }"
            @click="switchMode('register')"
          >
            注册
          </button>
        </div>

        <div v-if="activeMode === 'login'">
          <p class="eyebrow">Sign In</p>
          <h2>登录系统</h2>
          <p class="login-card__helper">请输入账号和密码，进入对应角色的工作台。</p>

          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-position="top" @submit.prevent>
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" size="large" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                size="large"
                show-password
                placeholder="请输入密码"
                @keyup.enter="submitLogin"
              />
            </el-form-item>
            <el-button :loading="loginSubmitting" class="login-card__button" size="large" type="primary" @click="submitLogin">
              进入系统
            </el-button>
          </el-form>
        </div>

        <div v-else>
          <p class="eyebrow">Register</p>
          <h2>注册客户账号</h2>
          <p class="login-card__helper">注册成功后即可在客户门户下单、查询订单、查看追踪并提交异常反馈。</p>

          <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-position="top" @submit.prevent>
            <div class="login-card__grid">
              <el-form-item label="用户名" prop="username">
                <el-input v-model="registerForm.username" size="large" placeholder="3-50位，仅支持字母数字下划线" />
              </el-form-item>
              <el-form-item label="真实姓名" prop="real_name">
                <el-input v-model="registerForm.real_name" size="large" placeholder="可选，建议填写真实姓名" />
              </el-form-item>
              <el-form-item label="手机号" prop="phone">
                <el-input v-model="registerForm.phone" size="large" placeholder="请输入手机号" />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="registerForm.email" size="large" placeholder="请输入邮箱" />
              </el-form-item>
              <el-form-item label="密码" prop="password">
                <el-input v-model="registerForm.password" type="password" size="large" show-password placeholder="至少6位密码" />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirm_password">
                <el-input
                  v-model="registerForm.confirm_password"
                  type="password"
                  size="large"
                  show-password
                  placeholder="请再次输入密码"
                  @keyup.enter="submitRegister"
                />
              </el-form-item>
            </div>
            <el-button :loading="registerSubmitting" class="login-card__button" size="large" type="primary" @click="submitRegister">
              注册并返回登录
            </el-button>
          </el-form>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import { useAuthStore } from '@/stores/auth'
import http from '@/utils/http'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMode = ref<'login' | 'register'>('login')
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const loginSubmitting = ref(false)
const registerSubmitting = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  real_name: '',
  phone: '',
  email: '',
  password: '',
  confirm_password: '',
})

const loginRules: FormRules<typeof loginForm> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules: FormRules<typeof registerForm> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度需在 3-50 位之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名仅支持字母、数字和下划线', trigger: 'blur' },
  ],
  real_name: [{ max: 50, message: '真实姓名不能超过 50 个字符', trigger: 'blur' }],
  phone: [{ validator: validatePhone, trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度需在 6-50 位之间', trigger: 'blur' },
  ],
  confirm_password: [{ validator: validateConfirmPassword, trigger: 'blur' }],
}

function switchMode(mode: 'login' | 'register') {
  activeMode.value = mode
}

function validatePhone(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback()
    return
  }
  callback(/^1[3-9]\d{9}$/.test(value) ? undefined : new Error('手机号格式不正确'))
}

function validateConfirmPassword(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback(new Error('请再次输入密码'))
    return
  }
  callback(value === registerForm.password ? undefined : new Error('两次输入的密码不一致'))
}

async function submitLogin() {
  if (!loginFormRef.value) return
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loginSubmitting.value = true
  try {
    await authStore.login(loginForm)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  } finally {
    loginSubmitting.value = false
  }
}

async function submitRegister() {
  if (!registerFormRef.value) return
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return

  registerSubmitting.value = true
  try {
    await http.post('/auth/register', {
      username: registerForm.username.trim(),
      real_name: registerForm.real_name.trim(),
      phone: registerForm.phone.trim(),
      email: registerForm.email.trim(),
      password: registerForm.password,
    })
    ElMessage.success('注册成功，请使用新账号登录')
    loginForm.username = registerForm.username.trim()
    loginForm.password = ''
    registerForm.username = ''
    registerForm.real_name = ''
    registerForm.phone = ''
    registerForm.email = ''
    registerForm.password = ''
    registerForm.confirm_password = ''
    activeMode.value = 'login'
  } finally {
    registerSubmitting.value = false
  }
}
</script>
