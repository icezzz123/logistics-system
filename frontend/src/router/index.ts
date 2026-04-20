import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import ModuleView from '@/views/ModuleView.vue'
import OrderManagementView from '@/views/OrderManagementView.vue'
import SortingManagementView from '@/views/SortingManagementView.vue'
import DispatchManagementView from '@/views/DispatchManagementView.vue'
import ExceptionManagementView from '@/views/ExceptionManagementView.vue'
import ProfileCenterView from '@/views/ProfileCenterView.vue'
import StationInventoryView from '@/views/StationInventoryView.vue'
import TrackingManagementView from '@/views/TrackingManagementView.vue'
import TransportManagementView from '@/views/TransportManagementView.vue'
import UserManagementView from '@/views/UserManagementView.vue'
import CustomerPortalView from '@/views/CustomerPortalView.vue'
import CourierWorkbenchView from '@/views/CourierWorkbenchView.vue'
import { useAuthStore } from '@/stores/auth'
import { hasAccess, type AccessRule } from '@/utils/access'

const moduleRoute = (path: string, title: string, description: string, access?: AccessRule) => ({
  path,
  component: ModuleView,
  meta: { title, description, access },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true, title: '登录' },
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
          meta: { title: '总览', description: '查看当前系统模块与后端联调状态。', access: { allowedRoles: [2, 3, 4, 5, 6, 7] } },
        },
        {
          path: 'customer',
          name: 'customer-portal',
          component: CustomerPortalView,
          meta: { title: '客户门户', description: '查询我的订单、查看追踪并提交异常反馈。', access: { allowedRoles: [1, 7] } },
        },
        {
          path: 'courier',
          name: 'courier-workbench',
          component: CourierWorkbenchView,
          meta: { title: '快递员工作台', description: '处理揽收任务与派送任务，完成认领、作业、送达和签收闭环。', access: { allowedRoles: [2, 5, 6, 7], requiredPermissions: ['pickup:view', 'delivery:view'] } },
        },
        {
          path: 'users',
          name: 'users',
          component: UserManagementView,
          meta: { title: '用户管理', description: '查看账号列表、角色与状态，并执行基础管理操作。', access: { allowedRoles: [7] } },
        },
        {
          path: 'orders',
          name: 'orders',
          component: OrderManagementView,
          meta: { title: '订单管理', description: '查看订单列表、订单详情、状态流转与状态日志。', access: { allowedRoles: [3, 4, 5, 6, 7], requiredPermissions: ['order:view'] } },
        },
        {
          path: 'stations',
          name: 'stations',
          component: StationInventoryView,
          meta: { title: '站点库存', description: '查看站点台账、库存预警、盘点记录与站点流转。', access: { allowedRoles: [5, 6, 7], requiredPermissions: ['station:view'] } },
        },
        {
          path: 'sorting',
          name: 'sorting',
          component: SortingManagementView,
          meta: { title: '分拣管理', description: '查看分拣规则、分拣任务、分拣扫描与分拣记录。', access: { allowedRoles: [3, 5, 6, 7], requiredPermissions: ['sorting:view'] } },
        },
        {
          path: 'transport',
          name: 'transport',
          component: TransportManagementView,
          meta: { title: '运输管理', description: '查看车辆、运输任务、装卸记录、监控预警与运输成本。', access: { allowedRoles: [4, 6, 7], requiredPermissions: ['transport:view'] } },
        },
        {
          path: 'tracking',
          name: 'tracking',
          component: TrackingManagementView,
          meta: { title: '物流追踪', description: '查看追踪记录、订单历史、时间轴与时效预警。', access: { allowedRoles: [2, 3, 4, 5, 6, 7], requiredPermissions: ['tracking:view'] } },
        },
        {
          path: 'exceptions',
          name: 'exceptions',
          component: ExceptionManagementView,
          meta: { title: '异常管理', description: '查看异常列表、异常统计、创建异常和处理流转。', access: { allowedRoles: [2, 5, 6, 7], requiredPermissions: ['exception:view'] } },
        },
        {
          path: 'dispatch',
          name: 'dispatch',
          component: DispatchManagementView,
          meta: { title: '运输调度', description: '查看路径优化、调度建议、批次调度与运输计划。', access: { allowedRoles: [6, 7] } },
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfileCenterView,
          meta: { title: '个人中心', description: '查看个人资料、权限标签并维护个人信息与密码。' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    await authStore.bootstrap()

    if (!authStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { path: '/' }
  }

  if (to.meta.requiresAuth && to.path === '/' && authStore.user?.role === 1) {
    return { path: '/customer' }
  }

  if (to.meta.requiresAuth && to.path === '/' && authStore.user?.role === 2) {
    return { path: '/courier' }
  }

  if (to.meta.requiresAuth && !hasAccess(to.meta.access as AccessRule | undefined, authStore.user?.role, authStore.permissions)) {
    if (authStore.user?.role === 1) {
      return { path: '/customer' }
    }
    if (authStore.user?.role === 2) {
      return { path: '/courier' }
    }
    return { path: '/' }
  }

  if (to.meta.title) {
    document.title = `${String(to.meta.title)} | 跨境物流作业系统`
  }

  return true
})

export default router








