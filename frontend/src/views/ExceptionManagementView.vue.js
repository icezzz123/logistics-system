import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { readQueryEnum, readQueryNumber } from '@/utils/workbench';
const exceptionTypeOptions = [{ value: 1, label: '破损' }, { value: 2, label: '丢失' }, { value: 3, label: '延误' }, { value: 4, label: '错分' }, { value: 5, label: '拒收' }, { value: 6, label: '清关异常' }, { value: 7, label: '其他' }];
const exceptionStatusOptions = [{ value: 1, label: '待处理' }, { value: 2, label: '处理中' }, { value: 3, label: '已解决' }, { value: 4, label: '已关闭' }];
const orderStatusOptions = [{ value: 1, label: '待处理' }, { value: 2, label: '已接单' }, { value: 3, label: '已入库' }, { value: 4, label: '分拣中' }, { value: 5, label: '运输中' }, { value: 6, label: '清关中' }, { value: 7, label: '目的地分拣' }, { value: 8, label: '配送中' }, { value: 9, label: '已送达' }, { value: 10, label: '已签收' }, { value: 11, label: '异常' }, { value: 12, label: '已取消' }];
const route = useRoute();
const activeTab = ref('list');
const exceptions = ref([]);
const orderOptions = ref([]);
const stationOptions = ref([]);
const userOptions = ref([]);
const detailException = ref(null);
const loading = ref(false);
const detailLoading = ref(false);
const createSubmitting = ref(false);
const assignSubmitting = ref(false);
const processSubmitting = ref(false);
const closeSubmitting = ref(false);
const createDialogVisible = ref(false);
const assignDialogVisible = ref(false);
const processDialogVisible = ref(false);
const closeDialogVisible = ref(false);
const detailVisible = ref(false);
const currentExceptionId = ref(null);
const pagination = reactive({ total: 0, page: 1, pageSize: 10 });
const filters = reactive({ order_no: '', type: undefined, status: undefined, station_id: undefined });
const stats = reactive({ summary: { total_exceptions: 0, pending_exceptions: 0, processing_exceptions: 0, resolved_exceptions: 0, closed_exceptions: 0, total_compensation: 0 }, by_type: [], by_status: [], by_station: [], by_date: [] });
const createFormRef = ref();
const createForm = reactive({ order_id: undefined, type: undefined, station_id: undefined, description: '', images_input: '', remark: '' });
const createRules = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }], type: [{ required: true, message: '请选择异常类型', trigger: 'change' }], description: [{ required: true, message: '请输入异常描述', trigger: 'blur' }] };
const assignForm = reactive({ handler_id: undefined, remark: '' });
const processForm = reactive({ status: 2, solution: '', result: '', compensate_amount: 0, remark: '' });
const closeForm = reactive({ resume_status: undefined, result: '', remark: '' });
const topStations = computed(() => stats.by_station.slice(0, 4));
const handlerOptions = computed(() => userOptions.value.filter((item) => item.status === 1 && item.role >= 2));
function normalizeText(value, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text))
    return fallback; return text; }
function formatMoney(value) { return `¥${(Number(value) || 0).toFixed(2)}`; }
function formatUnix(value) { if (!value)
    return '-'; const date = new Date(value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }); }
function displayUserName(user) { const realName = normalizeText(user.real_name, ''); return realName && realName !== '-' ? `${realName} (${user.role_name})` : `${user.username} (${user.role_name})`; }
function exceptionStatusTagType(status) { return { 1: 'info', 2: 'warning', 3: 'success', 4: 'primary' }[status] || 'info'; }
function canAssign(status) { return status === 1; }
function canProcess(status) { return status === 1 || status === 2; }
function canClose(status) { return status === 2 || status === 3; }
function applyWorkbenchFilters() {
    const tab = readQueryEnum(route.query, 'tab', ['list', 'stats']);
    const status = readQueryNumber(route.query, 'status');
    if (tab) {
        activeTab.value = tab;
    }
    if (typeof status === 'number' && exceptionStatusOptions.some((item) => item.value === status)) {
        filters.status = status;
    }
}
function buildListParams() { const params = { page: pagination.page, page_size: pagination.pageSize }; if (filters.order_no.trim())
    params.order_no = filters.order_no.trim(); if (typeof filters.type === 'number')
    params.type = filters.type; if (typeof filters.status === 'number')
    params.status = filters.status; if (typeof filters.station_id === 'number')
    params.station_id = filters.station_id; return params; }
