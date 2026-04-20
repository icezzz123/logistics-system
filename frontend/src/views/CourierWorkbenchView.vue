<template>
  <section class="courier-workbench-view">
    <div class="courier-hero card-panel">
      <div>
        <p class="eyebrow">Courier Hub</p>
        <h1>快递员工作台</h1>
        <p>同一页面处理揽收与派送，快递员可以认领任务、开始作业、确认揽收、确认送达和完成签收。</p>
      </div>
      <div class="courier-hero__switch">
        <span>当前作业面板</span>
        <el-radio-group v-model="workbenchMode">
          <el-radio-button label="pickup">揽收任务</el-radio-button>
          <el-radio-button label="delivery">派送任务</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="courier-stats card-panel">
      <article v-for="item in currentStatCards" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <div v-if="currentCanCreate" class="card-panel courier-panel">
      <div class="courier-panel__toolbar">
        <div>
          <p class="eyebrow">Create Task</p>
          <strong>{{ workbenchMode === 'pickup' ? '手动生成待揽收任务' : '手动生成待派送任务' }}</strong>
        </div>
      </div>

      <el-form :inline="true" :model="currentCreateForm" class="courier-filters" @submit.prevent>
        <el-form-item label="订单号">
          <el-input v-model="currentCreateForm.order_no" clearable placeholder="请输入订单号" />
        </el-form-item>
        <el-form-item label="站点">
          <el-select v-model="currentCreateForm.station_id" clearable placeholder="请选择站点" style="width: 220px">
            <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="currentCreateForm.remark" clearable placeholder="可选，填写任务备注" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="currentCreateLoading" @click="submitCreateTask">生成任务</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="card-panel courier-panel">
      <div class="courier-panel__toolbar">
        <div>
          <p class="eyebrow">{{ workbenchMode === 'pickup' ? 'Pickup Queue' : 'Delivery Queue' }}</p>
          <strong>{{ currentActiveLabel }}</strong>
        </div>
        <div class="courier-panel__toolbar-actions">
          <el-button @click="refreshCurrentMode">刷新</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTabValue" class="courier-tabs">
        <el-tab-pane v-for="item in currentTabOptions" :key="item.value" :label="item.label" :name="item.value" />
      </el-tabs>

      <el-form :inline="true" :model="currentFilters" class="courier-filters" @submit.prevent>
        <el-form-item label="任务号">
          <el-input v-model="currentFilters.task_no" clearable :placeholder="workbenchMode === 'pickup' ? '请输入揽收任务号' : '请输入派送任务号'" @keyup.enter="loadCurrentTasks" />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="currentFilters.order_no" clearable placeholder="请输入订单号" @keyup.enter="loadCurrentTasks" />
        </el-form-item>
        <el-form-item v-if="currentCanCreate" label="站点">
          <el-select v-model="currentFilters.station_id" clearable placeholder="全部站点" style="width: 220px">
            <el-option label="全部站点" :value="undefined" />
            <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCurrentTasks">查询</el-button>
          <el-button @click="resetCurrentFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="currentLoading" :data="currentRows" stripe>
        <el-table-column label="任务 / 订单" min-width="230">
          <template #default="scope">
            <div class="courier-identity">
              <strong>{{ scope.row.task_no }}</strong>
              <span>{{ scope.row.order_no }}</span>
              <small>{{ scope.row.order_status_name }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="workbenchMode === 'pickup' ? '发件信息' : '收件信息'" min-width="250">
          <template #default="scope">
            <div class="courier-identity">
              <strong>{{ normalizeText(scope.row.contact_name, '未填写') }}</strong>
              <span>{{ normalizeText(scope.row.contact_phone, '无电话') }}</span>
              <small>{{ normalizeText(scope.row.address, '无地址') }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="任务状态" width="120">
          <template #default="scope">
            <el-tag effect="dark" :type="tagType(scope.row.status)">{{ scope.row.status_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="快递员 / 站点" min-width="200">
          <template #default="scope">
            <div class="courier-identity">
              <strong>{{ normalizeText(scope.row.courier_name, '待认领') }}</strong>
              <span>{{ normalizeText(scope.row.station_name, '未知站点') }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="关键时间" min-width="220">
          <template #default="scope">
            <div class="courier-time">
              <span>认领 {{ formatUnix(scope.row.assign_time) }}</span>
              <span>开始 {{ formatUnix(scope.row.start_time) }}</span>
              <span>{{ workbenchMode === 'pickup' ? '揽收' : '送达' }} {{ formatUnix(scope.row.finish_time) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="备注 / 失败原因" min-width="220">
          <template #default="scope">
            <div class="courier-identity">
              <span>{{ normalizeText(scope.row.remark, '无备注') }}</span>
              <small v-if="scope.row.failure_reason">{{ scope.row.failure_reason }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="300">
          <template #default="scope">
            <div class="courier-actions">
              <el-button v-if="canClaim(scope.row)" link type="primary" @click="claimTask(scope.row)">认领</el-button>
              <el-button v-if="canStart(scope.row)" link type="primary" @click="startTask(scope.row)">{{ workbenchMode === 'pickup' ? '开始揽收' : '开始派送' }}</el-button>
              <el-button v-if="canComplete(scope.row)" link type="success" @click="completeTask(scope.row)">{{ workbenchMode === 'pickup' ? '确认揽收' : '确认送达' }}</el-button>
              <el-button v-if="canSign(scope.row)" link type="success" @click="openSignDialog(scope.row)">签收</el-button>
              <el-button v-if="canFail(scope.row)" link type="danger" @click="openFailDialog(scope.row)">{{ workbenchMode === 'pickup' ? '揽收失败' : '派送失败' }}</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="courier-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="currentPagination.total"
          :current-page="currentPagination.page"
          :page-size="currentPagination.pageSize"
          @current-change="handleCurrentPageChange"
        />
      </div>
    </div>

    <el-dialog v-model="failDialogVisible" :title="workbenchMode === 'pickup' ? '登记揽收失败' : '登记派送失败'" width="560px">
      <el-form label-position="top">
        <el-form-item label="任务">
          <el-input :model-value="selectedRow?.task_no || ''" disabled />
        </el-form-item>
        <el-form-item label="异常类型">
          <el-select v-model="failForm.exception_type" style="width: 100%">
            <el-option v-for="item in failTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="失败原因">
          <el-input v-model="failForm.reason" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请输入失败原因" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="failForm.remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="可选，填写补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="failDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="failSubmitting" @click="submitFail">提交失败登记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="signDialogVisible" title="确认签收" width="560px">
      <el-form label-position="top">
        <el-form-item label="任务">
          <el-input :model-value="selectedRow?.task_no || ''" disabled />
        </el-form-item>
        <el-form-item label="签收方式">
          <el-select v-model="signForm.sign_type" style="width: 100%">
            <el-option v-for="item in signTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="签收人">
          <el-input v-model="signForm.signer_name" clearable placeholder="请输入签收人姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="signForm.signer_phone" clearable placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="关系">
          <el-input v-model="signForm.relation" clearable placeholder="如：本人 / 家属 / 前台" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="signForm.remark" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="可选，填写签收补充说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="signDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="signSubmitting" @click="submitSign">提交签收</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/auth'
import http from '@/utils/http'

type StationOption = { id: number; station_code: string; name: string }
type StationListResponse = { list: StationOption[]; total: number; page: number; page_size: number; pages: number }
type PickupTaskItem = { id: number; task_no: string; order_no: string; courier_id: number; courier_name: string; station_name: string; status: string; status_name: string; order_status_name: string; sender_name: string; sender_phone: string; sender_address: string; assign_time: number; start_time: number; pickup_time: number; failure_reason: string; remark: string }
type PickupTaskListResponse = { list: PickupTaskItem[]; total: number; page: number; page_size: number; pages: number }
type PickupTaskSummary = { pending_pool: number; pending_assigned: number; picking_up: number; picked_up: number; failed: number; total: number }
type DeliveryTaskItem = { id: number; task_no: string; order_no: string; courier_id: number; courier_name: string; station_name: string; status: string; status_name: string; order_status_name: string; receiver_name: string; receiver_phone: string; receiver_address: string; assign_time: number; start_time: number; delivered_time: number; sign_time: number; failure_reason: string; remark: string }
type DeliveryTaskListResponse = { list: DeliveryTaskItem[]; total: number; page: number; page_size: number; pages: number }
type DeliveryTaskSummary = { pending_pool: number; pending_assigned: number; delivering: number; delivered: number; signed: number; failed: number; total: number }
type TaskRow = { id: number; task_no: string; order_no: string; courier_id: number; courier_name: string; station_name: string; status: string; status_name: string; order_status_name: string; contact_name: string; contact_phone: string; address: string; assign_time: number; start_time: number; finish_time: number; failure_reason: string; remark: string }

const authStore = useAuthStore()
const isCourier = computed(() => authStore.user?.role === 2)
const canCreatePickup = computed(() => authStore.permissions.includes('pickup:create'))
const canCreateDelivery = computed(() => authStore.permissions.includes('delivery:create'))

const workbenchMode = ref<'pickup' | 'delivery'>('pickup')
const stationOptions = ref<StationOption[]>([])

const pickupSummary = reactive<PickupTaskSummary>({ pending_pool: 0, pending_assigned: 0, picking_up: 0, picked_up: 0, failed: 0, total: 0 })
const deliverySummary = reactive<DeliveryTaskSummary>({ pending_pool: 0, pending_assigned: 0, delivering: 0, delivered: 0, signed: 0, failed: 0, total: 0 })

const pickupTasks = ref<PickupTaskItem[]>([])
const deliveryTasks = ref<DeliveryTaskItem[]>([])
const pickupLoading = ref(false)
const deliveryLoading = ref(false)
const pickupCreateLoading = ref(false)
const deliveryCreateLoading = ref(false)
const failSubmitting = ref(false)
const signSubmitting = ref(false)

const pickupPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const deliveryPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const pickupFilters = reactive({ task_no: '', order_no: '', station_id: undefined as number | undefined })
const deliveryFilters = reactive({ task_no: '', order_no: '', station_id: undefined as number | undefined })
const pickupCreateForm = reactive({ order_no: '', station_id: undefined as number | undefined, remark: '' })
const deliveryCreateForm = reactive({ order_no: '', station_id: undefined as number | undefined, remark: '' })

const pickupActiveTab = ref<'pool' | 'my-pending' | 'picking' | 'picked' | 'failed' | 'all'>('all')
const deliveryActiveTab = ref<'pool' | 'my-pending' | 'delivering' | 'delivered' | 'signed' | 'failed' | 'all'>('all')

const selectedRow = ref<TaskRow | null>(null)
const failDialogVisible = ref(false)
const signDialogVisible = ref(false)
const failForm = reactive({ exception_type: 7, reason: '', remark: '' })
const signForm = reactive({ sign_type: 1, signer_name: '', signer_phone: '', relation: '', remark: '' })

const currentCanCreate = computed(() => (workbenchMode.value === 'pickup' ? canCreatePickup.value : canCreateDelivery.value))
const currentCreateForm = computed(() => (workbenchMode.value === 'pickup' ? pickupCreateForm : deliveryCreateForm))
const currentCreateLoading = computed(() => (workbenchMode.value === 'pickup' ? pickupCreateLoading.value : deliveryCreateLoading.value))
const currentFilters = computed(() => (workbenchMode.value === 'pickup' ? pickupFilters : deliveryFilters))
const currentLoading = computed(() => (workbenchMode.value === 'pickup' ? pickupLoading.value : deliveryLoading.value))
const currentPagination = computed(() => (workbenchMode.value === 'pickup' ? pickupPagination : deliveryPagination))

const pickupTabOptions = computed(() => isCourier.value
  ? [
      { value: 'pool', label: `待认领 ${pickupSummary.pending_pool}` },
      { value: 'my-pending', label: `我的待揽收 ${pickupSummary.pending_assigned}` },
      { value: 'picking', label: `揽收中 ${pickupSummary.picking_up}` },
      { value: 'picked', label: `已揽收 ${pickupSummary.picked_up}` },
      { value: 'failed', label: `揽收失败 ${pickupSummary.failed}` },
    ]
  : [
      { value: 'all', label: `全部任务 ${pickupSummary.total}` },
      { value: 'pool', label: `待认领 ${pickupSummary.pending_pool}` },
      { value: 'my-pending', label: `待揽收 ${pickupSummary.pending_pool + pickupSummary.pending_assigned}` },
      { value: 'picking', label: `揽收中 ${pickupSummary.picking_up}` },
      { value: 'picked', label: `已揽收 ${pickupSummary.picked_up}` },
      { value: 'failed', label: `揽收失败 ${pickupSummary.failed}` },
    ])

const deliveryTabOptions = computed(() => isCourier.value
  ? [
      { value: 'pool', label: `待认领 ${deliverySummary.pending_pool}` },
      { value: 'my-pending', label: `我的待派送 ${deliverySummary.pending_assigned}` },
      { value: 'delivering', label: `派送中 ${deliverySummary.delivering}` },
      { value: 'delivered', label: `待签收 ${deliverySummary.delivered}` },
      { value: 'signed', label: `已签收 ${deliverySummary.signed}` },
      { value: 'failed', label: `派送失败 ${deliverySummary.failed}` },
    ]
  : [
      { value: 'all', label: `全部任务 ${deliverySummary.total}` },
      { value: 'pool', label: `待认领 ${deliverySummary.pending_pool}` },
      { value: 'my-pending', label: `待派送 ${deliverySummary.pending_pool + deliverySummary.pending_assigned}` },
      { value: 'delivering', label: `派送中 ${deliverySummary.delivering}` },
      { value: 'delivered', label: `待签收 ${deliverySummary.delivered}` },
      { value: 'signed', label: `已签收 ${deliverySummary.signed}` },
      { value: 'failed', label: `派送失败 ${deliverySummary.failed}` },
    ])

const currentTabOptions = computed(() => (workbenchMode.value === 'pickup' ? pickupTabOptions.value : deliveryTabOptions.value))
const activeTabValue = computed({
  get: () => (workbenchMode.value === 'pickup' ? pickupActiveTab.value : deliveryActiveTab.value),
  set: (value: string) => {
    if (workbenchMode.value === 'pickup') pickupActiveTab.value = value as typeof pickupActiveTab.value
    else deliveryActiveTab.value = value as typeof deliveryActiveTab.value
  },
})
const currentActiveLabel = computed(() => currentTabOptions.value.find((item) => item.value === activeTabValue.value)?.label || '任务列表')

const currentRows = computed<TaskRow[]>(() => workbenchMode.value === 'pickup'
  ? pickupTasks.value.map((item) => ({
      id: item.id, task_no: item.task_no, order_no: item.order_no, courier_id: item.courier_id, courier_name: item.courier_name, station_name: item.station_name,
      status: item.status, status_name: item.status_name, order_status_name: item.order_status_name, contact_name: item.sender_name, contact_phone: item.sender_phone,
      address: item.sender_address, assign_time: item.assign_time, start_time: item.start_time, finish_time: item.pickup_time, failure_reason: item.failure_reason, remark: item.remark,
    }))
  : deliveryTasks.value.map((item) => ({
      id: item.id, task_no: item.task_no, order_no: item.order_no, courier_id: item.courier_id, courier_name: item.courier_name, station_name: item.station_name,
      status: item.status, status_name: item.status_name, order_status_name: item.order_status_name, contact_name: item.receiver_name, contact_phone: item.receiver_phone,
      address: item.receiver_address, assign_time: item.assign_time, start_time: item.start_time, finish_time: item.delivered_time, failure_reason: item.failure_reason, remark: item.remark,
    })))

const currentStatCards = computed(() => workbenchMode.value === 'pickup'
  ? [
      { label: '待认领', value: pickupSummary.pending_pool },
      { label: isCourier.value ? '我的待揽收' : '待揽收', value: isCourier.value ? pickupSummary.pending_assigned : pickupSummary.pending_pool + pickupSummary.pending_assigned },
      { label: '揽收中', value: pickupSummary.picking_up },
      { label: '已揽收', value: pickupSummary.picked_up },
      { label: '揽收失败', value: pickupSummary.failed },
    ]
  : [
      { label: '待认领', value: deliverySummary.pending_pool },
      { label: isCourier.value ? '我的待派送' : '待派送', value: isCourier.value ? deliverySummary.pending_assigned : deliverySummary.pending_pool + deliverySummary.pending_assigned },
      { label: '派送中', value: deliverySummary.delivering },
      { label: '待签收', value: deliverySummary.delivered },
      { label: '已签收', value: deliverySummary.signed },
      { label: '派送失败', value: deliverySummary.failed },
    ])

const failTypeOptions = computed(() => workbenchMode.value === 'pickup'
  ? [{ value: 5, label: '地址错误' }, { value: 7, label: '其他' }]
  : [{ value: 4, label: '拒收' }, { value: 5, label: '地址错误' }, { value: 7, label: '其他' }])

const signTypeOptions = [
  { value: 1, label: '本人签收' },
  { value: 2, label: '代收' },
  { value: 3, label: '快递柜' },
  { value: 4, label: '驿站' },
  { value: 5, label: '拒收' },
]

function normalizeText(value: string | null | undefined, fallback = '-') {
  const text = String(value ?? '').trim()
  return text ? text : fallback
}

function formatUnix(value: number | undefined | null) {
  if (!value) return '-'
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

function tagType(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return ({
    pending: 'warning',
    picking_up: 'primary',
    picked_up: 'success',
    delivering: 'primary',
    delivered: 'success',
    signed: 'success',
    failed: 'danger',
  } as Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'>)[status] || 'info'
}

function buildPickupQuery() {
  const params: Record<string, string | number> = { page: pickupPagination.page, page_size: pickupPagination.pageSize }
  if (pickupFilters.task_no.trim()) params.task_no = pickupFilters.task_no.trim()
  if (pickupFilters.order_no.trim()) params.order_no = pickupFilters.order_no.trim()
  if (typeof pickupFilters.station_id === 'number') params.station_id = pickupFilters.station_id
  switch (pickupActiveTab.value) {
    case 'pool': params.scope = 'pool'; params.status = 'pending'; break
    case 'my-pending': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'pending'; break
    case 'picking': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'picking_up'; break
    case 'picked': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'picked_up'; break
    case 'failed': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'failed'; break
    default: params.scope = 'all'
  }
  return params
}

function buildDeliveryQuery() {
  const params: Record<string, string | number> = { page: deliveryPagination.page, page_size: deliveryPagination.pageSize }
  if (deliveryFilters.task_no.trim()) params.task_no = deliveryFilters.task_no.trim()
  if (deliveryFilters.order_no.trim()) params.order_no = deliveryFilters.order_no.trim()
  if (typeof deliveryFilters.station_id === 'number') params.station_id = deliveryFilters.station_id
  switch (deliveryActiveTab.value) {
    case 'pool': params.scope = 'pool'; params.status = 'pending'; break
    case 'my-pending': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'pending'; break
    case 'delivering': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'delivering'; break
    case 'delivered': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'delivered'; break
    case 'signed': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'signed'; break
    case 'failed': params.scope = isCourier.value ? 'my' : 'all'; params.status = 'failed'; break
    default: params.scope = 'all'
  }
  return params
}

async function loadStations() {
  if (!canCreatePickup.value && !canCreateDelivery.value) return
  const data = await http.get<never, StationListResponse>('/stations', { params: { page: 1, page_size: 100, status: 1 } })
  stationOptions.value = data.list || []
}

async function loadPickupSummary() {
  Object.assign(pickupSummary, await http.get<never, PickupTaskSummary>('/pickup/tasks/summary'))
}

async function loadPickupTasks() {
  pickupLoading.value = true
  try {
    const data = await http.get<never, PickupTaskListResponse>('/pickup/tasks', { params: buildPickupQuery() })
    pickupTasks.value = data.list || []
    pickupPagination.total = data.total || 0
  } finally {
    pickupLoading.value = false
  }
}

async function loadDeliverySummary() {
  Object.assign(deliverySummary, await http.get<never, DeliveryTaskSummary>('/delivery/tasks/summary'))
}

async function loadDeliveryTasks() {
  deliveryLoading.value = true
  try {
    const data = await http.get<never, DeliveryTaskListResponse>('/delivery/tasks', { params: buildDeliveryQuery() })
    deliveryTasks.value = data.list || []
    deliveryPagination.total = data.total || 0
  } finally {
    deliveryLoading.value = false
  }
}

async function refreshPickup() { await Promise.all([loadPickupSummary(), loadPickupTasks()]) }
async function refreshDelivery() { await Promise.all([loadDeliverySummary(), loadDeliveryTasks()]) }
async function refreshCurrentMode() { if (workbenchMode.value === 'pickup') await refreshPickup(); else await refreshDelivery() }
async function loadCurrentTasks() { if (workbenchMode.value === 'pickup') await loadPickupTasks(); else await loadDeliveryTasks() }

function resetCurrentFilters() {
  if (workbenchMode.value === 'pickup') {
    pickupFilters.task_no = ''; pickupFilters.order_no = ''; pickupFilters.station_id = undefined; pickupPagination.page = 1; void loadPickupTasks()
  } else {
    deliveryFilters.task_no = ''; deliveryFilters.order_no = ''; deliveryFilters.station_id = undefined; deliveryPagination.page = 1; void loadDeliveryTasks()
  }
}

function handleCurrentPageChange(page: number) {
  if (workbenchMode.value === 'pickup') { pickupPagination.page = page; void loadPickupTasks() }
  else { deliveryPagination.page = page; void loadDeliveryTasks() }
}

async function submitCreateTask() {
  if (!currentCreateForm.value.order_no.trim()) { ElMessage.warning('请输入订单号'); return }
  if (!currentCreateForm.value.station_id) { ElMessage.warning('请选择站点'); return }
  if (workbenchMode.value === 'pickup') {
    pickupCreateLoading.value = true
    try {
      await http.post('/pickup/tasks', { order_no: pickupCreateForm.order_no.trim(), station_id: pickupCreateForm.station_id, remark: pickupCreateForm.remark.trim() })
      ElMessage.success('待揽收任务已生成')
      pickupCreateForm.order_no = ''; pickupCreateForm.station_id = undefined; pickupCreateForm.remark = ''
      await refreshPickup()
    } finally { pickupCreateLoading.value = false }
  } else {
    deliveryCreateLoading.value = true
    try {
      await http.post('/delivery/tasks', { order_no: deliveryCreateForm.order_no.trim(), station_id: deliveryCreateForm.station_id, remark: deliveryCreateForm.remark.trim() })
      ElMessage.success('待派送任务已生成')
      deliveryCreateForm.order_no = ''; deliveryCreateForm.station_id = undefined; deliveryCreateForm.remark = ''
      await refreshDelivery()
    } finally { deliveryCreateLoading.value = false }
  }
}

function canClaim(row: TaskRow) { return isCourier.value && row.status === 'pending' && !row.courier_id }
function canStart(row: TaskRow) { return isCourier.value && row.status === 'pending' && row.courier_id === authStore.user?.id }
function canComplete(row: TaskRow) { return isCourier.value && row.courier_id === authStore.user?.id && ((workbenchMode.value === 'pickup' && row.status === 'picking_up') || (workbenchMode.value === 'delivery' && row.status === 'delivering')) }
function canSign(row: TaskRow) { return workbenchMode.value === 'delivery' && isCourier.value && row.status === 'delivered' && row.courier_id === authStore.user?.id }
function canFail(row: TaskRow) { return isCourier.value && row.courier_id === authStore.user?.id && ['pending', workbenchMode.value === 'pickup' ? 'picking_up' : 'delivering'].includes(row.status) }

async function claimTask(row: TaskRow) {
  if (workbenchMode.value === 'pickup') await http.post(`/pickup/tasks/${row.id}/claim`, {})
  else await http.post(`/delivery/tasks/${row.id}/claim`, {})
  ElMessage.success('任务已认领')
  await refreshCurrentMode()
}

async function startTask(row: TaskRow) {
  if (workbenchMode.value === 'pickup') await http.post(`/pickup/tasks/${row.id}/start`, {})
  else await http.post(`/delivery/tasks/${row.id}/start`, {})
  ElMessage.success(workbenchMode.value === 'pickup' ? '已开始揽收' : '已开始派送')
  await refreshCurrentMode()
}

async function completeTask(row: TaskRow) {
  if (workbenchMode.value === 'pickup') await http.post(`/pickup/tasks/${row.id}/complete`, {})
  else await http.post(`/delivery/tasks/${row.id}/deliver`, {})
  ElMessage.success(workbenchMode.value === 'pickup' ? '已确认揽收' : '已确认送达')
  await refreshCurrentMode()
}

function openFailDialog(row: TaskRow) {
  selectedRow.value = row
  failForm.exception_type = workbenchMode.value === 'pickup' ? 7 : 5
  failForm.reason = ''
  failForm.remark = ''
  failDialogVisible.value = true
}

async function submitFail() {
  if (!selectedRow.value) return
  if (!failForm.reason.trim()) { ElMessage.warning('请输入失败原因'); return }
  failSubmitting.value = true
  try {
    if (workbenchMode.value === 'pickup') {
      await http.post(`/pickup/tasks/${selectedRow.value.id}/fail`, { exception_type: failForm.exception_type, reason: failForm.reason.trim(), remark: failForm.remark.trim() })
      ElMessage.success('揽收失败已登记')
      await refreshPickup()
    } else {
      await http.post(`/delivery/tasks/${selectedRow.value.id}/fail`, { exception_type: failForm.exception_type, reason: failForm.reason.trim(), remark: failForm.remark.trim() })
      ElMessage.success('派送失败已登记')
      await refreshDelivery()
    }
    failDialogVisible.value = false
  } finally { failSubmitting.value = false }
}

function openSignDialog(row: TaskRow) {
  selectedRow.value = row
  signForm.sign_type = 1
  signForm.signer_name = row.contact_name || ''
  signForm.signer_phone = row.contact_phone || ''
  signForm.relation = '本人'
  signForm.remark = ''
  signDialogVisible.value = true
}

async function submitSign() {
  if (!selectedRow.value) return
  signSubmitting.value = true
  try {
    await http.post(`/delivery/tasks/${selectedRow.value.id}/sign`, {
      sign_type: signForm.sign_type,
      signer_name: signForm.signer_name.trim(),
      signer_phone: signForm.signer_phone.trim(),
      relation: signForm.relation.trim(),
      remark: signForm.remark.trim(),
    })
    ElMessage.success('签收已登记')
    signDialogVisible.value = false
    await refreshDelivery()
  } finally { signSubmitting.value = false }
}

watch(workbenchMode, () => {
  if (workbenchMode.value === 'pickup') { pickupPagination.page = 1; void refreshPickup() }
  else { deliveryPagination.page = 1; void refreshDelivery() }
})

watch(pickupActiveTab, () => {
  if (workbenchMode.value === 'pickup') { pickupPagination.page = 1; void loadPickupTasks() }
})

watch(deliveryActiveTab, () => {
  if (workbenchMode.value === 'delivery') { deliveryPagination.page = 1; void loadDeliveryTasks() }
})

onMounted(async () => {
  pickupActiveTab.value = isCourier.value ? 'pool' : 'all'
  deliveryActiveTab.value = isCourier.value ? 'pool' : 'all'
  await Promise.all([loadStations(), refreshPickup(), refreshDelivery()])
})
</script>

<style scoped>
.courier-workbench-view { display: flex; flex-direction: column; gap: 1rem; }
.courier-hero, .courier-panel, .courier-stats { padding: 1.5rem; }
.courier-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.courier-hero h1 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.courier-hero p { max-width: 50rem; color: var(--muted); line-height: 1.75; }
.courier-hero__switch { display: flex; flex-direction: column; gap: 0.75rem; min-width: 20rem; }
.courier-hero__switch span { color: var(--muted); font-size: 0.9rem; }
.courier-stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.9rem; }
.courier-stats article { padding: 0.95rem 1rem; border-radius: 18px; background: rgba(35, 102, 160, 0.08); border: 1px solid rgba(35, 102, 160, 0.14); }
.courier-stats span { display: block; color: var(--muted); font-size: 0.84rem; margin-bottom: 0.35rem; }
.courier-stats strong { font-size: 1.35rem; color: var(--accent-deep); }
.courier-panel__toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
.courier-panel__toolbar strong { color: var(--ink); }
.courier-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.courier-tabs { margin-bottom: 0.5rem; }
.courier-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.courier-identity { display: flex; flex-direction: column; gap: 0.2rem; }
.courier-identity span, .courier-identity small { color: var(--muted); }
.courier-time { display: flex; flex-direction: column; gap: 0.2rem; color: var(--muted); }
.courier-actions { display: flex; gap: 0.45rem; white-space: nowrap; }
.courier-pagination { display: flex; justify-content: flex-end; margin-top: 1rem; }
@media (max-width: 1280px) { .courier-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1080px) { .courier-hero { flex-direction: column; } .courier-hero__switch { min-width: auto; } }
@media (max-width: 720px) { .courier-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
