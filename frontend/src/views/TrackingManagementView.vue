<template>
  <section class="tracking-management-view">
    <div class="tracking-hero card-panel">
      <div>
        <p class="eyebrow">Tracking Console</p>
        <h1>物流追踪</h1>
        <p>当前页面已接入追踪记录、订单历史、时间轴、时效预警和人工补录，适合作为追踪模块联调与演示入口。</p>
        <div class="tracking-hero__chips">
          <span v-for="item in topWarnings" :key="`${item.order_id}-${item.warning_type}`">{{ item.order_no }} {{ item.warning_type_name }}</span>
        </div>
      </div>
      <div class="tracking-hero__stats">
        <article><span>追踪记录</span><strong>{{ recordPagination.total }}</strong></article>
        <article><span>预警订单</span><strong>{{ warningPagination.total }}</strong></article>
        <article><span>严重预警</span><strong>{{ criticalWarningCount }}</strong></article>
        <article><span>延误订单</span><strong>{{ delayedWarningCount }}</strong></article>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="tracking-tabs">
      <el-tab-pane label="追踪记录" name="records">
        <div class="card-panel tracking-panel">
          <div class="tracking-panel__toolbar">
            <div>
              <p class="eyebrow">Records</p>
              <strong>追踪记录查询、人工补录与订单时间轴查看</strong>
            </div>
            <div class="tracking-panel__toolbar-actions">
              <el-button @click="refreshTrackingOverview">刷新概览</el-button>
              <el-button type="primary" @click="openCreateDialog()">新增追踪记录</el-button>
            </div>
          </div>

          <el-form :inline="true" :model="recordFilters" class="tracking-filters" @submit.prevent>
            <el-form-item label="订单号">
              <el-input v-model="recordFilters.order_no" clearable placeholder="请输入订单号" @keyup.enter="applyRecordFilters" />
            </el-form-item>
            <el-form-item label="追踪状态">
              <el-input v-model="recordFilters.status" clearable placeholder="如：运输中 / 清关中" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyRecordFilters">查询</el-button>
              <el-button @click="resetRecordFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="recordLoading" :data="records" class="tracking-table" stripe>
            <el-table-column label="订单" min-width="210">
              <template #default="scope">
                <div class="tracking-identity">
                  <strong>{{ scope.row.order_no }}</strong>
                  <span>{{ normalizeText(scope.row.status, '未知状态') }}</span>
                  <small>{{ normalizeText(scope.row.description, '无描述') }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="位置" min-width="180">
              <template #default="scope">{{ normalizeText(scope.row.location, '未知位置') }}</template>
            </el-table-column>
            <el-table-column label="操作人" min-width="140">
              <template #default="scope">{{ normalizeText(scope.row.operator_name, '系统') }}</template>
            </el-table-column>
            <el-table-column label="追踪时间" min-width="170">
              <template #default="scope">{{ formatUnix(scope.row.track_time) }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="160">
              <template #default="scope">
                <div class="tracking-actions">
                  <el-button link type="primary" @click="openTimeline(scope.row.order_id)">时间轴</el-button>
                  <el-button link type="info" @click="openHistory(scope.row.order_id)">历史</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="tracking-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="recordPagination.total" :current-page="recordPagination.page" :page-size="recordPagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleRecordPageChange" @size-change="handleRecordSizeChange" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="时效预警" name="warnings">
        <div class="card-panel tracking-panel">
          <div class="tracking-panel__toolbar">
            <div>
              <p class="eyebrow">Warnings</p>
              <strong>延误、长时间无更新和时效风险预警</strong>
            </div>
            <div class="tracking-panel__toolbar-actions">
              <el-button @click="loadWarnings">刷新预警</el-button>
            </div>
          </div>

          <div class="summary-grid summary-grid--warning">
            <article class="summary-card card-panel"><span>普通预警</span><strong>{{ warningCount }}</strong></article>
            <article class="summary-card card-panel"><span>严重预警</span><strong>{{ criticalWarningCount }}</strong></article>
            <article class="summary-card card-panel"><span>长时间未更新</span><strong>{{ staleWarningCount }}</strong></article>
            <article class="summary-card card-panel"><span>延误预警</span><strong>{{ delayedWarningCount }}</strong></article>
          </div>

          <el-form :inline="true" :model="warningFilters" class="tracking-filters" @submit.prevent>
            <el-form-item label="订单号">
              <el-input v-model="warningFilters.order_no" clearable placeholder="请输入订单号" @keyup.enter="applyWarningFilters" />
            </el-form-item>
            <el-form-item label="级别">
              <el-select v-model="warningFilters.warning_level" clearable placeholder="全部级别" style="width: 160px">
                <el-option label="全部级别" :value="undefined" />
                <el-option label="警告" value="warning" />
                <el-option label="严重" value="critical" />
              </el-select>
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="warningFilters.warning_type" clearable placeholder="全部类型" style="width: 200px">
                <el-option label="全部类型" :value="undefined" />
                <el-option label="时效风险" value="timeliness" />
                <el-option label="延误预警" value="delay" />
                <el-option label="长时间无更新" value="stale_update" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyWarningFilters">查询</el-button>
              <el-button @click="resetWarningFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="warningLoading" :data="warnings" class="tracking-table" stripe>
            <el-table-column label="订单" min-width="220">
              <template #default="scope">
                <div class="tracking-identity">
                  <strong>{{ scope.row.order_no }}</strong>
                  <span>{{ scope.row.current_status_name }}</span>
                  <small>{{ normalizeText(scope.row.latest_tracking_status, '暂无追踪状态') }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="预警" min-width="210">
              <template #default="scope">
                <div class="tracking-identity">
                  <strong>{{ scope.row.warning_type_name }}</strong>
                  <span>{{ scope.row.warning_level }}</span>
                  <small>{{ normalizeText(scope.row.warning_message, '无预警说明') }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="最新位置" min-width="170">
              <template #default="scope">{{ normalizeText(scope.row.latest_location, '未知位置') }}</template>
            </el-table-column>
            <el-table-column label="剩余 / 逾期" width="160">
              <template #default="scope">
                {{ formatHours(scope.row.remaining_hours) }} / {{ formatHours(scope.row.overdue_hours) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="160">
              <template #default="scope">
                <div class="tracking-actions">
                  <el-button link type="primary" @click="openTimeline(scope.row.order_id)">时间轴</el-button>
                  <el-button link type="warning" @click="openHistory(scope.row.order_id)">历史</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="tracking-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="warningPagination.total" :current-page="warningPagination.page" :page-size="warningPagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleWarningPageChange" @size-change="handleWarningSizeChange" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="createDialogVisible" title="新增追踪记录" width="760px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <div class="tracking-form-grid">
          <el-form-item label="订单" prop="order_id">
            <el-select v-model="createForm.order_id" placeholder="请选择订单" style="width: 100%">
              <el-option v-for="item in orderOptions" :key="item.id" :label="item.order_no" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="追踪状态" prop="status">
            <el-input v-model="createForm.status" placeholder="如：已到达站点 / 清关中" />
          </el-form-item>
          <el-form-item label="位置" prop="location">
            <el-input v-model="createForm.location" placeholder="请输入位置描述" />
          </el-form-item>
          <el-form-item label="追踪时间">
            <el-date-picker v-model="createForm.track_time" type="datetime" value-format="x" placeholder="默认当前时间" style="width: 100%" />
          </el-form-item>
          <el-form-item label="纬度">
            <el-input-number v-model="createForm.latitude" :step="0.0001" :precision="4" style="width: 100%" />
          </el-form-item>
          <el-form-item label="经度">
            <el-input-number v-model="createForm.longitude" :step="0.0001" :precision="4" style="width: 100%" />
          </el-form-item>
          <el-form-item label="描述" class="tracking-form-grid__wide">
            <el-input v-model="createForm.description" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请输入追踪描述" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreateRecord">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="timelineDrawerVisible" size="58%" title="订单追踪时间轴">
      <div class="timeline-drawer" v-loading="timelineLoading">
        <template v-if="timelineData">
          <div class="timeline-hero">
            <div>
              <p class="eyebrow">Timeline</p>
              <h2>{{ timelineData.order_no }}</h2>
              <p>{{ timelineData.current_status_name }} · {{ normalizeText(timelineData.latest_location, '暂无位置') }}</p>
            </div>
            <div class="timeline-hero__tags">
              <el-tag :type="timelineData.is_delayed ? 'danger' : 'success'" effect="dark">{{ timelineData.is_delayed ? '已延误' : '正常' }}</el-tag>
              <el-tag effect="plain">预计送达 {{ formatUnix(timelineData.expected_delivery_time) }}</el-tag>
            </div>
          </div>
          <div class="timeline-list">
            <article v-for="item in timelineData.timeline" :key="item.record_id">
              <strong>{{ normalizeText(item.status, '未知状态') }}</strong>
              <span>{{ item.display_time }}</span>
              <p>{{ normalizeText(item.location, '未知位置') }}</p>
              <small>{{ normalizeText(item.description, '无描述') }}</small>
            </article>
          </div>
        </template>
      </div>
    </el-drawer>

    <el-drawer v-model="historyDrawerVisible" size="58%" title="订单追踪历史">
      <div class="timeline-drawer" v-loading="historyLoading">
        <template v-if="historyData">
          <div class="timeline-hero">
            <div>
              <p class="eyebrow">History</p>
              <h2>{{ historyData.order_no }}</h2>
              <p>{{ historyData.current_status_name }}</p>
            </div>
          </div>
          <el-table :data="historyData.list" size="small" stripe>
            <el-table-column prop="status" label="状态" min-width="160" />
            <el-table-column prop="location" label="位置" min-width="180" />
            <el-table-column prop="operator_name" label="操作人" min-width="120">
              <template #default="scope">{{ normalizeText(scope.row.operator_name, '系统') }}</template>
            </el-table-column>
            <el-table-column label="时间" min-width="160">
              <template #default="scope">{{ formatUnix(scope.row.track_time) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" />
          </el-table>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRoute } from 'vue-router'

import http from '@/utils/http'
import { readQueryEnum } from '@/utils/workbench'

type OrderOption = { id: number; order_no: string; status_name: string }
type OrderListResponse = { list: OrderOption[]; total: number; page: number; page_size: number; pages: number }
type TrackingRecordItem = { id: number; order_id: number; order_no: string; location: string; latitude: number; longitude: number; status: string; description: string; operator_id: number; operator_name: string; track_time: number; create_time: string; update_time: string }
type TrackingRecordListResponse = { list: TrackingRecordItem[]; total: number; page: number; page_size: number; pages: number }
type TrackingWarningItem = { order_id: number; order_no: string; current_status: number; current_status_name: string; latest_tracking_status: string; latest_location: string; latest_track_time: number; expected_delivery_time: number; remaining_hours: number; overdue_hours: number; warning_level: string; warning_type: string; warning_type_name: string; warning_message: string }
type TrackingWarningListResponse = { list: TrackingWarningItem[]; total: number; page: number; page_size: number; pages: number; warning_count: number; critical_count: number }
type TrackingHistory = { order_id: number; order_no: string; current_status: number; current_status_name: string; list: TrackingRecordItem[] }
type TrackingTimelineItem = { record_id: number; status: string; description: string; location: string; latitude: number; longitude: number; operator_id: number; operator_name: string; track_time: number; display_time: string }
type TrackingTimeline = { order_id: number; order_no: string; current_status: number; current_status_name: string; expected_delivery_time: number; is_delayed: boolean; delay_hours: number; latest_location: string; latest_track_time: number; timeline: TrackingTimelineItem[] }

const route = useRoute()
const activeTab = ref('records')
const records = ref<TrackingRecordItem[]>([])
const warnings = ref<TrackingWarningItem[]>([])
const orderOptions = ref<OrderOption[]>([])
const timelineData = ref<TrackingTimeline | null>(null)
const historyData = ref<TrackingHistory | null>(null)
const recordLoading = ref(false)
const warningLoading = ref(false)
const timelineLoading = ref(false)
const historyLoading = ref(false)
const createSubmitting = ref(false)
const createDialogVisible = ref(false)
const timelineDrawerVisible = ref(false)
const historyDrawerVisible = ref(false)

const recordPagination = reactive({ total: 0, page: 1, pageSize: 10 })
const warningPagination = reactive({ total: 0, page: 1, pageSize: 10 })

const recordFilters = reactive({ order_no: '', status: '' })
const warningFilters = reactive({ order_no: '', warning_level: undefined as string | undefined, warning_type: undefined as string | undefined })

const createFormRef = ref<FormInstance>()
const createForm = reactive({ order_id: undefined as number | undefined, location: '', latitude: 0, longitude: 0, status: '', description: '', track_time: undefined as string | undefined })
const createRules: FormRules<typeof createForm> = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }], location: [{ required: true, message: '请输入追踪位置', trigger: 'blur' }], status: [{ required: true, message: '请输入追踪状态', trigger: 'blur' }] }

const topWarnings = computed(() => warnings.value.slice(0, 4))
const criticalWarningCount = computed(() => warnings.value.filter((item) => item.warning_level === 'critical').length)
const delayedWarningCount = computed(() => warnings.value.filter((item) => item.warning_type === 'delay').length)
const staleWarningCount = computed(() => warnings.value.filter((item) => item.warning_type === 'stale_update').length)
const warningCount = computed(() => warnings.value.filter((item) => item.warning_level === 'warning').length)

function normalizeText(value: string | null | undefined, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text)) return fallback; return text }
function formatUnix(value: number | undefined | null) { if (!value) return '-'; const date = new Date(value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }) }
function formatHours(value: number | undefined) { return `${(Number(value) || 0).toFixed(1)} h` }

