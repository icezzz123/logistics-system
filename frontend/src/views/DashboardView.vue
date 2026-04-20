<template>
  <section class="dashboard-view">
    <div class="dashboard-hero card-panel">
      <div>
        <p class="eyebrow">Operations Workbench</p>
        <h1>全链路业务工作台</h1>
        <p>
          从订单受理、站点承接、分拣、运输、追踪到异常闭环，把当前最值得处理的工作集中到一页。
        </p>
        <div class="dashboard-view__hero-meta">
          <span v-for="item in roleFocus" :key="item">{{ item }}</span>
        </div>
      </div>
      <div class="dashboard-hero__stats">
        <article>
          <span>订单总量</span>
          <strong>{{ orderStats.total_orders }}</strong>
        </article>
        <article>
          <span>运输执行中</span>
          <strong>{{ transportOverview.in_progress_tasks }}</strong>
        </article>
        <article>
          <span>追踪预警</span>
          <strong>{{ trackingWarningTotal }}</strong>
        </article>
        <article>
          <span>异常赔付</span>
          <strong>{{ formatMoney(exceptionStats.summary.total_compensation) }}</strong>
        </article>
      </div>
    </div>

    <div class="workbench-grid">
      <RouterLink v-for="item in workbenchCards" :key="item.title" :to="item.to" class="card-panel workbench-card">
        <p class="workbench-card__group">{{ item.group }}</p>
        <strong>{{ item.metric }}</strong>
        <h3>{{ item.title }}</h3>
        <p>{{ item.detail }}</p>
        <span class="workbench-card__action">进入模块</span>
      </RouterLink>
    </div>

    <div class="card-panel todo-panel">
      <div class="todo-panel__head">
        <div>
          <p class="eyebrow">My Queue</p>
          <h3>岗位待办</h3>
        </div>
      </div>
      <div class="todo-grid">
        <RouterLink v-for="item in roleTodoItems" :key="item.title" :to="item.to" class="todo-card">
          <span class="todo-card__group">{{ item.group }}</span>
          <strong>{{ item.metric }}</strong>
          <h3>{{ item.title }}</h3>
          <p>{{ item.detail }}</p>
        </RouterLink>
      </div>
    </div>

    <div class="card-panel flow-panel">
      <div class="flow-panel__head">
        <div>
          <p class="eyebrow">Workflow</p>
          <h3>业务主链</h3>
        </div>
      </div>
      <div class="flow-steps">
        <article v-for="step in flowSteps" :key="step.title" class="flow-step">
          <span class="flow-step__index">{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
          <small>{{ step.metric }}</small>
        </article>
      </div>
    </div>

    <div class="dashboard-columns">
      <div class="card-panel signal-panel">
        <div class="signal-panel__head">
          <div>
            <p class="eyebrow">Attention</p>
            <h3>风险与待办</h3>
          </div>
        </div>

        <div v-if="attentionItems.length" class="signal-list">
          <RouterLink v-for="item in attentionItems" :key="item.key" :to="item.to" class="signal-item">
            <span class="signal-item__module">{{ item.module }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </RouterLink>
        </div>
        <el-empty v-else description="当前没有需要立即关注的风险项" />
      </div>

      <div class="card-panel signal-panel">
        <div class="signal-panel__head">
          <div>
            <p class="eyebrow">Dispatch</p>
            <h3>调度快照</h3>
          </div>
          <RouterLink to="/dispatch" class="signal-panel__link">查看调度</RouterLink>
        </div>

        <div v-if="recentBatches.length" class="signal-list">
          <article v-for="item in recentBatches" :key="item.id" class="signal-item signal-item--static">
            <span class="signal-item__module">{{ item.status_name }}</span>
            <strong>{{ item.batch_name }}</strong>
            <p>{{ item.plate_number || '未分配车辆' }} / {{ item.driver_name || '未分配司机' }}</p>
          </article>
        </div>
        <el-empty v-else description="当前没有批次调度数据" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

type OrderStatusStat = {
  status: number
  status_name: string
  count: number
  total_amount: number
}

type OrderStatsResponse = {
  total_orders: number
  total_amount: number
  by_status: OrderStatusStat[]
  by_transport_mode: Array<{ transport_mode: number; mode_name: string; count: number; total_amount: number }>
  by_sender_country: Array<{ country: string; count: number; total_amount: number }>
  by_receiver_country: Array<{ country: string; count: number; total_amount: number }>
}

type SortingStatsResponse = {
  task_stats: {
    total_tasks: number
    pending_tasks: number
    processing_tasks: number
    completed_tasks: number
    cancelled_tasks: number
    avg_progress: number
    total_items: number
    sorted_items: number
  }
  record_stats: {
    total_records: number
    correct_records: number
    error_records: number
    accuracy_rate: string
    avg_scan_time: number
  }
  sorter_stats: Array<{
    sorter_id: number
    sorter_name: string
    task_count: number
    record_count: number
    correct_count: number
    error_count: number
    accuracy_rate: string
    avg_speed: number
  }>
  station_stats: Array<{
    station_id: number
    station_name: string
    task_count: number
    record_count: number
    item_count: number
  }>
  accuracy_stats: {
    overall_rate: string
  }
}

type TransportOverviewResponse = {
  total_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  completed_tasks: number
  cancelled_tasks: number
  warning_tasks: number
  critical_tasks: number
  delayed_tasks: number
  exception_tasks: number
  avg_progress: number
  total_distance: number
  total_cost: number
}

type StationWarningsResponse = {
  summary: {
    total_stations: number
    normal_stations: number
    warning_stations: number
    critical_stations: number
  }
  warnings: Array<{
    station_id: number
    station_name: string
    station_code: string
    warning_level: string
    warning_message: string
    usage_percent: string
  }>
}

type TrackingWarningsResponse = {
  list: Array<{
    order_id: number
    order_no: string
    warning_level: string
    warning_type: string
    warning_type_name: string
    warning_message: string
  }>
  total: number
  page: number
  page_size: number
  pages: number
  warning_count: number
  critical_count: number
}

type ExceptionStatsResponse = {
  summary: {
    total_exceptions: number
    pending_exceptions: number
    processing_exceptions: number
    resolved_exceptions: number
    closed_exceptions: number
    total_compensation: number
  }
  by_type: Array<{ type: number; type_name: string; count: number }>
  by_status: Array<{ status: number; status_name: string; count: number }>
  by_station: Array<{ station_id: number; station_name: string; count: number }>
  by_date: Array<{ date: string; count: number }>
}

type BatchListResponse = {
  list: Array<{
    id: number
    batch_name: string
    batch_no: string
    plate_number: string
    driver_name: string
    status: string
    status_name: string
  }>
  total: number
  page: number
  page_size: number
  pages: number
}

type InventoryCheckListResponse = {
  list: Array<{
    id: number
    check_no: string
    station_id: number
    station_name: string
    status: number
    status_name: string
  }>
  total: number
  page: number
  page_size: number
  pages: number
}

type DriverTaskListResponse = {
  list: Array<{
    id: number
    task_no: string
    order_no: string
    status: string
    status_name: string
  }>
  total: number
  page: number
  page_size: number
  pages: number
}

type DispatchPlanListResponse = {
  list: Array<{
    id: number
    plan_no: string
    plan_name: string
    status: string
    status_name: string
  }>
  total: number
  page: number
  page_size: number
  pages: number
}

const authStore = useAuthStore()

const loading = ref(false)

const orderStats = reactive<OrderStatsResponse>({
  total_orders: 0,
  total_amount: 0,
  by_status: [],
  by_transport_mode: [],
  by_sender_country: [],
  by_receiver_country: [],
})

const sortingStats = reactive<SortingStatsResponse>({
  task_stats: {
    total_tasks: 0,
    pending_tasks: 0,
    processing_tasks: 0,
    completed_tasks: 0,
    cancelled_tasks: 0,
    avg_progress: 0,
    total_items: 0,
    sorted_items: 0,
  },
  record_stats: {
    total_records: 0,
    correct_records: 0,
    error_records: 0,
    accuracy_rate: '0.0%',
    avg_scan_time: 0,
  },
  sorter_stats: [],
  station_stats: [],
  accuracy_stats: {
    overall_rate: '0.0%',
  },
})

const transportOverview = reactive<TransportOverviewResponse>({
  total_tasks: 0,
  pending_tasks: 0,
  in_progress_tasks: 0,
  completed_tasks: 0,
  cancelled_tasks: 0,
  warning_tasks: 0,
  critical_tasks: 0,
  delayed_tasks: 0,
  exception_tasks: 0,
  avg_progress: 0,
  total_distance: 0,
  total_cost: 0,
})

const stationWarnings = reactive<StationWarningsResponse>({
  summary: {
    total_stations: 0,
    normal_stations: 0,
    warning_stations: 0,
    critical_stations: 0,
  },
  warnings: [],
})

const trackingWarnings = reactive<TrackingWarningsResponse>({
  list: [],
  total: 0,
  page: 1,
  page_size: 5,
  pages: 0,
  warning_count: 0,
  critical_count: 0,
})

const exceptionStats = reactive<ExceptionStatsResponse>({
  summary: {
    total_exceptions: 0,
    pending_exceptions: 0,
    processing_exceptions: 0,
    resolved_exceptions: 0,
    closed_exceptions: 0,
    total_compensation: 0,
  },
  by_type: [],
  by_status: [],
  by_station: [],
  by_date: [],
})

const recentBatches = ref<BatchListResponse['list']>([])
const pendingInventoryChecks = ref<InventoryCheckListResponse['list']>([])
const driverTasks = ref<DriverTaskListResponse['list']>([])
const dispatchPlans = ref<DispatchPlanListResponse['list']>([])

const trackingWarningTotal = computed(() => trackingWarnings.total || 0)
const pendingInventoryCheckTotal = computed(() => pendingInventoryChecks.value.length)
const driverPendingTasks = computed(() => driverTasks.value.filter((item) => item.status === 'pending').length)
const driverInProgressTasks = computed(() => driverTasks.value.filter((item) => item.status === 'in_progress').length)
const driverCompletedTasks = computed(() => driverTasks.value.filter((item) => item.status === 'completed').length)
const pendingBatchCount = computed(() => recentBatches.value.filter((item) => item.status === 'pending').length)
const draftPlanCount = computed(() => dispatchPlans.value.filter((item) => item.status === 'draft').length)
const confirmedPlanCount = computed(() => dispatchPlans.value.filter((item) => item.status === 'confirmed').length)

const roleFocus = computed(() => {
  const role = authStore.user?.role || 0
  const mapping: Record<number, string[]> = {
    7: ['全链路监控', '异常总控', '调度收口'],
    6: ['调度排班', '计划确认', '运力协调'],
    5: ['站点承接', '库存盘点', '异常分流'],
    4: ['运输执行', '装卸交接', '任务反馈'],
    3: ['分拣作业', '规则执行', '扫描质量'],
    2: ['订单受理', '站点交接', '异常上报'],
    1: ['订单跟踪', '进度查询', '签收关注'],
  }
  return mapping[role] || ['全链路运营', '关键待办', '风险预警']
})

const workbenchCards = computed(() => [
  {
    group: 'Orders',
    title: '待受理订单',
    metric: `${countOrderStatus(1)} 单`,
    detail: `已接单 ${countOrderStatus(2)} 单，订单总额 ${formatMoney(orderStats.total_amount)}`,
    to: '/orders',
  },
  {
    group: 'Stations',
    title: '站点承接关注',
    metric: `${stationWarnings.summary.warning_stations + stationWarnings.summary.critical_stations} 个`,
    detail: `启用站点 ${stationWarnings.summary.total_stations} 个，重点看库存压力与盘点结果`,
    to: '/stations',
  },
  {
    group: 'Sorting',
    title: '待分拣任务',
    metric: `${sortingStats.task_stats.pending_tasks} 个`,
    detail: `分拣准确率 ${sortingStats.record_stats.accuracy_rate}，处理中 0 个`,
    to: '/sorting',
  },
  {
    group: 'Transport',
    title: '待发车运输',
    metric: `${transportOverview.pending_tasks} 个`,
    detail: `执行中 ${transportOverview.in_progress_tasks} 个，严重预警 ${transportOverview.critical_tasks} 个`,
    to: '/transport',
  },
  {
    group: 'Tracking',
    title: '追踪预警',
    metric: `${trackingWarningTotal.value} 单`,
    detail: `严重 ${trackingWarnings.critical_count} 单，普通 ${trackingWarnings.warning_count} 单`,
    to: '/tracking',
  },
  {
    group: 'Exceptions',
    title: '异常闭环',
    metric: `${exceptionStats.summary.pending_exceptions + exceptionStats.summary.processing_exceptions} 单`,
    detail: `已关闭 ${exceptionStats.summary.closed_exceptions} 单，累计赔付 ${formatMoney(exceptionStats.summary.total_compensation)}`,
    to: '/exceptions',
  },
  {
    group: 'Dispatch',
    title: '调度执行',
    metric: `${recentBatches.value.length} 个批次`,
    detail: `工作台聚合路径优化、批次调度与计划编排`,
    to: '/dispatch',
  },
  {
    group: 'Profile',
    title: '个人维护',
    metric: `${authStore.permissions.length} 项权限`,
    detail: `更新个人资料、密码和账号安全信息`,
    to: '/profile',
  },
])

function createWorkbenchRoute(path: string, query: Record<string, string | number | undefined> = {}): RouteLocationRaw {
  return {
    path,
    query: Object.fromEntries(
      Object.entries(query).filter(([, value]) => typeof value !== 'undefined' && value !== ''),
    ),
  }
}

function pickTrackingWarningLevel() {
  if (trackingWarnings.critical_count > 0) {
    return 'critical'
  }
  if (trackingWarnings.warning_count > 0) {
    return 'warning'
  }
  return undefined
}

function pickStationWarningFilter() {
  if (stationWarnings.summary.critical_stations > 0) {
    return 'critical'
  }
  if (stationWarnings.summary.warning_stations > 0) {
    return 'warning'
  }
  return undefined
}

function pickExceptionStatus() {
  if (exceptionStats.summary.pending_exceptions > 0) {
    return 1
  }
  if (exceptionStats.summary.processing_exceptions > 0) {
    return 2
  }
  return undefined
}

const roleTodoItems = computed(() => {
  const role = authStore.user?.role || 0
  switch (role) {
    case 1:
      return [
        {
          group: '客户',
          title: '待处理订单',
          metric: `${countOrderStatus(1)} 单`,
          detail: '新建后尚未进入处理环节的订单',
          to: createWorkbenchRoute('/orders', { status: 1 }),
        },
        {
          group: '客户',
          title: '在途订单',
          metric: `${countOrderStatuses([3, 4, 5, 7, 8])} 单`,
          detail: '查看物流进度、签收前关键节点',
          to: createWorkbenchRoute('/tracking', { tab: 'records' }),
        },
        {
          group: '客户',
          title: '预警订单',
          metric: `${trackingWarningTotal.value} 单`,
          detail: '重点关注延误和长时间无更新',
          to: createWorkbenchRoute('/tracking', { tab: 'warnings', warning_level: pickTrackingWarningLevel() }),
        },
      ]
    case 2:
      return [
        {
          group: '快递员',
          title: '待受理订单',
          metric: `${countOrderStatus(1)} 单`,
          detail: '优先推进订单受理和交接',
          to: createWorkbenchRoute('/orders', { status: 1 }),
        },
        {
          group: '快递员',
          title: '在途关注',
          metric: `${countOrderStatuses([5, 7, 8])} 单`,
          detail: `追踪预警 ${trackingWarningTotal.value} 单`,
          to: createWorkbenchRoute('/tracking', { tab: 'warnings', warning_level: pickTrackingWarningLevel() }),
        },
        {
          group: '快递员',
          title: '异常上报关注',
          metric: `${exceptionStats.summary.total_exceptions} 单`,
          detail: '核对客户反馈与异常登记',
          to: createWorkbenchRoute('/exceptions', { tab: 'list', status: pickExceptionStatus() }),
        },
      ]
    case 3:
      return [
        {
          group: '分拣员',
          title: '待分拣任务',
          metric: `${sortingStats.task_stats.pending_tasks} 个`,
          detail: '优先处理待处理分拣任务',
          to: createWorkbenchRoute('/sorting', { tab: 'tasks', task_status: 'pending' }),
        },
        {
          group: '分拣员',
          title: '已分拣件数',
          metric: `${sortingStats.task_stats.sorted_items} 件`,
          detail: `总任务量 ${sortingStats.task_stats.total_items} 件`,
          to: createWorkbenchRoute('/sorting', { tab: 'records', record_is_correct: 1 }),
        },
        {
          group: '分拣员',
          title: '扫描质量',
          metric: sortingStats.record_stats.accuracy_rate || '0.0%',
          detail: `错误记录 ${sortingStats.record_stats.error_records} 条`,
          to: createWorkbenchRoute('/sorting', { tab: 'records', record_is_correct: 0 }),
        },
      ]
    case 4:
      return [
        {
          group: '司机',
          title: '待发车 / 待装车',
          metric: `${driverPendingTasks.value} 个`,
          detail: '待执行任务需要尽快装车出发',
          to: createWorkbenchRoute('/transport', { tab: 'tasks', task_status: 'pending' }),
        },
        {
          group: '司机',
          title: '执行中 / 待卸车',
          metric: `${driverInProgressTasks.value} 个`,
          detail: '在途任务需关注到站卸车交接',
          to: createWorkbenchRoute('/transport', { tab: 'tasks', task_status: 'in_progress' }),
        },
        {
          group: '司机',
          title: '已完成任务',
          metric: `${driverCompletedTasks.value} 个`,
          detail: '查看装卸记录与任务复盘',
          to: createWorkbenchRoute('/transport', { tab: 'tasks', task_status: 'completed' }),
        },
      ]
    case 5:
      return [
        {
          group: '站点管理员',
          title: '待入库订单',
          metric: `${countOrderStatus(2)} 单`,
          detail: '已接单后等待站点入库承接',
          to: createWorkbenchRoute('/orders', { status: 2 }),
        },
        {
          group: '站点管理员',
          title: '待盘点任务',
          metric: `${pendingInventoryCheckTotal.value} 个`,
          detail: pendingInventoryCheckTotal.value > 0 ? '存在未完成盘点，请及时核对库存' : '当前没有未完成盘点',
          to: createWorkbenchRoute('/stations', { tab: 'checks', check_status: 1 }),
        },
        {
          group: '站点管理员',
          title: '站点关注',
          metric: `${stationWarnings.summary.warning_stations + stationWarnings.summary.critical_stations} 个`,
          detail: '重点关注库存承压与库位流转',
          to: createWorkbenchRoute('/stations', { tab: 'warnings', warning_filter: pickStationWarningFilter() }),
        },
      ]
    case 6:
      return [
        {
          group: '调度员',
          title: '待确认计划',
          metric: `${draftPlanCount.value} 个`,
          detail: '草稿计划待确认并下发执行',
          to: createWorkbenchRoute('/dispatch', { tab: 'plans', plan_status: 'draft' }),
        },
        {
          group: '调度员',
          title: '待发车批次',
          metric: `${pendingBatchCount.value} 个`,
          detail: '待调度批次需要确认车辆和司机',
          to: createWorkbenchRoute('/dispatch', { tab: 'batches', batch_status: 'pending' }),
        },
        {
          group: '调度员',
          title: '已确认计划',
          metric: `${confirmedPlanCount.value} 个`,
          detail: '进入执行前的关键调度窗口',
          to: createWorkbenchRoute('/dispatch', { tab: 'plans', plan_status: 'confirmed' }),
        },
      ]
    case 7:
      return [
        {
          group: '管理员',
          title: '全链路待办',
          metric: `${countOrderStatus(1) + sortingStats.task_stats.pending_tasks + transportOverview.pending_tasks} 项`,
          detail: '订单、分拣和运输待办汇总',
          to: createWorkbenchRoute('/orders', { status: 1 }),
        },
        {
          group: '管理员',
          title: '待盘点任务',
          metric: `${pendingInventoryCheckTotal.value} 个`,
          detail: '盘点未完成会影响库存真实性',
          to: createWorkbenchRoute('/stations', { tab: 'checks', check_status: 1 }),
        },
        {
          group: '管理员',
          title: '运输严重预警',
          metric: `${transportOverview.critical_tasks} 个`,
          detail: '优先处理延迟、高成本和异常运输',
          to: createWorkbenchRoute('/transport', { tab: 'monitor', warning_level: 'critical' }),
        },
        {
          group: '管理员',
          title: '异常待闭环',
          metric: `${exceptionStats.summary.pending_exceptions + exceptionStats.summary.processing_exceptions} 单`,
          detail: '推进处理、关闭和赔付收口',
          to: createWorkbenchRoute('/exceptions', { tab: 'list', status: pickExceptionStatus() }),
        },
      ]
    default:
      return [
        {
          group: '工作台',
          title: '订单关注',
          metric: `${orderStats.total_orders} 单`,
          detail: '进入订单中心查看当前处理进度',
          to: createWorkbenchRoute('/orders', { status: 1 }),
        },
      ]
  }
})

const flowSteps = computed(() => [
  {
    index: '01',
    title: '订单受理',
    description: '录单、代客户下单、受理待办',
    metric: `${countOrderStatus(1)} 单待处理`,
  },
  {
    index: '02',
    title: '站点承接',
    description: '站点承接、库存接入、盘点预警',
    metric: `${stationWarnings.summary.total_stations} 个启用站点`,
  },
  {
    index: '03',
    title: '分拣作业',
    description: '规则命中、分拣任务、扫描记录',
    metric: `${sortingStats.task_stats.sorted_items}/${sortingStats.task_stats.total_items} 件已分拣`,
  },
  {
    index: '04',
    title: '运输执行',
    description: '任务发车、装卸交接、执行监控',
    metric: `${transportOverview.in_progress_tasks} 个执行中`,
  },
  {
    index: '05',
    title: '追踪与异常',
    description: '时效预警、追踪更新、异常闭环',
    metric: `${trackingWarningTotal.value + exceptionStats.summary.total_exceptions} 项关注`,
  },
])

const attentionItems = computed(() => {
  const items: Array<{ key: string; module: string; title: string; detail: string; to: string }> = []

  trackingWarnings.list.slice(0, 3).forEach((item) => {
    items.push({
      key: `tracking-${item.order_id}-${item.warning_type}`,
      module: '追踪',
      title: item.order_no,
      detail: normalizeText(item.warning_message, '存在追踪风险'),
      to: '/tracking',
    })
  })

  stationWarnings.warnings
    .filter((item) => item.warning_level === 'warning' || item.warning_level === 'critical')
    .slice(0, 2)
    .forEach((item) => {
      items.push({
        key: `station-${item.station_id}`,
        module: '库存',
        title: normalizeText(item.station_name, item.station_code),
        detail: `${item.usage_percent} · ${normalizeText(item.warning_message)}`,
        to: '/stations',
      })
    })

  if (transportOverview.critical_tasks > 0 || transportOverview.delayed_tasks > 0) {
    items.push({
      key: 'transport-overview',
      module: '运输',
      title: '运输执行风险',
      detail: `严重预警 ${transportOverview.critical_tasks} 个，延迟 ${transportOverview.delayed_tasks} 个`,
      to: '/transport',
    })
  }

  if (exceptionStats.summary.pending_exceptions + exceptionStats.summary.processing_exceptions > 0) {
    items.push({
      key: 'exception-open',
      module: '异常',
      title: '待闭环异常',
      detail: `${exceptionStats.summary.pending_exceptions + exceptionStats.summary.processing_exceptions} 单需要跟进`,
      to: '/exceptions',
    })
  }

  return items.slice(0, 6)
})

function countOrderStatus(status: number) {
  return orderStats.by_status.find((item) => item.status === status)?.count || 0
}

function countOrderStatuses(statuses: number[]) {
  return statuses.reduce((total, status) => total + countOrderStatus(status), 0)
}

function normalizeText(value: string | null | undefined, fallback = '-') {
  const text = String(value ?? '').trim()
  if (!text || /^[?？�]+$/.test(text)) {
    return fallback
  }
  return text
}

function formatMoney(value: number | undefined) {
  return `¥${(Number(value) || 0).toFixed(2)}`
}

async function loadOrderStats() {
  const data = await http.get<never, OrderStatsResponse>('/orders/statistics')
  Object.assign(orderStats, data)
}

async function loadSortingStats() {
  if (!authStore.permissions.includes('sorting:view')) {
    return
  }
  const data = await http.get<never, SortingStatsResponse>('/sorting/stats')
  Object.assign(sortingStats, data)
}

async function loadTransportOverview() {
  if (!authStore.permissions.includes('transport:view')) {
    return
  }
  const data = await http.get<never, TransportOverviewResponse>('/transport/monitor/overview')
  Object.assign(transportOverview, data)
}

async function loadStationWarnings() {
  const data = await http.get<never, StationWarningsResponse>('/stations/inventory/warnings')
  Object.assign(stationWarnings, data)
}

async function loadTrackingWarnings() {
  if (!authStore.permissions.includes('tracking:view')) {
    return
  }
  const data = await http.get<never, TrackingWarningsResponse>('/tracking/warnings', {
    params: { page: 1, page_size: 5 },
  })
  Object.assign(trackingWarnings, data)
}

async function loadExceptionStats() {
  if (!authStore.permissions.includes('exception:view')) {
    return
  }
  const data = await http.get<never, ExceptionStatsResponse>('/exceptions/stats')
  Object.assign(exceptionStats, data)
}

async function loadRecentBatches() {
  const data = await http.get<never, BatchListResponse>('/dispatch/batches', {
    params: { page: 1, page_size: 20 },
  })
  recentBatches.value = data.list || []
}

async function loadPendingInventoryChecks() {
  if (!(authStore.permissions.includes('station:view') || authStore.user?.role === 5 || authStore.user?.role === 7)) {
    return
  }
  const data = await http.get<never, InventoryCheckListResponse>('/stations/inventory/check', {
    params: { page: 1, page_size: 20, status: 1 },
  })
  pendingInventoryChecks.value = data.list || []
}

async function loadDriverTasks() {
  if (authStore.user?.role !== 4 || !authStore.user?.id) {
    return
  }
  const data = await http.get<never, DriverTaskListResponse>('/transport/tasks', {
    params: { page: 1, page_size: 20, driver_id: authStore.user.id },
  })
  driverTasks.value = data.list || []
}

async function loadDispatchPlans() {
  if (![6, 7].includes(authStore.user?.role || 0)) {
    return
  }
  const data = await http.get<never, DispatchPlanListResponse>('/dispatch/plans', {
    params: { page: 1, page_size: 20 },
  })
  dispatchPlans.value = data.list || []
}

async function loadDashboardData() {
  loading.value = true
  try {
    await Promise.all([
      loadOrderStats(),
      loadSortingStats(),
      loadTransportOverview(),
      loadStationWarnings(),
      loadTrackingWarnings(),
      loadExceptionStats(),
      loadRecentBatches(),
      loadPendingInventoryChecks(),
      loadDriverTasks(),
      loadDispatchPlans(),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadDashboardData()
})
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-hero,
.flow-panel,
.signal-panel {
  padding: 1.75rem;
}

.todo-panel {
  padding: 1.75rem;
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
}

.dashboard-hero h1,
.flow-panel__head h3,
.signal-panel__head h3 {
  margin: 0;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: clamp(2.2rem, 4vw, 3.4rem);
}

.dashboard-hero p {
  max-width: 48rem;
  color: var(--muted);
  line-height: 1.75;
}

.dashboard-view__hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
}

.dashboard-view__hero-meta span,
.workbench-card__action {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(238, 77, 45, 0.12);
  color: var(--accent-deep);
  font-size: 0.85rem;
  font-weight: 600;
}

.dashboard-hero__stats {
  min-width: 18rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.dashboard-hero__stats article {
  padding: 1rem 1.15rem;
  border-radius: 18px;
  background: rgba(238, 77, 45, 0.08);
  border: 1px solid rgba(238, 77, 45, 0.14);
}

.dashboard-hero__stats span {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}

.dashboard-hero__stats strong {
  font-size: 1.45rem;
  color: var(--accent-deep);
}

.workbench-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.todo-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.todo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.todo-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 1.15rem;
  border-radius: 18px;
  border: 1px solid rgba(238, 77, 45, 0.14);
  background: rgba(255, 248, 243, 0.78);
}

.todo-card__group {
  margin: 0;
  color: var(--accent-deep);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.todo-card strong,
.todo-card h3 {
  color: var(--ink);
}

.todo-card h3,
.todo-panel__head h3 {
  margin: 0;
}

.todo-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.workbench-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.25rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.workbench-card:hover {
  transform: translateY(-2px);
  border-color: rgba(238, 77, 45, 0.22);
}

.workbench-card__group {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workbench-card strong,
.flow-step strong,
.signal-item strong {
  color: var(--ink);
}

.workbench-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.workbench-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.workbench-card__action {
  margin-top: auto;
  width: fit-content;
}

.flow-panel__head,
.signal-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.signal-panel__link {
  color: var(--accent-deep);
  font-weight: 700;
}

.flow-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
}

.flow-step {
  padding: 1rem 1.1rem;
  border-radius: 18px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 248, 243, 0.78);
}

.flow-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgba(238, 77, 45, 0.14);
  color: var(--accent-deep);
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.flow-step p,
.flow-step small,
.signal-item p {
  color: var(--muted);
}

.flow-step small {
  display: block;
  margin-top: 0.6rem;
}

.dashboard-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.signal-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.signal-item {
  display: block;
  padding: 1rem 1.1rem;
  border-radius: 18px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 248, 243, 0.78);
}

.signal-item--static {
  cursor: default;
}

.signal-item__module {
  display: inline-block;
  margin-bottom: 0.4rem;
  color: var(--accent-deep);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 1200px) {
  .workbench-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .todo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .dashboard-hero,
  .flow-panel__head,
  .signal-panel__head {
    flex-direction: column;
  }

  .dashboard-columns {
    grid-template-columns: 1fr;
  }

  .dashboard-hero__stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .workbench-grid,
  .todo-grid,
  .flow-steps {
    grid-template-columns: 1fr;
  }
}
</style>
