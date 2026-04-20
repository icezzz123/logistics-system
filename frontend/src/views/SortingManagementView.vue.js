import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { readQueryEnum, readQueryNumber } from '@/utils/workbench';
const taskStatusOptions = [
    { value: 'pending', label: '待处理' },
    { value: 'processing', label: '处理中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
];
const route = useRoute();
const activeTab = ref('rules');
const stationOptions = ref([]);
const workerOptions = ref([]);
const rules = ref([]);
const tasks = ref([]);
const records = ref([]);
const scanResult = ref(null);
const ruleLoading = ref(false);
const taskLoading = ref(false);
const recordLoading = ref(false);
const ruleSubmitting = ref(false);
const taskSubmitting = ref(false);
const taskStatusSubmitting = ref(false);
const scanSubmitting = ref(false);
const ruleStats = reactive({ total_rules: 0, enabled_rules: 0, disabled_rules: 0, country_stats: [], station_stats: [], priority_stats: [] });
const sortingStats = reactive({ task_stats: { total_tasks: 0, pending_tasks: 0, processing_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, avg_progress: 0, total_items: 0, sorted_items: 0 }, record_stats: { total_records: 0, correct_records: 0, error_records: 0, accuracy_rate: '0.0%', avg_scan_time: 0 }, sorter_stats: [], station_stats: [], accuracy_stats: { overall_rate: '0.0%' } });
const rulePagination = reactive({ total: 0, page: 1, pageSize: 10 });
const taskPagination = reactive({ total: 0, page: 1, pageSize: 10 });
const recordPagination = reactive({ total: 0, page: 1, pageSize: 10 });
const ruleFilters = reactive({ rule_name: '', country: '', city: '', station_id: undefined, status: -1 });
const taskFilters = reactive({ task_no: '', station_id: undefined, assigned_to: undefined, status: undefined });
const recordFilters = reactive({ task_id: undefined, order_id: undefined, station_id: undefined, sorter_id: undefined, is_correct: -1 });
const scanForm = reactive({ order_no: '', station_id: undefined, task_id: undefined, remark: '' });
const ruleDialogVisible = ref(false);
const ruleDialogMode = ref('create');
const currentRuleId = ref(null);
const ruleFormRef = ref();
const ruleForm = reactive({ rule_name: '', country: '', province: '', city: '', district: '', route_code: '', station_id: undefined, priority: 100, description: '' });
const ruleRules = { rule_name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }], country: [{ required: true, message: '请输入国家', trigger: 'blur' }], route_code: [{ required: true, message: '请输入路由代码', trigger: 'blur' }], station_id: [{ required: true, message: '请选择目标站点', trigger: 'change' }] };
const taskDialogVisible = ref(false);
const taskDialogMode = ref('create');
const currentTaskId = ref(null);
const taskFormRef = ref();
const taskForm = reactive({ station_id: undefined, assigned_to: undefined, total_count: 0, remark: '' });
const taskRules = { station_id: [{ required: true, message: '请选择站点', trigger: 'change' }] };
const taskStatusDialogVisible = ref(false);
const currentTaskForStatus = ref(null);
const taskStatusForm = reactive({ status: undefined, remark: '' });
const topStations = computed(() => sortingStats.station_stats.slice(0, 4));
const taskOptionsForScan = computed(() => tasks.value.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').slice(0, 20));
const currentTaskStatusOptions = computed(() => nextTaskStatuses(currentTaskForStatus.value?.status || ''));
function normalizeText(value, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text))
    return fallback; return text; }
