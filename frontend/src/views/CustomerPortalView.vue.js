import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import OrderCreateDialog from '@/components/OrderCreateDialog.vue';
import { useAuthStore } from '@/stores/auth';
import http from '@/utils/http';
const statusOptions = [
    { value: 1, label: '待处理' },
    { value: 2, label: '已接单' },
    { value: 13, label: '待揽收' },
    { value: 14, label: '揽收中' },
    { value: 15, label: '已揽收' },
    { value: 3, label: '已入库' },
    { value: 4, label: '分拣中' },
    { value: 5, label: '运输中' },
    { value: 6, label: '清关中' },
    { value: 7, label: '目的地分拣' },
    { value: 8, label: '配送中' },
    { value: 9, label: '已送达' },
    { value: 10, label: '已签收' },
    { value: 11, label: '异常' },
    { value: 12, label: '已取消' },
];
const exceptionTypeOptions = [
    { value: 1, label: '破损' },
    { value: 2, label: '丢失' },
    { value: 3, label: '延误' },
    { value: 4, label: '错分' },
    { value: 5, label: '拒收' },
    { value: 6, label: '清关异常' },
    { value: 7, label: '其他' },
];
const authStore = useAuthStore();
const orderLoading = ref(false);
const timelineLoading = ref(false);
const historyLoading = ref(false);
const exceptionSubmitting = ref(false);
const createDialogVisible = ref(false);
const orders = ref([]);
const warnings = ref([]);
const exceptions = ref([]);
const selectedOrder = ref(null);
const currentTimelineOrder = ref(null);
const timelineData = ref(null);
const historyData = ref(null);
const exceptionDialogVisible = ref(false);
const timelineDrawerVisible = ref(false);
const historyDrawerVisible = ref(false);
const orderPagination = reactive({ total: 0, page: 1, pageSize: 8 });
const warningPagination = reactive({ total: 0, page: 1, pageSize: 6 });
const exceptionPagination = reactive({ total: 0, page: 1, pageSize: 6 });
const orderFilters = reactive({ order_no: '', status: undefined });
const exceptionForm = reactive({ type: 3, description: '', remark: '' });
const inTransitCount = computed(() => orders.value.filter((item) => [13, 14, 15, 3, 4, 5, 6, 7, 8].includes(item.status)).length);
const visibleTimelineItems = computed(() => {
    if (!timelineData.value) {
        return [];
    }
    if (timelineData.value.timeline?.length) {
        return timelineData.value.timeline.map((item) => ({ ...item, is_fallback: false }));
    }
    return [{
            record_id: 0,
            status: timelineData.value.current_status_name,
            description: '',
            location: '',
            display_time: currentTimelineOrder.value?.order_time || '下单时间未知',
            is_fallback: true,
        }];
});
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
function statusTagType(status) {
    return { 1: 'info', 2: 'primary', 3: 'warning', 4: 'warning', 5: 'primary', 6: 'warning', 7: 'warning', 8: 'primary', 9: 'success', 10: 'success', 11: 'danger', 12: 'info' }[status] || 'info';
}
async function loadOrders() {
    orderLoading.value = true;
    try {
        const params = { page: orderPagination.page, page_size: orderPagination.pageSize };
        if (orderFilters.order_no.trim())
            params.order_no = orderFilters.order_no.trim();
        if (typeof orderFilters.status === 'number')
            params.status = orderFilters.status;
        const data = await http.get('/orders', { params });
        orders.value = data.list || [];
        orderPagination.total = data.total || 0;
    }
    finally {
        orderLoading.value = false;
    }
}
async function loadWarnings() {
    const data = await http.get('/tracking/warnings', { params: { page: 1, page_size: warningPagination.pageSize } });
    warnings.value = data.list || [];
    warningPagination.total = data.total || 0;
}
async function loadExceptions() {
    const data = await http.get('/exceptions', { params: { page: 1, page_size: exceptionPagination.pageSize } });
    exceptions.value = data.list || [];
    exceptionPagination.total = data.total || 0;
}
function resetOrderFilters() {
    orderFilters.order_no = '';
    orderFilters.status = undefined;
    orderPagination.page = 1;
    void loadOrders();
}
function handleOrderPageChange(page) {
    orderPagination.page = page;
    void loadOrders();
}
function openExceptionDialog(order) {
    selectedOrder.value = order;
    exceptionForm.type = 3;
    exceptionForm.description = '';
    exceptionForm.remark = '';
    exceptionDialogVisible.value = true;
}
async function submitException() {
    if (!selectedOrder.value || !exceptionForm.description.trim())
        return;
    exceptionSubmitting.value = true;
    try {
        await http.post('/exceptions', {
            order_id: selectedOrder.value.id,
            type: exceptionForm.type,
            description: exceptionForm.description.trim(),
            remark: exceptionForm.remark.trim(),
        });
        ElMessage.success('异常反馈已提交');
        exceptionDialogVisible.value = false;
        await loadExceptions();
    }
    finally {
        exceptionSubmitting.value = false;
    }
}
async function handleOrderCreated() {
    await loadOrders();
}
async function openTimeline(order) {
    currentTimelineOrder.value = order;
    timelineDrawerVisible.value = true;
    timelineLoading.value = true;
    try {
        timelineData.value = await http.get(`/tracking/orders/${order.id}/timeline`);
    }
    finally {
        timelineLoading.value = false;
    }
}
async function openHistory(order) {
    historyDrawerVisible.value = true;
    historyLoading.value = true;
    try {
        historyData.value = await http.get(`/tracking/orders/${order.id}/history`);
    }
    finally {
        historyLoading.value = false;
    }
}
onMounted(async () => {
    await Promise.all([loadOrders(), loadWarnings(), loadExceptions()]);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['customer-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-list']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-list']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-list']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-timeline__content']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-timeline__content']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero__stats']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "customer-portal-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.orderPagination.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.inTransitCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warningPagination.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.exceptionPagination.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel customer-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (...[$event]) => {
        __VLS_ctx.createDialogVisible = true;
    }
};
__VLS_3.slots.default;
var __VLS_3;
const __VLS_8 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.orderFilters),
    ...{ class: "customer-filters" },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.orderFilters),
    ...{ class: "customer-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onSubmit: () => { }
};
__VLS_11.slots.default;
const __VLS_16 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "订单号",
}));
const __VLS_18 = __VLS_17({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.orderFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_22 = __VLS_21({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.orderFilters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    onKeyup: (__VLS_ctx.loadOrders)
};
var __VLS_23;
var __VLS_19;
const __VLS_28 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "状态",
}));
const __VLS_30 = __VLS_29({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.orderFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.orderFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_38 = __VLS_37({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.statusOptions))) {
    const __VLS_40 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_42 = __VLS_41({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
}
var __VLS_35;
var __VLS_31;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_50 = __VLS_49({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
let __VLS_52;
let __VLS_53;
let __VLS_54;
const __VLS_55 = {
    onClick: (__VLS_ctx.loadOrders)
};
__VLS_51.slots.default;
var __VLS_51;
const __VLS_56 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    ...{ 'onClick': {} },
}));
const __VLS_58 = __VLS_57({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
let __VLS_60;
let __VLS_61;
let __VLS_62;
const __VLS_63 = {
    onClick: (__VLS_ctx.resetOrderFilters)
};
__VLS_59.slots.default;
var __VLS_59;
var __VLS_47;
var __VLS_11;
const __VLS_64 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    data: (__VLS_ctx.orders),
    stripe: true,
}));
const __VLS_66 = __VLS_65({
    data: (__VLS_ctx.orders),
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.orderLoading) }, null, null);
__VLS_67.slots.default;
const __VLS_68 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    prop: "order_no",
    label: "订单号",
    minWidth: "180",
}));
const __VLS_70 = __VLS_69({
    prop: "order_no",
    label: "订单号",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
const __VLS_72 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    label: "线路",
    minWidth: "240",
}));
const __VLS_74 = __VLS_73({
    label: "线路",
    minWidth: "240",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_75.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.sender_country);
    (scope.row.receiver_country);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.goods_name);
}
var __VLS_75;
const __VLS_76 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "状态",
    width: "120",
}));
const __VLS_78 = __VLS_77({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_79.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_80 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        effect: "dark",
        type: (__VLS_ctx.statusTagType(scope.row.status)),
    }));
    const __VLS_82 = __VLS_81({
        effect: "dark",
        type: (__VLS_ctx.statusTagType(scope.row.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    (scope.row.status_name);
    var __VLS_83;
}
var __VLS_79;
const __VLS_84 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    prop: "order_time",
    label: "下单时间",
    minWidth: "160",
}));
const __VLS_86 = __VLS_85({
    prop: "order_time",
    label: "下单时间",
    minWidth: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const __VLS_88 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    label: "操作",
    width: "240",
    fixed: "right",
}));
const __VLS_90 = __VLS_89({
    label: "操作",
    width: "240",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_91.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-actions" },
    });
    const __VLS_92 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openTimeline(scope.row);
        }
    };
    __VLS_95.slots.default;
    var __VLS_95;
    const __VLS_100 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openHistory(scope.row);
        }
    };
    __VLS_103.slots.default;
    var __VLS_103;
    const __VLS_108 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openExceptionDialog(scope.row);
        }
    };
    __VLS_111.slots.default;
    var __VLS_111;
}
var __VLS_91;
var __VLS_67;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-pagination" },
});
const __VLS_116 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    ...{ 'onCurrentChange': {} },
    background: true,
    layout: "total, prev, pager, next",
    total: (__VLS_ctx.orderPagination.total),
    currentPage: (__VLS_ctx.orderPagination.page),
    pageSize: (__VLS_ctx.orderPagination.pageSize),
}));
const __VLS_118 = __VLS_117({
    ...{ 'onCurrentChange': {} },
    background: true,
    layout: "total, prev, pager, next",
    total: (__VLS_ctx.orderPagination.total),
    currentPage: (__VLS_ctx.orderPagination.page),
    pageSize: (__VLS_ctx.orderPagination.pageSize),
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
let __VLS_120;
let __VLS_121;
let __VLS_122;
const __VLS_123 = {
    onCurrentChange: (__VLS_ctx.handleOrderPageChange)
};
var __VLS_119;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel customer-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_124 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}));
const __VLS_126 = __VLS_125({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
let __VLS_128;
let __VLS_129;
let __VLS_130;
const __VLS_131 = {
    onClick: (__VLS_ctx.loadWarnings)
};
__VLS_127.slots.default;
var __VLS_127;
if (__VLS_ctx.warnings.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.warnings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`${item.order_id}-${item.warning_type}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.order_no);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.warning_type_name);
        (item.warning_level);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.normalizeText(item.warning_message, '暂无说明'));
    }
}
else {
    const __VLS_132 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        description: "暂无追踪预警",
    }));
    const __VLS_134 = __VLS_133({
        description: "暂无追踪预警",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel customer-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "customer-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_136 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}));
const __VLS_138 = __VLS_137({
    ...{ 'onClick': {} },
    link: true,
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
let __VLS_140;
let __VLS_141;
let __VLS_142;
const __VLS_143 = {
    onClick: (__VLS_ctx.loadExceptions)
};
__VLS_139.slots.default;
var __VLS_139;
if (__VLS_ctx.exceptions.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "customer-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.exceptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.exception_no);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.order_no);
        (item.type_name);
        (item.status_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.normalizeText(item.description, '暂无描述'));
    }
}
else {
    const __VLS_144 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        description: "暂无异常反馈",
    }));
    const __VLS_146 = __VLS_145({
        description: "暂无异常反馈",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
}
const __VLS_148 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    modelValue: (__VLS_ctx.exceptionDialogVisible),
    title: "异常反馈",
    width: "620px",
}));
const __VLS_150 = __VLS_149({
    modelValue: (__VLS_ctx.exceptionDialogVisible),
    title: "异常反馈",
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
const __VLS_152 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    labelPosition: "top",
}));
const __VLS_154 = __VLS_153({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
const __VLS_156 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    label: "订单",
}));
const __VLS_158 = __VLS_157({
    label: "订单",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
const __VLS_160 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    modelValue: (__VLS_ctx.selectedOrder?.order_no || ''),
    disabled: true,
}));
const __VLS_162 = __VLS_161({
    modelValue: (__VLS_ctx.selectedOrder?.order_no || ''),
    disabled: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
var __VLS_159;
const __VLS_164 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    label: "异常类型",
}));
const __VLS_166 = __VLS_165({
    label: "异常类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
const __VLS_168 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    modelValue: (__VLS_ctx.exceptionForm.type),
    placeholder: "请选择异常类型",
    ...{ style: {} },
}));
const __VLS_170 = __VLS_169({
    modelValue: (__VLS_ctx.exceptionForm.type),
    placeholder: "请选择异常类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.exceptionTypeOptions))) {
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
var __VLS_171;
var __VLS_167;
const __VLS_176 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: "异常描述",
}));
const __VLS_178 = __VLS_177({
    label: "异常描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    modelValue: (__VLS_ctx.exceptionForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入异常描述",
}));
const __VLS_182 = __VLS_181({
    modelValue: (__VLS_ctx.exceptionForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "1000",
    showWordLimit: true,
    placeholder: "请输入异常描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
var __VLS_179;
const __VLS_184 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    label: "备注",
}));
const __VLS_186 = __VLS_185({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
__VLS_187.slots.default;
const __VLS_188 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    modelValue: (__VLS_ctx.exceptionForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}));
const __VLS_190 = __VLS_189({
    modelValue: (__VLS_ctx.exceptionForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
var __VLS_187;
var __VLS_155;
{
    const { footer: __VLS_thisSlot } = __VLS_151.slots;
    const __VLS_192 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        ...{ 'onClick': {} },
    }));
    const __VLS_194 = __VLS_193({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    let __VLS_196;
    let __VLS_197;
    let __VLS_198;
    const __VLS_199 = {
        onClick: (...[$event]) => {
            __VLS_ctx.exceptionDialogVisible = false;
        }
    };
    __VLS_195.slots.default;
    var __VLS_195;
    const __VLS_200 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.exceptionSubmitting),
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.exceptionSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (__VLS_ctx.submitException)
    };
    __VLS_203.slots.default;
    var __VLS_203;
}
var __VLS_151;
/** @type {[typeof OrderCreateDialog, ]} */ ;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent(OrderCreateDialog, new OrderCreateDialog({
    ...{ 'onCreated': {} },
    modelValue: (__VLS_ctx.createDialogVisible),
}));
const __VLS_209 = __VLS_208({
    ...{ 'onCreated': {} },
    modelValue: (__VLS_ctx.createDialogVisible),
}, ...__VLS_functionalComponentArgsRest(__VLS_208));
let __VLS_211;
let __VLS_212;
let __VLS_213;
const __VLS_214 = {
    onCreated: (__VLS_ctx.handleOrderCreated)
};
var __VLS_210;
const __VLS_215 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
    modelValue: (__VLS_ctx.timelineDrawerVisible),
    size: "56%",
    title: "订单时间轴",
}));
const __VLS_217 = __VLS_216({
    modelValue: (__VLS_ctx.timelineDrawerVisible),
    size: "56%",
    title: "订单时间轴",
}, ...__VLS_functionalComponentArgsRest(__VLS_216));
__VLS_218.slots.default;
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
    const __VLS_219 = {}.ElTimeline;
    /** @type {[typeof __VLS_components.ElTimeline, typeof __VLS_components.elTimeline, typeof __VLS_components.ElTimeline, typeof __VLS_components.elTimeline, ]} */ ;
    // @ts-ignore
    const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
        ...{ class: "customer-timeline" },
    }));
    const __VLS_221 = __VLS_220({
        ...{ class: "customer-timeline" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_220));
    __VLS_222.slots.default;
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.visibleTimelineItems))) {
        const __VLS_223 = {}.ElTimelineItem;
        /** @type {[typeof __VLS_components.ElTimelineItem, typeof __VLS_components.elTimelineItem, typeof __VLS_components.ElTimelineItem, typeof __VLS_components.elTimelineItem, ]} */ ;
        // @ts-ignore
        const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
            key: (`${item.record_id}-${item.display_time}`),
            timestamp: (item.display_time),
            placement: "top",
            type: (item.is_fallback ? 'info' : 'primary'),
        }));
        const __VLS_225 = __VLS_224({
            key: (`${item.record_id}-${item.display_time}`),
            timestamp: (item.display_time),
            placement: "top",
            type: (item.is_fallback ? 'info' : 'primary'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_224));
        __VLS_226.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "customer-timeline__content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.normalizeText(item.status, '未知状态'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.normalizeText(item.location, '暂无位置'));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.normalizeText(item.description, item.is_fallback ? '当前暂无追踪明细，系统仅展示订单当前状态' : '无描述'));
        var __VLS_226;
    }
    var __VLS_222;
}
var __VLS_218;
const __VLS_227 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
    modelValue: (__VLS_ctx.historyDrawerVisible),
    size: "56%",
    title: "追踪历史",
}));
const __VLS_229 = __VLS_228({
    modelValue: (__VLS_ctx.historyDrawerVisible),
    size: "56%",
    title: "追踪历史",
}, ...__VLS_functionalComponentArgsRest(__VLS_228));
__VLS_230.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.historyLoading) }, null, null);
if (__VLS_ctx.historyData) {
    const __VLS_231 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
        data: (__VLS_ctx.historyData.list),
        size: "small",
        stripe: true,
    }));
    const __VLS_233 = __VLS_232({
        data: (__VLS_ctx.historyData.list),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_232));
    __VLS_234.slots.default;
    const __VLS_235 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
        prop: "status",
        label: "状态",
        minWidth: "160",
    }));
    const __VLS_237 = __VLS_236({
        prop: "status",
        label: "状态",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_236));
    const __VLS_239 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
        prop: "location",
        label: "位置",
        minWidth: "180",
    }));
    const __VLS_241 = __VLS_240({
        prop: "location",
        label: "位置",
        minWidth: "180",
    }, ...__VLS_functionalComponentArgsRest(__VLS_240));
    const __VLS_243 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
        label: "时间",
        minWidth: "170",
    }));
    const __VLS_245 = __VLS_244({
        label: "时间",
        minWidth: "170",
    }, ...__VLS_functionalComponentArgsRest(__VLS_244));
    __VLS_246.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_246.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.formatUnix(scope.row.track_time));
    }
    var __VLS_246;
    const __VLS_247 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
        prop: "description",
        label: "描述",
        minWidth: "220",
    }));
    const __VLS_249 = __VLS_248({
        prop: "description",
        label: "描述",
        minWidth: "220",
    }, ...__VLS_functionalComponentArgsRest(__VLS_248));
    var __VLS_234;
}
var __VLS_230;
/** @type {__VLS_StyleScopedClasses['customer-portal-view']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-identity']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['customer-timeline__content']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-drawer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            OrderCreateDialog: OrderCreateDialog,
            statusOptions: statusOptions,
            exceptionTypeOptions: exceptionTypeOptions,
            orderLoading: orderLoading,
            timelineLoading: timelineLoading,
            historyLoading: historyLoading,
            exceptionSubmitting: exceptionSubmitting,
            createDialogVisible: createDialogVisible,
            orders: orders,
            warnings: warnings,
            exceptions: exceptions,
            selectedOrder: selectedOrder,
            timelineData: timelineData,
            historyData: historyData,
            exceptionDialogVisible: exceptionDialogVisible,
            timelineDrawerVisible: timelineDrawerVisible,
            historyDrawerVisible: historyDrawerVisible,
            orderPagination: orderPagination,
            warningPagination: warningPagination,
            exceptionPagination: exceptionPagination,
            orderFilters: orderFilters,
            exceptionForm: exceptionForm,
            inTransitCount: inTransitCount,
            visibleTimelineItems: visibleTimelineItems,
            normalizeText: normalizeText,
            formatUnix: formatUnix,
            statusTagType: statusTagType,
            loadOrders: loadOrders,
            loadWarnings: loadWarnings,
            loadExceptions: loadExceptions,
            resetOrderFilters: resetOrderFilters,
            handleOrderPageChange: handleOrderPageChange,
            openExceptionDialog: openExceptionDialog,
            submitException: submitException,
            handleOrderCreated: handleOrderCreated,
            openTimeline: openTimeline,
            openHistory: openHistory,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