function applyWorkbenchFilters() {
  const tab = readQueryEnum(route.query, 'tab', ['records', 'warnings'] as const)
  const warningLevel = readQueryEnum(route.query, 'warning_level', ['warning', 'critical'] as const)
  const warningType = readQueryEnum(route.query, 'warning_type', ['timeliness', 'delay', 'stale_update'] as const)

  if (tab) {
    activeTab.value = tab
  }
  if (warningLevel) {
    warningFilters.warning_level = warningLevel
  }
  if (warningType) {
    warningFilters.warning_type = warningType
  }
}

function buildRecordParams() { const params: Record<string, string | number> = { page: recordPagination.page, page_size: recordPagination.pageSize }; if (recordFilters.order_no.trim()) params.order_no = recordFilters.order_no.trim(); if (recordFilters.status.trim()) params.status = recordFilters.status.trim(); return params }
function buildWarningParams() { const params: Record<string, string | number> = { page: warningPagination.page, page_size: warningPagination.pageSize }; if (warningFilters.order_no?.trim()) params.order_no = warningFilters.order_no.trim(); if (warningFilters.warning_level) params.warning_level = warningFilters.warning_level; if (warningFilters.warning_type) params.warning_type = warningFilters.warning_type; return params }

async function loadOrderOptions() { const data = await http.get<never, OrderListResponse>('/orders', { params: { page: 1, page_size: 100 } }); orderOptions.value = data.list || [] }
async function loadRecords() { recordLoading.value = true; try { const data = await http.get<never, TrackingRecordListResponse>('/tracking/records', { params: buildRecordParams() }); records.value = data.list || []; recordPagination.total = data.total || 0; recordPagination.page = data.page || recordPagination.page; recordPagination.pageSize = data.page_size || recordPagination.pageSize } finally { recordLoading.value = false } }
async function loadWarnings() { warningLoading.value = true; try { const data = await http.get<never, TrackingWarningListResponse>('/tracking/warnings', { params: buildWarningParams() }); warnings.value = data.list || []; warningPagination.total = data.total || 0; warningPagination.page = data.page || warningPagination.page; warningPagination.pageSize = data.page_size || warningPagination.pageSize } finally { warningLoading.value = false } }
async function refreshTrackingOverview() { await Promise.all([loadRecords(), loadWarnings()]) }