function displayUserName(user) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})`; }
function formatRegion(country, province, city, district) { return [country, province, city, district].map((item) => normalizeText(item, '')).filter(Boolean).join(' / ') || '-'; }
function formatPercent(value) { return `${(Number(value) || 0).toFixed(1)}%`; }
function safePercentage(value) { const result = Number(value) || 0; return result < 0 ? 0 : result > 100 ? 100 : Number(result.toFixed(1)); }
function taskStatusTagType(status) { return { pending: 'info', processing: 'warning', completed: 'success', cancelled: 'primary' }[status] || 'info'; }
function nextTaskStatuses(status) { return { pending: [{ value: 'processing', label: '处理中' }, { value: 'cancelled', label: '已取消' }], processing: [{ value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }], completed: [], cancelled: [] }[status] || []; }
function applyWorkbenchFilters() {
    const tab = readQueryEnum(route.query, 'tab', ['rules', 'tasks', 'records']);
    const taskStatus = readQueryEnum(route.query, 'task_status', ['pending', 'processing', 'completed', 'cancelled']);
    const recordIsCorrect = readQueryNumber(route.query, 'record_is_correct');
    if (tab) {
        activeTab.value = tab;
    }
    if (taskStatus) {
        taskFilters.status = taskStatus;
    }
    if (typeof recordIsCorrect === 'number' && [-1, 0, 1].includes(recordIsCorrect)) {
        recordFilters.is_correct = recordIsCorrect;
    }
}
function buildRuleParams() { const params = { page: rulePagination.page, page_size: rulePagination.pageSize, status: ruleFilters.status }; if (ruleFilters.rule_name.trim())
    params.rule_name = ruleFilters.rule_name.trim(); if (ruleFilters.country.trim())
    params.country = ruleFilters.country.trim(); if (ruleFilters.city.trim())
    params.city = ruleFilters.city.trim(); if (typeof ruleFilters.station_id === 'number')
    params.station_id = ruleFilters.station_id; return params; }
function buildTaskParams() { const params = { page: taskPagination.page, page_size: taskPagination.pageSize }; if (taskFilters.task_no.trim())
    params.task_no = taskFilters.task_no.trim(); if (typeof taskFilters.station_id === 'number')
    params.station_id = taskFilters.station_id; if (typeof taskFilters.assigned_to === 'number')
    params.assigned_to = taskFilters.assigned_to; if (taskFilters.status)
    params.status = taskFilters.status; return params; }
function buildRecordParams() { const params = { page: recordPagination.page, page_size: recordPagination.pageSize, is_correct: recordFilters.is_correct }; if (typeof recordFilters.task_id === 'number')
    params.task_id = recordFilters.task_id; if (typeof recordFilters.order_id === 'number')
    params.order_id = recordFilters.order_id; if (typeof recordFilters.station_id === 'number')
    params.station_id = recordFilters.station_id; if (typeof recordFilters.sorter_id === 'number')
    params.sorter_id = recordFilters.sorter_id; return params; }
async function loadStationOptions() { const data = await http.get('/stations', { params: { page: 1, page_size: 100, status: 1 } }); stationOptions.value = data.list || []; }
async function loadWorkerOptions() { try {
    const data = await http.get('/users', { params: { page: 1, page_size: 100 } });
    workerOptions.value = (data.list || []).filter((item) => item.status === 1 && item.role >= 2);
}
catch {
    workerOptions.value = [];
} }
async function loadRules() { ruleLoading.value = true; try {
    const data = await http.get('/sorting/rules', { params: buildRuleParams() });
    rules.value = data.list || [];
    rulePagination.total = data.total || 0;
    rulePagination.page = data.page || rulePagination.page;
    rulePagination.pageSize = data.page_size || rulePagination.pageSize;
}
finally {
    ruleLoading.value = false;
} }
async function loadRuleStats() { Object.assign(ruleStats, await http.get('/sorting/rules/stats')); }
async function loadTasks() { taskLoading.value = true; try {
    const data = await http.get('/sorting/tasks', { params: buildTaskParams() });
    tasks.value = data.list || [];
    taskPagination.total = data.total || 0;
    taskPagination.page = data.page || taskPagination.page;
    taskPagination.pageSize = data.page_size || taskPagination.pageSize;
}
finally {
    taskLoading.value = false;
} }
async function loadRecords() { recordLoading.value = true; try {
    const data = await http.get('/sorting/records', { params: buildRecordParams() });
    records.value = data.list || [];
    recordPagination.total = data.total || 0;
    recordPagination.page = data.page || recordPagination.page;
    recordPagination.pageSize = data.page_size || recordPagination.pageSize;
}
finally {
    recordLoading.value = false;
} }
async function loadSortingStats() { Object.assign(sortingStats, await http.get('/sorting/stats')); }
function resetRuleForm() { ruleForm.rule_name = ''; ruleForm.country = ''; ruleForm.province = ''; ruleForm.city = ''; ruleForm.district = ''; ruleForm.route_code = ''; ruleForm.station_id = undefined; ruleForm.priority = 100; ruleForm.description = ''; }
function openRuleDialog(rule) { if (rule) {
    ruleDialogMode.value = 'edit';
    currentRuleId.value = rule.id;
    ruleForm.rule_name = rule.rule_name;
    ruleForm.country = rule.country;
    ruleForm.province = rule.province;
    ruleForm.city = rule.city;
    ruleForm.district = rule.district;
    ruleForm.route_code = rule.route_code;
    ruleForm.station_id = rule.station_id;
    ruleForm.priority = rule.priority;
    ruleForm.description = rule.description;
}
else {
    ruleDialogMode.value = 'create';
    currentRuleId.value = null;
    resetRuleForm();
} ruleDialogVisible.value = true; ruleFormRef.value?.clearValidate(); }
async function submitRuleDialog() { if (!ruleFormRef.value)
    return; const valid = await ruleFormRef.value.validate().catch(() => false); if (!valid)
    return; ruleSubmitting.value = true; try {
    const payload = { rule_name: ruleForm.rule_name.trim(), country: ruleForm.country.trim(), province: ruleForm.province.trim(), city: ruleForm.city.trim(), district: ruleForm.district.trim(), route_code: ruleForm.route_code.trim(), station_id: ruleForm.station_id, priority: Number(ruleForm.priority), description: ruleForm.description.trim() };
    if (ruleDialogMode.value === 'create') {
        await http.post('/sorting/rules', payload);
        ElMessage.success('分拣规则已创建');
    }
    else if (currentRuleId.value) {
        await http.put(`/sorting/rules/${currentRuleId.value}`, payload);
        ElMessage.success('分拣规则已更新');
    }
    ruleDialogVisible.value = false;
    await Promise.all([loadRules(), loadRuleStats()]);
}
finally {
    ruleSubmitting.value = false;
} }
async function toggleRuleStatus(rule) { await http.put(`/sorting/rules/${rule.id}/status`, { status: rule.status === 1 ? 0 : 1 }); ElMessage.success(`规则已${rule.status === 1 ? '禁用' : '启用'}`); await Promise.all([loadRules(), loadRuleStats()]); }
async function deleteRule(rule) { await ElMessageBox.confirm(`确认删除规则 “${rule.rule_name}” 吗？`, '删除确认', { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }); await http.delete(`/sorting/rules/${rule.id}`); ElMessage.success('规则已删除'); await Promise.all([loadRules(), loadRuleStats()]); }
function resetTaskForm() { taskForm.station_id = undefined; taskForm.assigned_to = undefined; taskForm.total_count = 0; taskForm.remark = ''; }
function openTaskDialog(task) { if (task) {
    taskDialogMode.value = 'edit';
    currentTaskId.value = task.id;
    taskForm.station_id = task.station_id;
    taskForm.assigned_to = task.assigned_to || undefined;
    taskForm.total_count = task.total_count;
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
    const payload = { station_id: taskForm.station_id, assigned_to: taskForm.assigned_to || 0, total_count: Number(taskForm.total_count), remark: taskForm.remark.trim() };
    if (taskDialogMode.value === 'create') {
        await http.post('/sorting/tasks', payload);
        ElMessage.success('分拣任务已创建');
    }
    else if (currentTaskId.value) {
        await http.put(`/sorting/tasks/${currentTaskId.value}`, payload);
        ElMessage.success('分拣任务已更新');
    }
    taskDialogVisible.value = false;
    await Promise.all([loadTasks(), loadSortingStats()]);
}
finally {
    taskSubmitting.value = false;
} }
function openTaskStatusDialog(task) { currentTaskForStatus.value = task; taskStatusForm.status = nextTaskStatuses(task.status)[0]?.value; taskStatusForm.remark = ''; taskStatusDialogVisible.value = true; }
async function submitTaskStatus() { if (!currentTaskForStatus.value || !taskStatusForm.status)
    return; taskStatusSubmitting.value = true; try {
    await http.put(`/sorting/tasks/${currentTaskForStatus.value.id}/status`, { status: taskStatusForm.status, remark: taskStatusForm.remark.trim() });
    ElMessage.success('任务状态已更新');
    taskStatusDialogVisible.value = false;
    await Promise.all([loadTasks(), loadSortingStats()]);
}
finally {
    taskStatusSubmitting.value = false;
} }
function prefillScan(task) { activeTab.value = 'tasks'; scanForm.task_id = task.id; scanForm.station_id = task.station_id; scanForm.order_no = ''; scanForm.remark = ''; }
async function submitScan() { if (!scanForm.order_no.trim() || !scanForm.station_id) {
    ElMessage.warning('请填写订单号和站点');
    return;
} scanSubmitting.value = true; try {
    scanResult.value = await http.post('/sorting/scan', { order_no: scanForm.order_no.trim(), station_id: Number(scanForm.station_id), task_id: scanForm.task_id ? Number(scanForm.task_id) : 0, remark: scanForm.remark.trim() });
    ElMessage.success(scanResult.value.message);
    await Promise.all([loadTasks(), loadRecords(), loadSortingStats()]);
}
finally {
    scanSubmitting.value = false;
} }
async function applyRuleFilters() { rulePagination.page = 1; await loadRules(); }
function resetRuleFilters() { ruleFilters.rule_name = ''; ruleFilters.country = ''; ruleFilters.city = ''; ruleFilters.station_id = undefined; ruleFilters.status = -1; rulePagination.page = 1; void loadRules(); }
function handleRulePageChange(page) { rulePagination.page = page; void loadRules(); }
function handleRuleSizeChange(size) { rulePagination.pageSize = size; rulePagination.page = 1; void loadRules(); }
async function applyTaskFilters() { taskPagination.page = 1; await loadTasks(); }
function resetTaskFilters() { taskFilters.task_no = ''; taskFilters.station_id = undefined; taskFilters.assigned_to = undefined; taskFilters.status = undefined; taskPagination.page = 1; void loadTasks(); }
function handleTaskPageChange(page) { taskPagination.page = page; void loadTasks(); }
function handleTaskSizeChange(size) { taskPagination.pageSize = size; taskPagination.page = 1; void loadTasks(); }
async function applyRecordFilters() { recordPagination.page = 1; await loadRecords(); }
function resetRecordFilters() { recordFilters.task_id = undefined; recordFilters.order_id = undefined; recordFilters.station_id = undefined; recordFilters.sorter_id = undefined; recordFilters.is_correct = -1; recordPagination.page = 1; void loadRecords(); }
function handleRecordPageChange(page) { recordPagination.page = page; void loadRecords(); }
function handleRecordSizeChange(size) { recordPagination.pageSize = size; recordPagination.page = 1; void loadRecords(); }
onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadStationOptions(), loadWorkerOptions(), loadRules(), loadRuleStats(), loadTasks(), loadRecords(), loadSortingStats()]); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sorting-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['scan-result']} */ ;
/** @type {__VLS_StyleScopedClasses['scan-result']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--task']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-pagination']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "sorting-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topStations))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item.station_id),
    });
    (__VLS_ctx.normalizeText(item.station_name));
    (item.record_count);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.ruleStats.total_rules);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.task_stats.total_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.record_stats.total_records);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.record_stats.accuracy_rate || '0.0%');
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "sorting-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "sorting-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "规则中心",
    name: "rules",
}));
const __VLS_6 = __VLS_5({
    label: "规则中心",
    name: "rules",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sorting-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-panel__toolbar-actions" },
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
    onClick: (__VLS_ctx.loadRuleStats)
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
        __VLS_ctx.openRuleDialog();
    }
};
__VLS_19.slots.default;
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.ruleStats.enabled_rules);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.ruleStats.disabled_rules);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.normalizeText(__VLS_ctx.ruleStats.country_stats[0]?.country, '-'));
const __VLS_24 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.ruleFilters),
    ...{ class: "sorting-filters" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.ruleFilters),
    ...{ class: "sorting-filters" },
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
    label: "规则名",
}));
const __VLS_34 = __VLS_33({
    label: "规则名",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.ruleFilters.rule_name),
    clearable: true,
    placeholder: "请输入规则名称",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.ruleFilters.rule_name),
    clearable: true,
    placeholder: "请输入规则名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onKeyup: (__VLS_ctx.applyRuleFilters)
};
var __VLS_39;
var __VLS_35;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "国家",
}));
const __VLS_46 = __VLS_45({
    label: "国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.ruleFilters.country),
    clearable: true,
    placeholder: "如：中国",
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.ruleFilters.country),
    clearable: true,
    placeholder: "如：中国",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "城市",
}));
const __VLS_54 = __VLS_53({
    label: "城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.ruleFilters.city),
    clearable: true,
    placeholder: "可选",
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.ruleFilters.city),
    clearable: true,
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "站点",
}));
const __VLS_62 = __VLS_61({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.ruleFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.ruleFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_70 = __VLS_69({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_72 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_74 = __VLS_73({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
}
var __VLS_67;
var __VLS_63;
const __VLS_76 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "状态",
}));
const __VLS_78 = __VLS_77({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.ruleFilters.status),
    ...{ style: {} },
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.ruleFilters.status),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "全部状态",
    value: (-1),
}));
const __VLS_86 = __VLS_85({
    label: "全部状态",
    value: (-1),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const __VLS_88 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    label: "启用",
    value: (1),
}));
const __VLS_90 = __VLS_89({
    label: "启用",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_92 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: "禁用",
    value: (0),
}));
const __VLS_94 = __VLS_93({
    label: "禁用",
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
var __VLS_83;
var __VLS_79;
const __VLS_96 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({}));
const __VLS_98 = __VLS_97({}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_102 = __VLS_101({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
let __VLS_104;
let __VLS_105;
let __VLS_106;
const __VLS_107 = {
    onClick: (__VLS_ctx.applyRuleFilters)
};
__VLS_103.slots.default;
var __VLS_103;
const __VLS_108 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    ...{ 'onClick': {} },
}));
const __VLS_110 = __VLS_109({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
let __VLS_112;
let __VLS_113;
let __VLS_114;
const __VLS_115 = {
    onClick: (__VLS_ctx.resetRuleFilters)
};
__VLS_111.slots.default;
var __VLS_111;
var __VLS_99;
var __VLS_27;
const __VLS_116 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    data: (__VLS_ctx.rules),
    ...{ class: "sorting-table" },
    stripe: true,
}));
const __VLS_118 = __VLS_117({
    data: (__VLS_ctx.rules),
    ...{ class: "sorting-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.ruleLoading) }, null, null);
__VLS_119.slots.default;
const __VLS_120 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "规则",
    minWidth: "220",
}));
const __VLS_122 = __VLS_121({
    label: "规则",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_123.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sorting-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.rule_name));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.route_code);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.formatRegion(scope.row.country, scope.row.province, scope.row.city, scope.row.district));
}
var __VLS_123;
const __VLS_124 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    label: "目标站点",
    minWidth: "180",
}));
const __VLS_126 = __VLS_125({
    label: "目标站点",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_127.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.station_name));
}
var __VLS_127;
const __VLS_128 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "优先级",
    width: "100",
}));
const __VLS_130 = __VLS_129({
    label: "优先级",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_131.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_132 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        effect: "plain",
        type: "warning",
    }));
    const __VLS_134 = __VLS_133({
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    __VLS_135.slots.default;
    (scope.row.priority);
    var __VLS_135;
}
var __VLS_131;
const __VLS_136 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "状态",
    width: "100",
}));
const __VLS_138 = __VLS_137({
    label: "状态",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_139.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_140 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }));
    const __VLS_142 = __VLS_141({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    __VLS_143.slots.default;
    (scope.row.status_name);
    var __VLS_143;
}
var __VLS_139;
const __VLS_144 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    prop: "description",
    label: "说明",
    minWidth: "180",
}));
const __VLS_146 = __VLS_145({
    prop: "description",
    label: "说明",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
const __VLS_148 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    label: "操作",
    fixed: "right",
    width: "250",
}));
const __VLS_150 = __VLS_149({
    label: "操作",
    fixed: "right",
    width: "250",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_151.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sorting-actions" },
    });
    const __VLS_152 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_154 = __VLS_153({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    let __VLS_156;
    let __VLS_157;
    let __VLS_158;
    const __VLS_159 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openRuleDialog(scope.row);
        }
    };
    __VLS_155.slots.default;
    var __VLS_155;
    const __VLS_160 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        ...{ 'onClick': {} },
        link: true,
        type: (scope.row.status === 1 ? 'warning' : 'success'),
    }));
    const __VLS_162 = __VLS_161({
        ...{ 'onClick': {} },
        link: true,
        type: (scope.row.status === 1 ? 'warning' : 'success'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    let __VLS_164;
    let __VLS_165;
    let __VLS_166;
    const __VLS_167 = {
        onClick: (...[$event]) => {
            __VLS_ctx.toggleRuleStatus(scope.row);
        }
    };
    __VLS_163.slots.default;
    (scope.row.status === 1 ? '禁用' : '启用');
    var __VLS_163;
    const __VLS_168 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_172;
    let __VLS_173;
    let __VLS_174;
    const __VLS_175 = {
        onClick: (...[$event]) => {
            __VLS_ctx.deleteRule(scope.row);
        }
    };
    __VLS_171.slots.default;
    var __VLS_171;
}
var __VLS_151;
var __VLS_119;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-pagination" },
});
const __VLS_176 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.rulePagination.total),
    currentPage: (__VLS_ctx.rulePagination.page),
    pageSize: (__VLS_ctx.rulePagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_178 = __VLS_177({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.rulePagination.total),
    currentPage: (__VLS_ctx.rulePagination.page),
    pageSize: (__VLS_ctx.rulePagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
let __VLS_180;
let __VLS_181;
let __VLS_182;
const __VLS_183 = {
    onCurrentChange: (__VLS_ctx.handleRulePageChange)
};
const __VLS_184 = {
    onSizeChange: (__VLS_ctx.handleRuleSizeChange)
};
var __VLS_179;
var __VLS_7;
const __VLS_185 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
    label: "任务中心",
    name: "tasks",
}));
const __VLS_187 = __VLS_186({
    label: "任务中心",
    name: "tasks",
}, ...__VLS_functionalComponentArgsRest(__VLS_186));
__VLS_188.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sorting-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-panel__toolbar-actions" },
});
const __VLS_189 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({
    ...{ 'onClick': {} },
}));
const __VLS_191 = __VLS_190({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_190));
let __VLS_193;
let __VLS_194;
let __VLS_195;
const __VLS_196 = {
    onClick: (__VLS_ctx.loadSortingStats)
};
__VLS_192.slots.default;
var __VLS_192;
const __VLS_197 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_199 = __VLS_198({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
let __VLS_201;
let __VLS_202;
let __VLS_203;
const __VLS_204 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openTaskDialog();
    }
};
__VLS_200.slots.default;
var __VLS_200;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--task" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.task_stats.pending_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.task_stats.processing_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.task_stats.completed_tasks);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatPercent(__VLS_ctx.sortingStats.task_stats.avg_progress));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sub-panel" },
});
const __VLS_205 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.taskFilters),
    ...{ class: "sorting-filters" },
}));
const __VLS_207 = __VLS_206({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.taskFilters),
    ...{ class: "sorting-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
let __VLS_209;
let __VLS_210;
let __VLS_211;
const __VLS_212 = {
    onSubmit: () => { }
};
__VLS_208.slots.default;
const __VLS_213 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
    label: "任务号",
}));
const __VLS_215 = __VLS_214({
    label: "任务号",
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
__VLS_216.slots.default;
const __VLS_217 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.taskFilters.task_no),
    clearable: true,
    placeholder: "请输入任务编号",
}));
const __VLS_219 = __VLS_218({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.taskFilters.task_no),
    clearable: true,
    placeholder: "请输入任务编号",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
let __VLS_221;
let __VLS_222;
let __VLS_223;
const __VLS_224 = {
    onKeyup: (__VLS_ctx.applyTaskFilters)
};
var __VLS_220;
var __VLS_216;
const __VLS_225 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    label: "站点",
}));
const __VLS_227 = __VLS_226({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
__VLS_228.slots.default;
const __VLS_229 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    modelValue: (__VLS_ctx.taskFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_231 = __VLS_230({
    modelValue: (__VLS_ctx.taskFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
__VLS_232.slots.default;
const __VLS_233 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_235 = __VLS_234({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_237 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_239 = __VLS_238({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_238));
}
var __VLS_232;
var __VLS_228;
const __VLS_241 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    label: "员工",
}));
const __VLS_243 = __VLS_242({
    label: "员工",
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
__VLS_244.slots.default;
const __VLS_245 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    modelValue: (__VLS_ctx.taskFilters.assigned_to),
    clearable: true,
    placeholder: "全部员工",
    ...{ style: {} },
}));
const __VLS_247 = __VLS_246({
    modelValue: (__VLS_ctx.taskFilters.assigned_to),
    clearable: true,
    placeholder: "全部员工",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
__VLS_248.slots.default;
const __VLS_249 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    label: "全部员工",
    value: (undefined),
}));
const __VLS_251 = __VLS_250({
    label: "全部员工",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workerOptions))) {
    const __VLS_253 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_255 = __VLS_254({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_254));
}
var __VLS_248;
var __VLS_244;
const __VLS_257 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    label: "状态",
}));
const __VLS_259 = __VLS_258({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
__VLS_260.slots.default;
const __VLS_261 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({
    modelValue: (__VLS_ctx.taskFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_263 = __VLS_262({
    modelValue: (__VLS_ctx.taskFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_262));
__VLS_264.slots.default;
const __VLS_265 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_267 = __VLS_266({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.taskStatusOptions))) {
    const __VLS_269 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_271 = __VLS_270({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_270));
}
var __VLS_264;
var __VLS_260;
const __VLS_273 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({}));
const __VLS_275 = __VLS_274({}, ...__VLS_functionalComponentArgsRest(__VLS_274));
__VLS_276.slots.default;
const __VLS_277 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_279 = __VLS_278({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_278));
let __VLS_281;
let __VLS_282;
let __VLS_283;
const __VLS_284 = {
    onClick: (__VLS_ctx.applyTaskFilters)
};
__VLS_280.slots.default;
var __VLS_280;
const __VLS_285 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
    ...{ 'onClick': {} },
}));
const __VLS_287 = __VLS_286({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
let __VLS_289;
let __VLS_290;
let __VLS_291;
const __VLS_292 = {
    onClick: (__VLS_ctx.resetTaskFilters)
};
__VLS_288.slots.default;
var __VLS_288;
var __VLS_276;
var __VLS_208;
const __VLS_293 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
    data: (__VLS_ctx.tasks),
    ...{ class: "sorting-table" },
    stripe: true,
}));
const __VLS_295 = __VLS_294({
    data: (__VLS_ctx.tasks),
    ...{ class: "sorting-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_294));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.taskLoading) }, null, null);
__VLS_296.slots.default;
const __VLS_297 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
    label: "任务",
    minWidth: "210",
}));
const __VLS_299 = __VLS_298({
    label: "任务",
    minWidth: "210",
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
__VLS_300.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_300.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sorting-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.task_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.station_name));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.remark, '无备注'));
}
var __VLS_300;
const __VLS_301 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
    label: "分拣员",
    minWidth: "140",
}));
const __VLS_303 = __VLS_302({
    label: "分拣员",
    minWidth: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
__VLS_304.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_304.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.assigned_name, '未分配'));
}
var __VLS_304;
const __VLS_305 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    label: "数量 / 进度",
    width: "170",
}));
const __VLS_307 = __VLS_306({
    label: "数量 / 进度",
    width: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_308.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "task-progress" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.sorted_count);
    (scope.row.total_count);
    const __VLS_309 = {}.ElProgress;
    /** @type {[typeof __VLS_components.ElProgress, typeof __VLS_components.elProgress, ]} */ ;
    // @ts-ignore
    const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
        percentage: (__VLS_ctx.safePercentage(scope.row.progress)),
        strokeWidth: (8),
    }));
    const __VLS_311 = __VLS_310({
        percentage: (__VLS_ctx.safePercentage(scope.row.progress)),
        strokeWidth: (8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_310));
}
var __VLS_308;
const __VLS_313 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
    label: "状态",
    width: "120",
}));
const __VLS_315 = __VLS_314({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_314));
__VLS_316.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_316.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_317 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_318 = __VLS_asFunctionalComponent(__VLS_317, new __VLS_317({
        type: (__VLS_ctx.taskStatusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_319 = __VLS_318({
        type: (__VLS_ctx.taskStatusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_318));
    __VLS_320.slots.default;
    (scope.row.status_name);
    var __VLS_320;
}
var __VLS_316;
const __VLS_321 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
    prop: "create_time",
    label: "创建时间",
    minWidth: "170",
}));
const __VLS_323 = __VLS_322({
    prop: "create_time",
    label: "创建时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
const __VLS_325 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
    label: "操作",
    fixed: "right",
    width: "240",
}));
const __VLS_327 = __VLS_326({
    label: "操作",
    fixed: "right",
    width: "240",
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
__VLS_328.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_328.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sorting-actions" },
    });
    const __VLS_329 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_331 = __VLS_330({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    let __VLS_333;
    let __VLS_334;
    let __VLS_335;
    const __VLS_336 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openTaskDialog(scope.row);
        }
    };
    __VLS_332.slots.default;
    var __VLS_332;
    if (__VLS_ctx.nextTaskStatuses(scope.row.status).length) {
        const __VLS_337 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_339 = __VLS_338({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_338));
        let __VLS_341;
        let __VLS_342;
        let __VLS_343;
        const __VLS_344 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.nextTaskStatuses(scope.row.status).length))
                    return;
                __VLS_ctx.openTaskStatusDialog(scope.row);
            }
        };
        __VLS_340.slots.default;
        var __VLS_340;
    }
    const __VLS_345 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }));
    const __VLS_347 = __VLS_346({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }, ...__VLS_functionalComponentArgsRest(__VLS_346));
    let __VLS_349;
    let __VLS_350;
    let __VLS_351;
    const __VLS_352 = {
        onClick: (...[$event]) => {
            __VLS_ctx.prefillScan(scope.row);
        }
    };
    __VLS_348.slots.default;
    var __VLS_348;
}
var __VLS_328;
var __VLS_296;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-pagination" },
});
const __VLS_353 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_354 = __VLS_asFunctionalComponent(__VLS_353, new __VLS_353({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.taskPagination.total),
    currentPage: (__VLS_ctx.taskPagination.page),
    pageSize: (__VLS_ctx.taskPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_355 = __VLS_354({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.taskPagination.total),
    currentPage: (__VLS_ctx.taskPagination.page),
    pageSize: (__VLS_ctx.taskPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_354));
let __VLS_357;
let __VLS_358;
let __VLS_359;
const __VLS_360 = {
    onCurrentChange: (__VLS_ctx.handleTaskPageChange)
};
const __VLS_361 = {
    onSizeChange: (__VLS_ctx.handleTaskSizeChange)
};
var __VLS_356;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-side" },
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
const __VLS_362 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_363 = __VLS_asFunctionalComponent(__VLS_362, new __VLS_362({
    model: (__VLS_ctx.scanForm),
    labelPosition: "top",
}));
const __VLS_364 = __VLS_363({
    model: (__VLS_ctx.scanForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_363));
__VLS_365.slots.default;
const __VLS_366 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_367 = __VLS_asFunctionalComponent(__VLS_366, new __VLS_366({
    label: "订单号",
}));
const __VLS_368 = __VLS_367({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_367));
__VLS_369.slots.default;
const __VLS_370 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_371 = __VLS_asFunctionalComponent(__VLS_370, new __VLS_370({
    modelValue: (__VLS_ctx.scanForm.order_no),
    placeholder: "请输入订单号",
}));
const __VLS_372 = __VLS_371({
    modelValue: (__VLS_ctx.scanForm.order_no),
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_371));
var __VLS_369;
const __VLS_374 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_375 = __VLS_asFunctionalComponent(__VLS_374, new __VLS_374({
    label: "当前站点",
}));
const __VLS_376 = __VLS_375({
    label: "当前站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_375));
__VLS_377.slots.default;
const __VLS_378 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_379 = __VLS_asFunctionalComponent(__VLS_378, new __VLS_378({
    modelValue: (__VLS_ctx.scanForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_380 = __VLS_379({
    modelValue: (__VLS_ctx.scanForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_379));
__VLS_381.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_382 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_383 = __VLS_asFunctionalComponent(__VLS_382, new __VLS_382({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_384 = __VLS_383({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_383));
}
var __VLS_381;
var __VLS_377;
const __VLS_386 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_387 = __VLS_asFunctionalComponent(__VLS_386, new __VLS_386({
    label: "关联任务",
}));
const __VLS_388 = __VLS_387({
    label: "关联任务",
}, ...__VLS_functionalComponentArgsRest(__VLS_387));
__VLS_389.slots.default;
const __VLS_390 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_391 = __VLS_asFunctionalComponent(__VLS_390, new __VLS_390({
    modelValue: (__VLS_ctx.scanForm.task_id),
    clearable: true,
    placeholder: "可选",
    ...{ style: {} },
}));
const __VLS_392 = __VLS_391({
    modelValue: (__VLS_ctx.scanForm.task_id),
    clearable: true,
    placeholder: "可选",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_391));
__VLS_393.slots.default;
const __VLS_394 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_395 = __VLS_asFunctionalComponent(__VLS_394, new __VLS_394({
    label: "不关联任务",
    value: (undefined),
}));
const __VLS_396 = __VLS_395({
    label: "不关联任务",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_395));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.taskOptionsForScan))) {
    const __VLS_398 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_399 = __VLS_asFunctionalComponent(__VLS_398, new __VLS_398({
        key: (item.id),
        label: (item.task_no),
        value: (item.id),
    }));
    const __VLS_400 = __VLS_399({
        key: (item.id),
        label: (item.task_no),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_399));
}
var __VLS_393;
var __VLS_389;
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
var __VLS_365;
if (__VLS_ctx.scanResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "scan-result" },
    });
    const __VLS_418 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_419 = __VLS_asFunctionalComponent(__VLS_418, new __VLS_418({
        type: (__VLS_ctx.scanResult.route_matched ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_420 = __VLS_419({
        type: (__VLS_ctx.scanResult.route_matched ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_419));
    __VLS_421.slots.default;
    (__VLS_ctx.scanResult.route_matched ? '已匹配路由' : '未匹配路由');
    var __VLS_421;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.scanResult.message);
    if (__VLS_ctx.scanResult.route_code) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.scanResult.route_code);
        (__VLS_ctx.normalizeText(__VLS_ctx.scanResult.station_name));
    }
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
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.sortingStats.sorter_stats))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.sorter_id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(item.sorter_name));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.record_count);
    (item.accuracy_rate);
}
var __VLS_188;
const __VLS_422 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_423 = __VLS_asFunctionalComponent(__VLS_422, new __VLS_422({
    label: "记录中心",
    name: "records",
}));
const __VLS_424 = __VLS_423({
    label: "记录中心",
    name: "records",
}, ...__VLS_functionalComponentArgsRest(__VLS_423));
__VLS_425.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel sorting-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-panel__toolbar-actions" },
});
const __VLS_426 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_427 = __VLS_asFunctionalComponent(__VLS_426, new __VLS_426({
    ...{ 'onClick': {} },
}));
const __VLS_428 = __VLS_427({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_427));
let __VLS_430;
let __VLS_431;
let __VLS_432;
const __VLS_433 = {
    onClick: (__VLS_ctx.loadSortingStats)
};
__VLS_429.slots.default;
var __VLS_429;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--task" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.record_stats.correct_records);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.record_stats.error_records);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.sortingStats.accuracy_stats.overall_rate || __VLS_ctx.sortingStats.record_stats.accuracy_rate);
const __VLS_434 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.recordFilters),
    ...{ class: "sorting-filters" },
}));
const __VLS_436 = __VLS_435({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.recordFilters),
    ...{ class: "sorting-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_435));
let __VLS_438;
let __VLS_439;
let __VLS_440;
const __VLS_441 = {
    onSubmit: () => { }
};
__VLS_437.slots.default;
const __VLS_442 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({
    label: "任务ID",
}));
const __VLS_444 = __VLS_443({
    label: "任务ID",
}, ...__VLS_functionalComponentArgsRest(__VLS_443));
__VLS_445.slots.default;
const __VLS_446 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_447 = __VLS_asFunctionalComponent(__VLS_446, new __VLS_446({
    modelValue: (__VLS_ctx.recordFilters.task_id),
    min: (1),
    step: (1),
    ...{ style: {} },
}));
const __VLS_448 = __VLS_447({
    modelValue: (__VLS_ctx.recordFilters.task_id),
    min: (1),
    step: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_447));
var __VLS_445;
const __VLS_450 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
    label: "订单ID",
}));
const __VLS_452 = __VLS_451({
    label: "订单ID",
}, ...__VLS_functionalComponentArgsRest(__VLS_451));
__VLS_453.slots.default;
const __VLS_454 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_455 = __VLS_asFunctionalComponent(__VLS_454, new __VLS_454({
    modelValue: (__VLS_ctx.recordFilters.order_id),
    min: (1),
    step: (1),
    ...{ style: {} },
}));
const __VLS_456 = __VLS_455({
    modelValue: (__VLS_ctx.recordFilters.order_id),
    min: (1),
    step: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_455));
var __VLS_453;
const __VLS_458 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
    label: "站点",
}));
const __VLS_460 = __VLS_459({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_459));
__VLS_461.slots.default;
const __VLS_462 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_463 = __VLS_asFunctionalComponent(__VLS_462, new __VLS_462({
    modelValue: (__VLS_ctx.recordFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_464 = __VLS_463({
    modelValue: (__VLS_ctx.recordFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_463));
__VLS_465.slots.default;
const __VLS_466 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_468 = __VLS_467({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_467));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_470 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_471 = __VLS_asFunctionalComponent(__VLS_470, new __VLS_470({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_472 = __VLS_471({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_471));
}
var __VLS_465;
var __VLS_461;
const __VLS_474 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_475 = __VLS_asFunctionalComponent(__VLS_474, new __VLS_474({
    label: "分拣员",
}));
const __VLS_476 = __VLS_475({
    label: "分拣员",
}, ...__VLS_functionalComponentArgsRest(__VLS_475));
__VLS_477.slots.default;
const __VLS_478 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_479 = __VLS_asFunctionalComponent(__VLS_478, new __VLS_478({
    modelValue: (__VLS_ctx.recordFilters.sorter_id),
    clearable: true,
    placeholder: "全部员工",
    ...{ style: {} },
}));
const __VLS_480 = __VLS_479({
    modelValue: (__VLS_ctx.recordFilters.sorter_id),
    clearable: true,
    placeholder: "全部员工",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_479));
__VLS_481.slots.default;
const __VLS_482 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
    label: "全部员工",
    value: (undefined),
}));
const __VLS_484 = __VLS_483({
    label: "全部员工",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_483));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workerOptions))) {
    const __VLS_486 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_487 = __VLS_asFunctionalComponent(__VLS_486, new __VLS_486({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_488 = __VLS_487({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_487));
}
var __VLS_481;
var __VLS_477;
const __VLS_490 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_491 = __VLS_asFunctionalComponent(__VLS_490, new __VLS_490({
    label: "正确性",
}));
const __VLS_492 = __VLS_491({
    label: "正确性",
}, ...__VLS_functionalComponentArgsRest(__VLS_491));
__VLS_493.slots.default;
const __VLS_494 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_495 = __VLS_asFunctionalComponent(__VLS_494, new __VLS_494({
    modelValue: (__VLS_ctx.recordFilters.is_correct),
    ...{ style: {} },
}));
const __VLS_496 = __VLS_495({
    modelValue: (__VLS_ctx.recordFilters.is_correct),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_495));
__VLS_497.slots.default;
const __VLS_498 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_499 = __VLS_asFunctionalComponent(__VLS_498, new __VLS_498({
    label: "全部记录",
    value: (-1),
}));
const __VLS_500 = __VLS_499({
    label: "全部记录",
    value: (-1),
}, ...__VLS_functionalComponentArgsRest(__VLS_499));
const __VLS_502 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_503 = __VLS_asFunctionalComponent(__VLS_502, new __VLS_502({
    label: "正确",
    value: (1),
}));
const __VLS_504 = __VLS_503({
    label: "正确",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_503));
const __VLS_506 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_507 = __VLS_asFunctionalComponent(__VLS_506, new __VLS_506({
    label: "错误",
    value: (0),
}));
const __VLS_508 = __VLS_507({
    label: "错误",
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_507));
var __VLS_497;
var __VLS_493;
const __VLS_510 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_511 = __VLS_asFunctionalComponent(__VLS_510, new __VLS_510({}));
const __VLS_512 = __VLS_511({}, ...__VLS_functionalComponentArgsRest(__VLS_511));
__VLS_513.slots.default;
const __VLS_514 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_515 = __VLS_asFunctionalComponent(__VLS_514, new __VLS_514({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_516 = __VLS_515({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_515));
let __VLS_518;
let __VLS_519;
let __VLS_520;
const __VLS_521 = {
    onClick: (__VLS_ctx.applyRecordFilters)
};
__VLS_517.slots.default;
var __VLS_517;
const __VLS_522 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_523 = __VLS_asFunctionalComponent(__VLS_522, new __VLS_522({
    ...{ 'onClick': {} },
}));
const __VLS_524 = __VLS_523({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_523));
let __VLS_526;
let __VLS_527;
let __VLS_528;
const __VLS_529 = {
    onClick: (__VLS_ctx.resetRecordFilters)
};
__VLS_525.slots.default;
var __VLS_525;
var __VLS_513;
var __VLS_437;
const __VLS_530 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_531 = __VLS_asFunctionalComponent(__VLS_530, new __VLS_530({
    data: (__VLS_ctx.records),
    ...{ class: "sorting-table" },
    stripe: true,
}));
const __VLS_532 = __VLS_531({
    data: (__VLS_ctx.records),
    ...{ class: "sorting-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_531));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.recordLoading) }, null, null);
__VLS_533.slots.default;
const __VLS_534 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_535 = __VLS_asFunctionalComponent(__VLS_534, new __VLS_534({
    label: "记录",
    minWidth: "240",
}));
const __VLS_536 = __VLS_535({
    label: "记录",
    minWidth: "240",
}, ...__VLS_functionalComponentArgsRest(__VLS_535));
__VLS_537.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_537.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sorting-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.task_no || '未关联任务');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.station_name));
    (__VLS_ctx.normalizeText(scope.row.target_name));
}
var __VLS_537;
const __VLS_538 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_539 = __VLS_asFunctionalComponent(__VLS_538, new __VLS_538({
    label: "规则 / 路由",
    minWidth: "200",
}));
const __VLS_540 = __VLS_539({
    label: "规则 / 路由",
    minWidth: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_539));
__VLS_541.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_541.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sorting-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.rule_name, '无规则'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.route_code, '无路由'));
}
var __VLS_541;
const __VLS_542 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_543 = __VLS_asFunctionalComponent(__VLS_542, new __VLS_542({
    label: "分拣员",
    minWidth: "140",
}));
const __VLS_544 = __VLS_543({
    label: "分拣员",
    minWidth: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_543));
__VLS_545.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_545.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.sorter_name, '未知分拣员'));
}
var __VLS_545;
const __VLS_546 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_547 = __VLS_asFunctionalComponent(__VLS_546, new __VLS_546({
    label: "正确性",
    width: "110",
}));
const __VLS_548 = __VLS_547({
    label: "正确性",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_547));
__VLS_549.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_549.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_550 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_551 = __VLS_asFunctionalComponent(__VLS_550, new __VLS_550({
        type: (scope.row.is_correct === 1 ? 'success' : 'danger'),
        effect: "dark",
    }));
    const __VLS_552 = __VLS_551({
        type: (scope.row.is_correct === 1 ? 'success' : 'danger'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_551));
    __VLS_553.slots.default;
    (scope.row.is_correct_name);
    var __VLS_553;
}
var __VLS_549;
const __VLS_554 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_555 = __VLS_asFunctionalComponent(__VLS_554, new __VLS_554({
    prop: "scan_time_format",
    label: "扫描时间",
    minWidth: "170",
}));
const __VLS_556 = __VLS_555({
    prop: "scan_time_format",
    label: "扫描时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_555));
const __VLS_558 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_559 = __VLS_asFunctionalComponent(__VLS_558, new __VLS_558({
    prop: "remark",
    label: "备注",
    minWidth: "180",
}));
const __VLS_560 = __VLS_559({
    prop: "remark",
    label: "备注",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_559));
var __VLS_533;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-pagination" },
});
const __VLS_562 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_563 = __VLS_asFunctionalComponent(__VLS_562, new __VLS_562({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.recordPagination.total),
    currentPage: (__VLS_ctx.recordPagination.page),
    pageSize: (__VLS_ctx.recordPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_564 = __VLS_563({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.recordPagination.total),
    currentPage: (__VLS_ctx.recordPagination.page),
    pageSize: (__VLS_ctx.recordPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_563));
let __VLS_566;
let __VLS_567;
let __VLS_568;
const __VLS_569 = {
    onCurrentChange: (__VLS_ctx.handleRecordPageChange)
};
const __VLS_570 = {
    onSizeChange: (__VLS_ctx.handleRecordSizeChange)
};
var __VLS_565;
var __VLS_425;
var __VLS_3;
const __VLS_571 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_572 = __VLS_asFunctionalComponent(__VLS_571, new __VLS_571({
    modelValue: (__VLS_ctx.ruleDialogVisible),
    title: (__VLS_ctx.ruleDialogMode === 'create' ? '新建分拣规则' : '编辑分拣规则'),
    width: "760px",
}));
const __VLS_573 = __VLS_572({
    modelValue: (__VLS_ctx.ruleDialogVisible),
    title: (__VLS_ctx.ruleDialogMode === 'create' ? '新建分拣规则' : '编辑分拣规则'),
    width: "760px",
}, ...__VLS_functionalComponentArgsRest(__VLS_572));
__VLS_574.slots.default;
const __VLS_575 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_576 = __VLS_asFunctionalComponent(__VLS_575, new __VLS_575({
    ref: "ruleFormRef",
    model: (__VLS_ctx.ruleForm),
    rules: (__VLS_ctx.ruleRules),
    labelPosition: "top",
}));
const __VLS_577 = __VLS_576({
    ref: "ruleFormRef",
    model: (__VLS_ctx.ruleForm),
    rules: (__VLS_ctx.ruleRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_576));
/** @type {typeof __VLS_ctx.ruleFormRef} */ ;
var __VLS_579 = {};
__VLS_578.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-form-grid" },
});
const __VLS_581 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_582 = __VLS_asFunctionalComponent(__VLS_581, new __VLS_581({
    label: "规则名称",
    prop: "rule_name",
}));
const __VLS_583 = __VLS_582({
    label: "规则名称",
    prop: "rule_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_582));
__VLS_584.slots.default;
const __VLS_585 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_586 = __VLS_asFunctionalComponent(__VLS_585, new __VLS_585({
    modelValue: (__VLS_ctx.ruleForm.rule_name),
    placeholder: "请输入规则名称",
}));
const __VLS_587 = __VLS_586({
    modelValue: (__VLS_ctx.ruleForm.rule_name),
    placeholder: "请输入规则名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_586));
var __VLS_584;
const __VLS_589 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_590 = __VLS_asFunctionalComponent(__VLS_589, new __VLS_589({
    label: "路由代码",
    prop: "route_code",
}));
const __VLS_591 = __VLS_590({
    label: "路由代码",
    prop: "route_code",
}, ...__VLS_functionalComponentArgsRest(__VLS_590));
__VLS_592.slots.default;
const __VLS_593 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_594 = __VLS_asFunctionalComponent(__VLS_593, new __VLS_593({
    modelValue: (__VLS_ctx.ruleForm.route_code),
    placeholder: "请输入路由代码",
}));
const __VLS_595 = __VLS_594({
    modelValue: (__VLS_ctx.ruleForm.route_code),
    placeholder: "请输入路由代码",
}, ...__VLS_functionalComponentArgsRest(__VLS_594));
var __VLS_592;
const __VLS_597 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_598 = __VLS_asFunctionalComponent(__VLS_597, new __VLS_597({
    label: "国家",
    prop: "country",
}));
const __VLS_599 = __VLS_598({
    label: "国家",
    prop: "country",
}, ...__VLS_functionalComponentArgsRest(__VLS_598));
__VLS_600.slots.default;
const __VLS_601 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_602 = __VLS_asFunctionalComponent(__VLS_601, new __VLS_601({
    modelValue: (__VLS_ctx.ruleForm.country),
    placeholder: "请输入国家",
}));
const __VLS_603 = __VLS_602({
    modelValue: (__VLS_ctx.ruleForm.country),
    placeholder: "请输入国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_602));
var __VLS_600;
const __VLS_605 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_606 = __VLS_asFunctionalComponent(__VLS_605, new __VLS_605({
    label: "省份",
}));
const __VLS_607 = __VLS_606({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_606));
__VLS_608.slots.default;
const __VLS_609 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_610 = __VLS_asFunctionalComponent(__VLS_609, new __VLS_609({
    modelValue: (__VLS_ctx.ruleForm.province),
    placeholder: "可选",
}));
const __VLS_611 = __VLS_610({
    modelValue: (__VLS_ctx.ruleForm.province),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_610));
var __VLS_608;
const __VLS_613 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_614 = __VLS_asFunctionalComponent(__VLS_613, new __VLS_613({
    label: "城市",
}));
const __VLS_615 = __VLS_614({
    label: "城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_614));
__VLS_616.slots.default;
const __VLS_617 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_618 = __VLS_asFunctionalComponent(__VLS_617, new __VLS_617({
    modelValue: (__VLS_ctx.ruleForm.city),
    placeholder: "可选",
}));
const __VLS_619 = __VLS_618({
    modelValue: (__VLS_ctx.ruleForm.city),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_618));
var __VLS_616;
const __VLS_621 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_622 = __VLS_asFunctionalComponent(__VLS_621, new __VLS_621({
    label: "区县",
}));
const __VLS_623 = __VLS_622({
    label: "区县",
}, ...__VLS_functionalComponentArgsRest(__VLS_622));
__VLS_624.slots.default;
const __VLS_625 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_626 = __VLS_asFunctionalComponent(__VLS_625, new __VLS_625({
    modelValue: (__VLS_ctx.ruleForm.district),
    placeholder: "可选",
}));
const __VLS_627 = __VLS_626({
    modelValue: (__VLS_ctx.ruleForm.district),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_626));
var __VLS_624;
const __VLS_629 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_630 = __VLS_asFunctionalComponent(__VLS_629, new __VLS_629({
    label: "目标站点",
    prop: "station_id",
}));
const __VLS_631 = __VLS_630({
    label: "目标站点",
    prop: "station_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_630));
__VLS_632.slots.default;
const __VLS_633 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_634 = __VLS_asFunctionalComponent(__VLS_633, new __VLS_633({
    modelValue: (__VLS_ctx.ruleForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_635 = __VLS_634({
    modelValue: (__VLS_ctx.ruleForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_634));
__VLS_636.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_637 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_638 = __VLS_asFunctionalComponent(__VLS_637, new __VLS_637({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_639 = __VLS_638({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_638));
}
var __VLS_636;
var __VLS_632;
const __VLS_641 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_642 = __VLS_asFunctionalComponent(__VLS_641, new __VLS_641({
    label: "优先级",
}));
const __VLS_643 = __VLS_642({
    label: "优先级",
}, ...__VLS_functionalComponentArgsRest(__VLS_642));
__VLS_644.slots.default;
const __VLS_645 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_646 = __VLS_asFunctionalComponent(__VLS_645, new __VLS_645({
    modelValue: (__VLS_ctx.ruleForm.priority),
    step: (10),
    ...{ style: {} },
}));
const __VLS_647 = __VLS_646({
    modelValue: (__VLS_ctx.ruleForm.priority),
    step: (10),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_646));
var __VLS_644;
const __VLS_649 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_650 = __VLS_asFunctionalComponent(__VLS_649, new __VLS_649({
    label: "描述",
    ...{ class: "sorting-form-grid__wide" },
}));
const __VLS_651 = __VLS_650({
    label: "描述",
    ...{ class: "sorting-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_650));
__VLS_652.slots.default;
const __VLS_653 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_654 = __VLS_asFunctionalComponent(__VLS_653, new __VLS_653({
    modelValue: (__VLS_ctx.ruleForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入规则描述",
}));
const __VLS_655 = __VLS_654({
    modelValue: (__VLS_ctx.ruleForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入规则描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_654));
var __VLS_652;
var __VLS_578;
{
    const { footer: __VLS_thisSlot } = __VLS_574.slots;
    const __VLS_657 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_658 = __VLS_asFunctionalComponent(__VLS_657, new __VLS_657({
        ...{ 'onClick': {} },
    }));
    const __VLS_659 = __VLS_658({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_658));
    let __VLS_661;
    let __VLS_662;
    let __VLS_663;
    const __VLS_664 = {
        onClick: (...[$event]) => {
            __VLS_ctx.ruleDialogVisible = false;
        }
    };
    __VLS_660.slots.default;
    var __VLS_660;
    const __VLS_665 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_666 = __VLS_asFunctionalComponent(__VLS_665, new __VLS_665({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.ruleSubmitting),
    }));
    const __VLS_667 = __VLS_666({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.ruleSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_666));
    let __VLS_669;
    let __VLS_670;
    let __VLS_671;
    const __VLS_672 = {
        onClick: (__VLS_ctx.submitRuleDialog)
    };
    __VLS_668.slots.default;
    var __VLS_668;
}
var __VLS_574;
const __VLS_673 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_674 = __VLS_asFunctionalComponent(__VLS_673, new __VLS_673({
    modelValue: (__VLS_ctx.taskDialogVisible),
    title: (__VLS_ctx.taskDialogMode === 'create' ? '创建分拣任务' : '编辑分拣任务'),
    width: "680px",
}));
const __VLS_675 = __VLS_674({
    modelValue: (__VLS_ctx.taskDialogVisible),
    title: (__VLS_ctx.taskDialogMode === 'create' ? '创建分拣任务' : '编辑分拣任务'),
    width: "680px",
}, ...__VLS_functionalComponentArgsRest(__VLS_674));
__VLS_676.slots.default;
const __VLS_677 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_678 = __VLS_asFunctionalComponent(__VLS_677, new __VLS_677({
    ref: "taskFormRef",
    model: (__VLS_ctx.taskForm),
    rules: (__VLS_ctx.taskRules),
    labelPosition: "top",
}));
const __VLS_679 = __VLS_678({
    ref: "taskFormRef",
    model: (__VLS_ctx.taskForm),
    rules: (__VLS_ctx.taskRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_678));
/** @type {typeof __VLS_ctx.taskFormRef} */ ;
var __VLS_681 = {};
__VLS_680.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sorting-form-grid" },
});
const __VLS_683 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_684 = __VLS_asFunctionalComponent(__VLS_683, new __VLS_683({
    label: "站点",
    prop: "station_id",
}));
const __VLS_685 = __VLS_684({
    label: "站点",
    prop: "station_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_684));
__VLS_686.slots.default;
const __VLS_687 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_688 = __VLS_asFunctionalComponent(__VLS_687, new __VLS_687({
    modelValue: (__VLS_ctx.taskForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_689 = __VLS_688({
    modelValue: (__VLS_ctx.taskForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_688));
__VLS_690.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_691 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_692 = __VLS_asFunctionalComponent(__VLS_691, new __VLS_691({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_693 = __VLS_692({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_692));
}
var __VLS_690;
var __VLS_686;
const __VLS_695 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_696 = __VLS_asFunctionalComponent(__VLS_695, new __VLS_695({
    label: "分配员工",
}));
const __VLS_697 = __VLS_696({
    label: "分配员工",
}, ...__VLS_functionalComponentArgsRest(__VLS_696));
__VLS_698.slots.default;
const __VLS_699 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_700 = __VLS_asFunctionalComponent(__VLS_699, new __VLS_699({
    modelValue: (__VLS_ctx.taskForm.assigned_to),
    clearable: true,
    placeholder: "可选，默认未分配",
    ...{ style: {} },
}));
const __VLS_701 = __VLS_700({
    modelValue: (__VLS_ctx.taskForm.assigned_to),
    clearable: true,
    placeholder: "可选，默认未分配",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_700));
__VLS_702.slots.default;
const __VLS_703 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_704 = __VLS_asFunctionalComponent(__VLS_703, new __VLS_703({
    label: "未分配",
    value: (undefined),
}));
const __VLS_705 = __VLS_704({
    label: "未分配",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_704));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workerOptions))) {
    const __VLS_707 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_708 = __VLS_asFunctionalComponent(__VLS_707, new __VLS_707({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_709 = __VLS_708({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_708));
}
var __VLS_702;
var __VLS_698;
const __VLS_711 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_712 = __VLS_asFunctionalComponent(__VLS_711, new __VLS_711({
    label: "预计总量",
    prop: "total_count",
}));
const __VLS_713 = __VLS_712({
    label: "预计总量",
    prop: "total_count",
}, ...__VLS_functionalComponentArgsRest(__VLS_712));
__VLS_714.slots.default;
const __VLS_715 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_716 = __VLS_asFunctionalComponent(__VLS_715, new __VLS_715({
    modelValue: (__VLS_ctx.taskForm.total_count),
    min: (0),
    step: (1),
    ...{ style: {} },
}));
const __VLS_717 = __VLS_716({
    modelValue: (__VLS_ctx.taskForm.total_count),
    min: (0),
    step: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_716));
var __VLS_714;
const __VLS_719 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_720 = __VLS_asFunctionalComponent(__VLS_719, new __VLS_719({
    label: "备注",
    ...{ class: "sorting-form-grid__wide" },
}));
const __VLS_721 = __VLS_720({
    label: "备注",
    ...{ class: "sorting-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_720));
__VLS_722.slots.default;
const __VLS_723 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_724 = __VLS_asFunctionalComponent(__VLS_723, new __VLS_723({
    modelValue: (__VLS_ctx.taskForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入任务备注",
}));
const __VLS_725 = __VLS_724({
    modelValue: (__VLS_ctx.taskForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入任务备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_724));
var __VLS_722;
var __VLS_680;
{
    const { footer: __VLS_thisSlot } = __VLS_676.slots;
    const __VLS_727 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_728 = __VLS_asFunctionalComponent(__VLS_727, new __VLS_727({
        ...{ 'onClick': {} },
    }));
    const __VLS_729 = __VLS_728({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_728));
    let __VLS_731;
    let __VLS_732;
    let __VLS_733;
    const __VLS_734 = {
        onClick: (...[$event]) => {
            __VLS_ctx.taskDialogVisible = false;
        }
    };
    __VLS_730.slots.default;
    var __VLS_730;
    const __VLS_735 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_736 = __VLS_asFunctionalComponent(__VLS_735, new __VLS_735({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskSubmitting),
    }));
    const __VLS_737 = __VLS_736({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_736));
    let __VLS_739;
    let __VLS_740;
    let __VLS_741;
    const __VLS_742 = {
        onClick: (__VLS_ctx.submitTaskDialog)
    };
    __VLS_738.slots.default;
    var __VLS_738;
}
var __VLS_676;
const __VLS_743 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_744 = __VLS_asFunctionalComponent(__VLS_743, new __VLS_743({
    modelValue: (__VLS_ctx.taskStatusDialogVisible),
    title: "更新任务状态",
    width: "460px",
}));
const __VLS_745 = __VLS_744({
    modelValue: (__VLS_ctx.taskStatusDialogVisible),
    title: "更新任务状态",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_744));
__VLS_746.slots.default;
const __VLS_747 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_748 = __VLS_asFunctionalComponent(__VLS_747, new __VLS_747({
    labelPosition: "top",
}));
const __VLS_749 = __VLS_748({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_748));
__VLS_750.slots.default;
const __VLS_751 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_752 = __VLS_asFunctionalComponent(__VLS_751, new __VLS_751({
    label: "目标状态",
}));
const __VLS_753 = __VLS_752({
    label: "目标状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_752));
__VLS_754.slots.default;
const __VLS_755 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_756 = __VLS_asFunctionalComponent(__VLS_755, new __VLS_755({
    modelValue: (__VLS_ctx.taskStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}));
const __VLS_757 = __VLS_756({
    modelValue: (__VLS_ctx.taskStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_756));
__VLS_758.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.currentTaskStatusOptions))) {
    const __VLS_759 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_760 = __VLS_asFunctionalComponent(__VLS_759, new __VLS_759({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_761 = __VLS_760({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_760));
}
var __VLS_758;
var __VLS_754;
const __VLS_763 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_764 = __VLS_asFunctionalComponent(__VLS_763, new __VLS_763({
    label: "备注",
}));
const __VLS_765 = __VLS_764({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_764));
__VLS_766.slots.default;
const __VLS_767 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_768 = __VLS_asFunctionalComponent(__VLS_767, new __VLS_767({
    modelValue: (__VLS_ctx.taskStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态流转备注",
}));
const __VLS_769 = __VLS_768({
    modelValue: (__VLS_ctx.taskStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态流转备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_768));
var __VLS_766;
var __VLS_750;
{
    const { footer: __VLS_thisSlot } = __VLS_746.slots;
    const __VLS_771 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_772 = __VLS_asFunctionalComponent(__VLS_771, new __VLS_771({
        ...{ 'onClick': {} },
    }));
    const __VLS_773 = __VLS_772({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_772));
    let __VLS_775;
    let __VLS_776;
    let __VLS_777;
    const __VLS_778 = {
        onClick: (...[$event]) => {
            __VLS_ctx.taskStatusDialogVisible = false;
        }
    };
    __VLS_774.slots.default;
    var __VLS_774;
    const __VLS_779 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_780 = __VLS_asFunctionalComponent(__VLS_779, new __VLS_779({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskStatusSubmitting),
        disabled: (!__VLS_ctx.taskStatusForm.status),
    }));
    const __VLS_781 = __VLS_780({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.taskStatusSubmitting),
        disabled: (!__VLS_ctx.taskStatusForm.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_780));
    let __VLS_783;
    let __VLS_784;
    let __VLS_785;
    const __VLS_786 = {
        onClick: (__VLS_ctx.submitTaskStatus)
    };
    __VLS_782.slots.default;
    var __VLS_782;
}
var __VLS_746;
/** @type {__VLS_StyleScopedClasses['sorting-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar-actions']} */ ;
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
/** @type {__VLS_StyleScopedClasses['sorting-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['task-progress']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-side']} */ ;
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
/** @type {__VLS_StyleScopedClasses['sorting-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--task']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-table']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['sorting-form-grid__wide']} */ ;
// @ts-ignore
var __VLS_580 = __VLS_579, __VLS_682 = __VLS_681;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            taskStatusOptions: taskStatusOptions,
            activeTab: activeTab,
            stationOptions: stationOptions,
            workerOptions: workerOptions,
            rules: rules,
            tasks: tasks,
            records: records,
            scanResult: scanResult,
            ruleLoading: ruleLoading,
            taskLoading: taskLoading,
            recordLoading: recordLoading,
            ruleSubmitting: ruleSubmitting,
            taskSubmitting: taskSubmitting,
            taskStatusSubmitting: taskStatusSubmitting,
            scanSubmitting: scanSubmitting,
            ruleStats: ruleStats,
            sortingStats: sortingStats,
            rulePagination: rulePagination,
            taskPagination: taskPagination,
            recordPagination: recordPagination,
            ruleFilters: ruleFilters,
            taskFilters: taskFilters,
            recordFilters: recordFilters,
            scanForm: scanForm,
            ruleDialogVisible: ruleDialogVisible,
            ruleDialogMode: ruleDialogMode,
            ruleFormRef: ruleFormRef,
            ruleForm: ruleForm,
            ruleRules: ruleRules,
            taskDialogVisible: taskDialogVisible,
            taskDialogMode: taskDialogMode,
            taskFormRef: taskFormRef,
            taskForm: taskForm,
            taskRules: taskRules,
            taskStatusDialogVisible: taskStatusDialogVisible,
            taskStatusForm: taskStatusForm,
            topStations: topStations,
            taskOptionsForScan: taskOptionsForScan,
            currentTaskStatusOptions: currentTaskStatusOptions,
            normalizeText: normalizeText,
            displayUserName: displayUserName,
            formatRegion: formatRegion,
            formatPercent: formatPercent,
            safePercentage: safePercentage,
            taskStatusTagType: taskStatusTagType,
            nextTaskStatuses: nextTaskStatuses,
            loadRuleStats: loadRuleStats,
            loadSortingStats: loadSortingStats,
            openRuleDialog: openRuleDialog,
            submitRuleDialog: submitRuleDialog,
            toggleRuleStatus: toggleRuleStatus,
            deleteRule: deleteRule,
            openTaskDialog: openTaskDialog,
            submitTaskDialog: submitTaskDialog,
            openTaskStatusDialog: openTaskStatusDialog,
            submitTaskStatus: submitTaskStatus,
            prefillScan: prefillScan,
            submitScan: submitScan,
            applyRuleFilters: applyRuleFilters,
            resetRuleFilters: resetRuleFilters,
            handleRulePageChange: handleRulePageChange,
            handleRuleSizeChange: handleRuleSizeChange,
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
