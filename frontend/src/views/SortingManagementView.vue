<template>
  <section class="sorting-management-view">
    <div class="sorting-hero card-panel">
      <div>
        <p class="eyebrow">Sorting Console</p>
        <h1>分拣管理</h1>
        <p>当前页面已接入分拣规则、分拣任务、分拣扫描、分拣记录与统计概览，适合作为分拣模块联调与业务演示入口。</p>
        <div class="sorting-hero__chips">
          <span v-for="item in topStations" :key="item.station_id">{{ normalizeText(item.station_name) }} {{ item.record_count }} 条记录</span>
        </div>
      </div>
      <div class="sorting-hero__stats">
        <article>
          <span>规则总数</span>
          <strong>{{ ruleStats.total_rules }}</strong>
        </article>
        <article>
          <span>分拣任务</span>
          <strong>{{ sortingStats.task_stats.total_tasks }}</strong>
        </article>
        <article>
          <span>分拣记录</span>
          <strong>{{ sortingStats.record_stats.total_records }}</strong>
        </article>
        <article>
          <span>准确率</span>
          <strong>{{ sortingStats.record_stats.accuracy_rate || '0.0%' }}</strong>
        </article>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="sorting-tabs">
      <el-tab-pane label="规则中心" name="rules">
        <div class="card-panel sorting-panel">
          <div class="sorting-panel__toolbar">
            <div>
              <p class="eyebrow">Rules</p>
              <strong>规则筛选、创建、编辑、启停与删除</strong>
            </div>
            <div class="sorting-panel__toolbar-actions">
              <el-button @click="loadRuleStats">刷新统计</el-button>
              <el-button type="primary" @click="openRuleDialog()">新建规则</el-button>
            </div>
          </div>

          <div class="summary-grid">
            <article class="summary-card card-panel">
              <span>启用规则</span>
              <strong>{{ ruleStats.enabled_rules }}</strong>
            </article>
            <article class="summary-card card-panel">
              <span>禁用规则</span>
              <strong>{{ ruleStats.disabled_rules }}</strong>
            </article>
            <article class="summary-card card-panel">
              <span>主要国家</span>
              <strong>{{ normalizeText(ruleStats.country_stats[0]?.country, '-') }}</strong>
            </article>
          </div>

          <el-form :inline="true" :model="ruleFilters" class="sorting-filters" @submit.prevent>
            <el-form-item label="规则名">
              <el-input v-model="ruleFilters.rule_name" clearable placeholder="请输入规则名称" @keyup.enter="applyRuleFilters" />
            </el-form-item>
            <el-form-item label="国家">
              <el-input v-model="ruleFilters.country" clearable placeholder="如：中国" />
            </el-form-item>
            <el-form-item label="城市">
              <el-input v-model="ruleFilters.city" clearable placeholder="可选" />
            </el-form-item>
            <el-form-item label="站点">
              <el-select v-model="ruleFilters.station_id" clearable placeholder="全部站点" style="width: 220px">
                <el-option label="全部站点" :value="undefined" />
                <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="ruleFilters.status" style="width: 160px">
                <el-option label="全部状态" :value="-1" />
                <el-option label="启用" :value="1" />
                <el-option label="禁用" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyRuleFilters">查询</el-button>
              <el-button @click="resetRuleFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="ruleLoading" :data="rules" class="sorting-table" stripe>
            <el-table-column label="规则" min-width="220">
              <template #default="scope">
                <div class="sorting-identity">
                  <strong>{{ normalizeText(scope.row.rule_name) }}</strong>
                  <span>{{ scope.row.route_code }}</span>
                  <small>{{ formatRegion(scope.row.country, scope.row.province, scope.row.city, scope.row.district) }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="目标站点" min-width="180">
              <template #default="scope">{{ normalizeText(scope.row.station_name) }}</template>
            </el-table-column>
            <el-table-column label="优先级" width="100">
              <template #default="scope"><el-tag effect="plain" type="warning">{{ scope.row.priority }}</el-tag></template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope"><el-tag :type="scope.row.status === 1 ? 'success' : 'info'" effect="dark">{{ scope.row.status_name }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="180" />
            <el-table-column label="操作" fixed="right" width="250">
              <template #default="scope">
                <div class="sorting-actions">
                  <el-button link type="primary" @click="openRuleDialog(scope.row)">编辑</el-button>
                  <el-button link :type="scope.row.status === 1 ? 'warning' : 'success'" @click="toggleRuleStatus(scope.row)">{{ scope.row.status === 1 ? '禁用' : '启用' }}</el-button>
                  <el-button link type="danger" @click="deleteRule(scope.row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="sorting-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="rulePagination.total" :current-page="rulePagination.page" :page-size="rulePagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleRulePageChange" @size-change="handleRuleSizeChange" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="任务中心" name="tasks">
        <div class="card-panel sorting-panel">
          <div class="sorting-panel__toolbar">
            <div>
              <p class="eyebrow">Tasks</p>
              <strong>任务创建、状态流转与快速扫描</strong>
            </div>
            <div class="sorting-panel__toolbar-actions">
              <el-button @click="loadSortingStats">刷新统计</el-button>
              <el-button type="primary" @click="openTaskDialog()">创建任务</el-button>
            </div>
          </div>

          <div class="summary-grid summary-grid--task">
            <article class="summary-card card-panel"><span>待处理</span><strong>{{ sortingStats.task_stats.pending_tasks }}</strong></article>
            <article class="summary-card card-panel"><span>处理中</span><strong>{{ sortingStats.task_stats.processing_tasks }}</strong></article>
            <article class="summary-card card-panel"><span>已完成</span><strong>{{ sortingStats.task_stats.completed_tasks }}</strong></article>
            <article class="summary-card card-panel"><span>平均进度</span><strong>{{ formatPercent(sortingStats.task_stats.avg_progress) }}</strong></article>
          </div>

          <div class="sorting-layout">
            <div class="card-panel sub-panel">
              <el-form :inline="true" :model="taskFilters" class="sorting-filters" @submit.prevent>
                <el-form-item label="任务号">
                  <el-input v-model="taskFilters.task_no" clearable placeholder="请输入任务编号" @keyup.enter="applyTaskFilters" />
                </el-form-item>
                <el-form-item label="站点">
                  <el-select v-model="taskFilters.station_id" clearable placeholder="全部站点" style="width: 220px">
                    <el-option label="全部站点" :value="undefined" />
                    <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="员工">
                  <el-select v-model="taskFilters.assigned_to" clearable placeholder="全部员工" style="width: 220px">
                    <el-option label="全部员工" :value="undefined" />
                    <el-option v-for="item in workerOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="状态">
                  <el-select v-model="taskFilters.status" clearable placeholder="全部状态" style="width: 160px">
                    <el-option label="全部状态" :value="undefined" />
                    <el-option v-for="item in taskStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="applyTaskFilters">查询</el-button>
                  <el-button @click="resetTaskFilters">重置</el-button>
                </el-form-item>
              </el-form>

              <el-table v-loading="taskLoading" :data="tasks" class="sorting-table" stripe>
                <el-table-column label="任务" min-width="210">
                  <template #default="scope">
                    <div class="sorting-identity">
                      <strong>{{ scope.row.task_no }}</strong>
                      <span>{{ normalizeText(scope.row.station_name) }}</span>
                      <small>{{ normalizeText(scope.row.remark, '无备注') }}</small>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="分拣员" min-width="140">
                  <template #default="scope">{{ normalizeText(scope.row.assigned_name, '未分配') }}</template>
                </el-table-column>
                <el-table-column label="数量 / 进度" width="170">
                  <template #default="scope">
                    <div class="task-progress">
                      <strong>{{ scope.row.sorted_count }} / {{ scope.row.total_count }}</strong>
                      <el-progress :percentage="safePercentage(scope.row.progress)" :stroke-width="8" />
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="120">
                  <template #default="scope"><el-tag :type="taskStatusTagType(scope.row.status)" effect="dark">{{ scope.row.status_name }}</el-tag></template>
                </el-table-column>
                <el-table-column prop="create_time" label="创建时间" min-width="170" />
                <el-table-column label="操作" fixed="right" width="240">
                  <template #default="scope">
                    <div class="sorting-actions">
                      <el-button link type="primary" @click="openTaskDialog(scope.row)">编辑</el-button>
                      <el-button v-if="nextTaskStatuses(scope.row.status).length" link type="warning" @click="openTaskStatusDialog(scope.row)">状态流转</el-button>
                      <el-button link type="success" @click="prefillScan(scope.row)">快速扫描</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>

              <div class="sorting-pagination">
                <el-pagination background layout="total, prev, pager, next, sizes" :total="taskPagination.total" :current-page="taskPagination.page" :page-size="taskPagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleTaskPageChange" @size-change="handleTaskSizeChange" />
              </div>
            </div>

            <div class="sorting-side">
              <div class="card-panel sub-panel">
                <div class="sub-panel__head">
                  <div>
                    <p class="eyebrow">Quick Scan</p>
                    <h3>分拣扫描</h3>
                  </div>
                </div>
                <el-form :model="scanForm" label-position="top">
                  <el-form-item label="扫描码">
                    <el-input v-model="scanForm.scan_code" placeholder="请输入订单号或包裹号" />
                  </el-form-item>
                  <el-form-item label="当前站点">
                    <el-select v-model="scanForm.station_id" placeholder="请选择站点" style="width: 100%">
                      <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="关联任务号">
                    <el-select v-model="scanForm.task_code" clearable placeholder="可选" style="width: 100%">
                      <el-option label="不关联任务" :value="''" />
                      <el-option v-for="item in taskOptionsForScan" :key="item.id" :label="item.task_no" :value="item.task_no" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="备注">
                    <el-input v-model="scanForm.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="可选，填写扫描备注" />
                  </el-form-item>
                  <el-button type="primary" :loading="scanSubmitting" @click="submitScan">提交扫描</el-button>
                </el-form>

                <div v-if="scanResult" class="scan-result">
                  <el-tag :type="scanResult.route_matched ? 'success' : 'warning'" effect="dark">{{ scanResult.route_matched ? '已匹配路由' : '未匹配路由' }}</el-tag>
                  <p>{{ scanResult.message }}</p>
                  <small v-if="scanResult.parcel_no || scanResult.task_no">
                    {{ scanResult.parcel_no || '整单' }} / {{ scanResult.task_no || '未关联任务' }}
                  </small>
                  <small v-else-if="scanResult.route_code">路由：{{ scanResult.route_code }} / {{ normalizeText(scanResult.station_name) }}</small>
                </div>
              </div>

              <div class="card-panel sub-panel">
                <div class="sub-panel__head">
                  <div>
                    <p class="eyebrow">Sorter Top</p>
                    <h3>分拣员统计</h3>
                  </div>
                </div>
                <div class="side-list">
                  <article v-for="item in sortingStats.sorter_stats" :key="item.sorter_id">
                    <strong>{{ normalizeText(item.sorter_name) }}</strong>
                    <span>{{ item.record_count }} 条记录 · {{ item.accuracy_rate }}</span>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="记录中心" name="records">
        <div class="card-panel sorting-panel">
          <div class="sorting-panel__toolbar">
            <div>
              <p class="eyebrow">Records</p>
              <strong>分拣记录检索与准确率回看</strong>
            </div>
            <div class="sorting-panel__toolbar-actions">
              <el-button @click="loadSortingStats">刷新统计</el-button>
            </div>
          </div>

          <div class="summary-grid summary-grid--task">
            <article class="summary-card card-panel"><span>正确记录</span><strong>{{ sortingStats.record_stats.correct_records }}</strong></article>
            <article class="summary-card card-panel"><span>错误记录</span><strong>{{ sortingStats.record_stats.error_records }}</strong></article>
            <article class="summary-card card-panel"><span>总体准确率</span><strong>{{ sortingStats.accuracy_stats.overall_rate || sortingStats.record_stats.accuracy_rate }}</strong></article>
          </div>

          <el-form :inline="true" :model="recordFilters" class="sorting-filters" @submit.prevent>
            <el-form-item label="任务ID">
              <el-input-number v-model="recordFilters.task_id" :min="1" :step="1" style="width: 140px" />
            </el-form-item>
            <el-form-item label="订单ID">
              <el-input-number v-model="recordFilters.order_id" :min="1" :step="1" style="width: 140px" />
            </el-form-item>
            <el-form-item label="站点">
              <el-select v-model="recordFilters.station_id" clearable placeholder="全部站点" style="width: 220px">
                <el-option label="全部站点" :value="undefined" />
                <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="分拣员">
              <el-select v-model="recordFilters.sorter_id" clearable placeholder="全部员工" style="width: 220px">
                <el-option label="全部员工" :value="undefined" />
                <el-option v-for="item in workerOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="正确性">
              <el-select v-model="recordFilters.is_correct" style="width: 160px">
                <el-option label="全部记录" :value="-1" />
                <el-option label="正确" :value="1" />
                <el-option label="错误" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyRecordFilters">查询</el-button>
              <el-button @click="resetRecordFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="recordLoading" :data="records" class="sorting-table" stripe>
            <el-table-column label="记录" min-width="240">
              <template #default="scope">
                <div class="sorting-identity">
                  <strong>{{ scope.row.order_no }}</strong>
                  <span>{{ scope.row.task_no || '未关联任务' }}</span>
                  <small>{{ normalizeText(scope.row.station_name) }} → {{ normalizeText(scope.row.target_name) }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="规则 / 路由" min-width="200">
              <template #default="scope">
                <div class="sorting-identity">
                  <strong>{{ normalizeText(scope.row.rule_name, '无规则') }}</strong>
                  <span>{{ normalizeText(scope.row.route_code, '无路由') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="分拣员" min-width="140">
              <template #default="scope">{{ normalizeText(scope.row.sorter_name, '未知分拣员') }}</template>
            </el-table-column>
            <el-table-column label="正确性" width="110">
              <template #default="scope"><el-tag :type="scope.row.is_correct === 1 ? 'success' : 'danger'" effect="dark">{{ scope.row.is_correct_name }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="scan_time_format" label="扫描时间" min-width="170" />
            <el-table-column prop="remark" label="备注" min-width="180" />
          </el-table>

          <div class="sorting-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="recordPagination.total" :current-page="recordPagination.page" :page-size="recordPagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleRecordPageChange" @size-change="handleRecordSizeChange" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="ruleDialogVisible" :title="ruleDialogMode === 'create' ? '新建分拣规则' : '编辑分拣规则'" width="760px">
      <el-form ref="ruleFormRef" :model="ruleForm" :rules="ruleRules" label-position="top">
        <div class="sorting-form-grid">
          <el-form-item label="规则名称" prop="rule_name"><el-input v-model="ruleForm.rule_name" placeholder="请输入规则名称" /></el-form-item>
          <el-form-item label="路由代码" prop="route_code"><el-input v-model="ruleForm.route_code" placeholder="请输入路由代码" /></el-form-item>
          <el-form-item label="国家" prop="country"><el-input v-model="ruleForm.country" placeholder="请输入国家" /></el-form-item>
          <el-form-item label="省份"><el-input v-model="ruleForm.province" placeholder="可选" /></el-form-item>
          <el-form-item label="城市"><el-input v-model="ruleForm.city" placeholder="可选" /></el-form-item>
          <el-form-item label="区县"><el-input v-model="ruleForm.district" placeholder="可选" /></el-form-item>
          <el-form-item label="目标站点" prop="station_id"><el-select v-model="ruleForm.station_id" placeholder="请选择站点" style="width: 100%"><el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="优先级"><el-input-number v-model="ruleForm.priority" :step="10" style="width: 100%" /></el-form-item>
          <el-form-item label="描述" class="sorting-form-grid__wide"><el-input v-model="ruleForm.description" type="textarea" :rows="4" maxlength="300" show-word-limit placeholder="请输入规则描述" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="ruleSubmitting" @click="submitRuleDialog">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogMode === 'create' ? '创建分拣任务' : '编辑分拣任务'" width="680px">
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-position="top">
        <div class="sorting-form-grid">
          <el-form-item label="站点" prop="station_id"><el-select v-model="taskForm.station_id" placeholder="请选择站点" style="width: 100%"><el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="分配员工"><el-select v-model="taskForm.assigned_to" clearable placeholder="可选，默认未分配" style="width: 100%"><el-option label="未分配" :value="undefined" /><el-option v-for="item in workerOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="预计总量" prop="total_count"><el-input-number v-model="taskForm.total_count" :min="0" :step="1" style="width: 100%" /></el-form-item>
          <el-form-item label="备注" class="sorting-form-grid__wide"><el-input v-model="taskForm.remark" type="textarea" :rows="4" maxlength="300" show-word-limit placeholder="请输入任务备注" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="taskSubmitting" @click="submitTaskDialog">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskStatusDialogVisible" title="更新任务状态" width="460px">
      <el-form label-position="top">
        <el-form-item label="目标状态"><el-select v-model="taskStatusForm.status" placeholder="请选择状态" style="width: 100%"><el-option v-for="item in currentTaskStatusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="taskStatusForm.remark" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="可选，填写状态流转备注" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskStatusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="taskStatusSubmitting" :disabled="!taskStatusForm.status" @click="submitTaskStatus">确认更新</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useRoute } from 'vue-router'

import http from '@/utils/http'
import { readQueryEnum, readQueryNumber } from '@/utils/workbench'

type StationOption = { id: number; station_code: string; name: string }
type UserOption = { id: number; username: string; real_name?: string; role: number; role_name: string; status: number }
type UserListResponse = { list: UserOption[]; total: number; page: number; page_size: number; pages: number }
type SortingRuleItem = { id: number; rule_name: string; country: string; province: string; city: string; district: string; route_code: string; station_id: number; station_name: string; priority: number; status: number; status_name: string; description: string; create_time: string; update_time: string }
type SortingRuleListResponse = { list: SortingRuleItem[]; total: number; page: number; page_size: number; pages: number }
type SortingRuleStatsResponse = { total_rules: number; enabled_rules: number; disabled_rules: number; country_stats: Array<{ country: string; count: number }>; station_stats: Array<{ station_id: number; station_name: string; count: number }>; priority_stats: Array<{ priority: string; count: number }> }
type SortingTaskItem = { id: number; task_no: string; station_id: number; station_name: string; assigned_to: number; assigned_name: string; total_count: number; sorted_count: number; progress: number; status: string; status_name: string; start_time: number; end_time: number; duration: number; remark: string; create_time: string; update_time: string }
type SortingTaskListResponse = { list: SortingTaskItem[]; total: number; page: number; page_size: number; pages: number }
type SortingRecordItem = { id: number; task_id: number; task_no: string; order_id: number; order_no: string; station_id: number; station_name: string; rule_id: number; rule_name: string; route_code: string; target_station: number; target_name: string; sorter_id: number; sorter_name: string; scan_time: number; scan_time_format: string; is_correct: number; is_correct_name: string; remark: string }
type SortingRecordListResponse = { list: SortingRecordItem[]; total: number; page: number; page_size: number; pages: number }
type SortingScanResponse = { record_id: number; order_id: number; order_no: string; parcel_no?: string; task_id?: number; task_no?: string; scan_code_type?: string; route_matched: boolean; route_code?: string; station_name?: string; match_level?: string; suggestions?: SortingRuleItem[]; message: string }
type SortingStatsResponse = { task_stats: { total_tasks: number; pending_tasks: number; processing_tasks: number; completed_tasks: number; cancelled_tasks: number; avg_progress: number; total_items: number; sorted_items: number }; record_stats: { total_records: number; correct_records: number; error_records: number; accuracy_rate: string; avg_scan_time: number }; sorter_stats: Array<{ sorter_id: number; sorter_name: string; task_count: number; record_count: number; correct_count: number; error_count: number; accuracy_rate: string; avg_speed: number }>; station_stats: Array<{ station_id: number; station_name: string; task_count: number; record_count: number; item_count: number }>; accuracy_stats: { overall_rate: string } }

const taskStatusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const route = useRoute()
const activeTab = ref('rules')
const stationOptions = ref<StationOption[]>([])
const workerOptions = ref<UserOption[]>([])
const rules = ref<SortingRuleItem[]>([])
const tasks = ref<SortingTaskItem[]>([])
const records = ref<SortingRecordItem[]>([])
const scanResult = ref<SortingScanResponse | null>(null)
const ruleLoading = ref(false)
const taskLoading = ref(false)
const recordLoading = ref(false)
const ruleSubmitting = ref(false)
const taskSubmitting = ref(false)
const taskStatusSubmitting = ref(false)
const scanSubmitting = ref(false)

const ruleStats = reactive<SortingRuleStatsResponse>({ total_rules: 0, enabled_rules: 0, disabled_rules: 0, country_stats: [], station_stats: [], priority_stats: [] })
const sortingStats = reactive<SortingStatsResponse>({ task_stats: { total_tasks: 0, pending_tasks: 0, processing_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, avg_progress: 0, total_items: 0, sorted_items: 0 }, record_stats: { total_records: 0, correct_records: 0, error_records: 0, accuracy_rate: '0.0%', avg_scan_time: 0 }, sorter_stats: [], station_stats: [], accuracy_stats: { overall_rate: '0.0%' } })

const rulePagination = reactive({ total: 0, page: 1, pageSize: 10 })
const taskPagination = reactive({ total: 0, page: 1, pageSize: 10 })
const recordPagination = reactive({ total: 0, page: 1, pageSize: 10 })

const ruleFilters = reactive({ rule_name: '', country: '', city: '', station_id: undefined as number | undefined, status: -1 })
const taskFilters = reactive({ task_no: '', station_id: undefined as number | undefined, assigned_to: undefined as number | undefined, status: undefined as string | undefined })
const recordFilters = reactive({ task_id: undefined as number | undefined, order_id: undefined as number | undefined, station_id: undefined as number | undefined, sorter_id: undefined as number | undefined, is_correct: -1 })
const scanForm = reactive({ scan_code: '', station_id: undefined as number | undefined, task_code: '', remark: '' })

const ruleDialogVisible = ref(false)
const ruleDialogMode = ref<'create' | 'edit'>('create')
const currentRuleId = ref<number | null>(null)
const ruleFormRef = ref<FormInstance>()
const ruleForm = reactive({ rule_name: '', country: '', province: '', city: '', district: '', route_code: '', station_id: undefined as number | undefined, priority: 100, description: '' })
const ruleRules: FormRules<typeof ruleForm> = { rule_name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }], country: [{ required: true, message: '请输入国家', trigger: 'blur' }], route_code: [{ required: true, message: '请输入路由代码', trigger: 'blur' }], station_id: [{ required: true, message: '请选择目标站点', trigger: 'change' }] }

const taskDialogVisible = ref(false)
const taskDialogMode = ref<'create' | 'edit'>('create')
const currentTaskId = ref<number | null>(null)
const taskFormRef = ref<FormInstance>()
const taskForm = reactive({ station_id: undefined as number | undefined, assigned_to: undefined as number | undefined, total_count: 0, remark: '' })
const taskRules: FormRules<typeof taskForm> = { station_id: [{ required: true, message: '请选择站点', trigger: 'change' }] }

const taskStatusDialogVisible = ref(false)
const currentTaskForStatus = ref<SortingTaskItem | null>(null)
const taskStatusForm = reactive({ status: undefined as string | undefined, remark: '' })

const topStations = computed(() => sortingStats.station_stats.slice(0, 4))
const taskOptionsForScan = computed(() => tasks.value.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').slice(0, 20))
const currentTaskStatusOptions = computed(() => nextTaskStatuses(currentTaskForStatus.value?.status || ''))

function normalizeText(value: string | null | undefined, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text)) return fallback; return text }
function displayUserName(user: UserOption) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})` }
function formatRegion(country?: string, province?: string, city?: string, district?: string) { return [country, province, city, district].map((item) => normalizeText(item, '')).filter(Boolean).join(' / ') || '-' }
function formatPercent(value: number | undefined) { return `${(Number(value) || 0).toFixed(1)}%` }
function safePercentage(value: number | undefined) { const result = Number(value) || 0; return result < 0 ? 0 : result > 100 ? 100 : Number(result.toFixed(1)) }
function taskStatusTagType(status: string): 'success' | 'warning' | 'info' | 'primary' { return ({ pending: 'info', processing: 'warning', completed: 'success', cancelled: 'primary' } as const)[status] || 'info' }
function nextTaskStatuses(status: string) { return ({ pending: [{ value: 'processing', label: '处理中' }, { value: 'cancelled', label: '已取消' }], processing: [{ value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }], completed: [], cancelled: [] } as Record<string, Array<{ value: string; label: string }>>)[status] || [] }

function applyWorkbenchFilters() {
  const tab = readQueryEnum(route.query, 'tab', ['rules', 'tasks', 'records'] as const)
  const taskStatus = readQueryEnum(route.query, 'task_status', ['pending', 'processing', 'completed', 'cancelled'] as const)
  const recordIsCorrect = readQueryNumber(route.query, 'record_is_correct')

  if (tab) {
    activeTab.value = tab
  }
  if (taskStatus) {
    taskFilters.status = taskStatus
  }
  if (typeof recordIsCorrect === 'number' && [-1, 0, 1].includes(recordIsCorrect)) {
    recordFilters.is_correct = recordIsCorrect
  }
}

function buildRuleParams() { const params: Record<string, string | number> = { page: rulePagination.page, page_size: rulePagination.pageSize, status: ruleFilters.status }; if (ruleFilters.rule_name.trim()) params.rule_name = ruleFilters.rule_name.trim(); if (ruleFilters.country.trim()) params.country = ruleFilters.country.trim(); if (ruleFilters.city.trim()) params.city = ruleFilters.city.trim(); if (typeof ruleFilters.station_id === 'number') params.station_id = ruleFilters.station_id; return params }
function buildTaskParams() { const params: Record<string, string | number> = { page: taskPagination.page, page_size: taskPagination.pageSize }; if (taskFilters.task_no.trim()) params.task_no = taskFilters.task_no.trim(); if (typeof taskFilters.station_id === 'number') params.station_id = taskFilters.station_id; if (typeof taskFilters.assigned_to === 'number') params.assigned_to = taskFilters.assigned_to; if (taskFilters.status) params.status = taskFilters.status; return params }
function buildRecordParams() { const params: Record<string, string | number> = { page: recordPagination.page, page_size: recordPagination.pageSize, is_correct: recordFilters.is_correct }; if (typeof recordFilters.task_id === 'number') params.task_id = recordFilters.task_id; if (typeof recordFilters.order_id === 'number') params.order_id = recordFilters.order_id; if (typeof recordFilters.station_id === 'number') params.station_id = recordFilters.station_id; if (typeof recordFilters.sorter_id === 'number') params.sorter_id = recordFilters.sorter_id; return params }

async function loadStationOptions() { const data = await http.get<never, { list: StationOption[] }>('/stations', { params: { page: 1, page_size: 100, status: 1 } }); stationOptions.value = data.list || [] }
async function loadWorkerOptions() { try { const data = await http.get<never, UserListResponse>('/users', { params: { page: 1, page_size: 100 } }); workerOptions.value = (data.list || []).filter((item) => item.status === 1 && item.role >= 2) } catch { workerOptions.value = [] } }
async function loadRules() { ruleLoading.value = true; try { const data = await http.get<never, SortingRuleListResponse>('/sorting/rules', { params: buildRuleParams() }); rules.value = data.list || []; rulePagination.total = data.total || 0; rulePagination.page = data.page || rulePagination.page; rulePagination.pageSize = data.page_size || rulePagination.pageSize } finally { ruleLoading.value = false } }
async function loadRuleStats() { Object.assign(ruleStats, await http.get<never, SortingRuleStatsResponse>('/sorting/rules/stats')) }
async function loadTasks() { taskLoading.value = true; try { const data = await http.get<never, SortingTaskListResponse>('/sorting/tasks', { params: buildTaskParams() }); tasks.value = data.list || []; taskPagination.total = data.total || 0; taskPagination.page = data.page || taskPagination.page; taskPagination.pageSize = data.page_size || taskPagination.pageSize } finally { taskLoading.value = false } }
async function loadRecords() { recordLoading.value = true; try { const data = await http.get<never, SortingRecordListResponse>('/sorting/records', { params: buildRecordParams() }); records.value = data.list || []; recordPagination.total = data.total || 0; recordPagination.page = data.page || recordPagination.page; recordPagination.pageSize = data.page_size || recordPagination.pageSize } finally { recordLoading.value = false } }
async function loadSortingStats() { Object.assign(sortingStats, await http.get<never, SortingStatsResponse>('/sorting/stats')) }

function resetRuleForm() { ruleForm.rule_name = ''; ruleForm.country = ''; ruleForm.province = ''; ruleForm.city = ''; ruleForm.district = ''; ruleForm.route_code = ''; ruleForm.station_id = undefined; ruleForm.priority = 100; ruleForm.description = '' }
function openRuleDialog(rule?: SortingRuleItem) { if (rule) { ruleDialogMode.value = 'edit'; currentRuleId.value = rule.id; ruleForm.rule_name = rule.rule_name; ruleForm.country = rule.country; ruleForm.province = rule.province; ruleForm.city = rule.city; ruleForm.district = rule.district; ruleForm.route_code = rule.route_code; ruleForm.station_id = rule.station_id; ruleForm.priority = rule.priority; ruleForm.description = rule.description } else { ruleDialogMode.value = 'create'; currentRuleId.value = null; resetRuleForm() } ruleDialogVisible.value = true; ruleFormRef.value?.clearValidate() }
async function submitRuleDialog() { if (!ruleFormRef.value) return; const valid = await ruleFormRef.value.validate().catch(() => false); if (!valid) return; ruleSubmitting.value = true; try { const payload = { rule_name: ruleForm.rule_name.trim(), country: ruleForm.country.trim(), province: ruleForm.province.trim(), city: ruleForm.city.trim(), district: ruleForm.district.trim(), route_code: ruleForm.route_code.trim(), station_id: ruleForm.station_id, priority: Number(ruleForm.priority), description: ruleForm.description.trim() }; if (ruleDialogMode.value === 'create') { await http.post('/sorting/rules', payload); ElMessage.success('分拣规则已创建') } else if (currentRuleId.value) { await http.put(`/sorting/rules/${currentRuleId.value}`, payload); ElMessage.success('分拣规则已更新') } ruleDialogVisible.value = false; await Promise.all([loadRules(), loadRuleStats()]) } finally { ruleSubmitting.value = false } }
async function toggleRuleStatus(rule: SortingRuleItem) { await http.put(`/sorting/rules/${rule.id}/status`, { status: rule.status === 1 ? 0 : 1 }); ElMessage.success(`规则已${rule.status === 1 ? '禁用' : '启用'}`); await Promise.all([loadRules(), loadRuleStats()]) }
async function deleteRule(rule: SortingRuleItem) { await ElMessageBox.confirm(`确认删除规则 “${rule.rule_name}” 吗？`, '删除确认', { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }); await http.delete(`/sorting/rules/${rule.id}`); ElMessage.success('规则已删除'); await Promise.all([loadRules(), loadRuleStats()]) }

function resetTaskForm() { taskForm.station_id = undefined; taskForm.assigned_to = undefined; taskForm.total_count = 0; taskForm.remark = '' }
function openTaskDialog(task?: SortingTaskItem) { if (task) { taskDialogMode.value = 'edit'; currentTaskId.value = task.id; taskForm.station_id = task.station_id; taskForm.assigned_to = task.assigned_to || undefined; taskForm.total_count = task.total_count; taskForm.remark = task.remark } else { taskDialogMode.value = 'create'; currentTaskId.value = null; resetTaskForm() } taskDialogVisible.value = true; taskFormRef.value?.clearValidate() }
async function submitTaskDialog() { if (!taskFormRef.value) return; const valid = await taskFormRef.value.validate().catch(() => false); if (!valid) return; taskSubmitting.value = true; try { const payload = { station_id: taskForm.station_id, assigned_to: taskForm.assigned_to || 0, total_count: Number(taskForm.total_count), remark: taskForm.remark.trim() }; if (taskDialogMode.value === 'create') { await http.post('/sorting/tasks', payload); ElMessage.success('分拣任务已创建') } else if (currentTaskId.value) { await http.put(`/sorting/tasks/${currentTaskId.value}`, payload); ElMessage.success('分拣任务已更新') } taskDialogVisible.value = false; await Promise.all([loadTasks(), loadSortingStats()]) } finally { taskSubmitting.value = false } }
function openTaskStatusDialog(task: SortingTaskItem) { currentTaskForStatus.value = task; taskStatusForm.status = nextTaskStatuses(task.status)[0]?.value; taskStatusForm.remark = ''; taskStatusDialogVisible.value = true }
async function submitTaskStatus() { if (!currentTaskForStatus.value || !taskStatusForm.status) return; taskStatusSubmitting.value = true; try { await http.put(`/sorting/tasks/${currentTaskForStatus.value.id}/status`, { status: taskStatusForm.status, remark: taskStatusForm.remark.trim() }); ElMessage.success('任务状态已更新'); taskStatusDialogVisible.value = false; await Promise.all([loadTasks(), loadSortingStats()]) } finally { taskStatusSubmitting.value = false } }

function prefillScan(task: SortingTaskItem) { activeTab.value = 'tasks'; scanForm.task_code = task.task_no; scanForm.station_id = task.station_id; scanForm.scan_code = ''; scanForm.remark = '' }
async function submitScan() { if (!scanForm.scan_code.trim() || !scanForm.station_id) { ElMessage.warning('请填写扫描码和站点'); return } scanSubmitting.value = true; try { scanResult.value = await http.post<never, SortingScanResponse>('/sorting/scan', { scan_code: scanForm.scan_code.trim(), station_id: Number(scanForm.station_id), task_code: scanForm.task_code.trim(), remark: scanForm.remark.trim() }); ElMessage.success(scanResult.value.message); await Promise.all([loadTasks(), loadRecords(), loadSortingStats()]) } finally { scanSubmitting.value = false } }

async function applyRuleFilters() { rulePagination.page = 1; await loadRules() }
function resetRuleFilters() { ruleFilters.rule_name = ''; ruleFilters.country = ''; ruleFilters.city = ''; ruleFilters.station_id = undefined; ruleFilters.status = -1; rulePagination.page = 1; void loadRules() }
function handleRulePageChange(page: number) { rulePagination.page = page; void loadRules() }
function handleRuleSizeChange(size: number) { rulePagination.pageSize = size; rulePagination.page = 1; void loadRules() }
async function applyTaskFilters() { taskPagination.page = 1; await loadTasks() }
function resetTaskFilters() { taskFilters.task_no = ''; taskFilters.station_id = undefined; taskFilters.assigned_to = undefined; taskFilters.status = undefined; taskPagination.page = 1; void loadTasks() }
function handleTaskPageChange(page: number) { taskPagination.page = page; void loadTasks() }
function handleTaskSizeChange(size: number) { taskPagination.pageSize = size; taskPagination.page = 1; void loadTasks() }
async function applyRecordFilters() { recordPagination.page = 1; await loadRecords() }
function resetRecordFilters() { recordFilters.task_id = undefined; recordFilters.order_id = undefined; recordFilters.station_id = undefined; recordFilters.sorter_id = undefined; recordFilters.is_correct = -1; recordPagination.page = 1; void loadRecords() }
function handleRecordPageChange(page: number) { recordPagination.page = page; void loadRecords() }
function handleRecordSizeChange(size: number) { recordPagination.pageSize = size; recordPagination.page = 1; void loadRecords() }

onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadStationOptions(), loadWorkerOptions(), loadRules(), loadRuleStats(), loadTasks(), loadRecords(), loadSortingStats()]) })
</script>

<style scoped>
.sorting-management-view { display: flex; flex-direction: column; gap: 1rem; }
.sorting-hero, .sorting-panel, .sub-panel { padding: 1.5rem; }
.sorting-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.sorting-hero h1 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.sorting-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.sorting-hero__chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
.sorting-hero__chips span { padding: 0.45rem 0.8rem; border-radius: 999px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.12); color: var(--accent-deep); font-size: 0.85rem; font-weight: 600; }
.sorting-hero__stats, .summary-grid { display: grid; gap: 1rem; }
.sorting-hero__stats { min-width: 18rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sorting-hero__stats article, .summary-card { padding: 1rem 1.15rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.sorting-hero__stats span, .summary-card span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.sorting-hero__stats strong, .summary-card strong { font-size: 1.5rem; color: var(--accent-deep); }
.summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 1rem; }
.summary-grid--task { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.sorting-tabs :deep(.el-tabs__header) { margin: 0; }
.sorting-panel__toolbar, .sub-panel__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.sorting-panel__toolbar { margin-bottom: 1rem; }
.sorting-panel__toolbar strong { color: var(--ink); }
.sorting-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.sorting-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr); gap: 1rem; }
.sorting-side { display: flex; flex-direction: column; gap: 1rem; }
.sorting-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.sorting-table :deep(.el-table__header th) { background: rgba(238, 77, 45, 0.06); color: var(--accent-deep); }
.sorting-identity { display: flex; flex-direction: column; gap: 0.25rem; }
.sorting-identity strong { color: var(--ink); }
.sorting-identity span, .sorting-identity small { color: var(--muted); }
.sorting-actions { display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; }
.sorting-pagination { display: flex; justify-content: flex-end; margin-top: 1rem; }
.side-list { display: flex; flex-direction: column; gap: 0.75rem; }
.side-list article { display: flex; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; border-radius: 16px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.76); }
.side-list strong, .scan-result p { color: var(--ink); }
.side-list span, .scan-result small { color: var(--muted); }
.task-progress { display: flex; flex-direction: column; gap: 0.45rem; }
.scan-result { display: flex; flex-direction: column; gap: 0.55rem; margin-top: 1rem; }
.sorting-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; }
.sorting-form-grid__wide { grid-column: 1 / -1; }
@media (max-width: 1200px) { .sorting-layout { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .sorting-hero, .sorting-panel__toolbar, .sub-panel__head { flex-direction: column; } .sorting-hero__stats, .summary-grid, .summary-grid--task, .sorting-form-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .sorting-pagination { justify-content: flex-start; overflow: auto; } }
</style>
