import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { printHtmlDocument, renderPrintFieldGrid, renderPrintHead, renderPrintTable } from '@/utils/print';
import { readQueryEnum } from '@/utils/workbench';
const batchStatusOptions = [{ value: 'pending', label: '待调度' }, { value: 'dispatched', label: '已发车' }, { value: 'in_transit', label: '运输中' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }];
const planStatusOptions = [{ value: 'draft', label: '草稿' }, { value: 'confirmed', label: '已确认' }, { value: 'executing', label: '执行中' }, { value: 'completed', label: '已完成' }, { value: 'cancelled', label: '已取消' }];
const route = useRoute();
const activeTab = ref('optimize');
const stations = ref([]);
const vehicles = ref([]);
const orders = ref([]);
const users = ref([]);
const batches = ref([]);
const plans = ref([]);
const suggestions = ref([]);
const unassignedOrders = ref([]);
const optimizeResult = ref(null);
const batchLoading = ref(false);
const planLoading = ref(false);
const optimizing = ref(false);
const suggesting = ref(false);
const batchSubmitting = ref(false);
const batchStatusSubmitting = ref(false);
const planSubmitting = ref(false);
const planStatusSubmitting = ref(false);
const assignOrdersSubmitting = ref(false);
const optimizeForm = reactive({ vehicle_id: undefined, station_ids: [] });
const suggestionForm = reactive({ order_ids: [], date: undefined });
const suggestionSummary = reactive({ total_orders: 0, assigned_orders: 0, total_vehicles: 0, used_vehicles: 0 });
const suggestionLoaded = ref(false);
const batchFilters = reactive({ batch_name: '', vehicle_id: undefined, driver_id: undefined, status: undefined });
const planFilters = reactive({ plan_name: '', vehicle_id: undefined, status: undefined });
const batchDialogVisible = ref(false);
const batchFormRef = ref();
const batchForm = reactive({ batch_name: '', vehicle_id: undefined, driver_id: undefined, order_ids: [], planned_time: undefined, remark: '' });
const batchRules = { batch_name: [{ required: true, message: '请输入批次名称', trigger: 'blur' }], vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }], driver_id: [{ required: true, message: '请选择司机', trigger: 'change' }], order_ids: [{ required: true, message: '请选择订单', trigger: 'change' }], planned_time: [{ required: true, message: '请选择发车时间', trigger: 'change' }] };
const batchStatusDialogVisible = ref(false);
const currentBatch = ref(null);
const batchStatusForm = reactive({ status: undefined, remark: '' });
const planDialogVisible = ref(false);
const planDialogMode = ref('create');
const currentPlanId = ref(null);
const planFormRef = ref();
const planForm = reactive({ plan_name: '', plan_date: undefined, vehicle_id: undefined, driver_id: undefined, start_point: '', end_point: '', waypoints: '[]', distance: 0, estimated_hours: 0, max_capacity: 0, remark: '' });
const planRules = { plan_name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }], plan_date: [{ required: true, message: '请选择计划时间', trigger: 'change' }], vehicle_id: [{ required: true, message: '请选择车辆', trigger: 'change' }], driver_id: [{ required: true, message: '请选择司机', trigger: 'change' }], start_point: [{ required: true, message: '请输入起点', trigger: 'blur' }], end_point: [{ required: true, message: '请输入终点', trigger: 'blur' }] };
const planStatusDialogVisible = ref(false);
const currentPlan = ref(null);
const planStatusForm = reactive({ status: undefined, remark: '' });
const assignOrdersDialogVisible = ref(false);
const assignOrdersForm = reactive({ order_ids: [] });
const stationOptions = computed(() => stations.value);
const vehicleOptions = computed(() => vehicles.value);
const orderOptions = computed(() => orders.value);
const driverOptions = computed(() => users.value.filter((item) => item.status === 1 && item.role >= 2));
const topVehicles = computed(() => suggestions.value.slice(0, 4));
const currentBatchStatusOptions = computed(() => nextBatchStatuses(currentBatch.value?.status || ''));
const currentPlanStatusOptions = computed(() => nextPlanStatuses(currentPlan.value?.status || ''));
function normalizeText(value, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text))
    return fallback; return text; }
