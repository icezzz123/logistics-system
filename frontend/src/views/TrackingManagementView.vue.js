import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { readQueryEnum } from '@/utils/workbench';
const route = useRoute();
const activeTab = ref('records');
const records = ref([]);
const warnings = ref([]);
const orderOptions = ref([]);
const timelineData = ref(null);
const historyData = ref(null);
const recordLoading = ref(false);
const warningLoading = ref(false);
const timelineLoading = ref(false);
const historyLoading = ref(false);
const createSubmitting = ref(false);
const createDialogVisible = ref(false);
const timelineDrawerVisible = ref(false);
const historyDrawerVisible = ref(false);
const recordPagination = reactive({ total: 0, page: 1, pageSize: 10 });
const warningPagination = reactive({ total: 0, page: 1, pageSize: 10 });
const recordFilters = reactive({ order_no: '', status: '' });
const warningFilters = reactive({ order_no: '', warning_level: undefined, warning_type: undefined });
const createFormRef = ref();
const createForm = reactive({ order_id: undefined, location: '', latitude: 0, longitude: 0, status: '', description: '', track_time: undefined });
const createRules = { order_id: [{ required: true, message: '请选择订单', trigger: 'change' }], location: [{ required: true, message: '请输入追踪位置', trigger: 'blur' }], status: [{ required: true, message: '请输入追踪状态', trigger: 'blur' }] };
const topWarnings = computed(() => warnings.value.slice(0, 4));
const criticalWarningCount = computed(() => warnings.value.filter((item) => item.warning_level === 'critical').length);
const delayedWarningCount = computed(() => warnings.value.filter((item) => item.warning_type === 'delay').length);
const staleWarningCount = computed(() => warnings.value.filter((item) => item.warning_type === 'stale_update').length);
const warningCount = computed(() => warnings.value.filter((item) => item.warning_level === 'warning').length);
function normalizeText(value, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text))
    return fallback; return text; }
function formatUnix(value) { if (!value)
    return '-'; const date = new Date(value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }); }
function formatHours(value) { return `${(Number(value) || 0).toFixed(1)} h`; }
function applyWorkbenchFilters() {
    const tab = readQueryEnum(route.query, 'tab', ['records', 'warnings']);
    const warningLevel = readQueryEnum(route.query, 'warning_level', ['warning', 'critical']);
    const warningType = readQueryEnum(route.query, 'warning_type', ['timeliness', 'delay', 'stale_update']);
    if (tab) {
        activeTab.value = tab;
    }
    if (warningLevel) {
        warningFilters.warning_level = warningLevel;
    }
    if (warningType) {
        warningFilters.warning_type = warningType;
    }
}
function buildRecordParams() { const params = { page: recordPagination.page, page_size: recordPagination.pageSize }; if (recordFilters.order_no.trim())
    params.order_no = recordFilters.order_no.trim(); if (recordFilters.status.trim())
    params.status = recordFilters.status.trim(); return params; }
function buildWarningParams() { const params = { page: warningPagination.page, page_size: warningPagination.pageSize }; if (warningFilters.order_no?.trim())
    params.order_no = warningFilters.order_no.trim(); if (warningFilters.warning_level)
    params.warning_level = warningFilters.warning_level; if (warningFilters.warning_type)
    params.warning_type = warningFilters.warning_type; return params; }
