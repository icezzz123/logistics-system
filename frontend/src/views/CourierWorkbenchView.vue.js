import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import http from '@/utils/http';
const authStore = useAuthStore();
const isCourier = computed(() => authStore.user?.role === 2);
const canCreatePickup = computed(() => authStore.permissions.includes('pickup:create'));
const canCreateDelivery = computed(() => authStore.permissions.includes('delivery:create'));
const workbenchMode = ref('pickup');
const stationOptions = ref([]);
const pickupSummary = reactive({ pending_pool: 0, pending_assigned: 0, picking_up: 0, picked_up: 0, failed: 0, total: 0 });
const deliverySummary = reactive({ pending_pool: 0, pending_assigned: 0, delivering: 0, delivered: 0, signed: 0, failed: 0, total: 0 });
const pickupTasks = ref([]);
const deliveryTasks = ref([]);
const pickupLoading = ref(false);
const deliveryLoading = ref(false);
const pickupCreateLoading = ref(false);
const deliveryCreateLoading = ref(false);
const failSubmitting = ref(false);
const signSubmitting = ref(false);
const pickupPagination = reactive({ page: 1, pageSize: 10, total: 0 });
const deliveryPagination = reactive({ page: 1, pageSize: 10, total: 0 });
const pickupFilters = reactive({ task_no: '', order_no: '', station_id: undefined });
const deliveryFilters = reactive({ task_no: '', order_no: '', station_id: undefined });
const pickupCreateForm = reactive({ order_no: '', station_id: undefined, remark: '' });
const deliveryCreateForm = reactive({ order_no: '', station_id: undefined, remark: '' });
const pickupActiveTab = ref('all');
const deliveryActiveTab = ref('all');
const selectedRow = ref(null);
const failDialogVisible = ref(false);
const signDialogVisible = ref(false);
const failForm = reactive({ exception_type: 7, reason: '', remark: '' });
const signForm = reactive({ sign_type: 1, signer_name: '', signer_phone: '', relation: '', remark: '' });
const currentCanCreate = computed(() => (workbenchMode.value === 'pickup' ? canCreatePickup.value : canCreateDelivery.value));
const currentCreateForm = computed(() => (workbenchMode.value === 'pickup' ? pickupCreateForm : deliveryCreateForm));
const currentCreateLoading = computed(() => (workbenchMode.value === 'pickup' ? pickupCreateLoading.value : deliveryCreateLoading.value));
const currentFilters = computed(() => (workbenchMode.value === 'pickup' ? pickupFilters : deliveryFilters));
const currentLoading = computed(() => (workbenchMode.value === 'pickup' ? pickupLoading.value : deliveryLoading.value));
const currentPagination = computed(() => (workbenchMode.value === 'pickup' ? pickupPagination : deliveryPagination));
const pickupTabOptions = computed(() => isCourier.value
    ? [
        { value: 'pool', label: `待认领 ${pickupSummary.pending_pool}` },
        { value: 'my-pending', label: `我的待揽收 ${pickupSummary.pending_assigned}` },
        { value: 'picking', label: `揽收中 ${pickupSummary.picking_up}` },
        { value: 'picked', label: `已揽收 ${pickupSummary.picked_up}` },
        { value: 'failed', label: `揽收失败 ${pickupSummary.failed}` },
    ]
    : [
        { value: 'all', label: `全部任务 ${pickupSummary.total}` },
        { value: 'pool', label: `待认领 ${pickupSummary.pending_pool}` },
        { value: 'my-pending', label: `待揽收 ${pickupSummary.pending_pool + pickupSummary.pending_assigned}` },
        { value: 'picking', label: `揽收中 ${pickupSummary.picking_up}` },
        { value: 'picked', label: `已揽收 ${pickupSummary.picked_up}` },
        { value: 'failed', label: `揽收失败 ${pickupSummary.failed}` },
    ]);
const deliveryTabOptions = computed(() => isCourier.value
    ? [
        { value: 'pool', label: `待认领 ${deliverySummary.pending_pool}` },
        { value: 'my-pending', label: `我的待派送 ${deliverySummary.pending_assigned}` },
        { value: 'delivering', label: `派送中 ${deliverySummary.delivering}` },
        { value: 'delivered', label: `待签收 ${deliverySummary.delivered}` },
        { value: 'signed', label: `已签收 ${deliverySummary.signed}` },
        { value: 'failed', label: `派送失败 ${deliverySummary.failed}` },
    ]
    : [
        { value: 'all', label: `全部任务 ${deliverySummary.total}` },
        { value: 'pool', label: `待认领 ${deliverySummary.pending_pool}` },
        { value: 'my-pending', label: `待派送 ${deliverySummary.pending_pool + deliverySummary.pending_assigned}` },
        { value: 'delivering', label: `派送中 ${deliverySummary.delivering}` },
        { value: 'delivered', label: `待签收 ${deliverySummary.delivered}` },
        { value: 'signed', label: `已签收 ${deliverySummary.signed}` },
        { value: 'failed', label: `派送失败 ${deliverySummary.failed}` },
    ]);
