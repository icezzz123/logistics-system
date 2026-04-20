<template>
  <section class="dispatch-management-view">
    <div class="dispatch-hero card-panel">
      <div>
        <p class="eyebrow">Dispatch Console</p>
        <h1>运输调度</h1>
        <p>当前页面已接入路径优化、调度建议、批次调度、运输计划与订单入计划，适合作为运输调度模块的联调与演示入口。</p>
        <div class="dispatch-hero__chips">
          <span v-for="item in topVehicles" :key="item.vehicle_id">{{ normalizeText(item.plate_number) }} {{ item.load_rate }}</span>
        </div>
      </div>
      <div class="dispatch-hero__stats">
        <article><span>批次调度</span><strong>{{ batches.length }}</strong></article>
        <article><span>运输计划</span><strong>{{ plans.length }}</strong></article>
        <article><span>已用车辆</span><strong>{{ suggestionSummary.used_vehicles }}</strong></article>
        <article><span>待分配订单</span><strong>{{ unassignedOrders.length }}</strong></article>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="dispatch-tabs">
      <el-tab-pane label="路径优化" name="optimize">
        <div class="card-panel dispatch-panel">
          <div class="dispatch-panel__toolbar">
            <div>
              <p class="eyebrow">Optimize</p>
              <strong>站点路径优化与智能调度建议</strong>
            </div>
            <div class="dispatch-panel__toolbar-actions">
              <el-button @click="loadSupportOptions">刷新基础数据</el-button>
            </div>
          </div>

          <div class="dispatch-layout dispatch-layout--optimize">
            <div class="card-panel sub-panel">
              <div class="sub-panel__head">
                <div>
                  <p class="eyebrow">Route</p>
                  <h3>路径优化</h3>
                </div>
              </div>
              <el-form :model="optimizeForm" label-position="top">
                <el-form-item label="车辆">
                  <el-select v-model="optimizeForm.vehicle_id" placeholder="请选择车辆" style="width: 100%">
                    <el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="途经站点">
                  <el-select v-model="optimizeForm.station_ids" multiple collapse-tags collapse-tags-tooltip placeholder="请选择至少两个站点" style="width: 100%">
                    <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-button type="primary" :loading="optimizing" @click="submitOptimize">开始优化</el-button>
              </el-form>

              <div v-if="optimizeResult" class="result-panel">
                <div class="summary-grid summary-grid--dispatch-small">
                  <article class="summary-card card-panel"><span>总距离</span><strong>{{ optimizeResult.total_distance }} km</strong></article>
                  <article class="summary-card card-panel"><span>节省距离</span><strong>{{ optimizeResult.saved_distance }} km</strong></article>
                  <article class="summary-card card-panel"><span>预计耗时</span><strong>{{ optimizeResult.estimated_time }} 分钟</strong></article>
                </div>
                <div class="result-columns">
                  <div>
                    <h4>原始顺序</h4>
                    <div class="route-list">
                      <article v-for="item in optimizeResult.original_order" :key="`o-${item.station_id}-${item.sequence}`">
                        <strong>{{ item.sequence }}. {{ normalizeText(item.station_name) }}</strong>
                        <span>{{ item.distance.toFixed(2) }} km</span>
                      </article>
                    </div>
                  </div>
                  <div>
                    <h4>优化顺序</h4>
                    <div class="route-list">
                      <article v-for="item in optimizeResult.optimized_order" :key="`n-${item.station_id}-${item.sequence}`">
                        <strong>{{ item.sequence }}. {{ normalizeText(item.station_name) }}</strong>
                        <span>{{ item.distance.toFixed(2) }} km</span>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-panel sub-panel">
              <div class="sub-panel__head">
                <div>
                  <p class="eyebrow">Suggestions</p>
                  <h3>智能调度建议</h3>
                </div>
              </div>
              <el-form :model="suggestionForm" label-position="top">
                <el-form-item label="订单">
                  <el-select v-model="suggestionForm.order_ids" multiple collapse-tags collapse-tags-tooltip placeholder="请选择待调度订单" style="width: 100%">
                    <el-option v-for="item in orderOptions" :key="item.id" :label="item.order_no" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="调度时间">
                  <el-date-picker v-model="suggestionForm.date" type="datetime" value-format="x" placeholder="请选择调度时间" style="width: 100%" />
                </el-form-item>
                <el-button type="primary" :loading="suggesting" @click="submitSuggestion">生成建议</el-button>
              </el-form>

              <div class="summary-grid summary-grid--dispatch-small result-panel" v-if="suggestionLoaded">
                <article class="summary-card card-panel"><span>订单总数</span><strong>{{ suggestionSummary.total_orders }}</strong></article>
                <article class="summary-card card-panel"><span>已分配</span><strong>{{ suggestionSummary.assigned_orders }}</strong></article>
                <article class="summary-card card-panel"><span>已用车辆</span><strong>{{ suggestionSummary.used_vehicles }}</strong></article>
              </div>

              <div class="side-list" v-if="suggestions.length">
                <article v-for="item in suggestions" :key="`${item.vehicle_id}-${item.driver_id}`">
                  <strong>{{ normalizeText(item.plate_number) }}</strong>
                  <span>{{ item.order_ids.length }} 单 / {{ item.load_rate }}</span>
                </article>
              </div>
              <el-empty v-else-if="suggestionLoaded" description="当前条件下没有建议批次" />
              <p v-if="unassignedOrders.length" class="tip-text">未分配订单：{{ unassignedOrders.join(', ') }}</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="批次调度" name="batches">
        <div class="card-panel dispatch-panel">
          <div class="dispatch-panel__toolbar">
            <div>
              <p class="eyebrow">Batches</p>
              <strong>批次创建、查询与状态流转</strong>
            </div>
            <div class="dispatch-panel__toolbar-actions">
              <el-button @click="loadBatches">刷新列表</el-button>
              <el-button type="primary" @click="openBatchDialog()">创建批次</el-button>
            </div>
          </div>

          <el-form :inline="true" :model="batchFilters" class="dispatch-filters" @submit.prevent>
            <el-form-item label="批次名"><el-input v-model="batchFilters.batch_name" clearable placeholder="请输入批次名称" @keyup.enter="applyBatchFilters" /></el-form-item>
            <el-form-item label="车辆">
              <el-select v-model="batchFilters.vehicle_id" clearable placeholder="全部车辆" style="width: 220px">
                <el-option label="全部车辆" :value="undefined" />
                <el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="司机">
              <el-select v-model="batchFilters.driver_id" clearable placeholder="全部司机" style="width: 220px">
                <el-option label="全部司机" :value="undefined" />
                <el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="batchFilters.status" clearable placeholder="全部状态" style="width: 180px">
                <el-option label="全部状态" :value="undefined" />
                <el-option v-for="item in batchStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyBatchFilters">查询</el-button>
              <el-button @click="resetBatchFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="batchLoading" :data="batches" class="dispatch-table" stripe>
            <el-table-column label="批次" min-width="220">
              <template #default="scope">
                <div class="dispatch-identity">
                  <strong>{{ scope.row.batch_name }}</strong>
                  <span>{{ scope.row.batch_no }}</span>
                  <small>{{ normalizeText(scope.row.plate_number) }} / {{ normalizeText(scope.row.driver_name, '未知司机') }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="订单 / 重量" width="150">
              <template #default="scope">
                <div class="dispatch-meta">
                  <strong>{{ scope.row.order_count }} 单</strong>
                  <span>{{ scope.row.total_weight }} kg</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope"><el-tag :type="dispatchStatusTagType(scope.row.status)" effect="dark">{{ scope.row.status_name }}</el-tag></template>
            </el-table-column>
            <el-table-column label="计划 / 实际" min-width="180">
              <template #default="scope">{{ formatUnix(scope.row.planned_time) }} / {{ formatUnix(scope.row.actual_time) }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="180" />
            <el-table-column label="操作" fixed="right" width="180">
              <template #default="scope">
                <div class="dispatch-actions">
                  <el-button v-if="nextBatchStatuses(scope.row.status).length" link type="warning" @click="openBatchStatusDialog(scope.row)">更新状态</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="运输计划" name="plans">
        <div class="card-panel dispatch-panel">
          <div class="dispatch-panel__toolbar">
            <div>
              <p class="eyebrow">Plans</p>
              <strong>运输计划维护、状态更新与订单入计划</strong>
            </div>
            <div class="dispatch-panel__toolbar-actions">
              <el-button @click="loadPlans">刷新列表</el-button>
              <el-button type="primary" @click="openPlanDialog()">创建计划</el-button>
            </div>
          </div>

          <el-form :inline="true" :model="planFilters" class="dispatch-filters" @submit.prevent>
            <el-form-item label="计划名"><el-input v-model="planFilters.plan_name" clearable placeholder="请输入计划名称" @keyup.enter="applyPlanFilters" /></el-form-item>
            <el-form-item label="车辆">
              <el-select v-model="planFilters.vehicle_id" clearable placeholder="全部车辆" style="width: 220px">
                <el-option label="全部车辆" :value="undefined" />
                <el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="planFilters.status" clearable placeholder="全部状态" style="width: 180px">
                <el-option label="全部状态" :value="undefined" />
                <el-option v-for="item in planStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyPlanFilters">查询</el-button>
              <el-button @click="resetPlanFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="planLoading" :data="plans" class="dispatch-table" stripe>
            <el-table-column label="计划" min-width="220">
              <template #default="scope">
                <div class="dispatch-identity">
                  <strong>{{ scope.row.plan_name }}</strong>
                  <span>{{ scope.row.plan_no }}</span>
                  <small>{{ normalizeText(scope.row.start_point) }} → {{ normalizeText(scope.row.end_point) }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="车辆 / 司机" min-width="180">
              <template #default="scope">
                <div class="dispatch-identity">
                  <strong>{{ normalizeText(scope.row.plate_number) }}</strong>
                  <span>{{ normalizeText(scope.row.driver_name, '未知司机') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="里程 / 运力" width="160">
              <template #default="scope">
                <div class="dispatch-meta">
                  <strong>{{ scope.row.distance }} km</strong>
                  <span>{{ scope.row.used_capacity }} / {{ scope.row.max_capacity }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope"><el-tag :type="dispatchStatusTagType(scope.row.status)" effect="dark">{{ scope.row.status_name }}</el-tag></template>
            </el-table-column>
            <el-table-column label="计划时间" min-width="170">
              <template #default="scope">{{ formatUnix(scope.row.plan_date) }}</template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="260">
              <template #default="scope">
                <div class="dispatch-actions">
                  <el-button link type="primary" @click="openPlanDialog(scope.row)">编辑</el-button>
                  <el-button link type="success" @click="openAssignOrdersDialog(scope.row)">加入订单</el-button>
                  <el-button v-if="nextPlanStatuses(scope.row.status).length" link type="warning" @click="openPlanStatusDialog(scope.row)">更新状态</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="batchDialogVisible" title="创建批次调度" width="760px">
      <el-form ref="batchFormRef" :model="batchForm" :rules="batchRules" label-position="top">
        <div class="dispatch-form-grid">
          <el-form-item label="批次名称" prop="batch_name"><el-input v-model="batchForm.batch_name" placeholder="请输入批次名称" /></el-form-item>
          <el-form-item label="计划发车时间" prop="planned_time"><el-date-picker v-model="batchForm.planned_time" type="datetime" value-format="x" placeholder="请选择发车时间" style="width: 100%" /></el-form-item>
          <el-form-item label="车辆" prop="vehicle_id"><el-select v-model="batchForm.vehicle_id" placeholder="请选择车辆" style="width: 100%"><el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="司机" prop="driver_id"><el-select v-model="batchForm.driver_id" placeholder="请选择司机" style="width: 100%"><el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="订单" prop="order_ids" class="dispatch-form-grid__wide"><el-select v-model="batchForm.order_ids" multiple collapse-tags collapse-tags-tooltip placeholder="请选择订单" style="width: 100%"><el-option v-for="item in orderOptions" :key="item.id" :label="item.order_no" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="备注" class="dispatch-form-grid__wide"><el-input v-model="batchForm.remark" type="textarea" :rows="4" maxlength="300" show-word-limit placeholder="请输入批次备注" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="batchDialogVisible = false">取消</el-button><el-button type="primary" :loading="batchSubmitting" @click="submitBatchDialog">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="batchStatusDialogVisible" title="更新批次状态" width="460px">
      <el-form label-position="top">
        <el-form-item label="目标状态"><el-select v-model="batchStatusForm.status" placeholder="请选择状态" style="width: 100%"><el-option v-for="item in currentBatchStatusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="batchStatusForm.remark" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="可选，填写状态备注" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="batchStatusDialogVisible = false">取消</el-button><el-button type="primary" :loading="batchStatusSubmitting" :disabled="!batchStatusForm.status" @click="submitBatchStatus">确认更新</el-button></template>
    </el-dialog>

    <el-dialog v-model="planDialogVisible" :title="planDialogMode === 'create' ? '创建运输计划' : '编辑运输计划'" width="820px">
      <el-form ref="planFormRef" :model="planForm" :rules="planRules" label-position="top">
        <div class="dispatch-form-grid">
          <el-form-item label="计划名称" prop="plan_name"><el-input v-model="planForm.plan_name" placeholder="请输入计划名称" /></el-form-item>
          <el-form-item label="计划时间" prop="plan_date"><el-date-picker v-model="planForm.plan_date" type="datetime" value-format="x" placeholder="请选择计划时间" style="width: 100%" /></el-form-item>
          <el-form-item label="车辆" prop="vehicle_id"><el-select v-model="planForm.vehicle_id" placeholder="请选择车辆" style="width: 100%"><el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="司机" prop="driver_id"><el-select v-model="planForm.driver_id" placeholder="请选择司机" style="width: 100%"><el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="起点" prop="start_point"><el-input v-model="planForm.start_point" placeholder="请输入起点" /></el-form-item>
          <el-form-item label="终点" prop="end_point"><el-input v-model="planForm.end_point" placeholder="请输入终点" /></el-form-item>
          <el-form-item label="里程(km)"><el-input-number v-model="planForm.distance" :min="0" :step="1" :precision="1" style="width: 100%" /></el-form-item>
          <el-form-item label="预计耗时(小时)"><el-input-number v-model="planForm.estimated_hours" :min="0" :step="1" style="width: 100%" /></el-form-item>
          <el-form-item label="最大载重"><el-input-number v-model="planForm.max_capacity" :min="0" :step="0.5" :precision="1" style="width: 100%" /></el-form-item>
          <el-form-item label="途经点(JSON)" class="dispatch-form-grid__wide"><el-input v-model="planForm.waypoints" type="textarea" :rows="3" placeholder='如：["站点A","站点B"]' /></el-form-item>
          <el-form-item label="备注" class="dispatch-form-grid__wide"><el-input v-model="planForm.remark" type="textarea" :rows="4" maxlength="300" show-word-limit placeholder="请输入计划备注" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="planDialogVisible = false">取消</el-button><el-button type="primary" :loading="planSubmitting" @click="submitPlanDialog">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="planStatusDialogVisible" title="更新计划状态" width="460px">
      <el-form label-position="top">
        <el-form-item label="目标状态"><el-select v-model="planStatusForm.status" placeholder="请选择状态" style="width: 100%"><el-option v-for="item in currentPlanStatusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="planStatusForm.remark" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="可选，填写状态备注" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="planStatusDialogVisible = false">取消</el-button><el-button type="primary" :loading="planStatusSubmitting" :disabled="!planStatusForm.status" @click="submitPlanStatus">确认更新</el-button></template>
    </el-dialog>

    <el-dialog v-model="assignOrdersDialogVisible" title="订单加入运输计划" width="680px">
      <el-form label-position="top">
        <el-form-item label="订单列表"><el-select v-model="assignOrdersForm.order_ids" multiple collapse-tags collapse-tags-tooltip placeholder="请选择订单" style="width: 100%"><el-option v-for="item in orderOptions" :key="item.id" :label="item.order_no" :value="item.id" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="assignOrdersDialogVisible = false">取消</el-button><el-button type="primary" :loading="assignOrdersSubmitting" :disabled="!assignOrdersForm.order_ids.length" @click="submitAssignOrders">加入计划</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRoute } from 'vue-router'

import http from '@/utils/http'
import { readQueryEnum } from '@/utils/workbench'

type VehicleOption = { id: number; plate_number: string }
type StationOption = { id: number; station_code: string; name: string }
type UserOption = { id: number; username: string; real_name?: string; role: number; role_name: string; status: number }
type UserListResponse = { list: UserOption[]; total: number; page: number; page_size: number; pages: number }
type OrderOption = { id: number; order_no: string }
type OrderListResponse = { list: OrderOption[]; total: number; page: number; page_size: number; pages: number }
type BatchItem = { id: number; batch_no: string; batch_name: string; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; order_count: number; total_weight: number; status: string; status_name: string; planned_time: number; actual_time: number; remark: string }
type BatchListResponse = { list: BatchItem[]; total: number; page: number; page_size: number; pages: number }
type PlanItem = { id: number; plan_no: string; plan_name: string; plan_date: number; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; start_point: string; end_point: string; waypoints: string; distance: number; estimated_hours: number; max_capacity: number; used_capacity: number; status: string; status_name: string; remark: string }
type PlanListResponse = { list: PlanItem[]; total: number; page: number; page_size: number; pages: number }
type SuggestionItem = { vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; order_ids: number[]; total_weight: number; capacity: number; load_rate: string }
type SuggestionResponse = { suggestions: SuggestionItem[]; unassigned_orders: number[]; summary: { total_orders: number; assigned_orders: number; total_vehicles: number; used_vehicles: number } }
type RouteOptimizeResult = { original_order: Array<{ station_id: number; station_name: string; sequence: number; distance: number }>; optimized_order: Array<{ station_id: number; station_name: string; sequence: number; distance: number }>; total_distance: number; saved_distance: number; estimated_time: number }
type Profile = { id: number; username: string; email?: string; phone?: string; real_name?: string; role: number; status: number; ctime?: number; mtime?: number }
type PermissionsResponse = { role: number; role_name: string; permissions: string[] }

const batchStatusOptions = [ { value: 'pending', label: '待调度' }, { value: 'dispatched', label: '已发车' }, { value: 'in_transit', label: '运输中' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' } ]
const planStatusOptions = [ { value: 'draft', label: '草稿' }, { value: 'confirmed', label: '已确认' }, { value: 'executing', label: '执行中' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' } ]

const route = useRoute()
const activeTab = ref('optimize')
const stations = ref<StationOption[]>([])
const vehicles = ref<VehicleOption[]>([])
const orders = ref<OrderOption[]>([])
const users = ref<UserOption[]>([])
const batches = ref<BatchItem[]>([])
const plans = ref<PlanItem[]>([])
const suggestions = ref<SuggestionItem[]>([])
const unassignedOrders = ref<number[]>([])
const optimizeResult = ref<RouteOptimizeResult | null>(null)
const batchLoading = ref(false)
const planLoading = ref(false)
const optimizing = ref(false)
const suggesting = ref(false)
const batchSubmitting = ref(false)
const batchStatusSubmitting = ref(false)
const planSubmitting = ref(false)
const planStatusSubmitting = ref(false)
const assignOrdersSubmitting = ref(false)

const optimizeForm = reactive({ vehicle_id: undefined as number | undefined, station_ids: [] as number[] })
const suggestionForm = reactive({ order_ids: [] as number[], date: undefined as string | undefined })
const suggestionSummary = reactive({ total_orders: 0, assigned_orders: 0, total_vehicles: 0, used_vehicles: 0 })
const suggestionLoaded = ref(false)

const batchFilters = reactive({ batch_name: '', vehicle_id: undefined as number | undefined, driver_id: undefined as number | undefined, status: undefined as string | undefined })
const planFilters = reactive({ plan_name: '', vehicle_id: undefined as number | undefined, status: undefined as string | undefined })

const batchDialogVisible = ref(false)
const batchFormRef = ref<FormInstance>()
const batchForm = reactive({ batch_name: '', vehicle_id: undefined as number | undefined, driver_id: undefined as number | undefined, order_ids: [] as number[], planned_time: undefined as string | undefined, remark: '' })
const batchRules: FormRules<typeof batchForm> = { batch_name: [{ required: true, message: '请输入批次名称', trigger: 'blur' }], vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }], driver_id: [{ required: true, message: '请选择司机', trigger: 'change' }], order_ids: [{ required: true, message: '请选择订单', trigger: 'change' }], planned_time: [{ required: true, message: '请选择发车时间', trigger: 'change' }] }
const batchStatusDialogVisible = ref(false)
const currentBatch = ref<BatchItem | null>(null)
const batchStatusForm = reactive({ status: undefined as string | undefined, remark: '' })

const planDialogVisible = ref(false)
const planDialogMode = ref<'create' | 'edit'>('create')
const currentPlanId = ref<number | null>(null)
const planFormRef = ref<FormInstance>()
const planForm = reactive({ plan_name: '', plan_date: undefined as string | undefined, vehicle_id: undefined as number | undefined, driver_id: undefined as number | undefined, start_point: '', end_point: '', waypoints: '[]', distance: 0, estimated_hours: 0, max_capacity: 0, remark: '' })
const planRules: FormRules<typeof planForm> = { plan_name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }], plan_date: [{ required: true, message: '请选择计划时间', trigger: 'change' }], vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }], driver_id: [{ required: true, message: '请选择司机', trigger: 'change' }], start_point: [{ required: true, message: '请输入起点', trigger: 'blur' }], end_point: [{ required: true, message: '请输入终点', trigger: 'blur' }] }
const planStatusDialogVisible = ref(false)
const currentPlan = ref<PlanItem | null>(null)
const planStatusForm = reactive({ status: undefined as string | undefined, remark: '' })
const assignOrdersDialogVisible = ref(false)
const assignOrdersForm = reactive({ order_ids: [] as number[] })

const stationOptions = computed(() => stations.value)
const vehicleOptions = computed(() => vehicles.value)
const orderOptions = computed(() => orders.value)
const driverOptions = computed(() => users.value.filter((item) => item.status === 1 && item.role >= 2))
const topVehicles = computed(() => suggestions.value.slice(0, 4))
const currentBatchStatusOptions = computed(() => nextBatchStatuses(currentBatch.value?.status || ''))
const currentPlanStatusOptions = computed(() => nextPlanStatuses(currentPlan.value?.status || ''))

function normalizeText(value: string | null | undefined, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text)) return fallback; return text }
function displayUserName(user: UserOption) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})` }
function formatMoney(value: number | undefined) { return `¥${(Number(value) || 0).toFixed(2)}` }
function formatUnix(value: number | undefined | null) { if (!value) return '-'; const date = new Date(value > 1000000000000 ? value : value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }) }
function dispatchStatusTagType(status: string): 'success' | 'warning' | 'info' | 'primary' { return ({ pending: 'info', dispatched: 'warning', in_transit: 'warning', completed: 'success', cancelled: 'primary', draft: 'info', confirmed: 'warning', executing: 'warning' } as Record<string, 'success' | 'warning' | 'info' | 'primary'>)[status] || 'info' }
function nextBatchStatuses(status: string) { return ({ pending: [{ value: 'dispatched', label: '已发车' }, { value: 'cancelled', label: '已取消' }], dispatched: [{ value: 'in_transit', label: '运输中' }, { value: 'completed', label: '已完成' }], in_transit: [{ value: 'completed', label: '已完成' }], completed: [], cancelled: [] } as Record<string, Array<{ value: string; label: string }>>)[status] || [] }
function nextPlanStatuses(status: string) { return ({ draft: [{ value: 'confirmed', label: '已确认' }, { value: 'cancelled', label: '已取消' }], confirmed: [{ value: 'executing', label: '执行中' }, { value: 'cancelled', label: '已取消' }], executing: [{ value: 'completed', label: '已完成' }], completed: [], cancelled: [] } as Record<string, Array<{ value: string; label: string }>>)[status] || [] }

function applyWorkbenchFilters() {
  const tab = readQueryEnum(route.query, 'tab', ['optimize', 'batches', 'plans'] as const)
  const batchStatus = readQueryEnum(route.query, 'batch_status', ['pending', 'dispatched', 'in_transit', 'completed', 'cancelled'] as const)
  const planStatus = readQueryEnum(route.query, 'plan_status', ['draft', 'confirmed', 'executing', 'completed', 'cancelled'] as const)

  if (tab) {
    activeTab.value = tab
  }
  if (batchStatus) {
    batchFilters.status = batchStatus
  }
  if (planStatus) {
    planFilters.status = planStatus
  }
}

function buildBatchParams() { const params: Record<string, string | number> = { page: 1, page_size: 100 }; if (batchFilters.batch_name.trim()) params.batch_name = batchFilters.batch_name.trim(); if (typeof batchFilters.vehicle_id === 'number') params.vehicle_id = batchFilters.vehicle_id; if (typeof batchFilters.driver_id === 'number') params.driver_id = batchFilters.driver_id; if (batchFilters.status) params.status = batchFilters.status; return params }
function buildPlanParams() { const params: Record<string, string | number> = { page: 1, page_size: 100 }; if (planFilters.plan_name.trim()) params.plan_name = planFilters.plan_name.trim(); if (typeof planFilters.vehicle_id === 'number') params.vehicle_id = planFilters.vehicle_id; if (planFilters.status) params.status = planFilters.status; return params }

async function loadSupportOptions() {
  const [stationData, vehicleData, orderData, userData] = await Promise.all([
    http.get<never, { list: StationOption[] }>('/stations', { params: { page: 1, page_size: 100, status: 1 } }),
    http.get<never, { list: VehicleOption[] }>('/transport/vehicles', { params: { page: 1, page_size: 100, status: -1 } }),
    http.get<never, OrderListResponse>('/orders', { params: { page: 1, page_size: 100 } }),
    http.get<never, UserListResponse>('/users', { params: { page: 1, page_size: 100 } }),
  ])
  stations.value = stationData.list || []
  vehicles.value = vehicleData.list || []
  orders.value = orderData.list || []
  users.value = userData.list || []
}
async function loadBatches() { batchLoading.value = true; try { const data = await http.get<never, BatchListResponse>('/dispatch/batches', { params: buildBatchParams() }); batches.value = data.list || [] } finally { batchLoading.value = false } }
async function loadPlans() { planLoading.value = true; try { const data = await http.get<never, PlanListResponse>('/dispatch/plans', { params: buildPlanParams() }); plans.value = data.list || [] } finally { planLoading.value = false } }

async function submitOptimize() {
  if (!optimizeForm.vehicle_id || optimizeForm.station_ids.length < 2) { ElMessage.warning('请选择车辆和至少两个站点'); return }
  optimizing.value = true
  try {
    optimizeResult.value = await http.post<never, RouteOptimizeResult>('/dispatch/route/optimize', { vehicle_id: optimizeForm.vehicle_id, station_ids: optimizeForm.station_ids })
    ElMessage.success('路径优化完成')
  } finally { optimizing.value = false }
}
async function submitSuggestion() {
  if (!suggestionForm.order_ids.length || !suggestionForm.date) { ElMessage.warning('请选择订单和调度时间'); return }
  suggesting.value = true
  try {
    const data = await http.post<never, SuggestionResponse>('/dispatch/suggestion', { order_ids: suggestionForm.order_ids, date: Math.floor(Number(suggestionForm.date) / 1000) })
    suggestions.value = data.suggestions || []
    unassignedOrders.value = data.unassigned_orders || []
    Object.assign(suggestionSummary, data.summary || suggestionSummary)
    suggestionLoaded.value = true
    ElMessage.success('调度建议已生成')
  } finally { suggesting.value = false }
}

function resetBatchForm() { batchForm.batch_name = ''; batchForm.vehicle_id = undefined; batchForm.driver_id = undefined; batchForm.order_ids = []; batchForm.planned_time = undefined; batchForm.remark = '' }
function openBatchDialog() { resetBatchForm(); batchDialogVisible.value = true; batchFormRef.value?.clearValidate() }
async function submitBatchDialog() {
  if (!batchFormRef.value) return
  const valid = await batchFormRef.value.validate().catch(() => false)
  if (!valid) return
  batchSubmitting.value = true
  try {
    await http.post('/dispatch/batches', { batch_name: batchForm.batch_name.trim(), vehicle_id: batchForm.vehicle_id, driver_id: batchForm.driver_id, order_ids: batchForm.order_ids, planned_time: Math.floor(Number(batchForm.planned_time) / 1000), remark: batchForm.remark.trim() })
    ElMessage.success('批次调度已创建')
    batchDialogVisible.value = false
    await loadBatches()
  } finally { batchSubmitting.value = false }
}
function openBatchStatusDialog(batch: BatchItem) { currentBatch.value = batch; batchStatusForm.status = nextBatchStatuses(batch.status)[0]?.value; batchStatusForm.remark = ''; batchStatusDialogVisible.value = true }
async function submitBatchStatus() { if (!currentBatch.value || !batchStatusForm.status) return; batchStatusSubmitting.value = true; try { await http.put(`/dispatch/batches/${currentBatch.value.id}/status`, { status: batchStatusForm.status, remark: batchStatusForm.remark.trim() }); ElMessage.success('批次状态已更新'); batchStatusDialogVisible.value = false; await loadBatches() } finally { batchStatusSubmitting.value = false } }

function resetPlanForm() { planForm.plan_name = ''; planForm.plan_date = undefined; planForm.vehicle_id = undefined; planForm.driver_id = undefined; planForm.start_point = ''; planForm.end_point = ''; planForm.waypoints = '[]'; planForm.distance = 0; planForm.estimated_hours = 0; planForm.max_capacity = 0; planForm.remark = '' }
function openPlanDialog(plan?: PlanItem) { if (plan) { planDialogMode.value = 'edit'; currentPlanId.value = plan.id; planForm.plan_name = plan.plan_name; planForm.plan_date = String(plan.plan_date * 1000); planForm.vehicle_id = plan.vehicle_id; planForm.driver_id = plan.driver_id; planForm.start_point = plan.start_point; planForm.end_point = plan.end_point; planForm.waypoints = plan.waypoints || '[]'; planForm.distance = plan.distance; planForm.estimated_hours = plan.estimated_hours; planForm.max_capacity = plan.max_capacity; planForm.remark = plan.remark } else { planDialogMode.value = 'create'; currentPlanId.value = null; resetPlanForm() } planDialogVisible.value = true; planFormRef.value?.clearValidate() }
async function submitPlanDialog() {
  if (!planFormRef.value) return
  const valid = await planFormRef.value.validate().catch(() => false)
  if (!valid) return
  planSubmitting.value = true
  try {
    const payload = { plan_name: planForm.plan_name.trim(), plan_date: Math.floor(Number(planForm.plan_date) / 1000), vehicle_id: planForm.vehicle_id, driver_id: planForm.driver_id, start_point: planForm.start_point.trim(), end_point: planForm.end_point.trim(), waypoints: planForm.waypoints.trim(), distance: Number(planForm.distance), estimated_hours: Number(planForm.estimated_hours), max_capacity: Number(planForm.max_capacity), remark: planForm.remark.trim() }
    if (planDialogMode.value === 'create') { await http.post('/dispatch/plans', payload); ElMessage.success('运输计划已创建') } else if (currentPlanId.value) { await http.put(`/dispatch/plans/${currentPlanId.value}`, payload); ElMessage.success('运输计划已更新') }
    planDialogVisible.value = false
    await loadPlans()
  } finally { planSubmitting.value = false }
}
function openPlanStatusDialog(plan: PlanItem) { currentPlan.value = plan; planStatusForm.status = nextPlanStatuses(plan.status)[0]?.value; planStatusForm.remark = ''; planStatusDialogVisible.value = true }
async function submitPlanStatus() { if (!currentPlan.value || !planStatusForm.status) return; planStatusSubmitting.value = true; try { await http.put(`/dispatch/plans/${currentPlan.value.id}/status`, { status: planStatusForm.status, remark: planStatusForm.remark.trim() }); ElMessage.success('计划状态已更新'); planStatusDialogVisible.value = false; await loadPlans() } finally { planStatusSubmitting.value = false } }
function openAssignOrdersDialog(plan: PlanItem) { currentPlan.value = plan; assignOrdersForm.order_ids = []; assignOrdersDialogVisible.value = true }
async function submitAssignOrders() { if (!currentPlan.value || !assignOrdersForm.order_ids.length) return; assignOrdersSubmitting.value = true; try { await http.post(`/dispatch/plans/${currentPlan.value.id}/orders`, { order_ids: assignOrdersForm.order_ids }); ElMessage.success('订单已加入运输计划'); assignOrdersDialogVisible.value = false; await loadPlans() } finally { assignOrdersSubmitting.value = false } }

async function applyBatchFilters() { await loadBatches() }
function resetBatchFilters() { batchFilters.batch_name = ''; batchFilters.vehicle_id = undefined; batchFilters.driver_id = undefined; batchFilters.status = undefined; void loadBatches() }
async function applyPlanFilters() { await loadPlans() }
function resetPlanFilters() { planFilters.plan_name = ''; planFilters.vehicle_id = undefined; planFilters.status = undefined; void loadPlans() }

onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadSupportOptions(), loadBatches(), loadPlans()]) })
</script>

<style scoped>
.dispatch-management-view { display: flex; flex-direction: column; gap: 1rem; }
.dispatch-hero, .dispatch-panel, .sub-panel { padding: 1.5rem; }
.dispatch-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.dispatch-hero h1, .sub-panel__head h3 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.dispatch-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.dispatch-hero__chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
.dispatch-hero__chips span { padding: 0.45rem 0.8rem; border-radius: 999px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.12); color: var(--accent-deep); font-size: 0.85rem; font-weight: 600; }
.dispatch-hero__stats, .summary-grid { display: grid; gap: 1rem; }
.dispatch-hero__stats { min-width: 18rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dispatch-hero__stats article, .summary-card { padding: 1rem 1.15rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.dispatch-hero__stats span, .summary-card span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.dispatch-hero__stats strong, .summary-card strong { font-size: 1.5rem; color: var(--accent-deep); }
.summary-grid--dispatch-small { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 1rem; }
.dispatch-tabs :deep(.el-tabs__header) { margin: 0; }
.dispatch-panel__toolbar, .sub-panel__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.dispatch-panel__toolbar { margin-bottom: 1rem; }
.dispatch-panel__toolbar strong { color: var(--ink); }
.dispatch-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.dispatch-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr); gap: 1rem; }
.dispatch-layout--optimize { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.dispatch-side { display: flex; flex-direction: column; gap: 1rem; }
.dispatch-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.dispatch-table :deep(.el-table__header th) { background: rgba(238, 77, 45, 0.06); color: var(--accent-deep); }
.dispatch-identity, .dispatch-meta { display: flex; flex-direction: column; gap: 0.25rem; }
.dispatch-identity strong, .dispatch-meta strong { color: var(--ink); }
.dispatch-identity span, .dispatch-identity small, .dispatch-meta span { color: var(--muted); }
.dispatch-actions { display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; }
.result-panel { margin-top: 1rem; }
.result-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.route-list, .side-list { display: flex; flex-direction: column; gap: 0.75rem; }
.route-list article, .side-list article { display: flex; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; border-radius: 16px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.76); }
.route-list strong, .side-list strong { color: var(--ink); }
.route-list span, .side-list span, .tip-text { color: var(--muted); }
.dispatch-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; }
.dispatch-form-grid__wide { grid-column: 1 / -1; }
@media (max-width: 1200px) { .dispatch-layout, .dispatch-layout--optimize { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .dispatch-hero, .dispatch-panel__toolbar, .sub-panel__head { flex-direction: column; } .dispatch-hero__stats, .summary-grid--dispatch-small, .dispatch-form-grid, .result-columns { grid-template-columns: 1fr; } }
</style>