async function loadOrderOptions() { const data = await http.get('/orders', { params: { page: 1, page_size: 100 } }); orderOptions.value = data.list || []; }
async function loadRecords() { recordLoading.value = true; try {
    const data = await http.get('/tracking/records', { params: buildRecordParams() });
    records.value = data.list || [];
    recordPagination.total = data.total || 0;
    recordPagination.page = data.page || recordPagination.page;
    recordPagination.pageSize = data.page_size || recordPagination.pageSize;
}
finally {
    recordLoading.value = false;
} }
async function loadWarnings() { warningLoading.value = true; try {
    const data = await http.get('/tracking/warnings', { params: buildWarningParams() });
    warnings.value = data.list || [];
    warningPagination.total = data.total || 0;
    warningPagination.page = data.page || warningPagination.page;
    warningPagination.pageSize = data.page_size || warningPagination.pageSize;
}
finally {
    warningLoading.value = false;
} }
async function refreshTrackingOverview() { await Promise.all([loadRecords(), loadWarnings()]); }
function openCreateDialog() { createForm.order_id = undefined; createForm.location = ''; createForm.latitude = 0; createForm.longitude = 0; createForm.status = ''; createForm.description = ''; createForm.track_time = undefined; createDialogVisible.value = true; createFormRef.value?.clearValidate(); }
async function submitCreateRecord() { if (!createFormRef.value)
    return; const valid = await createFormRef.value.validate().catch(() => false); if (!valid)
    return; createSubmitting.value = true; try {
    await http.post('/tracking/records', { order_id: createForm.order_id, location: createForm.location.trim(), latitude: Number(createForm.latitude), longitude: Number(createForm.longitude), status: createForm.status.trim(), description: createForm.description.trim(), track_time: createForm.track_time ? Math.floor(Number(createForm.track_time) / 1000) : 0 });
    ElMessage.success('追踪记录已创建');
    createDialogVisible.value = false;
    await refreshTrackingOverview();
}
finally {
    createSubmitting.value = false;
} }
async function openTimeline(orderID) { timelineDrawerVisible.value = true; timelineLoading.value = true; try {
    timelineData.value = await http.get(`/tracking/orders/${orderID}/timeline`);
}
finally {
    timelineLoading.value = false;
} }
async function openHistory(orderID) { historyDrawerVisible.value = true; historyLoading.value = true; try {
    historyData.value = await http.get(`/tracking/orders/${orderID}/history`);
}
finally {
    historyLoading.value = false;
} }
async function applyRecordFilters() { recordPagination.page = 1; await loadRecords(); }
function resetRecordFilters() { recordFilters.order_no = ''; recordFilters.status = ''; recordPagination.page = 1; void loadRecords(); }
function handleRecordPageChange(page) { recordPagination.page = page; void loadRecords(); }
function handleRecordSizeChange(size) { recordPagination.pageSize = size; recordPagination.page = 1; void loadRecords(); }
async function applyWarningFilters() { warningPagination.page = 1; await loadWarnings(); }
function resetWarningFilters() { warningFilters.order_no = ''; warningFilters.warning_level = undefined; warningFilters.warning_type = undefined; warningPagination.page = 1; void loadWarnings(); }
function handleWarningPageChange(page) { warningPagination.page = page; void loadWarnings(); }
function handleWarningSizeChange(size) { warningPagination.pageSize = size; warningPagination.page = 1; void loadWarnings(); }
onMounted(async () => { applyWorkbenchFilters(); await Promise.all([loadOrderOptions(), loadRecords(), loadWarnings()]); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tracking-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--warning']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-pagination']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "tracking-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topWarnings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (`${item.order_id}-${item.warning_type}`),
    });
    (item.order_no);
    (item.warning_type_name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.recordPagination.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warningPagination.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.criticalWarningCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.delayedWarningCount);
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "tracking-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "tracking-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "追踪记录",
    name: "records",
}));
const __VLS_6 = __VLS_5({
    label: "追踪记录",
    name: "records",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel tracking-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-panel__toolbar-actions" },
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
    onClick: (__VLS_ctx.refreshTrackingOverview)
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
const __VLS_24 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.recordFilters),
    ...{ class: "tracking-filters" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.recordFilters),
    ...{ class: "tracking-filters" },
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
    modelValue: (__VLS_ctx.recordFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.recordFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onKeyup: (__VLS_ctx.applyRecordFilters)
};
var __VLS_39;
var __VLS_35;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "追踪状态",
}));
const __VLS_46 = __VLS_45({
    label: "追踪状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.recordFilters.status),
    clearable: true,
    placeholder: "如：运输中 / 清关中",
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.recordFilters.status),
    clearable: true,
    placeholder: "如：运输中 / 清关中",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({}));