const currentTabOptions = computed(() => (workbenchMode.value === 'pickup' ? pickupTabOptions.value : deliveryTabOptions.value));
const activeTabValue = computed({
    get: () => (workbenchMode.value === 'pickup' ? pickupActiveTab.value : deliveryActiveTab.value),
    set: (value) => {
        if (workbenchMode.value === 'pickup')
            pickupActiveTab.value = value;
        else
            deliveryActiveTab.value = value;
    },
});
const currentActiveLabel = computed(() => currentTabOptions.value.find((item) => item.value === activeTabValue.value)?.label || '任务列表');
const currentRows = computed(() => workbenchMode.value === 'pickup'
    ? pickupTasks.value.map((item) => ({
        id: item.id, task_no: item.task_no, order_no: item.order_no, courier_id: item.courier_id, courier_name: item.courier_name, station_name: item.station_name,
        status: item.status, status_name: item.status_name, order_status_name: item.order_status_name, contact_name: item.sender_name, contact_phone: item.sender_phone,
        address: item.sender_address, assign_time: item.assign_time, start_time: item.start_time, finish_time: item.pickup_time, failure_reason: item.failure_reason, remark: item.remark,
    }))
    : deliveryTasks.value.map((item) => ({
        id: item.id, task_no: item.task_no, order_no: item.order_no, courier_id: item.courier_id, courier_name: item.courier_name, station_name: item.station_name,
        status: item.status, status_name: item.status_name, order_status_name: item.order_status_name, contact_name: item.receiver_name, contact_phone: item.receiver_phone,
        address: item.receiver_address, assign_time: item.assign_time, start_time: item.start_time, finish_time: item.delivered_time, failure_reason: item.failure_reason, remark: item.remark,
    })));
const currentStatCards = computed(() => workbenchMode.value === 'pickup'
    ? [
        { label: '待认领', value: pickupSummary.pending_pool },
        { label: isCourier.value ? '我的待揽收' : '待揽收', value: isCourier.value ? pickupSummary.pending_assigned : pickupSummary.pending_pool + pickupSummary.pending_assigned },
        { label: '揽收中', value: pickupSummary.picking_up },
        { label: '已揽收', value: pickupSummary.picked_up },
        { label: '揽收失败', value: pickupSummary.failed },
    ]
    : [
        { label: '待认领', value: deliverySummary.pending_pool },
        { label: isCourier.value ? '我的待派送' : '待派送', value: isCourier.value ? deliverySummary.pending_assigned : deliverySummary.pending_pool + deliverySummary.pending_assigned },
        { label: '派送中', value: deliverySummary.delivering },
        { label: '待签收', value: deliverySummary.delivered },
        { label: '已签收', value: deliverySummary.signed },
        { label: '派送失败', value: deliverySummary.failed },
    ]);
const failTypeOptions = computed(() => workbenchMode.value === 'pickup'
    ? [{ value: 5, label: '地址错误' }, { value: 7, label: '其他' }]
    : [{ value: 4, label: '拒收' }, { value: 5, label: '地址错误' }, { value: 7, label: '其他' }]);
const signTypeOptions = [
    { value: 1, label: '本人签收' },
    { value: 2, label: '代收' },
    { value: 3, label: '快递柜' },
    { value: 4, label: '驿站' },
    { value: 5, label: '拒收' },
];
function normalizeText(value, fallback = '-') {
    const text = String(value ?? '').trim();
    return text ? text : fallback;
}
function formatUnix(value) {
    if (!value)
        return '-';
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false });
}
function tagType(status) {
    return {
        pending: 'warning',
        picking_up: 'primary',
        picked_up: 'success',
        delivering: 'primary',
        delivered: 'success',
        signed: 'success',
        failed: 'danger',
    }[status] || 'info';
}
function buildPickupQuery() {
    const params = { page: pickupPagination.page, page_size: pickupPagination.pageSize };
    if (pickupFilters.task_no.trim())
        params.task_no = pickupFilters.task_no.trim();
    if (pickupFilters.order_no.trim())
        params.order_no = pickupFilters.order_no.trim();
    if (typeof pickupFilters.station_id === 'number')
        params.station_id = pickupFilters.station_id;
    switch (pickupActiveTab.value) {
        case 'pool':
            params.scope = 'pool';
            params.status = 'pending';
            break;
        case 'my-pending':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'pending';
            break;
        case 'picking':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'picking_up';
            break;
        case 'picked':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'picked_up';
            break;
        case 'failed':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'failed';
            break;
        default: params.scope = 'all';
    }
    return params;
}
function buildDeliveryQuery() {
    const params = { page: deliveryPagination.page, page_size: deliveryPagination.pageSize };
    if (deliveryFilters.task_no.trim())
        params.task_no = deliveryFilters.task_no.trim();
    if (deliveryFilters.order_no.trim())
        params.order_no = deliveryFilters.order_no.trim();
    if (typeof deliveryFilters.station_id === 'number')
        params.station_id = deliveryFilters.station_id;
    switch (deliveryActiveTab.value) {
        case 'pool':
            params.scope = 'pool';
            params.status = 'pending';
            break;
        case 'my-pending':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'pending';
            break;
        case 'delivering':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'delivering';
            break;
        case 'delivered':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'delivered';
            break;
        case 'signed':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'signed';
            break;
        case 'failed':
            params.scope = isCourier.value ? 'my' : 'all';
            params.status = 'failed';
            break;
        default: params.scope = 'all';
    }
    return params;
}
async function loadStations() {
    if (!canCreatePickup.value && !canCreateDelivery.value)
        return;
    const data = await http.get('/stations', { params: { page: 1, page_size: 100, status: 1 } });
    stationOptions.value = data.list || [];
}
async function loadPickupSummary() {
    Object.assign(pickupSummary, await http.get('/pickup/tasks/summary'));
}
async function loadPickupTasks() {
    pickupLoading.value = true;
    try {
        const data = await http.get('/pickup/tasks', { params: buildPickupQuery() });
        pickupTasks.value = data.list || [];
        pickupPagination.total = data.total || 0;
    }
    finally {
        pickupLoading.value = false;
    }
}
async function loadDeliverySummary() {
    Object.assign(deliverySummary, await http.get('/delivery/tasks/summary'));
}
async function loadDeliveryTasks() {
    deliveryLoading.value = true;
    try {
        const data = await http.get('/delivery/tasks', { params: buildDeliveryQuery() });
        deliveryTasks.value = data.list || [];
        deliveryPagination.total = data.total || 0;
    }
    finally {
        deliveryLoading.value = false;
    }
}
async function refreshPickup() { await Promise.all([loadPickupSummary(), loadPickupTasks()]); }
async function refreshDelivery() { await Promise.all([loadDeliverySummary(), loadDeliveryTasks()]); }
async function refreshCurrentMode() { if (workbenchMode.value === 'pickup')
    await refreshPickup();
else
    await refreshDelivery(); }
