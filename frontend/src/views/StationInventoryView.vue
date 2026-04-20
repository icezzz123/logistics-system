<template>
  <section class="station-inventory-view">
    <div class="station-hero card-panel">
      <div>
        <p class="eyebrow">Station Inventory Hub</p>
        <h1>站点与库存</h1>
        <p>
          当前页面已接入站点台账、库存概览、库存预警、站点流转和盘点记录，适合作为站点管理与库存联调的统一入口。
        </p>
        <div class="station-hero__chips">
          <span v-for="item in topBusyStations" :key="item.station_id">
            {{ normalizeText(item.station_name, item.station_code) }} {{ item.usage_percent }}
          </span>
        </div>
      </div>
      <div class="station-hero__stats">
        <article>
          <span>启用站点</span>
          <strong>{{ stats.summary.total_stations }}</strong>
        </article>
        <article>
          <span>库存订单</span>
          <strong>{{ stats.summary.total_orders }}</strong>
        </article>
        <article>
          <span>预警站点</span>
          <strong>{{ warnings.summary.warning_stations }}</strong>
        </article>
        <article>
          <span>严重预警</span>
          <strong>{{ warnings.summary.critical_stations }}</strong>
        </article>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="station-tabs">
      <el-tab-pane label="站点台账" name="stations">
        <div class="card-panel station-panel">
          <div class="station-panel__toolbar">
            <div>
              <p class="eyebrow">Station Registry</p>
              <strong>站点资料与库存状态联表展示</strong>
            </div>
            <div class="station-panel__toolbar-actions">
              <el-button @click="refreshOverview">刷新概览</el-button>
              <el-button type="primary" @click="openCreateCheckDialog()">新建盘点</el-button>
            </div>
          </div>

          <el-form :inline="true" :model="stationFilters" class="station-filters" @submit.prevent>
            <el-form-item label="关键词">
              <el-input
                v-model="stationFilters.keyword"
                clearable
                placeholder="站点编码 / 名称 / 地址"
                @keyup.enter="loadStations"
              />
            </el-form-item>
            <el-form-item label="站点类型">
              <el-select v-model="stationFilters.type" clearable placeholder="全部类型" style="width: 160px">
                <el-option label="全部类型" :value="undefined" />
                <el-option v-for="item in stationTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="国家">
              <el-input v-model="stationFilters.country" clearable placeholder="如：中国" />
            </el-form-item>
            <el-form-item label="城市">
              <el-input v-model="stationFilters.city" clearable placeholder="如：上海" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="stationFilters.status" clearable placeholder="默认全部" style="width: 160px">
                <el-option label="默认全部" :value="undefined" />
                <el-option label="启用" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyStationFilters">查询</el-button>
              <el-button @click="resetStationFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="stationLoading" :data="stationRows" class="station-table" stripe>
            <el-table-column label="站点" min-width="220">
              <template #default="scope">
                <div class="station-table__identity">
                  <strong>{{ normalizeText(scope.row.name, scope.row.station_code) }}</strong>
                  <span>{{ scope.row.station_code }}</span>
                  <small>
                    {{ scope.row.type_name }} · {{ normalizeText(scope.row.country) }} / {{ normalizeText(scope.row.city) }}
                  </small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="联系人" min-width="160">
              <template #default="scope">
                <div class="station-table__meta">
                  <strong>{{ normalizeText(scope.row.contact_name, '未设置') }}</strong>
                  <span>{{ normalizeText(scope.row.contact_phone, '无电话') }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="库存快照" min-width="220">
              <template #default="scope">
                <div class="station-table__inventory">
                  <span>总量 {{ scope.row.inventory.total_orders }}</span>
                  <span>入库 {{ scope.row.inventory.in_warehouse }}</span>
                  <span>分拣 {{ scope.row.inventory.sorting }}</span>
                  <span>运输 {{ scope.row.inventory.in_transit }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="容量" width="160">
              <template #default="scope">
                <div class="station-table__meta">
                  <strong>{{ scope.row.capacity }}</strong>
                  <span>{{ scope.row.inventory.capacity_usage }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="预警" width="140">
              <template #default="scope">
                <el-tag :type="warningTagType(scope.row.inventory.warning_level)" effect="dark">
                  {{ warningLabel(scope.row.inventory.warning_level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" effect="plain">
                  {{ scope.row.status_name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="280">
              <template #default="scope">
                <div class="station-actions">
                  <el-button link type="primary" @click="openStationDetail(scope.row.id)">详情</el-button>
                  <el-button v-if="canEditStation" link type="success" @click="openEditStation(scope.row)">编辑</el-button>
                  <el-button link type="warning" @click="openCreateCheckDialog(scope.row.id)">盘点</el-button>
                  <el-button link type="info" @click="focusStationWarning(scope.row.id)">预警</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="station-pagination">
            <el-pagination
              background
              layout="total, prev, pager, next, sizes"
              :total="stationPagination.total"
              :current-page="stationPagination.page"
              :page-size="stationPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              @current-change="handleStationPageChange"
              @size-change="handleStationSizeChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="库存预警" name="warnings">
        <div class="warning-grid">
          <article class="card-panel warning-card">
            <p class="eyebrow">Health</p>
            <h3>正常站点</h3>
            <strong>{{ warnings.summary.normal_stations }}</strong>
            <span>当前库存使用率在正常区间</span>
          </article>
          <article class="card-panel warning-card warning-card--accent">
            <p class="eyebrow">Attention</p>
            <h3>警告站点</h3>
            <strong>{{ warnings.summary.warning_stations }}</strong>
            <span>建议优先清理高占用站点库存</span>
          </article>
          <article class="card-panel warning-card warning-card--critical">
            <p class="eyebrow">Critical</p>
            <h3>严重预警</h3>
            <strong>{{ warnings.summary.critical_stations }}</strong>
            <span>接近或达到容量上限的站点数量</span>
          </article>
        </div>

        <div class="warning-layout">
          <div class="card-panel warning-panel">
            <div class="warning-panel__head">
              <div>
                <p class="eyebrow">Warning Queue</p>
                <h3>库存预警列表</h3>
              </div>
              <el-select v-model="warningFilter" style="width: 180px">
                <el-option label="全部级别" value="all" />
                <el-option label="仅警告" value="warning" />
                <el-option label="仅严重" value="critical" />
              </el-select>
            </div>

            <el-table :data="filteredWarnings" class="warning-table" stripe>
              <el-table-column label="站点" min-width="220">
                <template #default="scope">
                  <div class="station-table__identity">
                    <strong>{{ normalizeText(scope.row.station_name, scope.row.station_code) }}</strong>
                    <span>{{ scope.row.station_code }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="库存占用" width="150">
                <template #default="scope">
                  <div class="station-table__meta">
                    <strong>{{ scope.row.current_count }} / {{ scope.row.capacity }}</strong>
                    <span>{{ scope.row.usage_percent }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="级别" width="120">
                <template #default="scope">
                  <el-tag :type="warningTagType(scope.row.warning_level)" effect="dark">
                    {{ warningLabel(scope.row.warning_level) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="warning_message" label="预警说明" min-width="240" />
              <el-table-column prop="recommend_action" label="建议动作" min-width="220" />
            </el-table>
          </div>

          <div class="warning-side">
            <div class="card-panel warning-panel">
              <div class="warning-panel__head">
                <div>
                  <p class="eyebrow">Station Top</p>
                  <h3>容量排行</h3>
                </div>
              </div>
              <div class="station-top-list">
                <article v-for="item in topBusyStations" :key="item.station_id">
                  <div>
                    <strong>{{ normalizeText(item.station_name, item.station_code) }}</strong>
                    <span>{{ item.station_code }}</span>
                  </div>
                  <el-tag :type="warningTagType(item.warning_level)" effect="plain">{{ item.usage_percent }}</el-tag>
                </article>
              </div>
            </div>

            <div class="card-panel warning-panel">
              <div class="warning-panel__head">
                <div>
                  <p class="eyebrow">Distribution</p>
                  <h3>容量区间分布</h3>
                </div>
              </div>
              <div class="distribution-list">
                <article v-for="item in sortedCapacityDistribution" :key="item.range">
                  <strong>{{ item.range }}</strong>
                  <span>{{ item.count }} 个站点</span>
                  <small>{{ item.percentage }}</small>
                </article>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="盘点记录" name="checks">
        <div class="card-panel check-panel">
          <div class="station-panel__toolbar">
            <div>
              <p class="eyebrow">Inventory Check</p>
              <strong>盘点记录查询与新建盘点</strong>
            </div>
            <el-button type="primary" @click="openCreateCheckDialog()">新建盘点</el-button>
          </div>

          <el-form :inline="true" :model="checkFilters" class="station-filters" @submit.prevent>
            <el-form-item label="站点">
              <el-select v-model="checkFilters.station_id" clearable placeholder="全部站点" style="width: 220px">
                <el-option label="全部站点" :value="undefined" />
                <el-option
                  v-for="item in stationOptions"
                  :key="item.id"
                  :label="normalizeText(item.name, item.station_code)"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="盘点类型">
              <el-select v-model="checkFilters.check_type" clearable placeholder="全部类型" style="width: 160px">
                <el-option label="全部类型" :value="undefined" />
                <el-option label="全盘" value="full" />
                <el-option label="抽盘" value="spot" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="checkFilters.status" clearable placeholder="全部状态" style="width: 160px">
                <el-option label="全部状态" :value="undefined" />
                <el-option label="盘点中" :value="1" />
                <el-option label="已完成" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyCheckFilters">查询</el-button>
              <el-button @click="resetCheckFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="checkLoading" :data="checks" class="check-table" stripe>
            <el-table-column prop="check_no" label="盘点单号" min-width="180" />
            <el-table-column label="站点" min-width="180">
              <template #default="scope">
                {{ normalizeText(scope.row.station_name) }}
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="scope">
                <el-tag effect="plain">{{ scope.row.check_type_name }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="系统 / 实盘" width="140">
              <template #default="scope">
                {{ scope.row.system_count }} / {{ scope.row.actual_count }}
              </template>
            </el-table-column>
            <el-table-column label="差异" width="100">
              <template #default="scope">
                <span :class="scope.row.difference_count === 0 ? 'text-success' : 'text-danger'">
                  {{ scope.row.difference_count }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 2 ? 'success' : 'warning'" effect="dark">
                  {{ scope.row.status_name }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operator_name" label="盘点人" width="120" />
            <el-table-column label="盘点时间" min-width="170">
              <template #default="scope">
                {{ formatUnix(scope.row.check_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="100">
              <template #default="scope">
                <el-button link type="primary" @click="openCheckDetail(scope.row.id)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="station-pagination">
            <el-pagination
              background
              layout="total, prev, pager, next, sizes"
              :total="checkPagination.total"
              :current-page="checkPagination.page"
              :page-size="checkPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              @current-change="handleCheckPageChange"
              @size-change="handleCheckSizeChange"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="stationDetailVisible" size="62%" title="站点详情">
      <div class="station-drawer" v-loading="stationDetailLoading">
        <template v-if="stationDetail">
          <div class="station-detail__hero">
            <div>
              <p class="eyebrow">Station Snapshot</p>
              <h2>{{ normalizeText(stationDetail.name, stationDetail.station_code) }}</h2>
              <p>
                {{ stationDetail.station_code }} · {{ stationDetail.type_name }} ·
                {{ normalizeText(stationDetail.country) }} / {{ normalizeText(stationDetail.city) }}
              </p>
            </div>
            <div class="station-detail__hero-tags">
              <el-tag :type="stationDetail.status === 1 ? 'success' : 'info'" effect="dark">{{ stationDetail.status_name }}</el-tag>
              <el-tag :type="warningTagType(selectedStationInventory.warning_level)" effect="plain">
                {{ warningLabel(selectedStationInventory.warning_level) }}
              </el-tag>
            </div>
          </div>

          <div class="station-detail__toolbar">
            <div class="station-detail__toolbar-actions">
              <el-button v-if="canEditStation" type="success" plain @click="openEditStation(stationDetail)">编辑站点</el-button>
              <el-button type="primary" plain @click="openCreateCheckDialog(stationDetail.id)">对该站点发起盘点</el-button>
            </div>
          </div>

          <div class="station-detail__grid">
            <article class="station-detail-card">
              <h3>站点资料</h3>
              <dl>
                <div>
                  <dt>站点编码</dt>
                  <dd>{{ stationDetail.station_code }}</dd>
                </div>
                <div>
                  <dt>站点类型</dt>
                  <dd>{{ stationDetail.type_name }}</dd>
                </div>
                <div>
                  <dt>联系人</dt>
                  <dd>{{ normalizeText(stationDetail.contact_name, '未设置') }}</dd>
                </div>
                <div>
                  <dt>联系电话</dt>
                  <dd>{{ normalizeText(stationDetail.contact_phone, '无电话') }}</dd>
                </div>
                <div>
                  <dt>工作时间</dt>
                  <dd>{{ normalizeText(stationDetail.working_hours, '未设置') }}</dd>
                </div>
                <div>
                  <dt>备注</dt>
                  <dd>{{ normalizeText(stationDetail.remark, '无备注') }}</dd>
                </div>
              </dl>
            </article>

            <article class="station-detail-card">
              <h3>地址与容量</h3>
              <dl>
                <div>
                  <dt>位置</dt>
                  <dd>{{ formatAddress(stationDetail.country, stationDetail.province, stationDetail.city, stationDetail.address) }}</dd>
                </div>
                <div>
                  <dt>容量</dt>
                  <dd>{{ stationDetail.capacity }}</dd>
                </div>
                <div>
                  <dt>库存使用率</dt>
                  <dd>{{ selectedStationInventory.capacity_usage }}</dd>
                </div>
                <div>
                  <dt>预警说明</dt>
                  <dd>{{ normalizeText(selectedStationWarning.warning_message, '暂无预警') }}</dd>
                </div>
                <div>
                  <dt>建议动作</dt>
                  <dd>{{ normalizeText(selectedStationWarning.recommend_action, '继续保持正常运营') }}</dd>
                </div>
              </dl>
            </article>

            <article class="station-detail-card">
              <h3>库存快照</h3>
              <dl>
                <div>
                  <dt>当前总量</dt>
                  <dd>{{ selectedStationInventory.total_orders }}</dd>
                </div>
                <div>
                  <dt>已入库 / 分拣中</dt>
                  <dd>{{ selectedStationInventory.in_warehouse }} / {{ selectedStationInventory.sorting }}</dd>
                </div>
                <div>
                  <dt>运输中 / 清关中</dt>
                  <dd>{{ selectedStationInventory.in_transit }} / {{ selectedStationInventory.customs_clearing }}</dd>
                </div>
                <div>
                  <dt>目的地分拣 / 配送中</dt>
                  <dd>{{ selectedStationInventory.dest_sorting }} / {{ selectedStationInventory.delivering }}</dd>
                </div>
              </dl>
            </article>

            <article class="station-detail-card">
              <h3>基础时间</h3>
              <dl>
                <div>
                  <dt>创建时间</dt>
                  <dd>{{ formatUnix(stationDetail.ctime) }}</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{{ formatUnix(stationDetail.mtime) }}</dd>
                </div>
                <div>
                  <dt>最后预警检查</dt>
                  <dd>{{ formatUnix(selectedStationWarning.last_check_time) }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div class="station-detail-card station-detail-card--full">
            <div class="station-detail-card__head">
              <h3>站点流转记录</h3>
              <span>{{ stationFlows.length }} 条</span>
            </div>
            <el-table :data="stationFlows" size="small" stripe>
              <el-table-column prop="order_no" label="订单号" min-width="170" />
              <el-table-column label="流转类型" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.flow_type === 'in' ? 'success' : 'warning'" effect="plain">
                    {{ scope.row.flow_type_name }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="重量 / 体积" width="140">
                <template #default="scope">
                  {{ scope.row.weight }} / {{ scope.row.volume }}
                </template>
              </el-table-column>
              <el-table-column prop="next_station" label="下一站点" min-width="160" />
              <el-table-column prop="remark" label="备注" min-width="160" />
              <el-table-column label="时间" min-width="160">
                <template #default="scope">
                  {{ formatUnix(scope.row.flow_time) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
      </div>
    </el-drawer>

    <el-drawer v-model="checkDetailVisible" size="58%" title="盘点记录详情">
      <div class="station-drawer" v-loading="checkDetailLoading">
        <template v-if="checkDetail">
          <div class="station-detail__hero">
            <div>
              <p class="eyebrow">Inventory Check</p>
              <h2>{{ checkDetail.check_no }}</h2>
              <p>{{ normalizeText(checkDetail.station_name) }} · {{ checkDetail.check_type_name }}</p>
            </div>
            <div class="station-detail__hero-tags">
              <el-tag :type="checkDetail.status === 2 ? 'success' : 'warning'" effect="dark">{{ checkDetail.status_name }}</el-tag>
              <el-tag effect="plain">差异 {{ checkDetail.difference_count }}</el-tag>
            </div>
          </div>

          <div class="station-detail__grid">
            <article class="station-detail-card">
              <h3>盘点结果</h3>
              <dl>
                <div>
                  <dt>系统数量</dt>
                  <dd>{{ checkDetail.system_count }}</dd>
                </div>
                <div>
                  <dt>实际数量</dt>
                  <dd>{{ checkDetail.actual_count }}</dd>
                </div>
                <div>
                  <dt>差异数量</dt>
                  <dd>{{ checkDetail.difference_count }}</dd>
                </div>
                <div>
                  <dt>盘点人</dt>
                  <dd>{{ normalizeText(checkDetail.operator_name, '系统') }}</dd>
                </div>
              </dl>
            </article>

            <article class="station-detail-card">
              <h3>时间与备注</h3>
              <dl>
                <div>
                  <dt>发起时间</dt>
                  <dd>{{ formatUnix(checkDetail.check_time) }}</dd>
                </div>
                <div>
                  <dt>完成时间</dt>
                  <dd>{{ formatUnix(checkDetail.complete_time) }}</dd>
                </div>
                <div>
                  <dt>备注</dt>
                  <dd>{{ normalizeText(checkDetail.remark, '无备注') }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div class="station-detail-card station-detail-card--full">
            <div class="station-detail-card__head">
              <h3>盘点明细</h3>
              <span>{{ checkDetail.details.length }} 条</span>
            </div>
            <el-table :data="checkDetail.details" size="small" stripe>
              <el-table-column prop="order_no" label="订单号" min-width="180" />
              <el-table-column prop="status_name" label="订单状态" width="120" />
              <el-table-column prop="is_found_name" label="是否找到" width="100" />
              <el-table-column prop="remark" label="备注" min-width="160" />
            </el-table>
          </div>
        </template>
      </div>
    </el-drawer>

    <el-dialog v-model="createCheckVisible" title="新建库存盘点" width="460px">
      <el-form ref="createCheckFormRef" :model="createCheckForm" :rules="createCheckRules" label-position="top">
        <el-form-item label="盘点站点" prop="station_id">
          <el-select v-model="createCheckForm.station_id" placeholder="请选择站点" style="width: 100%">
            <el-option
              v-for="item in stationOptions"
              :key="item.id"
              :label="normalizeText(item.name, item.station_code)"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="盘点类型" prop="check_type">
          <el-radio-group v-model="createCheckForm.check_type">
            <el-radio-button label="full">全盘</el-radio-button>
            <el-radio-button label="spot">抽盘</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createCheckForm.remark"
            type="textarea"
            :rows="4"
            maxlength="200"
            show-word-limit
            placeholder="可选，填写盘点说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createCheckVisible = false">取消</el-button>
        <el-button type="primary" :loading="createCheckSubmitting" @click="submitCreateCheck">创建盘点</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editStationVisible" title="编辑站点" width="720px">
      <el-form ref="editStationFormRef" :model="editStationForm" :rules="editStationRules" label-position="top">
        <div class="station-edit-grid">
          <el-form-item label="站点名称" prop="name">
            <el-input v-model="editStationForm.name" placeholder="请输入站点名称" />
          </el-form-item>
          <el-form-item label="站点类型" prop="type">
            <el-select v-model="editStationForm.type" placeholder="请选择站点类型" style="width: 100%">
              <el-option v-for="item in stationTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="国家" prop="country">
            <el-input v-model="editStationForm.country" placeholder="请输入国家" />
          </el-form-item>
          <el-form-item label="省份">
            <el-input v-model="editStationForm.province" placeholder="请输入省份" />
          </el-form-item>
          <el-form-item label="城市" prop="city">
            <el-input v-model="editStationForm.city" placeholder="请输入城市" />
          </el-form-item>
          <el-form-item label="容量" prop="capacity">
            <el-input-number v-model="editStationForm.capacity" :min="1" :step="100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="详细地址" prop="address" class="station-edit-grid__wide">
            <el-input v-model="editStationForm.address" placeholder="请输入详细地址" />
          </el-form-item>
          <el-form-item label="纬度">
            <el-input-number v-model="editStationForm.latitude" :step="0.0001" :precision="4" style="width: 100%" />
          </el-form-item>
          <el-form-item label="经度">
            <el-input-number v-model="editStationForm.longitude" :step="0.0001" :precision="4" style="width: 100%" />
          </el-form-item>
          <el-form-item label="联系人">
            <el-input v-model="editStationForm.contact_name" placeholder="请输入联系人" />
          </el-form-item>
          <el-form-item label="联系电话">
            <el-input v-model="editStationForm.contact_phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="工作时间">
            <el-input v-model="editStationForm.working_hours" placeholder="如：09:00-18:00" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="editStationForm.status">
              <el-radio :value="1">启用</el-radio>
              <el-radio :value="0">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="备注" class="station-edit-grid__wide">
            <el-input
              v-model="editStationForm.remark"
              type="textarea"
              :rows="4"
              maxlength="200"
              show-word-limit
              placeholder="可选，填写站点备注"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="editStationVisible = false">取消</el-button>
        <el-button type="primary" :loading="editStationSubmitting" @click="submitEditStation">保存修改</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRoute } from 'vue-router'

import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'
import { readQueryEnum, readQueryNumber } from '@/utils/workbench'

type StationItem = {
  id: number
  station_code: string
  name: string
  type: number
  type_name: string
  country: string
  province: string
  city: string
  address: string
  latitude: number
  longitude: number
  manager_id: number
  manager_name: string
  capacity: number
  contact_name: string
  contact_phone: string
  working_hours: string
  status: number
  status_name: string
  remark: string
  ctime: number
  mtime: number
}

type StationListResponse = {
  list: StationItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type StationInventoryItem = {
  station_id: number
  station_name: string
  station_code: string
  total_orders: number
  in_warehouse: number
  sorting: number
  in_transit: number
  customs_clearing: number
  dest_sorting: number
  delivering: number
  capacity_usage: string
  warning_level: string
}

type StationInventoryResponse = {
  list: StationInventoryItem[]
}

type InventoryWarningItem = {
  station_id: number
  station_name: string
  station_code: string
  current_count: number
  capacity: number
  usage_rate: number
  usage_percent: string
  warning_level: string
  warning_message: string
  last_check_time: number
  recommend_action: string
}

type InventoryWarningResponse = {
  summary: {
    total_stations: number
    normal_stations: number
    warning_stations: number
    critical_stations: number
  }
  warnings: InventoryWarningItem[]
}

type InventoryTrendItem = {
  date: string
  total_orders: number
  avg_usage: number
  max_usage: number
  min_usage: number
  in_warehouse: number
  sorting: number
  in_transit: number
  delivering: number
}

type InventoryStationStats = {
  station_id: number
  station_name: string
  station_code: string
  total_orders: number
  capacity: number
  usage_rate: number
  usage_percent: string
  warning_level: string
  in_warehouse: number
  sorting: number
  in_transit: number
  delivering: number
}

type InventoryStatsResponse = {
  summary: {
    total_stations: number
    total_orders: number
    avg_usage_rate: number
    max_usage_rate: number
    min_usage_rate: number
    warning_stations: number
    critical_stations: number
  }
  trends: InventoryTrendItem[]
  station_top: InventoryStationStats[]
}

type StatusDistributionItem = {
  status: number
  status_name: string
  count: number
  percentage: string
}

type StationDistributionItem = {
  station_id: number
  station_name: string
  count: number
  percentage: string
}

type CapacityDistributionItem = {
  range: string
  count: number
  percentage: string
}

type InventoryDistributionResponse = {
  status_distribution: StatusDistributionItem[]
  station_distribution: StationDistributionItem[]
  capacity_distribution: CapacityDistributionItem[]
}

type StationFlowItem = {
  id: number
  order_id: number
  order_no: string
  station_id: number
  station_name: string
  flow_type: string
  flow_type_name: string
  quantity: number
  weight: number
  volume: number
  operator_id: number
  operator_name: string
  next_station_id: number
  next_station?: string
  remark: string
  flow_time: number
}

type StationFlowListResponse = {
  list: StationFlowItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type InventoryCheckItem = {
  id: number
  check_no: string
  station_id: number
  station_name: string
  check_type: string
  check_type_name: string
  system_count: number
  actual_count: number
  difference_count: number
  status: number
  status_name: string
  operator_id: number
  operator_name: string
  check_time: number
  complete_time: number
  remark: string
}

type InventoryCheckDetailItem = {
  id: number
  order_id: number
  order_no: string
  status: number
  status_name: string
  is_found: number
  is_found_name: string
  remark: string
}

type InventoryCheckDetail = InventoryCheckItem & {
  details: InventoryCheckDetailItem[]
}

type InventoryCheckListResponse = {
  list: InventoryCheckItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type CreateInventoryCheckResponse = {
  id: number
  check_no: string
  message: string
}

type StationRow = StationItem & {
  inventory: StationInventoryItem
}

const stationTypeOptions = [
  { value: 1, label: '始发站' },
  { value: 2, label: '中转站' },
  { value: 3, label: '目的站' },
  { value: 4, label: '海关站点' },
]

const capacityRangeOrder = ['0-30%', '30-50%', '50-70%', '70-90%', '90-100%', '>100%']

const authStore = useAuthStore()
const route = useRoute()
const activeTab = ref('stations')
const warningFilter = ref<'all' | 'warning' | 'critical'>('all')

const stationLoading = ref(false)
const stationDetailLoading = ref(false)
const checkLoading = ref(false)
const checkDetailLoading = ref(false)
const createCheckSubmitting = ref(false)

const stations = ref<StationItem[]>([])
const stationOptions = ref<StationItem[]>([])
const inventory = ref<StationInventoryItem[]>([])
const warnings = reactive<InventoryWarningResponse>({
  summary: {
    total_stations: 0,
    normal_stations: 0,
    warning_stations: 0,
    critical_stations: 0,
  },
  warnings: [],
})
const stats = reactive<InventoryStatsResponse>({
  summary: {
    total_stations: 0,
    total_orders: 0,
    avg_usage_rate: 0,
    max_usage_rate: 0,
    min_usage_rate: 0,
    warning_stations: 0,
    critical_stations: 0,
  },
  trends: [],
  station_top: [],
})
const distribution = reactive<InventoryDistributionResponse>({
  status_distribution: [],
  station_distribution: [],
  capacity_distribution: [],
})
const checks = ref<InventoryCheckItem[]>([])
const stationDetail = ref<StationItem | null>(null)
const stationFlows = ref<StationFlowItem[]>([])
const checkDetail = ref<InventoryCheckDetail | null>(null)

const stationDetailVisible = ref(false)
const checkDetailVisible = ref(false)
const createCheckVisible = ref(false)
const editStationVisible = ref(false)

const stationPagination = reactive({
  total: 0,
  page: 1,
  pageSize: 10,
})

const checkPagination = reactive({
  total: 0,
  page: 1,
  pageSize: 10,
})

const stationFilters = reactive<{
  keyword: string
  type?: number
  country: string
  city: string
  status?: number
}>({
  keyword: '',
  type: undefined,
  country: '',
  city: '',
  status: undefined,
})

const checkFilters = reactive<{
  station_id?: number
  check_type?: string
  status?: number
}>({
  station_id: undefined,
  check_type: undefined,
  status: undefined,
})

const createCheckFormRef = ref<FormInstance>()
const editStationFormRef = ref<FormInstance>()
const createCheckForm = reactive({
  station_id: undefined as number | undefined,
  check_type: 'full',
  remark: '',
})
const editStationTargetId = ref<number | null>(null)
const editStationSubmitting = ref(false)
const editStationForm = reactive({
  name: '',
  type: 1,
  country: '',
  province: '',
  city: '',
  address: '',
  latitude: 0,
  longitude: 0,
  capacity: 1,
  contact_name: '',
  contact_phone: '',
  working_hours: '',
  status: 1,
  remark: '',
})

const createCheckRules: FormRules<typeof createCheckForm> = {
  station_id: [{ required: true, message: '请选择盘点站点', trigger: 'change' }],
  check_type: [{ required: true, message: '请选择盘点类型', trigger: 'change' }],
}
const editStationRules: FormRules<typeof editStationForm> = {
  name: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择站点类型', trigger: 'change' }],
  country: [{ required: true, message: '请输入国家', trigger: 'blur' }],
  city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const defaultInventory: StationInventoryItem = {
  station_id: 0,
  station_name: '',
  station_code: '',
  total_orders: 0,
  in_warehouse: 0,
  sorting: 0,
  in_transit: 0,
  customs_clearing: 0,
  dest_sorting: 0,
  delivering: 0,
  capacity_usage: '0.0%',
  warning_level: 'normal',
}

const defaultWarning: InventoryWarningItem = {
  station_id: 0,
  station_name: '',
  station_code: '',
  current_count: 0,
  capacity: 0,
  usage_rate: 0,
  usage_percent: '0.0%',
  warning_level: 'normal',
  warning_message: '',
  last_check_time: 0,
  recommend_action: '',
}

const inventoryMap = computed(() => {
  const map = new Map<number, StationInventoryItem>()
  inventory.value.forEach((item) => map.set(item.station_id, item))
  return map
})

const warningMap = computed(() => {
  const map = new Map<number, InventoryWarningItem>()
  warnings.warnings.forEach((item) => map.set(item.station_id, item))
  return map
})

const stationRows = computed<StationRow[]>(() =>
  stations.value.map((item) => ({
    ...item,
    inventory: inventoryMap.value.get(item.id) || { ...defaultInventory, station_id: item.id },
  })),
)

const selectedStationInventory = computed(
  () => (stationDetail.value ? inventoryMap.value.get(stationDetail.value.id) : undefined) || defaultInventory,
)

const selectedStationWarning = computed(
  () => (stationDetail.value ? warningMap.value.get(stationDetail.value.id) : undefined) || defaultWarning,
)

const filteredWarnings = computed(() => {
  if (warningFilter.value === 'all') {
    return warnings.warnings
  }
  return warnings.warnings.filter((item) => item.warning_level === warningFilter.value)
})

const sortedCapacityDistribution = computed(() => {
  return [...distribution.capacity_distribution].sort(
    (a, b) => capacityRangeOrder.indexOf(a.range) - capacityRangeOrder.indexOf(b.range),
  )
})

const topBusyStations = computed(() => stats.station_top.slice(0, 4))
const canEditStation = computed(() => authStore.user?.role === 7)

function normalizeText(value: string | null | undefined, fallback = '-') {
  const text = String(value ?? '').trim()
  if (!text || /^[?？�]+$/.test(text)) {
    return fallback
  }
  return text
}

function formatUnix(value: number | undefined | null) {
  if (!value) {
    return '-'
  }
  const date = new Date(value * 1000)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatAddress(country?: string, province?: string, city?: string, address?: string) {
  return [country, province, city, address]
    .map((item) => normalizeText(item, ''))
    .filter(Boolean)
    .join(' / ') || '-'
}

function warningLabel(level: string) {
  const mapping: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    critical: '严重',
  }
  return mapping[level] || '未知'
}

function warningTagType(level: string): 'success' | 'warning' | 'danger' | 'info' {
  const mapping: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    normal: 'success',
    warning: 'warning',
    critical: 'danger',
  }
  return mapping[level] || 'info'
}

function applyWorkbenchFilters() {
  const tab = readQueryEnum(route.query, 'tab', ['stations', 'warnings', 'checks'] as const)
  const warningLevel = readQueryEnum(route.query, 'warning_filter', ['warning', 'critical'] as const)
  const checkStatus = readQueryNumber(route.query, 'check_status')

  if (tab) {
    activeTab.value = tab
  }
  if (warningLevel) {
    warningFilter.value = warningLevel
  }
  if (typeof checkStatus === 'number' && [1, 2].includes(checkStatus)) {
    checkFilters.status = checkStatus
  }
}

function buildStationQueryParams() {
  const params: Record<string, string | number> = {
    page: stationPagination.page,
    page_size: stationPagination.pageSize,
  }
  if (stationFilters.keyword.trim()) {
    params.keyword = stationFilters.keyword.trim()
  }
  if (typeof stationFilters.type === 'number') {
    params.type = stationFilters.type
  }
  if (stationFilters.country.trim()) {
    params.country = stationFilters.country.trim()
  }
  if (stationFilters.city.trim()) {
    params.city = stationFilters.city.trim()
  }
  if (typeof stationFilters.status === 'number') {
    params.status = stationFilters.status
  }
  return params
}

function buildCheckQueryParams() {
  const params: Record<string, string | number> = {
    page: checkPagination.page,
    page_size: checkPagination.pageSize,
  }
  if (typeof checkFilters.station_id === 'number') {
    params.station_id = checkFilters.station_id
  }
  if (checkFilters.check_type) {
    params.check_type = checkFilters.check_type
  }
  if (typeof checkFilters.status === 'number') {
    params.status = checkFilters.status
  }
  return params
}

async function loadStationOptions() {
  const data = await http.get<never, StationListResponse>('/stations', {
    params: {
      page: 1,
      page_size: 100,
      status: 1,
    },
  })
  stationOptions.value = data.list || []
}

async function loadStations() {
  stationLoading.value = true
  try {
    const data = await http.get<never, StationListResponse>('/stations', {
      params: buildStationQueryParams(),
    })
    stations.value = data.list || []
    stationPagination.total = data.total || 0
    stationPagination.page = data.page || stationPagination.page
    stationPagination.pageSize = data.page_size || stationPagination.pageSize
  } finally {
    stationLoading.value = false
  }
}

async function loadInventory() {
  const data = await http.get<never, StationInventoryResponse>('/stations/inventory')
  inventory.value = data.list || []
}

async function loadWarnings() {
  const data = await http.get<never, InventoryWarningResponse>('/stations/inventory/warnings')
  warnings.summary = data.summary || warnings.summary
  warnings.warnings = data.warnings || []
}

async function loadStats() {
  const data = await http.get<never, InventoryStatsResponse>('/stations/inventory/stats', {
    params: {
      date_type: 'day',
    },
  })
  stats.summary = data.summary || stats.summary
  stats.trends = data.trends || []
  stats.station_top = data.station_top || []
}

async function loadDistribution() {
  const data = await http.get<never, InventoryDistributionResponse>('/stations/inventory/distribution')
  distribution.status_distribution = data.status_distribution || []
  distribution.station_distribution = data.station_distribution || []
  distribution.capacity_distribution = data.capacity_distribution || []
}

async function loadChecks() {
  checkLoading.value = true
  try {
    const data = await http.get<never, InventoryCheckListResponse>('/stations/inventory/check', {
      params: buildCheckQueryParams(),
    })
    checks.value = data.list || []
    checkPagination.total = data.total || 0
    checkPagination.page = data.page || checkPagination.page
    checkPagination.pageSize = data.page_size || checkPagination.pageSize
  } finally {
    checkLoading.value = false
  }
}

async function refreshOverview() {
  await Promise.all([loadInventory(), loadWarnings(), loadStats(), loadDistribution()])
}

async function applyStationFilters() {
  stationPagination.page = 1
  await loadStations()
}

function resetStationFilters() {
  stationFilters.keyword = ''
  stationFilters.type = undefined
  stationFilters.country = ''
  stationFilters.city = ''
  stationFilters.status = undefined
  stationPagination.page = 1
  void loadStations()
}

function handleStationPageChange(page: number) {
  stationPagination.page = page
  void loadStations()
}

function handleStationSizeChange(size: number) {
  stationPagination.pageSize = size
  stationPagination.page = 1
  void loadStations()
}

async function applyCheckFilters() {
  checkPagination.page = 1
  await loadChecks()
}

function resetCheckFilters() {
  checkFilters.station_id = undefined
  checkFilters.check_type = undefined
  checkFilters.status = undefined
  checkPagination.page = 1
  void loadChecks()
}

function handleCheckPageChange(page: number) {
  checkPagination.page = page
  void loadChecks()
}

function handleCheckSizeChange(size: number) {
  checkPagination.pageSize = size
  checkPagination.page = 1
  void loadChecks()
}

async function openStationDetail(stationID: number) {
  stationDetailVisible.value = true
  stationDetailLoading.value = true
  try {
    const [detail, flowData] = await Promise.all([
      http.get<never, StationItem>(`/stations/${stationID}`),
      http.get<never, StationFlowListResponse>('/stations/flows/records', {
        params: {
          station_id: stationID,
          page: 1,
          page_size: 8,
        },
      }),
    ])
    stationDetail.value = detail
    stationFlows.value = flowData.list || []
  } finally {
    stationDetailLoading.value = false
  }
}

async function openCheckDetail(checkID: number) {
  checkDetailVisible.value = true
  checkDetailLoading.value = true
  try {
    checkDetail.value = await http.get<never, InventoryCheckDetail>(`/stations/inventory/check/${checkID}`)
  } finally {
    checkDetailLoading.value = false
  }
}

function openCreateCheckDialog(stationID?: number) {
  createCheckForm.station_id = stationID
  createCheckForm.check_type = 'full'
  createCheckForm.remark = ''
  createCheckVisible.value = true
}

function openEditStation(station: StationItem | StationRow) {
  editStationTargetId.value = station.id
  editStationForm.name = station.name || ''
  editStationForm.type = station.type || 1
  editStationForm.country = station.country || ''
  editStationForm.province = station.province || ''
  editStationForm.city = station.city || ''
  editStationForm.address = station.address || ''
  editStationForm.latitude = station.latitude || 0
  editStationForm.longitude = station.longitude || 0
  editStationForm.capacity = station.capacity || 1
  editStationForm.contact_name = station.contact_name || ''
  editStationForm.contact_phone = station.contact_phone || ''
  editStationForm.working_hours = station.working_hours || ''
  editStationForm.status = station.status ?? 1
  editStationForm.remark = station.remark || ''
  editStationVisible.value = true
  editStationFormRef.value?.clearValidate()
}

async function submitCreateCheck() {
  if (!createCheckFormRef.value) {
    return
  }
  const valid = await createCheckFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  createCheckSubmitting.value = true
  try {
    const data = await http.post<never, CreateInventoryCheckResponse>('/stations/inventory/check', {
      station_id: createCheckForm.station_id,
      check_type: createCheckForm.check_type,
      remark: createCheckForm.remark.trim(),
    })
    ElMessage.success(`盘点单创建成功：${data.check_no}`)
    createCheckVisible.value = false
    activeTab.value = 'checks'
    await loadChecks()
    await openCheckDetail(data.id)
  } finally {
    createCheckSubmitting.value = false
  }
}

async function submitEditStation() {
  if (!editStationTargetId.value || !editStationFormRef.value) {
    return
  }

  const valid = await editStationFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  editStationSubmitting.value = true
  try {
    await http.put(`/stations/${editStationTargetId.value}`, {
      name: editStationForm.name.trim(),
      type: editStationForm.type,
      country: editStationForm.country.trim(),
      province: editStationForm.province.trim(),
      city: editStationForm.city.trim(),
      address: editStationForm.address.trim(),
      latitude: Number(editStationForm.latitude),
      longitude: Number(editStationForm.longitude),
      capacity: Number(editStationForm.capacity),
      contact_name: editStationForm.contact_name.trim(),
      contact_phone: editStationForm.contact_phone.trim(),
      working_hours: editStationForm.working_hours.trim(),
      status: editStationForm.status,
      remark: editStationForm.remark.trim(),
    })
    ElMessage.success('站点信息已更新')
    editStationVisible.value = false
    await Promise.all([loadStations(), loadStationOptions(), refreshOverview()])
    if (stationDetailVisible.value && stationDetail.value?.id === editStationTargetId.value) {
      await openStationDetail(editStationTargetId.value)
    }
  } finally {
    editStationSubmitting.value = false
  }
}

function focusStationWarning(stationID: number) {
  activeTab.value = 'warnings'
  warningFilter.value = 'all'
  const warning = warnings.warnings.find((item) => item.station_id === stationID)
  if (!warning) {
    return
  }
  if (warning.warning_level === 'warning' || warning.warning_level === 'critical') {
    warningFilter.value = warning.warning_level as 'warning' | 'critical'
  }
}

onMounted(async () => {
  applyWorkbenchFilters()
  await Promise.all([
    loadStationOptions(),
    loadStations(),
    loadInventory(),
    loadWarnings(),
    loadStats(),
    loadDistribution(),
    loadChecks(),
  ])
})
</script>

<style scoped>
.station-inventory-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.station-hero,
.station-panel,
.warning-panel,
.check-panel {
  padding: 1.5rem;
}

.station-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
}

.station-hero h1,
.station-detail__hero h2 {
  margin: 0;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: clamp(2.2rem, 4vw, 3.4rem);
}

.station-hero p,
.station-detail__hero p {
  max-width: 48rem;
  color: var(--muted);
  line-height: 1.75;
}

.station-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.station-hero__chips span {
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(238, 77, 45, 0.08);
  border: 1px solid rgba(238, 77, 45, 0.12);
  color: var(--accent-deep);
  font-size: 0.85rem;
  font-weight: 600;
}

.station-hero__stats {
  min-width: 18rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.station-hero__stats article {
  padding: 1rem 1.15rem;
  border-radius: 18px;
  background: rgba(238, 77, 45, 0.08);
  border: 1px solid rgba(238, 77, 45, 0.14);
}

.station-hero__stats span {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}

.station-hero__stats strong {
  font-size: 1.5rem;
  color: var(--accent-deep);
}

.station-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.station-panel__toolbar,
.warning-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.station-panel__toolbar {
  margin-bottom: 1rem;
}

.station-panel__toolbar strong {
  color: var(--ink);
}

.station-panel__toolbar-actions {
  display: flex;
  gap: 0.75rem;
}

.station-detail__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.station-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.station-table :deep(.el-table__header th),
.warning-table :deep(.el-table__header th),
.check-table :deep(.el-table__header th) {
  background: rgba(238, 77, 45, 0.06);
  color: var(--accent-deep);
}

.station-table__identity,
.station-table__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.station-table__identity strong,
.station-table__meta strong {
  color: var(--ink);
}

.station-table__identity span,
.station-table__meta span,
.station-table__identity small {
  color: var(--muted);
}

.station-table__inventory {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem 0.75rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.station-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0.45rem;
  white-space: nowrap;
}

.station-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.station-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.warning-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.warning-card {
  padding: 1.3rem;
}

.warning-card h3 {
  margin: 0.2rem 0 0.6rem;
  font-size: 1.05rem;
}

.warning-card strong {
  display: block;
  color: var(--accent-deep);
  font-size: 2rem;
}

.warning-card span {
  color: var(--muted);
}

.warning-card--accent {
  background: linear-gradient(180deg, rgba(255, 248, 235, 0.98) 0%, rgba(255, 243, 219, 0.96) 100%);
}

.warning-card--critical {
  background: linear-gradient(180deg, rgba(255, 241, 240, 0.98) 0%, rgba(255, 230, 228, 0.96) 100%);
}

.warning-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
  gap: 1rem;
  margin-top: 1rem;
}

.warning-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.warning-panel__head h3,
.station-detail-card__head h3 {
  margin: 0;
  font-size: 1.05rem;
}

.station-top-list,
.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.station-top-list article,
.distribution-list article {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 248, 243, 0.76);
}

.station-top-list strong,
.distribution-list strong {
  color: var(--ink);
}

.station-top-list span,
.distribution-list span,
.distribution-list small {
  color: var(--muted);
}

.station-drawer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 12rem;
}

.station-detail__hero,
.station-detail__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.station-detail__hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.station-detail__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.station-detail-card {
  padding: 1.2rem;
  border-radius: 20px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 248, 243, 0.72);
}

.station-detail-card--full {
  grid-column: 1 / -1;
}

.station-detail-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.station-detail-card dl {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
}

.station-detail-card dl div {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 0.75rem;
}

.station-detail-card dt {
  color: var(--muted);
}

.station-detail-card dd {
  margin: 0;
  color: var(--ink);
  line-height: 1.6;
}

.station-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 1rem;
}

.station-edit-grid__wide {
  grid-column: 1 / -1;
}

.text-success {
  color: #2f9e44;
}

.text-danger {
  color: #d94841;
}

@media (max-width: 1200px) {
  .warning-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .station-hero,
  .station-panel__toolbar,
  .warning-panel__head,
  .station-detail__hero,
  .station-detail__toolbar {
    flex-direction: column;
  }

  .station-hero__stats,
  .warning-grid,
  .station-detail__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .station-table__inventory,
  .station-edit-grid,
  .station-detail-card dl div {
    grid-template-columns: 1fr;
  }

  .station-pagination {
    justify-content: flex-start;
    overflow: auto;
  }

  .station-panel__toolbar-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