const __VLS_54 = __VLS_53({}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onClick: (__VLS_ctx.applyRecordFilters)
};
__VLS_59.slots.default;
var __VLS_59;
const __VLS_64 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    ...{ 'onClick': {} },
}));
const __VLS_66 = __VLS_65({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_68;
let __VLS_69;
let __VLS_70;
const __VLS_71 = {
    onClick: (__VLS_ctx.resetRecordFilters)
};
__VLS_67.slots.default;
var __VLS_67;
var __VLS_55;
var __VLS_27;
const __VLS_72 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    data: (__VLS_ctx.records),
    ...{ class: "tracking-table" },
    stripe: true,
}));
const __VLS_74 = __VLS_73({
    data: (__VLS_ctx.records),
    ...{ class: "tracking-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.recordLoading) }, null, null);
__VLS_75.slots.default;
const __VLS_76 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "订单",
    minWidth: "210",
}));
const __VLS_78 = __VLS_77({
    label: "订单",
    minWidth: "210",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_79.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tracking-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.status, '未知状态'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.description, '无描述'));
}
var __VLS_79;
const __VLS_80 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "位置",
    minWidth: "180",
}));
const __VLS_82 = __VLS_81({
    label: "位置",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_83.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.location, '未知位置'));
}
var __VLS_83;
const __VLS_84 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "操作人",
    minWidth: "140",
}));
const __VLS_86 = __VLS_85({
    label: "操作人",
    minWidth: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_87.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.operator_name, '系统'));
}
var __VLS_87;
const __VLS_88 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    label: "追踪时间",
    minWidth: "170",
}));
const __VLS_90 = __VLS_89({
    label: "追踪时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_91.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.track_time));
}
var __VLS_91;
const __VLS_92 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: "操作",
    fixed: "right",
    width: "160",
}));
const __VLS_94 = __VLS_93({
    label: "操作",
    fixed: "right",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_95.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tracking-actions" },
    });
    const __VLS_96 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_98 = __VLS_97({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    let __VLS_100;
    let __VLS_101;
    let __VLS_102;
    const __VLS_103 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openTimeline(scope.row.order_id);
        }
    };
    __VLS_99.slots.default;
    var __VLS_99;
    const __VLS_104 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }));
    const __VLS_106 = __VLS_105({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
    let __VLS_108;
    let __VLS_109;
    let __VLS_110;
    const __VLS_111 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openHistory(scope.row.order_id);
        }
    };
    __VLS_107.slots.default;
    var __VLS_107;
}
var __VLS_95;
var __VLS_75;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-pagination" },
});
const __VLS_112 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.recordPagination.total),
    currentPage: (__VLS_ctx.recordPagination.page),
    pageSize: (__VLS_ctx.recordPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_114 = __VLS_113({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.recordPagination.total),
    currentPage: (__VLS_ctx.recordPagination.page),
    pageSize: (__VLS_ctx.recordPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
let __VLS_116;
let __VLS_117;
let __VLS_118;
const __VLS_119 = {
    onCurrentChange: (__VLS_ctx.handleRecordPageChange)
};
const __VLS_120 = {
    onSizeChange: (__VLS_ctx.handleRecordSizeChange)
};
var __VLS_115;
var __VLS_7;
const __VLS_121 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_122 = __VLS_asFunctionalComponent(__VLS_121, new __VLS_121({
    label: "时效预警",
    name: "warnings",
}));
const __VLS_123 = __VLS_122({
    label: "时效预警",
    name: "warnings",
}, ...__VLS_functionalComponentArgsRest(__VLS_122));
__VLS_124.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel tracking-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-panel__toolbar-actions" },
});
const __VLS_125 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_126 = __VLS_asFunctionalComponent(__VLS_125, new __VLS_125({
    ...{ 'onClick': {} },
}));
const __VLS_127 = __VLS_126({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_126));
let __VLS_129;
let __VLS_130;
let __VLS_131;
const __VLS_132 = {
    onClick: (__VLS_ctx.loadWarnings)
};
__VLS_128.slots.default;
var __VLS_128;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid summary-grid--warning" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warningCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.criticalWarningCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.staleWarningCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "summary-card card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.delayedWarningCount);
const __VLS_133 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_134 = __VLS_asFunctionalComponent(__VLS_133, new __VLS_133({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.warningFilters),
    ...{ class: "tracking-filters" },
}));
const __VLS_135 = __VLS_134({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.warningFilters),
    ...{ class: "tracking-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_134));
let __VLS_137;
let __VLS_138;
let __VLS_139;
const __VLS_140 = {
    onSubmit: () => { }
};
__VLS_136.slots.default;
const __VLS_141 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent(__VLS_141, new __VLS_141({
    label: "订单号",
}));
const __VLS_143 = __VLS_142({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_142));
__VLS_144.slots.default;
const __VLS_145 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent(__VLS_145, new __VLS_145({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.warningFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_147 = __VLS_146({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.warningFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_146));
let __VLS_149;
let __VLS_150;
let __VLS_151;
const __VLS_152 = {
    onKeyup: (__VLS_ctx.applyWarningFilters)
};
var __VLS_148;
var __VLS_144;
const __VLS_153 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({
    label: "级别",
}));
const __VLS_155 = __VLS_154({
    label: "级别",
}, ...__VLS_functionalComponentArgsRest(__VLS_154));
__VLS_156.slots.default;
const __VLS_157 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    modelValue: (__VLS_ctx.warningFilters.warning_level),
    clearable: true,
    placeholder: "全部级别",
    ...{ style: {} },
}));
const __VLS_159 = __VLS_158({
    modelValue: (__VLS_ctx.warningFilters.warning_level),
    clearable: true,
    placeholder: "全部级别",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
__VLS_160.slots.default;
const __VLS_161 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
    label: "全部级别",
    value: (undefined),
}));
const __VLS_163 = __VLS_162({
    label: "全部级别",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_162));