async function loadOrders() { const data = await http.get('/orders', { params: { page: 1, page_size: 100 } }); orderOptions.value = data.list || []; }
async function loadStations() { const data = await http.get('/stations', { params: { page: 1, page_size: 100 } }); stationOptions.value = data.list || []; }
async function loadUsers() { const data = await http.get('/users', { params: { page: 1, page_size: 100 } }); userOptions.value = data.list || []; }
async function loadList() { loading.value = true; try {
    const data = await http.get('/exceptions', { params: buildListParams() });
    exceptions.value = data.list || [];
    pagination.total = data.total || 0;
    pagination.page = data.page || pagination.page;
    pagination.pageSize = data.page_size || pagination.pageSize;
}
finally {
    loading.value = false;
} }
async function loadStats() { Object.assign(stats, await http.get('/exceptions/stats')); }
async function refreshExceptionsOverview() { await Promise.all([loadList(), loadStats()]); }
function openCreateDialog() { createForm.order_id = undefined; createForm.type = undefined; createForm.station_id = undefined; createForm.description = ''; createForm.images_input = ''; createForm.remark = ''; createDialogVisible.value = true; createFormRef.value?.clearValidate(); }
async function submitCreateException() { if (!createFormRef.value)
    return; const valid = await createFormRef.value.validate().catch(() => false); if (!valid)
    return; createSubmitting.value = true; try {
    await http.post('/exceptions', { order_id: createForm.order_id, type: createForm.type, station_id: createForm.station_id || 0, description: createForm.description.trim(), images: createForm.images_input.split(',').map((item) => item.trim()).filter(Boolean), remark: createForm.remark.trim() });
    ElMessage.success('异常已创建');
    createDialogVisible.value = false;
    await refreshExceptionsOverview();
}
finally {
    createSubmitting.value = false;
} }
async function openDetail(item) { detailVisible.value = true; detailLoading.value = true; try {
    detailException.value = await http.get(`/exceptions/${item.id}`);
}
finally {
    detailLoading.value = false;
} }
function openAssignDialog(item) { currentExceptionId.value = item.id; assignForm.handler_id = item.handler_id || undefined; assignForm.remark = ''; assignDialogVisible.value = true; }
async function submitAssign() { if (!currentExceptionId.value || !assignForm.handler_id)
    return; assignSubmitting.value = true; try {
    await http.put(`/exceptions/${currentExceptionId.value}/assign`, { handler_id: assignForm.handler_id, remark: assignForm.remark.trim() });
    ElMessage.success('处理人已分配');
    assignDialogVisible.value = false;
    await refreshExceptionsOverview();
}
finally {
    assignSubmitting.value = false;
} }
function openProcessDialog(item) { currentExceptionId.value = item.id; processForm.status = item.status === 3 ? 3 : 2; processForm.solution = item.solution || ''; processForm.result = item.result || ''; processForm.compensate_amount = item.compensate_amount || 0; processForm.remark = ''; processDialogVisible.value = true; }
async function submitProcess() { if (!currentExceptionId.value)
    return; processSubmitting.value = true; try {
    await http.put(`/exceptions/${currentExceptionId.value}/process`, { status: processForm.status, solution: processForm.solution.trim(), result: processForm.result.trim(), compensate_amount: Number(processForm.compensate_amount), remark: processForm.remark.trim() });
    ElMessage.success('异常已处理');
    processDialogVisible.value = false;
    await refreshExceptionsOverview();
}
finally {
    processSubmitting.value = false;
} }
function openCloseDialog(item) { currentExceptionId.value = item.id; closeForm.resume_status = undefined; closeForm.result = item.result || ''; closeForm.remark = ''; closeDialogVisible.value = true; }
async function submitClose() { if (!currentExceptionId.value)
    return; closeSubmitting.value = true; try {
    await http.put(`/exceptions/${currentExceptionId.value}/close`, { resume_status: closeForm.resume_status, result: closeForm.result.trim(), remark: closeForm.remark.trim() });
    ElMessage.success('异常已关闭');
    closeDialogVisible.value = false;
    await refreshExceptionsOverview();
}
finally {
    closeSubmitting.value = false;
} }
async function applyFilters() { pagination.page = 1; await loadList(); }
function resetFilters() { filters.order_no = ''; filters.type = undefined; filters.status = undefined; filters.station_id = undefined; pagination.page = 1; void loadList(); }
function handlePageChange(page) { pagination.page = page; void loadList(); }
function handleSizeChange(size) { pagination.pageSize = size; pagination.page = 1; void loadList(); }
onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadOrders(), loadStations(), loadUsers(), loadList(), loadStats()]); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['exception-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-section']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-list']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--exception']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-pagination']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "exception-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topStations))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item.station_id),
    });
    (__VLS_ctx.normalizeText(item.station_name));
    (item.count);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.total_exceptions);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.processing_exceptions);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.closed_exceptions);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatMoney(__VLS_ctx.stats.summary.total_compensation));
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "exception-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "exception-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "异常列表",
    name: "list",
}));
const __VLS_6 = __VLS_5({
    label: "异常列表",
    name: "list",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel exception-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-panel__toolbar-actions" },
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
    onClick: (__VLS_ctx.loadStats)
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
        __VLS_ctx.openCreateDialog();
    }
};
__VLS_19.slots.default;
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--exception" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.pending_exceptions);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.processing_exceptions);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.resolved_exceptions);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.closed_exceptions);
const __VLS_24 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "exception-filters" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "exception-filters" },
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
    label: "订单号",
}));
const __VLS_34 = __VLS_33({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onKeyup: (__VLS_ctx.applyFilters)
};
var __VLS_39;
var __VLS_35;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "异常类型",
}));
const __VLS_46 = __VLS_45({
    label: "异常类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.filters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.filters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "全部类型",
    value: (undefined),
}));
const __VLS_54 = __VLS_53({
    label: "全部类型",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.exceptionTypeOptions))) {
    const __VLS_56 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_58 = __VLS_57({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
}
var __VLS_51;
var __VLS_47;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "异常状态",
}));
const __VLS_62 = __VLS_61({
    label: "异常状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_70 = __VLS_69({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.exceptionStatusOptions))) {
    const __VLS_72 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_74 = __VLS_73({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
}
var __VLS_67;
var __VLS_63;
const __VLS_76 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "站点",
}));
const __VLS_78 = __VLS_77({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.filters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.filters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_86 = __VLS_85({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_88 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_90 = __VLS_89({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
}
var __VLS_83;
var __VLS_79;
const __VLS_92 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({}));
const __VLS_94 = __VLS_93({}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_98 = __VLS_97({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
let __VLS_100;
let __VLS_101;
let __VLS_102;
const __VLS_103 = {
    onClick: (__VLS_ctx.applyFilters)
};
__VLS_99.slots.default;
var __VLS_99;
const __VLS_104 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    ...{ 'onClick': {} },
}));
const __VLS_106 = __VLS_105({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
let __VLS_108;
let __VLS_109;
let __VLS_110;
const __VLS_111 = {
    onClick: (__VLS_ctx.resetFilters)
};
__VLS_107.slots.default;
var __VLS_107;
var __VLS_95;
var __VLS_27;
const __VLS_112 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    data: (__VLS_ctx.exceptions),
    ...{ class: "exception-table" },
    stripe: true,
}));
const __VLS_114 = __VLS_113({
    data: (__VLS_ctx.exceptions),
    ...{ class: "exception-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_115.slots.default;
const __VLS_116 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "异常",
    minWidth: "230",
}));
const __VLS_118 = __VLS_117({
    label: "异常",
    minWidth: "230",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_119.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "exception-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.exception_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (scope.row.type_name);
    (scope.row.order_status_name);
}
var __VLS_119;
const __VLS_120 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "站点 / 上报人",
    minWidth: "180",
}));
const __VLS_122 = __VLS_121({
    label: "站点 / 上报人",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_123.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "exception-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.station_name, '未关联站点'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.reporter_name, '未知上报人'));
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
        type: (__VLS_ctx.exceptionStatusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_130 = __VLS_129({
        type: (__VLS_ctx.exceptionStatusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_129));
    __VLS_131.slots.default;
    (scope.row.status_name);
    var __VLS_131;
}
var __VLS_127;
const __VLS_132 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    label: "赔付",
    width: "120",
}));
const __VLS_134 = __VLS_133({
    label: "赔付",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_135.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatMoney(scope.row.compensate_amount));
}
var __VLS_135;
const __VLS_136 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "上报时间",
    minWidth: "170",
}));
const __VLS_138 = __VLS_137({
    label: "上报时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_139.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.report_time));
}
var __VLS_139;
const __VLS_140 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    label: "操作",
    fixed: "right",
    width: "260",
}));
const __VLS_142 = __VLS_141({
    label: "操作",
    fixed: "right",
    width: "260",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_143.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "exception-actions" },
    });
    const __VLS_144 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_146 = __VLS_145({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    let __VLS_148;
    let __VLS_149;
    let __VLS_150;
    const __VLS_151 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openDetail(scope.row);
        }
    };
    __VLS_147.slots.default;
    var __VLS_147;
    if (__VLS_ctx.canAssign(scope.row.status)) {
        const __VLS_152 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_154 = __VLS_153({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        let __VLS_156;
        let __VLS_157;
        let __VLS_158;
        const __VLS_159 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canAssign(scope.row.status)))
                    return;
                __VLS_ctx.openAssignDialog(scope.row);
            }
        };
        __VLS_155.slots.default;
        var __VLS_155;
    }
    if (__VLS_ctx.canProcess(scope.row.status)) {
        const __VLS_160 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }));
        const __VLS_162 = __VLS_161({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        let __VLS_164;
        let __VLS_165;
        let __VLS_166;
        const __VLS_167 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canProcess(scope.row.status)))
                    return;
                __VLS_ctx.openProcessDialog(scope.row);
            }
        };
        __VLS_163.slots.default;
        var __VLS_163;
    }
    if (__VLS_ctx.canClose(scope.row.status)) {
        const __VLS_168 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
            ...{ 'onClick': {} },
            link: true,
            type: "info",
        }));
        const __VLS_170 = __VLS_169({
            ...{ 'onClick': {} },
            link: true,
            type: "info",
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        let __VLS_172;
        let __VLS_173;
        let __VLS_174;
        const __VLS_175 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canClose(scope.row.status)))
                    return;
                __VLS_ctx.openCloseDialog(scope.row);
            }
        };
        __VLS_171.slots.default;
        var __VLS_171;
    }
}
var __VLS_143;
var __VLS_115;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-pagination" },
});
const __VLS_176 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_178 = __VLS_177({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
let __VLS_180;
let __VLS_181;
let __VLS_182;
const __VLS_183 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_184 = {
    onSizeChange: (__VLS_ctx.handleSizeChange)
};
var __VLS_179;
var __VLS_7;
const __VLS_185 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
    label: "统计概览",
    name: "stats",
}));
const __VLS_187 = __VLS_186({
    label: "统计概览",
    name: "stats",
}, ...__VLS_functionalComponentArgsRest(__VLS_186));
__VLS_188.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel exception-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-panel__toolbar-actions" },
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
    onClick: (__VLS_ctx.loadStats)
};
__VLS_192.slots.default;
var __VLS_192;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stats.by_type))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.type),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.type_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.count);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stats.by_status))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.status),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.status_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.count);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-side" },
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
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stats.by_station))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.station_id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(item.station_name));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.count);
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
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stats.by_date))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.date),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.date);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.count);
}
var __VLS_188;
var __VLS_3;
const __VLS_197 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    modelValue: (__VLS_ctx.createDialogVisible),
    title: "创建异常",
    width: "820px",
}));
const __VLS_199 = __VLS_198({
    modelValue: (__VLS_ctx.createDialogVisible),
    title: "创建异常",
    width: "820px",
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
__VLS_200.slots.default;
const __VLS_201 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
    ref: "createFormRef",
    model: (__VLS_ctx.createForm),
    rules: (__VLS_ctx.createRules),
    labelPosition: "top",
}));
const __VLS_203 = __VLS_202({
    ref: "createFormRef",
    model: (__VLS_ctx.createForm),
    rules: (__VLS_ctx.createRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
/** @type {typeof __VLS_ctx.createFormRef} */ ;
var __VLS_205 = {};
__VLS_204.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-form-grid" },
});
const __VLS_207 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
    label: "订单",
    prop: "order_id",
}));
const __VLS_209 = __VLS_208({
    label: "订单",
    prop: "order_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_208));
__VLS_210.slots.default;
const __VLS_211 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
    modelValue: (__VLS_ctx.createForm.order_id),
    placeholder: "请选择订单",
    ...{ style: {} },
}));
const __VLS_213 = __VLS_212({
    modelValue: (__VLS_ctx.createForm.order_id),
    placeholder: "请选择订单",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
__VLS_214.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderOptions))) {
    const __VLS_215 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
        key: (item.id),
        label: (`${item.order_no} / ${item.status_name}`),
        value: (item.id),
    }));
    const __VLS_217 = __VLS_216({
        key: (item.id),
        label: (`${item.order_no} / ${item.status_name}`),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_216));
}
var __VLS_214;
var __VLS_210;
const __VLS_219 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
    label: "异常类型",
    prop: "type",
}));
const __VLS_221 = __VLS_220({
    label: "异常类型",
    prop: "type",
}, ...__VLS_functionalComponentArgsRest(__VLS_220));
__VLS_222.slots.default;
const __VLS_223 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
    modelValue: (__VLS_ctx.createForm.type),
    placeholder: "请选择异常类型",
    ...{ style: {} },
}));
const __VLS_225 = __VLS_224({
    modelValue: (__VLS_ctx.createForm.type),
    placeholder: "请选择异常类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
__VLS_226.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.exceptionTypeOptions))) {
    const __VLS_227 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_229 = __VLS_228({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_228));
}
var __VLS_226;
var __VLS_222;
const __VLS_231 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
    label: "站点",
}));
const __VLS_233 = __VLS_232({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_232));
__VLS_234.slots.default;
const __VLS_235 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
    modelValue: (__VLS_ctx.createForm.station_id),
    clearable: true,
    placeholder: "可选",
    ...{ style: {} },
}));
const __VLS_237 = __VLS_236({
    modelValue: (__VLS_ctx.createForm.station_id),
    clearable: true,
    placeholder: "可选",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_236));
