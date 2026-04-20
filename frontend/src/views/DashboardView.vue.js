import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
const loading = ref(false);
const orderStats = reactive({
    total_orders: 0,
    total_amount: 0,
    by_status: [],
    by_transport_mode: [],
    by_sender_country: [],
    by_receiver_country: [],
});
const sortingStats = reactive({
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
});
const transportOverview = reactive({
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
});
const stationWarnings = reactive({
    summary: {
        total_stations: 0,
        normal_stations: 0,
        warning_stations: 0,
        critical_stations: 0,
    },
    warnings: [],
});
const trackingWarnings = reactive({
    list: [],
    total: 0,
    page: 1,
    page_size: 5,
    pages: 0,
    warning_count: 0,
    critical_count: 0,
});
const exceptionStats = reactive({
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
});
const recentBatches = ref([]);
const pendingInventoryChecks = ref([]);
const driverTasks = ref([]);
const dispatchPlans = ref([]);
const trackingWarningTotal = computed(() => trackingWarnings.total || 0);
const pendingInventoryCheckTotal = computed(() => pendingInventoryChecks.value.length);
const driverPendingTasks = computed(() => driverTasks.value.filter((item) => item.status === 'pending').length);
const driverInProgressTasks = computed(() => driverTasks.value.filter((item) => item.status === 'in_progress').length);
const driverCompletedTasks = computed(() => driverTasks.value.filter((item) => item.status === 'completed').length);
const pendingBatchCount = computed(() => recentBatches.value.filter((item) => item.status === 'pending').length);
const draftPlanCount = computed(() => dispatchPlans.value.filter((item) => item.status === 'draft').length);
const confirmedPlanCount = computed(() => dispatchPlans.value.filter((item) => item.status === 'confirmed').length);
const roleFocus = computed(() => {
    const role = authStore.user?.role || 0;
    const mapping = {
        7: ['全链路监控', '异常总控', '调度收口'],
        6: ['调度排班', '计划确认', '运力协调'],
        5: ['站点承接', '库存盘点', '异常分流'],
        4: ['运输执行', '装卸交接', '任务反馈'],
        3: ['分拣作业', '规则执行', '扫描质量'],
        2: ['订单受理', '站点交接', '异常上报'],
        1: ['订单跟踪', '进度查询', '签收关注'],
    };
    return mapping[role] || ['全链路运营', '关键待办', '风险预警'];
});
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
]);
function createWorkbenchRoute(path, query = {}) {
    return {
        path,
        query: Object.fromEntries(Object.entries(query).filter(([, value]) => typeof value !== 'undefined' && value !== '')),
    };
}
function pickTrackingWarningLevel() {
    if (trackingWarnings.critical_count > 0) {
        return 'critical';
    }
    if (trackingWarnings.warning_count > 0) {
        return 'warning';
    }
    return undefined;
}
function pickStationWarningFilter() {
    if (stationWarnings.summary.critical_stations > 0) {
        return 'critical';
    }
    if (stationWarnings.summary.warning_stations > 0) {
        return 'warning';
    }
    return undefined;
}
function pickExceptionStatus() {
    if (exceptionStats.summary.pending_exceptions > 0) {
        return 1;
    }
    if (exceptionStats.summary.processing_exceptions > 0) {
        return 2;
    }
    return undefined;
}
const roleTodoItems = computed(() => {
    const role = authStore.user?.role || 0;
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
                    metric: `${countOrderStatuses([13, 14, 15, 3, 4, 5, 7, 8])} 单`,
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
            ];
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
                    metric: `${countOrderStatuses([14, 15, 5, 7, 8])} 单`,
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
            ];
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
            ];
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
            ];
        case 5:
            return [
                {
                    group: '站点管理员',
                    title: '待入库订单',
                    metric: `${countOrderStatus(2)} 单`,
                    detail: '优先推进待揽收、揽收中和已揽收待入库订单',
                    to: createWorkbenchRoute('/orders', { status: 13 }),
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
            ];
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
            ];
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
            ];
        default:
            return [
                {
                    group: '工作台',
                    title: '订单关注',
                    metric: `${orderStats.total_orders} 单`,
                    detail: '进入订单中心查看当前处理进度',
                    to: createWorkbenchRoute('/orders', { status: 1 }),
                },
            ];
    }
});
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
]);
const attentionItems = computed(() => {
    const items = [];
    trackingWarnings.list.slice(0, 3).forEach((item) => {
        items.push({
            key: `tracking-${item.order_id}-${item.warning_type}`,
            module: '追踪',
            title: item.order_no,
            detail: normalizeText(item.warning_message, '存在追踪风险'),
            to: '/tracking',
        });
    });
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
        });
    });
    if (transportOverview.critical_tasks > 0 || transportOverview.delayed_tasks > 0) {
        items.push({
            key: 'transport-overview',
            module: '运输',
            title: '运输执行风险',
            detail: `严重预警 ${transportOverview.critical_tasks} 个，延迟 ${transportOverview.delayed_tasks} 个`,
            to: '/transport',
        });
    }
    if (exceptionStats.summary.pending_exceptions + exceptionStats.summary.processing_exceptions > 0) {
        items.push({
            key: 'exception-open',
            module: '异常',
            title: '待闭环异常',
            detail: `${exceptionStats.summary.pending_exceptions + exceptionStats.summary.processing_exceptions} 单需要跟进`,
            to: '/exceptions',
        });
    }
    return items.slice(0, 6);
});
function countOrderStatus(status) {
    return orderStats.by_status.find((item) => item.status === status)?.count || 0;
}
function countOrderStatuses(statuses) {
    return statuses.reduce((total, status) => total + countOrderStatus(status), 0);
}
function normalizeText(value, fallback = '-') {
    const text = String(value ?? '').trim();
    if (!text || /^[?？�]+$/.test(text)) {
        return fallback;
    }
    return text;
}
function formatMoney(value) {
    return `¥${(Number(value) || 0).toFixed(2)}`;
}
async function loadOrderStats() {
    const data = await http.get('/orders/statistics');
    Object.assign(orderStats, data);
}
async function loadSortingStats() {
    if (!authStore.permissions.includes('sorting:view')) {
        return;
    }
    const data = await http.get('/sorting/stats');
    Object.assign(sortingStats, data);
}
async function loadTransportOverview() {
    if (!authStore.permissions.includes('transport:view')) {
        return;
    }
    const data = await http.get('/transport/monitor/overview');
    Object.assign(transportOverview, data);
}
async function loadStationWarnings() {
    const data = await http.get('/stations/inventory/warnings');
    Object.assign(stationWarnings, data);
}
async function loadTrackingWarnings() {
    if (!authStore.permissions.includes('tracking:view')) {
        return;
    }
    const data = await http.get('/tracking/warnings', {
        params: { page: 1, page_size: 5 },
    });
    Object.assign(trackingWarnings, data);
}
async function loadExceptionStats() {
    if (!authStore.permissions.includes('exception:view')) {
        return;
    }
    const data = await http.get('/exceptions/stats');
    Object.assign(exceptionStats, data);
}
async function loadRecentBatches() {
    const data = await http.get('/dispatch/batches', {
        params: { page: 1, page_size: 20 },
    });
    recentBatches.value = data.list || [];
}
async function loadPendingInventoryChecks() {
    if (!(authStore.permissions.includes('station:view') || authStore.user?.role === 5 || authStore.user?.role === 7)) {
        return;
    }
    const data = await http.get('/stations/inventory/check', {
        params: { page: 1, page_size: 20, status: 1 },
    });
    pendingInventoryChecks.value = data.list || [];
}
async function loadDriverTasks() {
    if (authStore.user?.role !== 4 || !authStore.user?.id) {
        return;
    }
    const data = await http.get('/transport/tasks', {
        params: { page: 1, page_size: 20, driver_id: authStore.user.id },
    });
    driverTasks.value = data.list || [];
}
async function loadDispatchPlans() {
    if (![6, 7].includes(authStore.user?.role || 0)) {
        return;
    }
    const data = await http.get('/dispatch/plans', {
        params: { page: 1, page_size: 20 },
    });
    dispatchPlans.value = data.list || [];
}
async function loadDashboardData() {
    loading.value = true;
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
        ]);
    }
    finally {
        loading.value = false;
    }
}
onMounted(async () => {
    await loadDashboardData();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dashboard-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-view__hero-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-card']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-card']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-card']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card__action']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-step']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-step']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-step']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-step']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-steps']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-steps']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dashboard-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-view__hero-meta" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.roleFocus))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item),
    });
    (item);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.orderStats.total_orders);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.transportOverview.in_progress_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.trackingWarningTotal);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.exceptionStats.summary.total_compensation));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workbench-grid" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workbenchCards))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: (item.title),
        to: (item.to),
        ...{ class: "card-panel workbench-card" },
    }));
    const __VLS_2 = __VLS_1({
        key: (item.title),
        to: (item.to),
        ...{ class: "card-panel workbench-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "workbench-card__group" },
    });
    (item.group);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.metric);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (item.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (item.detail);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "workbench-card__action" },
    });
    var __VLS_3;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel todo-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "todo-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "todo-grid" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.roleTodoItems))) {
    const __VLS_4 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        key: (item.title),
        to: (item.to),
        ...{ class: "todo-card" },
    }));
    const __VLS_6 = __VLS_5({
        key: (item.title),
        to: (item.to),
        ...{ class: "todo-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_7.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "todo-card__group" },
    });
    (item.group);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.metric);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (item.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (item.detail);
    var __VLS_7;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel flow-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flow-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flow-steps" },
});
for (const [step] of __VLS_getVForSourceType((__VLS_ctx.flowSteps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (step.title),
        ...{ class: "flow-step" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "flow-step__index" },
    });
    (step.index);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (step.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (step.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (step.metric);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dashboard-columns" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel signal-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "signal-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
if (__VLS_ctx.attentionItems.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "signal-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.attentionItems))) {
        const __VLS_8 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            key: (item.key),
            to: (item.to),
            ...{ class: "signal-item" },
        }));
        const __VLS_10 = __VLS_9({
            key: (item.key),
            to: (item.to),
            ...{ class: "signal-item" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "signal-item__module" },
        });
        (item.module);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.detail);
        var __VLS_11;
    }
}
else {
    const __VLS_12 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        description: "当前没有需要立即关注的风险项",
    }));
    const __VLS_14 = __VLS_13({
        description: "当前没有需要立即关注的风险项",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel signal-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "signal-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_16 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    to: "/dispatch",
    ...{ class: "signal-panel__link" },
}));
const __VLS_18 = __VLS_17({
    to: "/dispatch",
    ...{ class: "signal-panel__link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
var __VLS_19;
if (__VLS_ctx.recentBatches.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "signal-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.recentBatches))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "signal-item signal-item--static" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "signal-item__module" },
        });
        (item.status_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.batch_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.plate_number || '未分配车辆');
        (item.driver_name || '未分配司机');
    }
}
else {
    const __VLS_20 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        description: "当前没有批次调度数据",
    }));
    const __VLS_22 = __VLS_21({
        description: "当前没有批次调度数据",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
}
/** @type {__VLS_StyleScopedClasses['dashboard-view']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-view__hero-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card__group']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-card__action']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-card']} */ ;
/** @type {__VLS_StyleScopedClasses['todo-card__group']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-steps']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-step']} */ ;
/** @type {__VLS_StyleScopedClasses['flow-step__index']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-list']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item__module']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-panel__link']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-list']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item--static']} */ ;
/** @type {__VLS_StyleScopedClasses['signal-item__module']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            orderStats: orderStats,
            transportOverview: transportOverview,
            exceptionStats: exceptionStats,
            recentBatches: recentBatches,
            trackingWarningTotal: trackingWarningTotal,
            roleFocus: roleFocus,
            workbenchCards: workbenchCards,
            roleTodoItems: roleTodoItems,
            flowSteps: flowSteps,
            attentionItems: attentionItems,
            formatMoney: formatMoney,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