const __VLS_165 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
    label: "警告",
    value: "warning",
}));
const __VLS_167 = __VLS_166({
    label: "警告",
    value: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_166));
const __VLS_169 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
    label: "严重",
    value: "critical",
}));
const __VLS_171 = __VLS_170({
    label: "严重",
    value: "critical",
}, ...__VLS_functionalComponentArgsRest(__VLS_170));
var __VLS_160;
var __VLS_156;
const __VLS_173 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
    label: "类型",
}));
const __VLS_175 = __VLS_174({
    label: "类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_174));
__VLS_176.slots.default;
const __VLS_177 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
    modelValue: (__VLS_ctx.warningFilters.warning_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_179 = __VLS_178({
    modelValue: (__VLS_ctx.warningFilters.warning_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
__VLS_180.slots.default;
const __VLS_181 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_182 = __VLS_asFunctionalComponent(__VLS_181, new __VLS_181({
    label: "全部类型",
    value: (undefined),
}));
const __VLS_183 = __VLS_182({
    label: "全部类型",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_182));
const __VLS_185 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
    label: "时效风险",
    value: "timeliness",
}));
const __VLS_187 = __VLS_186({
    label: "时效风险",
    value: "timeliness",
}, ...__VLS_functionalComponentArgsRest(__VLS_186));
const __VLS_189 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_190 = __VLS_asFunctionalComponent(__VLS_189, new __VLS_189({
    label: "延误预警",
    value: "delay",
}));
const __VLS_191 = __VLS_190({
    label: "延误预警",
    value: "delay",
}, ...__VLS_functionalComponentArgsRest(__VLS_190));
const __VLS_193 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
    label: "长时间无更新",
    value: "stale_update",
}));
const __VLS_195 = __VLS_194({
    label: "长时间无更新",
    value: "stale_update",
}, ...__VLS_functionalComponentArgsRest(__VLS_194));
var __VLS_180;
var __VLS_176;
const __VLS_197 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({}));
const __VLS_199 = __VLS_198({}, ...__VLS_functionalComponentArgsRest(__VLS_198));
__VLS_200.slots.default;
const __VLS_201 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_203 = __VLS_202({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
let __VLS_205;
let __VLS_206;
let __VLS_207;
const __VLS_208 = {
    onClick: (__VLS_ctx.applyWarningFilters)
};
__VLS_204.slots.default;
var __VLS_204;
const __VLS_209 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
    ...{ 'onClick': {} },
}));
const __VLS_211 = __VLS_210({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
let __VLS_213;
let __VLS_214;
let __VLS_215;
const __VLS_216 = {
    onClick: (__VLS_ctx.resetWarningFilters)
};
__VLS_212.slots.default;
var __VLS_212;
var __VLS_200;
var __VLS_136;
const __VLS_217 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    data: (__VLS_ctx.warnings),
    ...{ class: "tracking-table" },
    stripe: true,
}));
const __VLS_219 = __VLS_218({
    data: (__VLS_ctx.warnings),
    ...{ class: "tracking-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.warningLoading) }, null, null);
__VLS_220.slots.default;
const __VLS_221 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    label: "订单",
    minWidth: "220",
}));
const __VLS_223 = __VLS_222({
    label: "订单",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
__VLS_224.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_224.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tracking-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.current_status_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.latest_tracking_status, '暂无追踪状态'));
}
var __VLS_224;
const __VLS_225 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    label: "预警",
    minWidth: "210",
}));
const __VLS_227 = __VLS_226({
    label: "预警",
    minWidth: "210",
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
__VLS_228.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_228.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tracking-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.warning_type_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.warning_level);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.warning_message, '无预警说明'));
}
var __VLS_228;
const __VLS_229 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    label: "最新位置",
    minWidth: "170",
}));
const __VLS_231 = __VLS_230({
    label: "最新位置",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
__VLS_232.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_232.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.latest_location, '未知位置'));
}
var __VLS_232;
const __VLS_233 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    label: "剩余 / 逾期",
    width: "160",
}));
const __VLS_235 = __VLS_234({
    label: "剩余 / 逾期",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
__VLS_236.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_236.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatHours(scope.row.remaining_hours));
    (__VLS_ctx.formatHours(scope.row.overdue_hours));
}
var __VLS_236;
const __VLS_237 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    label: "操作",
    fixed: "right",
    width: "160",
}));
const __VLS_239 = __VLS_238({
    label: "操作",
    fixed: "right",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
__VLS_240.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_240.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tracking-actions" },
    });
    const __VLS_241 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_243 = __VLS_242({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_242));
    let __VLS_245;
    let __VLS_246;
    let __VLS_247;
    const __VLS_248 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openTimeline(scope.row.order_id);
        }
    };
    __VLS_244.slots.default;
    var __VLS_244;
    const __VLS_249 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }));
    const __VLS_251 = __VLS_250({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_250));
    let __VLS_253;
    let __VLS_254;
    let __VLS_255;
    const __VLS_256 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openHistory(scope.row.order_id);
        }
    };
    __VLS_252.slots.default;
    var __VLS_252;
}
var __VLS_240;
var __VLS_220;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-pagination" },
});
const __VLS_257 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.warningPagination.total),
    currentPage: (__VLS_ctx.warningPagination.page),
    pageSize: (__VLS_ctx.warningPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_259 = __VLS_258({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.warningPagination.total),
    currentPage: (__VLS_ctx.warningPagination.page),
    pageSize: (__VLS_ctx.warningPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
let __VLS_261;
let __VLS_262;
let __VLS_263;
const __VLS_264 = {
    onCurrentChange: (__VLS_ctx.handleWarningPageChange)
};
const __VLS_265 = {
    onSizeChange: (__VLS_ctx.handleWarningSizeChange)
};
var __VLS_260;
var __VLS_124;
var __VLS_3;
const __VLS_266 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
    modelValue: (__VLS_ctx.createDialogVisible),
    title: "新增追踪记录",
    width: "760px",
}));
const __VLS_268 = __VLS_267({
    modelValue: (__VLS_ctx.createDialogVisible),
    title: "新增追踪记录",
    width: "760px",
}, ...__VLS_functionalComponentArgsRest(__VLS_267));
__VLS_269.slots.default;
const __VLS_270 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_271 = __VLS_asFunctionalComponent(__VLS_270, new __VLS_270({
    ref: "createFormRef",
    model: (__VLS_ctx.createForm),
    rules: (__VLS_ctx.createRules),
    labelPosition: "top",
}));
const __VLS_272 = __VLS_271({
    ref: "createFormRef",
    model: (__VLS_ctx.createForm),
    rules: (__VLS_ctx.createRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_271));
/** @type {typeof __VLS_ctx.createFormRef} */ ;
var __VLS_274 = {};
__VLS_273.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-form-grid" },
});
const __VLS_276 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
    label: "订单",
    prop: "order_id",
}));
const __VLS_278 = __VLS_277({
    label: "订单",
    prop: "order_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_277));
__VLS_279.slots.default;
const __VLS_280 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
    modelValue: (__VLS_ctx.createForm.order_id),
    placeholder: "请选择订单",
    ...{ style: {} },
}));
const __VLS_282 = __VLS_281({
    modelValue: (__VLS_ctx.createForm.order_id),
    placeholder: "请选择订单",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_281));
