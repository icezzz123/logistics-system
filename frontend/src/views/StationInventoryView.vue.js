import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
import { readQueryEnum, readQueryNumber } from '@/utils/workbench';
const stationTypeOptions = [
    { value: 1, label: '始发站' },
    { value: 2, label: '中转站' },
    { value: 3, label: '目的站' },
    { value: 4, label: '海关站点' },
];
const capacityRangeOrder = ['0-30%', '30-50%', '50-70%', '70-90%', '90-100%', '>100%'];
const authStore = useAuthStore();
const route = useRoute();
const activeTab = ref('stations');
const warningFilter = ref('all');
const stationLoading = ref(false);
const stationDetailLoading = ref(false);
const checkLoading = ref(false);
const checkDetailLoading = ref(false);
const createCheckSubmitting = ref(false);
const stations = ref([]);
const stationOptions = ref([]);
const inventory = ref([]);
const warnings = reactive({
    summary: {
        total_stations: 0,
        normal_stations: 0,
        warning_stations: 0,
        critical_stations: 0,
    },
    warnings: [],
});
const stats = reactive({
    summary: {
        total_stations: 0,
        total_orders: 0,
        avg_usage_rate: 0,
        max_usage_rate: 0,
        min_usage_rate: 0,
        warning_stations: 0,
        critical_stations: 0,
    },
    trends: [],
    station_top: [],
});
const distribution = reactive({
    status_distribution: [],
    station_distribution: [],
    capacity_distribution: [],
});
const checks = ref([]);
const stationDetail = ref(null);
const stationFlows = ref([]);
const checkDetail = ref(null);
const stationDetailVisible = ref(false);
const checkDetailVisible = ref(false);
const createCheckVisible = ref(false);
const editStationVisible = ref(false);
const stationPagination = reactive({
    total: 0,
    page: 1,
    pageSize: 10,
});
const checkPagination = reactive({
    total: 0,
    page: 1,
    pageSize: 10,
});
const stationFilters = reactive({
    keyword: '',
    type: undefined,
    country: '',
    city: '',
    status: undefined,
});
const checkFilters = reactive({
    station_id: undefined,
    check_type: undefined,
    status: undefined,
});
const createCheckFormRef = ref();
const editStationFormRef = ref();
const createCheckForm = reactive({
    station_id: undefined,
    check_type: 'full',
    remark: '',
});
const editStationTargetId = ref(null);
const editStationSubmitting = ref(false);
const editStationForm = reactive({
    name: '',
    type: 1,
    country: '',
    province: '',
    city: '',
    address: '',
    latitude: 0,
    longitude: 0,
    capacity: 1,
    contact_name: '',
    contact_phone: '',
    working_hours: '',
    status: 1,
    remark: '',
});
const createCheckRules = {
    station_id: [{ required: true, message: '请选择盘点站点', trigger: 'change' }],
    check_type: [{ required: true, message: '请选择盘点类型', trigger: 'change' }],
};
const editStationRules = {
    name: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
    type: [{ required: true, message: '请选择站点类型', trigger: 'change' }],
    country: [{ required: true, message: '请输入国家', trigger: 'blur' }],
    city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
    address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
    capacity: [{ required: true, message: '请输入容量', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};
const defaultInventory = {
    station_id: 0,
    station_name: '',
    station_code: '',
    total_orders: 0,
    in_warehouse: 0,
    sorting: 0,
    in_transit: 0,
    customs_clearing: 0,
    dest_sorting: 0,
    delivering: 0,
    capacity_usage: '0.0%',
    warning_level: 'normal',
};
const defaultWarning = {
    station_id: 0,
    station_name: '',
    station_code: '',
    current_count: 0,
    capacity: 0,
    usage_rate: 0,
    usage_percent: '0.0%',
    warning_level: 'normal',
    warning_message: '',
    last_check_time: 0,
    recommend_action: '',
};
const inventoryMap = computed(() => {
    const map = new Map();
    inventory.value.forEach((item) => map.set(item.station_id, item));
    return map;
});
const warningMap = computed(() => {
    const map = new Map();
    warnings.warnings.forEach((item) => map.set(item.station_id, item));
    return map;
});
const stationRows = computed(() => stations.value.map((item) => ({
    ...item,
    inventory: inventoryMap.value.get(item.id) || { ...defaultInventory, station_id: item.id },
})));
const selectedStationInventory = computed(() => (stationDetail.value ? inventoryMap.value.get(stationDetail.value.id) : undefined) || defaultInventory);
const selectedStationWarning = computed(() => (stationDetail.value ? warningMap.value.get(stationDetail.value.id) : undefined) || defaultWarning);
const filteredWarnings = computed(() => {
    if (warningFilter.value === 'all') {
        return warnings.warnings;
    }
    return warnings.warnings.filter((item) => item.warning_level === warningFilter.value);
});
const sortedCapacityDistribution = computed(() => {
    return [...distribution.capacity_distribution].sort((a, b) => capacityRangeOrder.indexOf(a.range) - capacityRangeOrder.indexOf(b.range));
});
const topBusyStations = computed(() => stats.station_top.slice(0, 4));
const canEditStation = computed(() => authStore.user?.role === 7);
function normalizeText(value, fallback = '-') {
    const text = String(value ?? '').trim();
    if (!text || /^[?？�]+$/.test(text)) {
        return fallback;
    }
    return text;
}
function formatUnix(value) {
    if (!value) {
        return '-';
    }
    const date = new Date(value * 1000);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString('zh-CN', { hour12: false });
}
function formatAddress(country, province, city, address) {
    return [country, province, city, address]
        .map((item) => normalizeText(item, ''))
        .filter(Boolean)
        .join(' / ') || '-';
}
function warningLabel(level) {
    const mapping = {
        normal: '正常',
        warning: '警告',
        critical: '严重',
    };
    return mapping[level] || '未知';
}
function warningTagType(level) {
    const mapping = {
        normal: 'success',
        warning: 'warning',
        critical: 'danger',
    };
    return mapping[level] || 'info';
}
function applyWorkbenchFilters() {
    const tab = readQueryEnum(route.query, 'tab', ['stations', 'warnings', 'checks']);
    const warningLevel = readQueryEnum(route.query, 'warning_filter', ['warning', 'critical']);
    const checkStatus = readQueryNumber(route.query, 'check_status');
    if (tab) {
        activeTab.value = tab;
    }
    if (warningLevel) {
        warningFilter.value = warningLevel;
    }
    if (typeof checkStatus === 'number' && [1, 2].includes(checkStatus)) {
        checkFilters.status = checkStatus;
    }
}
function buildStationQueryParams() {
    const params = {
        page: stationPagination.page,
        page_size: stationPagination.pageSize,
    };
    if (stationFilters.keyword.trim()) {
        params.keyword = stationFilters.keyword.trim();
    }
    if (typeof stationFilters.type === 'number') {
        params.type = stationFilters.type;
    }
    if (stationFilters.country.trim()) {
        params.country = stationFilters.country.trim();
    }
    if (stationFilters.city.trim()) {
        params.city = stationFilters.city.trim();
    }
    if (typeof stationFilters.status === 'number') {
        params.status = stationFilters.status;
    }
    return params;
}
function buildCheckQueryParams() {
    const params = {
        page: checkPagination.page,
        page_size: checkPagination.pageSize,
    };
    if (typeof checkFilters.station_id === 'number') {
        params.station_id = checkFilters.station_id;
    }
    if (checkFilters.check_type) {
        params.check_type = checkFilters.check_type;
    }
    if (typeof checkFilters.status === 'number') {
        params.status = checkFilters.status;
    }
    return params;
}
async function loadStationOptions() {
    const data = await http.get('/stations', {
        params: {
            page: 1,
            page_size: 100,
            status: 1,
        },
    });
    stationOptions.value = data.list || [];
}
async function loadStations() {
    stationLoading.value = true;
    try {
        const data = await http.get('/stations', {
            params: buildStationQueryParams(),
        });
        stations.value = data.list || [];
        stationPagination.total = data.total || 0;
        stationPagination.page = data.page || stationPagination.page;
        stationPagination.pageSize = data.page_size || stationPagination.pageSize;
    }
    finally {
        stationLoading.value = false;
    }
}
async function loadInventory() {
    const data = await http.get('/stations/inventory');
    inventory.value = data.list || [];
}
async function loadWarnings() {
    const data = await http.get('/stations/inventory/warnings');
    warnings.summary = data.summary || warnings.summary;
    warnings.warnings = data.warnings || [];
}
async function loadStats() {
    const data = await http.get('/stations/inventory/stats', {
        params: {
            date_type: 'day',
        },
    });
    stats.summary = data.summary || stats.summary;
    stats.trends = data.trends || [];
    stats.station_top = data.station_top || [];
}
async function loadDistribution() {
    const data = await http.get('/stations/inventory/distribution');
    distribution.status_distribution = data.status_distribution || [];
    distribution.station_distribution = data.station_distribution || [];
    distribution.capacity_distribution = data.capacity_distribution || [];
}
async function loadChecks() {
    checkLoading.value = true;
    try {
        const data = await http.get('/stations/inventory/check', {
            params: buildCheckQueryParams(),
        });
        checks.value = data.list || [];
        checkPagination.total = data.total || 0;
        checkPagination.page = data.page || checkPagination.page;
        checkPagination.pageSize = data.page_size || checkPagination.pageSize;
    }
    finally {
        checkLoading.value = false;
    }
}
async function refreshOverview() {
    await Promise.all([loadInventory(), loadWarnings(), loadStats(), loadDistribution()]);
}
async function applyStationFilters() {
    stationPagination.page = 1;
    await loadStations();
}
function resetStationFilters() {
    stationFilters.keyword = '';
    stationFilters.type = undefined;
    stationFilters.country = '';
    stationFilters.city = '';
    stationFilters.status = undefined;
    stationPagination.page = 1;
    void loadStations();
}
function handleStationPageChange(page) {
    stationPagination.page = page;
    void loadStations();
}
function handleStationSizeChange(size) {
    stationPagination.pageSize = size;
    stationPagination.page = 1;
    void loadStations();
}
async function applyCheckFilters() {
    checkPagination.page = 1;
    await loadChecks();
}
function resetCheckFilters() {
    checkFilters.station_id = undefined;
    checkFilters.check_type = undefined;
    checkFilters.status = undefined;
    checkPagination.page = 1;
    void loadChecks();
}
function handleCheckPageChange(page) {
    checkPagination.page = page;
    void loadChecks();
}
function handleCheckSizeChange(size) {
    checkPagination.pageSize = size;
    checkPagination.page = 1;
    void loadChecks();
}
async function openStationDetail(stationID) {
    stationDetailVisible.value = true;
    stationDetailLoading.value = true;
    try {
        const [detail, flowData] = await Promise.all([
            http.get(`/stations/${stationID}`),
            http.get('/stations/flows/records', {
                params: {
                    station_id: stationID,
                    page: 1,
                    page_size: 8,
                },
            }),
        ]);
        stationDetail.value = detail;
        stationFlows.value = flowData.list || [];
    }
    finally {
        stationDetailLoading.value = false;
    }
}
async function openCheckDetail(checkID) {
    checkDetailVisible.value = true;
    checkDetailLoading.value = true;
    try {
        checkDetail.value = await http.get(`/stations/inventory/check/${checkID}`);
    }
    finally {
        checkDetailLoading.value = false;
    }
}
function openCreateCheckDialog(stationID) {
    createCheckForm.station_id = stationID;
    createCheckForm.check_type = 'full';
    createCheckForm.remark = '';
    createCheckVisible.value = true;
}
function openEditStation(station) {
    editStationTargetId.value = station.id;
    editStationForm.name = station.name || '';
    editStationForm.type = station.type || 1;
    editStationForm.country = station.country || '';
    editStationForm.province = station.province || '';
    editStationForm.city = station.city || '';
    editStationForm.address = station.address || '';
    editStationForm.latitude = station.latitude || 0;
    editStationForm.longitude = station.longitude || 0;
    editStationForm.capacity = station.capacity || 1;
    editStationForm.contact_name = station.contact_name || '';
    editStationForm.contact_phone = station.contact_phone || '';
    editStationForm.working_hours = station.working_hours || '';
    editStationForm.status = station.status ?? 1;
    editStationForm.remark = station.remark || '';
    editStationVisible.value = true;
    editStationFormRef.value?.clearValidate();
}
async function submitCreateCheck() {
    if (!createCheckFormRef.value) {
        return;
    }
    const valid = await createCheckFormRef.value.validate().catch(() => false);
    if (!valid) {
        return;
    }
    createCheckSubmitting.value = true;
    try {
        const data = await http.post('/stations/inventory/check', {
            station_id: createCheckForm.station_id,
            check_type: createCheckForm.check_type,
            remark: createCheckForm.remark.trim(),
        });
        ElMessage.success(`盘点单创建成功：${data.check_no}`);
        createCheckVisible.value = false;
        activeTab.value = 'checks';
        await loadChecks();
        await openCheckDetail(data.id);
    }
    finally {
        createCheckSubmitting.value = false;
    }
}
async function submitEditStation() {
    if (!editStationTargetId.value || !editStationFormRef.value) {
        return;
    }
    const valid = await editStationFormRef.value.validate().catch(() => false);
    if (!valid) {
        return;
    }
    editStationSubmitting.value = true;
    try {
        await http.put(`/stations/${editStationTargetId.value}`, {
            name: editStationForm.name.trim(),
            type: editStationForm.type,
            country: editStationForm.country.trim(),
            province: editStationForm.province.trim(),
            city: editStationForm.city.trim(),
            address: editStationForm.address.trim(),
            latitude: Number(editStationForm.latitude),
            longitude: Number(editStationForm.longitude),
            capacity: Number(editStationForm.capacity),
            contact_name: editStationForm.contact_name.trim(),
            contact_phone: editStationForm.contact_phone.trim(),
            working_hours: editStationForm.working_hours.trim(),
            status: editStationForm.status,
            remark: editStationForm.remark.trim(),
        });
        ElMessage.success('站点信息已更新');
        editStationVisible.value = false;
        await Promise.all([loadStations(), loadStationOptions(), refreshOverview()]);
        if (stationDetailVisible.value && stationDetail.value?.id === editStationTargetId.value) {
            await openStationDetail(editStationTargetId.value);
        }
    }
    finally {
        editStationSubmitting.value = false;
    }
}
function focusStationWarning(stationID) {
    activeTab.value = 'warnings';
    warningFilter.value = 'all';
    const warning = warnings.warnings.find((item) => item.station_id === stationID);
    if (!warning) {
        return;
    }
    if (warning.warning_level === 'warning' || warning.warning_level === 'critical') {
        warningFilter.value = warning.warning_level;
    }
}
onMounted(async () => {
    applyWorkbenchFilters();
    await Promise.all([
        loadStationOptions(),
        loadStations(),
        loadInventory(),
        loadWarnings(),
        loadStats(),
        loadDistribution(),
        loadChecks(),
    ]);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['station-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table__header']} */ ;
/** @type {__VLS_StyleScopedClasses['el-table__header']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__identity']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__identity']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__identity']} */ ;
/** @type {__VLS_StyleScopedClasses['station-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['el-button']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['station-top-list']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-list']} */ ;
/** @type {__VLS_StyleScopedClasses['station-top-list']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-list']} */ ;
/** @type {__VLS_StyleScopedClasses['station-top-list']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-list']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-list']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__inventory']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar-actions']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "station-inventory-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-hero__chips" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topBusyStations))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (item.station_id),
    });
    (__VLS_ctx.normalizeText(item.station_name, item.station_code));
    (item.usage_percent);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.total_stations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.stats.summary.total_orders);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warnings.summary.warning_stations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warnings.summary.critical_stations);
const __VLS_0 = {}.ElTabs;
/** @type {[typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, typeof __VLS_components.ElTabs, typeof __VLS_components.elTabs, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "station-tabs" },
}));
const __VLS_2 = __VLS_1({
    modelValue: (__VLS_ctx.activeTab),
    ...{ class: "station-tabs" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    label: "站点台账",
    name: "stations",
}));
const __VLS_6 = __VLS_5({
    label: "站点台账",
    name: "stations",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel station-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-panel__toolbar-actions" },
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
    onClick: (__VLS_ctx.refreshOverview)
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
        __VLS_ctx.openCreateCheckDialog();
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
    model: (__VLS_ctx.stationFilters),
    ...{ class: "station-filters" },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.stationFilters),
    ...{ class: "station-filters" },
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
    label: "关键词",
}));
const __VLS_34 = __VLS_33({
    label: "关键词",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.stationFilters.keyword),
    clearable: true,
    placeholder: "站点编码 / 名称 / 地址",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.stationFilters.keyword),
    clearable: true,
    placeholder: "站点编码 / 名称 / 地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onKeyup: (__VLS_ctx.loadStations)
};
var __VLS_39;
var __VLS_35;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "站点类型",
}));
const __VLS_46 = __VLS_45({
    label: "站点类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.stationFilters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.stationFilters.type),
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
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationTypeOptions))) {
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
    label: "国家",
}));
const __VLS_62 = __VLS_61({
    label: "国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.stationFilters.country),
    clearable: true,
    placeholder: "如：中国",
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.stationFilters.country),
    clearable: true,
    placeholder: "如：中国",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
var __VLS_63;
const __VLS_68 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "城市",
}));
const __VLS_70 = __VLS_69({
    label: "城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    modelValue: (__VLS_ctx.stationFilters.city),
    clearable: true,
    placeholder: "如：上海",
}));
const __VLS_74 = __VLS_73({
    modelValue: (__VLS_ctx.stationFilters.city),
    clearable: true,
    placeholder: "如：上海",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
var __VLS_71;
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
    modelValue: (__VLS_ctx.stationFilters.status),
    clearable: true,
    placeholder: "默认全部",
    ...{ style: {} },
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.stationFilters.status),
    clearable: true,
    placeholder: "默认全部",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
const __VLS_84 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "默认全部",
    value: (undefined),
}));
const __VLS_86 = __VLS_85({
    label: "默认全部",
    value: (undefined),
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
    onClick: (__VLS_ctx.applyStationFilters)
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
    onClick: (__VLS_ctx.resetStationFilters)
};
__VLS_107.slots.default;
var __VLS_107;
var __VLS_95;
var __VLS_27;
const __VLS_112 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    data: (__VLS_ctx.stationRows),
    ...{ class: "station-table" },
    stripe: true,
}));
const __VLS_114 = __VLS_113({
    data: (__VLS_ctx.stationRows),
    ...{ class: "station-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.stationLoading) }, null, null);
__VLS_115.slots.default;
const __VLS_116 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "站点",
    minWidth: "220",
}));
const __VLS_118 = __VLS_117({
    label: "站点",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_119.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.name, scope.row.station_code));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.station_code);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (scope.row.type_name);
    (__VLS_ctx.normalizeText(scope.row.country));
    (__VLS_ctx.normalizeText(scope.row.city));
}
var __VLS_119;
const __VLS_120 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    label: "联系人",
    minWidth: "160",
}));
const __VLS_122 = __VLS_121({
    label: "联系人",
    minWidth: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_123.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.contact_name, '未设置'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.contact_phone, '无电话'));
}
var __VLS_123;
const __VLS_124 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    label: "库存快照",
    minWidth: "220",
}));
const __VLS_126 = __VLS_125({
    label: "库存快照",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_127.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__inventory" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.inventory.total_orders);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.inventory.in_warehouse);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.inventory.sorting);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.inventory.in_transit);
}
var __VLS_127;
const __VLS_128 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "容量",
    width: "160",
}));
const __VLS_130 = __VLS_129({
    label: "容量",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_131.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.capacity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.inventory.capacity_usage);
}
var __VLS_131;
const __VLS_132 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    label: "预警",
    width: "140",
}));
const __VLS_134 = __VLS_133({
    label: "预警",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_135.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_136 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
        type: (__VLS_ctx.warningTagType(scope.row.inventory.warning_level)),
        effect: "dark",
    }));
    const __VLS_138 = __VLS_137({
        type: (__VLS_ctx.warningTagType(scope.row.inventory.warning_level)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_137));
    __VLS_139.slots.default;
    (__VLS_ctx.warningLabel(scope.row.inventory.warning_level));
    var __VLS_139;
}
var __VLS_135;
const __VLS_140 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    label: "状态",
    width: "110",
}));
const __VLS_142 = __VLS_141({
    label: "状态",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_143.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_144 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "plain",
    }));
    const __VLS_146 = __VLS_145({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_145));
    __VLS_147.slots.default;
    (scope.row.status_name);
    var __VLS_147;
}
var __VLS_143;
const __VLS_148 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    label: "操作",
    fixed: "right",
    width: "280",
}));
const __VLS_150 = __VLS_149({
    label: "操作",
    fixed: "right",
    width: "280",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_151.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-actions" },
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
            __VLS_ctx.openStationDetail(scope.row.id);
        }
    };
    __VLS_155.slots.default;
    var __VLS_155;
    if (__VLS_ctx.canEditStation) {
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
                if (!(__VLS_ctx.canEditStation))
                    return;
                __VLS_ctx.openEditStation(scope.row);
            }
        };
        __VLS_163.slots.default;
        var __VLS_163;
    }
    const __VLS_168 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_172;
    let __VLS_173;
    let __VLS_174;
    const __VLS_175 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openCreateCheckDialog(scope.row.id);
        }
    };
    __VLS_171.slots.default;
    var __VLS_171;
    const __VLS_176 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_180;
    let __VLS_181;
    let __VLS_182;
    const __VLS_183 = {
        onClick: (...[$event]) => {
            __VLS_ctx.focusStationWarning(scope.row.id);
        }
    };
    __VLS_179.slots.default;
    var __VLS_179;
}
var __VLS_151;
var __VLS_115;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-pagination" },
});
const __VLS_184 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.stationPagination.total),
    currentPage: (__VLS_ctx.stationPagination.page),
    pageSize: (__VLS_ctx.stationPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_186 = __VLS_185({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.stationPagination.total),
    currentPage: (__VLS_ctx.stationPagination.page),
    pageSize: (__VLS_ctx.stationPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
let __VLS_188;
let __VLS_189;
let __VLS_190;
const __VLS_191 = {
    onCurrentChange: (__VLS_ctx.handleStationPageChange)
};
const __VLS_192 = {
    onSizeChange: (__VLS_ctx.handleStationSizeChange)
};
var __VLS_187;
var __VLS_7;
const __VLS_193 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_194 = __VLS_asFunctionalComponent(__VLS_193, new __VLS_193({
    label: "库存预警",
    name: "warnings",
}));
const __VLS_195 = __VLS_194({
    label: "库存预警",
    name: "warnings",
}, ...__VLS_functionalComponentArgsRest(__VLS_194));
__VLS_196.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "warning-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "card-panel warning-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warnings.summary.normal_stations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "card-panel warning-card warning-card--accent" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warnings.summary.warning_stations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "card-panel warning-card warning-card--critical" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.warnings.summary.critical_stations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "warning-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel warning-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "warning-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_197 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_198 = __VLS_asFunctionalComponent(__VLS_197, new __VLS_197({
    modelValue: (__VLS_ctx.warningFilter),
    ...{ style: {} },
}));
const __VLS_199 = __VLS_198({
    modelValue: (__VLS_ctx.warningFilter),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_198));
__VLS_200.slots.default;
const __VLS_201 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_202 = __VLS_asFunctionalComponent(__VLS_201, new __VLS_201({
    label: "全部级别",
    value: "all",
}));
const __VLS_203 = __VLS_202({
    label: "全部级别",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_202));
const __VLS_205 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_206 = __VLS_asFunctionalComponent(__VLS_205, new __VLS_205({
    label: "仅警告",
    value: "warning",
}));
const __VLS_207 = __VLS_206({
    label: "仅警告",
    value: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_206));
const __VLS_209 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_210 = __VLS_asFunctionalComponent(__VLS_209, new __VLS_209({
    label: "仅严重",
    value: "critical",
}));
const __VLS_211 = __VLS_210({
    label: "仅严重",
    value: "critical",
}, ...__VLS_functionalComponentArgsRest(__VLS_210));
var __VLS_200;
const __VLS_213 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_214 = __VLS_asFunctionalComponent(__VLS_213, new __VLS_213({
    data: (__VLS_ctx.filteredWarnings),
    ...{ class: "warning-table" },
    stripe: true,
}));
const __VLS_215 = __VLS_214({
    data: (__VLS_ctx.filteredWarnings),
    ...{ class: "warning-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_214));
__VLS_216.slots.default;
const __VLS_217 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    label: "站点",
    minWidth: "220",
}));
const __VLS_219 = __VLS_218({
    label: "站点",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
__VLS_220.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_220.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.station_name, scope.row.station_code));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.station_code);
}
var __VLS_220;
const __VLS_221 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    label: "库存占用",
    width: "150",
}));
const __VLS_223 = __VLS_222({
    label: "库存占用",
    width: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
__VLS_224.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_224.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.current_count);
    (scope.row.capacity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.usage_percent);
}
var __VLS_224;
const __VLS_225 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    label: "级别",
    width: "120",
}));
const __VLS_227 = __VLS_226({
    label: "级别",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
__VLS_228.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_228.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_229 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
        type: (__VLS_ctx.warningTagType(scope.row.warning_level)),
        effect: "dark",
    }));
    const __VLS_231 = __VLS_230({
        type: (__VLS_ctx.warningTagType(scope.row.warning_level)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_230));
    __VLS_232.slots.default;
    (__VLS_ctx.warningLabel(scope.row.warning_level));
    var __VLS_232;
}
var __VLS_228;
const __VLS_233 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    prop: "warning_message",
    label: "预警说明",
    minWidth: "240",
}));
const __VLS_235 = __VLS_234({
    prop: "warning_message",
    label: "预警说明",
    minWidth: "240",
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
const __VLS_237 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    prop: "recommend_action",
    label: "建议动作",
    minWidth: "220",
}));
const __VLS_239 = __VLS_238({
    prop: "recommend_action",
    label: "建议动作",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
var __VLS_216;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "warning-side" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel warning-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "warning-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-top-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.topBusyStations))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.station_id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(item.station_name, item.station_code));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.station_code);
    const __VLS_241 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
        type: (__VLS_ctx.warningTagType(item.warning_level)),
        effect: "plain",
    }));
    const __VLS_243 = __VLS_242({
        type: (__VLS_ctx.warningTagType(item.warning_level)),
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_242));
    __VLS_244.slots.default;
    (item.usage_percent);
    var __VLS_244;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel warning-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "warning-panel__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "distribution-list" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.sortedCapacityDistribution))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        key: (item.range),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.range);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (item.percentage);
}
var __VLS_196;
const __VLS_245 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    label: "盘点记录",
    name: "checks",
}));
const __VLS_247 = __VLS_246({
    label: "盘点记录",
    name: "checks",
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
__VLS_248.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel check-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_249 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_251 = __VLS_250({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
let __VLS_253;
let __VLS_254;
let __VLS_255;
const __VLS_256 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCreateCheckDialog();
    }
};
__VLS_252.slots.default;
var __VLS_252;
const __VLS_257 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.checkFilters),
    ...{ class: "station-filters" },
}));
const __VLS_259 = __VLS_258({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.checkFilters),
    ...{ class: "station-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
let __VLS_261;
let __VLS_262;
let __VLS_263;
const __VLS_264 = {
    onSubmit: () => { }
};
__VLS_260.slots.default;
const __VLS_265 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
    label: "站点",
}));
const __VLS_267 = __VLS_266({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
__VLS_268.slots.default;
const __VLS_269 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
    modelValue: (__VLS_ctx.checkFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_271 = __VLS_270({
    modelValue: (__VLS_ctx.checkFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_270));
__VLS_272.slots.default;
const __VLS_273 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_275 = __VLS_274({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_277 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_279 = __VLS_278({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_278));
}
var __VLS_272;
var __VLS_268;
const __VLS_281 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    label: "盘点类型",
}));
const __VLS_283 = __VLS_282({
    label: "盘点类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
__VLS_284.slots.default;
const __VLS_285 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
    modelValue: (__VLS_ctx.checkFilters.check_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_287 = __VLS_286({
    modelValue: (__VLS_ctx.checkFilters.check_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_286));
__VLS_288.slots.default;
const __VLS_289 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
    label: "全部类型",
    value: (undefined),
}));
const __VLS_291 = __VLS_290({
    label: "全部类型",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_290));
const __VLS_293 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
    label: "全盘",
    value: "full",
}));
const __VLS_295 = __VLS_294({
    label: "全盘",
    value: "full",
}, ...__VLS_functionalComponentArgsRest(__VLS_294));
const __VLS_297 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
    label: "抽盘",
    value: "spot",
}));
const __VLS_299 = __VLS_298({
    label: "抽盘",
    value: "spot",
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
var __VLS_288;
var __VLS_284;
const __VLS_301 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
    label: "状态",
}));
const __VLS_303 = __VLS_302({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
__VLS_304.slots.default;
const __VLS_305 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    modelValue: (__VLS_ctx.checkFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_307 = __VLS_306({
    modelValue: (__VLS_ctx.checkFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
const __VLS_309 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_311 = __VLS_310({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_310));
const __VLS_313 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
    label: "盘点中",
    value: (1),
}));
const __VLS_315 = __VLS_314({
    label: "盘点中",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_314));
const __VLS_317 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_318 = __VLS_asFunctionalComponent(__VLS_317, new __VLS_317({
    label: "已完成",
    value: (2),
}));
const __VLS_319 = __VLS_318({
    label: "已完成",
    value: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_318));
var __VLS_308;
var __VLS_304;
const __VLS_321 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({}));
const __VLS_323 = __VLS_322({}, ...__VLS_functionalComponentArgsRest(__VLS_322));
__VLS_324.slots.default;
const __VLS_325 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_327 = __VLS_326({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
let __VLS_329;
let __VLS_330;
let __VLS_331;
const __VLS_332 = {
    onClick: (__VLS_ctx.applyCheckFilters)
};
__VLS_328.slots.default;
var __VLS_328;
const __VLS_333 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
    ...{ 'onClick': {} },
}));
const __VLS_335 = __VLS_334({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
let __VLS_337;
let __VLS_338;
let __VLS_339;
const __VLS_340 = {
    onClick: (__VLS_ctx.resetCheckFilters)
};
__VLS_336.slots.default;
var __VLS_336;
var __VLS_324;
var __VLS_260;
const __VLS_341 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
    data: (__VLS_ctx.checks),
    ...{ class: "check-table" },
    stripe: true,
}));
const __VLS_343 = __VLS_342({
    data: (__VLS_ctx.checks),
    ...{ class: "check-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_342));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.checkLoading) }, null, null);
__VLS_344.slots.default;
const __VLS_345 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({
    prop: "check_no",
    label: "盘点单号",
    minWidth: "180",
}));
const __VLS_347 = __VLS_346({
    prop: "check_no",
    label: "盘点单号",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_346));
const __VLS_349 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_350 = __VLS_asFunctionalComponent(__VLS_349, new __VLS_349({
    label: "站点",
    minWidth: "180",
}));
const __VLS_351 = __VLS_350({
    label: "站点",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_350));
__VLS_352.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_352.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.station_name));
}
var __VLS_352;
const __VLS_353 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_354 = __VLS_asFunctionalComponent(__VLS_353, new __VLS_353({
    label: "类型",
    width: "100",
}));
const __VLS_355 = __VLS_354({
    label: "类型",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_354));
__VLS_356.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_356.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_357 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_358 = __VLS_asFunctionalComponent(__VLS_357, new __VLS_357({
        effect: "plain",
    }));
    const __VLS_359 = __VLS_358({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_358));
    __VLS_360.slots.default;
    (scope.row.check_type_name);
    var __VLS_360;
}
var __VLS_356;
const __VLS_361 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_362 = __VLS_asFunctionalComponent(__VLS_361, new __VLS_361({
    label: "系统 / 实盘",
    width: "140",
}));
const __VLS_363 = __VLS_362({
    label: "系统 / 实盘",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_362));
__VLS_364.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_364.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.system_count);
    (scope.row.actual_count);
}
var __VLS_364;
const __VLS_365 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_366 = __VLS_asFunctionalComponent(__VLS_365, new __VLS_365({
    label: "差异",
    width: "100",
}));
const __VLS_367 = __VLS_366({
    label: "差异",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_366));
__VLS_368.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_368.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (scope.row.difference_count === 0 ? 'text-success' : 'text-danger') },
    });
    (scope.row.difference_count);
}
var __VLS_368;
const __VLS_369 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({
    label: "状态",
    width: "100",
}));
const __VLS_371 = __VLS_370({
    label: "状态",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_370));
__VLS_372.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_372.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_373 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_374 = __VLS_asFunctionalComponent(__VLS_373, new __VLS_373({
        type: (scope.row.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_375 = __VLS_374({
        type: (scope.row.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_374));
    __VLS_376.slots.default;
    (scope.row.status_name);
    var __VLS_376;
}
var __VLS_372;
const __VLS_377 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
    prop: "operator_name",
    label: "盘点人",
    width: "120",
}));
const __VLS_379 = __VLS_378({
    prop: "operator_name",
    label: "盘点人",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_378));
const __VLS_381 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_382 = __VLS_asFunctionalComponent(__VLS_381, new __VLS_381({
    label: "盘点时间",
    minWidth: "170",
}));
const __VLS_383 = __VLS_382({
    label: "盘点时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_382));
__VLS_384.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_384.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.check_time));
}
var __VLS_384;
const __VLS_385 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_386 = __VLS_asFunctionalComponent(__VLS_385, new __VLS_385({
    label: "操作",
    fixed: "right",
    width: "100",
}));
const __VLS_387 = __VLS_386({
    label: "操作",
    fixed: "right",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_386));
__VLS_388.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_388.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_389 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_390 = __VLS_asFunctionalComponent(__VLS_389, new __VLS_389({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_391 = __VLS_390({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_390));
    let __VLS_393;
    let __VLS_394;
    let __VLS_395;
    const __VLS_396 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openCheckDetail(scope.row.id);
        }
    };
    __VLS_392.slots.default;
    var __VLS_392;
}
var __VLS_388;
var __VLS_344;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-pagination" },
});
const __VLS_397 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_398 = __VLS_asFunctionalComponent(__VLS_397, new __VLS_397({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.checkPagination.total),
    currentPage: (__VLS_ctx.checkPagination.page),
    pageSize: (__VLS_ctx.checkPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_399 = __VLS_398({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.checkPagination.total),
    currentPage: (__VLS_ctx.checkPagination.page),
    pageSize: (__VLS_ctx.checkPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_398));
let __VLS_401;
let __VLS_402;
let __VLS_403;
const __VLS_404 = {
    onCurrentChange: (__VLS_ctx.handleCheckPageChange)
};
const __VLS_405 = {
    onSizeChange: (__VLS_ctx.handleCheckSizeChange)
};
var __VLS_400;
var __VLS_248;
var __VLS_3;
const __VLS_406 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_407 = __VLS_asFunctionalComponent(__VLS_406, new __VLS_406({
    modelValue: (__VLS_ctx.stationDetailVisible),
    size: "62%",
    title: "站点详情",
}));
const __VLS_408 = __VLS_407({
    modelValue: (__VLS_ctx.stationDetailVisible),
    size: "62%",
    title: "站点详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_407));
__VLS_409.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.stationDetailLoading) }, null, null);
if (__VLS_ctx.stationDetail) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.name, __VLS_ctx.stationDetail.station_code));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.stationDetail.station_code);
    (__VLS_ctx.stationDetail.type_name);
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.country));
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.city));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__hero-tags" },
    });
    const __VLS_410 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_411 = __VLS_asFunctionalComponent(__VLS_410, new __VLS_410({
        type: (__VLS_ctx.stationDetail.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }));
    const __VLS_412 = __VLS_411({
        type: (__VLS_ctx.stationDetail.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_411));
    __VLS_413.slots.default;
    (__VLS_ctx.stationDetail.status_name);
    var __VLS_413;
    const __VLS_414 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_415 = __VLS_asFunctionalComponent(__VLS_414, new __VLS_414({
        type: (__VLS_ctx.warningTagType(__VLS_ctx.selectedStationInventory.warning_level)),
        effect: "plain",
    }));
    const __VLS_416 = __VLS_415({
        type: (__VLS_ctx.warningTagType(__VLS_ctx.selectedStationInventory.warning_level)),
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_415));
    __VLS_417.slots.default;
    (__VLS_ctx.warningLabel(__VLS_ctx.selectedStationInventory.warning_level));
    var __VLS_417;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar-actions" },
    });
    if (__VLS_ctx.canEditStation) {
        const __VLS_418 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_419 = __VLS_asFunctionalComponent(__VLS_418, new __VLS_418({
            ...{ 'onClick': {} },
            type: "success",
            plain: true,
        }));
        const __VLS_420 = __VLS_419({
            ...{ 'onClick': {} },
            type: "success",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_419));
        let __VLS_422;
        let __VLS_423;
        let __VLS_424;
        const __VLS_425 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.stationDetail))
                    return;
                if (!(__VLS_ctx.canEditStation))
                    return;
                __VLS_ctx.openEditStation(__VLS_ctx.stationDetail);
            }
        };
        __VLS_421.slots.default;
        var __VLS_421;
    }
    const __VLS_426 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_427 = __VLS_asFunctionalComponent(__VLS_426, new __VLS_426({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }));
    const __VLS_428 = __VLS_427({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_427));
    let __VLS_430;
    let __VLS_431;
    let __VLS_432;
    const __VLS_433 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.stationDetail))
                return;
            __VLS_ctx.openCreateCheckDialog(__VLS_ctx.stationDetail.id);
        }
    };
    __VLS_429.slots.default;
    var __VLS_429;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "station-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.stationDetail.station_code);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.stationDetail.type_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.contact_name, '未设置'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.contact_phone, '无电话'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.working_hours, '未设置'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.stationDetail.remark, '无备注'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "station-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatAddress(__VLS_ctx.stationDetail.country, __VLS_ctx.stationDetail.province, __VLS_ctx.stationDetail.city, __VLS_ctx.stationDetail.address));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.stationDetail.capacity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.selectedStationInventory.capacity_usage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.selectedStationWarning.warning_message, '暂无预警'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.selectedStationWarning.recommend_action, '继续保持正常运营'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "station-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.selectedStationInventory.total_orders);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.selectedStationInventory.in_warehouse);
    (__VLS_ctx.selectedStationInventory.sorting);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.selectedStationInventory.in_transit);
    (__VLS_ctx.selectedStationInventory.customs_clearing);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.selectedStationInventory.dest_sorting);
    (__VLS_ctx.selectedStationInventory.delivering);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "station-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.stationDetail.ctime));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.stationDetail.mtime));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.selectedStationWarning.last_check_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail-card station-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.stationFlows.length);
    const __VLS_434 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
        data: (__VLS_ctx.stationFlows),
        size: "small",
        stripe: true,
    }));
    const __VLS_436 = __VLS_435({
        data: (__VLS_ctx.stationFlows),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_435));
    __VLS_437.slots.default;
    const __VLS_438 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
        prop: "order_no",
        label: "订单号",
        minWidth: "170",
    }));
    const __VLS_440 = __VLS_439({
        prop: "order_no",
        label: "订单号",
        minWidth: "170",
    }, ...__VLS_functionalComponentArgsRest(__VLS_439));
    const __VLS_442 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({
        label: "流转类型",
        width: "100",
    }));
    const __VLS_444 = __VLS_443({
        label: "流转类型",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_443));
    __VLS_445.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_445.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_446 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_447 = __VLS_asFunctionalComponent(__VLS_446, new __VLS_446({
            type: (scope.row.flow_type === 'in' ? 'success' : 'warning'),
            effect: "plain",
        }));
        const __VLS_448 = __VLS_447({
            type: (scope.row.flow_type === 'in' ? 'success' : 'warning'),
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_447));
        __VLS_449.slots.default;
        (scope.row.flow_type_name);
        var __VLS_449;
    }
    var __VLS_445;
    const __VLS_450 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
        label: "重量 / 体积",
        width: "140",
    }));
    const __VLS_452 = __VLS_451({
        label: "重量 / 体积",
        width: "140",
    }, ...__VLS_functionalComponentArgsRest(__VLS_451));
    __VLS_453.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_453.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (scope.row.weight);
        (scope.row.volume);
    }
    var __VLS_453;
    const __VLS_454 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_455 = __VLS_asFunctionalComponent(__VLS_454, new __VLS_454({
        prop: "next_station",
        label: "下一站点",
        minWidth: "160",
    }));
    const __VLS_456 = __VLS_455({
        prop: "next_station",
        label: "下一站点",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_455));
    const __VLS_458 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }));
    const __VLS_460 = __VLS_459({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_459));
    const __VLS_462 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_463 = __VLS_asFunctionalComponent(__VLS_462, new __VLS_462({
        label: "时间",
        minWidth: "160",
    }));
    const __VLS_464 = __VLS_463({
        label: "时间",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_463));
    __VLS_465.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_465.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.formatUnix(scope.row.flow_time));
    }
    var __VLS_465;
    var __VLS_437;
}
var __VLS_409;
const __VLS_466 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
    modelValue: (__VLS_ctx.checkDetailVisible),
    size: "58%",
    title: "盘点记录详情",
}));
const __VLS_468 = __VLS_467({
    modelValue: (__VLS_ctx.checkDetailVisible),
    size: "58%",
    title: "盘点记录详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_467));
__VLS_469.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-drawer" },
});
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.checkDetailLoading) }, null, null);
if (__VLS_ctx.checkDetail) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__hero" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    (__VLS_ctx.checkDetail.check_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.checkDetail.station_name));
    (__VLS_ctx.checkDetail.check_type_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__hero-tags" },
    });
    const __VLS_470 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_471 = __VLS_asFunctionalComponent(__VLS_470, new __VLS_470({
        type: (__VLS_ctx.checkDetail.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_472 = __VLS_471({
        type: (__VLS_ctx.checkDetail.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_471));
    __VLS_473.slots.default;
    (__VLS_ctx.checkDetail.status_name);
    var __VLS_473;
    const __VLS_474 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_475 = __VLS_asFunctionalComponent(__VLS_474, new __VLS_474({
        effect: "plain",
    }));
    const __VLS_476 = __VLS_475({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_475));
    __VLS_477.slots.default;
    (__VLS_ctx.checkDetail.difference_count);
    var __VLS_477;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "station-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.checkDetail.system_count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.checkDetail.actual_count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.checkDetail.difference_count);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.checkDetail.operator_name, '系统'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "station-detail-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.checkDetail.check_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.formatUnix(__VLS_ctx.checkDetail.complete_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
    (__VLS_ctx.normalizeText(__VLS_ctx.checkDetail.remark, '无备注'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail-card station-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.checkDetail.details.length);
    const __VLS_478 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_479 = __VLS_asFunctionalComponent(__VLS_478, new __VLS_478({
        data: (__VLS_ctx.checkDetail.details),
        size: "small",
        stripe: true,
    }));
    const __VLS_480 = __VLS_479({
        data: (__VLS_ctx.checkDetail.details),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_479));
    __VLS_481.slots.default;
    const __VLS_482 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
        prop: "order_no",
        label: "订单号",
        minWidth: "180",
    }));
    const __VLS_484 = __VLS_483({
        prop: "order_no",
        label: "订单号",
        minWidth: "180",
    }, ...__VLS_functionalComponentArgsRest(__VLS_483));
    const __VLS_486 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_487 = __VLS_asFunctionalComponent(__VLS_486, new __VLS_486({
        prop: "status_name",
        label: "订单状态",
        width: "120",
    }));
    const __VLS_488 = __VLS_487({
        prop: "status_name",
        label: "订单状态",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_487));
    const __VLS_490 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_491 = __VLS_asFunctionalComponent(__VLS_490, new __VLS_490({
        prop: "is_found_name",
        label: "是否找到",
        width: "100",
    }));
    const __VLS_492 = __VLS_491({
        prop: "is_found_name",
        label: "是否找到",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_491));
    const __VLS_494 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_495 = __VLS_asFunctionalComponent(__VLS_494, new __VLS_494({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }));
    const __VLS_496 = __VLS_495({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_495));
    var __VLS_481;
}
var __VLS_469;
const __VLS_498 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_499 = __VLS_asFunctionalComponent(__VLS_498, new __VLS_498({
    modelValue: (__VLS_ctx.createCheckVisible),
    title: "新建库存盘点",
    width: "460px",
}));
const __VLS_500 = __VLS_499({
    modelValue: (__VLS_ctx.createCheckVisible),
    title: "新建库存盘点",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_499));
__VLS_501.slots.default;
const __VLS_502 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_503 = __VLS_asFunctionalComponent(__VLS_502, new __VLS_502({
    ref: "createCheckFormRef",
    model: (__VLS_ctx.createCheckForm),
    rules: (__VLS_ctx.createCheckRules),
    labelPosition: "top",
}));
const __VLS_504 = __VLS_503({
    ref: "createCheckFormRef",
    model: (__VLS_ctx.createCheckForm),
    rules: (__VLS_ctx.createCheckRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_503));
/** @type {typeof __VLS_ctx.createCheckFormRef} */ ;
var __VLS_506 = {};
__VLS_505.slots.default;
const __VLS_508 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_509 = __VLS_asFunctionalComponent(__VLS_508, new __VLS_508({
    label: "盘点站点",
    prop: "station_id",
}));
const __VLS_510 = __VLS_509({
    label: "盘点站点",
    prop: "station_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_509));
__VLS_511.slots.default;
const __VLS_512 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_513 = __VLS_asFunctionalComponent(__VLS_512, new __VLS_512({
    modelValue: (__VLS_ctx.createCheckForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_514 = __VLS_513({
    modelValue: (__VLS_ctx.createCheckForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_513));
__VLS_515.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_516 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_517 = __VLS_asFunctionalComponent(__VLS_516, new __VLS_516({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_518 = __VLS_517({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_517));
}
var __VLS_515;
var __VLS_511;
const __VLS_520 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_521 = __VLS_asFunctionalComponent(__VLS_520, new __VLS_520({
    label: "盘点类型",
    prop: "check_type",
}));
const __VLS_522 = __VLS_521({
    label: "盘点类型",
    prop: "check_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_521));
__VLS_523.slots.default;
const __VLS_524 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_525 = __VLS_asFunctionalComponent(__VLS_524, new __VLS_524({
    modelValue: (__VLS_ctx.createCheckForm.check_type),
}));
const __VLS_526 = __VLS_525({
    modelValue: (__VLS_ctx.createCheckForm.check_type),
}, ...__VLS_functionalComponentArgsRest(__VLS_525));
__VLS_527.slots.default;
const __VLS_528 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_529 = __VLS_asFunctionalComponent(__VLS_528, new __VLS_528({
    label: "full",
}));
const __VLS_530 = __VLS_529({
    label: "full",
}, ...__VLS_functionalComponentArgsRest(__VLS_529));
__VLS_531.slots.default;
var __VLS_531;
const __VLS_532 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_533 = __VLS_asFunctionalComponent(__VLS_532, new __VLS_532({
    label: "spot",
}));
const __VLS_534 = __VLS_533({
    label: "spot",
}, ...__VLS_functionalComponentArgsRest(__VLS_533));
__VLS_535.slots.default;
var __VLS_535;
var __VLS_527;
var __VLS_523;
const __VLS_536 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_537 = __VLS_asFunctionalComponent(__VLS_536, new __VLS_536({
    label: "备注",
}));
const __VLS_538 = __VLS_537({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_537));
__VLS_539.slots.default;
const __VLS_540 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_541 = __VLS_asFunctionalComponent(__VLS_540, new __VLS_540({
    modelValue: (__VLS_ctx.createCheckForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写盘点说明",
}));
const __VLS_542 = __VLS_541({
    modelValue: (__VLS_ctx.createCheckForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写盘点说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_541));
var __VLS_539;
var __VLS_505;
{
    const { footer: __VLS_thisSlot } = __VLS_501.slots;
    const __VLS_544 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_545 = __VLS_asFunctionalComponent(__VLS_544, new __VLS_544({
        ...{ 'onClick': {} },
    }));
    const __VLS_546 = __VLS_545({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_545));
    let __VLS_548;
    let __VLS_549;
    let __VLS_550;
    const __VLS_551 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createCheckVisible = false;
        }
    };
    __VLS_547.slots.default;
    var __VLS_547;
    const __VLS_552 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_553 = __VLS_asFunctionalComponent(__VLS_552, new __VLS_552({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createCheckSubmitting),
    }));
    const __VLS_554 = __VLS_553({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createCheckSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_553));
    let __VLS_556;
    let __VLS_557;
    let __VLS_558;
    const __VLS_559 = {
        onClick: (__VLS_ctx.submitCreateCheck)
    };
    __VLS_555.slots.default;
    var __VLS_555;
}
var __VLS_501;
const __VLS_560 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_561 = __VLS_asFunctionalComponent(__VLS_560, new __VLS_560({
    modelValue: (__VLS_ctx.editStationVisible),
    title: "编辑站点",
    width: "720px",
}));
const __VLS_562 = __VLS_561({
    modelValue: (__VLS_ctx.editStationVisible),
    title: "编辑站点",
    width: "720px",
}, ...__VLS_functionalComponentArgsRest(__VLS_561));
__VLS_563.slots.default;
const __VLS_564 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_565 = __VLS_asFunctionalComponent(__VLS_564, new __VLS_564({
    ref: "editStationFormRef",
    model: (__VLS_ctx.editStationForm),
    rules: (__VLS_ctx.editStationRules),
    labelPosition: "top",
}));
const __VLS_566 = __VLS_565({
    ref: "editStationFormRef",
    model: (__VLS_ctx.editStationForm),
    rules: (__VLS_ctx.editStationRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_565));
/** @type {typeof __VLS_ctx.editStationFormRef} */ ;
var __VLS_568 = {};
__VLS_567.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-edit-grid" },
});
const __VLS_570 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_571 = __VLS_asFunctionalComponent(__VLS_570, new __VLS_570({
    label: "站点名称",
    prop: "name",
}));
const __VLS_572 = __VLS_571({
    label: "站点名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_571));
__VLS_573.slots.default;
const __VLS_574 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_575 = __VLS_asFunctionalComponent(__VLS_574, new __VLS_574({
    modelValue: (__VLS_ctx.editStationForm.name),
    placeholder: "请输入站点名称",
}));
const __VLS_576 = __VLS_575({
    modelValue: (__VLS_ctx.editStationForm.name),
    placeholder: "请输入站点名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_575));
var __VLS_573;
const __VLS_578 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_579 = __VLS_asFunctionalComponent(__VLS_578, new __VLS_578({
    label: "站点类型",
    prop: "type",
}));
const __VLS_580 = __VLS_579({
    label: "站点类型",
    prop: "type",
}, ...__VLS_functionalComponentArgsRest(__VLS_579));
__VLS_581.slots.default;
const __VLS_582 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_583 = __VLS_asFunctionalComponent(__VLS_582, new __VLS_582({
    modelValue: (__VLS_ctx.editStationForm.type),
    placeholder: "请选择站点类型",
    ...{ style: {} },
}));
const __VLS_584 = __VLS_583({
    modelValue: (__VLS_ctx.editStationForm.type),
    placeholder: "请选择站点类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_583));
__VLS_585.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationTypeOptions))) {
    const __VLS_586 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_587 = __VLS_asFunctionalComponent(__VLS_586, new __VLS_586({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_588 = __VLS_587({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_587));
}
var __VLS_585;
var __VLS_581;
const __VLS_590 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_591 = __VLS_asFunctionalComponent(__VLS_590, new __VLS_590({
    label: "国家",
    prop: "country",
}));
const __VLS_592 = __VLS_591({
    label: "国家",
    prop: "country",
}, ...__VLS_functionalComponentArgsRest(__VLS_591));
__VLS_593.slots.default;
const __VLS_594 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_595 = __VLS_asFunctionalComponent(__VLS_594, new __VLS_594({
    modelValue: (__VLS_ctx.editStationForm.country),
    placeholder: "请输入国家",
}));
const __VLS_596 = __VLS_595({
    modelValue: (__VLS_ctx.editStationForm.country),
    placeholder: "请输入国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_595));
var __VLS_593;
const __VLS_598 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_599 = __VLS_asFunctionalComponent(__VLS_598, new __VLS_598({
    label: "省份",
}));
const __VLS_600 = __VLS_599({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_599));
__VLS_601.slots.default;
const __VLS_602 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_603 = __VLS_asFunctionalComponent(__VLS_602, new __VLS_602({
    modelValue: (__VLS_ctx.editStationForm.province),
    placeholder: "请输入省份",
}));
const __VLS_604 = __VLS_603({
    modelValue: (__VLS_ctx.editStationForm.province),
    placeholder: "请输入省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_603));
var __VLS_601;
const __VLS_606 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_607 = __VLS_asFunctionalComponent(__VLS_606, new __VLS_606({
    label: "城市",
    prop: "city",
}));
const __VLS_608 = __VLS_607({
    label: "城市",
    prop: "city",
}, ...__VLS_functionalComponentArgsRest(__VLS_607));
__VLS_609.slots.default;
const __VLS_610 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_611 = __VLS_asFunctionalComponent(__VLS_610, new __VLS_610({
    modelValue: (__VLS_ctx.editStationForm.city),
    placeholder: "请输入城市",
}));
const __VLS_612 = __VLS_611({
    modelValue: (__VLS_ctx.editStationForm.city),
    placeholder: "请输入城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_611));
var __VLS_609;
const __VLS_614 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_615 = __VLS_asFunctionalComponent(__VLS_614, new __VLS_614({
    label: "容量",
    prop: "capacity",
}));
const __VLS_616 = __VLS_615({
    label: "容量",
    prop: "capacity",
}, ...__VLS_functionalComponentArgsRest(__VLS_615));
__VLS_617.slots.default;
const __VLS_618 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_619 = __VLS_asFunctionalComponent(__VLS_618, new __VLS_618({
    modelValue: (__VLS_ctx.editStationForm.capacity),
    min: (1),
    step: (100),
    ...{ style: {} },
}));
const __VLS_620 = __VLS_619({
    modelValue: (__VLS_ctx.editStationForm.capacity),
    min: (1),
    step: (100),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_619));
var __VLS_617;
const __VLS_622 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_623 = __VLS_asFunctionalComponent(__VLS_622, new __VLS_622({
    label: "详细地址",
    prop: "address",
    ...{ class: "station-edit-grid__wide" },
}));
const __VLS_624 = __VLS_623({
    label: "详细地址",
    prop: "address",
    ...{ class: "station-edit-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_623));
__VLS_625.slots.default;
const __VLS_626 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_627 = __VLS_asFunctionalComponent(__VLS_626, new __VLS_626({
    modelValue: (__VLS_ctx.editStationForm.address),
    placeholder: "请输入详细地址",
}));
const __VLS_628 = __VLS_627({
    modelValue: (__VLS_ctx.editStationForm.address),
    placeholder: "请输入详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_627));
var __VLS_625;
const __VLS_630 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_631 = __VLS_asFunctionalComponent(__VLS_630, new __VLS_630({
    label: "纬度",
}));
const __VLS_632 = __VLS_631({
    label: "纬度",
}, ...__VLS_functionalComponentArgsRest(__VLS_631));
__VLS_633.slots.default;
const __VLS_634 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_635 = __VLS_asFunctionalComponent(__VLS_634, new __VLS_634({
    modelValue: (__VLS_ctx.editStationForm.latitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}));
const __VLS_636 = __VLS_635({
    modelValue: (__VLS_ctx.editStationForm.latitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_635));
var __VLS_633;
const __VLS_638 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_639 = __VLS_asFunctionalComponent(__VLS_638, new __VLS_638({
    label: "经度",
}));
const __VLS_640 = __VLS_639({
    label: "经度",
}, ...__VLS_functionalComponentArgsRest(__VLS_639));
__VLS_641.slots.default;
const __VLS_642 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_643 = __VLS_asFunctionalComponent(__VLS_642, new __VLS_642({
    modelValue: (__VLS_ctx.editStationForm.longitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}));
const __VLS_644 = __VLS_643({
    modelValue: (__VLS_ctx.editStationForm.longitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_643));
var __VLS_641;
const __VLS_646 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_647 = __VLS_asFunctionalComponent(__VLS_646, new __VLS_646({
    label: "联系人",
}));
const __VLS_648 = __VLS_647({
    label: "联系人",
}, ...__VLS_functionalComponentArgsRest(__VLS_647));
__VLS_649.slots.default;
const __VLS_650 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_651 = __VLS_asFunctionalComponent(__VLS_650, new __VLS_650({
    modelValue: (__VLS_ctx.editStationForm.contact_name),
    placeholder: "请输入联系人",
}));
const __VLS_652 = __VLS_651({
    modelValue: (__VLS_ctx.editStationForm.contact_name),
    placeholder: "请输入联系人",
}, ...__VLS_functionalComponentArgsRest(__VLS_651));
var __VLS_649;
const __VLS_654 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_655 = __VLS_asFunctionalComponent(__VLS_654, new __VLS_654({
    label: "联系电话",
}));
const __VLS_656 = __VLS_655({
    label: "联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_655));
__VLS_657.slots.default;
const __VLS_658 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_659 = __VLS_asFunctionalComponent(__VLS_658, new __VLS_658({
    modelValue: (__VLS_ctx.editStationForm.contact_phone),
    placeholder: "请输入联系电话",
}));
const __VLS_660 = __VLS_659({
    modelValue: (__VLS_ctx.editStationForm.contact_phone),
    placeholder: "请输入联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_659));
var __VLS_657;
const __VLS_662 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_663 = __VLS_asFunctionalComponent(__VLS_662, new __VLS_662({
    label: "工作时间",
}));
const __VLS_664 = __VLS_663({
    label: "工作时间",
}, ...__VLS_functionalComponentArgsRest(__VLS_663));
__VLS_665.slots.default;
const __VLS_666 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_667 = __VLS_asFunctionalComponent(__VLS_666, new __VLS_666({
    modelValue: (__VLS_ctx.editStationForm.working_hours),
    placeholder: "如：09:00-18:00",
}));
const __VLS_668 = __VLS_667({
    modelValue: (__VLS_ctx.editStationForm.working_hours),
    placeholder: "如：09:00-18:00",
}, ...__VLS_functionalComponentArgsRest(__VLS_667));
var __VLS_665;
const __VLS_670 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_671 = __VLS_asFunctionalComponent(__VLS_670, new __VLS_670({
    label: "状态",
    prop: "status",
}));
const __VLS_672 = __VLS_671({
    label: "状态",
    prop: "status",
}, ...__VLS_functionalComponentArgsRest(__VLS_671));
__VLS_673.slots.default;
const __VLS_674 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_675 = __VLS_asFunctionalComponent(__VLS_674, new __VLS_674({
    modelValue: (__VLS_ctx.editStationForm.status),
}));
const __VLS_676 = __VLS_675({
    modelValue: (__VLS_ctx.editStationForm.status),
}, ...__VLS_functionalComponentArgsRest(__VLS_675));
__VLS_677.slots.default;
const __VLS_678 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_679 = __VLS_asFunctionalComponent(__VLS_678, new __VLS_678({
    value: (1),
}));
const __VLS_680 = __VLS_679({
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_679));
__VLS_681.slots.default;
var __VLS_681;
const __VLS_682 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_683 = __VLS_asFunctionalComponent(__VLS_682, new __VLS_682({
    value: (0),
}));
const __VLS_684 = __VLS_683({
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_683));
__VLS_685.slots.default;
var __VLS_685;
var __VLS_677;
var __VLS_673;
const __VLS_686 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_687 = __VLS_asFunctionalComponent(__VLS_686, new __VLS_686({
    label: "备注",
    ...{ class: "station-edit-grid__wide" },
}));
const __VLS_688 = __VLS_687({
    label: "备注",
    ...{ class: "station-edit-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_687));
__VLS_689.slots.default;
const __VLS_690 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_691 = __VLS_asFunctionalComponent(__VLS_690, new __VLS_690({
    modelValue: (__VLS_ctx.editStationForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写站点备注",
}));
const __VLS_692 = __VLS_691({
    modelValue: (__VLS_ctx.editStationForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写站点备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_691));
var __VLS_689;
var __VLS_567;
{
    const { footer: __VLS_thisSlot } = __VLS_563.slots;
    const __VLS_694 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_695 = __VLS_asFunctionalComponent(__VLS_694, new __VLS_694({
        ...{ 'onClick': {} },
    }));
    const __VLS_696 = __VLS_695({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_695));
    let __VLS_698;
    let __VLS_699;
    let __VLS_700;
    const __VLS_701 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editStationVisible = false;
        }
    };
    __VLS_697.slots.default;
    var __VLS_697;
    const __VLS_702 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_703 = __VLS_asFunctionalComponent(__VLS_702, new __VLS_702({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editStationSubmitting),
    }));
    const __VLS_704 = __VLS_703({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editStationSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_703));
    let __VLS_706;
    let __VLS_707;
    let __VLS_708;
    const __VLS_709 = {
        onClick: (__VLS_ctx.submitEditStation)
    };
    __VLS_705.slots.default;
    var __VLS_705;
}
var __VLS_563;
/** @type {__VLS_StyleScopedClasses['station-inventory-view']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__chips']} */ ;
/** @type {__VLS_StyleScopedClasses['station-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['station-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['station-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__identity']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__inventory']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['station-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['station-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card--accent']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-card--critical']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-table']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__identity']} */ ;
/** @type {__VLS_StyleScopedClasses['station-table__meta']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-side']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['station-top-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['warning-panel__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['distribution-list']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['check-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['station-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['station-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['check-table']} */ ;
/** @type {__VLS_StyleScopedClasses['station-pagination']} */ ;
/** @type {__VLS_StyleScopedClasses['station-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['station-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__hero-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid__wide']} */ ;
// @ts-ignore
var __VLS_507 = __VLS_506, __VLS_569 = __VLS_568;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            stationTypeOptions: stationTypeOptions,
            activeTab: activeTab,
            warningFilter: warningFilter,
            stationLoading: stationLoading,
            stationDetailLoading: stationDetailLoading,
            checkLoading: checkLoading,
            checkDetailLoading: checkDetailLoading,
            createCheckSubmitting: createCheckSubmitting,
            stationOptions: stationOptions,
            warnings: warnings,
            stats: stats,
            checks: checks,
            stationDetail: stationDetail,
            stationFlows: stationFlows,
            checkDetail: checkDetail,
            stationDetailVisible: stationDetailVisible,
            checkDetailVisible: checkDetailVisible,
            createCheckVisible: createCheckVisible,
            editStationVisible: editStationVisible,
            stationPagination: stationPagination,
            checkPagination: checkPagination,
            stationFilters: stationFilters,
            checkFilters: checkFilters,
            createCheckFormRef: createCheckFormRef,
            editStationFormRef: editStationFormRef,
            createCheckForm: createCheckForm,
            editStationSubmitting: editStationSubmitting,
            editStationForm: editStationForm,
            createCheckRules: createCheckRules,
            editStationRules: editStationRules,
            stationRows: stationRows,
            selectedStationInventory: selectedStationInventory,
            selectedStationWarning: selectedStationWarning,
            filteredWarnings: filteredWarnings,
            sortedCapacityDistribution: sortedCapacityDistribution,
            topBusyStations: topBusyStations,
            canEditStation: canEditStation,
            normalizeText: normalizeText,
            formatUnix: formatUnix,
            formatAddress: formatAddress,
            warningLabel: warningLabel,
            warningTagType: warningTagType,
            loadStations: loadStations,
            refreshOverview: refreshOverview,
            applyStationFilters: applyStationFilters,
            resetStationFilters: resetStationFilters,
            handleStationPageChange: handleStationPageChange,
            handleStationSizeChange: handleStationSizeChange,
            applyCheckFilters: applyCheckFilters,
            resetCheckFilters: resetCheckFilters,
            handleCheckPageChange: handleCheckPageChange,
            handleCheckSizeChange: handleCheckSizeChange,
            openStationDetail: openStationDetail,
            openCheckDetail: openCheckDetail,
            openCreateCheckDialog: openCreateCheckDialog,
            openEditStation: openEditStation,
            submitCreateCheck: submitCreateCheck,
            submitEditStation: submitEditStation,
            focusStationWarning: focusStationWarning,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
