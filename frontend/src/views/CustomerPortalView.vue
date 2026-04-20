<template>
  <section class="customer-portal-view">
    <div class="customer-hero card-panel">
      <div>
        <p class="eyebrow">Customer Portal</p>
        <h1>客户门户</h1>
        <p>在一个页面完成订单查询、在线下单、追踪查看和异常反馈。</p>
      </div>
      <div class="customer-hero__stats">
        <article><span>我的订单</span><strong>{{ orderPagination.total }}</strong></article>
        <article><span>在途关注</span><strong>{{ inTransitCount }}</strong></article>
        <article><span>追踪预警</span><strong>{{ warningPagination.total }}</strong></article>
        <article><span>异常反馈</span><strong>{{ exceptionPagination.total }}</strong></article>
      </div>
    </div>

    <div class="card-panel customer-panel">
      <div class="customer-panel__toolbar">
        <div>
          <p class="eyebrow">Orders</p>
          <strong>我的订单</strong>
        </div>
        <el-button type="primary" @click="createDialogVisible = true">我要下单</el-button>
      </div>

      <el-form :inline="true" :model="orderFilters" class="customer-filters" @submit.prevent>
        <el-form-item label="订单号">
          <el-input v-model="orderFilters.order_no" clearable placeholder="请输入订单号" @keyup.enter="loadOrders" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="orderFilters.status" clearable placeholder="全部状态" style="width: 180px">
            <el-option label="全部状态" :value="undefined" />
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadOrders">查询</el-button>
          <el-button @click="resetOrderFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="orderLoading" :data="orders" stripe>
        <el-table-column prop="order_no" label="订单号" min-width="180" />
        <el-table-column label="线路" min-width="240">
          <template #default="scope">
            <div class="customer-identity">
              <strong>{{ scope.row.sender_country }} → {{ scope.row.receiver_country }}</strong>
              <span>{{ scope.row.goods_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag effect="dark" :type="statusTagType(scope.row.status)">{{ scope.row.status_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="order_time" label="下单时间" min-width="160" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <div class="customer-actions">
              <el-button link type="primary" @click="openTimeline(scope.row)">时间轴</el-button>
              <el-button link type="info" @click="openHistory(scope.row)">历史</el-button>
              <el-button link type="danger" @click="openExceptionDialog(scope.row)">异常反馈</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="customer-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="orderPagination.total"
          :current-page="orderPagination.page"
          :page-size="orderPagination.pageSize"
          @current-change="handleOrderPageChange"
        />
      </div>
    </div>

    <div class="customer-grid">
      <div class="card-panel customer-panel">
        <div class="customer-panel__toolbar">
          <div>
            <p class="eyebrow">Warnings</p>
            <strong>追踪预警</strong>
          </div>
          <el-button link type="primary" @click="loadWarnings">刷新</el-button>
        </div>
        <div v-if="warnings.length" class="customer-list">
          <article v-for="item in warnings" :key="`${item.order_id}-${item.warning_type}`">
            <strong>{{ item.order_no }}</strong>
            <span>{{ item.warning_type_name }} · {{ item.warning_level }}</span>
            <small>{{ normalizeText(item.warning_message, '暂无说明') }}</small>
          </article>
        </div>
        <el-empty v-else description="暂无追踪预警" />
      </div>

      <div class="card-panel customer-panel">
        <div class="customer-panel__toolbar">
          <div>
            <p class="eyebrow">Exceptions</p>
            <strong>异常反馈记录</strong>
          </div>
          <el-button link type="primary" @click="loadExceptions">刷新</el-button>
        </div>
        <div v-if="exceptions.length" class="customer-list">
          <article v-for="item in exceptions" :key="item.id">
            <strong>{{ item.exception_no }}</strong>
            <span>{{ item.order_no }} · {{ item.type_name }} · {{ item.status_name }}</span>
            <small>{{ normalizeText(item.description, '暂无描述') }}</small>
          </article>
        </div>
        <el-empty v-else description="暂无异常反馈" />
      </div>
    </div>

    <el-dialog v-model="exceptionDialogVisible" title="异常反馈" width="620px">
      <el-form label-position="top">
        <el-form-item label="订单">
          <el-input :model-value="selectedOrder?.order_no || ''" disabled />
        </el-form-item>
        <el-form-item label="异常类型">
          <el-select v-model="exceptionForm.type" placeholder="请选择异常类型" style="width: 100%">
            <el-option v-for="item in exceptionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="异常描述">
          <el-input v-model="exceptionForm.description" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="请输入异常描述" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="exceptionForm.remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="可选，填写补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exceptionDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="exceptionSubmitting" @click="submitException">提交反馈</el-button>
      </template>
    </el-dialog>

    <OrderCreateDialog v-model="createDialogVisible" @created="handleOrderCreated" />

    <el-drawer v-model="timelineDrawerVisible" size="56%" title="订单时间轴">
      <div class="timeline-drawer" v-loading="timelineLoading">
        <template v-if="timelineData">
          <div class="timeline-hero">
            <div>
              <p class="eyebrow">Timeline</p>
              <h2>{{ timelineData.order_no }}</h2>
              <p>{{ timelineData.current_status_name }}</p>
            </div>
          </div>

          <el-timeline class="customer-timeline">
            <el-timeline-item
              v-for="item in visibleTimelineItems"
              :key="`${item.record_id}-${item.display_time}`"
              :timestamp="item.display_time"
              placement="top"
              :type="item.is_fallback ? 'info' : 'primary'"
            >
              <div class="customer-timeline__content">
                <strong>{{ normalizeText(item.status, '未知状态') }}</strong>
                <p>{{ normalizeText(item.location, '暂无位置') }}</p>
                <small>{{ normalizeText(item.description, item.is_fallback ? '当前暂无追踪明细，系统仅展示订单当前状态' : '无描述') }}</small>
              </div>
            </el-timeline-item>
          </el-timeline>
        </template>
      </div>
    </el-drawer>

    <el-drawer v-model="historyDrawerVisible" size="56%" title="追踪历史">
      <div class="timeline-drawer" v-loading="historyLoading">
        <template v-if="historyData">
          <el-table :data="historyData.list" size="small" stripe>
            <el-table-column prop="status" label="状态" min-width="160" />
            <el-table-column prop="location" label="位置" min-width="180" />
            <el-table-column label="时间" min-width="170">
              <template #default="scope">{{ formatUnix(scope.row.track_time) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="220" />
          </el-table>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'

import OrderCreateDialog from '@/components/OrderCreateDialog.vue'
import { useAuthStore } from '@/stores/auth'
import http from '@/utils/http'

type OrderItem = {
  id: number
  order_no: string
  sender_country: string
  receiver_country: string
  goods_name: string
  status: number
  status_name: string
  order_time: string
}

type OrderListResponse = {
  list: OrderItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type TrackingWarningItem = {
  order_id: number
  order_no: string
  warning_level: string
  warning_type: string
  warning_type_name: string
  warning_message: string
}

type TrackingWarningListResponse = {
  list: TrackingWarningItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type ExceptionItem = {
  id: number
  exception_no: string
  order_id: number
  order_no: string
  type: number
  type_name: string
  status: number
  status_name: string
  description: string
}

type ExceptionListResponse = {
  list: ExceptionItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type TrackingTimelineItem = {
  record_id: number
  status: string
  description: string
  display_time: string
  location?: string
}

type TrackingTimeline = {
  order_id: number
  order_no: string
  current_status_name: string
  timeline: TrackingTimelineItem[]
}

type TrackingHistoryItem = {
  status: string
  location: string
  track_time: number
  description: string
}

type TrackingHistory = {
  order_id: number
  order_no: string
  list: TrackingHistoryItem[]
}

const statusOptions = [
  { value: 1, label: '待处理' },
  { value: 2, label: '已接单' },
  { value: 13, label: '待揽收' },
  { value: 14, label: '揽收中' },
  { value: 15, label: '已揽收' },
  { value: 3, label: '已入库' },
  { value: 4, label: '分拣中' },
  { value: 5, label: '运输中' },
  { value: 6, label: '清关中' },
  { value: 7, label: '目的地分拣' },
  { value: 8, label: '配送中' },
  { value: 9, label: '已送达' },
  { value: 10, label: '已签收' },
  { value: 11, label: '异常' },
  { value: 12, label: '已取消' },
]

const exceptionTypeOptions = [
  { value: 1, label: '破损' },
  { value: 2, label: '丢失' },
  { value: 3, label: '延误' },
  { value: 4, label: '错分' },
  { value: 5, label: '拒收' },
  { value: 6, label: '清关异常' },
  { value: 7, label: '其他' },
]

const authStore = useAuthStore()
const orderLoading = ref(false)
const timelineLoading = ref(false)
const historyLoading = ref(false)
const exceptionSubmitting = ref(false)
const createDialogVisible = ref(false)

const orders = ref<OrderItem[]>([])
const warnings = ref<TrackingWarningItem[]>([])
const exceptions = ref<ExceptionItem[]>([])
const selectedOrder = ref<OrderItem | null>(null)
const currentTimelineOrder = ref<OrderItem | null>(null)
const timelineData = ref<TrackingTimeline | null>(null)
const historyData = ref<TrackingHistory | null>(null)

const exceptionDialogVisible = ref(false)
const timelineDrawerVisible = ref(false)
const historyDrawerVisible = ref(false)

const orderPagination = reactive({ total: 0, page: 1, pageSize: 8 })
const warningPagination = reactive({ total: 0, page: 1, pageSize: 6 })
const exceptionPagination = reactive({ total: 0, page: 1, pageSize: 6 })

const orderFilters = reactive({ order_no: '', status: undefined as number | undefined })
const exceptionForm = reactive({ type: 3, description: '', remark: '' })

const inTransitCount = computed(() => orders.value.filter((item) => [13, 14, 15, 3, 4, 5, 6, 7, 8].includes(item.status)).length)
const visibleTimelineItems = computed(() => {
  if (!timelineData.value) {
    return []
  }
  if (timelineData.value.timeline?.length) {
    return timelineData.value.timeline.map((item) => ({ ...item, is_fallback: false }))
  }
  return [{
    record_id: 0,
    status: timelineData.value.current_status_name,
    description: '',
    location: '',
    display_time: currentTimelineOrder.value?.order_time || '下单时间未知',
    is_fallback: true,
  }]
})

function normalizeText(value: string | null | undefined, fallback = '-') {
  const text = String(value ?? '').trim()
  return text ? text : fallback
}

function formatUnix(value: number | undefined | null) {
  if (!value) return '-'
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

function statusTagType(status: number): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  return ({ 1: 'info', 2: 'primary', 3: 'warning', 4: 'warning', 5: 'primary', 6: 'warning', 7: 'warning', 8: 'primary', 9: 'success', 10: 'success', 11: 'danger', 12: 'info' } as Record<number, 'success' | 'warning' | 'info' | 'danger' | 'primary'>)[status] || 'info'
}

async function loadOrders() {
  orderLoading.value = true
  try {
    const params: Record<string, string | number> = { page: orderPagination.page, page_size: orderPagination.pageSize }
    if (orderFilters.order_no.trim()) params.order_no = orderFilters.order_no.trim()
    if (typeof orderFilters.status === 'number') params.status = orderFilters.status
    const data = await http.get<never, OrderListResponse>('/orders', { params })
    orders.value = data.list || []
    orderPagination.total = data.total || 0
  } finally {
    orderLoading.value = false
  }
}

async function loadWarnings() {
  const data = await http.get<never, TrackingWarningListResponse>('/tracking/warnings', { params: { page: 1, page_size: warningPagination.pageSize } })
  warnings.value = data.list || []
  warningPagination.total = data.total || 0
}

async function loadExceptions() {
  const data = await http.get<never, ExceptionListResponse>('/exceptions', { params: { page: 1, page_size: exceptionPagination.pageSize } })
  exceptions.value = data.list || []
  exceptionPagination.total = data.total || 0
}

function resetOrderFilters() {
  orderFilters.order_no = ''
  orderFilters.status = undefined
  orderPagination.page = 1
  void loadOrders()
}

function handleOrderPageChange(page: number) {
  orderPagination.page = page
  void loadOrders()
}

function openExceptionDialog(order: OrderItem) {
  selectedOrder.value = order
  exceptionForm.type = 3
  exceptionForm.description = ''
  exceptionForm.remark = ''
  exceptionDialogVisible.value = true
}

async function submitException() {
  if (!selectedOrder.value || !exceptionForm.description.trim()) return
  exceptionSubmitting.value = true
  try {
    await http.post('/exceptions', {
      order_id: selectedOrder.value.id,
      type: exceptionForm.type,
      description: exceptionForm.description.trim(),
      remark: exceptionForm.remark.trim(),
    })
    ElMessage.success('异常反馈已提交')
    exceptionDialogVisible.value = false
    await loadExceptions()
  } finally {
    exceptionSubmitting.value = false
  }
}

async function handleOrderCreated() {
  await loadOrders()
}

async function openTimeline(order: OrderItem) {
  currentTimelineOrder.value = order
  timelineDrawerVisible.value = true
  timelineLoading.value = true
  try {
    timelineData.value = await http.get<never, TrackingTimeline>(`/tracking/orders/${order.id}/timeline`)
  } finally {
    timelineLoading.value = false
  }
}

async function openHistory(order: OrderItem) {
  historyDrawerVisible.value = true
  historyLoading.value = true
  try {
    historyData.value = await http.get<never, TrackingHistory>(`/tracking/orders/${order.id}/history`)
  } finally {
    historyLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadOrders(), loadWarnings(), loadExceptions()])
})
</script>

<style scoped>
.customer-portal-view { display: flex; flex-direction: column; gap: 1rem; }
.customer-hero, .customer-panel { padding: 1.5rem; }
.customer-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.customer-hero h1 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.customer-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.customer-hero__stats { min-width: 18rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.customer-hero__stats article { padding: 1rem 1.1rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.customer-hero__stats span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.customer-hero__stats strong { font-size: 1.5rem; color: var(--accent-deep); }
.customer-panel__toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
.customer-panel__toolbar strong { color: var(--ink); }
.customer-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.customer-identity { display: flex; flex-direction: column; gap: 0.2rem; }
.customer-identity span { color: var(--muted); }
.customer-actions { display: flex; gap: 0.45rem; white-space: nowrap; }
.customer-pagination { display: flex; justify-content: flex-end; margin-top: 1rem; }
.customer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.customer-list { display: flex; flex-direction: column; gap: 0.8rem; }
.customer-list article { padding: 0.9rem 1rem; border-radius: 16px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.76); display: flex; flex-direction: column; gap: 0.3rem; }
.customer-list span, .customer-list small { color: var(--muted); }
.timeline-drawer { min-height: 12rem; }
.customer-timeline { padding-top: 0.5rem; }
.customer-timeline__content { display: flex; flex-direction: column; gap: 0.25rem; }
.customer-timeline__content p, .customer-timeline__content small { margin: 0; color: var(--muted); }
@media (max-width: 1024px) { .customer-hero { flex-direction: column; } .customer-grid { grid-template-columns: 1fr; } .customer-hero__stats { grid-template-columns: 1fr; } }
</style>
