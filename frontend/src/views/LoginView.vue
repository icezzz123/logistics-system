<template>
  <section class="login-view">
    <div class="login-view__art">
      <p class="eyebrow">Cross-Border Workflow</p>
      <h1>跨境物流作业系统</h1>
      <p class="summary">
        当前前端骨架已接入鉴权、路由与全局状态。登录后可进入统一后台框架，后续逐模块接入真实业务页面。
      </p>
      <div class="login-view__signal-grid">
        <article>
          <span>用户与权限</span>
          <strong>JWT + RBAC</strong>
        </article>
        <article>
          <span>作业流转</span>
          <strong>订单 / 仓储 / 分拣 / 运输</strong>
        </article>
        <article>
          <span>监控能力</span>
          <strong>追踪 / 异常 / 调度</strong>
        </article>
      </div>
    </div>

    <div class="login-view__panel">
      <div class="login-card">
        <div>
          <p class="eyebrow">Sign In</p>
          <h2>登录后台</h2>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" size="large" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              size="large"
              show-password
              placeholder="请输入密码"
              @keyup.enter="onSubmit"
            />
          </el-form-item>
          <el-button :loading="submitting" class="login-card__button" size="large" type="primary" @click="onSubmit">
            进入系统
          </el-button>
        </el-form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules<typeof form> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function onSubmit() {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    await authStore.login(form)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  } finally {
    submitting.value = false
  }
}
</script>