function displayUserName(user) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})`; }
function formatMoney(value) { return `¥${(Number(value) || 0).toFixed(2)}`; }
function formatUnix(value) { if (!value)
    return '-'; const date = new Date(value > 1000000000000 ? value : value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }); }
function dispatchStatusTagType(status) { return { pending: 'info', dispatched: 'warning', in_transit: 'warning', completed: 'success', cancelled: 'primary', draft: 'info', confirmed: 'warning', executing: 'warning' }[status] || 'info'; }
function nextBatchStatuses(status) { return { pending: [{ value: 'dispatched', label: '已发车' }, { value: 'cancelled', label: '已取消' }], dispatched: [{ value: 'in_transit', label: '运输中' }, { value: 'completed', label: '已完成' }], in_transit: [{ value: 'completed', label: '已完成' }], completed: [], cancelled: [] }[status] || []; }
function nextPlanStatuses(status) { return { draft: [{ value: 'confirmed', label: '已确认' }, { value: 'cancelled', label: '已取消' }], confirmed: [{ value: 'executing', label: '执行中' }, { value: 'cancelled', label: '已取消' }], executing: [{ value: 'completed', label: '已完成' }], completed: [], cancelled: [] }[status] || []; }
function applyWorkbenchFilters() {
    const tab = readQueryEnum(route.query, 'tab', ['optimize', 'batches', 'plans']);
    const batchStatus = readQueryEnum(route.query, 'batch_status', ['pending', 'dispatched', 'in_transit', 'completed', 'cancelled']);
    const planStatus = readQueryEnum(route.query, 'plan_status', ['draft', 'confirmed', 'executing', 'completed', 'cancelled']);
    if (tab) {
        activeTab.value = tab;
    }
    if (batchStatus) {
        batchFilters.status = batchStatus;
    }
    if (planStatus) {
        planFilters.status = planStatus;
    }
}
function buildBatchParams() { const params = { page: 1, page_size: 100 }; if (batchFilters.batch_name.trim())
    params.batch_name = batchFilters.batch_name.trim(); if (typeof batchFilters.vehicle_id === 'number')
    params.vehicle_id = batchFilters.vehicle_id; if (typeof batchFilters.driver_id === 'number')
    params.driver_id = batchFilters.driver_id; if (batchFilters.status)
    params.status = batchFilters.status; return params; }
function buildPlanParams() { const params = { page: 1, page_size: 100 }; if (planFilters.plan_name.trim())
    params.plan_name = planFilters.plan_name.trim(); if (typeof planFilters.vehicle_id === 'number')
    params.vehicle_id = planFilters.vehicle_id; if (planFilters.status)
    params.status = planFilters.status; return params; }
async function loadSupportOptions() {
    const [stationData, vehicleData, orderData, userData] = await Promise.all([
        http.get('/stations', { params: { page: 1, page_size: 100, status: 1 } }),
        http.get('/transport/vehicles', { params: { page: 1, page_size: 100, status: -1 } }),
        http.get('/orders', { params: { page: 1, page_size: 100 } }),
        http.get('/users', { params: { page: 1, page_size: 100 } }),
    ]);
    stations.value = stationData.list || [];
    vehicles.value = vehicleData.list || [];
    orders.value = orderData.list || [];
    users.value = userData.list || [];
}
async function loadBatches() { batchLoading.value = true; try {
    const data = await http.get('/dispatch/batches', { params: buildBatchParams() });
    batches.value = data.list || [];
}
finally {
    batchLoading.value = false;
} }
async function loadPlans() { planLoading.value = true; try {
    const data = await http.get('/dispatch/plans', { params: buildPlanParams() });
    plans.value = data.list || [];
}
finally {
    planLoading.value = false;
} }
async function submitOptimize() {
    if (!optimizeForm.vehicle_id || optimizeForm.station_ids.length < 2) {
        ElMessage.warning('请选择车辆和至少两个站点');
        return;
    }
    optimizing.value = true;
    try {
        optimizeResult.value = await http.post('/dispatch/route/optimize', { vehicle_id: optimizeForm.vehicle_id, station_ids: optimizeForm.station_ids });
        ElMessage.success('路径优化完成');
    }
    finally {
        optimizing.value = false;
    }
}
async function submitSuggestion() {
    if (!suggestionForm.order_ids.length || !suggestionForm.date) {
        ElMessage.warning('请选择订单和调度时间');
        return;
    }
    suggesting.value = true;
    try {
        const data = await http.post('/dispatch/suggestion', { order_ids: suggestionForm.order_ids, date: Math.floor(Number(suggestionForm.date) / 1000) });
        suggestions.value = data.suggestions || [];
        unassignedOrders.value = data.unassigned_orders || [];
        Object.assign(suggestionSummary, data.summary || suggestionSummary);
        suggestionLoaded.value = true;
        ElMessage.success('调度建议已生成');
    }
    finally {
        suggesting.value = false;
    }
}
function resetBatchForm() { batchForm.batch_name = ''; batchForm.vehicle_id = undefined; batchForm.driver_id = undefined; batchForm.order_ids = []; batchForm.planned_time = undefined; batchForm.remark = ''; }
function openBatchDialog() { resetBatchForm(); batchDialogVisible.value = true; batchFormRef.value?.clearValidate(); }
async function submitBatchDialog() {
    if (!batchFormRef.value)
        return;
    const valid = await batchFormRef.value.validate().catch(() => false);
    if (!valid)
        return;
    batchSubmitting.value = true;
    try {
        await http.post('/dispatch/batches', { batch_name: batchForm.batch_name.trim(), vehicle_id: batchForm.vehicle_id, driver_id: batchForm.driver_id, order_ids: batchForm.order_ids, planned_time: Math.floor(Number(batchForm.planned_time) / 1000), remark: batchForm.remark.trim() });
        ElMessage.success('批次调度已创建');
        batchDialogVisible.value = false;
        await loadBatches();
    }
    finally {
        batchSubmitting.value = false;
    }
}
function openBatchStatusDialog(batch) { currentBatch.value = batch; batchStatusForm.status = nextBatchStatuses(batch.status)[0]?.value; batchStatusForm.remark = ''; batchStatusDialogVisible.value = true; }
async function submitBatchStatus() { if (!currentBatch.value || !batchStatusForm.status)
    return; batchStatusSubmitting.value = true; try {
    await http.put(`/dispatch/batches/${currentBatch.value.id}/status`, { status: batchStatusForm.status, remark: batchStatusForm.remark.trim() });
    ElMessage.success('批次状态已更新');
    batchStatusDialogVisible.value = false;
    await loadBatches();
}
finally {
    batchStatusSubmitting.value = false;
} }
async function printBatchList(batch) {
    const detail = await http.get(`/dispatch/batches/${batch.id}`);
    const taskRows = (detail.tasks || []).map((item, index) => [
        String(index + 1),
        item.order_no || '-',
        item.task_no || '-',
        item.start_point || '-',
        item.end_point || '-',
        item.status_name || item.status || '-',
    ]);
    const html = `
    ${renderPrintHead('批次清单', detail.batch_no, detail.status_name)}
    ${renderPrintFieldGrid([
        {
            title: '批次信息',
            fields: [
                { label: '批次名称', value: detail.batch_name },
                { label: '计划时间', value: formatUnix(detail.planned_time) },
                { label: '实际时间', value: formatUnix(detail.actual_time) },
                { label: '备注', value: normalizeText(detail.remark, '无') },
            ],
        },
        {
            title: '车辆与司机',
            fields: [
                { label: '车辆', value: normalizeText(detail.plate_number, '未分配') },
                { label: '司机', value: normalizeText(detail.driver_name, '未分配') },
                { label: '订单数', value: String(detail.order_count || 0) },
                { label: '总重量', value: `${Number(detail.total_weight || 0).toFixed(2)} kg` },
            ],
        },
    ])}
    ${renderPrintTable('任务明细', ['序号', '订单号', '任务号', '起点', '终点', '状态'], taskRows.length ? taskRows : [['-', '-', '-', '-', '-', '暂无任务']])}
    <section class="print-note">批次清单打印时间：${formatUnix(Date.now())}</section>
  `;
    printHtmlDocument(`批次清单-${detail.batch_no}`, html);
}
function resetPlanForm() { planForm.plan_name = ''; planForm.plan_date = undefined; planForm.vehicle_id = undefined; planForm.driver_id = undefined; planForm.start_point = ''; planForm.end_point = ''; planForm.waypoints = '[]'; planForm.distance = 0; planForm.estimated_hours = 0; planForm.max_capacity = 0; planForm.remark = ''; }
function openPlanDialog(plan) { if (plan) {
    planDialogMode.value = 'edit';
    currentPlanId.value = plan.id;
    planForm.plan_name = plan.plan_name;
    planForm.plan_date = String(plan.plan_date * 1000);
    planForm.vehicle_id = plan.vehicle_id;
    planForm.driver_id = plan.driver_id;
    planForm.start_point = plan.start_point;
    planForm.end_point = plan.end_point;
    planForm.waypoints = plan.waypoints || '[]';
    planForm.distance = plan.distance;
    planForm.estimated_hours = plan.estimated_hours;
    planForm.max_capacity = plan.max_capacity;
    planForm.remark = plan.remark;
}
else {
    planDialogMode.value = 'create';
    currentPlanId.value = null;
    resetPlanForm();
} planDialogVisible.value = true; planFormRef.value?.clearValidate(); }
async function submitPlanDialog() {
    if (!planFormRef.value)
        return;
    const valid = await planFormRef.value.validate().catch(() => false);
    if (!valid)
        return;
    planSubmitting.value = true;
    try {
        const payload = { plan_name: planForm.plan_name.trim(), plan_date: Math.floor(Number(planForm.plan_date) / 1000), vehicle_id: planForm.vehicle_id, driver_id: planForm.driver_id, start_point: planForm.start_point.trim(), end_point: planForm.end_point.trim(), waypoints: planForm.waypoints.trim(), distance: Number(planForm.distance), estimated_hours: Number(planForm.estimated_hours), max_capacity: Number(planForm.max_capacity), remark: planForm.remark.trim() };
        if (planDialogMode.value === 'create') {
            await http.post('/dispatch/plans', payload);
            ElMessage.success('运输计划已创建');
        }
        else if (currentPlanId.value) {
            await http.put(`/dispatch/plans/${currentPlanId.value}`, payload);
            ElMessage.success('运输计划已更新');
        }
        planDialogVisible.value = false;
        await loadPlans();
    }
    finally {
        planSubmitting.value = false;
    }
}
function openPlanStatusDialog(plan) { currentPlan.value = plan; planStatusForm.status = nextPlanStatuses(plan.status)[0]?.value; planStatusForm.remark = ''; planStatusDialogVisible.value = true; }
async function submitPlanStatus() { if (!currentPlan.value || !planStatusForm.status)
    return; planStatusSubmitting.value = true; try {
    await http.put(`/dispatch/plans/${currentPlan.value.id}/status`, { status: planStatusForm.status, remark: planStatusForm.remark.trim() });
    ElMessage.success('计划状态已更新');
    planStatusDialogVisible.value = false;
    await loadPlans();
}
finally {
    planStatusSubmitting.value = false;
} }
function openAssignOrdersDialog(plan) { currentPlan.value = plan; assignOrdersForm.order_ids = []; assignOrdersDialogVisible.value = true; }
async function submitAssignOrders() { if (!currentPlan.value || !assignOrdersForm.order_ids.length)
    return; assignOrdersSubmitting.value = true; try {
    await http.post(`/dispatch/plans/${currentPlan.value.id}/orders`, { order_ids: assignOrdersForm.order_ids });
    ElMessage.success('订单已加入运输计划');
    assignOrdersDialogVisible.value = false;
    await loadPlans();
}
finally {
    assignOrdersSubmitting.value = false;
} }
async function applyBatchFilters() { await loadBatches(); }
function resetBatchFilters() { batchFilters.batch_name = ''; batchFilters.vehicle_id = undefined; batchFilters.driver_id = undefined; batchFilters.status = undefined; void loadBatches(); }
async function applyPlanFilters() { await loadPlans(); }
function resetPlanFilters() { planFilters.plan_name = ''; planFilters.vehicle_id = undefined; planFilters.status = undefined; void loadPlans(); }
onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadSupportOptions(), loadBatches(), loadPlans()]); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dispatch-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['route-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['route-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['route-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-layout--optimize']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--dispatch-small']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['result-columns']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "dispatch-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topVehicles))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item.vehicle_id),
    });
    (__VLS_ctx.normalizeText(item.plate_number));
    (item.load_rate);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.batches.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.plans.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.suggestionSummary.used_vehicles);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.unassignedOrders.length);
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "dispatch-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "dispatch-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "路径优化",
    name: "optimize",
}));
const __VLS_6 = __VLS_5({
    label: "路径优化",
    name: "optimize",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel dispatch-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-panel__toolbar-actions" },
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
    onClick: (__VLS_ctx.loadSupportOptions)
};
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-layout dispatch-layout--optimize" },
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
const __VLS_16 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    model: (__VLS_ctx.optimizeForm),
    labelPosition: "top",
}));
const __VLS_18 = __VLS_17({
    model: (__VLS_ctx.optimizeForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "车辆",
}));
const __VLS_22 = __VLS_21({
    label: "车辆",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
const __VLS_24 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    modelValue: (__VLS_ctx.optimizeForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}));
const __VLS_26 = __VLS_25({
    modelValue: (__VLS_ctx.optimizeForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_28 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_30 = __VLS_29({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
}
var __VLS_27;
var __VLS_23;
const __VLS_32 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    label: "途经站点",
}));
const __VLS_34 = __VLS_33({
    label: "途经站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    modelValue: (__VLS_ctx.optimizeForm.station_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择至少两个站点",
    ...{ style: {} },
}));
const __VLS_38 = __VLS_37({
    modelValue: (__VLS_ctx.optimizeForm.station_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择至少两个站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_40 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_42 = __VLS_41({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
}
var __VLS_39;
var __VLS_35;
const __VLS_44 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.optimizing),
}));
const __VLS_46 = __VLS_45({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.optimizing),
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
let __VLS_48;
let __VLS_49;
let __VLS_50;
const __VLS_51 = {
    onClick: (__VLS_ctx.submitOptimize)
};
__VLS_47.slots.default;
var __VLS_47;
var __VLS_19;
if (__VLS_ctx.optimizeResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-grid summary-grid--dispatch-small" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "summary-card card-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.optimizeResult.total_distance);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "summary-card card-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.optimizeResult.saved_distance);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "summary-card card-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.optimizeResult.estimated_time);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-columns" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "route-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.optimizeResult.original_order))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`o-${item.station_id}-${item.sequence}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.sequence);
        (__VLS_ctx.normalizeText(item.station_name));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.distance.toFixed(2));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "route-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.optimizeResult.optimized_order))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`n-${item.station_id}-${item.sequence}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.sequence);
        (__VLS_ctx.normalizeText(item.station_name));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.distance.toFixed(2));
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
const __VLS_52 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    model: (__VLS_ctx.suggestionForm),
    labelPosition: "top",
}));
const __VLS_54 = __VLS_53({
    model: (__VLS_ctx.suggestionForm),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    label: "订单",
}));
const __VLS_58 = __VLS_57({
    label: "订单",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
const __VLS_60 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    modelValue: (__VLS_ctx.suggestionForm.order_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择待调度订单",
    ...{ style: {} },
}));
const __VLS_62 = __VLS_61({
    modelValue: (__VLS_ctx.suggestionForm.order_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择待调度订单",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderOptions))) {
    const __VLS_64 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }));
    const __VLS_66 = __VLS_65({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
}
var __VLS_63;
var __VLS_59;
const __VLS_68 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "调度时间",
}));
const __VLS_70 = __VLS_69({
    label: "调度时间",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    modelValue: (__VLS_ctx.suggestionForm.date),
    type: "datetime",
    valueFormat: "x",
    placeholder: "请选择调度时间",
    ...{ style: {} },
}));
const __VLS_74 = __VLS_73({
    modelValue: (__VLS_ctx.suggestionForm.date),
    type: "datetime",
    valueFormat: "x",
    placeholder: "请选择调度时间",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
var __VLS_71;
const __VLS_76 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.suggesting),
}));
const __VLS_78 = __VLS_77({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.suggesting),
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_80;
let __VLS_81;
let __VLS_82;
const __VLS_83 = {
    onClick: (__VLS_ctx.submitSuggestion)
};
__VLS_79.slots.default;
var __VLS_79;
var __VLS_55;
if (__VLS_ctx.suggestionLoaded) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-grid summary-grid--dispatch-small result-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "summary-card card-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.suggestionSummary.total_orders);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "summary-card card-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.suggestionSummary.assigned_orders);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "summary-card card-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.suggestionSummary.used_vehicles);
}
if (__VLS_ctx.suggestions.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.suggestions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`${item.vehicle_id}-${item.driver_id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.normalizeText(item.plate_number));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.order_ids.length);
        (item.load_rate);
    }
}
else if (__VLS_ctx.suggestionLoaded) {
    const __VLS_84 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        description: "当前条件下没有建议批次",
    }));
    const __VLS_86 = __VLS_85({
        description: "当前条件下没有建议批次",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
}
if (__VLS_ctx.unassignedOrders.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "tip-text" },
    });
    (__VLS_ctx.unassignedOrders.join(', '));
}
var __VLS_7;
const __VLS_88 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    label: "批次调度",
    name: "batches",
}));
const __VLS_90 = __VLS_89({
    label: "批次调度",
    name: "batches",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel dispatch-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-panel__toolbar-actions" },
});
const __VLS_92 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    ...{ 'onClick': {} },
}));
const __VLS_94 = __VLS_93({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
let __VLS_96;
let __VLS_97;
let __VLS_98;
const __VLS_99 = {
    onClick: (__VLS_ctx.loadBatches)
};
__VLS_95.slots.default;
var __VLS_95;
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
    onClick: (...[$event]) => {
        __VLS_ctx.openBatchDialog();
    }
};
__VLS_103.slots.default;
var __VLS_103;
const __VLS_108 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.batchFilters),
    ...{ class: "dispatch-filters" },
}));
const __VLS_110 = __VLS_109({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.batchFilters),
    ...{ class: "dispatch-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
let __VLS_112;
let __VLS_113;
let __VLS_114;
const __VLS_115 = {
    onSubmit: () => { }
};
__VLS_111.slots.default;
const __VLS_116 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "批次名",
}));
const __VLS_118 = __VLS_117({
    label: "批次名",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
const __VLS_120 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.batchFilters.batch_name),
    clearable: true,
    placeholder: "请输入批次名称",
}));
const __VLS_122 = __VLS_121({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.batchFilters.batch_name),
    clearable: true,
    placeholder: "请输入批次名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
let __VLS_124;
let __VLS_125;
let __VLS_126;
const __VLS_127 = {
    onKeyup: (__VLS_ctx.applyBatchFilters)
};
var __VLS_123;
var __VLS_119;
const __VLS_128 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "车辆",
}));
const __VLS_130 = __VLS_129({
    label: "车辆",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
const __VLS_132 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    modelValue: (__VLS_ctx.batchFilters.vehicle_id),
    clearable: true,
    placeholder: "全部车辆",
    ...{ style: {} },
}));
const __VLS_134 = __VLS_133({
    modelValue: (__VLS_ctx.batchFilters.vehicle_id),
    clearable: true,
    placeholder: "全部车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
const __VLS_136 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "全部车辆",
    value: (undefined),
}));
const __VLS_138 = __VLS_137({
    label: "全部车辆",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_140 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_142 = __VLS_141({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
}
var __VLS_135;
var __VLS_131;
const __VLS_144 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    label: "司机",
}));
const __VLS_146 = __VLS_145({
    label: "司机",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    modelValue: (__VLS_ctx.batchFilters.driver_id),
    clearable: true,
    placeholder: "全部司机",
    ...{ style: {} },
}));
const __VLS_150 = __VLS_149({
    modelValue: (__VLS_ctx.batchFilters.driver_id),
    clearable: true,
    placeholder: "全部司机",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
const __VLS_152 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    label: "全部司机",
    value: (undefined),
}));
const __VLS_154 = __VLS_153({
    label: "全部司机",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_156 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_158 = __VLS_157({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
}
var __VLS_151;
var __VLS_147;
const __VLS_160 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    label: "状态",
}));
const __VLS_162 = __VLS_161({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    modelValue: (__VLS_ctx.batchFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_166 = __VLS_165({
    modelValue: (__VLS_ctx.batchFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
const __VLS_168 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_170 = __VLS_169({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.batchStatusOptions))) {
    const __VLS_172 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_174 = __VLS_173({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_173));
}
var __VLS_167;
var __VLS_163;
const __VLS_176 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({}));
const __VLS_178 = __VLS_177({}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_182 = __VLS_181({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
let __VLS_184;
let __VLS_185;
let __VLS_186;
const __VLS_187 = {
    onClick: (__VLS_ctx.applyBatchFilters)
};
__VLS_183.slots.default;
var __VLS_183;
const __VLS_188 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    ...{ 'onClick': {} },
}));
const __VLS_190 = __VLS_189({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
let __VLS_192;
let __VLS_193;
let __VLS_194;
const __VLS_195 = {
    onClick: (__VLS_ctx.resetBatchFilters)
};
__VLS_191.slots.default;
var __VLS_191;
var __VLS_179;
var __VLS_111;
const __VLS_196 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
    data: (__VLS_ctx.batches),
    ...{ class: "dispatch-table" },
    stripe: true,
}));
const __VLS_198 = __VLS_197({
    data: (__VLS_ctx.batches),
    ...{ class: "dispatch-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_197));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.batchLoading) }, null, null);
__VLS_199.slots.default;
const __VLS_200 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
    label: "批次",
    minWidth: "220",
}));
const __VLS_202 = __VLS_201({
    label: "批次",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_201));
__VLS_203.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_203.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.batch_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.batch_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.plate_number));
    (__VLS_ctx.normalizeText(scope.row.driver_name, '未知司机'));
}
var __VLS_203;
const __VLS_204 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
    label: "订单 / 重量",
    width: "150",
}));
const __VLS_206 = __VLS_205({
    label: "订单 / 重量",
    width: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_205));
__VLS_207.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_207.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.order_count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.total_weight);
}
var __VLS_207;
const __VLS_208 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
    label: "状态",
    width: "120",
}));
const __VLS_210 = __VLS_209({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
__VLS_211.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_211.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_212 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
        type: (__VLS_ctx.dispatchStatusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_214 = __VLS_213({
        type: (__VLS_ctx.dispatchStatusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    __VLS_215.slots.default;
    (scope.row.status_name);
    var __VLS_215;
}
var __VLS_211;
const __VLS_216 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    label: "计划 / 实际",
    minWidth: "180",
}));
const __VLS_218 = __VLS_217({
    label: "计划 / 实际",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
__VLS_219.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_219.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.planned_time));
    (__VLS_ctx.formatUnix(scope.row.actual_time));
}
var __VLS_219;
const __VLS_220 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    prop: "remark",
    label: "备注",
    minWidth: "180",
}));
const __VLS_222 = __VLS_221({
    prop: "remark",
    label: "备注",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
const __VLS_224 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
    label: "操作",
    fixed: "right",
    width: "180",
}));
const __VLS_226 = __VLS_225({
    label: "操作",
    fixed: "right",
    width: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_225));
__VLS_227.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_227.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-actions" },
    });
    const __VLS_228 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_230 = __VLS_229({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
    let __VLS_232;
    let __VLS_233;
    let __VLS_234;
    const __VLS_235 = {
        onClick: (...[$event]) => {
            __VLS_ctx.printBatchList(scope.row);
        }
    };
    __VLS_231.slots.default;
    var __VLS_231;
    if (__VLS_ctx.nextBatchStatuses(scope.row.status).length) {
        const __VLS_236 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_238 = __VLS_237({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        let __VLS_240;
        let __VLS_241;
        let __VLS_242;
        const __VLS_243 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.nextBatchStatuses(scope.row.status).length))
                    return;
                __VLS_ctx.openBatchStatusDialog(scope.row);
            }
        };
        __VLS_239.slots.default;
        var __VLS_239;
    }
}
var __VLS_227;
var __VLS_199;
var __VLS_91;
const __VLS_244 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    label: "运输计划",
    name: "plans",
}));
const __VLS_246 = __VLS_245({
    label: "运输计划",
    name: "plans",
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel dispatch-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-panel__toolbar-actions" },
});
const __VLS_248 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    ...{ 'onClick': {} },
}));
const __VLS_250 = __VLS_249({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
let __VLS_252;
let __VLS_253;
let __VLS_254;
const __VLS_255 = {
    onClick: (__VLS_ctx.loadPlans)
};
__VLS_251.slots.default;
var __VLS_251;
const __VLS_256 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_258 = __VLS_257({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
let __VLS_260;
let __VLS_261;
let __VLS_262;
const __VLS_263 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openPlanDialog();
    }
};
__VLS_259.slots.default;
var __VLS_259;
const __VLS_264 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.planFilters),
    ...{ class: "dispatch-filters" },
}));
const __VLS_266 = __VLS_265({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.planFilters),
    ...{ class: "dispatch-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
let __VLS_268;
let __VLS_269;
let __VLS_270;
const __VLS_271 = {
    onSubmit: () => { }
};
__VLS_267.slots.default;
const __VLS_272 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
    label: "计划名",
}));
const __VLS_274 = __VLS_273({
    label: "计划名",
}, ...__VLS_functionalComponentArgsRest(__VLS_273));
__VLS_275.slots.default;
const __VLS_276 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.planFilters.plan_name),
    clearable: true,
    placeholder: "请输入计划名称",
}));
const __VLS_278 = __VLS_277({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.planFilters.plan_name),
    clearable: true,
    placeholder: "请输入计划名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_277));
let __VLS_280;
let __VLS_281;
let __VLS_282;
const __VLS_283 = {
    onKeyup: (__VLS_ctx.applyPlanFilters)
};
var __VLS_279;
var __VLS_275;
const __VLS_284 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
    label: "车辆",
}));
const __VLS_286 = __VLS_285({
    label: "车辆",
}, ...__VLS_functionalComponentArgsRest(__VLS_285));
__VLS_287.slots.default;
const __VLS_288 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    modelValue: (__VLS_ctx.planFilters.vehicle_id),
    clearable: true,
    placeholder: "全部车辆",
    ...{ style: {} },
}));
const __VLS_290 = __VLS_289({
    modelValue: (__VLS_ctx.planFilters.vehicle_id),
    clearable: true,
    placeholder: "全部车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
const __VLS_292 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    label: "全部车辆",
    value: (undefined),
}));
const __VLS_294 = __VLS_293({
    label: "全部车辆",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_296 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_298 = __VLS_297({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
}
var __VLS_291;
var __VLS_287;
const __VLS_300 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
    label: "状态",
}));
const __VLS_302 = __VLS_301({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_301));
__VLS_303.slots.default;
const __VLS_304 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
    modelValue: (__VLS_ctx.planFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_306 = __VLS_305({
    modelValue: (__VLS_ctx.planFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_305));
__VLS_307.slots.default;
const __VLS_308 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_310 = __VLS_309({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.planStatusOptions))) {
    const __VLS_312 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_314 = __VLS_313({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_313));
}
var __VLS_307;
var __VLS_303;
const __VLS_316 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({}));
const __VLS_318 = __VLS_317({}, ...__VLS_functionalComponentArgsRest(__VLS_317));
__VLS_319.slots.default;
const __VLS_320 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_322 = __VLS_321({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
let __VLS_324;
let __VLS_325;
let __VLS_326;
const __VLS_327 = {
    onClick: (__VLS_ctx.applyPlanFilters)
};
__VLS_323.slots.default;
var __VLS_323;
const __VLS_328 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    ...{ 'onClick': {} },
}));
const __VLS_330 = __VLS_329({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
let __VLS_332;
let __VLS_333;
let __VLS_334;
const __VLS_335 = {
    onClick: (__VLS_ctx.resetPlanFilters)
};
__VLS_331.slots.default;
var __VLS_331;
var __VLS_319;
var __VLS_267;
const __VLS_336 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    data: (__VLS_ctx.plans),
    ...{ class: "dispatch-table" },
    stripe: true,
}));
const __VLS_338 = __VLS_337({
    data: (__VLS_ctx.plans),
    ...{ class: "dispatch-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.planLoading) }, null, null);
__VLS_339.slots.default;
const __VLS_340 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
    label: "计划",
    minWidth: "220",
}));
const __VLS_342 = __VLS_341({
    label: "计划",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_341));
__VLS_343.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_343.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.plan_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.plan_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.start_point));
    (__VLS_ctx.normalizeText(scope.row.end_point));
}
var __VLS_343;
const __VLS_344 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
    label: "车辆 / 司机",
    minWidth: "180",
}));
const __VLS_346 = __VLS_345({
    label: "车辆 / 司机",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
__VLS_347.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_347.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.plate_number));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.driver_name, '未知司机'));
}
var __VLS_347;
const __VLS_348 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
    label: "里程 / 运力",
    width: "160",
}));
const __VLS_350 = __VLS_349({
    label: "里程 / 运力",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_349));
__VLS_351.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_351.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.distance);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.used_capacity);
    (scope.row.max_capacity);
}
var __VLS_351;
const __VLS_352 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
    label: "状态",
    width: "120",
}));
const __VLS_354 = __VLS_353({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_353));
__VLS_355.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_355.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_356 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        type: (__VLS_ctx.dispatchStatusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_358 = __VLS_357({
        type: (__VLS_ctx.dispatchStatusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    __VLS_359.slots.default;
    (scope.row.status_name);
    var __VLS_359;
}
var __VLS_355;
const __VLS_360 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
    label: "计划时间",
    minWidth: "170",
}));
const __VLS_362 = __VLS_361({
    label: "计划时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_361));
__VLS_363.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_363.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.plan_date));
}
var __VLS_363;
const __VLS_364 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
    label: "操作",
    fixed: "right",
    width: "260",
}));
const __VLS_366 = __VLS_365({
    label: "操作",
    fixed: "right",
    width: "260",
}, ...__VLS_functionalComponentArgsRest(__VLS_365));
__VLS_367.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_367.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dispatch-actions" },
    });
    const __VLS_368 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_370 = __VLS_369({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_369));
    let __VLS_372;
    let __VLS_373;
    let __VLS_374;
    const __VLS_375 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openPlanDialog(scope.row);
        }
    };
    __VLS_371.slots.default;
    var __VLS_371;
    const __VLS_376 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }));
    const __VLS_378 = __VLS_377({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }, ...__VLS_functionalComponentArgsRest(__VLS_377));
    let __VLS_380;
    let __VLS_381;
    let __VLS_382;
    const __VLS_383 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openAssignOrdersDialog(scope.row);
        }
    };
    __VLS_379.slots.default;
    var __VLS_379;
    if (__VLS_ctx.nextPlanStatuses(scope.row.status).length) {
        const __VLS_384 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_386 = __VLS_385({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_385));
        let __VLS_388;
        let __VLS_389;
        let __VLS_390;
        const __VLS_391 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.nextPlanStatuses(scope.row.status).length))
                    return;
                __VLS_ctx.openPlanStatusDialog(scope.row);
            }
        };
        __VLS_387.slots.default;
        var __VLS_387;
    }
}
var __VLS_367;
var __VLS_339;
var __VLS_247;
var __VLS_3;
const __VLS_392 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_393 = __VLS_asFunctionalComponent(__VLS_392, new __VLS_392({
    modelValue: (__VLS_ctx.batchDialogVisible),
    title: "创建批次调度",
    width: "760px",
}));
const __VLS_394 = __VLS_393({
    modelValue: (__VLS_ctx.batchDialogVisible),
    title: "创建批次调度",
    width: "760px",
}, ...__VLS_functionalComponentArgsRest(__VLS_393));
__VLS_395.slots.default;
const __VLS_396 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_397 = __VLS_asFunctionalComponent(__VLS_396, new __VLS_396({
    ref: "batchFormRef",
    model: (__VLS_ctx.batchForm),
    rules: (__VLS_ctx.batchRules),
    labelPosition: "top",
}));
const __VLS_398 = __VLS_397({
    ref: "batchFormRef",
    model: (__VLS_ctx.batchForm),
    rules: (__VLS_ctx.batchRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_397));
/** @type {typeof __VLS_ctx.batchFormRef} */ ;
var __VLS_400 = {};
__VLS_399.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-form-grid" },
});
const __VLS_402 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_403 = __VLS_asFunctionalComponent(__VLS_402, new __VLS_402({
    label: "批次名称",
    prop: "batch_name",
}));
const __VLS_404 = __VLS_403({
    label: "批次名称",
    prop: "batch_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_403));
__VLS_405.slots.default;
const __VLS_406 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_407 = __VLS_asFunctionalComponent(__VLS_406, new __VLS_406({
    modelValue: (__VLS_ctx.batchForm.batch_name),
    placeholder: "请输入批次名称",
}));
const __VLS_408 = __VLS_407({
    modelValue: (__VLS_ctx.batchForm.batch_name),
    placeholder: "请输入批次名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_407));
var __VLS_405;
const __VLS_410 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_411 = __VLS_asFunctionalComponent(__VLS_410, new __VLS_410({
    label: "计划发车时间",
    prop: "planned_time",
}));
const __VLS_412 = __VLS_411({
    label: "计划发车时间",
    prop: "planned_time",
}, ...__VLS_functionalComponentArgsRest(__VLS_411));
__VLS_413.slots.default;
const __VLS_414 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_415 = __VLS_asFunctionalComponent(__VLS_414, new __VLS_414({
    modelValue: (__VLS_ctx.batchForm.planned_time),
    type: "datetime",
    valueFormat: "x",
    placeholder: "请选择发车时间",
    ...{ style: {} },
}));
const __VLS_416 = __VLS_415({
    modelValue: (__VLS_ctx.batchForm.planned_time),
    type: "datetime",
    valueFormat: "x",
    placeholder: "请选择发车时间",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_415));
var __VLS_413;
const __VLS_418 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_419 = __VLS_asFunctionalComponent(__VLS_418, new __VLS_418({
    label: "车辆",
    prop: "vehicle_id",
}));
const __VLS_420 = __VLS_419({
    label: "车辆",
    prop: "vehicle_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_419));
__VLS_421.slots.default;
const __VLS_422 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_423 = __VLS_asFunctionalComponent(__VLS_422, new __VLS_422({
    modelValue: (__VLS_ctx.batchForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}));
const __VLS_424 = __VLS_423({
    modelValue: (__VLS_ctx.batchForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_423));
__VLS_425.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_426 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_427 = __VLS_asFunctionalComponent(__VLS_426, new __VLS_426({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_428 = __VLS_427({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_427));
}
var __VLS_425;
var __VLS_421;
const __VLS_430 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_431 = __VLS_asFunctionalComponent(__VLS_430, new __VLS_430({
    label: "司机",
    prop: "driver_id",
}));
const __VLS_432 = __VLS_431({
    label: "司机",
    prop: "driver_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_431));
__VLS_433.slots.default;
const __VLS_434 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
    modelValue: (__VLS_ctx.batchForm.driver_id),
    placeholder: "请选择司机",
    ...{ style: {} },
}));
const __VLS_436 = __VLS_435({
    modelValue: (__VLS_ctx.batchForm.driver_id),
    placeholder: "请选择司机",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_435));
__VLS_437.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_438 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_440 = __VLS_439({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_439));
}
var __VLS_437;
var __VLS_433;
const __VLS_442 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({
    label: "订单",
    prop: "order_ids",
    ...{ class: "dispatch-form-grid__wide" },
}));
const __VLS_444 = __VLS_443({
    label: "订单",
    prop: "order_ids",
    ...{ class: "dispatch-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_443));
__VLS_445.slots.default;
const __VLS_446 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_447 = __VLS_asFunctionalComponent(__VLS_446, new __VLS_446({
    modelValue: (__VLS_ctx.batchForm.order_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择订单",
    ...{ style: {} },
}));
const __VLS_448 = __VLS_447({
    modelValue: (__VLS_ctx.batchForm.order_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择订单",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_447));
__VLS_449.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderOptions))) {
    const __VLS_450 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }));
    const __VLS_452 = __VLS_451({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_451));
}
var __VLS_449;
var __VLS_445;
const __VLS_454 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_455 = __VLS_asFunctionalComponent(__VLS_454, new __VLS_454({
    label: "备注",
    ...{ class: "dispatch-form-grid__wide" },
}));
const __VLS_456 = __VLS_455({
    label: "备注",
    ...{ class: "dispatch-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_455));
__VLS_457.slots.default;
const __VLS_458 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
    modelValue: (__VLS_ctx.batchForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入批次备注",
}));
const __VLS_460 = __VLS_459({
    modelValue: (__VLS_ctx.batchForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入批次备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_459));
var __VLS_457;
var __VLS_399;
{
    const { footer: __VLS_thisSlot } = __VLS_395.slots;
    const __VLS_462 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_463 = __VLS_asFunctionalComponent(__VLS_462, new __VLS_462({
        ...{ 'onClick': {} },
    }));
    const __VLS_464 = __VLS_463({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_463));
    let __VLS_466;
    let __VLS_467;
    let __VLS_468;
    const __VLS_469 = {
        onClick: (...[$event]) => {
            __VLS_ctx.batchDialogVisible = false;
        }
    };
    __VLS_465.slots.default;
    var __VLS_465;
    const __VLS_470 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_471 = __VLS_asFunctionalComponent(__VLS_470, new __VLS_470({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.batchSubmitting),
    }));
    const __VLS_472 = __VLS_471({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.batchSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_471));
    let __VLS_474;
    let __VLS_475;
    let __VLS_476;
    const __VLS_477 = {
        onClick: (__VLS_ctx.submitBatchDialog)
    };
    __VLS_473.slots.default;
    var __VLS_473;
}
var __VLS_395;
const __VLS_478 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_479 = __VLS_asFunctionalComponent(__VLS_478, new __VLS_478({
    modelValue: (__VLS_ctx.batchStatusDialogVisible),
    title: "更新批次状态",
    width: "460px",
}));
const __VLS_480 = __VLS_479({
    modelValue: (__VLS_ctx.batchStatusDialogVisible),
    title: "更新批次状态",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_479));
__VLS_481.slots.default;
const __VLS_482 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
    labelPosition: "top",
}));
const __VLS_484 = __VLS_483({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_483));
__VLS_485.slots.default;
const __VLS_486 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_487 = __VLS_asFunctionalComponent(__VLS_486, new __VLS_486({
    label: "目标状态",
}));
const __VLS_488 = __VLS_487({
    label: "目标状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_487));
__VLS_489.slots.default;
const __VLS_490 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_491 = __VLS_asFunctionalComponent(__VLS_490, new __VLS_490({
    modelValue: (__VLS_ctx.batchStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}));
const __VLS_492 = __VLS_491({
    modelValue: (__VLS_ctx.batchStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_491));
__VLS_493.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.currentBatchStatusOptions))) {
    const __VLS_494 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_495 = __VLS_asFunctionalComponent(__VLS_494, new __VLS_494({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_496 = __VLS_495({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_495));
}
var __VLS_493;
var __VLS_489;
const __VLS_498 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_499 = __VLS_asFunctionalComponent(__VLS_498, new __VLS_498({
    label: "备注",
}));
const __VLS_500 = __VLS_499({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_499));
__VLS_501.slots.default;
const __VLS_502 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_503 = __VLS_asFunctionalComponent(__VLS_502, new __VLS_502({
    modelValue: (__VLS_ctx.batchStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态备注",
}));
const __VLS_504 = __VLS_503({
    modelValue: (__VLS_ctx.batchStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_503));
var __VLS_501;
var __VLS_485;
{
    const { footer: __VLS_thisSlot } = __VLS_481.slots;
    const __VLS_506 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_507 = __VLS_asFunctionalComponent(__VLS_506, new __VLS_506({
        ...{ 'onClick': {} },
    }));
    const __VLS_508 = __VLS_507({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_507));
    let __VLS_510;
    let __VLS_511;
    let __VLS_512;
    const __VLS_513 = {
        onClick: (...[$event]) => {
            __VLS_ctx.batchStatusDialogVisible = false;
        }
    };
    __VLS_509.slots.default;
    var __VLS_509;
    const __VLS_514 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_515 = __VLS_asFunctionalComponent(__VLS_514, new __VLS_514({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.batchStatusSubmitting),
        disabled: (!__VLS_ctx.batchStatusForm.status),
    }));
    const __VLS_516 = __VLS_515({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.batchStatusSubmitting),
        disabled: (!__VLS_ctx.batchStatusForm.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_515));
    let __VLS_518;
    let __VLS_519;
    let __VLS_520;
    const __VLS_521 = {
        onClick: (__VLS_ctx.submitBatchStatus)
    };
    __VLS_517.slots.default;
    var __VLS_517;
}
var __VLS_481;
const __VLS_522 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_523 = __VLS_asFunctionalComponent(__VLS_522, new __VLS_522({
    modelValue: (__VLS_ctx.planDialogVisible),
    title: (__VLS_ctx.planDialogMode === 'create' ? '创建运输计划' : '编辑运输计划'),
    width: "820px",
}));
const __VLS_524 = __VLS_523({
    modelValue: (__VLS_ctx.planDialogVisible),
    title: (__VLS_ctx.planDialogMode === 'create' ? '创建运输计划' : '编辑运输计划'),
    width: "820px",
}, ...__VLS_functionalComponentArgsRest(__VLS_523));
__VLS_525.slots.default;
const __VLS_526 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_527 = __VLS_asFunctionalComponent(__VLS_526, new __VLS_526({
    ref: "planFormRef",
    model: (__VLS_ctx.planForm),
    rules: (__VLS_ctx.planRules),
    labelPosition: "top",
}));
const __VLS_528 = __VLS_527({
    ref: "planFormRef",
    model: (__VLS_ctx.planForm),
    rules: (__VLS_ctx.planRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_527));
/** @type {typeof __VLS_ctx.planFormRef} */ ;
var __VLS_530 = {};
__VLS_529.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dispatch-form-grid" },
});
const __VLS_532 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_533 = __VLS_asFunctionalComponent(__VLS_532, new __VLS_532({
    label: "计划名称",
    prop: "plan_name",
}));
const __VLS_534 = __VLS_533({
    label: "计划名称",
    prop: "plan_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_533));
__VLS_535.slots.default;
const __VLS_536 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
    modelValue: (__VLS_ctx.planForm.plan_name),
    placeholder: "请输入计划名称",
}));
const __VLS_538 = __VLS_537({
    modelValue: (__VLS_ctx.planForm.plan_name),
    placeholder: "请输入计划名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_537));
var __VLS_535;
const __VLS_540 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_541 = __VLS_asFunctionalComponent(__VLS_540, new __VLS_540({
    label: "计划时间",
    prop: "plan_date",
}));
const __VLS_542 = __VLS_541({
    label: "计划时间",
    prop: "plan_date",
}, ...__VLS_functionalComponentArgsRest(__VLS_541));
__VLS_543.slots.default;
const __VLS_544 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_545 = __VLS_asFunctionalComponent(__VLS_544, new __VLS_544({
    modelValue: (__VLS_ctx.planForm.plan_date),
    type: "datetime",
    valueFormat: "x",
    placeholder: "请选择计划时间",
    ...{ style: {} },
}));
const __VLS_546 = __VLS_545({
    modelValue: (__VLS_ctx.planForm.plan_date),
    type: "datetime",
    valueFormat: "x",
    placeholder: "请选择计划时间",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_545));
var __VLS_543;
const __VLS_548 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_549 = __VLS_asFunctionalComponent(__VLS_548, new __VLS_548({
    label: "车辆",
    prop: "vehicle_id",
}));
const __VLS_550 = __VLS_549({
    label: "车辆",
    prop: "vehicle_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_549));
__VLS_551.slots.default;
const __VLS_552 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_553 = __VLS_asFunctionalComponent(__VLS_552, new __VLS_552({
    modelValue: (__VLS_ctx.planForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}));
const __VLS_554 = __VLS_553({
    modelValue: (__VLS_ctx.planForm.vehicle_id),
    placeholder: "请选择车辆",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_553));
__VLS_555.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.vehicleOptions))) {
    const __VLS_556 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_557 = __VLS_asFunctionalComponent(__VLS_556, new __VLS_556({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }));
    const __VLS_558 = __VLS_557({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.plate_number)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_557));
}
var __VLS_555;
var __VLS_551;
const __VLS_560 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_561 = __VLS_asFunctionalComponent(__VLS_560, new __VLS_560({
    label: "司机",
    prop: "driver_id",
}));
const __VLS_562 = __VLS_561({
    label: "司机",
    prop: "driver_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_561));
__VLS_563.slots.default;
const __VLS_564 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_565 = __VLS_asFunctionalComponent(__VLS_564, new __VLS_564({
    modelValue: (__VLS_ctx.planForm.driver_id),
    placeholder: "请选择司机",
    ...{ style: {} },
}));
const __VLS_566 = __VLS_565({
    modelValue: (__VLS_ctx.planForm.driver_id),
    placeholder: "请选择司机",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_565));
__VLS_567.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.driverOptions))) {
    const __VLS_568 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_569 = __VLS_asFunctionalComponent(__VLS_568, new __VLS_568({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_570 = __VLS_569({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_569));
}
var __VLS_567;
var __VLS_563;
const __VLS_572 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_573 = __VLS_asFunctionalComponent(__VLS_572, new __VLS_572({
    label: "起点",
    prop: "start_point",
}));
const __VLS_574 = __VLS_573({
    label: "起点",
    prop: "start_point",
}, ...__VLS_functionalComponentArgsRest(__VLS_573));
__VLS_575.slots.default;
const __VLS_576 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_577 = __VLS_asFunctionalComponent(__VLS_576, new __VLS_576({
    modelValue: (__VLS_ctx.planForm.start_point),
    placeholder: "请输入起点",
}));
const __VLS_578 = __VLS_577({
    modelValue: (__VLS_ctx.planForm.start_point),
    placeholder: "请输入起点",
}, ...__VLS_functionalComponentArgsRest(__VLS_577));
var __VLS_575;
const __VLS_580 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_581 = __VLS_asFunctionalComponent(__VLS_580, new __VLS_580({
    label: "终点",
    prop: "end_point",
}));
const __VLS_582 = __VLS_581({
    label: "终点",
    prop: "end_point",
}, ...__VLS_functionalComponentArgsRest(__VLS_581));
__VLS_583.slots.default;
const __VLS_584 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_585 = __VLS_asFunctionalComponent(__VLS_584, new __VLS_584({
    modelValue: (__VLS_ctx.planForm.end_point),
    placeholder: "请输入终点",
}));
const __VLS_586 = __VLS_585({
    modelValue: (__VLS_ctx.planForm.end_point),
    placeholder: "请输入终点",
}, ...__VLS_functionalComponentArgsRest(__VLS_585));
var __VLS_583;
const __VLS_588 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_589 = __VLS_asFunctionalComponent(__VLS_588, new __VLS_588({
    label: "里程(km)",
}));
const __VLS_590 = __VLS_589({
    label: "里程(km)",
}, ...__VLS_functionalComponentArgsRest(__VLS_589));
__VLS_591.slots.default;
const __VLS_592 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_593 = __VLS_asFunctionalComponent(__VLS_592, new __VLS_592({
    modelValue: (__VLS_ctx.planForm.distance),
    min: (0),
    step: (1),
    precision: (1),
    ...{ style: {} },
}));
const __VLS_594 = __VLS_593({
    modelValue: (__VLS_ctx.planForm.distance),
    min: (0),
    step: (1),
    precision: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_593));
var __VLS_591;
const __VLS_596 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_597 = __VLS_asFunctionalComponent(__VLS_596, new __VLS_596({
    label: "预计耗时(小时)",
}));
const __VLS_598 = __VLS_597({
    label: "预计耗时(小时)",
}, ...__VLS_functionalComponentArgsRest(__VLS_597));
__VLS_599.slots.default;
const __VLS_600 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_601 = __VLS_asFunctionalComponent(__VLS_600, new __VLS_600({
    modelValue: (__VLS_ctx.planForm.estimated_hours),
    min: (0),
    step: (1),
    ...{ style: {} },
}));
const __VLS_602 = __VLS_601({
    modelValue: (__VLS_ctx.planForm.estimated_hours),
    min: (0),
    step: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_601));
var __VLS_599;
const __VLS_604 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_605 = __VLS_asFunctionalComponent(__VLS_604, new __VLS_604({
    label: "最大载重",
}));
const __VLS_606 = __VLS_605({
    label: "最大载重",
}, ...__VLS_functionalComponentArgsRest(__VLS_605));
__VLS_607.slots.default;
const __VLS_608 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_609 = __VLS_asFunctionalComponent(__VLS_608, new __VLS_608({
    modelValue: (__VLS_ctx.planForm.max_capacity),
    min: (0),
    step: (0.5),
    precision: (1),
    ...{ style: {} },
}));
const __VLS_610 = __VLS_609({
    modelValue: (__VLS_ctx.planForm.max_capacity),
    min: (0),
    step: (0.5),
    precision: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_609));
var __VLS_607;
const __VLS_612 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_613 = __VLS_asFunctionalComponent(__VLS_612, new __VLS_612({
    label: "途经点(JSON)",
    ...{ class: "dispatch-form-grid__wide" },
}));
const __VLS_614 = __VLS_613({
    label: "途经点(JSON)",
    ...{ class: "dispatch-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_613));
__VLS_615.slots.default;
const __VLS_616 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_617 = __VLS_asFunctionalComponent(__VLS_616, new __VLS_616({
    modelValue: (__VLS_ctx.planForm.waypoints),
    type: "textarea",
    rows: (3),
    placeholder: '如：["站点A","站点B"]',
}));
const __VLS_618 = __VLS_617({
    modelValue: (__VLS_ctx.planForm.waypoints),
    type: "textarea",
    rows: (3),
    placeholder: '如：["站点A","站点B"]',
}, ...__VLS_functionalComponentArgsRest(__VLS_617));
var __VLS_615;
const __VLS_620 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_621 = __VLS_asFunctionalComponent(__VLS_620, new __VLS_620({
    label: "备注",
    ...{ class: "dispatch-form-grid__wide" },
}));
const __VLS_622 = __VLS_621({
    label: "备注",
    ...{ class: "dispatch-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_621));
__VLS_623.slots.default;
const __VLS_624 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_625 = __VLS_asFunctionalComponent(__VLS_624, new __VLS_624({
    modelValue: (__VLS_ctx.planForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入计划备注",
}));
const __VLS_626 = __VLS_625({
    modelValue: (__VLS_ctx.planForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入计划备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_625));
var __VLS_623;
var __VLS_529;
{
    const { footer: __VLS_thisSlot } = __VLS_525.slots;
    const __VLS_628 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_629 = __VLS_asFunctionalComponent(__VLS_628, new __VLS_628({
        ...{ 'onClick': {} },
    }));
    const __VLS_630 = __VLS_629({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_629));
    let __VLS_632;
    let __VLS_633;
    let __VLS_634;
    const __VLS_635 = {
        onClick: (...[$event]) => {
            __VLS_ctx.planDialogVisible = false;
        }
    };
    __VLS_631.slots.default;
    var __VLS_631;
    const __VLS_636 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_637 = __VLS_asFunctionalComponent(__VLS_636, new __VLS_636({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planSubmitting),
    }));
    const __VLS_638 = __VLS_637({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_637));
    let __VLS_640;
    let __VLS_641;
    let __VLS_642;
    const __VLS_643 = {
        onClick: (__VLS_ctx.submitPlanDialog)
    };
    __VLS_639.slots.default;
    var __VLS_639;
}
var __VLS_525;
const __VLS_644 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_645 = __VLS_asFunctionalComponent(__VLS_644, new __VLS_644({
    modelValue: (__VLS_ctx.planStatusDialogVisible),
    title: "更新计划状态",
    width: "460px",
}));
const __VLS_646 = __VLS_645({
    modelValue: (__VLS_ctx.planStatusDialogVisible),
    title: "更新计划状态",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_645));
__VLS_647.slots.default;
const __VLS_648 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_649 = __VLS_asFunctionalComponent(__VLS_648, new __VLS_648({
    labelPosition: "top",
}));
const __VLS_650 = __VLS_649({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_649));
__VLS_651.slots.default;
const __VLS_652 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_653 = __VLS_asFunctionalComponent(__VLS_652, new __VLS_652({
    label: "目标状态",
}));
const __VLS_654 = __VLS_653({
    label: "目标状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_653));
__VLS_655.slots.default;
const __VLS_656 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_657 = __VLS_asFunctionalComponent(__VLS_656, new __VLS_656({
    modelValue: (__VLS_ctx.planStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}));
const __VLS_658 = __VLS_657({
    modelValue: (__VLS_ctx.planStatusForm.status),
    placeholder: "请选择状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_657));
__VLS_659.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.currentPlanStatusOptions))) {
    const __VLS_660 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_661 = __VLS_asFunctionalComponent(__VLS_660, new __VLS_660({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_662 = __VLS_661({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_661));
}
var __VLS_659;
var __VLS_655;
const __VLS_664 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_665 = __VLS_asFunctionalComponent(__VLS_664, new __VLS_664({
    label: "备注",
}));
const __VLS_666 = __VLS_665({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_665));
__VLS_667.slots.default;
const __VLS_668 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_669 = __VLS_asFunctionalComponent(__VLS_668, new __VLS_668({
    modelValue: (__VLS_ctx.planStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态备注",
}));
const __VLS_670 = __VLS_669({
    modelValue: (__VLS_ctx.planStatusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写状态备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_669));
var __VLS_667;
var __VLS_651;
{
    const { footer: __VLS_thisSlot } = __VLS_647.slots;
    const __VLS_672 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_673 = __VLS_asFunctionalComponent(__VLS_672, new __VLS_672({
        ...{ 'onClick': {} },
    }));
    const __VLS_674 = __VLS_673({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_673));
    let __VLS_676;
    let __VLS_677;
    let __VLS_678;
    const __VLS_679 = {
        onClick: (...[$event]) => {
            __VLS_ctx.planStatusDialogVisible = false;
        }
    };
    __VLS_675.slots.default;
    var __VLS_675;
    const __VLS_680 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_681 = __VLS_asFunctionalComponent(__VLS_680, new __VLS_680({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planStatusSubmitting),
        disabled: (!__VLS_ctx.planStatusForm.status),
    }));
    const __VLS_682 = __VLS_681({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.planStatusSubmitting),
        disabled: (!__VLS_ctx.planStatusForm.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_681));
    let __VLS_684;
    let __VLS_685;
    let __VLS_686;
    const __VLS_687 = {
        onClick: (__VLS_ctx.submitPlanStatus)
    };
    __VLS_683.slots.default;
    var __VLS_683;
}
var __VLS_647;
const __VLS_688 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_689 = __VLS_asFunctionalComponent(__VLS_688, new __VLS_688({
    modelValue: (__VLS_ctx.assignOrdersDialogVisible),
    title: "订单加入运输计划",
    width: "680px",
}));
const __VLS_690 = __VLS_689({
    modelValue: (__VLS_ctx.assignOrdersDialogVisible),
    title: "订单加入运输计划",
    width: "680px",
}, ...__VLS_functionalComponentArgsRest(__VLS_689));
__VLS_691.slots.default;
const __VLS_692 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_693 = __VLS_asFunctionalComponent(__VLS_692, new __VLS_692({
    labelPosition: "top",
}));
const __VLS_694 = __VLS_693({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_693));
__VLS_695.slots.default;
const __VLS_696 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_697 = __VLS_asFunctionalComponent(__VLS_696, new __VLS_696({
    label: "订单列表",
}));
const __VLS_698 = __VLS_697({
    label: "订单列表",
}, ...__VLS_functionalComponentArgsRest(__VLS_697));
__VLS_699.slots.default;
const __VLS_700 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_701 = __VLS_asFunctionalComponent(__VLS_700, new __VLS_700({
    modelValue: (__VLS_ctx.assignOrdersForm.order_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择订单",
    ...{ style: {} },
}));
const __VLS_702 = __VLS_701({
    modelValue: (__VLS_ctx.assignOrdersForm.order_ids),
    multiple: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    placeholder: "请选择订单",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_701));
__VLS_703.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderOptions))) {
    const __VLS_704 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_705 = __VLS_asFunctionalComponent(__VLS_704, new __VLS_704({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }));
    const __VLS_706 = __VLS_705({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_705));
}
var __VLS_703;
var __VLS_699;
var __VLS_695;
{
    const { footer: __VLS_thisSlot } = __VLS_691.slots;
    const __VLS_708 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_709 = __VLS_asFunctionalComponent(__VLS_708, new __VLS_708({
        ...{ 'onClick': {} },
    }));
    const __VLS_710 = __VLS_709({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_709));
    let __VLS_712;
    let __VLS_713;
    let __VLS_714;
    const __VLS_715 = {
        onClick: (...[$event]) => {
            __VLS_ctx.assignOrdersDialogVisible = false;
        }
    };
    __VLS_711.slots.default;
    var __VLS_711;
    const __VLS_716 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_717 = __VLS_asFunctionalComponent(__VLS_716, new __VLS_716({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.assignOrdersSubmitting),
        disabled: (!__VLS_ctx.assignOrdersForm.order_ids.length),
    }));
    const __VLS_718 = __VLS_717({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.assignOrdersSubmitting),
        disabled: (!__VLS_ctx.assignOrdersForm.order_ids.length),
    }, ...__VLS_functionalComponentArgsRest(__VLS_717));
    let __VLS_720;
    let __VLS_721;
    let __VLS_722;
    const __VLS_723 = {
        onClick: (__VLS_ctx.submitAssignOrders)
    };
    __VLS_719.slots.default;
    var __VLS_719;
}
var __VLS_691;
/** @type {__VLS_StyleScopedClasses['dispatch-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-layout--optimize']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['result-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--dispatch-small']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['result-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['route-list']} */ ;
/** @type {__VLS_StyleScopedClasses['route-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--dispatch-small']} */ ;
/** @type {__VLS_StyleScopedClasses['result-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['tip-text']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-table']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-table']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['dispatch-form-grid__wide']} */ ;
// @ts-ignore
var __VLS_401 = __VLS_400, __VLS_531 = __VLS_530;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            batchStatusOptions: batchStatusOptions,
            planStatusOptions: planStatusOptions,
            activeTab: activeTab,
            batches: batches,
            plans: plans,
            suggestions: suggestions,
            unassignedOrders: unassignedOrders,
            optimizeResult: optimizeResult,
            batchLoading: batchLoading,
            planLoading: planLoading,
            optimizing: optimizing,
            suggesting: suggesting,
            batchSubmitting: batchSubmitting,
            batchStatusSubmitting: batchStatusSubmitting,
            planSubmitting: planSubmitting,
            planStatusSubmitting: planStatusSubmitting,
            assignOrdersSubmitting: assignOrdersSubmitting,
            optimizeForm: optimizeForm,
            suggestionForm: suggestionForm,
            suggestionSummary: suggestionSummary,
            suggestionLoaded: suggestionLoaded,
            batchFilters: batchFilters,
            planFilters: planFilters,
            batchDialogVisible: batchDialogVisible,
            batchFormRef: batchFormRef,
            batchForm: batchForm,
            batchRules: batchRules,
            batchStatusDialogVisible: batchStatusDialogVisible,
            batchStatusForm: batchStatusForm,
            planDialogVisible: planDialogVisible,
            planDialogMode: planDialogMode,
            planFormRef: planFormRef,
            planForm: planForm,
            planRules: planRules,
            planStatusDialogVisible: planStatusDialogVisible,
            planStatusForm: planStatusForm,
            assignOrdersDialogVisible: assignOrdersDialogVisible,
            assignOrdersForm: assignOrdersForm,
            stationOptions: stationOptions,
            vehicleOptions: vehicleOptions,
            orderOptions: orderOptions,
            driverOptions: driverOptions,
            topVehicles: topVehicles,
            currentBatchStatusOptions: currentBatchStatusOptions,
            currentPlanStatusOptions: currentPlanStatusOptions,
            normalizeText: normalizeText,
            displayUserName: displayUserName,
            formatUnix: formatUnix,
            dispatchStatusTagType: dispatchStatusTagType,
            nextBatchStatuses: nextBatchStatuses,
            nextPlanStatuses: nextPlanStatuses,
            loadSupportOptions: loadSupportOptions,
            loadBatches: loadBatches,
            loadPlans: loadPlans,
            submitOptimize: submitOptimize,
            submitSuggestion: submitSuggestion,
            openBatchDialog: openBatchDialog,
            submitBatchDialog: submitBatchDialog,
            openBatchStatusDialog: openBatchStatusDialog,
            submitBatchStatus: submitBatchStatus,
            printBatchList: printBatchList,
            openPlanDialog: openPlanDialog,
            submitPlanDialog: submitPlanDialog,
            openPlanStatusDialog: openPlanStatusDialog,
            submitPlanStatus: submitPlanStatus,
            openAssignOrdersDialog: openAssignOrdersDialog,
            submitAssignOrders: submitAssignOrders,
            applyBatchFilters: applyBatchFilters,
            resetBatchFilters: resetBatchFilters,
            applyPlanFilters: applyPlanFilters,
            resetPlanFilters: resetPlanFilters,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
