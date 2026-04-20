import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRoute } from 'vue-router';
import http from '@/utils/http';
import { printHtmlDocument, renderPrintFieldGrid, renderPrintHead, renderPrintTable } from '@/utils/print';
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
const inboundScanSubmitting = ref(false);
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
const stationServiceAreas = ref([]);
const checkDetail = ref(null);
const stationDetailVisible = ref(false);
const checkDetailVisible = ref(false);
const createCheckVisible = ref(false);
const inboundScanVisible = ref(false);
const serviceAreaDialogVisible = ref(false);
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
const inboundScanForm = reactive({
    station_id: undefined,
    scan_code: '',
    weight: 0,
    volume: 0,
    remark: '',
});
const editStationMode = ref('edit');
const editStationTargetId = ref(null);
const editStationSubmitting = ref(false);
const serviceAreaDialogMode = ref('create');
const serviceAreaTargetId = ref(null);
const serviceAreaSubmitting = ref(false);
const editStationForm = reactive({
    station_code: '',
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
const serviceAreaForm = reactive({
    country: '',
    province: '',
    city: '',
    district: '',
    priority: 100,
    status: 1,
    remark: '',
});
const createCheckRules = {
    station_id: [{ required: true, message: '请选择盘点站点', trigger: 'change' }],
    check_type: [{ required: true, message: '请选择盘点类型', trigger: 'change' }],
};
const editStationRules = {
    station_code: [{ required: true, message: '请输入站点编码', trigger: 'blur' }],
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
const canManageServiceArea = computed(() => [5, 6, 7].includes(authStore.user?.role || 0));
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
function serviceAreaScopeLabel(level) {
    const mapping = {
        country: '国家',
        province: '省份',
        city: '城市',
        district: '区县',
    };
    return mapping[level] || '范围';
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
        const [detail, flowData, serviceAreaData] = await Promise.all([
            http.get(`/stations/${stationID}`),
            http.get('/stations/flows/records', {
                params: {
                    station_id: stationID,
                    page: 1,
                    page_size: 8,
                },
            }),
            canManageServiceArea.value
                ? http.get(`/manager/stations/${stationID}/service-areas`)
                : Promise.resolve({ list: [] }),
        ]);
        stationDetail.value = detail;
        stationFlows.value = flowData.list || [];
        stationServiceAreas.value = serviceAreaData.list || [];
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
function printInventoryCheck() {
    if (!checkDetail.value)
        return;
    const detail = checkDetail.value;
    const rows = (detail.details || []).map((item, index) => [
        String(index + 1),
        item.order_no,
        item.status_name,
        item.is_found_name,
        normalizeText(item.remark, '-'),
    ]);
    const html = `
    ${renderPrintHead('库存盘点单', detail.check_no, detail.status_name)}
    ${renderPrintFieldGrid([
        {
            title: '盘点信息',
            fields: [
                { label: '站点', value: normalizeText(detail.station_name, '-') },
                { label: '盘点类型', value: detail.check_type_name },
                { label: '盘点人', value: normalizeText(detail.operator_name, '系统') },
                { label: '备注', value: normalizeText(detail.remark, '无') },
            ],
        },
        {
            title: '结果汇总',
            fields: [
                { label: '系统数量', value: String(detail.system_count ?? 0) },
                { label: '实际数量', value: String(detail.actual_count ?? 0) },
                { label: '差异数量', value: String(detail.difference_count ?? 0) },
                { label: '盘点时间', value: formatUnix(detail.check_time) },
            ],
        },
    ])}
    ${renderPrintTable('盘点明细', ['序号', '订单号', '订单状态', '是否找到', '备注'], rows.length ? rows : [['-', '-', '-', '-', '暂无明细']])}
    <section class="print-note">盘点单打印时间：${formatUnix(Date.now())}</section>
  `;
    printHtmlDocument(`盘点单-${detail.check_no}`, html);
}
function openCreateCheckDialog(stationID) {
    createCheckForm.station_id = stationID;
    createCheckForm.check_type = 'full';
    createCheckForm.remark = '';
    createCheckVisible.value = true;
}
function openInboundScanDialog(stationID) {
    inboundScanForm.station_id = stationID;
    inboundScanForm.scan_code = '';
    inboundScanForm.weight = 0;
    inboundScanForm.volume = 0;
    inboundScanForm.remark = '';
    inboundScanVisible.value = true;
}
function openCreateStationDialog() {
    editStationMode.value = 'create';
    editStationTargetId.value = null;
    editStationForm.station_code = '';
    editStationForm.name = '';
    editStationForm.type = 1;
    editStationForm.country = '';
    editStationForm.province = '';
    editStationForm.city = '';
    editStationForm.address = '';
    editStationForm.latitude = 0;
    editStationForm.longitude = 0;
    editStationForm.capacity = 1;
    editStationForm.contact_name = '';
    editStationForm.contact_phone = '';
    editStationForm.working_hours = '';
    editStationForm.status = 1;
    editStationForm.remark = '';
    editStationVisible.value = true;
    editStationFormRef.value?.clearValidate();
}
function resetServiceAreaForm() {
    serviceAreaForm.country = stationDetail.value?.country || '';
    serviceAreaForm.province = '';
    serviceAreaForm.city = '';
    serviceAreaForm.district = '';
    serviceAreaForm.priority = 100;
    serviceAreaForm.status = 1;
    serviceAreaForm.remark = '';
}
function openCreateServiceAreaDialog() {
    if (!stationDetail.value)
        return;
    serviceAreaDialogMode.value = 'create';
    serviceAreaTargetId.value = null;
    resetServiceAreaForm();
    serviceAreaDialogVisible.value = true;
}
function openEditServiceAreaDialog(area) {
    serviceAreaDialogMode.value = 'edit';
    serviceAreaTargetId.value = area.id;
    serviceAreaForm.country = area.country || '';
    serviceAreaForm.province = area.province || '';
    serviceAreaForm.city = area.city || '';
    serviceAreaForm.district = area.district || '';
    serviceAreaForm.priority = area.priority || 100;
    serviceAreaForm.status = area.status ?? 1;
    serviceAreaForm.remark = area.remark || '';
    serviceAreaDialogVisible.value = true;
}
function openEditStation(station) {
    editStationMode.value = 'edit';
    editStationTargetId.value = station.id;
    editStationForm.station_code = station.station_code || '';
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
async function submitInboundScan() {
    if (!inboundScanForm.station_id) {
        ElMessage.warning('请选择入库站点');
        return;
    }
    if (!inboundScanForm.scan_code.trim()) {
        ElMessage.warning('请输入订单号或包裹号');
        return;
    }
    inboundScanSubmitting.value = true;
    try {
        const data = await http.post('/warehouse/inbound', {
            station_id: inboundScanForm.station_id,
            scan_code: inboundScanForm.scan_code.trim(),
            weight: inboundScanForm.weight > 0 ? inboundScanForm.weight : undefined,
            volume: inboundScanForm.volume > 0 ? inboundScanForm.volume : undefined,
            remark: inboundScanForm.remark.trim(),
        });
        ElMessage.success(`入库成功：${data.order_no}`);
        inboundScanVisible.value = false;
        await Promise.all([loadStations(), refreshOverview(), loadChecks()]);
        if (stationDetailVisible.value && stationDetail.value?.id === inboundScanForm.station_id) {
            await openStationDetail(inboundScanForm.station_id);
        }
    }
    finally {
        inboundScanSubmitting.value = false;
    }
}
async function submitEditStation() {
    if (!editStationFormRef.value) {
        return;
    }
    const valid = await editStationFormRef.value.validate().catch(() => false);
    if (!valid) {
        return;
    }
    editStationSubmitting.value = true;
    try {
        const payload = {
            station_code: editStationForm.station_code.trim(),
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
        };
        if (editStationMode.value === 'create') {
            await http.post('/stations', payload);
            ElMessage.success('站点已创建');
        }
        else {
            if (!editStationTargetId.value) {
                return;
            }
            await http.put(`/stations/${editStationTargetId.value}`, {
                name: payload.name,
                type: payload.type,
                country: payload.country,
                province: payload.province,
                city: payload.city,
                address: payload.address,
                latitude: payload.latitude,
                longitude: payload.longitude,
                capacity: payload.capacity,
                contact_name: payload.contact_name,
                contact_phone: payload.contact_phone,
                working_hours: payload.working_hours,
                status: payload.status,
                remark: payload.remark,
            });
            ElMessage.success('站点信息已更新');
        }
        editStationVisible.value = false;
        await Promise.all([loadStations(), loadStationOptions(), refreshOverview()]);
        if (editStationMode.value === 'edit' && stationDetailVisible.value && stationDetail.value?.id === editStationTargetId.value) {
            await openStationDetail(editStationTargetId.value);
        }
    }
    finally {
        editStationSubmitting.value = false;
    }
}
async function submitServiceArea() {
    if (!stationDetail.value)
        return;
    if (!serviceAreaForm.country.trim()) {
        ElMessage.warning('请输入国家');
        return;
    }
    serviceAreaSubmitting.value = true;
    try {
        const payload = {
            country: serviceAreaForm.country.trim(),
            province: serviceAreaForm.province.trim(),
            city: serviceAreaForm.city.trim(),
            district: serviceAreaForm.district.trim(),
            priority: Number(serviceAreaForm.priority),
            status: serviceAreaForm.status,
            remark: serviceAreaForm.remark.trim(),
        };
        if (serviceAreaDialogMode.value === 'create') {
            await http.post(`/manager/stations/${stationDetail.value.id}/service-areas`, payload);
            ElMessage.success('服务范围已创建');
        }
        else {
            if (!serviceAreaTargetId.value)
                return;
            await http.put(`/manager/stations/${stationDetail.value.id}/service-areas/${serviceAreaTargetId.value}`, payload);
            ElMessage.success('服务范围已更新');
        }
        serviceAreaDialogVisible.value = false;
        await openStationDetail(stationDetail.value.id);
    }
    finally {
        serviceAreaSubmitting.value = false;
    }
}
async function deleteServiceArea(area) {
    if (!stationDetail.value)
        return;
    await ElMessageBox.confirm(`确认删除服务范围：${formatAddress(area.country, area.province, area.city, area.district)}？`, '删除确认', { type: 'warning' });
    await http.delete(`/manager/stations/${stationDetail.value.id}/service-areas/${area.id}`);
    ElMessage.success('服务范围已删除');
    await openStationDetail(stationDetail.value.id);
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
if (__VLS_ctx.canEditStation) {
    const __VLS_8 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.canEditStation))
                return;
            __VLS_ctx.openCreateStationDialog();
        }
    };
    __VLS_11.slots.default;
    var __VLS_11;
}
const __VLS_16 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    type: "primary",
    plain: true,
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    type: "primary",
    plain: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openInboundScanDialog();
    }
};
__VLS_19.slots.default;
var __VLS_19;
const __VLS_24 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onClick': {} },
}));
const __VLS_26 = __VLS_25({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onClick: (__VLS_ctx.refreshOverview)
};
__VLS_27.slots.default;
var __VLS_27;
const __VLS_32 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_34 = __VLS_33({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
let __VLS_36;
let __VLS_37;
let __VLS_38;
const __VLS_39 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCreateCheckDialog();
    }
};
__VLS_35.slots.default;
var __VLS_35;
const __VLS_40 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.stationFilters),
    ...{ class: "station-filters" },
}));
const __VLS_42 = __VLS_41({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.stationFilters),
    ...{ class: "station-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
let __VLS_44;
let __VLS_45;
let __VLS_46;
const __VLS_47 = {
    onSubmit: () => { }
};
__VLS_43.slots.default;
const __VLS_48 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    label: "关键词",
}));
const __VLS_50 = __VLS_49({
    label: "关键词",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.stationFilters.keyword),
    clearable: true,
    placeholder: "站点编码 / 名称 / 地址",
}));
const __VLS_54 = __VLS_53({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.stationFilters.keyword),
    clearable: true,
    placeholder: "站点编码 / 名称 / 地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
let __VLS_56;
let __VLS_57;
let __VLS_58;
const __VLS_59 = {
    onKeyup: (__VLS_ctx.loadStations)
};
var __VLS_55;
var __VLS_51;
const __VLS_60 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "站点类型",
}));
const __VLS_62 = __VLS_61({
    label: "站点类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
const __VLS_64 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    modelValue: (__VLS_ctx.stationFilters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_66 = __VLS_65({
    modelValue: (__VLS_ctx.stationFilters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "全部类型",
    value: (undefined),
}));
const __VLS_70 = __VLS_69({
    label: "全部类型",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationTypeOptions))) {
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
    label: "国家",
}));
const __VLS_78 = __VLS_77({
    label: "国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.stationFilters.country),
    clearable: true,
    placeholder: "如：中国",
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.stationFilters.country),
    clearable: true,
    placeholder: "如：中国",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
var __VLS_79;
const __VLS_84 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "城市",
}));
const __VLS_86 = __VLS_85({
    label: "城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    modelValue: (__VLS_ctx.stationFilters.city),
    clearable: true,
    placeholder: "如：上海",
}));
const __VLS_90 = __VLS_89({
    modelValue: (__VLS_ctx.stationFilters.city),
    clearable: true,
    placeholder: "如：上海",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
var __VLS_87;
const __VLS_92 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: "状态",
}));
const __VLS_94 = __VLS_93({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: (__VLS_ctx.stationFilters.status),
    clearable: true,
    placeholder: "默认全部",
    ...{ style: {} },
}));
const __VLS_98 = __VLS_97({
    modelValue: (__VLS_ctx.stationFilters.status),
    clearable: true,
    placeholder: "默认全部",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    label: "默认全部",
    value: (undefined),
}));
const __VLS_102 = __VLS_101({
    label: "默认全部",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
const __VLS_104 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    label: "启用",
    value: (1),
}));
const __VLS_106 = __VLS_105({
    label: "启用",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
var __VLS_99;
var __VLS_95;
const __VLS_108 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({}));
const __VLS_110 = __VLS_109({}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
const __VLS_112 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_114 = __VLS_113({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
let __VLS_116;
let __VLS_117;
let __VLS_118;
const __VLS_119 = {
    onClick: (__VLS_ctx.applyStationFilters)
};
__VLS_115.slots.default;
var __VLS_115;
const __VLS_120 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    ...{ 'onClick': {} },
}));
const __VLS_122 = __VLS_121({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
let __VLS_124;
let __VLS_125;
let __VLS_126;
const __VLS_127 = {
    onClick: (__VLS_ctx.resetStationFilters)
};
__VLS_123.slots.default;
var __VLS_123;
var __VLS_111;
var __VLS_43;
const __VLS_128 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    data: (__VLS_ctx.stationRows),
    ...{ class: "station-table" },
    stripe: true,
}));
const __VLS_130 = __VLS_129({
    data: (__VLS_ctx.stationRows),
    ...{ class: "station-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.stationLoading) }, null, null);
__VLS_131.slots.default;
const __VLS_132 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
    label: "站点",
    minWidth: "220",
}));
const __VLS_134 = __VLS_133({
    label: "站点",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_133));
