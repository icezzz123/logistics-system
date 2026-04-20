import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import OrderCreateDialog from '@/components/OrderCreateDialog.vue';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
import { readQueryNumber, readQueryString } from '@/utils/workbench';
const authStore = useAuthStore();
const route = useRoute();
const loading = ref(false);
const detailLoading = ref(false);
const transitionLoading = ref(false);
const statusSubmitting = ref(false);
const orders = ref([]);
const detailOrder = ref(null);
const statusLogs = ref([]);
const transitions = ref([]);
const detailDrawerVisible = ref(false);
const statusDialogVisible = ref(false);
const createDialogVisible = ref(false);
const currentOrderId = ref(null);
const pagination = reactive({
    total: 0,
    page: 1,
    pageSize: 10,
});
const filters = reactive({
    order_no: '',
    status: undefined,
    sender_country: '',
    receiver_country: '',
    dateRange: [],
});
const statistics = reactive({
    total_orders: 0,
    total_amount: 0,
    by_status: [],
    by_transport_mode: [],
    by_sender_country: [],
    by_receiver_country: [],
});
const statusForm = reactive({
    status: undefined,
    remark: '',
});
const statusOptions = [
    { value: 1, label: '待处理' },
    { value: 2, label: '已接单' },
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
const canUpdateStatus = computed(() => [6, 7].includes(authStore.user?.role || 0));
const canCreateOrder = computed(() => [2, 5, 7].includes(authStore.user?.role || 0));
const pendingCount = computed(() => getStatusCount(1));
const exceptionCount = computed(() => getStatusCount(11));
const topTransportModes = computed(() => statistics.by_transport_mode.slice(0, 3));
function normalizeText(value, fallback = '-') {
    const text = String(value ?? '').trim();
    if (!text || /^[?？�]+$/.test(text)) {
        return fallback;
    }
    return text;
}
function formatAmount(amount, currency = 'CNY') {
    return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
}
function formatCompactAmount(amount) {
    return `¥${(Number(amount) || 0).toFixed(2)}`;
}
function formatTimestamp(value) {
    if (!value) {
        return '-';
    }
    if (typeof value === 'string') {
        const text = value.trim();
        return text && !/^[?？�]+$/.test(text) ? text : '-';
    }
    const date = new Date(value > 1000000000000 ? value : value * 1000);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString('zh-CN', { hour12: false });
}
function formatAddress(country, province, city, address) {
    const values = [country, province, city, address]
        .map((item) => normalizeText(item, ''))
        .filter(Boolean);
    return values.length ? values.join(' / ') : '-';
}
function transportModeLabel(mode) {
    const mapping = {
        1: '空运',
        2: '海运',
        3: '陆运',
        4: '铁路',
        5: '快递',
    };
    return mapping[mode] || '未知方式';
}
function statusName(status) {
    return statusOptions.find((item) => item.value === status)?.label || '未知状态';
}
function statusTagType(status) {
    const mapping = {
        1: 'info',
        2: 'primary',
        3: 'warning',
        4: 'warning',
        5: 'primary',
        6: 'warning',
        7: 'warning',
        8: 'primary',
        9: 'success',
        10: 'success',
        11: 'danger',
        12: 'info',
    };
    return mapping[status] || 'info';
}
function hierarchyTypeLabel(type) {
    const mapping = {
        normal: '普通单',
        master: '母单',
        child: '子单',
    };
    return mapping[type] || '未知结构';
}
function relationTypeLabel(type) {
    const mapping = {
        normal: '普通订单',
        split_parent: '拆单母单',
        split_child: '拆单子单',
        merge_parent: '合单母单',
        merge_child: '合单子单',
    };
    return mapping[type] || '普通订单';
}
function getStatusCount(status) {
    return statistics.by_status.find((item) => item.status === status)?.count || 0;
}
function buildTimeParams() {
    const params = {};
    if (filters.dateRange.length === 2) {
        params.start_time = Math.floor(Number(filters.dateRange[0]) / 1000);
        params.end_time = Math.floor(Number(filters.dateRange[1]) / 1000);
    }
    return params;
}
function applyWorkbenchFilters() {
    const status = readQueryNumber(route.query, 'status');
    const orderNo = readQueryString(route.query, 'order_no');
    const senderCountry = readQueryString(route.query, 'sender_country');
    const receiverCountry = readQueryString(route.query, 'receiver_country');
    if (typeof status === 'number' && statusOptions.some((item) => item.value === status)) {
        filters.status = status;
    }
    if (typeof orderNo === 'string') {
        filters.order_no = orderNo;
    }
    if (typeof senderCountry === 'string') {
        filters.sender_country = senderCountry;
    }
    if (typeof receiverCountry === 'string') {
        filters.receiver_country = receiverCountry;
    }
}
async function loadOrders() {
    loading.value = true;
    try {
        const params = {
            page: pagination.page,
            page_size: pagination.pageSize,
            ...buildTimeParams(),
        };
        if (filters.order_no.trim()) {
            params.order_no = filters.order_no.trim();
        }
        if (typeof filters.status === 'number') {
            params.status = filters.status;
        }
        if (filters.sender_country.trim()) {
            params.sender_country = filters.sender_country.trim();
        }
        if (filters.receiver_country.trim()) {
            params.receiver_country = filters.receiver_country.trim();
        }
        const data = await http.get('/orders', { params });
        orders.value = data.list || [];
        pagination.total = data.total || 0;
        pagination.page = data.page || 1;
        pagination.pageSize = data.page_size || pagination.pageSize;
    }
    finally {
        loading.value = false;
    }
}
async function loadStatistics() {
    const data = await http.get('/orders/statistics', {
        params: buildTimeParams(),
    });
    statistics.total_orders = data.total_orders || 0;
    statistics.total_amount = data.total_amount || 0;
    statistics.by_status = data.by_status || [];
    statistics.by_transport_mode = data.by_transport_mode || [];
    statistics.by_sender_country = data.by_sender_country || [];
    statistics.by_receiver_country = data.by_receiver_country || [];
}
async function refreshOverview() {
    pagination.page = 1;
    await Promise.all([loadOrders(), loadStatistics()]);
}
function resetFilters() {
    filters.order_no = '';
    filters.status = undefined;
    filters.sender_country = '';
    filters.receiver_country = '';
    filters.dateRange = [];
    void refreshOverview();
}
function handlePageChange(page) {
    pagination.page = page;
    void loadOrders();
}
function handleSizeChange(size) {
    pagination.pageSize = size;
    pagination.page = 1;
    void loadOrders();
}
async function handleOrderCreated(payload) {
    await refreshOverview();
    await openDetail({ id: payload.order_id });
}
async function loadOrderTransitions(orderId) {
    const data = await http.get(`/orders/${orderId}/transitions`);
    transitions.value = data.allowed_statuses || [];
}
async function loadOrderDetailBundle(orderId) {
    const [detail, logs, transitionData] = await Promise.all([
        http.get(`/orders/${orderId}`),
        http.get(`/orders/${orderId}/status-logs`),
        http.get(`/orders/${orderId}/transitions`),
    ]);
    detailOrder.value = detail;
    statusLogs.value = logs || [];
    transitions.value = transitionData.allowed_statuses || [];
}
async function openDetail(order) {
    detailDrawerVisible.value = true;
    detailLoading.value = true;
    currentOrderId.value = order.id;
    try {
        await loadOrderDetailBundle(order.id);
    }
    finally {
        detailLoading.value = false;
    }
}
async function openStatusDialog(order) {
    currentOrderId.value = order.id;
    statusForm.status = undefined;
    statusForm.remark = '';
    statusDialogVisible.value = true;
    transitionLoading.value = true;
    try {
        await loadOrderTransitions(order.id);
        statusForm.status = transitions.value[0]?.status;
    }
    catch {
        statusDialogVisible.value = false;
    }
    finally {
        transitionLoading.value = false;
    }
}
async function submitStatusUpdate() {
    if (!currentOrderId.value || !statusForm.status) {
        return;
    }
    statusSubmitting.value = true;
    try {
        await http.put(`/orders/${currentOrderId.value}/status`, {
            status: statusForm.status,
            remark: statusForm.remark.trim(),
        });
        ElMessage.success('订单状态已更新');
        statusDialogVisible.value = false;
        await Promise.all([loadOrders(), loadStatistics()]);
        if (detailDrawerVisible.value && detailOrder.value?.id === currentOrderId.value) {
            detailLoading.value = true;
            try {
                await loadOrderDetailBundle(currentOrderId.value);
            }
            finally {
                detailLoading.value = false;
            }
        }
    }
    finally {
        statusSubmitting.value = false;
    }
}
function canCancel(status) {
    return [1, 2].includes(status);
}
async function cancelOrder(order) {
    if (!canCancel(order.status)) {
        return;
    }
    try {
        await ElMessageBox.confirm(`确认取消订单 “${order.order_no}” 吗？`, '取消确认', {
            confirmButtonText: '确认取消',
            cancelButtonText: '返回',
            type: 'warning',
        });
    }
    catch {
        return;
    }
    await http.put(`/orders/${order.id}/cancel`);
    ElMessage.success('订单已取消');
    await Promise.all([loadOrders(), loadStatistics()]);
    if (detailDrawerVisible.value && detailOrder.value?.id === order.id) {
        detailLoading.value = true;
        try {
            await loadOrderDetailBundle(order.id);
        }
        finally {
            detailLoading.value = false;
        }
    }
}
onMounted(async () => {
    applyWorkbenchFilters();
    await Promise.all([loadOrders(), loadStatistics()]);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['order-goods']} */ ;
/** @type {__VLS_StyleScopedClasses['order-package-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-package-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-package-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "order-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topTransportModes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item.transport_mode),
    });
    (item.mode_name);
    (item.count);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.statistics.total_orders);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatCompactAmount(__VLS_ctx.statistics.total_amount));
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.pendingCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.exceptionCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel order-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
if (__VLS_ctx.canCreateOrder) {
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
            if (!(__VLS_ctx.canCreateOrder))
                return;
            __VLS_ctx.createDialogVisible = true;
        }
    };
    __VLS_3.slots.default;
    var __VLS_3;
}
const __VLS_8 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "order-filters" },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "order-filters" },
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
    modelValue: (__VLS_ctx.filters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_22 = __VLS_21({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    onKeyup: (__VLS_ctx.refreshOverview)
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
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.filters.status),
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
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "发件国家",
}));
const __VLS_46 = __VLS_45({
    label: "发件国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.filters.sender_country),
    clearable: true,
    placeholder: "如：中国 / USA",
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.filters.sender_country),
    clearable: true,
    placeholder: "如：中国 / USA",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "收件国家",
}));
const __VLS_54 = __VLS_53({
    label: "收件国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.filters.receiver_country),
    clearable: true,
    placeholder: "如：美国 / 日本",
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.filters.receiver_country),
    clearable: true,
    placeholder: "如：美国 / 日本",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "下单时间",
}));
const __VLS_62 = __VLS_61({
    label: "下单时间",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.filters.dateRange),
    type: "daterange",
    valueFormat: "x",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    rangeSeparator: "至",
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.filters.dateRange),
    type: "daterange",
    valueFormat: "x",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    rangeSeparator: "至",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
var __VLS_63;
const __VLS_68 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({}));
const __VLS_70 = __VLS_69({}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_74 = __VLS_73({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
let __VLS_76;
let __VLS_77;
let __VLS_78;
const __VLS_79 = {
    onClick: (__VLS_ctx.refreshOverview)
};
__VLS_75.slots.default;
var __VLS_75;
const __VLS_80 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    ...{ 'onClick': {} },
}));
const __VLS_82 = __VLS_81({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
let __VLS_84;
let __VLS_85;
let __VLS_86;
const __VLS_87 = {
    onClick: (__VLS_ctx.resetFilters)
};
__VLS_83.slots.default;
var __VLS_83;
var __VLS_71;
var __VLS_11;
const __VLS_88 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    data: (__VLS_ctx.orders),
    ...{ class: "order-table" },
    stripe: true,
}));
const __VLS_90 = __VLS_89({
    data: (__VLS_ctx.orders),
    ...{ class: "order-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_91.slots.default;
const __VLS_92 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    prop: "order_no",
    label: "订单号",
    minWidth: "190",
}));
const __VLS_94 = __VLS_93({
    prop: "order_no",
    label: "订单号",
    minWidth: "190",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
const __VLS_96 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    label: "线路",
    minWidth: "230",
}));
const __VLS_98 = __VLS_97({
    label: "线路",
    minWidth: "230",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_99.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-route" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.sender_country));
    (__VLS_ctx.normalizeText(scope.row.sender_city));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.receiver_country));
    (__VLS_ctx.normalizeText(scope.row.receiver_city));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.normalizeText(scope.row.sender_name, '发件人待补充'));
    (__VLS_ctx.normalizeText(scope.row.receiver_name, '收件人待补充'));
}
var __VLS_99;
const __VLS_100 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    label: "货物",
    minWidth: "180",
}));
const __VLS_102 = __VLS_101({
    label: "货物",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_103.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-goods" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.goods_name, '货物待补充'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.goods_weight.toFixed(2));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (scope.row.package_count || 0);
    if (scope.row.child_order_count) {
        (scope.row.child_order_count);
    }
    else if (scope.row.parent_order_no) {
        (scope.row.parent_order_no);
    }
}
var __VLS_103;
const __VLS_104 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    label: "运输方式",
    width: "130",
}));
const __VLS_106 = __VLS_105({
    label: "运输方式",
    width: "130",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_107.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_108 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        effect: "plain",
        type: "warning",
    }));
    const __VLS_110 = __VLS_109({
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    __VLS_111.slots.default;
    (__VLS_ctx.transportModeLabel(scope.row.transport_mode));
    var __VLS_111;
}
var __VLS_107;
const __VLS_112 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    label: "金额",
    width: "140",
}));
const __VLS_114 = __VLS_113({
    label: "金额",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_115.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatAmount(scope.row.total_amount));
}
var __VLS_115;
const __VLS_116 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "状态",
    width: "120",
}));
const __VLS_118 = __VLS_117({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_119.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_120 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        type: (__VLS_ctx.statusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_122 = __VLS_121({
        type: (__VLS_ctx.statusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    (scope.row.status_name);
    var __VLS_123;
}
var __VLS_119;
const __VLS_124 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    prop: "order_time",
    label: "下单时间",
    minWidth: "170",
}));
const __VLS_126 = __VLS_125({
    prop: "order_time",
    label: "下单时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
const __VLS_128 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "操作",
    fixed: "right",
    width: "260",
}));
const __VLS_130 = __VLS_129({
    label: "操作",
    fixed: "right",
    width: "260",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_131.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-actions" },
    });
    const __VLS_132 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_136;
    let __VLS_137;
    let __VLS_138;
    const __VLS_139 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openDetail(scope.row);
        }
    };
    __VLS_135.slots.default;
    var __VLS_135;
    if (__VLS_ctx.canUpdateStatus) {
        const __VLS_140 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_142 = __VLS_141({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        let __VLS_144;
        let __VLS_145;
        let __VLS_146;
        const __VLS_147 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canUpdateStatus))
                    return;
                __VLS_ctx.openStatusDialog(scope.row);
            }
        };
        __VLS_143.slots.default;
        var __VLS_143;
    }
    const __VLS_148 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        disabled: (!__VLS_ctx.canCancel(scope.row.status)),
    }));
    const __VLS_150 = __VLS_149({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        disabled: (!__VLS_ctx.canCancel(scope.row.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    let __VLS_152;
    let __VLS_153;
    let __VLS_154;
    const __VLS_155 = {
        onClick: (...[$event]) => {
            __VLS_ctx.cancelOrder(scope.row);
        }
    };
    __VLS_151.slots.default;
    var __VLS_151;
}
var __VLS_131;
var __VLS_91;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-pagination" },
});
const __VLS_156 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_158 = __VLS_157({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
let __VLS_160;
let __VLS_161;
let __VLS_162;
const __VLS_163 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_164 = {
    onSizeChange: (__VLS_ctx.handleSizeChange)
};
var __VLS_159;
/** @type {[typeof OrderCreateDialog, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(OrderCreateDialog, new OrderCreateDialog({
    ...{ 'onCreated': {} },
    modelValue: (__VLS_ctx.createDialogVisible),
}));
const __VLS_166 = __VLS_165({
    ...{ 'onCreated': {} },
    modelValue: (__VLS_ctx.createDialogVisible),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
let __VLS_168;
let __VLS_169;
let __VLS_170;
const __VLS_171 = {
    onCreated: (__VLS_ctx.handleOrderCreated)
};
var __VLS_167;
const __VLS_172 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    modelValue: (__VLS_ctx.detailDrawerVisible),
    size: "62%",
    title: "订单详情",
}));
const __VLS_174 = __VLS_173({
    modelValue: (__VLS_ctx.detailDrawerVisible),
    size: "62%",
    title: "订单详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
__VLS_175.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.detailLoading) }, null, null);
if (__VLS_ctx.detailOrder) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail__hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.detailOrder.order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.goods_name, '货物信息待补充'));
    (__VLS_ctx.detailOrder.goods_weight.toFixed(2));
    (__VLS_ctx.transportModeLabel(__VLS_ctx.detailOrder.transport_mode));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail__hero-tags" },
    });
    const __VLS_176 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        type: (__VLS_ctx.statusTagType(__VLS_ctx.detailOrder.status)),
        effect: "dark",
    }));
    const __VLS_178 = __VLS_177({
        type: (__VLS_ctx.statusTagType(__VLS_ctx.detailOrder.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    __VLS_179.slots.default;
    (__VLS_ctx.statusName(__VLS_ctx.detailOrder.status));
    var __VLS_179;
    const __VLS_180 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
        effect: "plain",
    }));
    const __VLS_182 = __VLS_181({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_181));
    __VLS_183.slots.default;
    (__VLS_ctx.hierarchyTypeLabel(__VLS_ctx.detailOrder.hierarchy_type));
    var __VLS_183;
    const __VLS_184 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
        effect: "plain",
        type: "warning",
    }));
    const __VLS_186 = __VLS_185({
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_185));
    __VLS_187.slots.default;
    (__VLS_ctx.relationTypeLabel(__VLS_ctx.detailOrder.relation_type));
    var __VLS_187;
    const __VLS_188 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        effect: "plain",
    }));
    const __VLS_190 = __VLS_189({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    __VLS_191.slots.default;
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.total_amount, __VLS_ctx.detailOrder.currency));
    var __VLS_191;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail__toolbar" },
    });
    if (__VLS_ctx.canUpdateStatus) {
        const __VLS_192 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
            ...{ 'onClick': {} },
            type: "primary",
            plain: true,
        }));
        const __VLS_194 = __VLS_193({
            ...{ 'onClick': {} },
            type: "primary",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_193));
        let __VLS_196;
        let __VLS_197;
        let __VLS_198;
        const __VLS_199 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailOrder))
                    return;
                if (!(__VLS_ctx.canUpdateStatus))
                    return;
                __VLS_ctx.openStatusDialog(__VLS_ctx.detailOrder);
            }
        };
        __VLS_195.slots.default;
        var __VLS_195;
    }
    const __VLS_200 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
        type: "warning",
        plain: true,
        disabled: (!__VLS_ctx.canCancel(__VLS_ctx.detailOrder.status)),
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
        type: "warning",
        plain: true,
        disabled: (!__VLS_ctx.canCancel(__VLS_ctx.detailOrder.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.detailOrder))
                return;
            __VLS_ctx.cancelOrder(__VLS_ctx.detailOrder);
        }
    };
    __VLS_203.slots.default;
    var __VLS_203;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail__grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "order-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.sender_name, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.sender_phone, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAddress(__VLS_ctx.detailOrder.sender_country, __VLS_ctx.detailOrder.sender_province, __VLS_ctx.detailOrder.sender_city, __VLS_ctx.detailOrder.sender_address));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.sender_postcode, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "order-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.receiver_name, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.receiver_phone, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAddress(__VLS_ctx.detailOrder.receiver_country, __VLS_ctx.detailOrder.receiver_province, __VLS_ctx.detailOrder.receiver_city, __VLS_ctx.detailOrder.receiver_address));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.receiver_postcode, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "order-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.goods_name, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.goods_category, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.detailOrder.goods_weight.toFixed(2));
    (__VLS_ctx.detailOrder.goods_quantity || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.total_amount, __VLS_ctx.detailOrder.currency));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.freight_charge, __VLS_ctx.detailOrder.currency));
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.insurance_fee, __VLS_ctx.detailOrder.currency));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.payment_status, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "order-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatTimestamp(__VLS_ctx.detailOrder.order_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.detailOrder.estimated_days || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatTimestamp(__VLS_ctx.detailOrder.pickup_time));
    (__VLS_ctx.formatTimestamp(__VLS_ctx.detailOrder.sign_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.remark, '无备注'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "order-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.hierarchyTypeLabel(__VLS_ctx.detailOrder.hierarchy_type));
    (__VLS_ctx.relationTypeLabel(__VLS_ctx.detailOrder.relation_type));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.parent_order_no, '当前即母单或普通单'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.root_order_no, __VLS_ctx.detailOrder.order_no));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.detailOrder.package_count || 0);
    (__VLS_ctx.detailOrder.child_order_count || 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card order-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.detailOrder.packages.length);
    if (__VLS_ctx.detailOrder.packages.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "order-package-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.detailOrder.packages))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "order-log-list__head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.parcel_no);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.weight.toFixed(2));
            (item.quantity);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.normalizeText(item.goods_name));
            (__VLS_ctx.normalizeText(item.goods_category, '未分类'));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.normalizeText(item.order_no));
            (__VLS_ctx.relationTypeLabel(item.package_type));
            (__VLS_ctx.formatAmount(item.goods_value));
        }
    }
    else {
        const __VLS_208 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
            description: "暂无包裹明细",
        }));
        const __VLS_210 = __VLS_209({
            description: "暂无包裹明细",
        }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card order-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.detailOrder.child_orders.length);
    if (__VLS_ctx.detailOrder.child_orders.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "order-log-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.detailOrder.child_orders))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "order-log-list__head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.order_no);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.package_count);
            (__VLS_ctx.formatAmount(item.total_amount));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.hierarchyTypeLabel(item.hierarchy_type));
            (__VLS_ctx.relationTypeLabel(item.relation_type));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (item.status_name);
        }
    }
    else {
        const __VLS_212 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
            description: "当前没有子单",
        }));
        const __VLS_214 = __VLS_213({
            description: "当前没有子单",
        }, ...__VLS_functionalComponentArgsRest(__VLS_213));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card order-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.transitions.length);
    if (__VLS_ctx.transitions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "order-transition-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.transitions))) {
            const __VLS_216 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
                key: (item.status),
                effect: "plain",
                type: "warning",
            }));
            const __VLS_218 = __VLS_217({
                key: (item.status),
                effect: "plain",
                type: "warning",
            }, ...__VLS_functionalComponentArgsRest(__VLS_217));
            __VLS_219.slots.default;
            (item.status_name);
            var __VLS_219;
        }
    }
    else {
        const __VLS_220 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
            description: "当前状态没有可执行流转",
        }));
        const __VLS_222 = __VLS_221({
            description: "当前状态没有可执行流转",
        }, ...__VLS_functionalComponentArgsRest(__VLS_221));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card order-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.statusLogs.length);
    if (__VLS_ctx.statusLogs.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "order-log-list" },
        });
        for (const [log] of __VLS_getVForSourceType((__VLS_ctx.statusLogs))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (log.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "order-log-list__head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (log.from_status_name);
            (log.to_status_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatTimestamp(log.change_time || log.created_at));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (__VLS_ctx.normalizeText(log.operator_name, '系统'));
            (log.operator_role_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.normalizeText(log.remark, '无备注'));
        }
    }
    else {
        const __VLS_224 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
            description: "暂无状态日志",
        }));
        const __VLS_226 = __VLS_225({
            description: "暂无状态日志",
        }, ...__VLS_functionalComponentArgsRest(__VLS_225));
    }
}
var __VLS_175;
const __VLS_228 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
    modelValue: (__VLS_ctx.statusDialogVisible),
    title: "推进订单状态",
    width: "460px",
}));
const __VLS_230 = __VLS_229({
    modelValue: (__VLS_ctx.statusDialogVisible),
    title: "推进订单状态",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_229));
__VLS_231.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.transitionLoading) }, null, null);
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
    label: "目标状态",
}));
const __VLS_238 = __VLS_237({
    label: "目标状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_237));
__VLS_239.slots.default;
const __VLS_240 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
    modelValue: (__VLS_ctx.statusForm.status),
    placeholder: "请选择目标状态",
    ...{ style: {} },
    disabled: (!__VLS_ctx.transitions.length),
}));
const __VLS_242 = __VLS_241({
    modelValue: (__VLS_ctx.statusForm.status),
    placeholder: "请选择目标状态",
    ...{ style: {} },
    disabled: (!__VLS_ctx.transitions.length),
}, ...__VLS_functionalComponentArgsRest(__VLS_241));
__VLS_243.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.transitions))) {
    const __VLS_244 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        key: (item.status),
        label: (item.status_name),
        value: (item.status),
    }));
    const __VLS_246 = __VLS_245({
        key: (item.status),
        label: (item.status_name),
        value: (item.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
}
var __VLS_243;
var __VLS_239;
const __VLS_248 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
    label: "备注",
}));
const __VLS_250 = __VLS_249({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_249));
__VLS_251.slots.default;
const __VLS_252 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
    modelValue: (__VLS_ctx.statusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写这次流转的说明",
}));
const __VLS_254 = __VLS_253({
    modelValue: (__VLS_ctx.statusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写这次流转的说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_253));
var __VLS_251;
var __VLS_235;
if (!__VLS_ctx.transitionLoading && !__VLS_ctx.transitions.length) {
    const __VLS_256 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        description: "当前状态没有可执行流转",
    }));
    const __VLS_258 = __VLS_257({
        description: "当前状态没有可执行流转",
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
}
{
    const { footer: __VLS_thisSlot } = __VLS_231.slots;
    const __VLS_260 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        ...{ 'onClick': {} },
    }));
    const __VLS_262 = __VLS_261({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    let __VLS_264;
    let __VLS_265;
    let __VLS_266;
    const __VLS_267 = {
        onClick: (...[$event]) => {
            __VLS_ctx.statusDialogVisible = false;
        }
    };
    __VLS_263.slots.default;
    var __VLS_263;
    const __VLS_268 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.statusSubmitting),
        disabled: (!__VLS_ctx.statusForm.status),
    }));
    const __VLS_270 = __VLS_269({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.statusSubmitting),
        disabled: (!__VLS_ctx.statusForm.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
    let __VLS_272;
    let __VLS_273;
    let __VLS_274;
    const __VLS_275 = {
        onClick: (__VLS_ctx.submitStatusUpdate)
    };
    __VLS_271.slots.default;
    var __VLS_271;
}
var __VLS_231;
/** @type {__VLS_StyleScopedClasses['order-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['order-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['order-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['order-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['order-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['order-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['order-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['order-table']} */ ;
/** @type {__VLS_StyleScopedClasses['order-route']} */ ;
/** @type {__VLS_StyleScopedClasses['order-goods']} */ ;
/** @type {__VLS_StyleScopedClasses['order-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['order-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['order-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail__hero-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-package-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-transition-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list__head']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            OrderCreateDialog: OrderCreateDialog,
            loading: loading,
            detailLoading: detailLoading,
            transitionLoading: transitionLoading,
            statusSubmitting: statusSubmitting,
            orders: orders,
            detailOrder: detailOrder,
            statusLogs: statusLogs,
            transitions: transitions,
            detailDrawerVisible: detailDrawerVisible,
            statusDialogVisible: statusDialogVisible,
            createDialogVisible: createDialogVisible,
            pagination: pagination,
            filters: filters,
            statistics: statistics,
            statusForm: statusForm,
            statusOptions: statusOptions,
            canUpdateStatus: canUpdateStatus,
            canCreateOrder: canCreateOrder,
            pendingCount: pendingCount,
            exceptionCount: exceptionCount,
            topTransportModes: topTransportModes,
            normalizeText: normalizeText,
            formatAmount: formatAmount,
            formatCompactAmount: formatCompactAmount,
            formatTimestamp: formatTimestamp,
            formatAddress: formatAddress,
            transportModeLabel: transportModeLabel,
            statusName: statusName,
            statusTagType: statusTagType,
            hierarchyTypeLabel: hierarchyTypeLabel,
            relationTypeLabel: relationTypeLabel,
            refreshOverview: refreshOverview,
            resetFilters: resetFilters,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
            handleOrderCreated: handleOrderCreated,
            openDetail: openDetail,
            openStatusDialog: openStatusDialog,
            submitStatusUpdate: submitStatusUpdate,
            canCancel: canCancel,
            cancelOrder: cancelOrder,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
