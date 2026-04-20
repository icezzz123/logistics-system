<template>
  <section class="transport-management-view">
    <div class="transport-hero card-panel">
      <div>
        <p class="eyebrow">Transport Hub</p>
        <h1>运输管理</h1>
        <p>当前页面已接入车辆、运输任务、装卸扫描、装卸记录、运输监控、预警与成本概览，适合作为运输模块统一操作台。</p>
        <div class="transport-hero__chips">
          <span v-for="item in topDrivers" :key="item.driver_id">{{ normalizeText(item.driver_name) }} {{ formatMoney(item.cost) }}</span>
        </div>
      </div>
      <div class="transport-hero__stats">
        <article>
          <span>车辆总数</span>
          <strong>{{ transportStats.vehicle_stats.total_vehicles }}</strong>
        </article>
        <article>
          <span>运输任务</span>
          <strong>{{ monitorOverview.total_tasks }}</strong>
        </article>
        <article>
          <span>严重预警</span>
          <strong>{{ monitorOverview.critical_tasks }}</strong>
        </article>
        <article>
          <span>运输成本</span>
          <strong>{{ formatMoney(costOverview.total_cost) }}</strong>
        </article>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="transport-tabs">
      <el-tab-pane label="车辆中心" name="vehicles">
        <div class="card-panel transport-panel">
          <div class="transport-panel__toolbar">
            <div>
              <p class="eyebrow">Fleet</p>
              <strong>车辆台账、状态切换与车辆维护</strong>
            </div>
            <div class="transport-panel__toolbar-actions">
              <el-button @click="loadTransportStats">刷新统计</el-button>
              <el-button type="primary" @click="openVehicleDialog()">新建车辆</el-button>
            </div>
          </div>

          <el-form :inline="true" :model="vehicleFilters" class="transport-filters" @submit.prevent>
            <el-form-item label="车牌号">
              <el-input v-model="vehicleFilters.plate_number" clearable placeholder="请输入车牌号" @keyup.enter="applyVehicleFilters" />
            </el-form-item>
            <el-form-item label="车型">
              <el-input v-model="vehicleFilters.vehicle_type" clearable placeholder="如：厢式货车" />
            </el-form-item>
            <el-form-item label="司机">
              <el-select v-model="vehicleFilters.driver_id" clearable placeholder="全部司机" style="width: 220px">
                <el-option label="全部司机" :value="undefined" />
                <el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="vehicleFilters.status" style="width: 160px">
                <el-option label="全部状态" :value="-1" />
                <el-option label="可用" :value="1" />
                <el-option label="维修中" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyVehicleFilters">查询</el-button>
              <el-button @click="resetVehicleFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="vehicleLoading" :data="vehicles" class="transport-table" stripe>
            <el-table-column label="车辆" min-width="220">
              <template #default="scope">
                <div class="transport-identity">
                  <strong>{{ normalizeText(scope.row.plate_number) }}</strong>
                  <span>{{ normalizeText(scope.row.vehicle_type, '未设置车型') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="司机" min-width="170">
              <template #default="scope">{{ normalizeText(scope.row.driver_name, '未分配') }}</template>
            </el-table-column>
            <el-table-column label="载重" width="120">
              <template #default="scope">{{ scope.row.capacity }} 吨</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope"><el-tag :type="scope.row.status === 1 ? 'success' : 'warning'" effect="dark">{{ scope.row.status_name }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="create_time" label="创建时间" min-width="170" />
            <el-table-column label="操作" fixed="right" width="220">
              <template #default="scope">
                <div class="transport-actions">
                  <el-button link type="primary" @click="openVehicleDialog(scope.row)">编辑</el-button>
                  <el-button link :type="scope.row.status === 1 ? 'warning' : 'success'" @click="toggleVehicleStatus(scope.row)">{{ scope.row.status === 1 ? '维修中' : '设为可用' }}</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="transport-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="vehiclePagination.total" :current-page="vehiclePagination.page" :page-size="vehiclePagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleVehiclePageChange" @size-change="handleVehicleSizeChange" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="任务中心" name="tasks">
        <div class="card-panel transport-panel">
          <div class="transport-panel__toolbar">
            <div>
              <p class="eyebrow">Tasks</p>
              <strong>运输任务、状态流转与装卸扫描</strong>
            </div>
            <div class="transport-panel__toolbar-actions">
              <el-button @click="refreshTransportOverview">刷新概览</el-button>
              <el-button type="primary" @click="openTaskDialog()">创建任务</el-button>
            </div>
          </div>

          <div class="summary-grid summary-grid--task">
            <article class="summary-card card-panel"><span>待执行</span><strong>{{ transportStats.task_stats.pending_tasks }}</strong></article>
            <article class="summary-card card-panel"><span>执行中</span><strong>{{ transportStats.task_stats.in_progress_tasks }}</strong></article>
            <article class="summary-card card-panel"><span>已完成</span><strong>{{ transportStats.task_stats.completed_tasks }}</strong></article>
            <article class="summary-card card-panel"><span>总里程</span><strong>{{ transportStats.task_stats.total_distance }}</strong></article>
          </div>

          <div class="transport-layout">
            <div class="card-panel sub-panel">
              <el-form :inline="true" :model="taskFilters" class="transport-filters" @submit.prevent>
                <el-form-item label="任务号"><el-input v-model="taskFilters.task_no" clearable placeholder="请输入任务编号" @keyup.enter="applyTaskFilters" /></el-form-item>
                <el-form-item label="车辆">
                  <el-select v-model="taskFilters.vehicle_id" clearable placeholder="全部车辆" style="width: 220px">
                    <el-option label="全部车辆" :value="undefined" />
                    <el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" />
                  </el-select>
                </el-form-item>
                <el-form-item label="司机">
                  <el-select v-model="taskFilters.driver_id" clearable placeholder="全部司机" style="width: 220px">
                    <el-option label="全部司机" :value="undefined" />
                    <el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" />
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

              <el-table v-loading="taskLoading" :data="tasks" class="transport-table" stripe>
                <el-table-column label="任务" min-width="230">
                  <template #default="scope">
                    <div class="transport-identity">
                      <strong>{{ scope.row.task_no }}</strong>
                      <span>{{ scope.row.order_no }}</span>
                      <small>{{ normalizeText(scope.row.start_point) }} → {{ normalizeText(scope.row.end_point) }}</small>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="车辆 / 司机" min-width="180">
                  <template #default="scope">
                    <div class="transport-identity">
                      <strong>{{ normalizeText(scope.row.plate_number) }}</strong>
                      <span>{{ normalizeText(scope.row.driver_name, '未知司机') }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="里程 / 成本" width="160">
                  <template #default="scope">
                    <div class="transport-meta">
                      <strong>{{ scope.row.distance }} km</strong>
                      <span>{{ formatMoney(scope.row.cost) }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="120">
                  <template #default="scope"><el-tag :type="taskStatusTagType(scope.row.status)" effect="dark">{{ scope.row.status_name }}</el-tag></template>
                </el-table-column>
                <el-table-column prop="create_time" label="创建时间" min-width="170" />
                <el-table-column label="操作" fixed="right" width="280">
                  <template #default="scope">
                    <div class="transport-actions">
                      <el-button link type="primary" @click="openTaskDialog(scope.row)">编辑</el-button>
                      <el-button v-if="nextTaskStatuses(scope.row.status).length" link type="warning" @click="openTaskStatusDialog(scope.row)">状态流转</el-button>
                      <el-button link type="success" @click="prefillScan(scope.row, 'load')">装车</el-button>
                      <el-button link type="info" @click="prefillScan(scope.row, 'unload')">卸车</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>

              <div class="transport-pagination">
                <el-pagination background layout="total, prev, pager, next, sizes" :total="taskPagination.total" :current-page="taskPagination.page" :page-size="taskPagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleTaskPageChange" @size-change="handleTaskSizeChange" />
              </div>
            </div>

            <div class="transport-side">
              <div class="card-panel sub-panel">
                <div class="sub-panel__head">
                  <div>
                    <p class="eyebrow">Quick Scan</p>
                    <h3>装卸扫描</h3>
                  </div>
                </div>
                <el-form :model="scanForm" label-position="top">
                  <el-form-item label="任务号">
                    <el-select v-model="scanForm.task_no" clearable placeholder="可选，优先锁定任务" style="width: 100%">
                      <el-option label="自动识别任务" value="" />
                      <el-option v-for="item in taskOptionsForScan" :key="item.id" :label="item.task_no" :value="item.task_no" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="扫描类型">
                    <el-radio-group v-model="scanForm.scan_type">
                      <el-radio-button label="load">装车</el-radio-button>
                      <el-radio-button label="unload">卸车</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item label="扫描码">
                    <el-input v-model="scanForm.scan_code" placeholder="请输入任务号、订单号或包裹号" />
                  </el-form-item>
                  <el-form-item label="站点">
                    <el-select v-model="scanForm.station_id" placeholder="请选择站点" style="width: 100%">
                      <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="备注">
                    <el-input v-model="scanForm.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="可选，填写扫描备注" />
                  </el-form-item>
                  <el-button type="primary" :loading="scanSubmitting" @click="submitScan">提交扫描</el-button>
                </el-form>
                <div v-if="scanResult" class="scan-result">
                  <el-tag :type="scanForm.scan_type === 'load' ? 'success' : 'info'" effect="dark">{{ scanResult.scan_type === 'load' ? '装车完成' : '卸车完成' }}</el-tag>
                  <p>{{ scanResult.message }}</p>
                  <small>{{ scanResult.task_no }} / {{ scanResult.order_no }} / {{ scanResult.parcel_no || '整单' }} / {{ normalizeText(scanResult.station_name) }}</small>
                </div>
              </div>

              <div class="card-panel sub-panel">
                <div class="sub-panel__head">
                  <div>
                    <p class="eyebrow">Driver Top</p>
                    <h3>司机统计</h3>
                  </div>
                </div>
                <div class="side-list">
                  <article v-for="item in topDrivers" :key="item.driver_id">
                    <strong>{{ normalizeText(item.driver_name, '未知司机') }}</strong>
                    <span>{{ item.task_count }} 个任务 · {{ formatMoney(item.cost) }}</span>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="装卸记录" name="records">
        <div class="card-panel transport-panel">
          <div class="transport-panel__toolbar">
            <div>
              <p class="eyebrow">Records</p>
              <strong>装卸记录查询与装车卸车回看</strong>
            </div>
          </div>

          <el-form :inline="true" :model="recordFilters" class="transport-filters" @submit.prevent>
            <el-form-item label="任务号"><el-input v-model="recordFilters.task_no" clearable placeholder="请输入任务号" @keyup.enter="applyRecordFilters" /></el-form-item>
            <el-form-item label="订单号"><el-input v-model="recordFilters.order_no" clearable placeholder="请输入订单号" /></el-form-item>
            <el-form-item label="站点">
              <el-select v-model="recordFilters.station_id" clearable placeholder="全部站点" style="width: 220px">
                <el-option label="全部站点" :value="undefined" />
                <el-option v-for="item in stationOptions" :key="item.id" :label="normalizeText(item.name, item.station_code)" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="扫描类型">
              <el-select v-model="recordFilters.scan_type" clearable placeholder="全部类型" style="width: 160px">
                <el-option label="全部类型" :value="undefined" />
                <el-option label="装车" value="load" />
                <el-option label="卸车" value="unload" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyRecordFilters">查询</el-button>
              <el-button @click="resetRecordFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="recordLoading" :data="records" class="transport-table" stripe>
            <el-table-column label="记录" min-width="240">
              <template #default="scope">
                <div class="transport-identity">
                  <strong>{{ scope.row.task_no }}</strong>
                  <span>{{ scope.row.order_no }}</span>
                  <small>{{ normalizeText(scope.row.station_name) }} · {{ scope.row.scan_type_name }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="车辆 / 司机" min-width="180">
              <template #default="scope">
                <div class="transport-identity">
                  <strong>{{ normalizeText(scope.row.plate_number) }}</strong>
                  <span>{{ normalizeText(scope.row.driver_name, '未知司机') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="scope"><el-tag :type="scope.row.scan_type === 'load' ? 'success' : 'info'" effect="plain">{{ scope.row.record_status }}</el-tag></template>
            </el-table-column>
            <el-table-column label="扫描时间" min-width="170">
              <template #default="scope">{{ scope.row.create_time }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="180" />
          </el-table>

          <div class="transport-pagination">
            <el-pagination background layout="total, prev, pager, next, sizes" :total="recordPagination.total" :current-page="recordPagination.page" :page-size="recordPagination.pageSize" :page-sizes="[10, 20, 50, 100]" @current-change="handleRecordPageChange" @size-change="handleRecordSizeChange" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="监控与成本" name="monitor">
        <div class="transport-layout transport-layout--monitor">
          <div class="card-panel transport-panel">
            <div class="transport-panel__toolbar">
              <div>
                <p class="eyebrow">Monitor</p>
                <strong>运输监控、任务预警与执行概览</strong>
              </div>
              <div class="transport-panel__toolbar-actions">
                <el-select v-model="monitorFilter" style="width: 180px">
                  <el-option label="全部预警" value="all" />
                  <el-option label="仅警告" value="warning" />
                  <el-option label="仅严重" value="critical" />
                </el-select>
                <el-button @click="refreshTransportOverview">刷新概览</el-button>
              </div>
            </div>

            <div class="summary-grid summary-grid--monitor">
              <article class="summary-card card-panel"><span>执行中</span><strong>{{ monitorOverview.in_progress_tasks }}</strong></article>
              <article class="summary-card card-panel"><span>警告任务</span><strong>{{ monitorOverview.warning_tasks }}</strong></article>
              <article class="summary-card card-panel"><span>严重预警</span><strong>{{ monitorOverview.critical_tasks }}</strong></article>
              <article class="summary-card card-panel"><span>平均进度</span><strong>{{ formatPercent(monitorOverview.avg_progress) }}</strong></article>
            </div>

            <el-table :data="filteredMonitorTasks" class="transport-table" stripe>
              <el-table-column label="任务" min-width="220">
                <template #default="scope">
                  <div class="transport-identity">
                    <strong>{{ scope.row.task_no }}</strong>
                    <span>{{ scope.row.order_no }}</span>
                    <small>{{ normalizeText(scope.row.plate_number) }} / {{ normalizeText(scope.row.driver_name, '未知司机') }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="进度" width="180">
                <template #default="scope"><el-progress :percentage="safePercentage(scope.row.progress)" :stroke-width="8" /></template>
              </el-table-column>
              <el-table-column label="最新扫描" min-width="180">
                <template #default="scope">{{ normalizeText(scope.row.latest_scan_type_name, '暂无') }} / {{ normalizeText(scope.row.latest_station_name, '-') }}</template>
              </el-table-column>
              <el-table-column label="预警" min-width="220">
                <template #default="scope">
                  <div class="transport-identity">
                    <strong>{{ warningLabel(scope.row.warning_level) }}</strong>
                    <small>{{ normalizeText(scope.row.warning_message, '正常') }}</small>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="transport-side">
            <div class="card-panel sub-panel">
              <div class="sub-panel__head">
                <div>
                  <p class="eyebrow">Warnings</p>
                  <h3>运输预警</h3>
                </div>
              </div>
              <div class="side-list">
                <article v-for="item in filteredWarnings" :key="`${item.task_id}-${item.warning_type}`">
                  <strong>{{ item.warning_type_name }}</strong>
                  <span>{{ item.task_no }} · {{ normalizeText(item.warning_message, '正常') }}</span>
                </article>
              </div>
            </div>

            <div class="card-panel sub-panel">
              <div class="sub-panel__head">
                <div>
                  <p class="eyebrow">Costs</p>
                  <h3>成本概览</h3>
                </div>
              </div>
              <div class="summary-grid summary-grid--cost">
                <article class="summary-card card-panel"><span>总成本</span><strong>{{ formatMoney(costOverview.total_cost) }}</strong></article>
                <article class="summary-card card-panel"><span>高成本任务</span><strong>{{ costOverview.high_cost_tasks }}</strong></article>
              </div>
              <el-table :data="costTasks" size="small" stripe>
                <el-table-column label="任务" min-width="150">
                  <template #default="scope">{{ scope.row.task_no }}</template>
                </el-table-column>
                <el-table-column label="成本" width="120">
                  <template #default="scope">{{ formatMoney(scope.row.cost) }}</template>
                </el-table-column>
                <el-table-column label="单公里" width="120">
                  <template #default="scope">{{ scope.row.cost_per_km.toFixed(2) }}</template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="vehicleDialogVisible" :title="vehicleDialogMode === 'create' ? '新建车辆' : '编辑车辆'" width="620px">
      <el-form ref="vehicleFormRef" :model="vehicleForm" :rules="vehicleRules" label-position="top">
        <div class="transport-form-grid">
          <el-form-item label="车牌号" prop="plate_number"><el-input v-model="vehicleForm.plate_number" placeholder="请输入车牌号" /></el-form-item>
          <el-form-item label="车辆类型"><el-input v-model="vehicleForm.vehicle_type" placeholder="如：厢式货车" /></el-form-item>
          <el-form-item label="载重(吨)"><el-input-number v-model="vehicleForm.capacity" :min="0" :step="0.5" :precision="1" style="width: 100%" /></el-form-item>
          <el-form-item label="司机"><el-select v-model="vehicleForm.driver_id" clearable placeholder="可选，未分配" style="width: 100%"><el-option label="未分配" :value="undefined" /><el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" /></el-select></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="vehicleDialogVisible = false">取消</el-button><el-button type="primary" :loading="vehicleSubmitting" @click="submitVehicleDialog">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogMode === 'create' ? '创建运输任务' : '编辑运输任务'" width="760px">
      <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-position="top">
        <div class="transport-form-grid">
          <el-form-item label="订单" prop="order_id"><el-select v-model="taskForm.order_id" placeholder="请选择订单" style="width: 100%"><el-option v-for="item in orderOptions" :key="item.id" :label="item.order_no" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="车辆" prop="vehicle_id"><el-select v-model="taskForm.vehicle_id" placeholder="请选择车辆" style="width: 100%"><el-option v-for="item in vehicleOptions" :key="item.id" :label="normalizeText(item.plate_number)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="司机" prop="driver_id"><el-select v-model="taskForm.driver_id" placeholder="请选择司机" style="width: 100%"><el-option v-for="item in driverOptions" :key="item.id" :label="displayUserName(item)" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="起点" prop="start_point"><el-input v-model="taskForm.start_point" placeholder="请输入起点" /></el-form-item>
          <el-form-item label="终点" prop="end_point"><el-input v-model="taskForm.end_point" placeholder="请输入终点" /></el-form-item>
          <el-form-item label="里程(km)"><el-input-number v-model="taskForm.distance" :min="0" :step="1" :precision="1" style="width: 100%" /></el-form-item>
          <el-form-item label="成本"><el-input-number v-model="taskForm.cost" :min="0" :step="10" :precision="2" style="width: 100%" /></el-form-item>
          <el-form-item label="备注" class="transport-form-grid__wide"><el-input v-model="taskForm.remark" type="textarea" :rows="4" maxlength="300" show-word-limit placeholder="请输入任务备注" /></el-form-item>
        </div>
      </el-form>
      <template #footer><el-button @click="taskDialogVisible = false">取消</el-button><el-button type="primary" :loading="taskSubmitting" @click="submitTaskDialog">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="taskStatusDialogVisible" title="更新任务状态" width="460px">
      <el-form label-position="top">
        <el-form-item label="目标状态"><el-select v-model="taskStatusForm.status" placeholder="请选择状态" style="width: 100%"><el-option v-for="item in currentTaskStatusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="taskStatusForm.remark" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="可选，填写状态流转备注" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="taskStatusDialogVisible = false">取消</el-button><el-button type="primary" :loading="taskStatusSubmitting" :disabled="!taskStatusForm.status" @click="submitTaskStatus">确认更新</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRoute } from 'vue-router'

import http from '@/utils/http'
import { readQueryEnum } from '@/utils/workbench'

type UserOption = { id: number; username: string; real_name?: string; role: number; role_name: string; status: number }
type UserListResponse = { list: UserOption[]; total: number; page: number; page_size: number; pages: number }
type StationOption = { id: number; station_code: string; name: string }
type VehicleItem = { id: number; plate_number: string; vehicle_type: string; capacity: number; driver_id: number; driver_name: string; status: number; status_name: string; create_time: string; update_time: string }
type VehicleListResponse = { list: VehicleItem[]; total: number; page: number; page_size: number; pages: number }
type OrderOption = { id: number; order_no: string }
type OrderListResponse = { list: OrderOption[]; total: number; page: number; page_size: number; pages: number }
type TaskItem = { id: number; task_no: string; order_id: number; order_no: string; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; start_point: string; end_point: string; distance: number; status: string; status_name: string; start_time: number; end_time: number; cost: number; remark: string; create_time: string; update_time: string }
type TaskListResponse = { list: TaskItem[]; total: number; page: number; page_size: number; pages: number }
type RecordItem = { id: number; task_id: number; task_no: string; order_id: number; order_no: string; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; station_id: number; station_name: string; scan_type: string; scan_type_name: string; record_status: string; create_time: string; remark: string }
type RecordListResponse = { list: RecordItem[]; total: number; page: number; page_size: number; pages: number }
type MonitorOverview = { total_tasks: number; pending_tasks: number; in_progress_tasks: number; completed_tasks: number; cancelled_tasks: number; warning_tasks: number; critical_tasks: number; delayed_tasks: number; exception_tasks: number; avg_progress: number; total_distance: number; total_cost: number }
type MonitorTask = { task_id: number; task_no: string; order_id: number; order_no: string; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; status: string; status_name: string; order_status: number; order_status_name: string; progress: number; latest_scan_type_name: string; latest_station_name: string; warning_level: string; warning_message: string }
type MonitorListResponse = { list: MonitorTask[]; total: number; page: number; page_size: number; pages: number }
type WarningItem = { task_id: number; task_no: string; order_id: number; order_no: string; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; warning_type: string; warning_type_name: string; warning_level: string; warning_message: string; task_status: string; task_status_name: string; cost: number; cost_per_km: number }
type WarningListResponse = { list: WarningItem[]; total: number; page: number; page_size: number; pages: number; warning_count: number; critical_count: number }
type CostOverview = { total_tasks: number; total_distance: number; total_cost: number; total_compensation: number; avg_cost_per_task: number; avg_cost_per_km: number; max_task_cost: number; min_task_cost: number; high_cost_tasks: number }
type CostTask = { task_id: number; task_no: string; order_id: number; order_no: string; vehicle_id: number; plate_number: string; driver_id: number; driver_name: string; status: string; status_name: string; distance: number; cost: number; cost_per_km: number; estimated_hours: number; actual_hours: number; load_count: number; unload_count: number; cost_level: string; compensation_amount: number; create_time: string; update_time: string }
type CostTaskListResponse = { list: CostTask[]; total: number; page: number; page_size: number; pages: number }
type TransportStats = { vehicle_stats: { total_vehicles: number; available_vehicles: number; maintenance_vehicles: number; total_capacity: number; avg_capacity: number }; task_stats: { total_tasks: number; pending_tasks: number; in_progress_tasks: number; completed_tasks: number; cancelled_tasks: number; total_distance: number; total_cost: number }; driver_stats: Array<{ driver_id: number; driver_name: string; task_count: number; distance: number; cost: number }>; status_stats: Array<{ status: string; status_name: string; count: number; percentage: string }> }
type ScanResult = { task_id: number; task_no: string; order_id: number; order_no: string; parcel_no?: string; scan_code_type?: string; scan_type: string; station_id: number; station_name: string; record_id: number; task_status: string; task_status_name: string; order_status: number; order_status_name: string; message: string }

const taskStatusOptions = [ { value: 'pending', label: '待执行' }, { value: 'in_progress', label: '执行中' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' } ]
const route = useRoute()
const activeTab = ref('vehicles')
const monitorFilter = ref<'all' | 'warning' | 'critical'>('all')
const vehicles = ref<VehicleItem[]>([])
const tasks = ref<TaskItem[]>([])
const records = ref<RecordItem[]>([])
const monitorTasks = ref<MonitorTask[]>([])
const warnings = ref<WarningItem[]>([])
const costTasks = ref<CostTask[]>([])
const userOptions = ref<UserOption[]>([])
const stationOptions = ref<StationOption[]>([])
const orderOptions = ref<OrderOption[]>([])
const scanResult = ref<ScanResult | null>(null)
const vehicleLoading = ref(false)
const taskLoading = ref(false)
const recordLoading = ref(false)
const vehicleSubmitting = ref(false)
const taskSubmitting = ref(false)
const taskStatusSubmitting = ref(false)
const scanSubmitting = ref(false)
const vehicleDialogVisible = ref(false)
const vehicleDialogMode = ref<'create' | 'edit'>('create')
const currentVehicleId = ref<number | null>(null)
const taskDialogVisible = ref(false)
const taskDialogMode = ref<'create' | 'edit'>('create')
const currentTaskId = ref<number | null>(null)
const taskStatusDialogVisible = ref(false)
const currentTaskForStatus = ref<TaskItem | null>(null)

const monitorOverview = reactive<MonitorOverview>({ total_tasks: 0, pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, warning_tasks: 0, critical_tasks: 0, delayed_tasks: 0, exception_tasks: 0, avg_progress: 0, total_distance: 0, total_cost: 0 })
const costOverview = reactive<CostOverview>({ total_tasks: 0, total_distance: 0, total_cost: 0, total_compensation: 0, avg_cost_per_task: 0, avg_cost_per_km: 0, max_task_cost: 0, min_task_cost: 0, high_cost_tasks: 0 })
const transportStats = reactive<TransportStats>({ vehicle_stats: { total_vehicles: 0, available_vehicles: 0, maintenance_vehicles: 0, total_capacity: 0, avg_capacity: 0 }, task_stats: { total_tasks: 0, pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, total_distance: 0, total_cost: 0 }, driver_stats: [], status_stats: [] })

const vehiclePagination = reactive({ total: 0, page: 1, pageSize: 10 })
const taskPagination = reactive({ total: 0, page: 1, pageSize: 10 })
const recordPagination = reactive({ total: 0, page: 1, pageSize: 10 })

const vehicleFilters = reactive({ plate_number: '', vehicle_type: '', driver_id: undefined as number | undefined, status: -1 })
const taskFilters = reactive({ task_no: '', vehicle_id: undefined as number | undefined, driver_id: undefined as number | undefined, status: undefined as string | undefined })
const recordFilters = reactive({ task_no: '', order_no: '', station_id: undefined as number | undefined, scan_type: undefined as string | undefined })

const vehicleFormRef = ref<FormInstance>()
const vehicleForm = reactive({ plate_number: '', vehicle_type: '', capacity: 0, driver_id: undefined as number | undefined })
const vehicleRules: FormRules<typeof vehicleForm> = { plate_number: [{ required: true, message: '请输入车牌号', trigger: 'blur' }] }

const taskFormRef = ref<FormInstance>()
const taskForm = reactive({ order_id: undefined as number | undefined, vehicle_id: undefined as number | undefined, driver_id: undefined as number | undefined, start_point: '', end_point: '', distance: 0, cost: 0, remark: '' })
const taskRules: FormRules<typeof taskForm> = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }], vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }], driver_id: [{ required: true, message: '请选择司机', trigger: 'change' }], start_point: [{ required: true, message: '请输入起点', trigger: 'blur' }], end_point: [{ required: true, message: '请输入终点', trigger: 'blur' }] }

const taskStatusForm = reactive({ status: undefined as string | undefined, remark: '' })
const scanForm = reactive({ task_no: '', scan_type: 'load', scan_code: '', station_id: undefined as number | undefined, remark: '' })

const vehicleOptions = computed(() => vehicles.value)
const driverOptions = computed(() => userOptions.value.filter((item) => item.status === 1 && item.role >= 2))
const topDrivers = computed(() => transportStats.driver_stats.slice(0, 4))
const taskOptionsForScan = computed(() => tasks.value.filter((item) => item.status !== 'completed' && item.status !== 'cancelled'))
const currentTaskStatusOptions = computed(() => nextTaskStatuses(currentTaskForStatus.value?.status || ''))
const filteredMonitorTasks = computed(() => monitorFilter.value === 'all' ? monitorTasks.value : monitorTasks.value.filter((item) => item.warning_level === monitorFilter.value))
const filteredWarnings = computed(() => monitorFilter.value === 'all' ? warnings.value : warnings.value.filter((item) => item.warning_level === monitorFilter.value))

function normalizeText(value: string | null | undefined, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text)) return fallback; return text }
function displayUserName(user: UserOption) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})` }
function formatMoney(value: number | undefined) { return `¥${(Number(value) || 0).toFixed(2)}` }
function formatPercent(value: number | undefined) { return `${(Number(value) || 0).toFixed(1)}%` }
function safePercentage(value: number | undefined) { const result = Number(value) || 0; return result < 0 ? 0 : result > 100 ? 100 : Number(result.toFixed(1)) }
function warningLabel(level: string | undefined) { return ({ critical: '严重', warning: '警告', normal: '正常' } as Record<string, string>)[String(level || '')] || '正常' }
function taskStatusTagType(status: string): 'success' | 'warning' | 'info' | 'primary' { return ({ pending: 'info', in_progress: 'warning', completed: 'success', cancelled: 'primary' } as const)[status] || 'info' }
function nextTaskStatuses(status: string) { return ({ pending: [{ value: 'in_progress', label: '执行中' }, { value: 'cancelled', label: '已取消' }], in_progress: [{ value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }], completed: [], cancelled: [] } as Record<string, Array<{ value: string; label: string }>>)[status] || [] }

function applyWorkbenchFilters() {
  const tab = readQueryEnum(route.query, 'tab', ['vehicles', 'tasks', 'records', 'monitor'] as const)
  const taskStatus = readQueryEnum(route.query, 'task_status', ['pending', 'in_progress', 'completed', 'cancelled'] as const)
  const warningLevel = readQueryEnum(route.query, 'warning_level', ['warning', 'critical'] as const)

  if (tab) {
    activeTab.value = tab
  }
  if (taskStatus) {
    taskFilters.status = taskStatus
  }
  if (warningLevel) {
    monitorFilter.value = warningLevel
  }
}

function buildVehicleParams() { const params: Record<string, string | number> = { page: vehiclePagination.page, page_size: vehiclePagination.pageSize, status: vehicleFilters.status }; if (vehicleFilters.plate_number.trim()) params.plate_number = vehicleFilters.plate_number.trim(); if (vehicleFilters.vehicle_type.trim()) params.vehicle_type = vehicleFilters.vehicle_type.trim(); if (typeof vehicleFilters.driver_id === 'number') params.driver_id = vehicleFilters.driver_id; return params }
function buildTaskParams() { const params: Record<string, string | number> = { page: taskPagination.page, page_size: taskPagination.pageSize }; if (taskFilters.task_no.trim()) params.task_no = taskFilters.task_no.trim(); if (typeof taskFilters.vehicle_id === 'number') params.vehicle_id = taskFilters.vehicle_id; if (typeof taskFilters.driver_id === 'number') params.driver_id = taskFilters.driver_id; if (taskFilters.status) params.status = taskFilters.status; return params }
function buildRecordParams() { const params: Record<string, string | number> = { page: recordPagination.page, page_size: recordPagination.pageSize }; if (recordFilters.task_no.trim()) params.task_no = recordFilters.task_no.trim(); if (recordFilters.order_no.trim()) params.order_no = recordFilters.order_no.trim(); if (typeof recordFilters.station_id === 'number') params.station_id = recordFilters.station_id; if (recordFilters.scan_type) params.scan_type = recordFilters.scan_type; return params }

async function loadUsers() { const data = await http.get<never, UserListResponse>('/users', { params: { page: 1, page_size: 100 } }); userOptions.value = data.list || [] }
async function loadStations() { const data = await http.get<never, { list: StationOption[] }>('/stations', { params: { page: 1, page_size: 100, status: 1 } }); stationOptions.value = data.list || [] }
async function loadOrders() { const data = await http.get<never, OrderListResponse>('/orders', { params: { page: 1, page_size: 100 } }); orderOptions.value = data.list || [] }
async function loadVehicles() { vehicleLoading.value = true; try { const data = await http.get<never, VehicleListResponse>('/transport/vehicles', { params: buildVehicleParams() }); vehicles.value = data.list || []; vehiclePagination.total = data.total || 0; vehiclePagination.page = data.page || vehiclePagination.page; vehiclePagination.pageSize = data.page_size || vehiclePagination.pageSize } finally { vehicleLoading.value = false } }
async function loadTasks() { taskLoading.value = true; try { const data = await http.get<never, TaskListResponse>('/transport/tasks', { params: buildTaskParams() }); tasks.value = data.list || []; taskPagination.total = data.total || 0; taskPagination.page = data.page || taskPagination.page; taskPagination.pageSize = data.page_size || taskPagination.pageSize } finally { taskLoading.value = false } }
async function loadRecords() { recordLoading.value = true; try { const data = await http.get<never, RecordListResponse>('/transport/records', { params: buildRecordParams() }); records.value = data.list || []; recordPagination.total = data.total || 0; recordPagination.page = data.page || recordPagination.page; recordPagination.pageSize = data.page_size || recordPagination.pageSize } finally { recordLoading.value = false } }
async function loadMonitorOverview() { Object.assign(monitorOverview, await http.get<never, MonitorOverview>('/transport/monitor/overview')) }
async function loadMonitorTasks() { const data = await http.get<never, MonitorListResponse>('/transport/monitor/tasks', { params: { page: 1, page_size: 10 } }); monitorTasks.value = data.list || [] }
async function loadWarnings() { const data = await http.get<never, WarningListResponse>('/transport/monitor/warnings', { params: { page: 1, page_size: 10 } }); warnings.value = data.list || [] }
async function loadCostOverview() { Object.assign(costOverview, await http.get<never, CostOverview>('/transport/costs/overview', { params: { page: 1, page_size: 10 } })) }
async function loadCostTasks() { const data = await http.get<never, CostTaskListResponse>('/transport/costs/tasks', { params: { page: 1, page_size: 10 } }); costTasks.value = data.list || [] }
async function loadTransportStats() { Object.assign(transportStats, await http.get<never, TransportStats>('/transport/stats')) }
async function refreshTransportOverview() { await Promise.all([loadMonitorOverview(), loadMonitorTasks(), loadWarnings(), loadCostOverview(), loadCostTasks(), loadTransportStats()]) }

function resetVehicleForm() { vehicleForm.plate_number = ''; vehicleForm.vehicle_type = ''; vehicleForm.capacity = 0; vehicleForm.driver_id = undefined }
function openVehicleDialog(vehicle?: VehicleItem) { if (vehicle) { vehicleDialogMode.value = 'edit'; currentVehicleId.value = vehicle.id; vehicleForm.plate_number = vehicle.plate_number; vehicleForm.vehicle_type = vehicle.vehicle_type; vehicleForm.capacity = vehicle.capacity; vehicleForm.driver_id = vehicle.driver_id || undefined } else { vehicleDialogMode.value = 'create'; currentVehicleId.value = null; resetVehicleForm() } vehicleDialogVisible.value = true; vehicleFormRef.value?.clearValidate() }
async function submitVehicleDialog() { if (!vehicleFormRef.value) return; const valid = await vehicleFormRef.value.validate().catch(() => false); if (!valid) return; vehicleSubmitting.value = true; try { const payload = { plate_number: vehicleForm.plate_number.trim(), vehicle_type: vehicleForm.vehicle_type.trim(), capacity: Number(vehicleForm.capacity), driver_id: vehicleForm.driver_id || 0 }; if (vehicleDialogMode.value === 'create') { await http.post('/transport/vehicles', payload); ElMessage.success('车辆已创建') } else if (currentVehicleId.value) { await http.put(`/transport/vehicles/${currentVehicleId.value}`, payload); ElMessage.success('车辆已更新') } vehicleDialogVisible.value = false; await Promise.all([loadVehicles(), loadTransportStats()]) } finally { vehicleSubmitting.value = false } }
async function toggleVehicleStatus(vehicle: VehicleItem) { await http.put(`/transport/vehicles/${vehicle.id}/status`, { status: vehicle.status === 1 ? 0 : 1 }); ElMessage.success('车辆状态已更新'); await Promise.all([loadVehicles(), loadTransportStats()]) }

function resetTaskForm() { taskForm.order_id = undefined; taskForm.vehicle_id = undefined; taskForm.driver_id = undefined; taskForm.start_point = ''; taskForm.end_point = ''; taskForm.distance = 0; taskForm.cost = 0; taskForm.remark = '' }
function openTaskDialog(task?: TaskItem) { if (task) { taskDialogMode.value = 'edit'; currentTaskId.value = task.id; taskForm.order_id = task.order_id; taskForm.vehicle_id = task.vehicle_id; taskForm.driver_id = task.driver_id; taskForm.start_point = task.start_point; taskForm.end_point = task.end_point; taskForm.distance = task.distance; taskForm.cost = task.cost; taskForm.remark = task.remark } else { taskDialogMode.value = 'create'; currentTaskId.value = null; resetTaskForm() } taskDialogVisible.value = true; taskFormRef.value?.clearValidate() }
async function submitTaskDialog() { if (!taskFormRef.value) return; const valid = await taskFormRef.value.validate().catch(() => false); if (!valid) return; taskSubmitting.value = true; try { const payload = { order_id: taskForm.order_id, vehicle_id: taskForm.vehicle_id, driver_id: taskForm.driver_id, start_point: taskForm.start_point.trim(), end_point: taskForm.end_point.trim(), distance: Number(taskForm.distance), cost: Number(taskForm.cost), remark: taskForm.remark.trim() }; if (taskDialogMode.value === 'create') { await http.post('/transport/tasks', payload); ElMessage.success('运输任务已创建') } else if (currentTaskId.value) { await http.put(`/transport/tasks/${currentTaskId.value}`, payload); ElMessage.success('运输任务已更新') } taskDialogVisible.value = false; await Promise.all([loadTasks(), refreshTransportOverview()]) } finally { taskSubmitting.value = false } }
function openTaskStatusDialog(task: TaskItem) { currentTaskForStatus.value = task; taskStatusForm.status = nextTaskStatuses(task.status)[0]?.value; taskStatusForm.remark = '' ; taskStatusDialogVisible.value = true }
async function submitTaskStatus() { if (!currentTaskForStatus.value || !taskStatusForm.status) return; taskStatusSubmitting.value = true; try { await http.put(`/transport/tasks/${currentTaskForStatus.value.id}/status`, { status: taskStatusForm.status, remark: taskStatusForm.remark.trim() }); ElMessage.success('任务状态已更新'); taskStatusDialogVisible.value = false; await Promise.all([loadTasks(), refreshTransportOverview()]) } finally { taskStatusSubmitting.value = false } }
function prefillScan(task: TaskItem, type: 'load' | 'unload') { activeTab.value = 'tasks'; scanForm.task_no = task.task_no; scanForm.scan_type = type; scanForm.scan_code = task.order_no; scanForm.station_id = undefined; scanForm.remark = '' }
async function submitScan() { if (!scanForm.station_id || !scanForm.scan_code.trim()) { ElMessage.warning('请填写扫描码和站点'); return } scanSubmitting.value = true; try { const endpoint = scanForm.scan_type === 'load' ? '/transport/scan/load' : '/transport/scan/unload'; scanResult.value = await http.post<never, ScanResult>(endpoint, { task_no: scanForm.task_no.trim(), scan_code: scanForm.scan_code.trim(), station_id: scanForm.station_id, remark: scanForm.remark.trim() }); ElMessage.success(scanResult.value.message); await Promise.all([loadTasks(), loadRecords(), refreshTransportOverview()]) } finally { scanSubmitting.value = false } }

async function applyVehicleFilters() { vehiclePagination.page = 1; await loadVehicles() }
function resetVehicleFilters() { vehicleFilters.plate_number = ''; vehicleFilters.vehicle_type = ''; vehicleFilters.driver_id = undefined; vehicleFilters.status = -1; vehiclePagination.page = 1; void loadVehicles() }
function handleVehiclePageChange(page: number) { vehiclePagination.page = page; void loadVehicles() }
function handleVehicleSizeChange(size: number) { vehiclePagination.pageSize = size; vehiclePagination.page = 1; void loadVehicles() }
async function applyTaskFilters() { taskPagination.page = 1; await loadTasks() }
function resetTaskFilters() { taskFilters.task_no = ''; taskFilters.vehicle_id = undefined; taskFilters.driver_id = undefined; taskFilters.status = undefined; taskPagination.page = 1; void loadTasks() }
function handleTaskPageChange(page: number) { taskPagination.page = page; void loadTasks() }
function handleTaskSizeChange(size: number) { taskPagination.pageSize = size; taskPagination.page = 1; void loadTasks() }
async function applyRecordFilters() { recordPagination.page = 1; await loadRecords() }
function resetRecordFilters() { recordFilters.task_no = ''; recordFilters.order_no = ''; recordFilters.station_id = undefined; recordFilters.scan_type = undefined; recordPagination.page = 1; void loadRecords() }
function handleRecordPageChange(page: number) { recordPagination.page = page; void loadRecords() }
function handleRecordSizeChange(size: number) { recordPagination.pageSize = size; recordPagination.page = 1; void loadRecords() }

onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadUsers(), loadStations(), loadOrders(), loadVehicles(), loadTasks(), loadRecords(), refreshTransportOverview()]) })
</script>

<style scoped>
.transport-management-view { display: flex; flex-direction: column; gap: 1rem; }
.transport-hero, .transport-panel, .sub-panel { padding: 1.5rem; }
.transport-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.transport-hero h1 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.transport-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.transport-hero__chips { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
.transport-hero__chips span { padding: 0.45rem 0.8rem; border-radius: 999px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.12); color: var(--accent-deep); font-size: 0.85rem; font-weight: 600; }
.transport-hero__stats, .summary-grid { display: grid; gap: 1rem; }
.transport-hero__stats { min-width: 18rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.transport-hero__stats article, .summary-card { padding: 1rem 1.15rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.transport-hero__stats span, .summary-card span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.transport-hero__stats strong, .summary-card strong { font-size: 1.5rem; color: var(--accent-deep); }
.summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 1rem; }
.summary-grid--task, .summary-grid--monitor { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.summary-grid--cost { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 1rem; }
.transport-tabs :deep(.el-tabs__header) { margin: 0; }
.transport-panel__toolbar, .sub-panel__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.transport-panel__toolbar { margin-bottom: 1rem; }
.transport-panel__toolbar strong { color: var(--ink); }
.transport-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.transport-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.95fr); gap: 1rem; }
.transport-layout--monitor { grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr); }
.transport-side { display: flex; flex-direction: column; gap: 1rem; }
.transport-filters { display: flex; flex-wrap: wrap; gap: 0.75rem 1rem; margin-bottom: 1rem; }
.transport-table :deep(.el-table__header th) { background: rgba(238, 77, 45, 0.06); color: var(--accent-deep); }
.transport-identity, .transport-meta { display: flex; flex-direction: column; gap: 0.25rem; }
.transport-identity strong, .transport-meta strong { color: var(--ink); }
.transport-identity span, .transport-identity small, .transport-meta span { color: var(--muted); }
.transport-actions { display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; }
.transport-pagination { display: flex; justify-content: flex-end; margin-top: 1rem; }
.side-list { display: flex; flex-direction: column; gap: 0.75rem; }
.side-list article { display: flex; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; border-radius: 16px; border: 1px solid rgba(238, 77, 45, 0.12); background: rgba(255, 248, 243, 0.76); }
.side-list strong, .scan-result p { color: var(--ink); }
.side-list span, .scan-result small { color: var(--muted); }
.scan-result { display: flex; flex-direction: column; gap: 0.55rem; margin-top: 1rem; }
.transport-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; }
.transport-form-grid__wide { grid-column: 1 / -1; }
@media (max-width: 1200px) { .transport-layout, .transport-layout--monitor { grid-template-columns: 1fr; } }
@media (max-width: 1024px) { .transport-hero, .transport-panel__toolbar, .sub-panel__head { flex-direction: column; } .transport-hero__stats, .summary-grid, .summary-grid--task, .summary-grid--monitor, .transport-form-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .transport-pagination { justify-content: flex-start; overflow: auto; } }
</style>