function openCreateDialog() { createForm.order_id = undefined; createForm.location = ''; createForm.latitude = 0; createForm.longitude = 0; createForm.status = ''; createForm.description = ''; createForm.track_time = undefined; createDialogVisible.value = true; createFormRef.value?.clearValidate() }
async function submitCreateRecord() { if (!createFormRef.value) return; const valid = await createFormRef.value.validate().catch(() => false); if (!valid) return; createSubmitting.value = true; try { await http.post('/tracking/records', { order_id: createForm.order_id, location: createForm.location.trim(), latitude: Number(createForm.latitude), longitude: Number(createForm.longitude), status: createForm.status.trim(), description: createForm.description.trim(), track_time: createForm.track_time ? Math.floor(Number(createForm.track_time) / 1000) : 0 }); ElMessage.success('追踪记录已创建'); createDialogVisible.value = false; await refreshTrackingOverview() } finally { createSubmitting.value = false } }
async function openTimeline(orderID: number) { timelineDrawerVisible.value = true; timelineLoading.value = true; try { timelineData.value = await http.get<never, TrackingTimeline>(`/tracking/orders/${orderID}/timeline`) } finally { timelineLoading.value = false } }
async function openHistory(orderID: number) { historyDrawerVisible.value = true; historyLoading.value = true; try { historyData.value = await http.get<never, TrackingHistory>(`/tracking/orders/${orderID}/history`) } finally { historyLoading.value = false } }

