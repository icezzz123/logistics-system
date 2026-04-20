<template>
  <div class="shell-layout">
    <aside class="shell-layout__sidebar">
      <div class="brand-block">
        <p class="eyebrow">Operations Hub</p>
        <h1>Logistics OS</h1>
        <span>跨境物流后台</span>
      </div>

      <nav class="nav-stack">
        <template v-for="item in navItems" :key="item.path">
          <RouterLink v-if="!isNavItemDisabled(item)" :to="item.path" class="nav-link">
            <component :is="item.icon" class="nav-link__icon" />
            <span>{{ item.label }}</span>
          </RouterLink>
          <div v-else class="nav-link nav-link--disabled" :title="`${item.label} 暂不开放给当前角色`">
            <component :is="item.icon" class="nav-link__icon" />
            <span>{{ item.label }}</span>
          </div>
        </template>
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
  { path: '/', label: '总览', icon: Histogram },
  { path: '/users', label: '用户管理', icon: User, access: { allowedRoles: [7] } },
  { path: '/orders', label: '订单管理', icon: Document, access: { requiredPermissions: ['order:view'] } },
  { path: '/stations', label: '站点库存', icon: Location, access: { requiredPermissions: ['station:view'] } },
  { path: '/sorting', label: '分拣管理', icon: Goods, access: { requiredPermissions: ['sorting:view'] } },
  { path: '/transport', label: '运输管理', icon: Ship, access: { requiredPermissions: ['transport:view'] } },
  { path: '/tracking', label: '物流追踪', icon: Connection, access: { requiredPermissions: ['tracking:view'] } },
  { path: '/exceptions', label: '异常管理', icon: Warning, access: { requiredPermissions: ['exception:view'] } },
  { path: '/dispatch', label: '运输调度', icon: Opportunity, access: { allowedRoles: [6, 7] } },
  { path: '/profile', label: '个人中心', icon: Setting },
])

function isNavItemDisabled(item: NavItem) {
  return !hasAccess(item.access, authStore.user?.role, authStore.permissions)
}

function onLogout() {
  authStore.clearSession()
  router.replace('/login')
}
</script>