__VLS_238.slots.default;
const __VLS_239 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
    label: "不关联站点",
    value: (undefined),
}));
const __VLS_241 = __VLS_240({
    label: "不关联站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_243 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_245 = __VLS_244({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_244));
}
var __VLS_238;
var __VLS_234;
const __VLS_247 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
    label: "图片链接",
}));
const __VLS_249 = __VLS_248({
    label: "图片链接",
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
__VLS_250.slots.default;
const __VLS_251 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.createForm.images_input),
    placeholder: "多个链接请用逗号分隔",
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.createForm.images_input),
    placeholder: "多个链接请用逗号分隔",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
var __VLS_250;
const __VLS_255 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    label: "异常描述",
    prop: "description",
    ...{ class: "exception-form-grid__wide" },
}));
const __VLS_257 = __VLS_256({
    label: "异常描述",
    prop: "description",
    ...{ class: "exception-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
__VLS_258.slots.default;
const __VLS_259 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
    modelValue: (__VLS_ctx.createForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入异常描述",
}));
const __VLS_261 = __VLS_260({
    modelValue: (__VLS_ctx.createForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入异常描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_260));
var __VLS_258;
const __VLS_263 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
    label: "备注",
    ...{ class: "exception-form-grid__wide" },
}));
const __VLS_265 = __VLS_264({
    label: "备注",
    ...{ class: "exception-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_264));
__VLS_266.slots.default;
const __VLS_267 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
    modelValue: (__VLS_ctx.createForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}));
const __VLS_269 = __VLS_268({
    modelValue: (__VLS_ctx.createForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
var __VLS_266;
var __VLS_204;
{
    const { footer: __VLS_thisSlot } = __VLS_200.slots;
    const __VLS_271 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
        ...{ 'onClick': {} },
    }));
    const __VLS_273 = __VLS_272({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_272));
    let __VLS_275;
    let __VLS_276;
    let __VLS_277;
    const __VLS_278 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDialogVisible = false;
        }
    };
    __VLS_274.slots.default;
    var __VLS_274;
    const __VLS_279 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createSubmitting),
    }));
    const __VLS_281 = __VLS_280({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_280));
    let __VLS_283;
    let __VLS_284;
    let __VLS_285;
    const __VLS_286 = {
        onClick: (__VLS_ctx.submitCreateException)
    };
    __VLS_282.slots.default;
    var __VLS_282;
}
var __VLS_200;
const __VLS_287 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
    modelValue: (__VLS_ctx.assignDialogVisible),
    title: "分配异常处理人",
    width: "460px",
}));
const __VLS_289 = __VLS_288({
    modelValue: (__VLS_ctx.assignDialogVisible),
    title: "分配异常处理人",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_288));