__VLS_135.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_135.slots;
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
var __VLS_135;
const __VLS_136 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "联系人",
    minWidth: "160",
}));
const __VLS_138 = __VLS_137({
    label: "联系人",
    minWidth: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_139.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.contact_name, '未设置'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.normalizeText(scope.row.contact_phone, '无电话'));
}
var __VLS_139;
const __VLS_140 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    label: "库存快照",
    minWidth: "220",
}));
const __VLS_142 = __VLS_141({
    label: "库存快照",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
__VLS_143.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_143.slots;
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
var __VLS_143;
const __VLS_144 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    label: "容量",
    width: "160",
}));
const __VLS_146 = __VLS_145({
    label: "容量",
    width: "160",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_147.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.capacity);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.inventory.capacity_usage);
}
var __VLS_147;
const __VLS_148 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    label: "预警",
    width: "140",
}));
const __VLS_150 = __VLS_149({
    label: "预警",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
__VLS_151.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_151.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_152 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
        type: (__VLS_ctx.warningTagType(scope.row.inventory.warning_level)),
        effect: "dark",
    }));
    const __VLS_154 = __VLS_153({
        type: (__VLS_ctx.warningTagType(scope.row.inventory.warning_level)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_153));
    __VLS_155.slots.default;
    (__VLS_ctx.warningLabel(scope.row.inventory.warning_level));
    var __VLS_155;
}
var __VLS_151;
const __VLS_156 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    label: "状态",
    width: "110",
}));
const __VLS_158 = __VLS_157({
    label: "状态",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
__VLS_159.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_159.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_160 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "plain",
    }));
    const __VLS_162 = __VLS_161({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "plain",
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
    label: "操作",
    fixed: "right",
    width: "280",
}));
const __VLS_166 = __VLS_165({
    label: "操作",
    fixed: "right",
    width: "280",
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
__VLS_167.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_167.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-actions" },
    });
    const __VLS_168 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_170 = __VLS_169({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_169));
    let __VLS_172;
    let __VLS_173;
    let __VLS_174;
    const __VLS_175 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openStationDetail(scope.row.id);
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
        type: "primary",
    }));
    const __VLS_178 = __VLS_177({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_177));
    let __VLS_180;
    let __VLS_181;
    let __VLS_182;
    const __VLS_183 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openInboundScanDialog(scope.row.id);
        }
    };
    __VLS_179.slots.default;
    var __VLS_179;
    if (__VLS_ctx.canEditStation) {
        const __VLS_184 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }));
        const __VLS_186 = __VLS_185({
            ...{ 'onClick': {} },
            link: true,
            type: "success",
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        let __VLS_188;
        let __VLS_189;
        let __VLS_190;
        const __VLS_191 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.canEditStation))
                    return;
                __VLS_ctx.openEditStation(scope.row);
            }
        };
        __VLS_187.slots.default;
        var __VLS_187;
    }
    const __VLS_192 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }));
    const __VLS_194 = __VLS_193({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    let __VLS_196;
    let __VLS_197;
    let __VLS_198;
    const __VLS_199 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openCreateCheckDialog(scope.row.id);
        }
    };
    __VLS_195.slots.default;
    var __VLS_195;
    const __VLS_200 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
        link: true,
        type: "info",
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (...[$event]) => {
            __VLS_ctx.focusStationWarning(scope.row.id);
        }
    };
    __VLS_203.slots.default;
    var __VLS_203;
}
var __VLS_167;
var __VLS_131;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-pagination" },
});
const __VLS_208 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.stationPagination.total),
    currentPage: (__VLS_ctx.stationPagination.page),
    pageSize: (__VLS_ctx.stationPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_210 = __VLS_209({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.stationPagination.total),
    currentPage: (__VLS_ctx.stationPagination.page),
    pageSize: (__VLS_ctx.stationPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_209));
let __VLS_212;
let __VLS_213;
let __VLS_214;
const __VLS_215 = {
    onCurrentChange: (__VLS_ctx.handleStationPageChange)
};
const __VLS_216 = {
    onSizeChange: (__VLS_ctx.handleStationSizeChange)
};
var __VLS_211;
var __VLS_7;
const __VLS_217 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_218 = __VLS_asFunctionalComponent(__VLS_217, new __VLS_217({
    label: "库存预警",
    name: "warnings",
}));
const __VLS_219 = __VLS_218({
    label: "库存预警",
    name: "warnings",
}, ...__VLS_functionalComponentArgsRest(__VLS_218));
__VLS_220.slots.default;
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
const __VLS_221 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_222 = __VLS_asFunctionalComponent(__VLS_221, new __VLS_221({
    modelValue: (__VLS_ctx.warningFilter),
    ...{ style: {} },
}));
const __VLS_223 = __VLS_222({
    modelValue: (__VLS_ctx.warningFilter),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_222));
__VLS_224.slots.default;
const __VLS_225 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_226 = __VLS_asFunctionalComponent(__VLS_225, new __VLS_225({
    label: "全部级别",
    value: "all",
}));
const __VLS_227 = __VLS_226({
    label: "全部级别",
    value: "all",
}, ...__VLS_functionalComponentArgsRest(__VLS_226));
const __VLS_229 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_230 = __VLS_asFunctionalComponent(__VLS_229, new __VLS_229({
    label: "仅警告",
    value: "warning",
}));
const __VLS_231 = __VLS_230({
    label: "仅警告",
    value: "warning",
}, ...__VLS_functionalComponentArgsRest(__VLS_230));
const __VLS_233 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_234 = __VLS_asFunctionalComponent(__VLS_233, new __VLS_233({
    label: "仅严重",
    value: "critical",
}));
const __VLS_235 = __VLS_234({
    label: "仅严重",
    value: "critical",
}, ...__VLS_functionalComponentArgsRest(__VLS_234));
var __VLS_224;
const __VLS_237 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_238 = __VLS_asFunctionalComponent(__VLS_237, new __VLS_237({
    data: (__VLS_ctx.filteredWarnings),
    ...{ class: "warning-table" },
    stripe: true,
}));
const __VLS_239 = __VLS_238({
    data: (__VLS_ctx.filteredWarnings),
    ...{ class: "warning-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_238));
__VLS_240.slots.default;
const __VLS_241 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_242 = __VLS_asFunctionalComponent(__VLS_241, new __VLS_241({
    label: "站点",
    minWidth: "220",
}));
const __VLS_243 = __VLS_242({
    label: "站点",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_242));
__VLS_244.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_244.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-table__identity" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.normalizeText(scope.row.station_name, scope.row.station_code));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.station_code);
}
var __VLS_244;
const __VLS_245 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_246 = __VLS_asFunctionalComponent(__VLS_245, new __VLS_245({
    label: "库存占用",
    width: "150",
}));
const __VLS_247 = __VLS_246({
    label: "库存占用",
    width: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_246));
__VLS_248.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_248.slots;
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
var __VLS_248;
const __VLS_249 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_250 = __VLS_asFunctionalComponent(__VLS_249, new __VLS_249({
    label: "级别",
    width: "120",
}));
const __VLS_251 = __VLS_250({
    label: "级别",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_250));
__VLS_252.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_252.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_253 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_254 = __VLS_asFunctionalComponent(__VLS_253, new __VLS_253({
        type: (__VLS_ctx.warningTagType(scope.row.warning_level)),
        effect: "dark",
    }));
    const __VLS_255 = __VLS_254({
        type: (__VLS_ctx.warningTagType(scope.row.warning_level)),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_254));
    __VLS_256.slots.default;
    (__VLS_ctx.warningLabel(scope.row.warning_level));
    var __VLS_256;
}
var __VLS_252;
const __VLS_257 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_258 = __VLS_asFunctionalComponent(__VLS_257, new __VLS_257({
    prop: "warning_message",
    label: "预警说明",
    minWidth: "240",
}));
const __VLS_259 = __VLS_258({
    prop: "warning_message",
    label: "预警说明",
    minWidth: "240",
}, ...__VLS_functionalComponentArgsRest(__VLS_258));
const __VLS_261 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({
    prop: "recommend_action",
    label: "建议动作",
    minWidth: "220",
}));
const __VLS_263 = __VLS_262({
    prop: "recommend_action",
    label: "建议动作",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_262));
var __VLS_240;
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
    const __VLS_265 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
        type: (__VLS_ctx.warningTagType(item.warning_level)),
        effect: "plain",
    }));
    const __VLS_267 = __VLS_266({
        type: (__VLS_ctx.warningTagType(item.warning_level)),
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_266));
    __VLS_268.slots.default;
    (item.usage_percent);
    var __VLS_268;
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
var __VLS_220;
const __VLS_269 = {}.ElTabPane;
/** @type {[typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, typeof __VLS_components.ElTabPane, typeof __VLS_components.elTabPane, ]} */ ;
// @ts-ignore
const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
    label: "盘点记录",
    name: "checks",
}));
const __VLS_271 = __VLS_270({
    label: "盘点记录",
    name: "checks",
}, ...__VLS_functionalComponentArgsRest(__VLS_270));
__VLS_272.slots.default;
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
const __VLS_273 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_275 = __VLS_274({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
let __VLS_277;
let __VLS_278;
let __VLS_279;
const __VLS_280 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCreateCheckDialog();
    }
};
__VLS_276.slots.default;
var __VLS_276;
const __VLS_281 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.checkFilters),
    ...{ class: "station-filters" },
}));
const __VLS_283 = __VLS_282({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.checkFilters),
    ...{ class: "station-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
let __VLS_285;
let __VLS_286;
let __VLS_287;
const __VLS_288 = {
    onSubmit: () => { }
};
__VLS_284.slots.default;
const __VLS_289 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_290 = __VLS_asFunctionalComponent(__VLS_289, new __VLS_289({
    label: "站点",
}));
const __VLS_291 = __VLS_290({
    label: "站点",
}, ...__VLS_functionalComponentArgsRest(__VLS_290));
__VLS_292.slots.default;
const __VLS_293 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
    modelValue: (__VLS_ctx.checkFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}));
