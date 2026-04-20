<template>
  <section class="order-management-view">
    <div class="order-hero card-panel">
      <div>
        <p class="eyebrow">Order Operations</p>
        <h1>订单管理</h1>
        <p>
          当前页面已接入订单筛选、统计概览、详情查看、状态日志、允许流转状态查询、状态推进与取消订单操作，适合作为后台订单调度与回归验证入口。
        </p>
        <div class="order-hero__chips">
          <span v-for="item in topTransportModes" :key="item.transport_mode">
            {{ item.mode_name }} {{ item.count }} 单
          </span>
        </div>
      </div>
      <div class="order-hero__stats">
        <article>
          <span>订单总数</span>
          <strong>{{ statistics.total_orders }}</strong>
        </article>
        <article>
          <span>订单总金额</span>
          <strong>{{ formatCompactAmount(statistics.total_amount) }}</strong>
        </article>
        <article>
          <span>待处理订单</span>
          <strong>{{ pendingCount }}</strong>
        </article>
        <article>
          <span>异常订单</span>
          <strong>{{ exceptionCount }}</strong>
        </article>
      </div>
    </div>

    <div class="card-panel order-panel">
      <div class="order-panel__toolbar">
        <div>
          <p class="eyebrow">Console Actions</p>
          <strong>支持查单、录单、状态流转与日志回看</strong>
        </div>
        <el-button v-if="canCreateOrder" type="primary" @click="createDialogVisible = true">录入新订单</el-button>
      </div>

      <el-form :inline="true" :model="filters" class="order-filters" @submit.prevent>
        <el-form-item label="订单号">
          <el-input
            v-model="filters.order_no"
            clearable
            placeholder="请输入订单号"
            @keyup.enter="refreshOverview"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 180px">
            <el-option label="全部状态" :value="undefined" />
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="发件国家">
          <el-input v-model="filters.sender_country" clearable placeholder="如：中国 / USA" />
        </el-form-item>
        <el-form-item label="收件国家">
          <el-input v-model="filters.receiver_country" clearable placeholder="如：美国 / 日本" />
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            value-format="x"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            range-separator="至"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="refreshOverview">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="orders" class="order-table" stripe>
        <el-table-column prop="order_no" label="订单号" min-width="190" />
        <el-table-column label="线路" min-width="230">
          <template #default="scope">
            <div class="order-route">
              <strong>
                {{ normalizeText(scope.row.sender_country) }} · {{ normalizeText(scope.row.sender_city) }}
              </strong>
              <span>→</span>
              <strong>
                {{ normalizeText(scope.row.receiver_country) }} · {{ normalizeText(scope.row.receiver_city) }}
              </strong>
              <small>
                {{ normalizeText(scope.row.sender_name, '发件人待补充') }} →
                {{ normalizeText(scope.row.receiver_name, '收件人待补充') }}
              </small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="货物" min-width="180">
          <template #default="scope">
            <div class="order-goods">
              <strong>{{ normalizeText(scope.row.goods_name, '货物待补充') }}</strong>
              <span>{{ scope.row.goods_weight.toFixed(2) }} kg</span>
              <small>
                {{ scope.row.package_count || 0 }} 包裹
                <template v-if="scope.row.child_order_count"> · {{ scope.row.child_order_count }} 子单</template>
                <template v-else-if="scope.row.parent_order_no"> · 母单 {{ scope.row.parent_order_no }}</template>
              </small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="运输方式" width="130">
          <template #default="scope">
            <el-tag effect="plain" type="warning">{{ transportModeLabel(scope.row.transport_mode) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140">
          <template #default="scope">
            {{ formatAmount(scope.row.total_amount) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)" effect="dark">
              {{ scope.row.status_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="order_time" label="下单时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="scope">
            <div class="order-actions">
              <el-button link type="primary" @click="openDetail(scope.row)">详情</el-button>
              <el-button
                v-if="canUpdateStatus"
                link
                type="warning"
                @click="openStatusDialog(scope.row)"
              >
                状态流转
              </el-button>
              <el-button
                link
                type="danger"
                :disabled="!canCancel(scope.row.status)"
                @click="cancelOrder(scope.row)"
              >
                取消订单
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="order-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="pagination.total"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <OrderCreateDialog v-model="createDialogVisible" @created="handleOrderCreated" />

    <el-drawer v-model="detailDrawerVisible" size="62%" title="订单详情">
      <div class="order-drawer" v-loading="detailLoading">
        <template v-if="detailOrder">
          <div class="order-detail__hero">
            <div>
              <p class="eyebrow">Order Snapshot</p>
              <h2>{{ detailOrder.order_no }}</h2>
              <p>
                {{ normalizeText(detailOrder.goods_name, '货物信息待补充') }}，
                {{ detailOrder.goods_weight.toFixed(2) }} kg，
                {{ transportModeLabel(detailOrder.transport_mode) }}
              </p>
            </div>
            <div class="order-detail__hero-tags">
              <el-tag :type="statusTagType(detailOrder.status)" effect="dark">{{ statusName(detailOrder.status) }}</el-tag>
              <el-tag effect="plain">{{ hierarchyTypeLabel(detailOrder.hierarchy_type) }}</el-tag>
              <el-tag effect="plain" type="warning">{{ relationTypeLabel(detailOrder.relation_type) }}</el-tag>
              <el-tag effect="plain">{{ formatAmount(detailOrder.total_amount, detailOrder.currency) }}</el-tag>
            </div>
          </div>

          <div class="order-detail__toolbar">
            <el-button v-if="canUpdateStatus" type="primary" plain @click="openStatusDialog(detailOrder)">推进状态</el-button>
            <el-button type="warning" plain :disabled="!canCancel(detailOrder.status)" @click="cancelOrder(detailOrder)">
              取消订单
            </el-button>
          </div>

          <div class="order-detail__grid">
            <article class="order-detail-card">
              <h3>发件信息</h3>
              <dl>
                <div>
                  <dt>发件人</dt>
                  <dd>{{ normalizeText(detailOrder.sender_name, '未填写') }}</dd>
                </div>
                <div>
                  <dt>手机号</dt>
                  <dd>{{ normalizeText(detailOrder.sender_phone, '未填写') }}</dd>
                </div>
                <div>
                  <dt>地址</dt>
                  <dd>{{ formatAddress(detailOrder.sender_country, detailOrder.sender_province, detailOrder.sender_city, detailOrder.sender_address) }}</dd>
                </div>
                <div>
                  <dt>邮编</dt>
                  <dd>{{ normalizeText(detailOrder.sender_postcode, '未填写') }}</dd>
                </div>
              </dl>
            </article>

            <article class="order-detail-card">
              <h3>收件信息</h3>
              <dl>
                <div>
                  <dt>收件人</dt>
                  <dd>{{ normalizeText(detailOrder.receiver_name, '未填写') }}</dd>
                </div>
                <div>
                  <dt>手机号</dt>
                  <dd>{{ normalizeText(detailOrder.receiver_phone, '未填写') }}</dd>
                </div>
                <div>
                  <dt>地址</dt>
                  <dd>{{ formatAddress(detailOrder.receiver_country, detailOrder.receiver_province, detailOrder.receiver_city, detailOrder.receiver_address) }}</dd>
                </div>
                <div>
                  <dt>邮编</dt>
                  <dd>{{ normalizeText(detailOrder.receiver_postcode, '未填写') }}</dd>
                </div>
              </dl>
            </article>

            <article class="order-detail-card">
              <h3>货物与费用</h3>
              <dl>
                <div>
                  <dt>货物名称</dt>
                  <dd>{{ normalizeText(detailOrder.goods_name, '未填写') }}</dd>
                </div>
                <div>
                  <dt>货物分类</dt>
                  <dd>{{ normalizeText(detailOrder.goods_category, '未填写') }}</dd>
                </div>
                <div>
                  <dt>重量 / 件数</dt>
                  <dd>{{ detailOrder.goods_weight.toFixed(2) }} kg / {{ detailOrder.goods_quantity || 0 }} 件</dd>
                </div>
                <div>
                  <dt>总金额</dt>
                  <dd>{{ formatAmount(detailOrder.total_amount, detailOrder.currency) }}</dd>
                </div>
                <div>
                  <dt>运费 / 保费</dt>
                  <dd>{{ formatAmount(detailOrder.freight_charge, detailOrder.currency) }} / {{ formatAmount(detailOrder.insurance_fee, detailOrder.currency) }}</dd>
                </div>
                <div>
                  <dt>付款状态</dt>
                  <dd>{{ normalizeText(detailOrder.payment_status, '未填写') }}</dd>
                </div>
              </dl>
            </article>

            <article class="order-detail-card">
              <h3>时效与备注</h3>
              <dl>
                <div>
                  <dt>下单时间</dt>
                  <dd>{{ formatTimestamp(detailOrder.order_time) }}</dd>
                </div>
                <div>
                  <dt>预计时效</dt>
                  <dd>{{ detailOrder.estimated_days || 0 }} 天</dd>
                </div>
                <div>
                  <dt>提货 / 签收</dt>
                  <dd>{{ formatTimestamp(detailOrder.pickup_time) }} / {{ formatTimestamp(detailOrder.sign_time) }}</dd>
                </div>
                <div>
                  <dt>备注</dt>
                  <dd>{{ normalizeText(detailOrder.remark, '无备注') }}</dd>
                </div>
              </dl>
            </article>

            <article class="order-detail-card">
              <h3>结构关系</h3>
              <dl>
                <div>
                  <dt>订单结构</dt>
                  <dd>{{ hierarchyTypeLabel(detailOrder.hierarchy_type) }} / {{ relationTypeLabel(detailOrder.relation_type) }}</dd>
                </div>
                <div>
                  <dt>母单</dt>
                  <dd>{{ normalizeText(detailOrder.parent_order_no, '当前即母单或普通单') }}</dd>
                </div>
                <div>
                  <dt>根单</dt>
                  <dd>{{ normalizeText(detailOrder.root_order_no, detailOrder.order_no) }}</dd>
                </div>
                <div>
                  <dt>包裹 / 子单</dt>
                  <dd>{{ detailOrder.package_count || 0 }} / {{ detailOrder.child_order_count || 0 }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div class="order-detail-card order-detail-card--full">
            <div class="order-detail-card__head">
              <h3>包裹清单</h3>
              <span>{{ detailOrder.packages.length }} 个</span>
            </div>
            <div v-if="detailOrder.packages.length" class="order-package-list">
              <article v-for="item in detailOrder.packages" :key="item.id">
                <div class="order-log-list__head">
                  <strong>{{ item.parcel_no }}</strong>
                  <span>{{ item.weight.toFixed(2) }} kg / {{ item.quantity }} 件</span>
                </div>
                <p>{{ normalizeText(item.goods_name) }} · {{ normalizeText(item.goods_category, '未分类') }}</p>
                <small>
                  所属订单 {{ normalizeText(item.order_no) }} · {{ relationTypeLabel(item.package_type) }} · {{ formatAmount(item.goods_value) }}
                </small>
              </article>
            </div>
            <el-empty v-else description="暂无包裹明细" />
          </div>

          <div class="order-detail-card order-detail-card--full">
            <div class="order-detail-card__head">
              <h3>子单列表</h3>
              <span>{{ detailOrder.child_orders.length }} 个</span>
            </div>
            <div v-if="detailOrder.child_orders.length" class="order-log-list">
              <article v-for="item in detailOrder.child_orders" :key="item.id">
                <div class="order-log-list__head">
                  <strong>{{ item.order_no }}</strong>
                  <span>{{ item.package_count }} 包裹 / {{ formatAmount(item.total_amount) }}</span>
                </div>
                <p>{{ hierarchyTypeLabel(item.hierarchy_type) }} · {{ relationTypeLabel(item.relation_type) }}</p>
                <small>{{ item.status_name }}</small>
              </article>
            </div>
            <el-empty v-else description="当前没有子单" />
          </div>

          <div class="order-detail-card order-detail-card--full">
            <div class="order-detail-card__head">
              <h3>允许的状态流转</h3>
              <span>{{ transitions.length }} 项</span>
            </div>
            <div v-if="transitions.length" class="order-transition-list">
              <el-tag v-for="item in transitions" :key="item.status" effect="plain" type="warning">
                {{ item.status_name }}
              </el-tag>
            </div>
            <el-empty v-else description="当前状态没有可执行流转" />
          </div>

          <div class="order-detail-card order-detail-card--full">
            <div class="order-detail-card__head">
              <h3>状态变更日志</h3>
              <span>{{ statusLogs.length }} 条</span>
            </div>
            <div v-if="statusLogs.length" class="order-log-list">
              <article v-for="log in statusLogs" :key="log.id">
                <div class="order-log-list__head">
                  <strong>{{ log.from_status_name }} → {{ log.to_status_name }}</strong>
                  <span>{{ formatTimestamp(log.change_time || log.created_at) }}</span>
                </div>
                <p>{{ normalizeText(log.operator_name, '系统') }} · {{ log.operator_role_name }}</p>
                <small>{{ normalizeText(log.remark, '无备注') }}</small>
              </article>
            </div>
            <el-empty v-else description="暂无状态日志" />
          </div>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="statusDialogVisible" title="推进订单状态" width="460px">
      <div v-loading="transitionLoading">
        <el-form label-position="top">
          <el-form-item label="目标状态">
            <el-select v-model="statusForm.status" placeholder="请选择目标状态" style="width: 100%" :disabled="!transitions.length">
              <el-option v-for="item in transitions" :key="item.status" :label="item.status_name" :value="item.status" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注">
            <el-input
              v-model="statusForm.remark"
              type="textarea"
              :rows="4"
              maxlength="200"
              show-word-limit
              placeholder="可选，填写这次流转的说明"
            />
          </el-form-item>
        </el-form>

        <el-empty v-if="!transitionLoading && !transitions.length" description="当前状态没有可执行流转" />
      </div>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="statusSubmitting" :disabled="!statusForm.status" @click="submitStatusUpdate">
          确认更新
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'

import OrderCreateDialog from '@/components/OrderCreateDialog.vue'
import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'
import { readQueryNumber, readQueryString } from '@/utils/workbench'

type OrderItem = {
  id: number
  order_no: string
  customer_id: number
  parent_order_id: number
  parent_order_no: string
  root_order_id: number
  root_order_no: string
  hierarchy_type: string
  relation_type: string
  package_count: number
  child_order_count: number
  sender_name: string
  sender_country: string
  sender_city: string
  receiver_name: string
  receiver_country: string
  receiver_city: string
  goods_name: string
  goods_weight: number
  transport_mode: number
  total_amount: number
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

type StatusStatistic = {
  status: number
  status_name: string
  count: number
  total_amount: number
}

type TransportStatistic = {
  transport_mode: number
  mode_name: string
  count: number
  total_amount: number
}

type CountryStatistic = {
  country: string
  count: number
  total_amount: number
}

type OrderStatisticsResponse = {
  total_orders: number
  total_amount: number
  by_status: StatusStatistic[]
  by_transport_mode: TransportStatistic[]
  by_sender_country: CountryStatistic[]
  by_receiver_country: CountryStatistic[]
}

type OrderPackageInfo = {
  id: number
  order_id: number
  order_no: string
  parcel_no: string
  package_type: string
  goods_name: string
  goods_category: string
  weight: number
  volume: number
  quantity: number
  goods_value: number
  insured_amount: number
  remark: string
}

type OrderRelationSummary = {
  id: number
  order_no: string
  relation_type: string
  hierarchy_type: string
  status: number
  status_name: string
  package_count: number
  total_amount: number
}

type OrderDetail = {
  id: number
  order_no: string
  customer_id: number
  parent_order_id: number
  parent_order_no: string
  root_order_id: number
  root_order_no: string
  hierarchy_type: string
  relation_type: string
  package_count: number
  child_order_count: number
  sender_name: string
  sender_phone: string
  sender_country: string
  sender_province: string
  sender_city: string
  sender_address: string
  sender_postcode: string
  receiver_name: string
  receiver_phone: string
  receiver_country: string
  receiver_province: string
  receiver_city: string
  receiver_address: string
  receiver_postcode: string
  goods_name: string
  goods_category: string
  goods_weight: number
  goods_volume: number
  goods_quantity: number
  goods_value: number
  is_insured: number
  insured_amount: number
  transport_mode: number
  service_type: string
  estimated_days: number
  freight_charge: number
  insurance_fee: number
  total_amount: number
  currency: string
  payment_status: string
  status: number
  customs_fee: number
  other_fee: number
  current_station: number
  order_time: number
  pickup_time: number
  delivery_time: number
  sign_time: number
  remark: string
  packages: OrderPackageInfo[]
  child_orders: OrderRelationSummary[]
}

type StatusTransitionOption = {
  status: number
  status_name: string
}

type AllowedTransitionsResponse = {
  current_status: number
  current_status_name: string
  allowed_statuses: StatusTransitionOption[]
}

type OrderStatusLogItem = {
  id: number
  from_status: number
  from_status_name: string
  to_status: number
  to_status_name: string
  operator_name: string
  operator_role_name: string
  remark: string
  change_time: number
  created_at: number
}

const authStore = useAuthStore()
const route = useRoute()
const loading = ref(false)
const detailLoading = ref(false)
const transitionLoading = ref(false)
const statusSubmitting = ref(false)
const orders = ref<OrderItem[]>([])
const detailOrder = ref<OrderDetail | null>(null)
const statusLogs = ref<OrderStatusLogItem[]>([])
const transitions = ref<StatusTransitionOption[]>([])
const detailDrawerVisible = ref(false)
const statusDialogVisible = ref(false)
const createDialogVisible = ref(false)
const currentOrderId = ref<number | null>(null)

const pagination = reactive({
  total: 0,
  page: 1,
  pageSize: 10,
})

const filters = reactive<{
  order_no: string
  status?: number
  sender_country: string
  receiver_country: string
  dateRange: string[]
}>({
  order_no: '',
  status: undefined,
  sender_country: '',
  receiver_country: '',
  dateRange: [],
})

const statistics = reactive<OrderStatisticsResponse>({
  total_orders: 0,
  total_amount: 0,
  by_status: [],
  by_transport_mode: [],
  by_sender_country: [],
  by_receiver_country: [],
})

const statusForm = reactive({
  status: undefined as number | undefined,
  remark: '',
})

const statusOptions = [
  { value: 1, label: '待处理' },
  { value: 2, label: '已接单' },
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

const canUpdateStatus = computed(() => [6, 7].includes(authStore.user?.role || 0))
const canCreateOrder = computed(() => [2, 5, 7].includes(authStore.user?.role || 0))
const pendingCount = computed(() => getStatusCount(1))
const exceptionCount = computed(() => getStatusCount(11))
const topTransportModes = computed(() => statistics.by_transport_mode.slice(0, 3))

function normalizeText(value: string | null | undefined, fallback = '-') {
  const text = String(value ?? '').trim()
  if (!text || /^[?？�]+$/.test(text)) {
    return fallback
  }
  return text
}

function formatAmount(amount: number | undefined, currency = 'CNY') {
  return `${currency} ${(Number(amount) || 0).toFixed(2)}`
}

function formatCompactAmount(amount: number | undefined) {
  return `¥${(Number(amount) || 0).toFixed(2)}`
}

function formatTimestamp(value: number | string | undefined | null) {
  if (!value) {
    return '-'
  }
  if (typeof value === 'string') {
    const text = value.trim()
    return text && !/^[?？�]+$/.test(text) ? text : '-'
  }
  const date = new Date(value > 1000000000000 ? value : value * 1000)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatAddress(country?: string, province?: string, city?: string, address?: string) {
  const values = [country, province, city, address]
    .map((item) => normalizeText(item, ''))
    .filter(Boolean)
  return values.length ? values.join(' / ') : '-'
}

function transportModeLabel(mode: number) {
  const mapping: Record<number, string> = {
    1: '空运',
    2: '海运',
    3: '陆运',
    4: '铁路',
    5: '快递',
  }
  return mapping[mode] || '未知方式'
}

function statusName(status: number) {
  return statusOptions.find((item) => item.value === status)?.label || '未知状态'
}

function statusTagType(status: number) {
  const mapping: Record<number, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    1: 'info',
    2: 'primary',
    3: 'warning',
    4: 'warning',
    5: 'primary',
    6: 'warning',
    7: 'warning',
    8: 'primary',
    9: 'success',
    10: 'success',
    11: 'danger',
    12: 'info',
  }
  return mapping[status] || 'info'
}

function hierarchyTypeLabel(type: string) {
  const mapping: Record<string, string> = {
    normal: '普通单',
    master: '母单',
    child: '子单',
  }
  return mapping[type] || '未知结构'
}

function relationTypeLabel(type: string) {
  const mapping: Record<string, string> = {
    normal: '普通订单',
    split_parent: '拆单母单',
    split_child: '拆单子单',
    merge_parent: '合单母单',
    merge_child: '合单子单',
  }
  return mapping[type] || '普通订单'
}

function getStatusCount(status: number) {
  return statistics.by_status.find((item) => item.status === status)?.count || 0
}

function buildTimeParams() {
  const params: Record<string, number> = {}
  if (filters.dateRange.length === 2) {
    params.start_time = Math.floor(Number(filters.dateRange[0]) / 1000)
    params.end_time = Math.floor(Number(filters.dateRange[1]) / 1000)
  }
  return params
}

function applyWorkbenchFilters() {
  const status = readQueryNumber(route.query, 'status')
  const orderNo = readQueryString(route.query, 'order_no')
  const senderCountry = readQueryString(route.query, 'sender_country')
  const receiverCountry = readQueryString(route.query, 'receiver_country')

  if (typeof status === 'number' && statusOptions.some((item) => item.value === status)) {
    filters.status = status
  }
  if (typeof orderNo === 'string') {
    filters.order_no = orderNo
  }
  if (typeof senderCountry === 'string') {
    filters.sender_country = senderCountry
  }
  if (typeof receiverCountry === 'string') {
    filters.receiver_country = receiverCountry
  }
}

async function loadOrders() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: pagination.page,
      page_size: pagination.pageSize,
      ...buildTimeParams(),
    }

    if (filters.order_no.trim()) {
      params.order_no = filters.order_no.trim()
    }
    if (typeof filters.status === 'number') {
      params.status = filters.status
    }
    if (filters.sender_country.trim()) {
      params.sender_country = filters.sender_country.trim()
    }
    if (filters.receiver_country.trim()) {
      params.receiver_country = filters.receiver_country.trim()
    }

    const data = await http.get<never, OrderListResponse>('/orders', { params })
    orders.value = data.list || []
    pagination.total = data.total || 0
    pagination.page = data.page || 1
    pagination.pageSize = data.page_size || pagination.pageSize
  } finally {
    loading.value = false
  }
}

async function loadStatistics() {
  const data = await http.get<never, OrderStatisticsResponse>('/orders/statistics', {
    params: buildTimeParams(),
  })

  statistics.total_orders = data.total_orders || 0
  statistics.total_amount = data.total_amount || 0
  statistics.by_status = data.by_status || []
  statistics.by_transport_mode = data.by_transport_mode || []
  statistics.by_sender_country = data.by_sender_country || []
  statistics.by_receiver_country = data.by_receiver_country || []
}

async function refreshOverview() {
  pagination.page = 1
  await Promise.all([loadOrders(), loadStatistics()])
}

function resetFilters() {
  filters.order_no = ''
  filters.status = undefined
  filters.sender_country = ''
  filters.receiver_country = ''
  filters.dateRange = []
  void refreshOverview()
}

function handlePageChange(page: number) {
  pagination.page = page
  void loadOrders()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  void loadOrders()
}

async function handleOrderCreated(payload: { order_id: number }) {
  await refreshOverview()
  await openDetail({ id: payload.order_id })
}

async function loadOrderTransitions(orderId: number) {
  const data = await http.get<never, AllowedTransitionsResponse>(`/orders/${orderId}/transitions`)
  transitions.value = data.allowed_statuses || []
}

async function loadOrderDetailBundle(orderId: number) {
  const [detail, logs, transitionData] = await Promise.all([
    http.get<never, OrderDetail>(`/orders/${orderId}`),
    http.get<never, OrderStatusLogItem[]>(`/orders/${orderId}/status-logs`),
    http.get<never, AllowedTransitionsResponse>(`/orders/${orderId}/transitions`),
  ])

  detailOrder.value = detail
  statusLogs.value = logs || []
  transitions.value = transitionData.allowed_statuses || []
}

async function openDetail(order: Pick<OrderItem, 'id'>) {
  detailDrawerVisible.value = true
  detailLoading.value = true
  currentOrderId.value = order.id
  try {
    await loadOrderDetailBundle(order.id)
  } finally {
    detailLoading.value = false
  }
}

async function openStatusDialog(order: Pick<OrderItem, 'id'>) {
  currentOrderId.value = order.id
  statusForm.status = undefined
  statusForm.remark = ''
  statusDialogVisible.value = true
  transitionLoading.value = true
  try {
    await loadOrderTransitions(order.id)
    statusForm.status = transitions.value[0]?.status
  } catch {
    statusDialogVisible.value = false
  } finally {
    transitionLoading.value = false
  }
}

async function submitStatusUpdate() {
  if (!currentOrderId.value || !statusForm.status) {
    return
  }

  statusSubmitting.value = true
  try {
    await http.put(`/orders/${currentOrderId.value}/status`, {
      status: statusForm.status,
      remark: statusForm.remark.trim(),
    })
    ElMessage.success('订单状态已更新')
    statusDialogVisible.value = false
    await Promise.all([loadOrders(), loadStatistics()])
    if (detailDrawerVisible.value && detailOrder.value?.id === currentOrderId.value) {
      detailLoading.value = true
      try {
        await loadOrderDetailBundle(currentOrderId.value)
      } finally {
        detailLoading.value = false
      }
    }
  } finally {
    statusSubmitting.value = false
  }
}

function canCancel(status: number) {
  return [1, 2].includes(status)
}

async function cancelOrder(order: Pick<OrderItem, 'id' | 'order_no' | 'status'>) {
  if (!canCancel(order.status)) {
    return
  }

  try {
    await ElMessageBox.confirm(`确认取消订单 “${order.order_no}” 吗？`, '取消确认', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
      type: 'warning',
    })
  } catch {
    return
  }

  await http.put(`/orders/${order.id}/cancel`)
  ElMessage.success('订单已取消')
  await Promise.all([loadOrders(), loadStatistics()])
  if (detailDrawerVisible.value && detailOrder.value?.id === order.id) {
    detailLoading.value = true
    try {
      await loadOrderDetailBundle(order.id)
    } finally {
      detailLoading.value = false
    }
  }
}

onMounted(async () => {
  applyWorkbenchFilters()
  await Promise.all([loadOrders(), loadStatistics()])
})
</script>

<style scoped>
.order-goods {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.order-goods small {
  color: var(--muted);
}

.order-detail-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.order-package-list,
.order-log-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.order-package-list article,
.order-log-list article {
  padding: 0.9rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 248, 243, 0.76);
}

.order-log-list__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.order-package-list p,
.order-log-list p,
.order-package-list small,
.order-log-list small {
  margin: 0.35rem 0 0;
  color: var(--muted);
}
</style>



