<template>
  <section class="exception-management-view">
    <div class="exception-hero card-panel">
      <div>
        <p class="eyebrow">Exception Console</p>
        <h1>异常处理</h1>
        <p>当前页面已接入异常列表、异常统计、异常创建、处理分配与关闭流转，适合作为异常模块联调与业务演示入口。</p>
        <div class="exception-hero__chips">
          <span v-for="item in topStations" :key="item.station_id">{{ normalizeText(item.station_name) }} {{ item.count }} 单异常</span>
        </div>
      </div>
      <div class="exception-hero__stats">
        <article><span>异常总数</span><strong>{{ stats.summary.total_exceptions }}</strong></article>
        <article><span>处理中</span><strong>{{ stats.summary.processing_exceptions }}</strong></article>
        <article><span>已关闭</span><strong>{{ stats.summary.closed_exceptions }}</strong></article>
        <article><span>赔付总额</span><strong>{{ formatMoney(stats.summary.total_compensation) }}</strong></article>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="exception-tabs">
      <el-tab-pane label="异常列表" name="list">
        <div class="card-panel exception-panel">
          <div class="exception-panel__toolbar">
            <div>
              <p class="eyebrow">Exceptions</p>
              <strong>异常检索、详情查看与流转处理</strong>
            </div>
            <div class="exception-panel__toolbar-actions">
              <el-button @click="loadStats">刷新统计</el-button>
              <el-button type="primary" @click="openCreateDialog()">创建异常</el-button>
            </div>
          </div>

          <div class="summary-grid summary-grid--exception">
            <article class="summary-card card-panel"><span>待处理</span><strong>{{ stats.summary.pending_exceptions }}</strong></article>
            <article class="summary-card card-panel"><span>处理中</span><strong>{{ stats.summary.processing_exceptions }}</strong></article>
            <article class="summary-card card-panel"><span>已解决</span><strong>{{ stats.summary.resolved_exceptions }}</strong></article>
            <article class="summary-card card-panel"><span>已关闭</span><strong>{{ stats.summary.closed_exceptions }}</strong></article>
          </div>

          <el-form :inline="true" :model="filters" class="exception-filters" @submit.prevent>
            <el-form-item label="订单号">
              <el-input v-model="filters.order_no" clearable placeholder="请输入订单号" @keyup.enter="applyFilters" />
            </el-form-item>
            <el-form-item label="异常类型">
              <el-select v-model="filters.type" clearable placeholder="全部类型" style="width: 180px">
                <el-option label="全部类型" :value="undefined" />
                <el-option v-for="item in exceptionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="异常状态">
              <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 180px">
                <el-option label="全部状态" :value="undefined" />
                <el-option v-for="item in exceptionStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="站点">
              <el-select v-model="filters.station_id" clearable placeholder="全部站点" style="width: 220px">
                <el-option label="全部站点" :value="undefined" />
                <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyFilters">查询</el-button>
              <el-button @click="resetFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="loading" :data="exceptions" class="exception-table" stripe>
            <el-table-column label="异常" min-width="230">
              <template #default="scope">
                <div class="exception-identity">
                  <strong>{{ scope.row.exception_no }}</strong>
                  <span>{{ scope.row.order_no }}</span>
                  <small>{{ scope.row.type_name }} · {{ scope.row.order_status_name }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="站点 / 上报人" min-width="180">
              <template #default="scope">
                <div class="exception-identity">
                  <strong>{{ normalizeText(scope.row.station_name, '未关联站点') }}</strong>
                  <span>{{ normalizeText(scope.row.reporter_name, '未知上报人') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope"><el-tag :type="exceptionStatusTagType(scope.row.status)" effect="dark">{{ scope.row.status_name }}</el-tag></template>
            </el-table-column>
            <el-table-column label="赔付" width="120">
              <template #default="scope">{{ formatMoney(scope.row.compensate_amount) }}</template>
            </el-table-column>
            <el-table-column label="上报时间" min-width="170">
              <template #default="scope">{{ formatUnix(scope.row.report_time) }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="260">
              <template #default="scope">
                <div class="exception-actions">
                  <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
                  <el-button v-if="canAssign(scope.row.status)" link type="warning" @click="openAssignDialog(scope.row)">分配</el-button>
                  <el-button v-if="canProcess(scope.row.status)" link type="success" @click="openProcessDialog(scope.row)">处理</el-button>
                  <el-button v-if="canClose(scope.row.status)" link type="info" @click="openCloseDialog(scope.row)">关闭</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="exception-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="pagination.total" :current-page="pagination.page" :page-size="pagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handlePageChange" @size-change="handleSizeChange" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="统计概览" name="stats">
        <div class="exception-layout">
          <div class="card-panel exception-panel">
            <div class="exception-panel__toolbar">
              <div>
                <p class="eyebrow">Statistics</p>
                <strong>异常类型、状态和日期分布</strong>
              </div>
              <div class="exception-panel__toolbar-actions">
                <el-button @click="loadStats">刷新统计</el-button>
              </div>
            </div>

            <div class="stats-section">
              <h3>类型分布</h3>
              <div class="stats-list">
                <article v-for="item in stats.by_type" :key="item.type">
                  <strong>{{ item.type_name }}</strong>
                  <span>{{ item.count }} 单</span>
                </article>
              </div>
            </div>

            <div class="stats-section">
              <h3>状态分布</h3>
              <div class="stats-list">
                <article v-for="item in stats.by_status" :key="item.status">
                  <strong>{{ item.status_name }}</strong>
                  <span>{{ item.count }} 单</span>
                </article>
              </div>
            </div>
          </div>

          <div class="exception-side">
            <div class="card-panel sub-panel">
              <div class="sub-panel__head">
                <div>
                  <p class="eyebrow">Station Top</p>
                  <h3>站点异常排行</h3>
                </div>
              </div>
              <div class="side-list">
                <article v-for="item in stats.by_station" :key="item.station_id">
                  <strong>{{ normalizeText(item.station_name) }}</strong>
                  <span>{{ item.count }} 单</span>
                </article>
              </div>
            </div>

            <div class="card-panel sub-panel">
              <div class="sub-panel__head">
                <div>
                  <p class="eyebrow">Daily Trend</p>
                  <h3>日期分布</h3>
                </div>
              </div>
              <div class="side-list">
                <article v-for="item in stats.by_date" :key="item.date">
                  <strong>{{ item.date }}</strong>
                  <span>{{ item.count }} 单</span>
                </article>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="createDialogVisible" title="创建异常" width="820px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <div class="exception-form-grid">
          <el-form-item label="订单" prop="order_id">
            <el-select v-model="createForm.order_id" placeholder="请选择订单" style="width: 100%">
              <el-option v-for="item in orderOptions" :key="item.id" :label="`${item.order_no} / ${item.status_name}`" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="异常类型" prop="type">
            <el-select v-model="createForm.type" placeholder="请选择异常类型" style="width: 100%">
              <el-option v-for="item in exceptionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="站点">
            <el-select v-model="createForm.station_id" clearable placeholder="可选" style="width: 100%">
              <el-option label="不关联站点" :value="undefined" />
              <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="图片链接">
            <el-input v-model="createForm.images_input" placeholder="多个链接请用逗号分隔" />
          </el-form-item>
          <el-form-item label="异常描述" prop="description" class="exception-form-grid__wide">
            <el-input v-model="createForm.description" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="请输入异常描述" />
          </el-form-item>
          <el-form-item label="备注" class="exception-form-grid__wide">
            <el-input v-model="createForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="可选，填写补充说明" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreateException">创建异常</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignDialogVisible" title="分配异常处理人" width="460px">
      <el-form label-position="top">
        <el-form-item label="处理人">
          <el-select v-model="assignForm.handler_id" placeholder="请选择处理人" style="width: 100%">
            <el-option v-for="item in handlerOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" :rows="4" maxlength="300" show-word-limit placeholder="可选，填写分配备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignSubmitting" @click="submitAssign">确认分配</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="processDialogVisible" title="处理异常" width="620px">
      <el-form label-position="top">
        <el-form-item label="处理结果状态">
          <el-radio-group v-model="processForm.status">
            <el-radio :value="2">处理中</el-radio>
            <el-radio :value="3">已解决</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理方案">
          <el-input v-model="processForm.solution" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="请输入处理方案" />
        </el-form-item>
        <el-form-item label="处理结果">
          <el-input v-model="processForm.result" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="请输入处理结果" />
        </el-form-item>
        <el-form-item label="赔付金额">
          <el-input-number v-model="processForm.compensate_amount" :min="0" :step="10" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="processForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="可选，填写处理备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="processSubmitting" @click="submitProcess">确认处理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="closeDialogVisible" title="关闭异常" width="540px">
      <el-form label-position="top">
        <el-form-item label="恢复订单状态">
          <el-select v-model="closeForm.resume_status" clearable placeholder="可选，关闭后恢复订单状态" style="width: 100%">
            <el-option label="不恢复订单状态" :value="undefined" />
            <el-option v-for="item in orderStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关闭结果">
          <el-input v-model="closeForm.result" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="请输入关闭结果" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="closeForm.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="可选，填写关闭备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="closeSubmitting" @click="submitClose">确认关闭</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="58%" title="异常详情">
      <div class="exception-drawer" v-loading="detailLoading">
        <template v-if="detailException">
          <div class="exception-detail__hero">
            <div>
              <p class="eyebrow">Exception Detail</p>
              <h2>{{ detailException.exception_no }}</h2>
              <p>{{ detailException.order_no }} · {{ detailException.type_name }} · {{ detailException.status_name }}</p>
            </div>
            <div class="exception-detail__tags">
              <el-tag :type="exceptionStatusTagType(detailException.status)" effect="dark">{{ detailException.status_name }}</el-tag>
              <el-tag effect="plain">{{ formatMoney(detailException.compensate_amount) }}</el-tag>
            </div>
          </div>
          <div class="exception-detail__grid">
            <article class="exception-detail-card">
              <h3>基础信息</h3>
              <dl>
                <div><dt>订单状态</dt><dd>{{ detailException.order_status_name }}</dd></div>
                <div><dt>站点</dt><dd>{{ normalizeText(detailException.station_name, '未关联站点') }}</dd></div>
                <div><dt>上报人</dt><dd>{{ normalizeText(detailException.reporter_name, '未知上报人') }}</dd></div>
                <div><dt>处理人</dt><dd>{{ normalizeText(detailException.handler_name, '未分配') }}</dd></div>
              </dl>
            </article>
            <article class="exception-detail-card">
              <h3>描述与处理</h3>
              <dl>
                <div><dt>异常描述</dt><dd>{{ normalizeText(detailException.description, '无描述') }}</dd></div>
                <div><dt>处理方案</dt><dd>{{ normalizeText(detailException.solution, '未填写') }}</dd></div>
                <div><dt>处理结果</dt><dd>{{ normalizeText(detailException.result, '未填写') }}</dd></div>
                <div><dt>备注</dt><dd>{{ normalizeText(detailException.remark, '无备注') }}</dd></div>
              </dl>
            </article>
            <article class="exception-detail-card exception-detail-card--full">
              <h3>时间信息</h3>
              <dl>
                <div><dt>上报时间</dt><dd>{{ formatUnix(detailException.report_time) }}</dd></div>
                <div><dt>处理时间</dt><dd>{{ formatUnix(detailException.handle_time) }}</dd></div>
                <div><dt>关闭时间</dt><dd>{{ formatUnix(detailException.close_time) }}</dd></div>
              </dl>
            </article>
          </div>
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
import { readQueryEnum, readQueryNumber } from '@/utils/workbench'

type OrderOption = { id: number; order_no: string; status_name: string }
type OrderListResponse = { list: OrderOption[]; total: number; page: number; page_size: number; pages: number }
type StationOption = { id: number; station_code: string; name: string }
type UserOption = { id: number; username: string; real_name?: string; role: number; role_name: string; status: number }
type UserListResponse = { list: UserOption[]; total: number; page: number; page_size: number; pages: number }
type ExceptionItem = { id: number; exception_no: string; order_id: number; order_no: string; order_status: number; order_status_name: string; type: number; type_name: string; status: number; status_name: string; station_id: number; station_name: string; reporter_id: number; reporter_name: string; handler_id: number; handler_name: string; description: string; images: string[]; solution: string; result: string; compensate_amount: number; report_time: number; handle_time: number; close_time: number; remark: string; create_time: string; update_time: string }
type ExceptionListResponse = { list: ExceptionItem[]; total: number; page: number; page_size: number; pages: number }
type ExceptionStatsResponse = { summary: { total_exceptions: number; pending_exceptions: number; processing_exceptions: number; resolved_exceptions: number; closed_exceptions: number; total_compensation: number }; by_type: Array<{ type: number; type_name: string; count: number }>; by_status: Array<{ status: number; status_name: string; count: number }>; by_station: Array<{ station_id: number; station_name: string; count: number }>; by_date: Array<{ date: string; count: number }> }

const exceptionTypeOptions = [ { value: 1, label: '破损' }, { value: 2, label: '丢失' }, { value: 3, label: '延误' }, { value: 4, label: '错分' }, { value: 5, label: '拒收' }, { value: 6, label: '清关异常' }, { value: 7, label: '其他' } ]
const exceptionStatusOptions = [ { value: 1, label: '待处理' }, { value: 2, label: '处理中' }, { value: 3, label: '已解决' }, { value: 4, label: '已关闭' } ]
const orderStatusOptions = [ { value: 1, label: '待处理' }, { value: 2, label: '已接单' }, { value: 3, label: '已入库' }, { value: 4, label: '分拣中' }, { value: 5, label: '运输中' }, { value: 6, label: '清关中' }, { value: 7, label: '目的地分拣' }, { value: 8, label: '配送中' }, { value: 9, label: '已送达' }, { value: 10, label: '已签收' }, { value: 11, label: '异常' }, { value: 12, label: '已取消' } ]

const route = useRoute()
const activeTab = ref('list')
const exceptions = ref<ExceptionItem[]>([])
const orderOptions = ref<OrderOption[]>([])
const stationOptions = ref<StationOption[]>([])
const userOptions = ref<UserOption[]>([])
const detailException = ref<ExceptionItem | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const createSubmitting = ref(false)
const assignSubmitting = ref(false)
const processSubmitting = ref(false)
const closeSubmitting = ref(false)
const createDialogVisible = ref(false)
const assignDialogVisible = ref(false)
const processDialogVisible = ref(false)
const closeDialogVisible = ref(false)
const detailVisible = ref(false)
const currentExceptionId = ref<number | null>(null)

const pagination = reactive({ total: 0, page: 1, pageSize: 10 })
const filters = reactive({ order_no: '', type: undefined as number | undefined, status: undefined as number | undefined, station_id: undefined as number | undefined })
const stats = reactive<ExceptionStatsResponse>({ summary: { total_exceptions: 0, pending_exceptions: 0, processing_exceptions: 0, resolved_exceptions: 0, closed_exceptions: 0, total_compensation: 0 }, by_type: [], by_status: [], by_station: [], by_date: [] })

const createFormRef = ref<FormInstance>()
const createForm = reactive({ order_id: undefined as number | undefined, type: undefined as number | undefined, station_id: undefined as number | undefined, description: '', images_input: '', remark: '' })
const createRules: FormRules<typeof createForm> = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }], type: [{ required: true, message: '请选择异常类型', trigger: 'change' }], description: [{ required: true, message: '请输入异常描述', trigger: 'blur' }] }
const assignForm = reactive({ handler_id: undefined as number | undefined, remark: '' })
const processForm = reactive({ status: 2, solution: '', result: '', compensate_amount: 0, remark: '' })
const closeForm = reactive({ resume_status: undefined as number | undefined, result: '', remark: '' })

