import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { readQueryEnum } from '@/utils/workbench';
const taskStatusOptions = [{ value: 'pending', label: '待执行' }, { value: 'in_progress', label: '执行中' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }];
const route = useRoute();
const activeTab = ref('vehicles');
const monitorFilter = ref('all');
const vehicles = ref([]);
const tasks = ref([]);
const records = ref([]);
const monitorTasks = ref([]);
const warnings = ref([]);
const costTasks = ref([]);
const userOptions = ref([]);
const stationOptions = ref([]);
const orderOptions = ref([]);
const scanResult = ref(null);
const vehicleLoading = ref(false);
const taskLoading = ref(false);
const recordLoading = ref(false);
const vehicleSubmitting = ref(false);
const taskSubmitting = ref(false);
const taskStatusSubmitting = ref(false);
const scanSubmitting = ref(false);
const vehicleDialogVisible = ref(false);
const vehicleDialogMode = ref('create');
const currentVehicleId = ref(null);
const taskDialogVisible = ref(false);
const taskDialogMode = ref('create');
const currentTaskId = ref(null);
const taskStatusDialogVisible = ref(false);
const currentTaskForStatus = ref(null);
const monitorOverview = reactive({ total_tasks: 0, pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, warning_tasks: 0, critical_tasks: 0, delayed_tasks: 0, exception_tasks: 0, avg_progress: 0, total_distance: 0, total_cost: 0 });
const costOverview = reactive({ total_tasks: 0, total_distance: 0, total_cost: 0, total_compensation: 0, avg_cost_per_task: 0, avg_cost_per_km: 0, max_task_cost: 0, min_task_cost: 0, high_cost_tasks: 0 });
const transportStats = reactive({ vehicle_stats: { total_vehicles: 0, available_vehicles: 0, maintenance_vehicles: 0, total_capacity: 0, avg_capacity: 0 }, task_stats: { total_tasks: 0, pending_tasks: 0, in_progress_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, total_distance: 0, total_cost: 0 }, driver_stats: [], status_stats: [] });
const vehiclePagination = reactive({ total: 0, page: 1, pageSize: 10 });
const taskPagination = reactive({ total: 0, page: 1, pageSize: 10 });
const recordPagination = reactive({ total: 0, page: 1, pageSize: 10 });
const vehicleFilters = reactive({ plate_number: '', vehicle_type: '', driver_id: undefined, status: -1 });
const taskFilters = reactive({ task_no: '', vehicle_id: undefined, driver_id: undefined, status: undefined });
const recordFilters = reactive({ task_no: '', order_no: '', station_id: undefined, scan_type: undefined });
const vehicleFormRef = ref();
const vehicleForm = reactive({ plate_number: '', vehicle_type: '', capacity: 0, driver_id: undefined });
const vehicleRules = { plate_number: [{ required: true, message: '请输入车牌号', trigger: 'blur' }] };
const taskFormRef = ref();
const taskForm = reactive({ order_id: undefined, vehicle_id: undefined, driver_id: undefined, start_point: '', end_point: '', distance: 0, cost: 0, remark: '' });
const taskRules = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }], vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }], driver_id: [{ required: true, message: '请选择司机', trigger: 'change' }], start_point: [{ required: true, message: '请输入起点', trigger: 'blur' }], end_point: [{ required: true, message: '请输入终点', trigger: 'blur' }] };
const taskStatusForm = reactive({ status: undefined, remark: '' });
const scanForm = reactive({ task_no: '', scan_type: 'load', scan_code: '', station_id: undefined, remark: '' });
const vehicleOptions = computed(() => vehicles.value);
const driverOptions = computed(() => userOptions.value.filter((item) => item.status === 1 && item.role >= 2));
const topDrivers = computed(() => transportStats.driver_stats.slice(0, 4));
const taskOptionsForScan = computed(() => tasks.value.filter((item) => item.status !== 'completed' && item.status !== 'cancelled'));
const currentTaskStatusOptions = computed(() => nextTaskStatuses(currentTaskForStatus.value?.status || ''));
const filteredMonitorTasks = computed(() => monitorFilter.value === 'all' ? monitorTasks.value : monitorTasks.value.filter((item) => item.warning_level === monitorFilter.value));
const filteredWarnings = computed(() => monitorFilter.value === 'all' ? warnings.value : warnings.value.filter((item) => item.warning_level === monitorFilter.value));
function normalizeText(value, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text))
    return fallback; return text; }