const __VLS_295 = __VLS_294({
    modelValue: (__VLS_ctx.checkFilters.station_id),
    clearable: true,
    placeholder: "全部站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_294));
__VLS_296.slots.default;
const __VLS_297 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_298 = __VLS_asFunctionalComponent(__VLS_297, new __VLS_297({
    label: "全部站点",
    value: (undefined),
}));
const __VLS_299 = __VLS_298({
    label: "全部站点",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_298));
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_301 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_303 = __VLS_302({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_302));
}
var __VLS_296;
var __VLS_292;
const __VLS_305 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    label: "盘点类型",
}));
const __VLS_307 = __VLS_306({
    label: "盘点类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
const __VLS_309 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
    modelValue: (__VLS_ctx.checkFilters.check_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_311 = __VLS_310({
    modelValue: (__VLS_ctx.checkFilters.check_type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_310));
__VLS_312.slots.default;
const __VLS_313 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
    label: "全部类型",
    value: (undefined),
}));
const __VLS_315 = __VLS_314({
    label: "全部类型",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_314));
const __VLS_317 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_318 = __VLS_asFunctionalComponent(__VLS_317, new __VLS_317({
    label: "全盘",
    value: "full",
}));
const __VLS_319 = __VLS_318({
    label: "全盘",
    value: "full",
}, ...__VLS_functionalComponentArgsRest(__VLS_318));
const __VLS_321 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
    label: "抽盘",
    value: "spot",
}));
const __VLS_323 = __VLS_322({
    label: "抽盘",
    value: "spot",
}, ...__VLS_functionalComponentArgsRest(__VLS_322));
var __VLS_312;
var __VLS_308;
const __VLS_325 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_326 = __VLS_asFunctionalComponent(__VLS_325, new __VLS_325({
    label: "状态",
}));
const __VLS_327 = __VLS_326({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_326));
__VLS_328.slots.default;
const __VLS_329 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
    modelValue: (__VLS_ctx.checkFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_331 = __VLS_330({
    modelValue: (__VLS_ctx.checkFilters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_330));
__VLS_332.slots.default;
const __VLS_333 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_334 = __VLS_asFunctionalComponent(__VLS_333, new __VLS_333({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_335 = __VLS_334({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_334));
const __VLS_337 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_338 = __VLS_asFunctionalComponent(__VLS_337, new __VLS_337({
    label: "盘点中",
    value: (1),
}));
const __VLS_339 = __VLS_338({
    label: "盘点中",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_338));
const __VLS_341 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_342 = __VLS_asFunctionalComponent(__VLS_341, new __VLS_341({
    label: "已完成",
    value: (2),
}));
const __VLS_343 = __VLS_342({
    label: "已完成",
    value: (2),
}, ...__VLS_functionalComponentArgsRest(__VLS_342));
var __VLS_332;
var __VLS_328;
const __VLS_345 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_346 = __VLS_asFunctionalComponent(__VLS_345, new __VLS_345({}));
const __VLS_347 = __VLS_346({}, ...__VLS_functionalComponentArgsRest(__VLS_346));
__VLS_348.slots.default;
const __VLS_349 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_350 = __VLS_asFunctionalComponent(__VLS_349, new __VLS_349({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_351 = __VLS_350({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_350));
let __VLS_353;
let __VLS_354;
let __VLS_355;
const __VLS_356 = {
    onClick: (__VLS_ctx.applyCheckFilters)
};
__VLS_352.slots.default;
var __VLS_352;
const __VLS_357 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_358 = __VLS_asFunctionalComponent(__VLS_357, new __VLS_357({
    ...{ 'onClick': {} },
}));
const __VLS_359 = __VLS_358({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_358));
let __VLS_361;
let __VLS_362;
let __VLS_363;
const __VLS_364 = {
    onClick: (__VLS_ctx.resetCheckFilters)
};
__VLS_360.slots.default;
var __VLS_360;
var __VLS_348;
var __VLS_284;
const __VLS_365 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_366 = __VLS_asFunctionalComponent(__VLS_365, new __VLS_365({
    data: (__VLS_ctx.checks),
    ...{ class: "check-table" },
    stripe: true,
}));
const __VLS_367 = __VLS_366({
    data: (__VLS_ctx.checks),
    ...{ class: "check-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_366));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.checkLoading) }, null, null);
__VLS_368.slots.default;
const __VLS_369 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_370 = __VLS_asFunctionalComponent(__VLS_369, new __VLS_369({
    prop: "check_no",
    label: "盘点单号",
    minWidth: "180",
}));
const __VLS_371 = __VLS_370({
    prop: "check_no",
    label: "盘点单号",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_370));
const __VLS_373 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_374 = __VLS_asFunctionalComponent(__VLS_373, new __VLS_373({
    label: "站点",
    minWidth: "180",
}));
const __VLS_375 = __VLS_374({
    label: "站点",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_374));
__VLS_376.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_376.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.normalizeText(scope.row.station_name));
}
var __VLS_376;
const __VLS_377 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_378 = __VLS_asFunctionalComponent(__VLS_377, new __VLS_377({
    label: "类型",
    width: "100",
}));
const __VLS_379 = __VLS_378({
    label: "类型",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_378));
__VLS_380.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_380.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_381 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_382 = __VLS_asFunctionalComponent(__VLS_381, new __VLS_381({
        effect: "plain",
    }));
    const __VLS_383 = __VLS_382({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_382));
    __VLS_384.slots.default;
    (scope.row.check_type_name);
    var __VLS_384;
}
var __VLS_380;
const __VLS_385 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_386 = __VLS_asFunctionalComponent(__VLS_385, new __VLS_385({
    label: "系统 / 实盘",
    width: "140",
}));
const __VLS_387 = __VLS_386({
    label: "系统 / 实盘",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_386));
__VLS_388.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_388.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.system_count);
    (scope.row.actual_count);
}
var __VLS_388;
const __VLS_389 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_390 = __VLS_asFunctionalComponent(__VLS_389, new __VLS_389({
    label: "差异",
    width: "100",
}));
const __VLS_391 = __VLS_390({
    label: "差异",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_390));
__VLS_392.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_392.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (scope.row.difference_count === 0 ? 'text-success' : 'text-danger') },
    });
    (scope.row.difference_count);
}
var __VLS_392;
const __VLS_393 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_394 = __VLS_asFunctionalComponent(__VLS_393, new __VLS_393({
    label: "状态",
    width: "100",
}));
const __VLS_395 = __VLS_394({
    label: "状态",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_394));
__VLS_396.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_396.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_397 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_398 = __VLS_asFunctionalComponent(__VLS_397, new __VLS_397({
        type: (scope.row.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_399 = __VLS_398({
        type: (scope.row.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_398));
    __VLS_400.slots.default;
    (scope.row.status_name);
    var __VLS_400;
}
var __VLS_396;
const __VLS_401 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_402 = __VLS_asFunctionalComponent(__VLS_401, new __VLS_401({
    prop: "operator_name",
    label: "盘点人",
    width: "120",
}));
const __VLS_403 = __VLS_402({
    prop: "operator_name",
    label: "盘点人",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_402));
const __VLS_405 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_406 = __VLS_asFunctionalComponent(__VLS_405, new __VLS_405({
    label: "盘点时间",
    minWidth: "170",
}));
const __VLS_407 = __VLS_406({
    label: "盘点时间",
    minWidth: "170",
}, ...__VLS_functionalComponentArgsRest(__VLS_406));
__VLS_408.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_408.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.check_time));
}
var __VLS_408;
const __VLS_409 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_410 = __VLS_asFunctionalComponent(__VLS_409, new __VLS_409({
    label: "操作",
    fixed: "right",
    width: "100",
}));
const __VLS_411 = __VLS_410({
    label: "操作",
    fixed: "right",
    width: "100",
}, ...__VLS_functionalComponentArgsRest(__VLS_410));
__VLS_412.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_412.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_413 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_414 = __VLS_asFunctionalComponent(__VLS_413, new __VLS_413({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_415 = __VLS_414({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_414));
    let __VLS_417;
    let __VLS_418;
    let __VLS_419;
    const __VLS_420 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openCheckDetail(scope.row.id);
        }
    };
    __VLS_416.slots.default;
    var __VLS_416;
}
var __VLS_412;
var __VLS_368;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-pagination" },
});
const __VLS_421 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_422 = __VLS_asFunctionalComponent(__VLS_421, new __VLS_421({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.checkPagination.total),
    currentPage: (__VLS_ctx.checkPagination.page),
    pageSize: (__VLS_ctx.checkPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_423 = __VLS_422({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.checkPagination.total),
    currentPage: (__VLS_ctx.checkPagination.page),
    pageSize: (__VLS_ctx.checkPagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_422));
let __VLS_425;
let __VLS_426;
let __VLS_427;
const __VLS_428 = {
    onCurrentChange: (__VLS_ctx.handleCheckPageChange)
};
const __VLS_429 = {
    onSizeChange: (__VLS_ctx.handleCheckSizeChange)
};
var __VLS_424;
var __VLS_272;
var __VLS_3;
const __VLS_430 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_431 = __VLS_asFunctionalComponent(__VLS_430, new __VLS_430({
    modelValue: (__VLS_ctx.stationDetailVisible),
    size: "62%",
    title: "站点详情",
}));
const __VLS_432 = __VLS_431({
    modelValue: (__VLS_ctx.stationDetailVisible),
    size: "62%",
    title: "站点详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_431));
__VLS_433.slots.default;
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
    const __VLS_434 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_435 = __VLS_asFunctionalComponent(__VLS_434, new __VLS_434({
        type: (__VLS_ctx.stationDetail.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }));
    const __VLS_436 = __VLS_435({
        type: (__VLS_ctx.stationDetail.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_435));
    __VLS_437.slots.default;
    (__VLS_ctx.stationDetail.status_name);
    var __VLS_437;
    const __VLS_438 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_439 = __VLS_asFunctionalComponent(__VLS_438, new __VLS_438({
        type: (__VLS_ctx.warningTagType(__VLS_ctx.selectedStationInventory.warning_level)),
        effect: "plain",
    }));
    const __VLS_440 = __VLS_439({
        type: (__VLS_ctx.warningTagType(__VLS_ctx.selectedStationInventory.warning_level)),
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_439));
    __VLS_441.slots.default;
    (__VLS_ctx.warningLabel(__VLS_ctx.selectedStationInventory.warning_level));
    var __VLS_441;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar-actions" },
    });
    if (__VLS_ctx.canEditStation) {
        const __VLS_442 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_443 = __VLS_asFunctionalComponent(__VLS_442, new __VLS_442({
            ...{ 'onClick': {} },
            type: "success",
            plain: true,
        }));
        const __VLS_444 = __VLS_443({
            ...{ 'onClick': {} },
            type: "success",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_443));
        let __VLS_446;
        let __VLS_447;
        let __VLS_448;
        const __VLS_449 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.stationDetail))
                    return;
                if (!(__VLS_ctx.canEditStation))
                    return;
                __VLS_ctx.openEditStation(__VLS_ctx.stationDetail);
            }
        };
        __VLS_445.slots.default;
        var __VLS_445;
    }
    const __VLS_450 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_451 = __VLS_asFunctionalComponent(__VLS_450, new __VLS_450({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }));
    const __VLS_452 = __VLS_451({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_451));
    let __VLS_454;
    let __VLS_455;
    let __VLS_456;
    const __VLS_457 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.stationDetail))
                return;
            __VLS_ctx.openInboundScanDialog(__VLS_ctx.stationDetail.id);
        }
    };
    __VLS_453.slots.default;
    var __VLS_453;
    const __VLS_458 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_459 = __VLS_asFunctionalComponent(__VLS_458, new __VLS_458({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }));
    const __VLS_460 = __VLS_459({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_459));
    let __VLS_462;
    let __VLS_463;
    let __VLS_464;
    const __VLS_465 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.stationDetail))
                return;
            __VLS_ctx.openCreateCheckDialog(__VLS_ctx.stationDetail.id);
        }
    };
    __VLS_461.slots.default;
    var __VLS_461;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar-actions" },
    });
    if (__VLS_ctx.canManageServiceArea) {
        const __VLS_466 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_467 = __VLS_asFunctionalComponent(__VLS_466, new __VLS_466({
            ...{ 'onClick': {} },
            type: "primary",
            plain: true,
        }));
        const __VLS_468 = __VLS_467({
            ...{ 'onClick': {} },
            type: "primary",
            plain: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_467));
        let __VLS_470;
        let __VLS_471;
        let __VLS_472;
        const __VLS_473 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.stationDetail))
                    return;
                if (!(__VLS_ctx.canManageServiceArea))
                    return;
                __VLS_ctx.openCreateServiceAreaDialog();
            }
        };
        __VLS_469.slots.default;
        var __VLS_469;
    }
    const __VLS_474 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_475 = __VLS_asFunctionalComponent(__VLS_474, new __VLS_474({
        data: (__VLS_ctx.stationServiceAreas),
        size: "small",
        stripe: true,
    }));
    const __VLS_476 = __VLS_475({
        data: (__VLS_ctx.stationServiceAreas),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_475));
    __VLS_477.slots.default;
    const __VLS_478 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_479 = __VLS_asFunctionalComponent(__VLS_478, new __VLS_478({
        label: "覆盖范围",
        minWidth: "260",
    }));
    const __VLS_480 = __VLS_479({
        label: "覆盖范围",
        minWidth: "260",
    }, ...__VLS_functionalComponentArgsRest(__VLS_479));
    __VLS_481.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_481.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.formatAddress(scope.row.country, scope.row.province, scope.row.city, scope.row.district));
    }
    var __VLS_481;
    const __VLS_482 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_483 = __VLS_asFunctionalComponent(__VLS_482, new __VLS_482({
        label: "层级",
        width: "100",
    }));
    const __VLS_484 = __VLS_483({
        label: "层级",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_483));
    __VLS_485.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_485.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_486 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_487 = __VLS_asFunctionalComponent(__VLS_486, new __VLS_486({
            effect: "plain",
        }));
        const __VLS_488 = __VLS_487({
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_487));
        __VLS_489.slots.default;
        (__VLS_ctx.serviceAreaScopeLabel(scope.row.scope_level));
        var __VLS_489;
    }
    var __VLS_485;
    const __VLS_490 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_491 = __VLS_asFunctionalComponent(__VLS_490, new __VLS_490({
        prop: "priority",
        label: "优先级",
        width: "100",
    }));
    const __VLS_492 = __VLS_491({
        prop: "priority",
        label: "优先级",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_491));
    const __VLS_494 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_495 = __VLS_asFunctionalComponent(__VLS_494, new __VLS_494({
        label: "状态",
        width: "100",
    }));
    const __VLS_496 = __VLS_495({
        label: "状态",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_495));
    __VLS_497.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_497.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_498 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_499 = __VLS_asFunctionalComponent(__VLS_498, new __VLS_498({
            type: (scope.row.status === 1 ? 'success' : 'info'),
            effect: "dark",
        }));
        const __VLS_500 = __VLS_499({
            type: (scope.row.status === 1 ? 'success' : 'info'),
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_499));
        __VLS_501.slots.default;
        (scope.row.status_name);
        var __VLS_501;
    }
    var __VLS_497;
    const __VLS_502 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_503 = __VLS_asFunctionalComponent(__VLS_502, new __VLS_502({
        prop: "remark",
        label: "备注",
        minWidth: "180",
    }));
    const __VLS_504 = __VLS_503({
        prop: "remark",
        label: "备注",
        minWidth: "180",
    }, ...__VLS_functionalComponentArgsRest(__VLS_503));
    if (__VLS_ctx.canManageServiceArea) {
        const __VLS_506 = {}.ElTableColumn;
        /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
        // @ts-ignore
        const __VLS_507 = __VLS_asFunctionalComponent(__VLS_506, new __VLS_506({
            label: "操作",
            fixed: "right",
            width: "160",
        }));
        const __VLS_508 = __VLS_507({
            label: "操作",
            fixed: "right",
            width: "160",
        }, ...__VLS_functionalComponentArgsRest(__VLS_507));
        __VLS_509.slots.default;
        {
            const { default: __VLS_thisSlot } = __VLS_509.slots;
            const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "station-actions" },
            });
            const __VLS_510 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_511 = __VLS_asFunctionalComponent(__VLS_510, new __VLS_510({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }));
            const __VLS_512 = __VLS_511({
                ...{ 'onClick': {} },
                link: true,
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_511));
            let __VLS_514;
            let __VLS_515;
            let __VLS_516;
            const __VLS_517 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.stationDetail))
                        return;
                    if (!(__VLS_ctx.canManageServiceArea))
                        return;
                    __VLS_ctx.openEditServiceAreaDialog(scope.row);
                }
            };
            __VLS_513.slots.default;
            var __VLS_513;
            const __VLS_518 = {}.ElButton;
            /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
            // @ts-ignore
            const __VLS_519 = __VLS_asFunctionalComponent(__VLS_518, new __VLS_518({
                ...{ 'onClick': {} },
                link: true,
                type: "danger",
            }));
            const __VLS_520 = __VLS_519({
                ...{ 'onClick': {} },
                link: true,
                type: "danger",
            }, ...__VLS_functionalComponentArgsRest(__VLS_519));
            let __VLS_522;
            let __VLS_523;
            let __VLS_524;
            const __VLS_525 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.stationDetail))
                        return;
                    if (!(__VLS_ctx.canManageServiceArea))
                        return;
                    __VLS_ctx.deleteServiceArea(scope.row);
                }
            };
            __VLS_521.slots.default;
            var __VLS_521;
        }
        var __VLS_509;
    }
    var __VLS_477;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail-card station-detail-card--full" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail-card__head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.stationFlows.length);
    const __VLS_526 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_527 = __VLS_asFunctionalComponent(__VLS_526, new __VLS_526({
        data: (__VLS_ctx.stationFlows),
        size: "small",
        stripe: true,
    }));
    const __VLS_528 = __VLS_527({
        data: (__VLS_ctx.stationFlows),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_527));
    __VLS_529.slots.default;
    const __VLS_530 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_531 = __VLS_asFunctionalComponent(__VLS_530, new __VLS_530({
        prop: "order_no",
        label: "订单号",
        minWidth: "170",
    }));
    const __VLS_532 = __VLS_531({
        prop: "order_no",
        label: "订单号",
        minWidth: "170",
    }, ...__VLS_functionalComponentArgsRest(__VLS_531));
    const __VLS_534 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_535 = __VLS_asFunctionalComponent(__VLS_534, new __VLS_534({
        label: "流转类型",
        width: "100",
    }));
    const __VLS_536 = __VLS_535({
        label: "流转类型",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_535));
    __VLS_537.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_537.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_538 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_539 = __VLS_asFunctionalComponent(__VLS_538, new __VLS_538({
            type: (scope.row.flow_type === 'in' ? 'success' : 'warning'),
            effect: "plain",
        }));
        const __VLS_540 = __VLS_539({
            type: (scope.row.flow_type === 'in' ? 'success' : 'warning'),
            effect: "plain",
        }, ...__VLS_functionalComponentArgsRest(__VLS_539));
        __VLS_541.slots.default;
        (scope.row.flow_type_name);
        var __VLS_541;
    }
    var __VLS_537;
    const __VLS_542 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_543 = __VLS_asFunctionalComponent(__VLS_542, new __VLS_542({
        label: "重量 / 体积",
        width: "140",
    }));
    const __VLS_544 = __VLS_543({
        label: "重量 / 体积",
        width: "140",
    }, ...__VLS_functionalComponentArgsRest(__VLS_543));
    __VLS_545.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_545.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (scope.row.weight);
        (scope.row.volume);
    }
    var __VLS_545;
    const __VLS_546 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_547 = __VLS_asFunctionalComponent(__VLS_546, new __VLS_546({
        prop: "next_station",
        label: "下一站点",
        minWidth: "160",
    }));
    const __VLS_548 = __VLS_547({
        prop: "next_station",
        label: "下一站点",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_547));
    const __VLS_550 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_551 = __VLS_asFunctionalComponent(__VLS_550, new __VLS_550({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }));
    const __VLS_552 = __VLS_551({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_551));
    const __VLS_554 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_555 = __VLS_asFunctionalComponent(__VLS_554, new __VLS_554({
        label: "时间",
        minWidth: "160",
    }));
    const __VLS_556 = __VLS_555({
        label: "时间",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_555));
    __VLS_557.slots.default;
    {
        const { default: __VLS_thisSlot } = __VLS_557.slots;
        const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
        (__VLS_ctx.formatUnix(scope.row.flow_time));
    }
    var __VLS_557;
    var __VLS_529;
}
var __VLS_433;
const __VLS_558 = {}.ElDrawer;
/** @type {[typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, typeof __VLS_components.ElDrawer, typeof __VLS_components.elDrawer, ]} */ ;
// @ts-ignore
const __VLS_559 = __VLS_asFunctionalComponent(__VLS_558, new __VLS_558({
    modelValue: (__VLS_ctx.checkDetailVisible),
    size: "58%",
    title: "盘点记录详情",
}));
const __VLS_560 = __VLS_559({
    modelValue: (__VLS_ctx.checkDetailVisible),
    size: "58%",
    title: "盘点记录详情",
}, ...__VLS_functionalComponentArgsRest(__VLS_559));
__VLS_561.slots.default;
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
    const __VLS_562 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_563 = __VLS_asFunctionalComponent(__VLS_562, new __VLS_562({
        type: (__VLS_ctx.checkDetail.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_564 = __VLS_563({
        type: (__VLS_ctx.checkDetail.status === 2 ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_563));
    __VLS_565.slots.default;
    (__VLS_ctx.checkDetail.status_name);
    var __VLS_565;
    const __VLS_566 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_567 = __VLS_asFunctionalComponent(__VLS_566, new __VLS_566({
        effect: "plain",
    }));
    const __VLS_568 = __VLS_567({
        effect: "plain",
    }, ...__VLS_functionalComponentArgsRest(__VLS_567));
    __VLS_569.slots.default;
    (__VLS_ctx.checkDetail.difference_count);
    var __VLS_569;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "station-detail__toolbar-actions" },
    });
    const __VLS_570 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_571 = __VLS_asFunctionalComponent(__VLS_570, new __VLS_570({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }));
    const __VLS_572 = __VLS_571({
        ...{ 'onClick': {} },
        type: "primary",
        plain: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_571));
    let __VLS_574;
    let __VLS_575;
    let __VLS_576;
    const __VLS_577 = {
        onClick: (...[$event]) => {
            if (!(__VLS_ctx.checkDetail))
                return;
            __VLS_ctx.printInventoryCheck();
        }
    };
    __VLS_573.slots.default;
    var __VLS_573;
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
    const __VLS_578 = {}.ElTable;
    /** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
    // @ts-ignore
    const __VLS_579 = __VLS_asFunctionalComponent(__VLS_578, new __VLS_578({
        data: (__VLS_ctx.checkDetail.details),
        size: "small",
        stripe: true,
    }));
    const __VLS_580 = __VLS_579({
        data: (__VLS_ctx.checkDetail.details),
        size: "small",
        stripe: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_579));
    __VLS_581.slots.default;
    const __VLS_582 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_583 = __VLS_asFunctionalComponent(__VLS_582, new __VLS_582({
        prop: "order_no",
        label: "订单号",
        minWidth: "180",
    }));
    const __VLS_584 = __VLS_583({
        prop: "order_no",
        label: "订单号",
        minWidth: "180",
    }, ...__VLS_functionalComponentArgsRest(__VLS_583));
    const __VLS_586 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_587 = __VLS_asFunctionalComponent(__VLS_586, new __VLS_586({
        prop: "status_name",
        label: "订单状态",
        width: "120",
    }));
    const __VLS_588 = __VLS_587({
        prop: "status_name",
        label: "订单状态",
        width: "120",
    }, ...__VLS_functionalComponentArgsRest(__VLS_587));
    const __VLS_590 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_591 = __VLS_asFunctionalComponent(__VLS_590, new __VLS_590({
        prop: "is_found_name",
        label: "是否找到",
        width: "100",
    }));
    const __VLS_592 = __VLS_591({
        prop: "is_found_name",
        label: "是否找到",
        width: "100",
    }, ...__VLS_functionalComponentArgsRest(__VLS_591));
    const __VLS_594 = {}.ElTableColumn;
    /** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
    // @ts-ignore
    const __VLS_595 = __VLS_asFunctionalComponent(__VLS_594, new __VLS_594({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }));
    const __VLS_596 = __VLS_595({
        prop: "remark",
        label: "备注",
        minWidth: "160",
    }, ...__VLS_functionalComponentArgsRest(__VLS_595));
    var __VLS_581;
}
var __VLS_561;
const __VLS_598 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_599 = __VLS_asFunctionalComponent(__VLS_598, new __VLS_598({
    modelValue: (__VLS_ctx.createCheckVisible),
    title: "新建库存盘点",
    width: "460px",
}));
const __VLS_600 = __VLS_599({
    modelValue: (__VLS_ctx.createCheckVisible),
    title: "新建库存盘点",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_599));
__VLS_601.slots.default;
const __VLS_602 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_603 = __VLS_asFunctionalComponent(__VLS_602, new __VLS_602({
    ref: "createCheckFormRef",
    model: (__VLS_ctx.createCheckForm),
    rules: (__VLS_ctx.createCheckRules),
    labelPosition: "top",
}));
const __VLS_604 = __VLS_603({
    ref: "createCheckFormRef",
    model: (__VLS_ctx.createCheckForm),
    rules: (__VLS_ctx.createCheckRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_603));
/** @type {typeof __VLS_ctx.createCheckFormRef} */ ;
var __VLS_606 = {};
__VLS_605.slots.default;
const __VLS_608 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_609 = __VLS_asFunctionalComponent(__VLS_608, new __VLS_608({
    label: "盘点站点",
    prop: "station_id",
}));
const __VLS_610 = __VLS_609({
    label: "盘点站点",
    prop: "station_id",
}, ...__VLS_functionalComponentArgsRest(__VLS_609));
__VLS_611.slots.default;
const __VLS_612 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_613 = __VLS_asFunctionalComponent(__VLS_612, new __VLS_612({
    modelValue: (__VLS_ctx.createCheckForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_614 = __VLS_613({
    modelValue: (__VLS_ctx.createCheckForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_613));
__VLS_615.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_616 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_617 = __VLS_asFunctionalComponent(__VLS_616, new __VLS_616({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_618 = __VLS_617({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_617));
}
var __VLS_615;
var __VLS_611;
const __VLS_620 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_621 = __VLS_asFunctionalComponent(__VLS_620, new __VLS_620({
    label: "盘点类型",
    prop: "check_type",
}));
const __VLS_622 = __VLS_621({
    label: "盘点类型",
    prop: "check_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_621));
__VLS_623.slots.default;
const __VLS_624 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_625 = __VLS_asFunctionalComponent(__VLS_624, new __VLS_624({
    modelValue: (__VLS_ctx.createCheckForm.check_type),
}));
const __VLS_626 = __VLS_625({
    modelValue: (__VLS_ctx.createCheckForm.check_type),
}, ...__VLS_functionalComponentArgsRest(__VLS_625));
__VLS_627.slots.default;
const __VLS_628 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_629 = __VLS_asFunctionalComponent(__VLS_628, new __VLS_628({
    label: "full",
}));
const __VLS_630 = __VLS_629({
    label: "full",
}, ...__VLS_functionalComponentArgsRest(__VLS_629));
__VLS_631.slots.default;
var __VLS_631;
const __VLS_632 = {}.ElRadioButton;
/** @type {[typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, typeof __VLS_components.ElRadioButton, typeof __VLS_components.elRadioButton, ]} */ ;
// @ts-ignore
const __VLS_633 = __VLS_asFunctionalComponent(__VLS_632, new __VLS_632({
    label: "spot",
}));
const __VLS_634 = __VLS_633({
    label: "spot",
}, ...__VLS_functionalComponentArgsRest(__VLS_633));
__VLS_635.slots.default;
var __VLS_635;
var __VLS_627;
var __VLS_623;
const __VLS_636 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_637 = __VLS_asFunctionalComponent(__VLS_636, new __VLS_636({
    label: "备注",
}));
const __VLS_638 = __VLS_637({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_637));
__VLS_639.slots.default;
const __VLS_640 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_641 = __VLS_asFunctionalComponent(__VLS_640, new __VLS_640({
    modelValue: (__VLS_ctx.createCheckForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写盘点说明",
}));
const __VLS_642 = __VLS_641({
    modelValue: (__VLS_ctx.createCheckForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写盘点说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_641));
var __VLS_639;
var __VLS_605;
{
    const { footer: __VLS_thisSlot } = __VLS_601.slots;
    const __VLS_644 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_645 = __VLS_asFunctionalComponent(__VLS_644, new __VLS_644({
        ...{ 'onClick': {} },
    }));
    const __VLS_646 = __VLS_645({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_645));
    let __VLS_648;
    let __VLS_649;
    let __VLS_650;
    const __VLS_651 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createCheckVisible = false;
        }
    };
    __VLS_647.slots.default;
    var __VLS_647;
    const __VLS_652 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_653 = __VLS_asFunctionalComponent(__VLS_652, new __VLS_652({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createCheckSubmitting),
    }));
    const __VLS_654 = __VLS_653({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createCheckSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_653));
    let __VLS_656;
    let __VLS_657;
    let __VLS_658;
    const __VLS_659 = {
        onClick: (__VLS_ctx.submitCreateCheck)
    };
    __VLS_655.slots.default;
    var __VLS_655;
}
var __VLS_601;
const __VLS_660 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_661 = __VLS_asFunctionalComponent(__VLS_660, new __VLS_660({
    modelValue: (__VLS_ctx.inboundScanVisible),
    title: "站点入库扫描",
    width: "460px",
}));
const __VLS_662 = __VLS_661({
    modelValue: (__VLS_ctx.inboundScanVisible),
    title: "站点入库扫描",
    width: "460px",
}, ...__VLS_functionalComponentArgsRest(__VLS_661));
__VLS_663.slots.default;
const __VLS_664 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_665 = __VLS_asFunctionalComponent(__VLS_664, new __VLS_664({
    labelPosition: "top",
}));
const __VLS_666 = __VLS_665({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_665));
__VLS_667.slots.default;
const __VLS_668 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_669 = __VLS_asFunctionalComponent(__VLS_668, new __VLS_668({
    label: "入库站点",
    required: true,
}));
const __VLS_670 = __VLS_669({
    label: "入库站点",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_669));
__VLS_671.slots.default;
const __VLS_672 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_673 = __VLS_asFunctionalComponent(__VLS_672, new __VLS_672({
    modelValue: (__VLS_ctx.inboundScanForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}));
const __VLS_674 = __VLS_673({
    modelValue: (__VLS_ctx.inboundScanForm.station_id),
    placeholder: "请选择站点",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_673));
__VLS_675.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationOptions))) {
    const __VLS_676 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_677 = __VLS_asFunctionalComponent(__VLS_676, new __VLS_676({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }));
    const __VLS_678 = __VLS_677({
        key: (item.id),
        label: (__VLS_ctx.normalizeText(item.name, item.station_code)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_677));
}
var __VLS_675;
var __VLS_671;
const __VLS_680 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_681 = __VLS_asFunctionalComponent(__VLS_680, new __VLS_680({
    label: "扫描码 / 订单号",
    required: true,
}));
const __VLS_682 = __VLS_681({
    label: "扫描码 / 订单号",
    required: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_681));
__VLS_683.slots.default;
const __VLS_684 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_685 = __VLS_asFunctionalComponent(__VLS_684, new __VLS_684({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.inboundScanForm.scan_code),
    placeholder: "请输入订单号或包裹号",
}));
const __VLS_686 = __VLS_685({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.inboundScanForm.scan_code),
    placeholder: "请输入订单号或包裹号",
}, ...__VLS_functionalComponentArgsRest(__VLS_685));
let __VLS_688;
let __VLS_689;
let __VLS_690;
const __VLS_691 = {
    onKeyup: (__VLS_ctx.submitInboundScan)
};
var __VLS_687;
var __VLS_683;
const __VLS_692 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_693 = __VLS_asFunctionalComponent(__VLS_692, new __VLS_692({
    label: "重量",
}));
const __VLS_694 = __VLS_693({
    label: "重量",
}, ...__VLS_functionalComponentArgsRest(__VLS_693));
__VLS_695.slots.default;
const __VLS_696 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_697 = __VLS_asFunctionalComponent(__VLS_696, new __VLS_696({
    modelValue: (__VLS_ctx.inboundScanForm.weight),
    min: (0),
    precision: (2),
    step: (0.1),
    ...{ style: {} },
}));
const __VLS_698 = __VLS_697({
    modelValue: (__VLS_ctx.inboundScanForm.weight),
    min: (0),
    precision: (2),
    step: (0.1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_697));
var __VLS_695;
const __VLS_700 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_701 = __VLS_asFunctionalComponent(__VLS_700, new __VLS_700({
    label: "体积",
}));
const __VLS_702 = __VLS_701({
    label: "体积",
}, ...__VLS_functionalComponentArgsRest(__VLS_701));
__VLS_703.slots.default;
const __VLS_704 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_705 = __VLS_asFunctionalComponent(__VLS_704, new __VLS_704({
    modelValue: (__VLS_ctx.inboundScanForm.volume),
    min: (0),
    precision: (2),
    step: (0.1),
    ...{ style: {} },
}));
const __VLS_706 = __VLS_705({
    modelValue: (__VLS_ctx.inboundScanForm.volume),
    min: (0),
    precision: (2),
    step: (0.1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_705));
var __VLS_703;
const __VLS_708 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_709 = __VLS_asFunctionalComponent(__VLS_708, new __VLS_708({
    label: "备注",
}));
const __VLS_710 = __VLS_709({
    label: "备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_709));
__VLS_711.slots.default;
const __VLS_712 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_713 = __VLS_asFunctionalComponent(__VLS_712, new __VLS_712({
    modelValue: (__VLS_ctx.inboundScanForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写入库说明",
}));
const __VLS_714 = __VLS_713({
    modelValue: (__VLS_ctx.inboundScanForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写入库说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_713));
var __VLS_711;
var __VLS_667;
{
    const { footer: __VLS_thisSlot } = __VLS_663.slots;
    const __VLS_716 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_717 = __VLS_asFunctionalComponent(__VLS_716, new __VLS_716({
        ...{ 'onClick': {} },
    }));
    const __VLS_718 = __VLS_717({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_717));
    let __VLS_720;
    let __VLS_721;
    let __VLS_722;
    const __VLS_723 = {
        onClick: (...[$event]) => {
            __VLS_ctx.inboundScanVisible = false;
        }
    };
    __VLS_719.slots.default;
    var __VLS_719;
    const __VLS_724 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_725 = __VLS_asFunctionalComponent(__VLS_724, new __VLS_724({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.inboundScanSubmitting),
    }));
    const __VLS_726 = __VLS_725({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.inboundScanSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_725));
    let __VLS_728;
    let __VLS_729;
    let __VLS_730;
    const __VLS_731 = {
        onClick: (__VLS_ctx.submitInboundScan)
    };
    __VLS_727.slots.default;
    var __VLS_727;
}
var __VLS_663;
const __VLS_732 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_733 = __VLS_asFunctionalComponent(__VLS_732, new __VLS_732({
    modelValue: (__VLS_ctx.serviceAreaDialogVisible),
    title: (__VLS_ctx.serviceAreaDialogMode === 'create' ? '新增服务范围' : '编辑服务范围'),
    width: "620px",
}));
const __VLS_734 = __VLS_733({
    modelValue: (__VLS_ctx.serviceAreaDialogVisible),
    title: (__VLS_ctx.serviceAreaDialogMode === 'create' ? '新增服务范围' : '编辑服务范围'),
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_733));
__VLS_735.slots.default;
const __VLS_736 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_737 = __VLS_asFunctionalComponent(__VLS_736, new __VLS_736({
    labelPosition: "top",
}));
const __VLS_738 = __VLS_737({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_737));
__VLS_739.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-edit-grid" },
});
const __VLS_740 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_741 = __VLS_asFunctionalComponent(__VLS_740, new __VLS_740({
    label: "国家",
    ...{ class: "station-edit-grid__wide" },
}));
const __VLS_742 = __VLS_741({
    label: "国家",
    ...{ class: "station-edit-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_741));
__VLS_743.slots.default;
const __VLS_744 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_745 = __VLS_asFunctionalComponent(__VLS_744, new __VLS_744({
    modelValue: (__VLS_ctx.serviceAreaForm.country),
    placeholder: "请输入国家，如：中国",
}));
const __VLS_746 = __VLS_745({
    modelValue: (__VLS_ctx.serviceAreaForm.country),
    placeholder: "请输入国家，如：中国",
}, ...__VLS_functionalComponentArgsRest(__VLS_745));
var __VLS_743;
const __VLS_748 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_749 = __VLS_asFunctionalComponent(__VLS_748, new __VLS_748({
    label: "省份",
}));
const __VLS_750 = __VLS_749({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_749));
__VLS_751.slots.default;
const __VLS_752 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_753 = __VLS_asFunctionalComponent(__VLS_752, new __VLS_752({
    modelValue: (__VLS_ctx.serviceAreaForm.province),
    placeholder: "可选，省级覆盖",
}));
const __VLS_754 = __VLS_753({
    modelValue: (__VLS_ctx.serviceAreaForm.province),
    placeholder: "可选，省级覆盖",
}, ...__VLS_functionalComponentArgsRest(__VLS_753));
var __VLS_751;
const __VLS_756 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_757 = __VLS_asFunctionalComponent(__VLS_756, new __VLS_756({
    label: "城市",
}));
const __VLS_758 = __VLS_757({
    label: "城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_757));
__VLS_759.slots.default;
const __VLS_760 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_761 = __VLS_asFunctionalComponent(__VLS_760, new __VLS_760({
    modelValue: (__VLS_ctx.serviceAreaForm.city),
    placeholder: "可选，市级覆盖",
}));
const __VLS_762 = __VLS_761({
    modelValue: (__VLS_ctx.serviceAreaForm.city),
    placeholder: "可选，市级覆盖",
}, ...__VLS_functionalComponentArgsRest(__VLS_761));
var __VLS_759;
const __VLS_764 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_765 = __VLS_asFunctionalComponent(__VLS_764, new __VLS_764({
    label: "区县",
}));
const __VLS_766 = __VLS_765({
    label: "区县",
}, ...__VLS_functionalComponentArgsRest(__VLS_765));
__VLS_767.slots.default;
const __VLS_768 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_769 = __VLS_asFunctionalComponent(__VLS_768, new __VLS_768({
    modelValue: (__VLS_ctx.serviceAreaForm.district),
    placeholder: "可选，区县级覆盖",
}));
const __VLS_770 = __VLS_769({
    modelValue: (__VLS_ctx.serviceAreaForm.district),
    placeholder: "可选，区县级覆盖",
}, ...__VLS_functionalComponentArgsRest(__VLS_769));
var __VLS_767;
const __VLS_772 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_773 = __VLS_asFunctionalComponent(__VLS_772, new __VLS_772({
    label: "优先级",
}));
const __VLS_774 = __VLS_773({
    label: "优先级",
}, ...__VLS_functionalComponentArgsRest(__VLS_773));
__VLS_775.slots.default;
const __VLS_776 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_777 = __VLS_asFunctionalComponent(__VLS_776, new __VLS_776({
    modelValue: (__VLS_ctx.serviceAreaForm.priority),
    min: (1),
    max: (10000),
    step: (10),
    ...{ style: {} },
}));
const __VLS_778 = __VLS_777({
    modelValue: (__VLS_ctx.serviceAreaForm.priority),
    min: (1),
    max: (10000),
    step: (10),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_777));
var __VLS_775;
const __VLS_780 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_781 = __VLS_asFunctionalComponent(__VLS_780, new __VLS_780({
    label: "状态",
}));
const __VLS_782 = __VLS_781({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_781));
__VLS_783.slots.default;
const __VLS_784 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_785 = __VLS_asFunctionalComponent(__VLS_784, new __VLS_784({
    modelValue: (__VLS_ctx.serviceAreaForm.status),
}));
const __VLS_786 = __VLS_785({
    modelValue: (__VLS_ctx.serviceAreaForm.status),
}, ...__VLS_functionalComponentArgsRest(__VLS_785));
__VLS_787.slots.default;
const __VLS_788 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_789 = __VLS_asFunctionalComponent(__VLS_788, new __VLS_788({
    value: (1),
}));
const __VLS_790 = __VLS_789({
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_789));
__VLS_791.slots.default;
var __VLS_791;
const __VLS_792 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_793 = __VLS_asFunctionalComponent(__VLS_792, new __VLS_792({
    value: (0),
}));
const __VLS_794 = __VLS_793({
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_793));
__VLS_795.slots.default;
var __VLS_795;
var __VLS_787;
var __VLS_783;
const __VLS_796 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_797 = __VLS_asFunctionalComponent(__VLS_796, new __VLS_796({
    label: "备注",
    ...{ class: "station-edit-grid__wide" },
}));
const __VLS_798 = __VLS_797({
    label: "备注",
    ...{ class: "station-edit-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_797));
__VLS_799.slots.default;
const __VLS_800 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_801 = __VLS_asFunctionalComponent(__VLS_800, new __VLS_800({
    modelValue: (__VLS_ctx.serviceAreaForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写覆盖说明",
}));
const __VLS_802 = __VLS_801({
    modelValue: (__VLS_ctx.serviceAreaForm.remark),
    type: "textarea",
    rows: (3),
    maxlength: "300",
    showWordLimit: true,
    placeholder: "可选，填写覆盖说明",
}, ...__VLS_functionalComponentArgsRest(__VLS_801));
var __VLS_799;
var __VLS_739;
{
    const { footer: __VLS_thisSlot } = __VLS_735.slots;
    const __VLS_804 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_805 = __VLS_asFunctionalComponent(__VLS_804, new __VLS_804({
        ...{ 'onClick': {} },
    }));
    const __VLS_806 = __VLS_805({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_805));
    let __VLS_808;
    let __VLS_809;
    let __VLS_810;
    const __VLS_811 = {
        onClick: (...[$event]) => {
            __VLS_ctx.serviceAreaDialogVisible = false;
        }
    };
    __VLS_807.slots.default;
    var __VLS_807;
    const __VLS_812 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_813 = __VLS_asFunctionalComponent(__VLS_812, new __VLS_812({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.serviceAreaSubmitting),
    }));
    const __VLS_814 = __VLS_813({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.serviceAreaSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_813));
    let __VLS_816;
    let __VLS_817;
    let __VLS_818;
    const __VLS_819 = {
        onClick: (__VLS_ctx.submitServiceArea)
    };
    __VLS_815.slots.default;
    (__VLS_ctx.serviceAreaDialogMode === 'create' ? '创建范围' : '保存修改');
    var __VLS_815;
}
var __VLS_735;
const __VLS_820 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_821 = __VLS_asFunctionalComponent(__VLS_820, new __VLS_820({
    modelValue: (__VLS_ctx.editStationVisible),
    title: (__VLS_ctx.editStationMode === 'create' ? '新建站点' : '编辑站点'),
    width: "720px",
}));
const __VLS_822 = __VLS_821({
    modelValue: (__VLS_ctx.editStationVisible),
    title: (__VLS_ctx.editStationMode === 'create' ? '新建站点' : '编辑站点'),
    width: "720px",
}, ...__VLS_functionalComponentArgsRest(__VLS_821));
__VLS_823.slots.default;
const __VLS_824 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_825 = __VLS_asFunctionalComponent(__VLS_824, new __VLS_824({
    ref: "editStationFormRef",
    model: (__VLS_ctx.editStationForm),
    rules: (__VLS_ctx.editStationRules),
    labelPosition: "top",
}));
const __VLS_826 = __VLS_825({
    ref: "editStationFormRef",
    model: (__VLS_ctx.editStationForm),
    rules: (__VLS_ctx.editStationRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_825));
/** @type {typeof __VLS_ctx.editStationFormRef} */ ;
var __VLS_828 = {};
__VLS_827.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "station-edit-grid" },
});
if (__VLS_ctx.editStationMode === 'create') {
    const __VLS_830 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_831 = __VLS_asFunctionalComponent(__VLS_830, new __VLS_830({
        label: "站点编码",
        prop: "station_code",
    }));
    const __VLS_832 = __VLS_831({
        label: "站点编码",
        prop: "station_code",
    }, ...__VLS_functionalComponentArgsRest(__VLS_831));
    __VLS_833.slots.default;
    const __VLS_834 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_835 = __VLS_asFunctionalComponent(__VLS_834, new __VLS_834({
        modelValue: (__VLS_ctx.editStationForm.station_code),
        placeholder: "请输入站点编码，如 SHA-TR-01",
    }));
    const __VLS_836 = __VLS_835({
        modelValue: (__VLS_ctx.editStationForm.station_code),
        placeholder: "请输入站点编码，如 SHA-TR-01",
    }, ...__VLS_functionalComponentArgsRest(__VLS_835));
    var __VLS_833;
}
const __VLS_838 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_839 = __VLS_asFunctionalComponent(__VLS_838, new __VLS_838({
    label: "站点名称",
    prop: "name",
}));
const __VLS_840 = __VLS_839({
    label: "站点名称",
    prop: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_839));
__VLS_841.slots.default;
const __VLS_842 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_843 = __VLS_asFunctionalComponent(__VLS_842, new __VLS_842({
    modelValue: (__VLS_ctx.editStationForm.name),
    placeholder: "请输入站点名称",
}));
const __VLS_844 = __VLS_843({
    modelValue: (__VLS_ctx.editStationForm.name),
    placeholder: "请输入站点名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_843));
var __VLS_841;
const __VLS_846 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_847 = __VLS_asFunctionalComponent(__VLS_846, new __VLS_846({
    label: "站点类型",
    prop: "type",
}));
const __VLS_848 = __VLS_847({
    label: "站点类型",
    prop: "type",
}, ...__VLS_functionalComponentArgsRest(__VLS_847));
__VLS_849.slots.default;
const __VLS_850 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_851 = __VLS_asFunctionalComponent(__VLS_850, new __VLS_850({
    modelValue: (__VLS_ctx.editStationForm.type),
    placeholder: "请选择站点类型",
    ...{ style: {} },
}));
const __VLS_852 = __VLS_851({
    modelValue: (__VLS_ctx.editStationForm.type),
    placeholder: "请选择站点类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_851));
__VLS_853.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.stationTypeOptions))) {
    const __VLS_854 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_855 = __VLS_asFunctionalComponent(__VLS_854, new __VLS_854({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_856 = __VLS_855({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_855));
}
var __VLS_853;
var __VLS_849;
const __VLS_858 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_859 = __VLS_asFunctionalComponent(__VLS_858, new __VLS_858({
    label: "国家",
    prop: "country",
}));
const __VLS_860 = __VLS_859({
    label: "国家",
    prop: "country",
}, ...__VLS_functionalComponentArgsRest(__VLS_859));
__VLS_861.slots.default;
const __VLS_862 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_863 = __VLS_asFunctionalComponent(__VLS_862, new __VLS_862({
    modelValue: (__VLS_ctx.editStationForm.country),
    placeholder: "请输入国家",
}));
const __VLS_864 = __VLS_863({
    modelValue: (__VLS_ctx.editStationForm.country),
    placeholder: "请输入国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_863));
var __VLS_861;
const __VLS_866 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_867 = __VLS_asFunctionalComponent(__VLS_866, new __VLS_866({
    label: "省份",
}));
const __VLS_868 = __VLS_867({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_867));
__VLS_869.slots.default;
const __VLS_870 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_871 = __VLS_asFunctionalComponent(__VLS_870, new __VLS_870({
    modelValue: (__VLS_ctx.editStationForm.province),
    placeholder: "请输入省份",
}));
const __VLS_872 = __VLS_871({
    modelValue: (__VLS_ctx.editStationForm.province),
    placeholder: "请输入省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_871));
var __VLS_869;
const __VLS_874 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_875 = __VLS_asFunctionalComponent(__VLS_874, new __VLS_874({
    label: "城市",
    prop: "city",
}));
const __VLS_876 = __VLS_875({
    label: "城市",
    prop: "city",
}, ...__VLS_functionalComponentArgsRest(__VLS_875));
__VLS_877.slots.default;
const __VLS_878 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_879 = __VLS_asFunctionalComponent(__VLS_878, new __VLS_878({
    modelValue: (__VLS_ctx.editStationForm.city),
    placeholder: "请输入城市",
}));
const __VLS_880 = __VLS_879({
    modelValue: (__VLS_ctx.editStationForm.city),
    placeholder: "请输入城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_879));
var __VLS_877;
const __VLS_882 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_883 = __VLS_asFunctionalComponent(__VLS_882, new __VLS_882({
    label: "容量",
    prop: "capacity",
}));
const __VLS_884 = __VLS_883({
    label: "容量",
    prop: "capacity",
}, ...__VLS_functionalComponentArgsRest(__VLS_883));
__VLS_885.slots.default;
const __VLS_886 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_887 = __VLS_asFunctionalComponent(__VLS_886, new __VLS_886({
    modelValue: (__VLS_ctx.editStationForm.capacity),
    min: (1),
    step: (100),
    ...{ style: {} },
}));
const __VLS_888 = __VLS_887({
    modelValue: (__VLS_ctx.editStationForm.capacity),
    min: (1),
    step: (100),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_887));
var __VLS_885;
const __VLS_890 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_891 = __VLS_asFunctionalComponent(__VLS_890, new __VLS_890({
    label: "详细地址",
    prop: "address",
    ...{ class: "station-edit-grid__wide" },
}));
const __VLS_892 = __VLS_891({
    label: "详细地址",
    prop: "address",
    ...{ class: "station-edit-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_891));
__VLS_893.slots.default;
const __VLS_894 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_895 = __VLS_asFunctionalComponent(__VLS_894, new __VLS_894({
    modelValue: (__VLS_ctx.editStationForm.address),
    placeholder: "请输入详细地址",
}));
const __VLS_896 = __VLS_895({
    modelValue: (__VLS_ctx.editStationForm.address),
    placeholder: "请输入详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_895));
var __VLS_893;
const __VLS_898 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_899 = __VLS_asFunctionalComponent(__VLS_898, new __VLS_898({
    label: "纬度",
}));
const __VLS_900 = __VLS_899({
    label: "纬度",
}, ...__VLS_functionalComponentArgsRest(__VLS_899));
__VLS_901.slots.default;
const __VLS_902 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_903 = __VLS_asFunctionalComponent(__VLS_902, new __VLS_902({
    modelValue: (__VLS_ctx.editStationForm.latitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}));
const __VLS_904 = __VLS_903({
    modelValue: (__VLS_ctx.editStationForm.latitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_903));
var __VLS_901;
const __VLS_906 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_907 = __VLS_asFunctionalComponent(__VLS_906, new __VLS_906({
    label: "经度",
}));
const __VLS_908 = __VLS_907({
    label: "经度",
}, ...__VLS_functionalComponentArgsRest(__VLS_907));
__VLS_909.slots.default;
const __VLS_910 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_911 = __VLS_asFunctionalComponent(__VLS_910, new __VLS_910({
    modelValue: (__VLS_ctx.editStationForm.longitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}));
const __VLS_912 = __VLS_911({
    modelValue: (__VLS_ctx.editStationForm.longitude),
    step: (0.0001),
    precision: (4),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_911));
var __VLS_909;
const __VLS_914 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_915 = __VLS_asFunctionalComponent(__VLS_914, new __VLS_914({
    label: "联系人",
}));
const __VLS_916 = __VLS_915({
    label: "联系人",
}, ...__VLS_functionalComponentArgsRest(__VLS_915));
__VLS_917.slots.default;
const __VLS_918 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_919 = __VLS_asFunctionalComponent(__VLS_918, new __VLS_918({
    modelValue: (__VLS_ctx.editStationForm.contact_name),
    placeholder: "请输入联系人",
}));
const __VLS_920 = __VLS_919({
    modelValue: (__VLS_ctx.editStationForm.contact_name),
    placeholder: "请输入联系人",
}, ...__VLS_functionalComponentArgsRest(__VLS_919));
var __VLS_917;
const __VLS_922 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_923 = __VLS_asFunctionalComponent(__VLS_922, new __VLS_922({
    label: "联系电话",
}));
const __VLS_924 = __VLS_923({
    label: "联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_923));
__VLS_925.slots.default;
const __VLS_926 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_927 = __VLS_asFunctionalComponent(__VLS_926, new __VLS_926({
    modelValue: (__VLS_ctx.editStationForm.contact_phone),
    placeholder: "请输入联系电话",
}));
const __VLS_928 = __VLS_927({
    modelValue: (__VLS_ctx.editStationForm.contact_phone),
    placeholder: "请输入联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_927));
var __VLS_925;
const __VLS_930 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_931 = __VLS_asFunctionalComponent(__VLS_930, new __VLS_930({
    label: "工作时间",
}));
const __VLS_932 = __VLS_931({
    label: "工作时间",
}, ...__VLS_functionalComponentArgsRest(__VLS_931));
__VLS_933.slots.default;
const __VLS_934 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_935 = __VLS_asFunctionalComponent(__VLS_934, new __VLS_934({
    modelValue: (__VLS_ctx.editStationForm.working_hours),
    placeholder: "如：09:00-18:00",
}));
const __VLS_936 = __VLS_935({
    modelValue: (__VLS_ctx.editStationForm.working_hours),
    placeholder: "如：09:00-18:00",
}, ...__VLS_functionalComponentArgsRest(__VLS_935));
var __VLS_933;
const __VLS_938 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_939 = __VLS_asFunctionalComponent(__VLS_938, new __VLS_938({
    label: "状态",
    prop: "status",
}));
const __VLS_940 = __VLS_939({
    label: "状态",
    prop: "status",
}, ...__VLS_functionalComponentArgsRest(__VLS_939));
__VLS_941.slots.default;
const __VLS_942 = {}.ElRadioGroup;
/** @type {[typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, typeof __VLS_components.ElRadioGroup, typeof __VLS_components.elRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_943 = __VLS_asFunctionalComponent(__VLS_942, new __VLS_942({
    modelValue: (__VLS_ctx.editStationForm.status),
}));
const __VLS_944 = __VLS_943({
    modelValue: (__VLS_ctx.editStationForm.status),
}, ...__VLS_functionalComponentArgsRest(__VLS_943));
__VLS_945.slots.default;
const __VLS_946 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_947 = __VLS_asFunctionalComponent(__VLS_946, new __VLS_946({
    value: (1),
}));
const __VLS_948 = __VLS_947({
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_947));
__VLS_949.slots.default;
var __VLS_949;
const __VLS_950 = {}.ElRadio;
/** @type {[typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, typeof __VLS_components.ElRadio, typeof __VLS_components.elRadio, ]} */ ;
// @ts-ignore
const __VLS_951 = __VLS_asFunctionalComponent(__VLS_950, new __VLS_950({
    value: (0),
}));
const __VLS_952 = __VLS_951({
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_951));
__VLS_953.slots.default;
var __VLS_953;
var __VLS_945;
var __VLS_941;
const __VLS_954 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_955 = __VLS_asFunctionalComponent(__VLS_954, new __VLS_954({
    label: "备注",
    ...{ class: "station-edit-grid__wide" },
}));
const __VLS_956 = __VLS_955({
    label: "备注",
    ...{ class: "station-edit-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_955));
__VLS_957.slots.default;
const __VLS_958 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_959 = __VLS_asFunctionalComponent(__VLS_958, new __VLS_958({
    modelValue: (__VLS_ctx.editStationForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写站点备注",
}));
const __VLS_960 = __VLS_959({
    modelValue: (__VLS_ctx.editStationForm.remark),
    type: "textarea",
    rows: (4),
    maxlength: "200",
    showWordLimit: true,
    placeholder: "可选，填写站点备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_959));
var __VLS_957;
var __VLS_827;
{
    const { footer: __VLS_thisSlot } = __VLS_823.slots;
    const __VLS_962 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_963 = __VLS_asFunctionalComponent(__VLS_962, new __VLS_962({
        ...{ 'onClick': {} },
    }));
    const __VLS_964 = __VLS_963({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_963));
    let __VLS_966;
    let __VLS_967;
    let __VLS_968;
    const __VLS_969 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editStationVisible = false;
        }
    };
    __VLS_965.slots.default;
    var __VLS_965;
    const __VLS_970 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_971 = __VLS_asFunctionalComponent(__VLS_970, new __VLS_970({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editStationSubmitting),
    }));
    const __VLS_972 = __VLS_971({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editStationSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_971));
    let __VLS_974;
    let __VLS_975;
    let __VLS_976;
    const __VLS_977 = {
        onClick: (__VLS_ctx.submitEditStation)
    };
    __VLS_973.slots.default;
    (__VLS_ctx.editStationMode === 'create' ? '创建站点' : '保存修改');
    var __VLS_973;
}
var __VLS_823;
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
/** @type {__VLS_StyleScopedClasses['station-detail__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['station-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card__head']} */ ;
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
/** @type {__VLS_StyleScopedClasses['station-detail-card--full']} */ ;
/** @type {__VLS_StyleScopedClasses['station-detail-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['station-edit-grid__wide']} */ ;
// @ts-ignore
var __VLS_607 = __VLS_606, __VLS_829 = __VLS_828;
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
            inboundScanSubmitting: inboundScanSubmitting,
            stationOptions: stationOptions,
            warnings: warnings,
            stats: stats,
            checks: checks,
            stationDetail: stationDetail,
            stationFlows: stationFlows,
            stationServiceAreas: stationServiceAreas,
            checkDetail: checkDetail,
            stationDetailVisible: stationDetailVisible,
            checkDetailVisible: checkDetailVisible,
            createCheckVisible: createCheckVisible,
            inboundScanVisible: inboundScanVisible,
            serviceAreaDialogVisible: serviceAreaDialogVisible,
            editStationVisible: editStationVisible,
            stationPagination: stationPagination,
            checkPagination: checkPagination,
            stationFilters: stationFilters,
            checkFilters: checkFilters,
            createCheckFormRef: createCheckFormRef,
            editStationFormRef: editStationFormRef,
            createCheckForm: createCheckForm,
            inboundScanForm: inboundScanForm,
            editStationMode: editStationMode,
            editStationSubmitting: editStationSubmitting,
            serviceAreaDialogMode: serviceAreaDialogMode,
            serviceAreaSubmitting: serviceAreaSubmitting,
            editStationForm: editStationForm,
            serviceAreaForm: serviceAreaForm,
            createCheckRules: createCheckRules,
            editStationRules: editStationRules,
            stationRows: stationRows,
            selectedStationInventory: selectedStationInventory,
            selectedStationWarning: selectedStationWarning,
            filteredWarnings: filteredWarnings,
            sortedCapacityDistribution: sortedCapacityDistribution,
            topBusyStations: topBusyStations,
            canEditStation: canEditStation,
            canManageServiceArea: canManageServiceArea,
            normalizeText: normalizeText,
            formatUnix: formatUnix,
            formatAddress: formatAddress,
            warningLabel: warningLabel,
            warningTagType: warningTagType,
            serviceAreaScopeLabel: serviceAreaScopeLabel,
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
            printInventoryCheck: printInventoryCheck,
            openCreateCheckDialog: openCreateCheckDialog,
            openInboundScanDialog: openInboundScanDialog,
            openCreateStationDialog: openCreateStationDialog,
            openCreateServiceAreaDialog: openCreateServiceAreaDialog,
            openEditServiceAreaDialog: openEditServiceAreaDialog,
            openEditStation: openEditStation,
            submitCreateCheck: submitCreateCheck,
            submitInboundScan: submitInboundScan,
            submitEditStation: submitEditStation,
            submitServiceArea: submitServiceArea,
            deleteServiceArea: deleteServiceArea,
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