__VLS_290.slots.default;
const __VLS_291 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
    labelPosition: "top",
}));
const __VLS_293 = __VLS_292({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_292));
__VLS_294.slots.default;
const __VLS_295 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
    label: "处理人",
}));
const __VLS_297 = __VLS_296({
    label: "处理人",
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
__VLS_298.slots.default;
const __VLS_299 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_300 = __VLS_asFunctionalComponent(__VLS_299, new __VLS_299({
    modelValue: (__VLS_ctx.assignForm.handler_id),
    placeholder: "请选择处理人",
    ...{ style: {} },
}));
const __VLS_301 = __VLS_300({
    modelValue: (__VLS_ctx.assignForm.handler_id),
    placeholder: "请选择处理人",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_300));
__VLS_302.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.handlerOptions))) {
    const __VLS_303 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }));
    const __VLS_305 = __VLS_304({
        key: (item.id),
        label: (__VLS_ctx.displayUserName(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_304));
}
var __VLS_302;
var __VLS_298;
const __VLS_307 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
    label: "备注",
}));
const __VLS_309 = __VLS_308({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_308));
__VLS_310.slots.default;
const __VLS_311 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
    modelValue: (__VLS_ctx.assignForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写分配备注",
}));
const __VLS_313 = __VLS_312({
    modelValue: (__VLS_ctx.assignForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写分配备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_312));
var __VLS_310;
var __VLS_294;
{
    const { footer: __VLS_thisSlot } = __VLS_290.slots;
    const __VLS_315 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
        ...{ 'onClick': {} },
    }));
    const __VLS_317 = __VLS_316({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_316));
    let __VLS_319;
    let __VLS_320;
    let __VLS_321;
    const __VLS_322 = {
        onClick: (...[$event]) => {
            __VLS_ctx.assignDialogVisible = false;
        }
    };
    __VLS_318.slots.default;
    var __VLS_318;
    const __VLS_323 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.assignSubmitting),
    }));
    const __VLS_325 = __VLS_324({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.assignSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_324));
    let __VLS_327;
    let __VLS_328;
    let __VLS_329;
    const __VLS_330 = {
        onClick: (__VLS_ctx.submitAssign)
    };
    __VLS_326.slots.default;
    var __VLS_326;
}
var __VLS_290;
const __VLS_331 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
    modelValue: (__VLS_ctx.processDialogVisible),
    title: "处理异常",
    width: "620px",
}));
const __VLS_333 = __VLS_332({
    modelValue: (__VLS_ctx.processDialogVisible),
    title: "处理异常",
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_332));
__VLS_334.slots.default;
const __VLS_335 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_336 = __VLS_asFunctionalComponent(__VLS_335, new __VLS_335({
    labelPosition: "top",
}));
const __VLS_337 = __VLS_336({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_336));
__VLS_338.slots.default;
const __VLS_339 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
    label: "处理结果状态",
}));
const __VLS_341 = __VLS_340({
    label: "处理结果状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_340));
__VLS_342.slots.default;
const __VLS_343 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_344 = __VLS_asFunctionalComponent(__VLS_343, new __VLS_343({
    modelValue: (__VLS_ctx.processForm.status),
}));
const __VLS_345 = __VLS_344({
    modelValue: (__VLS_ctx.processForm.status),
}, ...__VLS_functionalComponentArgsRest(__VLS_344));
__VLS_346.slots.default;
const __VLS_347 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
    value: (2),
}));
const __VLS_349 = __VLS_348({
    value: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_348));
