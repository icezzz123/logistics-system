<template>
  <div class="shell-layout">
    <aside class="shell-layout__sidebar">
      <div class="brand-block">
        <p class="eyebrow">Operations Hub</p>
        <h1>Logistics OS</h1>
        <span>跨境物流后台</span>
      </div>

      <nav class="nav-stack">
        <RouterLink v-for="item in visibleNavItems" :key="item.path" :to="item.path" class="nav-link">
          <component :is="item.icon" class="nav-link__icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="shell-layout__main">
      <header class="shell-header card-panel">
        <div>
          <p class="eyebrow">Back Office</p>
          <h2>欢迎，{{ authStore.displayName }}</h2>
        </div>
        <div class="shell-header__actions">
          <el-tag type="success" effect="dark">已登录</el-tag>
          <el-button plain @click="onLogout">退出</el-button>
        </div>
      </header>

      <main class="shell-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Connection,
  Document,
  Goods,
  Histogram,
  Location,
  Opportunity,
  Setting,
  Ship,
  User,
  Warning,
} from '@element-plus/icons-vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { hasAccess, type AccessRule } from '@/utils/access'

const router = useRouter()
const authStore = useAuthStore()

type NavItem = {
  path: string
  label: string
  icon: typeof Histogram
  access?: AccessRule
}

const navItems = computed<NavItem[]>(() => [
  { path: '/', label: '总览', icon: Histogram, access: { allowedRoles: [2, 3, 4, 5, 6, 7] } },
  { path: '/customer', label: '客户门户', icon: User, access: { allowedRoles: [1, 7] } },
  { path: '/courier', label: '快递员工作台', icon: Goods, access: { allowedRoles: [2, 5, 6, 7], requiredPermissions: ['pickup:view', 'delivery:view'] } },
  { path: '/users', label: '用户管理', icon: User, access: { allowedRoles: [7] } },
  { path: '/orders', label: '订单管理', icon: Document, access: { allowedRoles: [3, 4, 5, 6, 7], requiredPermissions: ['order:view'] } },
  { path: '/stations', label: '站点库存', icon: Location, access: { allowedRoles: [5, 6, 7], requiredPermissions: ['station:view'] } },
  { path: '/sorting', label: '分拣管理', icon: Goods, access: { allowedRoles: [3, 5, 6, 7], requiredPermissions: ['sorting:view'] } },
  { path: '/transport', label: '运输管理', icon: Ship, access: { allowedRoles: [4, 6, 7], requiredPermissions: ['transport:view'] } },
  { path: '/tracking', label: '物流追踪', icon: Connection, access: { allowedRoles: [2, 3, 4, 5, 6, 7], requiredPermissions: ['tracking:view'] } },
  { path: '/exceptions', label: '异常管理', icon: Warning, access: { allowedRoles: [2, 5, 6, 7], requiredPermissions: ['exception:view'] } },
  { path: '/dispatch', label: '运输调度', icon: Opportunity, access: { allowedRoles: [6, 7] } },
  { path: '/profile', label: '个人中心', icon: Setting },
])

const visibleNavItems = computed(() => navItems.value.filter((item) => hasAccess(item.access, authStore.user?.role, authStore.permissions)))

function onLogout() {
  authStore.clearSession()
  router.replace('/login')
}
</script>