async function applyRecordFilters() { recordPagination.page = 1; await loadRecords() }
function resetRecordFilters() { recordFilters.order_no = ''; recordFilters.status = ''; recordPagination.page = 1; void loadRecords() }
function handleRecordPageChange(page: number) { recordPagination.page = page; void loadRecords() }
function handleRecordSizeChange(size: number) { recordPagination.pageSize = size; recordPagination.page = 1; void loadRecords() }
async function applyWarningFilters() { warningPagination.page = 1; await loadWarnings() }
function resetWarningFilters() { warningFilters.order_no = ''; warningFilters.warning_level = undefined; warningFilters.warning_type = undefined; warningPagination.page = 1; void loadWarnings() }
function handleWarningPageChange(page: number) { warningPagination.page = page; void loadWarnings() }
function handleWarningSizeChange(size: number) { warningPagination.pageSize = size; warningPagination.page = 1; void loadWarnings() }

onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadOrderOptions(), loadRecords(), loadWarnings()]) })
</script>

<style scoped>
.tracking-management-view { display: flex; flex-direction: column; gap: 1rem; }
.tracking-hero, .tracking-panel { padding: 1.5rem; }
.tracking-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.tracking-hero h1, .timeline-hero h2 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.tracking-hero p, .timeline-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.tracking-hero__chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
.tracking-hero__chips span { padding: 0.45rem 0.8rem; border-radius: 999px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.12); color: var(--accent-deep); font-size: 0.85rem; font-weight: 600; }
.tracking-hero__stats, .summary-grid { display: grid; gap: 1rem; }
.tracking-hero__stats { min-width: 18rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.tracking-hero__stats article, .summary-card { padding: 1rem 1.15rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.tracking-hero__stats span, .summary-card span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.tracking-hero__stats strong, .summary-card strong { font-size: 1.5rem; color: var(--accent-deep); }
.summary-grid--warning { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 1rem; }
.tracking-tabs :deep(.el-tabs__header) { margin: 0; }
.tracking-panel__toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
.tracking-panel__toolbar strong { color: var(--ink); }
.tracking-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.tracking-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.tracking-table :deep(.el-table__header th) { background: rgba(238, 77, 45, 0.06); color: var(--accent-deep); }
.tracking-identity { display: flex; flex-direction: column; gap: 0.25rem; }
.tracking-identity strong { color: var(--ink); }
.tracking-identity span, .tracking-identity small { color: var(--muted); }
.tracking-actions { display: flex; gap: 0.45rem; white-space: nowrap; }
.tracking-pagination { display: flex; justify-content: flex-end; margin-top: 1rem; }
.tracking-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; }
.tracking-form-grid__wide { grid-column: 1 / -1; }
.timeline-drawer { display: flex; flex-direction: column; gap: 1rem; min-height: 12rem; }
.timeline-hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.timeline-hero__tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.timeline-list { display: flex; flex-direction: column; gap: 0.75rem; }
.timeline-list article { padding: 1rem 1.1rem; border-radius: 16px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.76); }
.timeline-list strong { color: var(--ink); }
.timeline-list span, .timeline-list p, .timeline-list small { color: var(--muted); display: block; margin-top: 0.2rem; }
@media (max-width: 1024px) { .tracking-hero, .tracking-panel__toolbar, .timeline-hero { flex-direction: column; } .tracking-hero__stats, .summary-grid--warning, .tracking-form-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .tracking-pagination { justify-content: flex-start; overflow: auto; } }
</style>