const topStations = computed(() => stats.by_station.slice(0, 4))
const handlerOptions = computed(() => userOptions.value.filter((item) => item.status === 1 && item.role >= 2))

function normalizeText(value: string | null | undefined, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text)) return fallback; return text }
function formatMoney(value: number | undefined) { return `¥${(Number(value) || 0).toFixed(2)}` }
function formatUnix(value: number | undefined | null) { if (!value) return '-'; const date = new Date(value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }) }
function displayUserName(user: UserOption) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})` }
function exceptionStatusTagType(status: number): 'success' | 'warning' | 'info' | 'primary' { return ({ 1: 'info', 2: 'warning', 3: 'success', 4: 'primary' } as Record<number, 'success' | 'warning' | 'info' | 'primary'>)[status] || 'info' }
function canAssign(status: number) { return status === 1 }
function canProcess(status: number) { return status === 1 || status === 2 }
function canClose(status: number) { return status === 2 || status === 3 }

function applyWorkbenchFilters() {
  const tab = readQueryEnum(route.query, 'tab', ['list', 'stats'] as const)
  const status = readQueryNumber(route.query, 'status')

  if (tab) {
    activeTab.value = tab
  }
  if (typeof status === 'number' && exceptionStatusOptions.some((item) => item.value === status)) {
    filters.status = status
  }
}

function buildListParams() { const params: Record<string, string | number> = { page: pagination.page, page_size: pagination.pageSize }; if (filters.order_no.trim()) params.order_no = filters.order_no.trim(); if (typeof filters.type === 'number') params.type = filters.type; if (typeof filters.status === 'number') params.status = filters.status; if (typeof filters.station_id === 'number') params.station_id = filters.station_id; return params }
async function loadOrders() { const data = await http.get<never, OrderListResponse>('/orders', { params: { page: 1, page_size: 100 } }); orderOptions.value = data.list || [] }
async function loadStations() { const data = await http.get<never, { list: StationOption[] }>('/stations', { params: { page: 1, page_size: 100 } }); stationOptions.value = data.list || [] }
async function loadUsers() { const data = await http.get<never, UserListResponse>('/users', { params: { page: 1, page_size: 100 } }); userOptions.value = data.list || [] }
async function loadList() { loading.value = true; try { const data = await http.get<never, ExceptionListResponse>('/exceptions', { params: buildListParams() }); exceptions.value = data.list || []; pagination.total = data.total || 0; pagination.page = data.page || pagination.page; pagination.pageSize = data.page_size || pagination.pageSize } finally { loading.value = false } }
async function loadStats() { Object.assign(stats, await http.get<never, ExceptionStatsResponse>('/exceptions/stats')) }
async function refreshExceptionsOverview() { await Promise.all([loadList(), loadStats()]) }

function openCreateDialog() { createForm.order_id = undefined; createForm.type = undefined; createForm.station_id = undefined; createForm.description = ''; createForm.images_input = ''; createForm.remark = ''; createDialogVisible.value = true; createFormRef.value?.clearValidate() }
async function submitCreateException() { if (!createFormRef.value) return; const valid = await createFormRef.value.validate().catch(() => false); if (!valid) return; createSubmitting.value = true; try { await http.post('/exceptions', { order_id: createForm.order_id, type: createForm.type, station_id: createForm.station_id || 0, description: createForm.description.trim(), images: createForm.images_input.split(',').map((item) => item.trim()).filter(Boolean), remark: createForm.remark.trim() }); ElMessage.success('异常已创建'); createDialogVisible.value = false; await refreshExceptionsOverview() } finally { createSubmitting.value = false } }
async function openDetail(item: ExceptionItem) { detailVisible.value = true; detailLoading.value = true; try { detailException.value = await http.get<never, ExceptionItem>(`/exceptions/${item.id}`) } finally { detailLoading.value = false } }
function openAssignDialog(item: ExceptionItem) { currentExceptionId.value = item.id; assignForm.handler_id = item.handler_id || undefined; assignForm.remark = ''; assignDialogVisible.value = true }
async function submitAssign() { if (!currentExceptionId.value || !assignForm.handler_id) return; assignSubmitting.value = true; try { await http.put(`/exceptions/${currentExceptionId.value}/assign`, { handler_id: assignForm.handler_id, remark: assignForm.remark.trim() }); ElMessage.success('处理人已分配'); assignDialogVisible.value = false; await refreshExceptionsOverview() } finally { assignSubmitting.value = false } }
function openProcessDialog(item: ExceptionItem) { currentExceptionId.value = item.id; processForm.status = item.status === 3 ? 3 : 2; processForm.solution = item.solution || ''; processForm.result = item.result || ''; processForm.compensate_amount = item.compensate_amount || 0; processForm.remark = ''; processDialogVisible.value = true }
async function submitProcess() { if (!currentExceptionId.value) return; processSubmitting.value = true; try { await http.put(`/exceptions/${currentExceptionId.value}/process`, { status: processForm.status, solution: processForm.solution.trim(), result: processForm.result.trim(), compensate_amount: Number(processForm.compensate_amount), remark: processForm.remark.trim() }); ElMessage.success('异常已处理'); processDialogVisible.value = false; await refreshExceptionsOverview() } finally { processSubmitting.value = false } }
function openCloseDialog(item: ExceptionItem) { currentExceptionId.value = item.id; closeForm.resume_status = undefined; closeForm.result = item.result || ''; closeForm.remark = ''; closeDialogVisible.value = true }
async function submitClose() { if (!currentExceptionId.value) return; closeSubmitting.value = true; try { await http.put(`/exceptions/${currentExceptionId.value}/close`, { resume_status: closeForm.resume_status, result: closeForm.result.trim(), remark: closeForm.remark.trim() }); ElMessage.success('异常已关闭'); closeDialogVisible.value = false; await refreshExceptionsOverview() } finally { closeSubmitting.value = false } }

async function applyFilters() { pagination.page = 1; await loadList() }
function resetFilters() { filters.order_no = ''; filters.type = undefined; filters.status = undefined; filters.station_id = undefined; pagination.page = 1; void loadList() }
function handlePageChange(page: number) { pagination.page = page; void loadList() }
function handleSizeChange(size: number) { pagination.pageSize = size; pagination.page = 1; void loadList() }

onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadOrders(), loadStations(), loadUsers(), loadList(), loadStats()]) })
</script>

<style scoped>
.exception-management-view { display: flex; flex-direction: column; gap: 1rem; }
.exception-hero, .exception-panel, .sub-panel { padding: 1.5rem; }
.exception-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.exception-hero h1, .exception-detail__hero h2 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.exception-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.exception-hero__chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
.exception-hero__chips span { padding: 0.45rem 0.8rem; border-radius: 999px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.12); color: var(--accent-deep); font-size: 0.85rem; font-weight: 600; }
.exception-hero__stats, .summary-grid { display: grid; gap: 1rem; }
.exception-hero__stats { min-width: 18rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.exception-hero__stats article, .summary-card { padding: 1rem 1.15rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.exception-hero__stats span, .summary-card span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.exception-hero__stats strong, .summary-card strong { font-size: 1.5rem; color: var(--accent-deep); }
.summary-grid--exception { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 1rem; }
.exception-tabs :deep(.el-tabs__header) { margin: 0; }
.exception-panel__toolbar, .sub-panel__head, .exception-detail__hero { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.exception-panel__toolbar { margin-bottom: 1rem; }
.exception-panel__toolbar strong { color: var(--ink); }
.exception-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.exception-layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr); gap: 1rem; }
.exception-side { display: flex; flex-direction: column; gap: 1rem; }
.exception-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.exception-table :deep(.el-table__header th) { background: rgba(238, 77, 45, 0.06); color: var(--accent-deep); }
.exception-identity { display: flex; flex-direction: column; gap: 0.25rem; }
.exception-identity strong { color: var(--ink); }
.exception-identity span, .exception-identity small { color: var(--muted); }
.exception-actions { display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; }
.exception-pagination { display: flex; justify-content: flex-end; margin-top: 1rem; }
.stats-section + .stats-section { margin-top: 1rem; }
.stats-list, .side-list { display: flex; flex-direction: column; gap: 0.75rem; }
.stats-list article, .side-list article { display: flex; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; border-radius: 16px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.76); }
.stats-list strong, .side-list strong, .exception-detail-card h3 { color: var(--ink); }
.stats-list span, .side-list span { color: var(--muted); }
.exception-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; }
.exception-form-grid__wide { grid-column: 1 / -1; }
.exception-drawer { display: flex; flex-direction: column; gap: 1rem; min-height: 12rem; }
.exception-detail__tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.exception-detail__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.exception-detail-card { padding: 1.2rem; border-radius: 20px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.72); }
.exception-detail-card--full { grid-column: 1 / -1; }
.exception-detail-card dl { display: flex; flex-direction: column; gap: 0.75rem; margin: 0; }
.exception-detail-card dl div { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: 0.75rem; }
.exception-detail-card dt { color: var(--muted); }
.exception-detail-card dd { margin: 0; color: var(--ink); line-height: 1.6; }
@media (max-width: 1200px) { .exception-layout { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .exception-hero, .exception-panel__toolbar, .sub-panel__head, .exception-detail__hero { flex-direction: column; } .exception-hero__stats, .summary-grid--exception, .exception-form-grid, .exception-detail__grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .exception-pagination { justify-content: flex-start; overflow: auto; } }
</style>