__VLS_350.slots.default;
var __VLS_350;
const __VLS_351 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
    value: (3),
}));
const __VLS_353 = __VLS_352({
    value: (3),
}, ...__VLS_functionalComponentArgsRest(__VLS_352));
__VLS_354.slots.default;
var __VLS_354;
var __VLS_346;
var __VLS_342;
const __VLS_355 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
    label: "处理方案",
}));
const __VLS_357 = __VLS_356({
    label: "处理方案",
}, ...__VLS_functionalComponentArgsRest(__VLS_356));
__VLS_358.slots.default;
const __VLS_359 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
    modelValue: (__VLS_ctx.processForm.solution),
    type: "textarea",
    rows: (3),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入处理方案",
}));
const __VLS_361 = __VLS_360({
    modelValue: (__VLS_ctx.processForm.solution),
    type: "textarea",
    rows: (3),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入处理方案",
}, ...__VLS_functionalComponentArgsRest(__VLS_360));
var __VLS_358;
const __VLS_363 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
    label: "处理结果",
}));
const __VLS_365 = __VLS_364({
    label: "处理结果",
}, ...__VLS_functionalComponentArgsRest(__VLS_364));
__VLS_366.slots.default;
const __VLS_367 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_368 = __VLS_asFunctionalComponent(__VLS_367, new __VLS_367({
    modelValue: (__VLS_ctx.processForm.result),
    type: "textarea",
    rows: (3),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入处理结果",
}));
const __VLS_369 = __VLS_368({
    modelValue: (__VLS_ctx.processForm.result),
    type: "textarea",
    rows: (3),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入处理结果",
}, ...__VLS_functionalComponentArgsRest(__VLS_368));
var __VLS_366;
const __VLS_371 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_372 = __VLS_asFunctionalComponent(__VLS_371, new __VLS_371({
    label: "赔付金额",
}));
const __VLS_373 = __VLS_372({
    label: "赔付金额",
}, ...__VLS_functionalComponentArgsRest(__VLS_372));
__VLS_374.slots.default;
const __VLS_375 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_376 = __VLS_asFunctionalComponent(__VLS_375, new __VLS_375({
    modelValue: (__VLS_ctx.processForm.compensate_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_377 = __VLS_376({
    modelValue: (__VLS_ctx.processForm.compensate_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_376));
var __VLS_374;
const __VLS_379 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_380 = __VLS_asFunctionalComponent(__VLS_379, new __VLS_379({
    label: "备注",
}));
const __VLS_381 = __VLS_380({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_380));
__VLS_382.slots.default;
const __VLS_383 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_384 = __VLS_asFunctionalComponent(__VLS_383, new __VLS_383({
    modelValue: (__VLS_ctx.processForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "可选，填写处理备注",
}));
const __VLS_385 = __VLS_384({
    modelValue: (__VLS_ctx.processForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "可选，填写处理备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_384));
var __VLS_382;
var __VLS_338;
{
    const { footer: __VLS_thisSlot } = __VLS_334.slots;
    const __VLS_387 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_388 = __VLS_asFunctionalComponent(__VLS_387, new __VLS_387({
        ...{ 'onClick': {} },
    }));
    const __VLS_389 = __VLS_388({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_388));
    let __VLS_391;
    let __VLS_392;
    let __VLS_393;
    const __VLS_394 = {
        onClick: (...[$event]) => {
            __VLS_ctx.processDialogVisible = false;
        }
    };
    __VLS_390.slots.default;
    var __VLS_390;
    const __VLS_395 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_396 = __VLS_asFunctionalComponent(__VLS_395, new __VLS_395({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.processSubmitting),
    }));
    const __VLS_397 = __VLS_396({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.processSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_396));
    let __VLS_399;
    let __VLS_400;
    let __VLS_401;
    const __VLS_402 = {
        onClick: (__VLS_ctx.submitProcess)
    };
    __VLS_398.slots.default;
    var __VLS_398;
}
var __VLS_334;
const __VLS_403 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_404 = __VLS_asFunctionalComponent(__VLS_403, new __VLS_403({
    modelValue: (__VLS_ctx.closeDialogVisible),
    title: "关闭异常",
    width: "540px",
}));
const __VLS_405 = __VLS_404({
    modelValue: (__VLS_ctx.closeDialogVisible),
    title: "关闭异常",
    width: "540px",
}, ...__VLS_functionalComponentArgsRest(__VLS_404));
__VLS_406.slots.default;
const __VLS_407 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_408 = __VLS_asFunctionalComponent(__VLS_407, new __VLS_407({
    labelPosition: "top",
}));
const __VLS_409 = __VLS_408({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_408));
__VLS_410.slots.default;
const __VLS_411 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_412 = __VLS_asFunctionalComponent(__VLS_411, new __VLS_411({
    label: "恢复订单状态",
}));
const __VLS_413 = __VLS_412({
    label: "恢复订单状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_412));
__VLS_414.slots.default;
const __VLS_415 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_416 = __VLS_asFunctionalComponent(__VLS_415, new __VLS_415({
    modelValue: (__VLS_ctx.closeForm.resume_status),
    clearable: true,
    placeholder: "可选，关闭后恢复订单状态",
    ...{ style: {} },
}));
const __VLS_417 = __VLS_416({
    modelValue: (__VLS_ctx.closeForm.resume_status),
    clearable: true,
    placeholder: "可选，关闭后恢复订单状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_416));
__VLS_418.slots.default;
const __VLS_419 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_420 = __VLS_asFunctionalComponent(__VLS_419, new __VLS_419({
    label: "不恢复订单状态",
    value: (undefined),
}));
const __VLS_421 = __VLS_420({
    label: "不恢复订单状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_420));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderStatusOptions))) {
    const __VLS_423 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_424 = __VLS_asFunctionalComponent(__VLS_423, new __VLS_423({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_425 = __VLS_424({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_424));
}
var __VLS_418;
var __VLS_414;
const __VLS_427 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_428 = __VLS_asFunctionalComponent(__VLS_427, new __VLS_427({
    label: "关闭结果",
}));
const __VLS_429 = __VLS_428({
    label: "关闭结果",
}, ...__VLS_functionalComponentArgsRest(__VLS_428));
__VLS_430.slots.default;
const __VLS_431 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_432 = __VLS_asFunctionalComponent(__VLS_431, new __VLS_431({
    modelValue: (__VLS_ctx.closeForm.result),
    type: "textarea",
    rows: (3),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入关闭结果",
}));
const __VLS_433 = __VLS_432({
    modelValue: (__VLS_ctx.closeForm.result),
    type: "textarea",
    rows: (3),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入关闭结果",
}, ...__VLS_functionalComponentArgsRest(__VLS_432));
var __VLS_430;
const __VLS_435 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_436 = __VLS_asFunctionalComponent(__VLS_435, new __VLS_435({
    label: "备注",
}));
const __VLS_437 = __VLS_436({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_436));
__VLS_438.slots.default;
const __VLS_439 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_440 = __VLS_asFunctionalComponent(__VLS_439, new __VLS_439({
    modelValue: (__VLS_ctx.closeForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "可选，填写关闭备注",
}));
const __VLS_441 = __VLS_440({
    modelValue: (__VLS_ctx.closeForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "可选，填写关闭备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_440));
var __VLS_438;
var __VLS_410;
{
    const { footer: __VLS_thisSlot } = __VLS_406.slots;
    const __VLS_443 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_444 = __VLS_asFunctionalComponent(__VLS_443, new __VLS_443({
        ...{ 'onClick': {} },
    }));
    const __VLS_445 = __VLS_444({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_444));
    let __VLS_447;
    let __VLS_448;
    let __VLS_449;
    const __VLS_450 = {
        onClick: (...[$event]) => {
            __VLS_ctx.closeDialogVisible = false;
        }
    };
    __VLS_446.slots.default;
    var __VLS_446;
    const __VLS_451 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_452 = __VLS_asFunctionalComponent(__VLS_451, new __VLS_451({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.closeSubmitting),
    }));
    const __VLS_453 = __VLS_452({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.closeSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_452));
    let __VLS_455;
    let __VLS_456;
    let __VLS_457;
    const __VLS_458 = {
        onClick: (__VLS_ctx.submitClose)
    };
    __VLS_454.slots.default;
    var __VLS_454;
}
var __VLS_406;
const __VLS_459 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_460 = __VLS_asFunctionalComponent(__VLS_459, new __VLS_459({
    modelValue: (__VLS_ctx.detailVisible),
    size: "58%",
    title: "异常详情",
}));
const __VLS_461 = __VLS_460({
    modelValue: (__VLS_ctx.detailVisible),
    size: "58%",
    title: "异常详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_460));
__VLS_462.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "exception-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.detailLoading) }, null, null);
if (__VLS_ctx.detailException) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "exception-detail__hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.detailException.exception_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.detailException.order_no);
    (__VLS_ctx.detailException.type_name);
    (__VLS_ctx.detailException.status_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "exception-detail__tags" },
    });
    const __VLS_463 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_464 = __VLS_asFunctionalComponent(__VLS_463, new __VLS_463({
        type: (__VLS_ctx.exceptionStatusTagType(__VLS_ctx.detailException.status)),
        effect: "dark",
    }));
    const __VLS_465 = __VLS_464({
        type: (__VLS_ctx.exceptionStatusTagType(__VLS_ctx.detailException.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_464));
    __VLS_466.slots.default;
    (__VLS_ctx.detailException.status_name);
    var __VLS_466;
    const __VLS_467 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_468 = __VLS_asFunctionalComponent(__VLS_467, new __VLS_467({
        effect: "plain",
    }));
    const __VLS_469 = __VLS_468({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_468));
    __VLS_470.slots.default;
    (__VLS_ctx.formatMoney(__VLS_ctx.detailException.compensate_amount));
    var __VLS_470;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "exception-detail__grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "exception-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.detailException.order_status_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.station_name, '未关联站点'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.reporter_name, '未知上报人'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.handler_name, '未分配'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "exception-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.description, '无描述'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.solution, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.result, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailException.remark, '无备注'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "exception-detail-card exception-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.detailException.report_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.detailException.handle_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.detailException.close_time));
}
var __VLS_462;
/** @type {__VLS_StyleScopedClasses['exception-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--exception']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-table']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-section']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-list']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-section']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-list']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-side']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['sub-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['side-list']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['exception-detail-card--full']} */ ;
// @ts-ignore
var __VLS_206 = __VLS_205;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            exceptionTypeOptions: exceptionTypeOptions,
            exceptionStatusOptions: exceptionStatusOptions,
            orderStatusOptions: orderStatusOptions,
            activeTab: activeTab,
            exceptions: exceptions,
            orderOptions: orderOptions,
            stationOptions: stationOptions,
            detailException: detailException,
            loading: loading,
            detailLoading: detailLoading,
            createSubmitting: createSubmitting,
            assignSubmitting: assignSubmitting,
            processSubmitting: processSubmitting,
            closeSubmitting: closeSubmitting,
            createDialogVisible: createDialogVisible,
            assignDialogVisible: assignDialogVisible,
            processDialogVisible: processDialogVisible,
            closeDialogVisible: closeDialogVisible,
            detailVisible: detailVisible,
            pagination: pagination,
            filters: filters,
            stats: stats,
            createFormRef: createFormRef,
            createForm: createForm,
            createRules: createRules,
            assignForm: assignForm,
            processForm: processForm,
            closeForm: closeForm,
            topStations: topStations,
            handlerOptions: handlerOptions,
            normalizeText: normalizeText,
            formatMoney: formatMoney,
            formatUnix: formatUnix,
            displayUserName: displayUserName,
            exceptionStatusTagType: exceptionStatusTagType,
            canAssign: canAssign,
            canProcess: canProcess,
            canClose: canClose,
            loadStats: loadStats,
            openCreateDialog: openCreateDialog,
            submitCreateException: submitCreateException,
            openDetail: openDetail,
            openAssignDialog: openAssignDialog,
            submitAssign: submitAssign,
            openProcessDialog: openProcessDialog,
            submitProcess: submitProcess,
            openCloseDialog: openCloseDialog,
            submitClose: submitClose,
            applyFilters: applyFilters,
            resetFilters: resetFilters,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
