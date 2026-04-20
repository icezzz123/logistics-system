import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { printHtmlDocument, renderPrintFieldGrid, renderPrintHead, renderPrintTable, joinPrintLines } from '@/utils/print';
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
const customsDialogVisible = ref(false);
const customsNodeDialogVisible = ref(false);
const customsExceptionDialogVisible = ref(false);
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
const customsForm = reactive({
    customs_declaration: '',
    hs_code: '',
    declared_value: 0,
    customs_duty: 0,
    customs_vat: 0,
    customs_other_tax: 0,
    customs_status: '',
    remark: '',
});
const customsNodeForm = reactive({
    node_code: '',
    node_status: 'completed',
    duty_amount: 0,
    vat_amount: 0,
    other_tax_amount: 0,
    remark: '',
});
const customsExceptionForm = reactive({
    description: '',
    remark: '',
});
const customsSubmitting = ref(false);
const customsNodeSubmitting = ref(false);
const customsExceptionSubmitting = ref(false);
const customsSuggesting = ref(false);
const customsSuggestion = ref(null);
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
const canUpdateStatus = computed(() => [6, 7].includes(authStore.user?.role || 0));
const canManageCustoms = computed(() => [5, 6, 7].includes(authStore.user?.role || 0));
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
function customsNodeCodeLabel(code) {
    const mapping = {
        declared: '申报已提交',
        documents_ready: '资料齐备',
        reviewing: '海关审核中',
        duty_pending: '税费待缴',
        duty_paid: '税费已缴',
        inspection: '查验处理中',
        released: '清关放行',
        customs_exception: '关务异常',
    };
    return mapping[code] || '未知节点';
}
function printShippingLabel() {
    if (!detailOrder.value)
        return;
    const order = detailOrder.value;
    const receiverAddress = formatAddress(order.receiver_country, order.receiver_province, order.receiver_city, order.receiver_address);
    const senderAddress = formatAddress(order.sender_country, order.sender_province, order.sender_city, order.sender_address);
    const parcels = order.packages?.length ? order.packages.map((item) => item.parcel_no).join(' / ') : '整单';
    const html = `
    ${renderPrintHead('物流面单', order.order_no, statusName(order.status))}
    <section class="label-shell">
      <div class="label-top">
        <div>
          <div class="label-code">${order.order_no}</div>
          <p>包裹号：${parcels}</p>
        </div>
        <span class="print-chip">${transportModeLabel(order.transport_mode)}</span>
      </div>
      <div class="label-route">${escapeHtmlLine(order.sender_city)} → ${escapeHtmlLine(order.receiver_city)}</div>
      <div class="label-contact">收件人：${escapeHtmlLine(order.receiver_name)} / ${escapeHtmlLine(order.receiver_phone)}</div>
      <div class="label-address">${escapeHtmlLine(receiverAddress)}</div>
      <div class="label-meta">
        <div>发件：${escapeHtmlLine(order.sender_name)}</div>
        <div>发件电话：${escapeHtmlLine(order.sender_phone)}</div>
        <div>发件地址：${escapeHtmlLine(senderAddress)}</div>
      </div>
    </section>
    <section class="print-note">面单打印时间：${escapeHtmlLine(formatTimestamp(Date.now()))}</section>
  `;
    printHtmlDocument(`面单-${order.order_no}`, html);
}
function printHandoverSheet() {
    if (!detailOrder.value)
        return;
    const order = detailOrder.value;
    const packageRows = (order.packages?.length ? order.packages : [{
            id: 0,
            order_id: order.id,
            order_no: order.order_no,
            parcel_no: '整单',
            package_type: 'normal',
            goods_name: order.goods_name,
            goods_category: order.goods_category,
            weight: order.goods_weight,
            volume: order.goods_volume,
            quantity: order.goods_quantity,
            goods_value: order.goods_value,
            insured_amount: order.insured_amount,
            remark: order.remark,
        }]).map((item, index) => [
        String(index + 1),
        item.parcel_no || '整单',
        normalizeText(item.goods_name),
        `${Number(item.weight || 0).toFixed(2)} kg`,
        String(item.quantity || 0),
        normalizeText(item.remark, '-'),
    ]);
    const html = `
    ${renderPrintHead('订单交接单', order.order_no, statusName(order.status))}
    ${renderPrintFieldGrid([
        {
            title: '订单信息',
            fields: [
                { label: '订单号', value: order.order_no },
                { label: '运输方式', value: transportModeLabel(order.transport_mode) },
                { label: '订单状态', value: statusName(order.status) },
                { label: '下单时间', value: formatTimestamp(order.order_time) },
            ],
        },
        {
            title: '线路信息',
            fields: [
                { label: '发件地', value: formatAddress(order.sender_country, order.sender_province, order.sender_city, order.sender_address) },
                { label: '收件地', value: formatAddress(order.receiver_country, order.receiver_province, order.receiver_city, order.receiver_address) },
                { label: '发件人', value: joinPrintLines([order.sender_name, order.sender_phone]) || '-' },
                { label: '收件人', value: joinPrintLines([order.receiver_name, order.receiver_phone]) || '-' },
            ],
        },
    ])}
    ${renderPrintTable('包裹清单', ['序号', '包裹号', '货物名称', '重量', '件数', '备注'], packageRows)}
    <section class="print-grid">
      <article class="print-card"><h2>交接签字</h2><dl><dt>交出人</dt><dd>________________</dd><dt>接收人</dt><dd>________________</dd></dl></article>
      <article class="print-card"><h2>时间备注</h2><dl><dt>打印时间</dt><dd>${formatTimestamp(Date.now())}</dd><dt>备注</dt><dd>${normalizeText(order.remark, '无')}</dd></dl></article>
    </section>
  `;
    printHtmlDocument(`交接单-${order.order_no}`, html);
}
function escapeHtmlLine(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
async function loadOrderTransitions(orderId) {
    const data = await http.get(`/orders/${orderId}/transitions`);
    transitions.value = data.allowed_statuses || [];
}
function openCustomsDialog() {
    if (!detailOrder.value)
        return;
    customsForm.customs_declaration = detailOrder.value.customs.customs_declaration || '';
    customsForm.hs_code = detailOrder.value.customs.hs_code || '';
    customsForm.declared_value = detailOrder.value.customs.declared_value || 0;
    customsForm.customs_duty = detailOrder.value.customs.customs_duty || 0;
    customsForm.customs_vat = detailOrder.value.customs.customs_vat || 0;
    customsForm.customs_other_tax = detailOrder.value.customs.customs_other_tax || 0;
    customsForm.customs_status = detailOrder.value.customs.customs_status || '';
    customsForm.remark = '';
    customsSuggestion.value = null;
    customsDialogVisible.value = true;
}
function openCustomsNodeDialog() {
    customsNodeForm.node_code = 'declared';
    customsNodeForm.node_status = 'completed';
    customsNodeForm.duty_amount = 0;
    customsNodeForm.vat_amount = 0;
    customsNodeForm.other_tax_amount = 0;
    customsNodeForm.remark = '';
    customsNodeDialogVisible.value = true;
}
function openCustomsExceptionDialog() {
    customsExceptionForm.description = '';
    customsExceptionForm.remark = '';
    customsExceptionDialogVisible.value = true;
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
async function submitCustomsUpdate() {
    if (!currentOrderId.value)
        return;
    customsSubmitting.value = true;
    try {
        await http.put(`/orders/${currentOrderId.value}/customs`, {
            customs_declaration: customsForm.customs_declaration.trim(),
            hs_code: customsForm.hs_code.trim(),
            declared_value: Number(customsForm.declared_value),
            customs_duty: Number(customsForm.customs_duty),
            customs_vat: Number(customsForm.customs_vat),
            customs_other_tax: Number(customsForm.customs_other_tax),
            customs_status: customsForm.customs_status.trim(),
            remark: customsForm.remark.trim(),
        });
        ElMessage.success('清关信息已更新');
        customsDialogVisible.value = false;
        await Promise.all([loadOrders(), loadStatistics()]);
        if (detailDrawerVisible.value) {
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
        customsSubmitting.value = false;
    }
}
async function suggestCustomsHSCode() {
    if (!detailOrder.value)
        return;
    customsSuggesting.value = true;
    try {
        const data = await http.post('/orders/hs-suggest', {
            goods_name: detailOrder.value.goods_name,
            goods_category: detailOrder.value.goods_category,
            customs_declaration: customsForm.customs_declaration.trim(),
            packages: (detailOrder.value.packages || []).map((item) => ({
                parcel_no: item.parcel_no,
                goods_name: item.goods_name,
                goods_category: item.goods_category,
                weight: item.weight,
                volume: item.volume,
                quantity: item.quantity,
                goods_value: item.goods_value,
                remark: item.remark,
            })),
        });
        customsSuggestion.value = data;
        if (data.suggestion) {
            customsForm.hs_code = data.suggestion.hs_code;
            if (!customsForm.customs_declaration.trim()) {
                customsForm.customs_declaration = data.suggestion.customs_declaration;
            }
            ElMessage.success(`已匹配 HS Code：${data.suggestion.hs_code}`);
        }
        else {
            ElMessage.warning(data.note || '未匹配到常见 HS Code');
        }
    }
    finally {
        customsSuggesting.value = false;
    }
}
async function submitCustomsNode() {
    if (!currentOrderId.value || !customsNodeForm.node_code)
        return;
    customsNodeSubmitting.value = true;
    try {
        await http.post(`/orders/${currentOrderId.value}/customs/nodes`, {
            node_code: customsNodeForm.node_code,
            node_status: customsNodeForm.node_status,
            duty_amount: Number(customsNodeForm.duty_amount),
            vat_amount: Number(customsNodeForm.vat_amount),
            other_tax_amount: Number(customsNodeForm.other_tax_amount),
            remark: customsNodeForm.remark.trim(),
        });
        ElMessage.success('清关节点已记录');
        customsNodeDialogVisible.value = false;
        await Promise.all([loadOrders(), loadStatistics()]);
        if (detailDrawerVisible.value) {
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
        customsNodeSubmitting.value = false;
    }
}
async function submitCustomsException() {
    if (!currentOrderId.value || !customsExceptionForm.description.trim())
        return;
    customsExceptionSubmitting.value = true;
    try {
        await http.post(`/orders/${currentOrderId.value}/customs/exception`, {
            description: customsExceptionForm.description.trim(),
            remark: customsExceptionForm.remark.trim(),
        });
        ElMessage.success('关务异常已上报');
        customsExceptionDialogVisible.value = false;
        await Promise.all([loadOrders(), loadStatistics()]);
        if (detailDrawerVisible.value) {
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
        customsExceptionSubmitting.value = false;
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
const __VLS_0 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "order-filters" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "order-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSubmit: () => { }
};
__VLS_3.slots.default;
const __VLS_8 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    label: "订单号",
}));
const __VLS_10 = __VLS_9({
    label: "订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
const __VLS_12 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}));
const __VLS_14 = __VLS_13({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.order_no),
    clearable: true,
    placeholder: "请输入订单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onKeyup: (__VLS_ctx.refreshOverview)
};
var __VLS_15;
var __VLS_11;
const __VLS_20 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "状态",
}));
const __VLS_22 = __VLS_21({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
const __VLS_24 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_26 = __VLS_25({
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
const __VLS_28 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_30 = __VLS_29({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.statusOptions))) {
    const __VLS_32 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_34 = __VLS_33({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_33));
}
var __VLS_27;
var __VLS_23;
const __VLS_36 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "发件国家",
}));
const __VLS_38 = __VLS_37({
    label: "发件国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
const __VLS_40 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    modelValue: (__VLS_ctx.filters.sender_country),
    clearable: true,
    placeholder: "如：中国 / USA",
}));
const __VLS_42 = __VLS_41({
    modelValue: (__VLS_ctx.filters.sender_country),
    clearable: true,
    placeholder: "如：中国 / USA",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
var __VLS_39;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "收件国家",
}));
const __VLS_46 = __VLS_45({
    label: "收件国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.filters.receiver_country),
    clearable: true,
    placeholder: "如：美国 / 日本",
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.filters.receiver_country),
    clearable: true,
    placeholder: "如：美国 / 日本",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
const __VLS_52 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "下单时间",
}));
const __VLS_54 = __VLS_53({
    label: "下单时间",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.ElDatePicker;
/** @type {[typeof __VLS_components.ElDatePicker, typeof __VLS_components.elDatePicker, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    modelValue: (__VLS_ctx.filters.dateRange),
    type: "daterange",
    valueFormat: "x",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    rangeSeparator: "至",
}));
const __VLS_58 = __VLS_57({
    modelValue: (__VLS_ctx.filters.dateRange),
    type: "daterange",
    valueFormat: "x",
    startPlaceholder: "开始日期",
    endPlaceholder: "结束日期",
    rangeSeparator: "至",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
var __VLS_55;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({}));
const __VLS_62 = __VLS_61({}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_66 = __VLS_65({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
let __VLS_68;
let __VLS_69;
let __VLS_70;
const __VLS_71 = {
    onClick: (__VLS_ctx.refreshOverview)
};
__VLS_67.slots.default;
var __VLS_67;
const __VLS_72 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    ...{ 'onClick': {} },
}));
const __VLS_74 = __VLS_73({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
let __VLS_76;
let __VLS_77;
let __VLS_78;
const __VLS_79 = {
    onClick: (__VLS_ctx.resetFilters)
};
__VLS_75.slots.default;
var __VLS_75;
var __VLS_63;
var __VLS_3;
const __VLS_80 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    data: (__VLS_ctx.orders),
    ...{ class: "order-table" },
    stripe: true,
}));
const __VLS_82 = __VLS_81({
    data: (__VLS_ctx.orders),
    ...{ class: "order-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_83.slots.default;
const __VLS_84 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    prop: "order_no",
    label: "订单号",
    minWidth: "190",
}));
const __VLS_86 = __VLS_85({
    prop: "order_no",
    label: "订单号",
    minWidth: "190",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
const __VLS_88 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    label: "线路",
    minWidth: "230",
}));
const __VLS_90 = __VLS_89({
    label: "线路",
    minWidth: "230",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_91.slots;
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
var __VLS_91;
const __VLS_92 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: "货物",
    minWidth: "180",
}));
const __VLS_94 = __VLS_93({
    label: "货物",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_95.slots;
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
var __VLS_95;
const __VLS_96 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    label: "运输方式",
    width: "130",
}));
const __VLS_98 = __VLS_97({
    label: "运输方式",
    width: "130",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_99.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_100 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        effect: "plain",
        type: "warning",
    }));
    const __VLS_102 = __VLS_101({
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    __VLS_103.slots.default;
    (__VLS_ctx.transportModeLabel(scope.row.transport_mode));
    var __VLS_103;
}
var __VLS_99;
const __VLS_104 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    label: "金额",
    width: "140",
}));
const __VLS_106 = __VLS_105({
    label: "金额",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_107.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatAmount(scope.row.total_amount));
}
var __VLS_107;
const __VLS_108 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    label: "状态",
    width: "120",
}));
const __VLS_110 = __VLS_109({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_111.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_112 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        type: (__VLS_ctx.statusTagType(scope.row.status)),
        effect: "dark",
    }));
    const __VLS_114 = __VLS_113({
        type: (__VLS_ctx.statusTagType(scope.row.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    (scope.row.status_name);
    var __VLS_115;
}
var __VLS_111;
const __VLS_116 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    prop: "order_time",
    label: "下单时间",
    minWidth: "170",
}));
const __VLS_118 = __VLS_117({
    prop: "order_time",
    label: "下单时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
const __VLS_120 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "操作",
    fixed: "right",
    width: "260",
}));
const __VLS_122 = __VLS_121({
    label: "操作",
    fixed: "right",
    width: "260",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_123.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-actions" },
    });
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
        onClick: (...[$event]) => {
            __VLS_ctx.openDetail(scope.row);
        }
    };
    __VLS_127.slots.default;
    var __VLS_127;
    if (__VLS_ctx.canUpdateStatus) {
        const __VLS_132 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_134 = __VLS_133({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_133));
        let __VLS_136;
        let __VLS_137;
        let __VLS_138;
        const __VLS_139 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canUpdateStatus))
                    return;
                __VLS_ctx.openStatusDialog(scope.row);
            }
        };
        __VLS_135.slots.default;
        var __VLS_135;
    }
    const __VLS_140 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        disabled: (!__VLS_ctx.canCancel(scope.row.status)),
    }));
    const __VLS_142 = __VLS_141({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        disabled: (!__VLS_ctx.canCancel(scope.row.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    let __VLS_144;
    let __VLS_145;
    let __VLS_146;
    const __VLS_147 = {
        onClick: (...[$event]) => {
            __VLS_ctx.cancelOrder(scope.row);
        }
    };
    __VLS_143.slots.default;
    var __VLS_143;
}
var __VLS_123;
var __VLS_83;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-pagination" },
});
const __VLS_148 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_150 = __VLS_149({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
let __VLS_152;
let __VLS_153;
let __VLS_154;
const __VLS_155 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_156 = {
    onSizeChange: (__VLS_ctx.handleSizeChange)
};
var __VLS_151;
const __VLS_157 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_158 = __VLS_asFunctionalComponent(__VLS_157, new __VLS_157({
    modelValue: (__VLS_ctx.detailDrawerVisible),
    size: "62%",
    title: "订单详情",
}));
const __VLS_159 = __VLS_158({
    modelValue: (__VLS_ctx.detailDrawerVisible),
    size: "62%",
    title: "订单详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_158));
__VLS_160.slots.default;
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
    const __VLS_161 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_162 = __VLS_asFunctionalComponent(__VLS_161, new __VLS_161({
        type: (__VLS_ctx.statusTagType(__VLS_ctx.detailOrder.status)),
        effect: "dark",
    }));
    const __VLS_163 = __VLS_162({
        type: (__VLS_ctx.statusTagType(__VLS_ctx.detailOrder.status)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_162));
    __VLS_164.slots.default;
    (__VLS_ctx.statusName(__VLS_ctx.detailOrder.status));
    var __VLS_164;
    const __VLS_165 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_166 = __VLS_asFunctionalComponent(__VLS_165, new __VLS_165({
        effect: "plain",
    }));
    const __VLS_167 = __VLS_166({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_166));
    __VLS_168.slots.default;
    (__VLS_ctx.hierarchyTypeLabel(__VLS_ctx.detailOrder.hierarchy_type));
    var __VLS_168;
    const __VLS_169 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_170 = __VLS_asFunctionalComponent(__VLS_169, new __VLS_169({
        effect: "plain",
        type: "warning",
    }));
    const __VLS_171 = __VLS_170({
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_170));
    __VLS_172.slots.default;
    (__VLS_ctx.relationTypeLabel(__VLS_ctx.detailOrder.relation_type));
    var __VLS_172;
    const __VLS_173 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
        effect: "plain",
    }));
    const __VLS_175 = __VLS_174({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_174));
    __VLS_176.slots.default;
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.total_amount, __VLS_ctx.detailOrder.currency));
    var __VLS_176;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail__toolbar" },
    });
    const __VLS_177 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
        disabled: (!__VLS_ctx.detailOrder),
    }));
    const __VLS_179 = __VLS_178({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
        disabled: (!__VLS_ctx.detailOrder),
    }, ...__VLS_functionalComponentArgsRest(__VLS_178));
    let __VLS_181;
    let __VLS_182;
    let __VLS_183;
    const __VLS_184 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.detailOrder))
                return;
            __VLS_ctx.printShippingLabel();
        }
    };
    __VLS_180.slots.default;
    var __VLS_180;
    const __VLS_185 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_186 = __VLS_asFunctionalComponent(__VLS_185, new __VLS_185({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
        disabled: (!__VLS_ctx.detailOrder),
    }));
    const __VLS_187 = __VLS_186({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
        disabled: (!__VLS_ctx.detailOrder),
    }, ...__VLS_functionalComponentArgsRest(__VLS_186));
    let __VLS_189;
    let __VLS_190;
    let __VLS_191;
    const __VLS_192 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.detailOrder))
                return;
            __VLS_ctx.printHandoverSheet();
        }
    };
    __VLS_188.slots.default;
    var __VLS_188;
    if (__VLS_ctx.canUpdateStatus) {
        const __VLS_193 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
            ...{ 'onClick': {} },
            type: "primary",
            plain: true,
        }));
        const __VLS_195 = __VLS_194({
            ...{ 'onClick': {} },
            type: "primary",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_194));
        let __VLS_197;
        let __VLS_198;
        let __VLS_199;
        const __VLS_200 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailOrder))
                    return;
                if (!(__VLS_ctx.canUpdateStatus))
                    return;
                __VLS_ctx.openStatusDialog(__VLS_ctx.detailOrder);
            }
        };
        __VLS_196.slots.default;
        var __VLS_196;
    }
    if (__VLS_ctx.canManageCustoms) {
        const __VLS_201 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
            ...{ 'onClick': {} },
            type: "success",
            plain: true,
        }));
        const __VLS_203 = __VLS_202({
            ...{ 'onClick': {} },
            type: "success",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_202));
        let __VLS_205;
        let __VLS_206;
        let __VLS_207;
        const __VLS_208 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailOrder))
                    return;
                if (!(__VLS_ctx.canManageCustoms))
                    return;
                __VLS_ctx.openCustomsDialog();
            }
        };
        __VLS_204.slots.default;
        var __VLS_204;
    }
    if (__VLS_ctx.canManageCustoms) {
        const __VLS_209 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
            ...{ 'onClick': {} },
            type: "warning",
            plain: true,
        }));
        const __VLS_211 = __VLS_210({
            ...{ 'onClick': {} },
            type: "warning",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_210));
        let __VLS_213;
        let __VLS_214;
        let __VLS_215;
        const __VLS_216 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailOrder))
                    return;
                if (!(__VLS_ctx.canManageCustoms))
                    return;
                __VLS_ctx.openCustomsNodeDialog();
            }
        };
        __VLS_212.slots.default;
        var __VLS_212;
    }
    if (__VLS_ctx.canManageCustoms) {
        const __VLS_217 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
            ...{ 'onClick': {} },
            type: "danger",
            plain: true,
        }));
        const __VLS_219 = __VLS_218({
            ...{ 'onClick': {} },
            type: "danger",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_218));
        let __VLS_221;
        let __VLS_222;
        let __VLS_223;
        const __VLS_224 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.detailOrder))
                    return;
                if (!(__VLS_ctx.canManageCustoms))
                    return;
                __VLS_ctx.openCustomsExceptionDialog();
            }
        };
        __VLS_220.slots.default;
        var __VLS_220;
    }
    const __VLS_225 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
        ...{ 'onClick': {} },
        type: "warning",
        plain: true,
        disabled: (!__VLS_ctx.canCancel(__VLS_ctx.detailOrder.status)),
    }));
    const __VLS_227 = __VLS_226({
        ...{ 'onClick': {} },
        type: "warning",
        plain: true,
        disabled: (!__VLS_ctx.canCancel(__VLS_ctx.detailOrder.status)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_226));
    let __VLS_229;
    let __VLS_230;
    let __VLS_231;
    const __VLS_232 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.detailOrder))
                return;
            __VLS_ctx.cancelOrder(__VLS_ctx.detailOrder);
        }
    };
    __VLS_228.slots.default;
    var __VLS_228;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "order-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.customs.customs_declaration, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.customs.hs_code, '未填写'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.customs.declared_value, __VLS_ctx.detailOrder.currency));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.detailOrder.customs.customs_status_name, '待申报'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.customs.customs_duty, __VLS_ctx.detailOrder.currency));
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.customs.customs_vat, __VLS_ctx.detailOrder.currency));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.customs.customs_other_tax, __VLS_ctx.detailOrder.currency));
    (__VLS_ctx.formatAmount(__VLS_ctx.detailOrder.customs.customs_fee, __VLS_ctx.detailOrder.currency));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card order-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "order-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.detailOrder.customs_nodes.length);
    if (__VLS_ctx.detailOrder.customs_nodes.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "order-log-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.detailOrder.customs_nodes))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (item.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "order-log-list__head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.node_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.node_time_text);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.node_status_name);
            (__VLS_ctx.normalizeText(item.operator_name, '系统'));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.formatAmount(item.duty_amount, __VLS_ctx.detailOrder.currency));
            (__VLS_ctx.formatAmount(item.vat_amount, __VLS_ctx.detailOrder.currency));
            (__VLS_ctx.formatAmount(item.other_tax_amount, __VLS_ctx.detailOrder.currency));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.normalizeText(item.remark, '无备注'));
        }
    }
    else {
        const __VLS_233 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
            description: "暂无清关节点",
        }));
        const __VLS_235 = __VLS_234({
            description: "暂无清关节点",
        }, ...__VLS_functionalComponentArgsRest(__VLS_234));
    }
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
        const __VLS_237 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
            description: "暂无包裹明细",
        }));
        const __VLS_239 = __VLS_238({
            description: "暂无包裹明细",
        }, ...__VLS_functionalComponentArgsRest(__VLS_238));
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
        const __VLS_241 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
            description: "当前没有子单",
        }));
        const __VLS_243 = __VLS_242({
            description: "当前没有子单",
        }, ...__VLS_functionalComponentArgsRest(__VLS_242));
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
            const __VLS_245 = {}.ElTag;
            /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
            // @ts-ignore
            const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
                key: (item.status),
                effect: "plain",
                type: "warning",
            }));
            const __VLS_247 = __VLS_246({
                key: (item.status),
                effect: "plain",
                type: "warning",
            }, ...__VLS_functionalComponentArgsRest(__VLS_246));
            __VLS_248.slots.default;
            (item.status_name);
            var __VLS_248;
        }
    }
    else {
        const __VLS_249 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
            description: "当前状态没有可执行流转",
        }));
        const __VLS_251 = __VLS_250({
            description: "当前状态没有可执行流转",
        }, ...__VLS_functionalComponentArgsRest(__VLS_250));
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
        const __VLS_253 = {}.ElEmpty;
        /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
        // @ts-ignore
        const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
            description: "暂无状态日志",
        }));
        const __VLS_255 = __VLS_254({
            description: "暂无状态日志",
        }, ...__VLS_functionalComponentArgsRest(__VLS_254));
    }
}
var __VLS_160;
const __VLS_257 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    modelValue: (__VLS_ctx.statusDialogVisible),
    title: "推进订单状态",
    width: "460px",
}));
const __VLS_259 = __VLS_258({
    modelValue: (__VLS_ctx.statusDialogVisible),
    title: "推进订单状态",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
__VLS_260.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.transitionLoading) }, null, null);
const __VLS_261 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({
    labelPosition: "top",
}));
const __VLS_263 = __VLS_262({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_262));
__VLS_264.slots.default;
const __VLS_265 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
    label: "目标状态",
}));
const __VLS_267 = __VLS_266({
    label: "目标状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
__VLS_268.slots.default;
const __VLS_269 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
    modelValue: (__VLS_ctx.statusForm.status),
    placeholder: "请选择目标状态",
    ...{ style: {} },
    disabled: (!__VLS_ctx.transitions.length),
}));
const __VLS_271 = __VLS_270({
    modelValue: (__VLS_ctx.statusForm.status),
    placeholder: "请选择目标状态",
    ...{ style: {} },
    disabled: (!__VLS_ctx.transitions.length),
}, ...__VLS_functionalComponentArgsRest(__VLS_270));
__VLS_272.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.transitions))) {
    const __VLS_273 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
        key: (item.status),
        label: (item.status_name),
        value: (item.status),
    }));
    const __VLS_275 = __VLS_274({
        key: (item.status),
        label: (item.status_name),
        value: (item.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_274));
}
var __VLS_272;
var __VLS_268;
const __VLS_277 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
    label: "备注",
}));
const __VLS_279 = __VLS_278({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_278));
__VLS_280.slots.default;
const __VLS_281 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    modelValue: (__VLS_ctx.statusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写这次流转的说明",
}));
const __VLS_283 = __VLS_282({
    modelValue: (__VLS_ctx.statusForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写这次流转的说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
var __VLS_280;
var __VLS_264;
if (!__VLS_ctx.transitionLoading && !__VLS_ctx.transitions.length) {
    const __VLS_285 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
        description: "当前状态没有可执行流转",
    }));
    const __VLS_287 = __VLS_286({
        description: "当前状态没有可执行流转",
    }, ...__VLS_functionalComponentArgsRest(__VLS_286));
}
{
    const { footer: __VLS_thisSlot } = __VLS_260.slots;
    const __VLS_289 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
        ...{ 'onClick': {} },
    }));
    const __VLS_291 = __VLS_290({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_290));
    let __VLS_293;
    let __VLS_294;
    let __VLS_295;
    const __VLS_296 = {
        onClick: (...[$event]) => {
            __VLS_ctx.statusDialogVisible = false;
        }
    };
    __VLS_292.slots.default;
    var __VLS_292;
    const __VLS_297 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.statusSubmitting),
        disabled: (!__VLS_ctx.statusForm.status),
    }));
    const __VLS_299 = __VLS_298({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.statusSubmitting),
        disabled: (!__VLS_ctx.statusForm.status),
    }, ...__VLS_functionalComponentArgsRest(__VLS_298));
    let __VLS_301;
    let __VLS_302;
    let __VLS_303;
    const __VLS_304 = {
        onClick: (__VLS_ctx.submitStatusUpdate)
    };
    __VLS_300.slots.default;
    var __VLS_300;
}
var __VLS_260;
const __VLS_305 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    modelValue: (__VLS_ctx.customsDialogVisible),
    title: "维护清关信息",
    width: "620px",
}));
const __VLS_307 = __VLS_306({
    modelValue: (__VLS_ctx.customsDialogVisible),
    title: "维护清关信息",
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
const __VLS_309 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
    labelPosition: "top",
}));
const __VLS_311 = __VLS_310({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_310));
__VLS_312.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "order-detail__toolbar" },
    ...{ style: {} },
});
const __VLS_313 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
    ...{ 'onClick': {} },
    plain: true,
    loading: (__VLS_ctx.customsSuggesting),
}));
const __VLS_315 = __VLS_314({
    ...{ 'onClick': {} },
    plain: true,
    loading: (__VLS_ctx.customsSuggesting),
}, ...__VLS_functionalComponentArgsRest(__VLS_314));
let __VLS_317;
let __VLS_318;
let __VLS_319;
const __VLS_320 = {
    onClick: (__VLS_ctx.suggestCustomsHSCode)
};
__VLS_316.slots.default;
var __VLS_316;
if (__VLS_ctx.customsSuggestion?.suggestion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "create-order-tip" },
    });
    (__VLS_ctx.customsSuggestion.suggestion.hs_code);
    (__VLS_ctx.customsSuggestion.suggestion.customs_declaration);
    if (__VLS_ctx.customsSuggestion.suggestion.reason) {
        (__VLS_ctx.customsSuggestion.suggestion.reason);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-form-grid" },
});
const __VLS_321 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
    label: "申报品名",
}));
const __VLS_323 = __VLS_322({
    label: "申报品名",
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
__VLS_324.slots.default;
const __VLS_325 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
    modelValue: (__VLS_ctx.customsForm.customs_declaration),
    placeholder: "请输入申报品名",
}));
const __VLS_327 = __VLS_326({
    modelValue: (__VLS_ctx.customsForm.customs_declaration),
    placeholder: "请输入申报品名",
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
var __VLS_324;
const __VLS_329 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
    label: "HS Code",
}));
const __VLS_331 = __VLS_330({
    label: "HS Code",
}, ...__VLS_functionalComponentArgsRest(__VLS_330));
__VLS_332.slots.default;
const __VLS_333 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
    modelValue: (__VLS_ctx.customsForm.hs_code),
    placeholder: "请输入 HS Code",
}));
const __VLS_335 = __VLS_334({
    modelValue: (__VLS_ctx.customsForm.hs_code),
    placeholder: "请输入 HS Code",
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
var __VLS_332;
const __VLS_337 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
    label: "申报价值",
}));
const __VLS_339 = __VLS_338({
    label: "申报价值",
}, ...__VLS_functionalComponentArgsRest(__VLS_338));
__VLS_340.slots.default;
const __VLS_341 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
    modelValue: (__VLS_ctx.customsForm.declared_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_343 = __VLS_342({
    modelValue: (__VLS_ctx.customsForm.declared_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_342));
var __VLS_340;
const __VLS_345 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
    label: "清关状态",
}));
const __VLS_347 = __VLS_346({
    label: "清关状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_346));
__VLS_348.slots.default;
const __VLS_349 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_350 = __VLS_asFunctionalComponent(__VLS_349, new __VLS_349({
    modelValue: (__VLS_ctx.customsForm.customs_status),
    placeholder: "如：declared / reviewing / released",
}));
const __VLS_351 = __VLS_350({
    modelValue: (__VLS_ctx.customsForm.customs_status),
    placeholder: "如：declared / reviewing / released",
}, ...__VLS_functionalComponentArgsRest(__VLS_350));
var __VLS_348;
const __VLS_353 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_354 = __VLS_asFunctionalComponent(__VLS_353, new __VLS_353({
    label: "关税",
}));
const __VLS_355 = __VLS_354({
    label: "关税",
}, ...__VLS_functionalComponentArgsRest(__VLS_354));
__VLS_356.slots.default;
const __VLS_357 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_358 = __VLS_asFunctionalComponent(__VLS_357, new __VLS_357({
    modelValue: (__VLS_ctx.customsForm.customs_duty),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_359 = __VLS_358({
    modelValue: (__VLS_ctx.customsForm.customs_duty),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_358));
var __VLS_356;
const __VLS_361 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_362 = __VLS_asFunctionalComponent(__VLS_361, new __VLS_361({
    label: "增值税",
}));
const __VLS_363 = __VLS_362({
    label: "增值税",
}, ...__VLS_functionalComponentArgsRest(__VLS_362));
__VLS_364.slots.default;
const __VLS_365 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_366 = __VLS_asFunctionalComponent(__VLS_365, new __VLS_365({
    modelValue: (__VLS_ctx.customsForm.customs_vat),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_367 = __VLS_366({
    modelValue: (__VLS_ctx.customsForm.customs_vat),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_366));
var __VLS_364;
const __VLS_369 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({
    label: "其他税费",
}));
const __VLS_371 = __VLS_370({
    label: "其他税费",
}, ...__VLS_functionalComponentArgsRest(__VLS_370));
__VLS_372.slots.default;
const __VLS_373 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_374 = __VLS_asFunctionalComponent(__VLS_373, new __VLS_373({
    modelValue: (__VLS_ctx.customsForm.customs_other_tax),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_375 = __VLS_374({
    modelValue: (__VLS_ctx.customsForm.customs_other_tax),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_374));
var __VLS_372;
const __VLS_377 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
    label: "备注",
    ...{ class: "tracking-form-grid__wide" },
}));
const __VLS_379 = __VLS_378({
    label: "备注",
    ...{ class: "tracking-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_378));
__VLS_380.slots.default;
const __VLS_381 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_382 = __VLS_asFunctionalComponent(__VLS_381, new __VLS_381({
    modelValue: (__VLS_ctx.customsForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写清关备注",
}));
const __VLS_383 = __VLS_382({
    modelValue: (__VLS_ctx.customsForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写清关备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_382));
var __VLS_380;
var __VLS_312;
{
    const { footer: __VLS_thisSlot } = __VLS_308.slots;
    const __VLS_385 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_386 = __VLS_asFunctionalComponent(__VLS_385, new __VLS_385({
        ...{ 'onClick': {} },
    }));
    const __VLS_387 = __VLS_386({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_386));
    let __VLS_389;
    let __VLS_390;
    let __VLS_391;
    const __VLS_392 = {
        onClick: (...[$event]) => {
            __VLS_ctx.customsDialogVisible = false;
        }
    };
    __VLS_388.slots.default;
    var __VLS_388;
    const __VLS_393 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_394 = __VLS_asFunctionalComponent(__VLS_393, new __VLS_393({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.customsSubmitting),
    }));
    const __VLS_395 = __VLS_394({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.customsSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_394));
    let __VLS_397;
    let __VLS_398;
    let __VLS_399;
    const __VLS_400 = {
        onClick: (__VLS_ctx.submitCustomsUpdate)
    };
    __VLS_396.slots.default;
    var __VLS_396;
}
var __VLS_308;
const __VLS_401 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_402 = __VLS_asFunctionalComponent(__VLS_401, new __VLS_401({
    modelValue: (__VLS_ctx.customsNodeDialogVisible),
    title: "新增清关节点",
    width: "560px",
}));
const __VLS_403 = __VLS_402({
    modelValue: (__VLS_ctx.customsNodeDialogVisible),
    title: "新增清关节点",
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_402));
__VLS_404.slots.default;
const __VLS_405 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_406 = __VLS_asFunctionalComponent(__VLS_405, new __VLS_405({
    labelPosition: "top",
}));
const __VLS_407 = __VLS_406({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_406));
__VLS_408.slots.default;
const __VLS_409 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_410 = __VLS_asFunctionalComponent(__VLS_409, new __VLS_409({
    label: "节点",
}));
const __VLS_411 = __VLS_410({
    label: "节点",
}, ...__VLS_functionalComponentArgsRest(__VLS_410));
__VLS_412.slots.default;
const __VLS_413 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
    modelValue: (__VLS_ctx.customsNodeForm.node_code),
    placeholder: "请选择节点",
    ...{ style: {} },
}));
const __VLS_415 = __VLS_414({
    modelValue: (__VLS_ctx.customsNodeForm.node_code),
    placeholder: "请选择节点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_414));
__VLS_416.slots.default;
for (const [item] of __VLS_getVForSourceType((['declared', 'documents_ready', 'reviewing', 'duty_pending', 'duty_paid', 'inspection', 'released', 'customs_exception']))) {
    const __VLS_417 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_418 = __VLS_asFunctionalComponent(__VLS_417, new __VLS_417({
        key: (item),
        label: (__VLS_ctx.customsNodeCodeLabel(item)),
        value: (item),
    }));
    const __VLS_419 = __VLS_418({
        key: (item),
        label: (__VLS_ctx.customsNodeCodeLabel(item)),
        value: (item),
    }, ...__VLS_functionalComponentArgsRest(__VLS_418));
}
var __VLS_416;
var __VLS_412;
const __VLS_421 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_422 = __VLS_asFunctionalComponent(__VLS_421, new __VLS_421({
    label: "节点状态",
}));
const __VLS_423 = __VLS_422({
    label: "节点状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_422));
__VLS_424.slots.default;
const __VLS_425 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_426 = __VLS_asFunctionalComponent(__VLS_425, new __VLS_425({
    modelValue: (__VLS_ctx.customsNodeForm.node_status),
}));
const __VLS_427 = __VLS_426({
    modelValue: (__VLS_ctx.customsNodeForm.node_status),
}, ...__VLS_functionalComponentArgsRest(__VLS_426));
__VLS_428.slots.default;
const __VLS_429 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_430 = __VLS_asFunctionalComponent(__VLS_429, new __VLS_429({
    value: "completed",
}));
const __VLS_431 = __VLS_430({
    value: "completed",
}, ...__VLS_functionalComponentArgsRest(__VLS_430));
__VLS_432.slots.default;
var __VLS_432;
const __VLS_433 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_434 = __VLS_asFunctionalComponent(__VLS_433, new __VLS_433({
    value: "pending",
}));
const __VLS_435 = __VLS_434({
    value: "pending",
}, ...__VLS_functionalComponentArgsRest(__VLS_434));
__VLS_436.slots.default;
var __VLS_436;
const __VLS_437 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_438 = __VLS_asFunctionalComponent(__VLS_437, new __VLS_437({
    value: "failed",
}));
const __VLS_439 = __VLS_438({
    value: "failed",
}, ...__VLS_functionalComponentArgsRest(__VLS_438));
__VLS_440.slots.default;
var __VLS_440;
var __VLS_428;
var __VLS_424;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tracking-form-grid" },
});
const __VLS_441 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_442 = __VLS_asFunctionalComponent(__VLS_441, new __VLS_441({
    label: "关税",
}));
const __VLS_443 = __VLS_442({
    label: "关税",
}, ...__VLS_functionalComponentArgsRest(__VLS_442));
__VLS_444.slots.default;
const __VLS_445 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_446 = __VLS_asFunctionalComponent(__VLS_445, new __VLS_445({
    modelValue: (__VLS_ctx.customsNodeForm.duty_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_447 = __VLS_446({
    modelValue: (__VLS_ctx.customsNodeForm.duty_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_446));
var __VLS_444;
const __VLS_449 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_450 = __VLS_asFunctionalComponent(__VLS_449, new __VLS_449({
    label: "增值税",
}));
const __VLS_451 = __VLS_450({
    label: "增值税",
}, ...__VLS_functionalComponentArgsRest(__VLS_450));
__VLS_452.slots.default;
const __VLS_453 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_454 = __VLS_asFunctionalComponent(__VLS_453, new __VLS_453({
    modelValue: (__VLS_ctx.customsNodeForm.vat_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_455 = __VLS_454({
    modelValue: (__VLS_ctx.customsNodeForm.vat_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_454));
var __VLS_452;
const __VLS_457 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_458 = __VLS_asFunctionalComponent(__VLS_457, new __VLS_457({
    label: "其他税费",
}));
const __VLS_459 = __VLS_458({
    label: "其他税费",
}, ...__VLS_functionalComponentArgsRest(__VLS_458));
__VLS_460.slots.default;
const __VLS_461 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_462 = __VLS_asFunctionalComponent(__VLS_461, new __VLS_461({
    modelValue: (__VLS_ctx.customsNodeForm.other_tax_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_463 = __VLS_462({
    modelValue: (__VLS_ctx.customsNodeForm.other_tax_amount),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_462));
var __VLS_460;
const __VLS_465 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_466 = __VLS_asFunctionalComponent(__VLS_465, new __VLS_465({
    label: "备注",
    ...{ class: "tracking-form-grid__wide" },
}));
const __VLS_467 = __VLS_466({
    label: "备注",
    ...{ class: "tracking-form-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_466));
__VLS_468.slots.default;
const __VLS_469 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_470 = __VLS_asFunctionalComponent(__VLS_469, new __VLS_469({
    modelValue: (__VLS_ctx.customsNodeForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入节点说明",
}));
const __VLS_471 = __VLS_470({
    modelValue: (__VLS_ctx.customsNodeForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "请输入节点说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_470));
var __VLS_468;
var __VLS_408;
{
    const { footer: __VLS_thisSlot } = __VLS_404.slots;
    const __VLS_473 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_474 = __VLS_asFunctionalComponent(__VLS_473, new __VLS_473({
        ...{ 'onClick': {} },
    }));
    const __VLS_475 = __VLS_474({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_474));
    let __VLS_477;
    let __VLS_478;
    let __VLS_479;
    const __VLS_480 = {
        onClick: (...[$event]) => {
            __VLS_ctx.customsNodeDialogVisible = false;
        }
    };
    __VLS_476.slots.default;
    var __VLS_476;
    const __VLS_481 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_482 = __VLS_asFunctionalComponent(__VLS_481, new __VLS_481({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.customsNodeSubmitting),
    }));
    const __VLS_483 = __VLS_482({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.customsNodeSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_482));
    let __VLS_485;
    let __VLS_486;
    let __VLS_487;
    const __VLS_488 = {
        onClick: (__VLS_ctx.submitCustomsNode)
    };
    __VLS_484.slots.default;
    var __VLS_484;
}
var __VLS_404;
const __VLS_489 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_490 = __VLS_asFunctionalComponent(__VLS_489, new __VLS_489({
    modelValue: (__VLS_ctx.customsExceptionDialogVisible),
    title: "上报关务异常",
    width: "560px",
}));
const __VLS_491 = __VLS_490({
    modelValue: (__VLS_ctx.customsExceptionDialogVisible),
    title: "上报关务异常",
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_490));
__VLS_492.slots.default;
const __VLS_493 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_494 = __VLS_asFunctionalComponent(__VLS_493, new __VLS_493({
    labelPosition: "top",
}));
const __VLS_495 = __VLS_494({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_494));
__VLS_496.slots.default;
const __VLS_497 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_498 = __VLS_asFunctionalComponent(__VLS_497, new __VLS_497({
    label: "异常描述",
}));
const __VLS_499 = __VLS_498({
    label: "异常描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_498));
__VLS_500.slots.default;
const __VLS_501 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_502 = __VLS_asFunctionalComponent(__VLS_501, new __VLS_501({
    modelValue: (__VLS_ctx.customsExceptionForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "600",
    showWordLimit: true,
    placeholder: "请输入关务异常描述",
}));
const __VLS_503 = __VLS_502({
    modelValue: (__VLS_ctx.customsExceptionForm.description),
    type: "textarea",
    rows: (4),
    maxlength: "600",
    showWordLimit: true,
    placeholder: "请输入关务异常描述",
}, ...__VLS_functionalComponentArgsRest(__VLS_502));
var __VLS_500;
const __VLS_505 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_506 = __VLS_asFunctionalComponent(__VLS_505, new __VLS_505({
    label: "备注",
}));
const __VLS_507 = __VLS_506({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_506));
__VLS_508.slots.default;
const __VLS_509 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_510 = __VLS_asFunctionalComponent(__VLS_509, new __VLS_509({
    modelValue: (__VLS_ctx.customsExceptionForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}));
const __VLS_511 = __VLS_510({
    modelValue: (__VLS_ctx.customsExceptionForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写补充说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_510));
var __VLS_508;
var __VLS_496;
{
    const { footer: __VLS_thisSlot } = __VLS_492.slots;
    const __VLS_513 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_514 = __VLS_asFunctionalComponent(__VLS_513, new __VLS_513({
        ...{ 'onClick': {} },
    }));
    const __VLS_515 = __VLS_514({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_514));
    let __VLS_517;
    let __VLS_518;
    let __VLS_519;
    const __VLS_520 = {
        onClick: (...[$event]) => {
            __VLS_ctx.customsExceptionDialogVisible = false;
        }
    };
    __VLS_516.slots.default;
    var __VLS_516;
    const __VLS_521 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_522 = __VLS_asFunctionalComponent(__VLS_521, new __VLS_521({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.customsExceptionSubmitting),
    }));
    const __VLS_523 = __VLS_522({
        ...{ 'onClick': {} },
        type: "danger",
        loading: (__VLS_ctx.customsExceptionSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_522));
    let __VLS_525;
    let __VLS_526;
    let __VLS_527;
    const __VLS_528 = {
        onClick: (__VLS_ctx.submitCustomsException)
    };
    __VLS_524.slots.default;
    var __VLS_524;
}
var __VLS_492;
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
/** @type {__VLS_StyleScopedClasses['order-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['order-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list']} */ ;
/** @type {__VLS_StyleScopedClasses['order-log-list__head']} */ ;
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
/** @type {__VLS_StyleScopedClasses['order-detail__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-form-grid__wide']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
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
            customsDialogVisible: customsDialogVisible,
            customsNodeDialogVisible: customsNodeDialogVisible,
            customsExceptionDialogVisible: customsExceptionDialogVisible,
            pagination: pagination,
            filters: filters,
            statistics: statistics,
            statusForm: statusForm,
            customsForm: customsForm,
            customsNodeForm: customsNodeForm,
            customsExceptionForm: customsExceptionForm,
            customsSubmitting: customsSubmitting,
            customsNodeSubmitting: customsNodeSubmitting,
            customsExceptionSubmitting: customsExceptionSubmitting,
            customsSuggesting: customsSuggesting,
            customsSuggestion: customsSuggestion,
            statusOptions: statusOptions,
            canUpdateStatus: canUpdateStatus,
            canManageCustoms: canManageCustoms,
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
            customsNodeCodeLabel: customsNodeCodeLabel,
            printShippingLabel: printShippingLabel,
            printHandoverSheet: printHandoverSheet,
            refreshOverview: refreshOverview,
            resetFilters: resetFilters,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
            openCustomsDialog: openCustomsDialog,
            openCustomsNodeDialog: openCustomsNodeDialog,
            openCustomsExceptionDialog: openCustomsExceptionDialog,
            openDetail: openDetail,
            submitCustomsUpdate: submitCustomsUpdate,
            suggestCustomsHSCode: suggestCustomsHSCode,
            submitCustomsNode: submitCustomsNode,
            submitCustomsException: submitCustomsException,
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