async function loadCurrentTasks() { if (workbenchMode.value === 'pickup')
    await loadPickupTasks();
else
    await loadDeliveryTasks(); }
function resetCurrentFilters() {
    if (workbenchMode.value === 'pickup') {
        pickupFilters.task_no = '';
        pickupFilters.order_no = '';
        pickupFilters.station_id = undefined;
        pickupPagination.page = 1;
        void loadPickupTasks();
    }
    else {
        deliveryFilters.task_no = '';
        deliveryFilters.order_no = '';
        deliveryFilters.station_id = undefined;
        deliveryPagination.page = 1;
        void loadDeliveryTasks();
    }
}
function handleCurrentPageChange(page) {
    if (workbenchMode.value === 'pickup') {
        pickupPagination.page = page;
        void loadPickupTasks();
    }
    else {
        deliveryPagination.page = page;
        void loadDeliveryTasks();
    }
}
async function submitCreateTask() {
    if (!currentCreateForm.value.order_no.trim()) {
        ElMessage.warning('请输入订单号');
        return;
    }
    if (!currentCreateForm.value.station_id) {
        ElMessage.warning('请选择站点');
        return;
    }
    if (workbenchMode.value === 'pickup') {
        pickupCreateLoading.value = true;
        try {
            await http.post('/pickup/tasks', { order_no: pickupCreateForm.order_no.trim(), station_id: pickupCreateForm.station_id, remark: pickupCreateForm.remark.trim() });
            ElMessage.success('待揽收任务已生成');
            pickupCreateForm.order_no = '';
            pickupCreateForm.station_id = undefined;
            pickupCreateForm.remark = '';
            await refreshPickup();
        }
        finally {
            pickupCreateLoading.value = false;
        }
    }
    else {
        deliveryCreateLoading.value = true;
        try {
            await http.post('/delivery/tasks', { order_no: deliveryCreateForm.order_no.trim(), station_id: deliveryCreateForm.station_id, remark: deliveryCreateForm.remark.trim() });
            ElMessage.success('待派送任务已生成');
            deliveryCreateForm.order_no = '';
            deliveryCreateForm.station_id = undefined;
            deliveryCreateForm.remark = '';
            await refreshDelivery();
        }
        finally {
            deliveryCreateLoading.value = false;
        }
    }
}
function canClaim(row) { return isCourier.value && row.status === 'pending' && !row.courier_id; }
function canStart(row) { return isCourier.value && row.status === 'pending' && row.courier_id === authStore.user?.id; }
function canComplete(row) { return isCourier.value && row.courier_id === authStore.user?.id && ((workbenchMode.value === 'pickup' && row.status === 'picking_up') || (workbenchMode.value === 'delivery' && row.status === 'delivering')); }
function canSign(row) { return workbenchMode.value === 'delivery' && isCourier.value && row.status === 'delivered' && row.courier_id === authStore.user?.id; }
function canFail(row) { return isCourier.value && row.courier_id === authStore.user?.id && ['pending', workbenchMode.value === 'pickup' ? 'picking_up' : 'delivering'].includes(row.status); }
async function claimTask(row) {
    if (workbenchMode.value === 'pickup')
        await http.post(`/pickup/tasks/${row.id}/claim`, {});
    else
        await http.post(`/delivery/tasks/${row.id}/claim`, {});
    ElMessage.success('任务已认领');
    await refreshCurrentMode();
}
async function startTask(row) {
    if (workbenchMode.value === 'pickup')
        await http.post(`/pickup/tasks/${row.id}/start`, {});
    else
        await http.post(`/delivery/tasks/${row.id}/start`, {});
    ElMessage.success(workbenchMode.value === 'pickup' ? '已开始揽收' : '已开始派送');
    await refreshCurrentMode();
}
async function completeTask(row) {
    if (workbenchMode.value === 'pickup')
        await http.post(`/pickup/tasks/${row.id}/complete`, {});
    else
        await http.post(`/delivery/tasks/${row.id}/deliver`, {});
    ElMessage.success(workbenchMode.value === 'pickup' ? '已确认揽收' : '已确认送达');
    await refreshCurrentMode();
}
function openFailDialog(row) {
    selectedRow.value = row;
    failForm.exception_type = workbenchMode.value === 'pickup' ? 7 : 5;
    failForm.reason = '';
    failForm.remark = '';
    failDialogVisible.value = true;
}
async function submitFail() {
    if (!selectedRow.value)
        return;
    if (!failForm.reason.trim()) {
        ElMessage.warning('请输入失败原因');
        return;
    }
    failSubmitting.value = true;
    try {
        if (workbenchMode.value === 'pickup') {
            await http.post(`/pickup/tasks/${selectedRow.value.id}/fail`, { exception_type: failForm.exception_type, reason: failForm.reason.trim(), remark: failForm.remark.trim() });
            ElMessage.success('揽收失败已登记');
            await refreshPickup();
        }
        else {
            await http.post(`/delivery/tasks/${selectedRow.value.id}/fail`, { exception_type: failForm.exception_type, reason: failForm.reason.trim(), remark: failForm.remark.trim() });
            ElMessage.success('派送失败已登记');
            await refreshDelivery();
        }
        failDialogVisible.value = false;
    }
    finally {
        failSubmitting.value = false;
    }
}
function openSignDialog(row) {
    selectedRow.value = row;
    signForm.sign_type = 1;
    signForm.signer_name = row.contact_name || '';
    signForm.signer_phone = row.contact_phone || '';
    signForm.relation = '本人';
    signForm.remark = '';
    signDialogVisible.value = true;
}
async function submitSign() {
    if (!selectedRow.value)
        return;
    signSubmitting.value = true;
    try {
        await http.post(`/delivery/tasks/${selectedRow.value.id}/sign`, {
            sign_type: signForm.sign_type,
            signer_name: signForm.signer_name.trim(),
            signer_phone: signForm.signer_phone.trim(),
            relation: signForm.relation.trim(),
            remark: signForm.remark.trim(),
        });
        ElMessage.success('签收已登记');
        signDialogVisible.value = false;
        await refreshDelivery();
    }
    finally {
        signSubmitting.value = false;
    }
}
watch(workbenchMode, () => {
    if (workbenchMode.value === 'pickup') {
        pickupPagination.page = 1;
        void refreshPickup();
    }
    else {
        deliveryPagination.page = 1;
        void refreshDelivery();
    }
});
watch(pickupActiveTab, () => {
    if (workbenchMode.value === 'pickup') {
        pickupPagination.page = 1;
        void loadPickupTasks();
    }
});
watch(deliveryActiveTab, () => {
    if (workbenchMode.value === 'delivery') {
        deliveryPagination.page = 1;
        void loadDeliveryTasks();
    }
});
onMounted(async () => {
    pickupActiveTab.value = isCourier.value ? 'pool' : 'all';
    deliveryActiveTab.value = isCourier.value ? 'pool' : 'all';
    await Promise.all([loadStations(), refreshPickup(), refreshDelivery()]);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['courier-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero__switch']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero__switch']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "courier-workbench-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "courier-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "courier-hero__switch" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_0 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.workbenchMode),
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.workbenchMode),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "pickup",
}));
const __VLS_6 = __VLS_5({
    label: "pickup",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
var __VLS_7;
const __VLS_8 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    label: "delivery",
}));
const __VLS_10 = __VLS_9({
    label: "delivery",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
var __VLS_11;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "courier-stats card-panel" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.currentStatCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.label),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.value);
}
if (__VLS_ctx.currentCanCreate) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-panel courier-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-panel__toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.workbenchMode === 'pickup' ? '手动生成待揽收任务' : '手动生成待派送任务');
    const __VLS_12 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        ...{ 'onSubmit': {} },
        inline: (true),
        model: (__VLS_ctx.currentCreateForm),
        ...{ class: "courier-filters" },
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onSubmit': {} },
        inline: (true),
        model: (__VLS_ctx.currentCreateForm),
        ...{ class: "courier-filters" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onSubmit: () => { }
    };
    __VLS_15.slots.default;
    const __VLS_20 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        label: "订单号",
    }));
    const __VLS_22 = __VLS_21({
        label: "订单号",
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_23.slots.default;
    const __VLS_24 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        modelValue: (__VLS_ctx.currentCreateForm.order_no),
        clearable: true,
        placeholder: "请输入订单号",
    }));
    const __VLS_26 = __VLS_25({
        modelValue: (__VLS_ctx.currentCreateForm.order_no),
        clearable: true,
        placeholder: "请输入订单号",
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    var __VLS_23;
    const __VLS_28 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        label: "站点",
    }));
    const __VLS_30 = __VLS_29({
        label: "站点",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    __VLS_31.slots.default;
    const __VLS_32 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        modelValue: (__VLS_ctx.currentCreateForm.station_id),
        clearable: true,
        placeholder: "请选择站点",
        ...{ style: {} },
    }));
    const __VLS_34 = __VLS_33({
        modelValue: (__VLS_ctx.currentCreateForm.station_id),
        clearable: true,
        placeholder: "请选择站点",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
    __VLS_35.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
        const __VLS_36 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            key: (item.id),
            label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
            value: (item.id),
        }));
        const __VLS_38 = __VLS_37({
            key: (item.id),
            label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
            value: (item.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    }
    var __VLS_35;
    var __VLS_31;
    const __VLS_40 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        label: "备注",
    }));
    const __VLS_42 = __VLS_41({
        label: "备注",
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
    __VLS_43.slots.default;
    const __VLS_44 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        modelValue: (__VLS_ctx.currentCreateForm.remark),
        clearable: true,
        placeholder: "可选，填写任务备注",
    }));
    const __VLS_46 = __VLS_45({
        modelValue: (__VLS_ctx.currentCreateForm.remark),
        clearable: true,
        placeholder: "可选，填写任务备注",
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    var __VLS_43;
    const __VLS_48 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({}));
    const __VLS_50 = __VLS_49({}, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.currentCreateLoading),
    }));
    const __VLS_54 = __VLS_53({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.currentCreateLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    let __VLS_56;
    let __VLS_57;
    let __VLS_58;
    const __VLS_59 = {
        onClick: (__VLS_ctx.submitCreateTask)
    };
    __VLS_55.slots.default;
    var __VLS_55;
    var __VLS_51;
    var __VLS_15;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel courier-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "courier-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
(__VLS_ctx.workbenchMode === 'pickup' ? 'Pickup Queue' : 'Delivery Queue');
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.currentActiveLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "courier-panel__toolbar-actions" },
});
const __VLS_60 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    ...{ 'onClick': {} },
}));
const __VLS_62 = __VLS_61({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
let __VLS_64;
let __VLS_65;
let __VLS_66;
const __VLS_67 = {
    onClick: (__VLS_ctx.refreshCurrentMode)
};
__VLS_63.slots.default;
var __VLS_63;
const __VLS_68 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    modelValue: (__VLS_ctx.activeTabValue),
    ...{ class: "courier-tabs" },
}));
const __VLS_70 = __VLS_69({
    modelValue: (__VLS_ctx.activeTabValue),
    ...{ class: "courier-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.currentTabOptions))) {
    const __VLS_72 = {}.ElTabPane;
    /** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        key: (item.value),
        label: (item.label),
        name: (item.value),
    }));
    const __VLS_74 = __VLS_73({
        key: (item.value),
        label: (item.label),
        name: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
}
var __VLS_71;
const __VLS_76 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.currentFilters),
    ...{ class: "courier-filters" },
}));
const __VLS_78 = __VLS_77({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.currentFilters),
    ...{ class: "courier-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_80;
let __VLS_81;
let __VLS_82;
const __VLS_83 = {
    onSubmit: () => { }
};
__VLS_79.slots.default;
const __VLS_84 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "任务号",
}));
const __VLS_86 = __VLS_85({
    label: "任务号",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.currentFilters.task_no),
    clearable: true,
    placeholder: (__VLS_ctx.workbenchMode === 'pickup' ? '请输入揽收任务号' : '请输入派送任务号'),
}));
const __VLS_90 = __VLS_89({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.currentFilters.task_no),
    clearable: true,
    placeholder: (__VLS_ctx.workbenchMode === 'pickup' ? '请输入揽收任务号' : '请输入派送任务号'),
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
let __VLS_92;
let __VLS_93;
let __VLS_94;
const __VLS_95 = {
    onKeyup: (__VLS_ctx.loadCurrentTasks)
};
var __VLS_91;
var __VLS_87;
const __VLS_96 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    label: "订单号",
}));
const __VLS_98 = __VLS_97({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.currentFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_102 = __VLS_101({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.currentFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
let __VLS_104;
let __VLS_105;
let __VLS_106;
const __VLS_107 = {
    onKeyup: (__VLS_ctx.loadCurrentTasks)
};
var __VLS_103;
var __VLS_99;
if (__VLS_ctx.currentCanCreate) {
    const __VLS_108 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        label: "站点",
    }));
    const __VLS_110 = __VLS_109({
        label: "站点",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    const __VLS_112 = {}.ElSelect;
    /** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        modelValue: (__VLS_ctx.currentFilters.station_id),
        clearable: true,
        placeholder: "全部站点",
        ...{ style: {} },
    }));
    const __VLS_114 = __VLS_113({
        modelValue: (__VLS_ctx.currentFilters.station_id),
        clearable: true,
        placeholder: "全部站点",
        ...{ style: {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    const __VLS_116 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        label: "全部站点",
        value: (undefined),
    }));
    const __VLS_118 = __VLS_117({
        label: "全部站点",
        value: (undefined),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
        const __VLS_120 = {}.ElOption;
        /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
        // @ts-ignore
        const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
            key: (item.id),
            label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
            value: (item.id),
        }));
        const __VLS_122 = __VLS_121({
            key: (item.id),
            label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
            value: (item.id),
        }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    }
    var __VLS_115;
    var __VLS_111;
}
const __VLS_124 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({}));
const __VLS_126 = __VLS_125({}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
const __VLS_128 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_130 = __VLS_129({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
let __VLS_132;
let __VLS_133;
let __VLS_134;
const __VLS_135 = {
    onClick: (__VLS_ctx.loadCurrentTasks)
};
__VLS_131.slots.default;
var __VLS_131;
const __VLS_136 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    ...{ 'onClick': {} },
}));
const __VLS_138 = __VLS_137({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
let __VLS_140;
let __VLS_141;
let __VLS_142;
const __VLS_143 = {
    onClick: (__VLS_ctx.resetCurrentFilters)
};
__VLS_139.slots.default;
var __VLS_139;
var __VLS_127;
var __VLS_79;
const __VLS_144 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    data: (__VLS_ctx.currentRows),
    stripe: true,
}));
const __VLS_146 = __VLS_145({
    data: (__VLS_ctx.currentRows),
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.currentLoading) }, null, null);
__VLS_147.slots.default;
const __VLS_148 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    label: "任务 / 订单",
    minWidth: "230",
}));
const __VLS_150 = __VLS_149({
    label: "任务 / 订单",
    minWidth: "230",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_151.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.task_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (scope.row.order_status_name);
}
var __VLS_151;
const __VLS_152 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    label: (__VLS_ctx.workbenchMode === 'pickup' ? '发件信息' : '收件信息'),
    minWidth: "250",
}));
const __VLS_154 = __VLS_153({
    label: (__VLS_ctx.workbenchMode === 'pickup' ? '发件信息' : '收件信息'),
    minWidth: "250",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_155.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.contact_name, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.contact_phone, '无电话'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.address, '无地址'));
}
var __VLS_155;
const __VLS_156 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    label: "任务状态",
    width: "120",
}));
const __VLS_158 = __VLS_157({
    label: "任务状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_159.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_160 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        effect: "dark",
        type: (__VLS_ctx.tagType(scope.row.status)),
    }));
    const __VLS_162 = __VLS_161({
        effect: "dark",
        type: (__VLS_ctx.tagType(scope.row.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_161));
    __VLS_163.slots.default;
    (scope.row.status_name);
    var __VLS_163;
}
var __VLS_159;
const __VLS_164 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    label: "快递员 / 站点",
    minWidth: "200",
}));
const __VLS_166 = __VLS_165({
    label: "快递员 / 站点",
    minWidth: "200",
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_167.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.courier_name, '待认领'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.station_name, '未知站点'));
}
var __VLS_167;
const __VLS_168 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: "关键时间",
    minWidth: "220",
}));
const __VLS_170 = __VLS_169({
    label: "关键时间",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_171.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-time" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatUnix(scope.row.assign_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatUnix(scope.row.start_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.workbenchMode === 'pickup' ? '揽收' : '送达');
    (__VLS_ctx.formatUnix(scope.row.finish_time));
}
var __VLS_171;
const __VLS_172 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    label: "备注 / 失败原因",
    minWidth: "220",
}));
const __VLS_174 = __VLS_173({
    label: "备注 / 失败原因",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
__VLS_175.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_175.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.remark, '无备注'));
    if (scope.row.failure_reason) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (scope.row.failure_reason);
    }
}
var __VLS_175;
const __VLS_176 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: "操作",
    fixed: "right",
    width: "300",
}));
const __VLS_178 = __VLS_177({
    label: "操作",
    fixed: "right",
    width: "300",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_179.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "courier-actions" },
    });
    if (__VLS_ctx.canClaim(scope.row)) {
        const __VLS_180 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_182 = __VLS_181({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        let __VLS_184;
        let __VLS_185;
        let __VLS_186;
        const __VLS_187 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canClaim(scope.row)))
                    return;
                __VLS_ctx.claimTask(scope.row);
            }
        };
        __VLS_183.slots.default;
        var __VLS_183;
    }
    if (__VLS_ctx.canStart(scope.row)) {
        const __VLS_188 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }));
        const __VLS_190 = __VLS_189({
            ...{ 'onClick': {} },
            link: true,
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_189));
        let __VLS_192;
        let __VLS_193;
        let __VLS_194;
        const __VLS_195 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canStart(scope.row)))
                    return;
                __VLS_ctx.startTask(scope.row);
            }
        };
        __VLS_191.slots.default;
        (__VLS_ctx.workbenchMode === 'pickup' ? '开始揽收' : '开始派送');
        var __VLS_191;
    }
    if (__VLS_ctx.canComplete(scope.row)) {
        const __VLS_196 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }));
        const __VLS_198 = __VLS_197({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_197));
        let __VLS_200;
        let __VLS_201;
        let __VLS_202;
        const __VLS_203 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canComplete(scope.row)))
                    return;
                __VLS_ctx.completeTask(scope.row);
            }
        };
        __VLS_199.slots.default;
        (__VLS_ctx.workbenchMode === 'pickup' ? '确认揽收' : '确认送达');
        var __VLS_199;
    }
    if (__VLS_ctx.canSign(scope.row)) {
        const __VLS_204 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }));
        const __VLS_206 = __VLS_205({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        let __VLS_208;
        let __VLS_209;
        let __VLS_210;
        const __VLS_211 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canSign(scope.row)))
                    return;
                __VLS_ctx.openSignDialog(scope.row);
            }
        };
        __VLS_207.slots.default;
        var __VLS_207;
    }
    if (__VLS_ctx.canFail(scope.row)) {
        const __VLS_212 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }));
        const __VLS_214 = __VLS_213({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        let __VLS_216;
        let __VLS_217;
        let __VLS_218;
        const __VLS_219 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canFail(scope.row)))
                    return;
                __VLS_ctx.openFailDialog(scope.row);
            }
        };
        __VLS_215.slots.default;
        (__VLS_ctx.workbenchMode === 'pickup' ? '揽收失败' : '派送失败');
        var __VLS_215;
    }
}
var __VLS_179;
var __VLS_147;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "courier-pagination" },
});
const __VLS_220 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    ...{ 'onCurrentChange': {} },
    background: true,
    layout: "total, prev, pager, next",
    total: (__VLS_ctx.currentPagination.total),
    currentPage: (__VLS_ctx.currentPagination.page),
    pageSize: (__VLS_ctx.currentPagination.pageSize),
}));
const __VLS_222 = __VLS_221({
    ...{ 'onCurrentChange': {} },
    background: true,
    layout: "total, prev, pager, next",
    total: (__VLS_ctx.currentPagination.total),
    currentPage: (__VLS_ctx.currentPagination.page),
    pageSize: (__VLS_ctx.currentPagination.pageSize),
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
let __VLS_224;
let __VLS_225;
let __VLS_226;
const __VLS_227 = {
    onCurrentChange: (__VLS_ctx.handleCurrentPageChange)
};
var __VLS_223;
const __VLS_228 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    modelValue: (__VLS_ctx.failDialogVisible),
    title: (__VLS_ctx.workbenchMode === 'pickup' ? '登记揽收失败' : '登记派送失败'),
    width: "560px",
}));
const __VLS_230 = __VLS_229({
    modelValue: (__VLS_ctx.failDialogVisible),
    title: (__VLS_ctx.workbenchMode === 'pickup' ? '登记揽收失败' : '登记派送失败'),
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_231.slots.default;
const __VLS_232 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
    labelPosition: "top",
}));
const __VLS_234 = __VLS_233({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_233));
__VLS_235.slots.default;
const __VLS_236 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
    label: "任务",
}));
const __VLS_238 = __VLS_237({
    label: "任务",
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
__VLS_239.slots.default;
const __VLS_240 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    modelValue: (__VLS_ctx.selectedRow?.task_no || ''),
    disabled: true,
}));
const __VLS_242 = __VLS_241({
    modelValue: (__VLS_ctx.selectedRow?.task_no || ''),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
var __VLS_239;
const __VLS_244 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
    label: "异常类型",
}));
const __VLS_246 = __VLS_245({
    label: "异常类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_245));
__VLS_247.slots.default;
const __VLS_248 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    modelValue: (__VLS_ctx.failForm.exception_type),
    ...{ style: {} },
}));
const __VLS_250 = __VLS_249({
    modelValue: (__VLS_ctx.failForm.exception_type),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.failTypeOptions))) {
    const __VLS_252 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_254 = __VLS_253({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
}
var __VLS_251;
var __VLS_247;
const __VLS_256 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
    label: "失败原因",
}));
const __VLS_258 = __VLS_257({
    label: "失败原因",
}, ...__VLS_functionalComponentArgsRest(__VLS_257));
__VLS_259.slots.default;
const __VLS_260 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
    modelValue: (__VLS_ctx.failForm.reason),
    type: "textarea",
    rows: (4),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "请输入失败原因",
}));
const __VLS_262 = __VLS_261({
    modelValue: (__VLS_ctx.failForm.reason),
    type: "textarea",
    rows: (4),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "请输入失败原因",
}, ...__VLS_functionalComponentArgsRest(__VLS_261));
var __VLS_259;
const __VLS_264 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
    label: "备注",
}));
const __VLS_266 = __VLS_265({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_265));
__VLS_267.slots.default;
const __VLS_268 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
    modelValue: (__VLS_ctx.failForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}));
const __VLS_270 = __VLS_269({
    modelValue: (__VLS_ctx.failForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_269));
var __VLS_267;
var __VLS_235;
{
    const { footer: __VLS_thisSlot } = __VLS_231.slots;
    const __VLS_272 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        ...{ 'onClick': {} },
    }));
    const __VLS_274 = __VLS_273({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    let __VLS_276;
    let __VLS_277;
    let __VLS_278;
    const __VLS_279 = {
        onClick: (...[$event]) => {
            __VLS_ctx.failDialogVisible = false;
        }
    };
    __VLS_275.slots.default;
    var __VLS_275;
    const __VLS_280 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.failSubmitting),
    }));
    const __VLS_282 = __VLS_281({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.failSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    let __VLS_284;
    let __VLS_285;
    let __VLS_286;
    const __VLS_287 = {
        onClick: (__VLS_ctx.submitFail)
    };
    __VLS_283.slots.default;
    var __VLS_283;
}
var __VLS_231;
const __VLS_288 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    modelValue: (__VLS_ctx.signDialogVisible),
    title: "确认签收",
    width: "560px",
}));
const __VLS_290 = __VLS_289({
    modelValue: (__VLS_ctx.signDialogVisible),
    title: "确认签收",
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
const __VLS_292 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    labelPosition: "top",
}));
const __VLS_294 = __VLS_293({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
__VLS_295.slots.default;
const __VLS_296 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
    label: "任务",
}));
const __VLS_298 = __VLS_297({
    label: "任务",
}, ...__VLS_functionalComponentArgsRest(__VLS_297));
__VLS_299.slots.default;
const __VLS_300 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
    modelValue: (__VLS_ctx.selectedRow?.task_no || ''),
    disabled: true,
}));
const __VLS_302 = __VLS_301({
    modelValue: (__VLS_ctx.selectedRow?.task_no || ''),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_301));
var __VLS_299;
const __VLS_304 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
    label: "签收方式",
}));
const __VLS_306 = __VLS_305({
    label: "签收方式",
}, ...__VLS_functionalComponentArgsRest(__VLS_305));
__VLS_307.slots.default;
const __VLS_308 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
    modelValue: (__VLS_ctx.signForm.sign_type),
    ...{ style: {} },
}));
const __VLS_310 = __VLS_309({
    modelValue: (__VLS_ctx.signForm.sign_type),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
__VLS_311.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.signTypeOptions))) {
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
var __VLS_311;
var __VLS_307;
const __VLS_316 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
    label: "签收人",
}));
const __VLS_318 = __VLS_317({
    label: "签收人",
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
__VLS_319.slots.default;
const __VLS_320 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    modelValue: (__VLS_ctx.signForm.signer_name),
    clearable: true,
    placeholder: "请输入签收人姓名",
}));
const __VLS_322 = __VLS_321({
    modelValue: (__VLS_ctx.signForm.signer_name),
    clearable: true,
    placeholder: "请输入签收人姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
var __VLS_319;
const __VLS_324 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    label: "联系电话",
}));
const __VLS_326 = __VLS_325({
    label: "联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
__VLS_327.slots.default;
const __VLS_328 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    modelValue: (__VLS_ctx.signForm.signer_phone),
    clearable: true,
    placeholder: "请输入联系电话",
}));
const __VLS_330 = __VLS_329({
    modelValue: (__VLS_ctx.signForm.signer_phone),
    clearable: true,
    placeholder: "请输入联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
var __VLS_327;
const __VLS_332 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
    label: "关系",
}));
const __VLS_334 = __VLS_333({
    label: "关系",
}, ...__VLS_functionalComponentArgsRest(__VLS_333));
__VLS_335.slots.default;
const __VLS_336 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
    modelValue: (__VLS_ctx.signForm.relation),
    clearable: true,
    placeholder: "如：本人 / 家属 / 前台",
}));
const __VLS_338 = __VLS_337({
    modelValue: (__VLS_ctx.signForm.relation),
    clearable: true,
    placeholder: "如：本人 / 家属 / 前台",
}, ...__VLS_functionalComponentArgsRest(__VLS_337));
var __VLS_335;
const __VLS_340 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_341 = __VLS_asFunctionalComponent(__VLS_340, new __VLS_340({
    label: "备注",
}));
const __VLS_342 = __VLS_341({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_341));
__VLS_343.slots.default;
const __VLS_344 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
    modelValue: (__VLS_ctx.signForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写签收补充说明",
}));
const __VLS_346 = __VLS_345({
    modelValue: (__VLS_ctx.signForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写签收补充说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_345));
var __VLS_343;
var __VLS_295;
{
    const { footer: __VLS_thisSlot } = __VLS_291.slots;
    const __VLS_348 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_349 = __VLS_asFunctionalComponent(__VLS_348, new __VLS_348({
        ...{ 'onClick': {} },
    }));
    const __VLS_350 = __VLS_349({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_349));
    let __VLS_352;
    let __VLS_353;
    let __VLS_354;
    const __VLS_355 = {
        onClick: (...[$event]) => {
            __VLS_ctx.signDialogVisible = false;
        }
    };
    __VLS_351.slots.default;
    var __VLS_351;
    const __VLS_356 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.signSubmitting),
    }));
    const __VLS_358 = __VLS_357({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.signSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    let __VLS_360;
    let __VLS_361;
    let __VLS_362;
    const __VLS_363 = {
        onClick: (__VLS_ctx.submitSign)
    };
    __VLS_359.slots.default;
    var __VLS_359;
}
var __VLS_291;
/** @type {__VLS_StyleScopedClasses['courier-workbench-view']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-hero__switch']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-time']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['courier-pagination']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            workbenchMode: workbenchMode,
            stationOptions: stationOptions,
            failSubmitting: failSubmitting,
            signSubmitting: signSubmitting,
            selectedRow: selectedRow,
            failDialogVisible: failDialogVisible,
            signDialogVisible: signDialogVisible,
            failForm: failForm,
            signForm: signForm,
            currentCanCreate: currentCanCreate,
            currentCreateForm: currentCreateForm,
            currentCreateLoading: currentCreateLoading,
            currentFilters: currentFilters,
            currentLoading: currentLoading,
            currentPagination: currentPagination,
            currentTabOptions: currentTabOptions,
            activeTabValue: activeTabValue,
            currentActiveLabel: currentActiveLabel,
            currentRows: currentRows,
            currentStatCards: currentStatCards,
            failTypeOptions: failTypeOptions,
            signTypeOptions: signTypeOptions,
            normalizeText: normalizeText,
            formatUnix: formatUnix,
            tagType: tagType,
            refreshCurrentMode: refreshCurrentMode,
            loadCurrentTasks: loadCurrentTasks,
            resetCurrentFilters: resetCurrentFilters,
            handleCurrentPageChange: handleCurrentPageChange,
            submitCreateTask: submitCreateTask,
            canClaim: canClaim,
            canStart: canStart,
            canComplete: canComplete,
            canSign: canSign,
            canFail: canFail,
            claimTask: claimTask,
            startTask: startTask,
            completeTask: completeTask,
            openFailDialog: openFailDialog,
            submitFail: submitFail,
            openSignDialog: openSignDialog,
            submitSign: submitSign,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