function displayUserName(user) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})`; }
function formatMoney(value) { return `¥${(Number(value) || 0).toFixed(2)}`; }
function formatPercent(value) { return `${(Number(value) || 0).toFixed(1)}%`; }
function safePercentage(value) { const result = Number(value) || 0; return result < 0 ? 0 : result > 100 ? 100 : Number(result.toFixed(1)); }
function warningLabel(level) { return { critical: '严重', warning: '警告', normal: '正常' }[String(level || '')] || '正常'; }
function taskStatusTagType(status) { return { pending: 'info', in_progress: 'warning', completed: 'success', cancelled: 'primary' }[status] || 'info'; }
function nextTaskStatuses(status) { return { pending: [{ value: 'in_progress', label: '执行中' }, { value: 'cancelled', label: '已取消' }], in_progress: [{ value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }], completed: [], cancelled: [] }[status] || []; }
function applyWorkbenchFilters() {
    const tab = readQueryEnum(route.query, 'tab', ['vehicles', 'tasks', 'records', 'monitor']);
    const taskStatus = readQueryEnum(route.query, 'task_status', ['pending', 'in_progress', 'completed', 'cancelled']);
    const warningLevel = readQueryEnum(route.query, 'warning_level', ['warning', 'critical']);
    if (tab) {
        activeTab.value = tab;
    }
    if (taskStatus) {
        taskFilters.status = taskStatus;
    }
    if (warningLevel) {
        monitorFilter.value = warningLevel;
    }
}
function buildVehicleParams() { const params = { page: vehiclePagination.page, page_size: vehiclePagination.pageSize, status: vehicleFilters.status }; if (vehicleFilters.plate_number.trim())
    params.plate_number = vehicleFilters.plate_number.trim(); if (vehicleFilters.vehicle_type.trim())
    params.vehicle_type = vehicleFilters.vehicle_type.trim(); if (typeof vehicleFilters.driver_id === 'number')
    params.driver_id = vehicleFilters.driver_id; return params; }
function buildTaskParams() { const params = { page: taskPagination.page, page_size: taskPagination.pageSize }; if (taskFilters.task_no.trim())
    params.task_no = taskFilters.task_no.trim(); if (typeof taskFilters.vehicle_id === 'number')
    params.vehicle_id = taskFilters.vehicle_id; if (typeof taskFilters.driver_id === 'number')
    params.driver_id = taskFilters.driver_id; if (taskFilters.status)
    params.status = taskFilters.status; return params; }
function buildRecordParams() { const params = { page: recordPagination.page, page_size: recordPagination.pageSize }; if (recordFilters.task_no.trim())
    params.task_no = recordFilters.task_no.trim(); if (recordFilters.order_no.trim())
    params.order_no = recordFilters.order_no.trim(); if (typeof recordFilters.station_id === 'number')
    params.station_id = recordFilters.station_id; if (recordFilters.scan_type)
    params.scan_type = recordFilters.scan_type; return params; }
async function loadUsers() { const data = await http.get('/users', { params: { page: 1, page_size: 100 } }); userOptions.value = data.list || []; }
async function loadStations() { const data = await http.get('/stations', { params: { page: 1, page_size: 100, status: 1 } }); stationOptions.value = data.list || []; }
async function loadOrders() { const data = await http.get('/orders', { params: { page: 1, page_size: 100 } }); orderOptions.value = data.list || []; }
async function loadVehicles() { vehicleLoading.value = true; try {
    const data = await http.get('/transport/vehicles', { params: buildVehicleParams() });
    vehicles.value = data.list || [];
    vehiclePagination.total = data.total || 0;
    vehiclePagination.page = data.page || vehiclePagination.page;
    vehiclePagination.pageSize = data.page_size || vehiclePagination.pageSize;
}
finally {
    vehicleLoading.value = false;
} }
async function loadTasks() { taskLoading.value = true; try {
    const data = await http.get('/transport/tasks', { params: buildTaskParams() });
    tasks.value = data.list || [];
    taskPagination.total = data.total || 0;
    taskPagination.page = data.page || taskPagination.page;
    taskPagination.pageSize = data.page_size || taskPagination.pageSize;
}
finally {
    taskLoading.value = false;
} }
async function loadRecords() { recordLoading.value = true; try {
    const data = await http.get('/transport/records', { params: buildRecordParams() });
    records.value = data.list || [];
    recordPagination.total = data.total || 0;
    recordPagination.page = data.page || recordPagination.page;
    recordPagination.pageSize = data.page_size || recordPagination.pageSize;
}
finally {
    recordLoading.value = false;
} }
async function loadMonitorOverview() { Object.assign(monitorOverview, await http.get('/transport/monitor/overview')); }
async function loadMonitorTasks() { const data = await http.get('/transport/monitor/tasks', { params: { page: 1, page_size: 10 } }); monitorTasks.value = data.list || []; }
async function loadWarnings() { const data = await http.get('/transport/monitor/warnings', { params: { page: 1, page_size: 10 } }); warnings.value = data.list || []; }
async function loadCostOverview() { Object.assign(costOverview, await http.get('/transport/costs/overview', { params: { page: 1, page_size: 10 } })); }
async function loadCostTasks() { const data = await http.get('/transport/costs/tasks', { params: { page: 1, page_size: 10 } }); costTasks.value = data.list || []; }
async function loadTransportStats() { Object.assign(transportStats, await http.get('/transport/stats')); }
async function refreshTransportOverview() { await Promise.all([loadMonitorOverview(), loadMonitorTasks(), loadWarnings(), loadCostOverview(), loadCostTasks(), loadTransportStats()]); }
function resetVehicleForm() { vehicleForm.plate_number = ''; vehicleForm.vehicle_type = ''; vehicleForm.capacity = 0; vehicleForm.driver_id = undefined; }
function openVehicleDialog(vehicle) { if (vehicle) {
    vehicleDialogMode.value = 'edit';
    currentVehicleId.value = vehicle.id;
    vehicleForm.plate_number = vehicle.plate_number;
    vehicleForm.vehicle_type = vehicle.vehicle_type;
    vehicleForm.capacity = vehicle.capacity;
    vehicleForm.driver_id = vehicle.driver_id || undefined;
}
else {
    vehicleDialogMode.value = 'create';
    currentVehicleId.value = null;
    resetVehicleForm();
} vehicleDialogVisible.value = true; vehicleFormRef.value?.clearValidate(); }
async function submitVehicleDialog() { if (!vehicleFormRef.value)
    return; const valid = await vehicleFormRef.value.validate().catch(() => false); if (!valid)
    return; vehicleSubmitting.value = true; try {
    const payload = { plate_number: vehicleForm.plate_number.trim(), vehicle_type: vehicleForm.vehicle_type.trim(), capacity: Number(vehicleForm.capacity), driver_id: vehicleForm.driver_id || 0 };
    if (vehicleDialogMode.value === 'create') {
        await http.post('/transport/vehicles', payload);
        ElMessage.success('车辆已创建');
    }
    else if (currentVehicleId.value) {
        await http.put(`/transport/vehicles/${currentVehicleId.value}`, payload);
        ElMessage.success('车辆已更新');
    }
    vehicleDialogVisible.value = false;
    await Promise.all([loadVehicles(), loadTransportStats()]);
}
finally {
    vehicleSubmitting.value = false;
} }
async function toggleVehicleStatus(vehicle) { await http.put(`/transport/vehicles/${vehicle.id}/status`, { status: vehicle.status === 1 ? 0 : 1 }); ElMessage.success('车辆状态已更新'); await Promise.all([loadVehicles(), loadTransportStats()]); }
function resetTaskForm() { taskForm.order_id = undefined; taskForm.vehicle_id = undefined; taskForm.driver_id = undefined; taskForm.start_point = ''; taskForm.end_point = ''; taskForm.distance = 0; taskForm.cost = 0; taskForm.remark = ''; }
function openTaskDialog(task) { if (task) {
    taskDialogMode.value = 'edit';
    currentTaskId.value = task.id;
    taskForm.order_id = task.order_id;
    taskForm.vehicle_id = task.vehicle_id;
    taskForm.driver_id = task.driver_id;
    taskForm.start_point = task.start_point;
    taskForm.end_point = task.end_point;
    taskForm.distance = task.distance;
    taskForm.cost = task.cost;
    taskForm.remark = task.remark;
}
else {
    taskDialogMode.value = 'create';
    currentTaskId.value = null;
    resetTaskForm();
} taskDialogVisible.value = true; taskFormRef.value?.clearValidate(); }
async function submitTaskDialog() { if (!taskFormRef.value)
    return; const valid = await taskFormRef.value.validate().catch(() => false); if (!valid)
    return; taskSubmitting.value = true; try {
    const payload = { order_id: taskForm.order_id, vehicle_id: taskForm.vehicle_id, driver_id: taskForm.driver_id, start_point: taskForm.start_point.trim(), end_point: taskForm.end_point.trim(), distance: Number(taskForm.distance), cost: Number(taskForm.cost), remark: taskForm.remark.trim() };
    if (taskDialogMode.value === 'create') {
        await http.post('/transport/tasks', payload);
        ElMessage.success('运输任务已创建');
    }
    else if (currentTaskId.value) {
        await http.put(`/transport/tasks/${currentTaskId.value}`, payload);
        ElMessage.success('运输任务已更新');
    }
    taskDialogVisible.value = false;
    await Promise.all([loadTasks(), refreshTransportOverview()]);
}
finally {
    taskSubmitting.value = false;
} }
function openTaskStatusDialog(task) { currentTaskForStatus.value = task; taskStatusForm.status = nextTaskStatuses(task.status)[0]?.value; taskStatusForm.remark = ''; taskStatusDialogVisible.value = true; }
async function submitTaskStatus() { if (!currentTaskForStatus.value || !taskStatusForm.status)
    return; taskStatusSubmitting.value = true; try {
    await http.put(`/transport/tasks/${currentTaskForStatus.value.id}/status`, { status: taskStatusForm.status, remark: taskStatusForm.remark.trim() });
    ElMessage.success('任务状态已更新');
    taskStatusDialogVisible.value = false;
    await Promise.all([loadTasks(), refreshTransportOverview()]);
}
finally {
    taskStatusSubmitting.value = false;
} }
function prefillScan(task, type) { activeTab.value = 'tasks'; scanForm.task_no = task.task_no; scanForm.scan_type = type; scanForm.scan_code = task.order_no; scanForm.station_id = undefined; scanForm.remark = ''; }
async function submitScan() { if (!scanForm.station_id || !scanForm.scan_code.trim()) {
    ElMessage.warning('请填写扫描码和站点');
    return;
} scanSubmitting.value = true; try {
    const endpoint = scanForm.scan_type === 'load' ? '/transport/scan/load' : '/transport/scan/unload';
    scanResult.value = await http.post(endpoint, { task_no: scanForm.task_no.trim(), scan_code: scanForm.scan_code.trim(), station_id: scanForm.station_id, remark: scanForm.remark.trim() });
    ElMessage.success(scanResult.value.message);
    await Promise.all([loadTasks(), loadRecords(), refreshTransportOverview()]);
}
finally {
    scanSubmitting.value = false;
} }
async function applyVehicleFilters() { vehiclePagination.page = 1; await loadVehicles(); }
function resetVehicleFilters() { vehicleFilters.plate_number = ''; vehicleFilters.vehicle_type = ''; vehicleFilters.driver_id = undefined; vehicleFilters.status = -1; vehiclePagination.page = 1; void loadVehicles(); }
function handleVehiclePageChange(page) { vehiclePagination.page = page; void loadVehicles(); }
function handleVehicleSizeChange(size) { vehiclePagination.pageSize = size; vehiclePagination.page = 1; void loadVehicles(); }
async function applyTaskFilters() { taskPagination.page = 1; await loadTasks(); }
function resetTaskFilters() { taskFilters.task_no = ''; taskFilters.vehicle_id = undefined; taskFilters.driver_id = undefined; taskFilters.status = undefined; taskPagination.page = 1; void loadTasks(); }
function handleTaskPageChange(page) { taskPagination.page = page; void loadTasks(); }
function handleTaskSizeChange(size) { taskPagination.pageSize = size; taskPagination.page = 1; void loadTasks(); }
async function applyRecordFilters() { recordPagination.page = 1; await loadRecords(); }
function resetRecordFilters() { recordFilters.task_no = ''; recordFilters.order_no = ''; recordFilters.station_id = undefined; recordFilters.scan_type = undefined; recordPagination.page = 1; void loadRecords(); }
function handleRecordPageChange(page) { recordPagination.page = page; void loadRecords(); }
function handleRecordSizeChange(size) { recordPagination.pageSize = size; recordPagination.page = 1; void loadRecords(); }
onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadUsers(), loadStations(), loadOrders(), loadVehicles(), loadTasks(), loadRecords(), refreshTransportOverview()]); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['transport-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['scan-result']} */ ;
/** @type {__VLS_StyleScopedClasses['scan-result']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-layout--monitor']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--task']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--monitor']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-pagination']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "transport-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topDrivers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item.driver_id),
    });
    (__VLS_ctx.normalizeText(item.driver_name));
    (__VLS_ctx.formatMoney(item.cost));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.transportStats.vehicle_stats.total_vehicles);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.monitorOverview.total_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.monitorOverview.critical_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.costOverview.total_cost));
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "transport-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "transport-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "车辆中心",
    name: "vehicles",
}));
const __VLS_6 = __VLS_5({
    label: "车辆中心",
    name: "vehicles",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel transport-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar-actions" },
});
const __VLS_8 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onClick': {} },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onClick: (__VLS_ctx.loadTransportStats)
};
__VLS_11.slots.default;
var __VLS_11;
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openVehicleDialog();
    }
};
__VLS_19.slots.default;
var __VLS_19;
const __VLS_24 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.vehicleFilters),
    ...{ class: "transport-filters" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.vehicleFilters),
    ...{ class: "transport-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onSubmit: () => { }
};
__VLS_27.slots.default;
const __VLS_32 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "车牌号",
}));
const __VLS_34 = __VLS_33({
    label: "车牌号",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.vehicleFilters.plate_number),
    clearable: true,
    placeholder: "请输入车牌号",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.vehicleFilters.plate_number),
    clearable: true,
    placeholder: "请输入车牌号",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onKeyup: (__VLS_ctx.applyVehicleFilters)
};
var __VLS_39;
var __VLS_35;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "车型",
}));
const __VLS_46 = __VLS_45({
    label: "车型",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.vehicleFilters.vehicle_type),
    clearable: true,
    placeholder: "如：厢式货车",
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.vehicleFilters.vehicle_type),
    clearable: true,
    placeholder: "如：厢式货车",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "司机",
}));
const __VLS_54 = __VLS_53({
    label: "司机",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.vehicleFilters.driver_id),
    clearable: true,
    placeholder: "全部司机",
    ...{ style: {} },
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.vehicleFilters.driver_id),
    clearable: true,
    placeholder: "全部司机",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "全部司机",
    value: (undefined),
}));
const __VLS_62 = __VLS_61({
    label: "全部司机",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_64 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_66 = __VLS_65({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
}
var __VLS_59;
var __VLS_55;
const __VLS_68 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "状态",
}));
const __VLS_70 = __VLS_69({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    modelValue: (__VLS_ctx.vehicleFilters.status),
    ...{ style: {} },
}));
const __VLS_74 = __VLS_73({
    modelValue: (__VLS_ctx.vehicleFilters.status),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
const __VLS_76 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "全部状态",
    value: (-1),
}));
const __VLS_78 = __VLS_77({
    label: "全部状态",
    value: (-1),
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
const __VLS_80 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "可用",
    value: (1),
}));
const __VLS_82 = __VLS_81({
    label: "可用",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
const __VLS_84 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "维修中",
    value: (0),
}));
const __VLS_86 = __VLS_85({
    label: "维修中",
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
var __VLS_75;
var __VLS_71;
const __VLS_88 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({}));
const __VLS_90 = __VLS_89({}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
const __VLS_92 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_94 = __VLS_93({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
let __VLS_96;
let __VLS_97;
let __VLS_98;
const __VLS_99 = {
    onClick: (__VLS_ctx.applyVehicleFilters)
};
__VLS_95.slots.default;
var __VLS_95;
const __VLS_100 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    ...{ 'onClick': {} },
}));
const __VLS_102 = __VLS_101({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
let __VLS_104;
let __VLS_105;
let __VLS_106;
const __VLS_107 = {
    onClick: (__VLS_ctx.resetVehicleFilters)
};
__VLS_103.slots.default;
var __VLS_103;
var __VLS_91;
var __VLS_27;
const __VLS_108 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    data: (__VLS_ctx.vehicles),
    ...{ class: "transport-table" },
    stripe: true,
}));
const __VLS_110 = __VLS_109({
    data: (__VLS_ctx.vehicles),
    ...{ class: "transport-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.vehicleLoading) }, null, null);
__VLS_111.slots.default;
const __VLS_112 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    label: "车辆",
    minWidth: "220",
}));
const __VLS_114 = __VLS_113({
    label: "车辆",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_115.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.plate_number));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.vehicle_type, '未设置车型'));
}
var __VLS_115;
const __VLS_116 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "司机",
    minWidth: "170",
}));
const __VLS_118 = __VLS_117({
    label: "司机",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_119.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.driver_name, '未分配'));
}
var __VLS_119;
const __VLS_120 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "载重",
    width: "120",
}));
const __VLS_122 = __VLS_121({
    label: "载重",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_123.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.capacity);
}
var __VLS_123;
const __VLS_124 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    label: "状态",
    width: "120",
}));
const __VLS_126 = __VLS_125({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_127.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_128 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
        type: (scope.row.status === 1 ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_130 = __VLS_129({
        type: (scope.row.status === 1 ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    (scope.row.status_name);
    var __VLS_131;
}
var __VLS_127;
const __VLS_132 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    prop: "create_time",
    label: "创建时间",
    minWidth: "170",
}));
const __VLS_134 = __VLS_133({
    prop: "create_time",
    label: "创建时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
const __VLS_136 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "操作",
    fixed: "right",
    width: "220",
}));
const __VLS_138 = __VLS_137({
    label: "操作",
    fixed: "right",
    width: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_139.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-actions" },
    });
    const __VLS_140 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_142 = __VLS_141({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    let __VLS_144;
    let __VLS_145;
    let __VLS_146;
    const __VLS_147 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openVehicleDialog(scope.row);
        }
    };
    __VLS_143.slots.default;
    var __VLS_143;
    const __VLS_148 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        ...{ 'onClick': {} },
        link: true,
        type: (scope.row.status === 1 ? 'warning' : 'success'),
    }));
    const __VLS_150 = __VLS_149({
        ...{ 'onClick': {} },
        link: true,
        type: (scope.row.status === 1 ? 'warning' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    let __VLS_152;
    let __VLS_153;
    let __VLS_154;
    const __VLS_155 = {
        onClick: (...[$event]) => {
            __VLS_ctx.toggleVehicleStatus(scope.row);
        }
    };
    __VLS_151.slots.default;
    (scope.row.status === 1 ? '维修中' : '设为可用');
    var __VLS_151;
}
var __VLS_139;
var __VLS_111;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-pagination" },
});
const __VLS_156 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.vehiclePagination.total),
    currentPage: (__VLS_ctx.vehiclePagination.page),
    pageSize: (__VLS_ctx.vehiclePagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_158 = __VLS_157({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.vehiclePagination.total),
    currentPage: (__VLS_ctx.vehiclePagination.page),
    pageSize: (__VLS_ctx.vehiclePagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
let __VLS_160;
let __VLS_161;
let __VLS_162;
const __VLS_163 = {
    onCurrentChange: (__VLS_ctx.handleVehiclePageChange)
};
const __VLS_164 = {
    onSizeChange: (__VLS_ctx.handleVehicleSizeChange)
};
var __VLS_159;
var __VLS_7;
const __VLS_165 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
    label: "任务中心",
    name: "tasks",
}));
const __VLS_167 = __VLS_166({
    label: "任务中心",
    name: "tasks",
}, ...__VLS_functionalComponentArgsRest(__VLS_166));
__VLS_168.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel transport-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar-actions" },
});
const __VLS_169 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
    ...{ 'onClick': {} },
}));
const __VLS_171 = __VLS_170({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
let __VLS_173;
let __VLS_174;
let __VLS_175;
const __VLS_176 = {
    onClick: (__VLS_ctx.refreshTransportOverview)
};
__VLS_172.slots.default;
var __VLS_172;
const __VLS_177 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_179 = __VLS_178({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
let __VLS_181;
let __VLS_182;
let __VLS_183;
const __VLS_184 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openTaskDialog();
    }
};
__VLS_180.slots.default;
var __VLS_180;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--task" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.transportStats.task_stats.pending_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.transportStats.task_stats.in_progress_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.transportStats.task_stats.completed_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.transportStats.task_stats.total_distance);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sub-panel" },
});
const __VLS_185 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.taskFilters),
    ...{ class: "transport-filters" },
}));
const __VLS_187 = __VLS_186({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.taskFilters),
    ...{ class: "transport-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_186));
let __VLS_189;
let __VLS_190;
let __VLS_191;
const __VLS_192 = {
    onSubmit: () => { }
};
__VLS_188.slots.default;
const __VLS_193 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
    label: "任务号",
}));
const __VLS_195 = __VLS_194({
    label: "任务号",
}, ...__VLS_functionalComponentArgsRest(__VLS_194));
__VLS_196.slots.default;
const __VLS_197 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.taskFilters.task_no),
    clearable: true,
    placeholder: "请输入任务编号",
}));
const __VLS_199 = __VLS_198({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.taskFilters.task_no),
    clearable: true,
    placeholder: "请输入任务编号",
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
let __VLS_201;
let __VLS_202;
let __VLS_203;
const __VLS_204 = {
    onKeyup: (__VLS_ctx.applyTaskFilters)
};
var __VLS_200;
var __VLS_196;
const __VLS_205 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
    label: "车辆",
}));
const __VLS_207 = __VLS_206({
    label: "车辆",
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
__VLS_208.slots.default;
const __VLS_209 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
    modelValue: (__VLS_ctx.taskFilters.vehicle_id),
    clearable: true,
    placeholder: "全部车辆",
    ...{ style: {} },
}));
const __VLS_211 = __VLS_210({
    modelValue: (__VLS_ctx.taskFilters.vehicle_id),
    clearable: true,
    placeholder: "全部车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
__VLS_212.slots.default;
const __VLS_213 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
    label: "全部车辆",
    value: (undefined),
}));
const __VLS_215 = __VLS_214({
    label: "全部车辆",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_217 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_219 = __VLS_218({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_218));
}
var __VLS_212;
var __VLS_208;
const __VLS_221 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    label: "司机",
}));
const __VLS_223 = __VLS_222({
    label: "司机",
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
__VLS_224.slots.default;
const __VLS_225 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    modelValue: (__VLS_ctx.taskFilters.driver_id),
    clearable: true,
    placeholder: "全部司机",
    ...{ style: {} },
}));
const __VLS_227 = __VLS_226({
    modelValue: (__VLS_ctx.taskFilters.driver_id),
    clearable: true,
    placeholder: "全部司机",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
__VLS_228.slots.default;
const __VLS_229 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    label: "全部司机",
    value: (undefined),
}));
const __VLS_231 = __VLS_230({
    label: "全部司机",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_233 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_235 = __VLS_234({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_234));
}
var __VLS_228;
var __VLS_224;
const __VLS_237 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    label: "状态",
}));
const __VLS_239 = __VLS_238({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
__VLS_240.slots.default;
const __VLS_241 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    modelValue: (__VLS_ctx.taskFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_243 = __VLS_242({
    modelValue: (__VLS_ctx.taskFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
__VLS_244.slots.default;
const __VLS_245 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_247 = __VLS_246({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.taskStatusOptions))) {
    const __VLS_249 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_251 = __VLS_250({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_250));
}
var __VLS_244;
var __VLS_240;
const __VLS_253 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({}));
const __VLS_255 = __VLS_254({}, ...__VLS_functionalComponentArgsRest(__VLS_254));
__VLS_256.slots.default;
const __VLS_257 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_259 = __VLS_258({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
let __VLS_261;
let __VLS_262;
let __VLS_263;
const __VLS_264 = {
    onClick: (__VLS_ctx.applyTaskFilters)
};
__VLS_260.slots.default;
var __VLS_260;
const __VLS_265 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
    ...{ 'onClick': {} },
}));
const __VLS_267 = __VLS_266({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
let __VLS_269;
let __VLS_270;
let __VLS_271;
const __VLS_272 = {
    onClick: (__VLS_ctx.resetTaskFilters)
};
__VLS_268.slots.default;
var __VLS_268;
var __VLS_256;
var __VLS_188;
const __VLS_273 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
    data: (__VLS_ctx.tasks),
    ...{ class: "transport-table" },
    stripe: true,
}));
const __VLS_275 = __VLS_274({
    data: (__VLS_ctx.tasks),
    ...{ class: "transport-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.taskLoading) }, null, null);
__VLS_276.slots.default;
const __VLS_277 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
    label: "任务",
    minWidth: "230",
}));
const __VLS_279 = __VLS_278({
    label: "任务",
    minWidth: "230",
}, ...__VLS_functionalComponentArgsRest(__VLS_278));
__VLS_280.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_280.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.task_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.start_point));
    (__VLS_ctx.normalizeText(scope.row.end_point));
}
var __VLS_280;
const __VLS_281 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    label: "车辆 / 司机",
    minWidth: "180",
}));
const __VLS_283 = __VLS_282({
    label: "车辆 / 司机",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
__VLS_284.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_284.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.plate_number));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.driver_name, '未知司机'));
}
var __VLS_284;
const __VLS_285 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
    label: "里程 / 成本",
    width: "160",
}));
const __VLS_287 = __VLS_286({
    label: "里程 / 成本",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
__VLS_288.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_288.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.distance);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatMoney(scope.row.cost));
}
var __VLS_288;
const __VLS_289 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
    label: "状态",
    width: "120",
}));
const __VLS_291 = __VLS_290({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_290));
__VLS_292.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_292.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_293 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
        type: (__VLS_ctx.taskStatusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_295 = __VLS_294({
        type: (__VLS_ctx.taskStatusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_294));
    __VLS_296.slots.default;
    (scope.row.status_name);
    var __VLS_296;
}
var __VLS_292;
const __VLS_297 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
    prop: "create_time",
    label: "创建时间",
    minWidth: "170",
}));
const __VLS_299 = __VLS_298({
    prop: "create_time",
    label: "创建时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
const __VLS_301 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
    label: "操作",
    fixed: "right",
    width: "280",
}));
const __VLS_303 = __VLS_302({
    label: "操作",
    fixed: "right",
    width: "280",
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
__VLS_304.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_304.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-actions" },
    });
    const __VLS_305 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_307 = __VLS_306({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_306));
    let __VLS_309;
    let __VLS_310;
    let __VLS_311;
    const __VLS_312 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openTaskDialog(scope.row);
        }
    };
    __VLS_308.slots.default;
    var __VLS_308;
    if (__VLS_ctx.nextTaskStatuses(scope.row.status).length) {
        const __VLS_313 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_315 = __VLS_314({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_314));
        let __VLS_317;
        let __VLS_318;
        let __VLS_319;
        const __VLS_320 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.nextTaskStatuses(scope.row.status).length))
                    return;
                __VLS_ctx.openTaskStatusDialog(scope.row);
            }
        };
        __VLS_316.slots.default;
        var __VLS_316;
    }
    const __VLS_321 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }));
    const __VLS_323 = __VLS_322({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }, ...__VLS_functionalComponentArgsRest(__VLS_322));
    let __VLS_325;
    let __VLS_326;
    let __VLS_327;
    const __VLS_328 = {
        onClick: (...[$event]) => {
            __VLS_ctx.prefillScan(scope.row, 'load');
        }
    };
    __VLS_324.slots.default;
    var __VLS_324;
    const __VLS_329 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }));
    const __VLS_331 = __VLS_330({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    let __VLS_333;
    let __VLS_334;
    let __VLS_335;
    const __VLS_336 = {
        onClick: (...[$event]) => {
            __VLS_ctx.prefillScan(scope.row, 'unload');
        }
    };
    __VLS_332.slots.default;
    var __VLS_332;
}
var __VLS_304;
var __VLS_276;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-pagination" },
});
const __VLS_337 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.taskPagination.total),
    currentPage: (__VLS_ctx.taskPagination.page),
    pageSize: (__VLS_ctx.taskPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_339 = __VLS_338({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.taskPagination.total),
    currentPage: (__VLS_ctx.taskPagination.page),
    pageSize: (__VLS_ctx.taskPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_338));
let __VLS_341;
let __VLS_342;
let __VLS_343;
const __VLS_344 = {
    onCurrentChange: (__VLS_ctx.handleTaskPageChange)
};
const __VLS_345 = {
    onSizeChange: (__VLS_ctx.handleTaskSizeChange)
};
var __VLS_340;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-side" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sub-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sub-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_346 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_347 = __VLS_asFunctionalComponent(__VLS_346, new __VLS_346({
    model: (__VLS_ctx.scanForm),
    labelPosition: "top",
}));
const __VLS_348 = __VLS_347({
    model: (__VLS_ctx.scanForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_347));
__VLS_349.slots.default;
const __VLS_350 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_351 = __VLS_asFunctionalComponent(__VLS_350, new __VLS_350({
    label: "任务号",
}));
const __VLS_352 = __VLS_351({
    label: "任务号",
}, ...__VLS_functionalComponentArgsRest(__VLS_351));
__VLS_353.slots.default;
const __VLS_354 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_355 = __VLS_asFunctionalComponent(__VLS_354, new __VLS_354({
    modelValue: (__VLS_ctx.scanForm.task_no),
    clearable: true,
    placeholder: "可选，优先锁定任务",
    ...{ style: {} },
}));
const __VLS_356 = __VLS_355({
    modelValue: (__VLS_ctx.scanForm.task_no),
    clearable: true,
    placeholder: "可选，优先锁定任务",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_355));
__VLS_357.slots.default;
const __VLS_358 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_359 = __VLS_asFunctionalComponent(__VLS_358, new __VLS_358({
    label: "自动识别任务",
    value: "",
}));
const __VLS_360 = __VLS_359({
    label: "自动识别任务",
    value: "",
}, ...__VLS_functionalComponentArgsRest(__VLS_359));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.taskOptionsForScan))) {
    const __VLS_362 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_363 = __VLS_asFunctionalComponent(__VLS_362, new __VLS_362({
        key: (item.id),
        label: (item.task_no),
        value: (item.task_no),
    }));
    const __VLS_364 = __VLS_363({
        key: (item.id),
        label: (item.task_no),
        value: (item.task_no),
    }, ...__VLS_functionalComponentArgsRest(__VLS_363));
}
var __VLS_357;
var __VLS_353;
const __VLS_366 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
    label: "扫描类型",
}));
const __VLS_368 = __VLS_367({
    label: "扫描类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_367));
__VLS_369.slots.default;
const __VLS_370 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_371 = __VLS_asFunctionalComponent(__VLS_370, new __VLS_370({
    modelValue: (__VLS_ctx.scanForm.scan_type),
}));
const __VLS_372 = __VLS_371({
    modelValue: (__VLS_ctx.scanForm.scan_type),
}, ...__VLS_functionalComponentArgsRest(__VLS_371));
__VLS_373.slots.default;
const __VLS_374 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_375 = __VLS_asFunctionalComponent(__VLS_374, new __VLS_374({
    label: "load",
}));
const __VLS_376 = __VLS_375({
    label: "load",
}, ...__VLS_functionalComponentArgsRest(__VLS_375));
__VLS_377.slots.default;
var __VLS_377;
const __VLS_378 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_379 = __VLS_asFunctionalComponent(__VLS_378, new __VLS_378({
    label: "unload",
}));
const __VLS_380 = __VLS_379({
    label: "unload",
}, ...__VLS_functionalComponentArgsRest(__VLS_379));
__VLS_381.slots.default;
var __VLS_381;
var __VLS_373;
var __VLS_369;
const __VLS_382 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_383 = __VLS_asFunctionalComponent(__VLS_382, new __VLS_382({
    label: "扫描码",
}));
const __VLS_384 = __VLS_383({
    label: "扫描码",
}, ...__VLS_functionalComponentArgsRest(__VLS_383));
__VLS_385.slots.default;
const __VLS_386 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_387 = __VLS_asFunctionalComponent(__VLS_386, new __VLS_386({
    modelValue: (__VLS_ctx.scanForm.scan_code),
    placeholder: "请输入任务号、订单号或包裹号",
}));
const __VLS_388 = __VLS_387({
    modelValue: (__VLS_ctx.scanForm.scan_code),
    placeholder: "请输入任务号、订单号或包裹号",
}, ...__VLS_functionalComponentArgsRest(__VLS_387));
var __VLS_385;
const __VLS_390 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_391 = __VLS_asFunctionalComponent(__VLS_390, new __VLS_390({
    label: "站点",
}));
const __VLS_392 = __VLS_391({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_391));
__VLS_393.slots.default;
const __VLS_394 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_395 = __VLS_asFunctionalComponent(__VLS_394, new __VLS_394({
    modelValue: (__VLS_ctx.scanForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_396 = __VLS_395({
    modelValue: (__VLS_ctx.scanForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_395));
__VLS_397.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_398 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_399 = __VLS_asFunctionalComponent(__VLS_398, new __VLS_398({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_400 = __VLS_399({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_399));
}
var __VLS_397;
var __VLS_393;
const __VLS_402 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_403 = __VLS_asFunctionalComponent(__VLS_402, new __VLS_402({
    label: "备注",
}));
const __VLS_404 = __VLS_403({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_403));
__VLS_405.slots.default;
const __VLS_406 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_407 = __VLS_asFunctionalComponent(__VLS_406, new __VLS_406({
    modelValue: (__VLS_ctx.scanForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写扫描备注",
}));
const __VLS_408 = __VLS_407({
    modelValue: (__VLS_ctx.scanForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写扫描备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_407));
var __VLS_405;
const __VLS_410 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_411 = __VLS_asFunctionalComponent(__VLS_410, new __VLS_410({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.scanSubmitting),
}));
const __VLS_412 = __VLS_411({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.scanSubmitting),
}, ...__VLS_functionalComponentArgsRest(__VLS_411));
let __VLS_414;
let __VLS_415;
let __VLS_416;
const __VLS_417 = {
    onClick: (__VLS_ctx.submitScan)
};
__VLS_413.slots.default;
var __VLS_413;
var __VLS_349;
if (__VLS_ctx.scanResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "scan-result" },
    });
    const __VLS_418 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_419 = __VLS_asFunctionalComponent(__VLS_418, new __VLS_418({
        type: (__VLS_ctx.scanForm.scan_type === 'load' ? 'success' : 'info'),
        effect: "dark",
    }));
    const __VLS_420 = __VLS_419({
        type: (__VLS_ctx.scanForm.scan_type === 'load' ? 'success' : 'info'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_419));
    __VLS_421.slots.default;
    (__VLS_ctx.scanResult.scan_type === 'load' ? '装车完成' : '卸车完成');
    var __VLS_421;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.scanResult.message);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.scanResult.task_no);
    (__VLS_ctx.scanResult.order_no);
    (__VLS_ctx.scanResult.parcel_no || '整单');
    (__VLS_ctx.normalizeText(__VLS_ctx.scanResult.station_name));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sub-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sub-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topDrivers))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.driver_id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(item.driver_name, '未知司机'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.task_count);
    (__VLS_ctx.formatMoney(item.cost));
}
var __VLS_168;
const __VLS_422 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_423 = __VLS_asFunctionalComponent(__VLS_422, new __VLS_422({
    label: "装卸记录",
    name: "records",
}));
const __VLS_424 = __VLS_423({
    label: "装卸记录",
    name: "records",
}, ...__VLS_functionalComponentArgsRest(__VLS_423));
__VLS_425.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel transport-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_426 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_427 = __VLS_asFunctionalComponent(__VLS_426, new __VLS_426({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.recordFilters),
    ...{ class: "transport-filters" },
}));
const __VLS_428 = __VLS_427({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.recordFilters),
    ...{ class: "transport-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_427));
let __VLS_430;
let __VLS_431;
let __VLS_432;
const __VLS_433 = {
    onSubmit: () => { }
};
__VLS_429.slots.default;
const __VLS_434 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
    label: "任务号",
}));
const __VLS_436 = __VLS_435({
    label: "任务号",
}, ...__VLS_functionalComponentArgsRest(__VLS_435));
__VLS_437.slots.default;
const __VLS_438 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.recordFilters.task_no),
    clearable: true,
    placeholder: "请输入任务号",
}));
const __VLS_440 = __VLS_439({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.recordFilters.task_no),
    clearable: true,
    placeholder: "请输入任务号",
}, ...__VLS_functionalComponentArgsRest(__VLS_439));
let __VLS_442;
let __VLS_443;
let __VLS_444;
const __VLS_445 = {
    onKeyup: (__VLS_ctx.applyRecordFilters)
};
var __VLS_441;
var __VLS_437;
const __VLS_446 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_447 = __VLS_asFunctionalComponent(__VLS_446, new __VLS_446({
    label: "订单号",
}));
const __VLS_448 = __VLS_447({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_447));
__VLS_449.slots.default;
const __VLS_450 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
    modelValue: (__VLS_ctx.recordFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_452 = __VLS_451({
    modelValue: (__VLS_ctx.recordFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_451));
var __VLS_449;
const __VLS_454 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_455 = __VLS_asFunctionalComponent(__VLS_454, new __VLS_454({
    label: "站点",
}));
const __VLS_456 = __VLS_455({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_455));
__VLS_457.slots.default;
const __VLS_458 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
    modelValue: (__VLS_ctx.recordFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_460 = __VLS_459({
    modelValue: (__VLS_ctx.recordFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_459));
__VLS_461.slots.default;
const __VLS_462 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_463 = __VLS_asFunctionalComponent(__VLS_462, new __VLS_462({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_464 = __VLS_463({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_463));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_466 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_468 = __VLS_467({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_467));
}
var __VLS_461;
var __VLS_457;
const __VLS_470 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_471 = __VLS_asFunctionalComponent(__VLS_470, new __VLS_470({
    label: "扫描类型",
}));
const __VLS_472 = __VLS_471({
    label: "扫描类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_471));
__VLS_473.slots.default;
const __VLS_474 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_475 = __VLS_asFunctionalComponent(__VLS_474, new __VLS_474({
    modelValue: (__VLS_ctx.recordFilters.scan_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_476 = __VLS_475({
    modelValue: (__VLS_ctx.recordFilters.scan_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_475));
__VLS_477.slots.default;
const __VLS_478 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_479 = __VLS_asFunctionalComponent(__VLS_478, new __VLS_478({
    label: "全部类型",
    value: (undefined),
}));
const __VLS_480 = __VLS_479({
    label: "全部类型",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_479));
const __VLS_482 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
    label: "装车",
    value: "load",
}));
const __VLS_484 = __VLS_483({
    label: "装车",
    value: "load",
}, ...__VLS_functionalComponentArgsRest(__VLS_483));
const __VLS_486 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_487 = __VLS_asFunctionalComponent(__VLS_486, new __VLS_486({
    label: "卸车",
    value: "unload",
}));
const __VLS_488 = __VLS_487({
    label: "卸车",
    value: "unload",
}, ...__VLS_functionalComponentArgsRest(__VLS_487));
var __VLS_477;
var __VLS_473;
const __VLS_490 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_491 = __VLS_asFunctionalComponent(__VLS_490, new __VLS_490({}));
const __VLS_492 = __VLS_491({}, ...__VLS_functionalComponentArgsRest(__VLS_491));
__VLS_493.slots.default;
const __VLS_494 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_495 = __VLS_asFunctionalComponent(__VLS_494, new __VLS_494({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_496 = __VLS_495({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_495));
let __VLS_498;
let __VLS_499;
let __VLS_500;
const __VLS_501 = {
    onClick: (__VLS_ctx.applyRecordFilters)
};
__VLS_497.slots.default;
var __VLS_497;
const __VLS_502 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_503 = __VLS_asFunctionalComponent(__VLS_502, new __VLS_502({
    ...{ 'onClick': {} },
}));
const __VLS_504 = __VLS_503({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_503));
let __VLS_506;
let __VLS_507;
let __VLS_508;
const __VLS_509 = {
    onClick: (__VLS_ctx.resetRecordFilters)
};
__VLS_505.slots.default;
var __VLS_505;
var __VLS_493;
var __VLS_429;
const __VLS_510 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_511 = __VLS_asFunctionalComponent(__VLS_510, new __VLS_510({
    data: (__VLS_ctx.records),
    ...{ class: "transport-table" },
    stripe: true,
}));
const __VLS_512 = __VLS_511({
    data: (__VLS_ctx.records),
    ...{ class: "transport-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_511));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.recordLoading) }, null, null);
__VLS_513.slots.default;
const __VLS_514 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_515 = __VLS_asFunctionalComponent(__VLS_514, new __VLS_514({
    label: "记录",
    minWidth: "240",
}));
const __VLS_516 = __VLS_515({
    label: "记录",
    minWidth: "240",
}, ...__VLS_functionalComponentArgsRest(__VLS_515));
__VLS_517.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_517.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.task_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.station_name));
    (scope.row.scan_type_name);
}
var __VLS_517;
const __VLS_518 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_519 = __VLS_asFunctionalComponent(__VLS_518, new __VLS_518({
    label: "车辆 / 司机",
    minWidth: "180",
}));
const __VLS_520 = __VLS_519({
    label: "车辆 / 司机",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_519));
__VLS_521.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_521.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.plate_number));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.driver_name, '未知司机'));
}
var __VLS_521;
const __VLS_522 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_523 = __VLS_asFunctionalComponent(__VLS_522, new __VLS_522({
    label: "状态",
    width: "120",
}));
const __VLS_524 = __VLS_523({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_523));
__VLS_525.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_525.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_526 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_527 = __VLS_asFunctionalComponent(__VLS_526, new __VLS_526({
        type: (scope.row.scan_type === 'load' ? 'success' : 'info'),
        effect: "plain",
    }));
    const __VLS_528 = __VLS_527({
        type: (scope.row.scan_type === 'load' ? 'success' : 'info'),
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_527));
    __VLS_529.slots.default;
    (scope.row.record_status);
    var __VLS_529;
}
var __VLS_525;
const __VLS_530 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_531 = __VLS_asFunctionalComponent(__VLS_530, new __VLS_530({
    label: "扫描时间",
    minWidth: "170",
}));
const __VLS_532 = __VLS_531({
    label: "扫描时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_531));
__VLS_533.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_533.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.create_time);
}
var __VLS_533;
const __VLS_534 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_535 = __VLS_asFunctionalComponent(__VLS_534, new __VLS_534({
    prop: "remark",
    label: "备注",
    minWidth: "180",
}));
const __VLS_536 = __VLS_535({
    prop: "remark",
    label: "备注",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_535));
var __VLS_513;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-pagination" },
});
const __VLS_538 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_539 = __VLS_asFunctionalComponent(__VLS_538, new __VLS_538({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.recordPagination.total),
    currentPage: (__VLS_ctx.recordPagination.page),
    pageSize: (__VLS_ctx.recordPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_540 = __VLS_539({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.recordPagination.total),
    currentPage: (__VLS_ctx.recordPagination.page),
    pageSize: (__VLS_ctx.recordPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_539));
let __VLS_542;
let __VLS_543;
let __VLS_544;
const __VLS_545 = {
    onCurrentChange: (__VLS_ctx.handleRecordPageChange)
};
const __VLS_546 = {
    onSizeChange: (__VLS_ctx.handleRecordSizeChange)
};
var __VLS_541;
var __VLS_425;
const __VLS_547 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_548 = __VLS_asFunctionalComponent(__VLS_547, new __VLS_547({
    label: "监控与成本",
    name: "monitor",
}));
const __VLS_549 = __VLS_548({
    label: "监控与成本",
    name: "monitor",
}, ...__VLS_functionalComponentArgsRest(__VLS_548));
__VLS_550.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-layout transport-layout--monitor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel transport-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-panel__toolbar-actions" },
});
const __VLS_551 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_552 = __VLS_asFunctionalComponent(__VLS_551, new __VLS_551({
    modelValue: (__VLS_ctx.monitorFilter),
    ...{ style: {} },
}));
const __VLS_553 = __VLS_552({
    modelValue: (__VLS_ctx.monitorFilter),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_552));
__VLS_554.slots.default;
const __VLS_555 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_556 = __VLS_asFunctionalComponent(__VLS_555, new __VLS_555({
    label: "全部预警",
    value: "all",
}));
const __VLS_557 = __VLS_556({
    label: "全部预警",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_556));
const __VLS_559 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_560 = __VLS_asFunctionalComponent(__VLS_559, new __VLS_559({
    label: "仅警告",
    value: "warning",
}));
const __VLS_561 = __VLS_560({
    label: "仅警告",
    value: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_560));
const __VLS_563 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_564 = __VLS_asFunctionalComponent(__VLS_563, new __VLS_563({
    label: "仅严重",
    value: "critical",
}));
const __VLS_565 = __VLS_564({
    label: "仅严重",
    value: "critical",
}, ...__VLS_functionalComponentArgsRest(__VLS_564));
var __VLS_554;
const __VLS_567 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_568 = __VLS_asFunctionalComponent(__VLS_567, new __VLS_567({
    ...{ 'onClick': {} },
}));
const __VLS_569 = __VLS_568({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_568));
let __VLS_571;
let __VLS_572;
let __VLS_573;
const __VLS_574 = {
    onClick: (__VLS_ctx.refreshTransportOverview)
};
__VLS_570.slots.default;
var __VLS_570;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--monitor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.monitorOverview.in_progress_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.monitorOverview.warning_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.monitorOverview.critical_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatPercent(__VLS_ctx.monitorOverview.avg_progress));
const __VLS_575 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_576 = __VLS_asFunctionalComponent(__VLS_575, new __VLS_575({
    data: (__VLS_ctx.filteredMonitorTasks),
    ...{ class: "transport-table" },
    stripe: true,
}));
const __VLS_577 = __VLS_576({
    data: (__VLS_ctx.filteredMonitorTasks),
    ...{ class: "transport-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_576));
__VLS_578.slots.default;
const __VLS_579 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_580 = __VLS_asFunctionalComponent(__VLS_579, new __VLS_579({
    label: "任务",
    minWidth: "220",
}));
const __VLS_581 = __VLS_580({
    label: "任务",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_580));
__VLS_582.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_582.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.task_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.plate_number));
    (__VLS_ctx.normalizeText(scope.row.driver_name, '未知司机'));
}
var __VLS_582;
const __VLS_583 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_584 = __VLS_asFunctionalComponent(__VLS_583, new __VLS_583({
    label: "进度",
    width: "180",
}));
const __VLS_585 = __VLS_584({
    label: "进度",
    width: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_584));
__VLS_586.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_586.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_587 = {}.ElProgress;
    /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
    // @ts-ignore
    const __VLS_588 = __VLS_asFunctionalComponent(__VLS_587, new __VLS_587({
        percentage: (__VLS_ctx.safePercentage(scope.row.progress)),
        strokeWidth: (8),
    }));
    const __VLS_589 = __VLS_588({
        percentage: (__VLS_ctx.safePercentage(scope.row.progress)),
        strokeWidth: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_588));
}
var __VLS_586;
const __VLS_591 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_592 = __VLS_asFunctionalComponent(__VLS_591, new __VLS_591({
    label: "最新扫描",
    minWidth: "180",
}));
const __VLS_593 = __VLS_592({
    label: "最新扫描",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_592));
__VLS_594.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_594.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.latest_scan_type_name, '暂无'));
    (__VLS_ctx.normalizeText(scope.row.latest_station_name, '-'));
}
var __VLS_594;
const __VLS_595 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_596 = __VLS_asFunctionalComponent(__VLS_595, new __VLS_595({
    label: "预警",
    minWidth: "220",
}));
const __VLS_597 = __VLS_596({
    label: "预警",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_596));
__VLS_598.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_598.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "transport-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.warningLabel(scope.row.warning_level));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.warning_message, '正常'));
}
var __VLS_598;
var __VLS_578;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-side" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sub-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sub-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "side-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredWarnings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (`${item.task_id}-${item.warning_type}`),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.warning_type_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.task_no);
    (__VLS_ctx.normalizeText(item.warning_message, '正常'));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sub-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sub-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--cost" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.costOverview.total_cost));
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.costOverview.high_cost_tasks);
const __VLS_599 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_600 = __VLS_asFunctionalComponent(__VLS_599, new __VLS_599({
    data: (__VLS_ctx.costTasks),
    size: "small",
    stripe: true,
}));
const __VLS_601 = __VLS_600({
    data: (__VLS_ctx.costTasks),
    size: "small",
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_600));
__VLS_602.slots.default;
const __VLS_603 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_604 = __VLS_asFunctionalComponent(__VLS_603, new __VLS_603({
    label: "任务",
    minWidth: "150",
}));
const __VLS_605 = __VLS_604({
    label: "任务",
    minWidth: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_604));
__VLS_606.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_606.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.task_no);
}
var __VLS_606;
const __VLS_607 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_608 = __VLS_asFunctionalComponent(__VLS_607, new __VLS_607({
    label: "成本",
    width: "120",
}));
const __VLS_609 = __VLS_608({
    label: "成本",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_608));
__VLS_610.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_610.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatMoney(scope.row.cost));
}
var __VLS_610;
const __VLS_611 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_612 = __VLS_asFunctionalComponent(__VLS_611, new __VLS_611({
    label: "单公里",
    width: "120",
}));
const __VLS_613 = __VLS_612({
    label: "单公里",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_612));
__VLS_614.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_614.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.cost_per_km.toFixed(2));
}
var __VLS_614;
var __VLS_602;
var __VLS_550;
var __VLS_3;
const __VLS_615 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_616 = __VLS_asFunctionalComponent(__VLS_615, new __VLS_615({
    modelValue: (__VLS_ctx.vehicleDialogVisible),
    title: (__VLS_ctx.vehicleDialogMode === 'create' ? '新建车辆' : '编辑车辆'),
    width: "620px",
}));
const __VLS_617 = __VLS_616({
    modelValue: (__VLS_ctx.vehicleDialogVisible),
    title: (__VLS_ctx.vehicleDialogMode === 'create' ? '新建车辆' : '编辑车辆'),
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_616));
__VLS_618.slots.default;
const __VLS_619 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_620 = __VLS_asFunctionalComponent(__VLS_619, new __VLS_619({
    ref: "vehicleFormRef",
    model: (__VLS_ctx.vehicleForm),
    rules: (__VLS_ctx.vehicleRules),
    labelPosition: "top",
}));
const __VLS_621 = __VLS_620({
    ref: "vehicleFormRef",
    model: (__VLS_ctx.vehicleForm),
    rules: (__VLS_ctx.vehicleRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_620));
/** @type {typeof __VLS_ctx.vehicleFormRef} */ ;
var __VLS_623 = {};
__VLS_622.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-form-grid" },
});
const __VLS_625 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_626 = __VLS_asFunctionalComponent(__VLS_625, new __VLS_625({
    label: "车牌号",
    prop: "plate_number",
}));
const __VLS_627 = __VLS_626({
    label: "车牌号",
    prop: "plate_number",
}, ...__VLS_functionalComponentArgsRest(__VLS_626));
__VLS_628.slots.default;
const __VLS_629 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_630 = __VLS_asFunctionalComponent(__VLS_629, new __VLS_629({
    modelValue: (__VLS_ctx.vehicleForm.plate_number),
    placeholder: "请输入车牌号",
}));
const __VLS_631 = __VLS_630({
    modelValue: (__VLS_ctx.vehicleForm.plate_number),
    placeholder: "请输入车牌号",
}, ...__VLS_functionalComponentArgsRest(__VLS_630));
var __VLS_628;
const __VLS_633 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_634 = __VLS_asFunctionalComponent(__VLS_633, new __VLS_633({
    label: "车辆类型",
}));
const __VLS_635 = __VLS_634({
    label: "车辆类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_634));
__VLS_636.slots.default;
const __VLS_637 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_638 = __VLS_asFunctionalComponent(__VLS_637, new __VLS_637({
    modelValue: (__VLS_ctx.vehicleForm.vehicle_type),
    placeholder: "如：厢式货车",
}));
const __VLS_639 = __VLS_638({
    modelValue: (__VLS_ctx.vehicleForm.vehicle_type),
    placeholder: "如：厢式货车",
}, ...__VLS_functionalComponentArgsRest(__VLS_638));
var __VLS_636;
const __VLS_641 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_642 = __VLS_asFunctionalComponent(__VLS_641, new __VLS_641({
    label: "载重(吨)",
}));
const __VLS_643 = __VLS_642({
    label: "载重(吨)",
}, ...__VLS_functionalComponentArgsRest(__VLS_642));
__VLS_644.slots.default;
const __VLS_645 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_646 = __VLS_asFunctionalComponent(__VLS_645, new __VLS_645({
    modelValue: (__VLS_ctx.vehicleForm.capacity),
    min: (0),
    step: (0.5),
    precision: (1),
    ...{ style: {} },
}));
const __VLS_647 = __VLS_646({
    modelValue: (__VLS_ctx.vehicleForm.capacity),
    min: (0),
    step: (0.5),
    precision: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_646));
var __VLS_644;
const __VLS_649 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_650 = __VLS_asFunctionalComponent(__VLS_649, new __VLS_649({
    label: "司机",
}));
const __VLS_651 = __VLS_650({
    label: "司机",
}, ...__VLS_functionalComponentArgsRest(__VLS_650));
__VLS_652.slots.default;
const __VLS_653 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_654 = __VLS_asFunctionalComponent(__VLS_653, new __VLS_653({
    modelValue: (__VLS_ctx.vehicleForm.driver_id),
    clearable: true,
    placeholder: "可选，未分配",
    ...{ style: {} },
}));
const __VLS_655 = __VLS_654({
    modelValue: (__VLS_ctx.vehicleForm.driver_id),
    clearable: true,
    placeholder: "可选，未分配",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_654));
__VLS_656.slots.default;
const __VLS_657 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_658 = __VLS_asFunctionalComponent(__VLS_657, new __VLS_657({
    label: "未分配",
    value: (undefined),
}));
const __VLS_659 = __VLS_658({
    label: "未分配",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_658));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_661 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_662 = __VLS_asFunctionalComponent(__VLS_661, new __VLS_661({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_663 = __VLS_662({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_662));
}
var __VLS_656;
var __VLS_652;
var __VLS_622;
{
    const { footer: __VLS_thisSlot } = __VLS_618.slots;
    const __VLS_665 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_666 = __VLS_asFunctionalComponent(__VLS_665, new __VLS_665({
        ...{ 'onClick': {} },
    }));
    const __VLS_667 = __VLS_666({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_666));
    let __VLS_669;
    let __VLS_670;
    let __VLS_671;
    const __VLS_672 = {
        onClick: (...[$event]) => {
            __VLS_ctx.vehicleDialogVisible = false;
        }
    };
    __VLS_668.slots.default;
    var __VLS_668;
    const __VLS_673 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_674 = __VLS_asFunctionalComponent(__VLS_673, new __VLS_673({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.vehicleSubmitting),
    }));
    const __VLS_675 = __VLS_674({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.vehicleSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_674));
    let __VLS_677;
    let __VLS_678;
    let __VLS_679;
    const __VLS_680 = {
        onClick: (__VLS_ctx.submitVehicleDialog)
    };
    __VLS_676.slots.default;
    var __VLS_676;
}
var __VLS_618;
const __VLS_681 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_682 = __VLS_asFunctionalComponent(__VLS_681, new __VLS_681({
    modelValue: (__VLS_ctx.taskDialogVisible),
    title: (__VLS_ctx.taskDialogMode === 'create' ? '创建运输任务' : '编辑运输任务'),
    width: "760px",
}));
const __VLS_683 = __VLS_682({
    modelValue: (__VLS_ctx.taskDialogVisible),
    title: (__VLS_ctx.taskDialogMode === 'create' ? '创建运输任务' : '编辑运输任务'),
    width: "760px",
}, ...__VLS_functionalComponentArgsRest(__VLS_682));
__VLS_684.slots.default;
const __VLS_685 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_686 = __VLS_asFunctionalComponent(__VLS_685, new __VLS_685({
    ref: "taskFormRef",
    model: (__VLS_ctx.taskForm),
    rules: (__VLS_ctx.taskRules),
    labelPosition: "top",
}));
const __VLS_687 = __VLS_686({
    ref: "taskFormRef",
    model: (__VLS_ctx.taskForm),
    rules: (__VLS_ctx.taskRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_686));
/** @type {typeof __VLS_ctx.taskFormRef} */ ;
var __VLS_689 = {};
__VLS_688.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "transport-form-grid" },
});
const __VLS_691 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_692 = __VLS_asFunctionalComponent(__VLS_691, new __VLS_691({
    label: "订单",
    prop: "order_id",
}));
const __VLS_693 = __VLS_692({
    label: "订单",
    prop: "order_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_692));
__VLS_694.slots.default;
const __VLS_695 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_696 = __VLS_asFunctionalComponent(__VLS_695, new __VLS_695({
    modelValue: (__VLS_ctx.taskForm.order_id),
    placeholder: "请选择订单",
    ...{ style: {} },
}));
const __VLS_697 = __VLS_696({
    modelValue: (__VLS_ctx.taskForm.order_id),
    placeholder: "请选择订单",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_696));
__VLS_698.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderOptions))) {
    const __VLS_699 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_700 = __VLS_asFunctionalComponent(__VLS_699, new __VLS_699({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }));
    const __VLS_701 = __VLS_700({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_700));
}
var __VLS_698;
var __VLS_694;
const __VLS_703 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_704 = __VLS_asFunctionalComponent(__VLS_703, new __VLS_703({
    label: "车辆",
    prop: "vehicle_id",
}));
const __VLS_705 = __VLS_704({
    label: "车辆",
    prop: "vehicle_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_704));
__VLS_706.slots.default;
const __VLS_707 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_708 = __VLS_asFunctionalComponent(__VLS_707, new __VLS_707({
    modelValue: (__VLS_ctx.taskForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}));
const __VLS_709 = __VLS_708({
    modelValue: (__VLS_ctx.taskForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_708));
__VLS_710.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_711 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_712 = __VLS_asFunctionalComponent(__VLS_711, new __VLS_711({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_713 = __VLS_712({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_712));
}
var __VLS_710;
var __VLS_706;
const __VLS_715 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_716 = __VLS_asFunctionalComponent(__VLS_715, new __VLS_715({
    label: "司机",
    prop: "driver_id",
}));
const __VLS_717 = __VLS_716({
    label: "司机",
    prop: "driver_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_716));
__VLS_718.slots.default;
const __VLS_719 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_720 = __VLS_asFunctionalComponent(__VLS_719, new __VLS_719({
    modelValue: (__VLS_ctx.taskForm.driver_id),
    placeholder: "请选择司机",
    ...{ style: {} },
}));
const __VLS_721 = __VLS_720({
    modelValue: (__VLS_ctx.taskForm.driver_id),
    placeholder: "请选择司机",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_720));
__VLS_722.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_723 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_724 = __VLS_asFunctionalComponent(__VLS_723, new __VLS_723({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_725 = __VLS_724({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_724));
}
var __VLS_722;
var __VLS_718;
const __VLS_727 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_728 = __VLS_asFunctionalComponent(__VLS_727, new __VLS_727({
    label: "起点",
    prop: "start_point",
}));
const __VLS_729 = __VLS_728({
    label: "起点",
    prop: "start_point",
}, ...__VLS_functionalComponentArgsRest(__VLS_728));
__VLS_730.slots.default;
const __VLS_731 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_732 = __VLS_asFunctionalComponent(__VLS_731, new __VLS_731({
    modelValue: (__VLS_ctx.taskForm.start_point),
    placeholder: "请输入起点",
}));
const __VLS_733 = __VLS_732({
    modelValue: (__VLS_ctx.taskForm.start_point),
    placeholder: "请输入起点",
}, ...__VLS_functionalComponentArgsRest(__VLS_732));
var __VLS_730;
const __VLS_735 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_736 = __VLS_asFunctionalComponent(__VLS_735, new __VLS_735({
    label: "终点",
    prop: "end_point",
}));
const __VLS_737 = __VLS_736({
    label: "终点",
    prop: "end_point",
}, ...__VLS_functionalComponentArgsRest(__VLS_736));
__VLS_738.slots.default;
const __VLS_739 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_740 = __VLS_asFunctionalComponent(__VLS_739, new __VLS_739({
    modelValue: (__VLS_ctx.taskForm.end_point),
    placeholder: "请输入终点",
}));
const __VLS_741 = __VLS_740({
    modelValue: (__VLS_ctx.taskForm.end_point),
    placeholder: "请输入终点",
}, ...__VLS_functionalComponentArgsRest(__VLS_740));
var __VLS_738;
const __VLS_743 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_744 = __VLS_asFunctionalComponent(__VLS_743, new __VLS_743({
    label: "里程(km)",
}));
const __VLS_745 = __VLS_744({
    label: "里程(km)",
}, ...__VLS_functionalComponentArgsRest(__VLS_744));
__VLS_746.slots.default;
const __VLS_747 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_748 = __VLS_asFunctionalComponent(__VLS_747, new __VLS_747({
    modelValue: (__VLS_ctx.taskForm.distance),
    min: (0),
    step: (1),
    precision: (1),
    ...{ style: {} },
}));
const __VLS_749 = __VLS_748({
    modelValue: (__VLS_ctx.taskForm.distance),
    min: (0),
    step: (1),
    precision: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_748));
var __VLS_746;
const __VLS_751 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_752 = __VLS_asFunctionalComponent(__VLS_751, new __VLS_751({
    label: "成本",
}));
const __VLS_753 = __VLS_752({
    label: "成本",
}, ...__VLS_functionalComponentArgsRest(__VLS_752));
__VLS_754.slots.default;
const __VLS_755 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_756 = __VLS_asFunctionalComponent(__VLS_755, new __VLS_755({
    modelValue: (__VLS_ctx.taskForm.cost),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_757 = __VLS_756({
    modelValue: (__VLS_ctx.taskForm.cost),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_756));
var __VLS_754;
const __VLS_759 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_760 = __VLS_asFunctionalComponent(__VLS_759, new __VLS_759({
    label: "备注",
    ...{ class: "transport-form-grid__wide" },
}));
const __VLS_761 = __VLS_760({
    label: "备注",
    ...{ class: "transport-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_760));
__VLS_762.slots.default;
const __VLS_763 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_764 = __VLS_asFunctionalComponent(__VLS_763, new __VLS_763({
    modelValue: (__VLS_ctx.taskForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入任务备注",
}));
const __VLS_765 = __VLS_764({
    modelValue: (__VLS_ctx.taskForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入任务备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_764));
var __VLS_762;
var __VLS_688;
{
    const { footer: __VLS_thisSlot } = __VLS_684.slots;
    const __VLS_767 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_768 = __VLS_asFunctionalComponent(__VLS_767, new __VLS_767({
        ...{ 'onClick': {} },
    }));
    const __VLS_769 = __VLS_768({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_768));
    let __VLS_771;
    let __VLS_772;
    let __VLS_773;
    const __VLS_774 = {
        onClick: (...[$event]) => {
            __VLS_ctx.taskDialogVisible = false;
        }
    };
    __VLS_770.slots.default;
    var __VLS_770;
    const __VLS_775 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_776 = __VLS_asFunctionalComponent(__VLS_775, new __VLS_775({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskSubmitting),
    }));
    const __VLS_777 = __VLS_776({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_776));
    let __VLS_779;
    let __VLS_780;
    let __VLS_781;
    const __VLS_782 = {
        onClick: (__VLS_ctx.submitTaskDialog)
    };
    __VLS_778.slots.default;
    var __VLS_778;
}
var __VLS_684;
const __VLS_783 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_784 = __VLS_asFunctionalComponent(__VLS_783, new __VLS_783({
    modelValue: (__VLS_ctx.taskStatusDialogVisible),
    title: "更新任务状态",
    width: "460px",
}));
const __VLS_785 = __VLS_784({
    modelValue: (__VLS_ctx.taskStatusDialogVisible),
    title: "更新任务状态",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_784));
__VLS_786.slots.default;
const __VLS_787 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_788 = __VLS_asFunctionalComponent(__VLS_787, new __VLS_787({
    labelPosition: "top",
}));
const __VLS_789 = __VLS_788({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_788));
__VLS_790.slots.default;
const __VLS_791 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_792 = __VLS_asFunctionalComponent(__VLS_791, new __VLS_791({
    label: "目标状态",
}));
const __VLS_793 = __VLS_792({
    label: "目标状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_792));
__VLS_794.slots.default;
const __VLS_795 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_796 = __VLS_asFunctionalComponent(__VLS_795, new __VLS_795({
    modelValue: (__VLS_ctx.taskStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}));
const __VLS_797 = __VLS_796({
    modelValue: (__VLS_ctx.taskStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_796));
__VLS_798.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.currentTaskStatusOptions))) {
    const __VLS_799 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_800 = __VLS_asFunctionalComponent(__VLS_799, new __VLS_799({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_801 = __VLS_800({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_800));
}
var __VLS_798;
var __VLS_794;
const __VLS_803 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_804 = __VLS_asFunctionalComponent(__VLS_803, new __VLS_803({
    label: "备注",
}));
const __VLS_805 = __VLS_804({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_804));
__VLS_806.slots.default;
const __VLS_807 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_808 = __VLS_asFunctionalComponent(__VLS_807, new __VLS_807({
    modelValue: (__VLS_ctx.taskStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态流转备注",
}));
const __VLS_809 = __VLS_808({
    modelValue: (__VLS_ctx.taskStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态流转备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_808));
var __VLS_806;
var __VLS_790;
{
    const { footer: __VLS_thisSlot } = __VLS_786.slots;
    const __VLS_811 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_812 = __VLS_asFunctionalComponent(__VLS_811, new __VLS_811({
        ...{ 'onClick': {} },
    }));
    const __VLS_813 = __VLS_812({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_812));
    let __VLS_815;
    let __VLS_816;
    let __VLS_817;
    const __VLS_818 = {
        onClick: (...[$event]) => {
            __VLS_ctx.taskStatusDialogVisible = false;
        }
    };
    __VLS_814.slots.default;
    var __VLS_814;
    const __VLS_819 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_820 = __VLS_asFunctionalComponent(__VLS_819, new __VLS_819({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskStatusSubmitting),
        disabled: (!__VLS_ctx.taskStatusForm.status),
    }));
    const __VLS_821 = __VLS_820({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskStatusSubmitting),
        disabled: (!__VLS_ctx.taskStatusForm.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_820));
    let __VLS_823;
    let __VLS_824;
    let __VLS_825;
    const __VLS_826 = {
        onClick: (__VLS_ctx.submitTaskStatus)
    };
    __VLS_822.slots.default;
    var __VLS_822;
}
var __VLS_786;
/** @type {__VLS_StyleScopedClasses['transport-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--task']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-side']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['scan-result']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-layout--monitor']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--monitor']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-table']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-side']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--cost']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['transport-form-grid__wide']} */ ;
// @ts-ignore
var __VLS_624 = __VLS_623, __VLS_690 = __VLS_689;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            taskStatusOptions: taskStatusOptions,
            activeTab: activeTab,
            monitorFilter: monitorFilter,
            vehicles: vehicles,
            tasks: tasks,
            records: records,
            costTasks: costTasks,
            stationOptions: stationOptions,
            orderOptions: orderOptions,
            scanResult: scanResult,
            vehicleLoading: vehicleLoading,
            taskLoading: taskLoading,
            recordLoading: recordLoading,
            vehicleSubmitting: vehicleSubmitting,
            taskSubmitting: taskSubmitting,
            taskStatusSubmitting: taskStatusSubmitting,
            scanSubmitting: scanSubmitting,
            vehicleDialogVisible: vehicleDialogVisible,
            vehicleDialogMode: vehicleDialogMode,
            taskDialogVisible: taskDialogVisible,
            taskDialogMode: taskDialogMode,
            taskStatusDialogVisible: taskStatusDialogVisible,
            monitorOverview: monitorOverview,
            costOverview: costOverview,
            transportStats: transportStats,
            vehiclePagination: vehiclePagination,
            taskPagination: taskPagination,
            recordPagination: recordPagination,
            vehicleFilters: vehicleFilters,
            taskFilters: taskFilters,
            recordFilters: recordFilters,
            vehicleFormRef: vehicleFormRef,
            vehicleForm: vehicleForm,
            vehicleRules: vehicleRules,
            taskFormRef: taskFormRef,
            taskForm: taskForm,
            taskRules: taskRules,
            taskStatusForm: taskStatusForm,
            scanForm: scanForm,
            vehicleOptions: vehicleOptions,
            driverOptions: driverOptions,
            topDrivers: topDrivers,
            taskOptionsForScan: taskOptionsForScan,
            currentTaskStatusOptions: currentTaskStatusOptions,
            filteredMonitorTasks: filteredMonitorTasks,
            filteredWarnings: filteredWarnings,
            normalizeText: normalizeText,
            displayUserName: displayUserName,
            formatMoney: formatMoney,
            formatPercent: formatPercent,
            safePercentage: safePercentage,
            warningLabel: warningLabel,
            taskStatusTagType: taskStatusTagType,
            nextTaskStatuses: nextTaskStatuses,
            loadTransportStats: loadTransportStats,
            refreshTransportOverview: refreshTransportOverview,
            openVehicleDialog: openVehicleDialog,
            submitVehicleDialog: submitVehicleDialog,
            toggleVehicleStatus: toggleVehicleStatus,
            openTaskDialog: openTaskDialog,
            submitTaskDialog: submitTaskDialog,
            openTaskStatusDialog: openTaskStatusDialog,
            submitTaskStatus: submitTaskStatus,
            prefillScan: prefillScan,
            submitScan: submitScan,
            applyVehicleFilters: applyVehicleFilters,
            resetVehicleFilters: resetVehicleFilters,
            handleVehiclePageChange: handleVehiclePageChange,
            handleVehicleSizeChange: handleVehicleSizeChange,
            applyTaskFilters: applyTaskFilters,
            resetTaskFilters: resetTaskFilters,
            handleTaskPageChange: handleTaskPageChange,
            handleTaskSizeChange: handleTaskSizeChange,
            applyRecordFilters: applyRecordFilters,
            resetRecordFilters: resetRecordFilters,
            handleRecordPageChange: handleRecordPageChange,
            handleRecordSizeChange: handleRecordSizeChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