__VLS_283.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.orderOptions))) {
    const __VLS_284 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }));
    const __VLS_286 = __VLS_285({
        key: (item.id),
        label: (item.order_no),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
}
var __VLS_283;
var __VLS_279;
const __VLS_288 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
    label: "追踪状态",
    prop: "status",
}));
const __VLS_290 = __VLS_289({
    label: "追踪状态",
    prop: "status",
}, ...__VLS_functionalComponentArgsRest(__VLS_289));
__VLS_291.slots.default;
const __VLS_292 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    modelValue: (__VLS_ctx.createForm.status),
    placeholder: "如：已到达站点 / 清关中",
}));
const __VLS_294 = __VLS_293({
    modelValue: (__VLS_ctx.createForm.status),
    placeholder: "如：已到达站点 / 清关中",
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
var __VLS_291;
const __VLS_296 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
    label: "位置",
    prop: "location",
}));
const __VLS_298 = __VLS_297({
    label: "位置",
    prop: "location",
}, ...__VLS_functionalComponentArgsRest(__VLS_297));
__VLS_299.slots.default;
const __VLS_300 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
    modelValue: (__VLS_ctx.createForm.location),
    placeholder: "请输入位置描述",
}));
const __VLS_302 = __VLS_301({
    modelValue: (__VLS_ctx.createForm.location),
    placeholder: "请输入位置描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_301));
var __VLS_299;
const __VLS_304 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_305 = __VLS_asFunctionalComponent(__VLS_304, new __VLS_304({
    label: "追踪时间",
}));
const __VLS_306 = __VLS_305({
    label: "追踪时间",
}, ...__VLS_functionalComponentArgsRest(__VLS_305));
__VLS_307.slots.default;
const __VLS_308 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_309 = __VLS_asFunctionalComponent(__VLS_308, new __VLS_308({
    modelValue: (__VLS_ctx.createForm.track_time),
    type: "datetime",
    valueFormat: "x",
    placeholder: "默认当前时间",
    ...{ style: {} },
}));
const __VLS_310 = __VLS_309({
    modelValue: (__VLS_ctx.createForm.track_time),
    type: "datetime",
    valueFormat: "x",
    placeholder: "默认当前时间",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_309));
var __VLS_307;
const __VLS_312 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_313 = __VLS_asFunctionalComponent(__VLS_312, new __VLS_312({
    label: "纬度",
}));
const __VLS_314 = __VLS_313({
    label: "纬度",
}, ...__VLS_functionalComponentArgsRest(__VLS_313));
__VLS_315.slots.default;
const __VLS_316 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_317 = __VLS_asFunctionalComponent(__VLS_316, new __VLS_316({
    modelValue: (__VLS_ctx.createForm.latitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}));
const __VLS_318 = __VLS_317({
    modelValue: (__VLS_ctx.createForm.latitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_317));
var __VLS_315;
const __VLS_320 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_321 = __VLS_asFunctionalComponent(__VLS_320, new __VLS_320({
    label: "经度",
}));
const __VLS_322 = __VLS_321({
    label: "经度",
}, ...__VLS_functionalComponentArgsRest(__VLS_321));
__VLS_323.slots.default;
const __VLS_324 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_325 = __VLS_asFunctionalComponent(__VLS_324, new __VLS_324({
    modelValue: (__VLS_ctx.createForm.longitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}));
const __VLS_326 = __VLS_325({
    modelValue: (__VLS_ctx.createForm.longitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_325));
var __VLS_323;
const __VLS_328 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_329 = __VLS_asFunctionalComponent(__VLS_328, new __VLS_328({
    label: "描述",
    ...{ class: "tracking-form-grid__wide" },
}));
const __VLS_330 = __VLS_329({
    label: "描述",
    ...{ class: "tracking-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_329));
__VLS_331.slots.default;
const __VLS_332 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_333 = __VLS_asFunctionalComponent(__VLS_332, new __VLS_332({
    modelValue: (__VLS_ctx.createForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "请输入追踪描述",
}));
const __VLS_334 = __VLS_333({
    modelValue: (__VLS_ctx.createForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "500",
    showWordLimit: true,
    placeholder: "请输入追踪描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_333));
var __VLS_331;
var __VLS_273;
{
    const { footer: __VLS_thisSlot } = __VLS_269.slots;
    const __VLS_336 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_337 = __VLS_asFunctionalComponent(__VLS_336, new __VLS_336({
        ...{ 'onClick': {} },
    }));
    const __VLS_338 = __VLS_337({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_337));
    let __VLS_340;
    let __VLS_341;
    let __VLS_342;
    const __VLS_343 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDialogVisible = false;
        }
    };
    __VLS_339.slots.default;
    var __VLS_339;
    const __VLS_344 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_345 = __VLS_asFunctionalComponent(__VLS_344, new __VLS_344({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createSubmitting),
    }));
    const __VLS_346 = __VLS_345({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_345));
    let __VLS_348;
    let __VLS_349;
    let __VLS_350;
    const __VLS_351 = {
        onClick: (__VLS_ctx.submitCreateRecord)
    };
    __VLS_347.slots.default;
    var __VLS_347;
}
var __VLS_269;
const __VLS_352 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_353 = __VLS_asFunctionalComponent(__VLS_352, new __VLS_352({
    modelValue: (__VLS_ctx.timelineDrawerVisible),
    size: "58%",
    title: "订单追踪时间轴",
}));
const __VLS_354 = __VLS_353({
    modelValue: (__VLS_ctx.timelineDrawerVisible),
    size: "58%",
    title: "订单追踪时间轴",
}, ...__VLS_functionalComponentArgsRest(__VLS_353));
__VLS_355.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.timelineLoading) }, null, null);
if (__VLS_ctx.timelineData) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.timelineData.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.timelineData.current_status_name);
    (__VLS_ctx.normalizeText(__VLS_ctx.timelineData.latest_location, '暂无位置'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-hero__tags" },
    });
    const __VLS_356 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_357 = __VLS_asFunctionalComponent(__VLS_356, new __VLS_356({
        type: (__VLS_ctx.timelineData.is_delayed ? 'danger' : 'success'),
        effect: "dark",
    }));
    const __VLS_358 = __VLS_357({
        type: (__VLS_ctx.timelineData.is_delayed ? 'danger' : 'success'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_357));
    __VLS_359.slots.default;
    (__VLS_ctx.timelineData.is_delayed ? '已延误' : '正常');
    var __VLS_359;
    const __VLS_360 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_361 = __VLS_asFunctionalComponent(__VLS_360, new __VLS_360({
        effect: "plain",
    }));
    const __VLS_362 = __VLS_361({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_361));
    __VLS_363.slots.default;
    (__VLS_ctx.formatUnix(__VLS_ctx.timelineData.expected_delivery_time));
    var __VLS_363;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.timelineData.timeline))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.record_id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.normalizeText(item.status, '未知状态'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.display_time);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.normalizeText(item.location, '未知位置'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.normalizeText(item.description, '无描述'));
    }
}
var __VLS_355;
const __VLS_364 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_365 = __VLS_asFunctionalComponent(__VLS_364, new __VLS_364({
    modelValue: (__VLS_ctx.historyDrawerVisible),
    size: "58%",
    title: "订单追踪历史",
}));
const __VLS_366 = __VLS_365({
    modelValue: (__VLS_ctx.historyDrawerVisible),
    size: "58%",
    title: "订单追踪历史",
}, ...__VLS_functionalComponentArgsRest(__VLS_365));
__VLS_367.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.historyLoading) }, null, null);
if (__VLS_ctx.historyData) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.historyData.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.historyData.current_status_name);
    const __VLS_368 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_369 = __VLS_asFunctionalComponent(__VLS_368, new __VLS_368({
        data: (__VLS_ctx.historyData.list),
        size: "small",
        stripe: true,
    }));
    const __VLS_370 = __VLS_369({
        data: (__VLS_ctx.historyData.list),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_369));
    __VLS_371.slots.default;
    const __VLS_372 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_373 = __VLS_asFunctionalComponent(__VLS_372, new __VLS_372({
        prop: "status",
        label: "状态",
        minWidth: "160",
    }));
    const __VLS_374 = __VLS_373({
        prop: "status",
        label: "状态",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_373));
    const __VLS_376 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_377 = __VLS_asFunctionalComponent(__VLS_376, new __VLS_376({
        prop: "location",
        label: "位置",
        minWidth: "180",
    }));
    const __VLS_378 = __VLS_377({
        prop: "location",
        label: "位置",
        minWidth: "180",
    }, ...__VLS_functionalComponentArgsRest(__VLS_377));
    const __VLS_380 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_381 = __VLS_asFunctionalComponent(__VLS_380, new __VLS_380({
        prop: "operator_name",
        label: "操作人",
        minWidth: "120",
    }));
    const __VLS_382 = __VLS_381({
        prop: "operator_name",
        label: "操作人",
        minWidth: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_381));
    __VLS_383.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_383.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.normalizeText(scope.row.operator_name, '系统'));
    }
    var __VLS_383;
    const __VLS_384 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_385 = __VLS_asFunctionalComponent(__VLS_384, new __VLS_384({
        label: "时间",
        minWidth: "160",
    }));
    const __VLS_386 = __VLS_385({
        label: "时间",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_385));
    __VLS_387.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_387.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.formatUnix(scope.row.track_time));
    }
    var __VLS_387;
    const __VLS_388 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_389 = __VLS_asFunctionalComponent(__VLS_388, new __VLS_388({
        prop: "description",
        label: "描述",
        minWidth: "200",
    }));
    const __VLS_390 = __VLS_389({
        prop: "description",
        label: "描述",
        minWidth: "200",
    }, ...__VLS_functionalComponentArgsRest(__VLS_389));
    var __VLS_371;
}
var __VLS_367;
/** @type {__VLS_StyleScopedClasses['tracking-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-table']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid--warning']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-table']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
// @ts-ignore
var __VLS_275 = __VLS_274;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            activeTab: activeTab,
            records: records,
            warnings: warnings,
            orderOptions: orderOptions,
            timelineData: timelineData,
            historyData: historyData,
            recordLoading: recordLoading,
            warningLoading: warningLoading,
            timelineLoading: timelineLoading,
            historyLoading: historyLoading,
            createSubmitting: createSubmitting,
            createDialogVisible: createDialogVisible,
            timelineDrawerVisible: timelineDrawerVisible,
            historyDrawerVisible: historyDrawerVisible,
            recordPagination: recordPagination,
            warningPagination: warningPagination,
            recordFilters: recordFilters,
            warningFilters: warningFilters,
            createFormRef: createFormRef,
            createForm: createForm,
            createRules: createRules,
            topWarnings: topWarnings,
            criticalWarningCount: criticalWarningCount,
            delayedWarningCount: delayedWarningCount,
            staleWarningCount: staleWarningCount,
            warningCount: warningCount,
            normalizeText: normalizeText,
            formatUnix: formatUnix,
            formatHours: formatHours,
            loadWarnings: loadWarnings,
            refreshTrackingOverview: refreshTrackingOverview,
            openCreateDialog: openCreateDialog,
            submitCreateRecord: submitCreateRecord,
            openTimeline: openTimeline,
            openHistory: openHistory,
            applyRecordFilters: applyRecordFilters,
            resetRecordFilters: resetRecordFilters,
            handleRecordPageChange: handleRecordPageChange,
            handleRecordSizeChange: handleRecordSizeChange,
            applyWarningFilters: applyWarningFilters,
            resetWarningFilters: resetWarningFilters,
            handleWarningPageChange: handleWarningPageChange,
            handleWarningSizeChange: handleWarningSizeChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
