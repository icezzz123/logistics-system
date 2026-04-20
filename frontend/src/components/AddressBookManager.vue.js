import { onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
const props = withDefaults(defineProps(), {
    customerId: 0,
});
const authStore = useAuthStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const editingAddress = ref(null);
const addresses = ref([]);
const formRef = ref();
const filters = reactive({
    keyword: '',
    type: '',
});
const createDefaultForm = () => ({
    label: '',
    address_type: 'sender',
    contact_name: '',
    contact_phone: '',
    country: '中国',
    province: '',
    city: '',
    address: '',
    postcode: '',
    remark: '',
    is_default: 0,
});
const form = reactive(createDefaultForm());
const rules = {
    label: [{ required: true, message: '请输入地址标签', trigger: 'blur' }],
    address_type: [{ required: true, message: '请选择地址类型', trigger: 'change' }],
    contact_name: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
    contact_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
    country: [{ required: true, message: '请输入国家', trigger: 'blur' }],
    city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
    address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
};
watch(() => props.customerId, () => {
    void loadAddresses();
});
function getRequestCustomerId() {
    if (props.customerId && props.customerId > 0 && props.customerId !== authStore.user?.id) {
        return props.customerId;
    }
    return undefined;
}
function formatAddress(item) {
    return [item.country, item.province, item.city, item.address].filter(Boolean).join(' / ');
}
function formatUnix(value) {
    if (!value)
        return '-';
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false });
}
function openCreateDialog() {
    editingAddress.value = null;
    Object.assign(form, createDefaultForm());
    dialogVisible.value = true;
    formRef.value?.clearValidate();
}
function openEditDialog(item) {
    editingAddress.value = item;
    Object.assign(form, {
        label: item.label,
        address_type: item.address_type,
        contact_name: item.contact_name,
        contact_phone: item.contact_phone,
        country: item.country,
        province: item.province,
        city: item.city,
        address: item.address,
        postcode: item.postcode,
        remark: item.remark,
        is_default: item.is_default,
    });
    dialogVisible.value = true;
    formRef.value?.clearValidate();
}
async function loadAddresses() {
    loading.value = true;
    try {
        const params = {};
        if (filters.keyword.trim())
            params.keyword = filters.keyword.trim();
        if (filters.type)
            params.type = filters.type;
        const customerId = getRequestCustomerId();
        if (customerId)
            params.customer_id = customerId;
        const data = await http.get('/address-book', { params });
        addresses.value = data.list || [];
    }
    finally {
        loading.value = false;
    }
}
async function submit() {
    if (!formRef.value)
        return;
    const valid = await formRef.value.validate().catch(() => false);
    if (!valid)
        return;
    submitting.value = true;
    try {
        const payload = {
            label: form.label.trim(),
            address_type: form.address_type,
            contact_name: form.contact_name.trim(),
            contact_phone: form.contact_phone.trim(),
            country: form.country.trim(),
            province: form.province.trim(),
            city: form.city.trim(),
            address: form.address.trim(),
            postcode: form.postcode.trim(),
            remark: form.remark.trim(),
            is_default: Number(form.is_default),
        };
        const customerId = getRequestCustomerId();
        if (!editingAddress.value && customerId) {
            payload.customer_id = customerId;
        }
        if (editingAddress.value) {
            await http.put(`/address-book/${editingAddress.value.id}`, payload);
            ElMessage.success('地址簿已更新');
        }
        else {
            await http.post('/address-book', payload);
            ElMessage.success('地址已保存到地址簿');
        }
        dialogVisible.value = false;
        await loadAddresses();
    }
    finally {
        submitting.value = false;
    }
}
async function setDefault(item) {
    await http.put(`/address-book/${item.id}/default`);
    ElMessage.success('默认地址已更新');
    await loadAddresses();
}
async function removeAddress(item) {
    await ElMessageBox.confirm(`确认删除地址簿记录“${item.label}”吗？`, '删除确认', { type: 'warning' });
    await http.delete(`/address-book/${item.id}`);
    ElMessage.success('地址簿记录已删除');
    await loadAddresses();
}
onMounted(() => {
    void loadAddresses();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    customerId: 0,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['address-book-manager__contact']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__address']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__contact']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__address']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__address']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__form-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "address-book-manager" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "address-book-manager__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "address-book-manager__toolbar-actions" },
});
const __VLS_0 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.keyword),
    clearable: true,
    placeholder: "搜索标签 / 联系人 / 城市 / 地址",
    ...{ style: {} },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.keyword),
    clearable: true,
    placeholder: "搜索标签 / 联系人 / 城市 / 地址",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onKeyup: (__VLS_ctx.loadAddresses)
};
var __VLS_3;
const __VLS_8 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.filters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.filters.type),
    clearable: true,
    placeholder: "全部类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onChange: (__VLS_ctx.loadAddresses)
};
__VLS_11.slots.default;
const __VLS_16 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "全部类型",
    value: "",
}));
const __VLS_18 = __VLS_17({
    label: "全部类型",
    value: "",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const __VLS_20 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    label: "发件地址",
    value: "sender",
}));
const __VLS_22 = __VLS_21({
    label: "发件地址",
    value: "sender",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
const __VLS_24 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    label: "收件地址",
    value: "receiver",
}));
const __VLS_26 = __VLS_25({
    label: "收件地址",
    value: "receiver",
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
var __VLS_11;
const __VLS_28 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    ...{ 'onClick': {} },
}));
const __VLS_30 = __VLS_29({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_32;
let __VLS_33;
let __VLS_34;
const __VLS_35 = {
    onClick: (__VLS_ctx.loadAddresses)
};
__VLS_31.slots.default;
var __VLS_31;
const __VLS_36 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_38 = __VLS_37({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
let __VLS_40;
let __VLS_41;
let __VLS_42;
const __VLS_43 = {
    onClick: (__VLS_ctx.openCreateDialog)
};
__VLS_39.slots.default;
var __VLS_39;
const __VLS_44 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    data: (__VLS_ctx.addresses),
    stripe: true,
}));
const __VLS_46 = __VLS_45({
    data: (__VLS_ctx.addresses),
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_47.slots.default;
const __VLS_48 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    prop: "address_type_name",
    label: "类型",
    width: "120",
}));
const __VLS_50 = __VLS_49({
    prop: "address_type_name",
    label: "类型",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_51.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_52 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        type: (scope.row.address_type === 'sender' ? 'success' : 'warning'),
        effect: "dark",
    }));
    const __VLS_54 = __VLS_53({
        type: (scope.row.address_type === 'sender' ? 'success' : 'warning'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_55.slots.default;
    (scope.row.address_type_name);
    var __VLS_55;
}
var __VLS_51;
const __VLS_56 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    prop: "label",
    label: "地址标签",
    minWidth: "150",
}));
const __VLS_58 = __VLS_57({
    prop: "label",
    label: "地址标签",
    minWidth: "150",
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "联系人",
    minWidth: "180",
}));
const __VLS_62 = __VLS_61({
    label: "联系人",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_63.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_63.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "address-book-manager__contact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (scope.row.contact_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (scope.row.contact_phone);
}
var __VLS_63;
const __VLS_64 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    label: "地址",
    minWidth: "320",
}));
const __VLS_66 = __VLS_65({
    label: "地址",
    minWidth: "320",
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_67.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "address-book-manager__address" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.formatAddress(scope.row));
    if (scope.row.postcode) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (scope.row.postcode);
    }
    if (scope.row.remark) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (scope.row.remark);
    }
}
var __VLS_67;
const __VLS_68 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    label: "默认",
    width: "110",
}));
const __VLS_70 = __VLS_69({
    label: "默认",
    width: "110",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_71.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    if (scope.row.is_default === 1) {
        const __VLS_72 = {}.ElTag;
        /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
        // @ts-ignore
        const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
            type: "danger",
            effect: "dark",
        }));
        const __VLS_74 = __VLS_73({
            type: "danger",
            effect: "dark",
        }, ...__VLS_functionalComponentArgsRest(__VLS_73));
        __VLS_75.slots.default;
        var __VLS_75;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "address-book-manager__muted" },
        });
    }
}
var __VLS_71;
const __VLS_76 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "更新时间",
    width: "180",
}));
const __VLS_78 = __VLS_77({
    label: "更新时间",
    width: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_79.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (__VLS_ctx.formatUnix(scope.row.mtime));
}
var __VLS_79;
const __VLS_80 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    label: "操作",
    width: "220",
    fixed: "right",
}));
const __VLS_82 = __VLS_81({
    label: "操作",
    width: "220",
    fixed: "right",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_83.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "address-book-manager__actions" },
    });
    const __VLS_84 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_86 = __VLS_85({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    let __VLS_88;
    let __VLS_89;
    let __VLS_90;
    const __VLS_91 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEditDialog(scope.row);
        }
    };
    __VLS_87.slots.default;
    var __VLS_87;
    if (scope.row.is_default !== 1) {
        const __VLS_92 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }));
        const __VLS_94 = __VLS_93({
            ...{ 'onClick': {} },
            link: true,
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_93));
        let __VLS_96;
        let __VLS_97;
        let __VLS_98;
        const __VLS_99 = {
            onClick: (...[$event]) => {
                if (!(scope.row.is_default !== 1))
                    return;
                __VLS_ctx.setDefault(scope.row);
            }
        };
        __VLS_95.slots.default;
        var __VLS_95;
    }
    const __VLS_100 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (...[$event]) => {
            __VLS_ctx.removeAddress(scope.row);
        }
    };
    __VLS_103.slots.default;
    var __VLS_103;
}
var __VLS_83;
var __VLS_47;
if (!__VLS_ctx.loading && !__VLS_ctx.addresses.length) {
    const __VLS_108 = {}.ElEmpty;
    /** @type {[typeof __VLS_components.ElEmpty, typeof __VLS_components.elEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        description: "还没有地址簿记录，先新增一个常用地址吧",
    }));
    const __VLS_110 = __VLS_109({
        description: "还没有地址簿记录，先新增一个常用地址吧",
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
}
const __VLS_112 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editingAddress ? '编辑地址' : '新增地址'),
    width: "620px",
}));
const __VLS_114 = __VLS_113({
    modelValue: (__VLS_ctx.dialogVisible),
    title: (__VLS_ctx.editingAddress ? '编辑地址' : '新增地址'),
    width: "620px",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
const __VLS_116 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
}));
const __VLS_118 = __VLS_117({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_120 = {};
__VLS_119.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "address-book-manager__form-grid" },
});
const __VLS_122 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
    label: "地址类型",
    prop: "address_type",
}));
const __VLS_124 = __VLS_123({
    label: "地址类型",
    prop: "address_type",
}, ...__VLS_functionalComponentArgsRest(__VLS_123));
__VLS_125.slots.default;
const __VLS_126 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    modelValue: (__VLS_ctx.form.address_type),
    placeholder: "请选择地址类型",
    ...{ style: {} },
}));
const __VLS_128 = __VLS_127({
    modelValue: (__VLS_ctx.form.address_type),
    placeholder: "请选择地址类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
__VLS_129.slots.default;
const __VLS_130 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    label: "发件地址",
    value: "sender",
}));
const __VLS_132 = __VLS_131({
    label: "发件地址",
    value: "sender",
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
const __VLS_134 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(__VLS_134, new __VLS_134({
    label: "收件地址",
    value: "receiver",
}));
const __VLS_136 = __VLS_135({
    label: "收件地址",
    value: "receiver",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
var __VLS_129;
var __VLS_125;
const __VLS_138 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_139 = __VLS_asFunctionalComponent(__VLS_138, new __VLS_138({
    label: "地址标签",
    prop: "label",
}));
const __VLS_140 = __VLS_139({
    label: "地址标签",
    prop: "label",
}, ...__VLS_functionalComponentArgsRest(__VLS_139));
__VLS_141.slots.default;
const __VLS_142 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_143 = __VLS_asFunctionalComponent(__VLS_142, new __VLS_142({
    modelValue: (__VLS_ctx.form.label),
    placeholder: "如：家里 / 公司 / 美国仓",
}));
const __VLS_144 = __VLS_143({
    modelValue: (__VLS_ctx.form.label),
    placeholder: "如：家里 / 公司 / 美国仓",
}, ...__VLS_functionalComponentArgsRest(__VLS_143));
var __VLS_141;
const __VLS_146 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_147 = __VLS_asFunctionalComponent(__VLS_146, new __VLS_146({
    label: "联系人",
    prop: "contact_name",
}));
const __VLS_148 = __VLS_147({
    label: "联系人",
    prop: "contact_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_147));
__VLS_149.slots.default;
const __VLS_150 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_151 = __VLS_asFunctionalComponent(__VLS_150, new __VLS_150({
    modelValue: (__VLS_ctx.form.contact_name),
    placeholder: "请输入联系人姓名",
}));
const __VLS_152 = __VLS_151({
    modelValue: (__VLS_ctx.form.contact_name),
    placeholder: "请输入联系人姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_151));
var __VLS_149;
const __VLS_154 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_155 = __VLS_asFunctionalComponent(__VLS_154, new __VLS_154({
    label: "联系电话",
    prop: "contact_phone",
}));
const __VLS_156 = __VLS_155({
    label: "联系电话",
    prop: "contact_phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_155));
__VLS_157.slots.default;
const __VLS_158 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_159 = __VLS_asFunctionalComponent(__VLS_158, new __VLS_158({
    modelValue: (__VLS_ctx.form.contact_phone),
    placeholder: "请输入联系电话",
}));
const __VLS_160 = __VLS_159({
    modelValue: (__VLS_ctx.form.contact_phone),
    placeholder: "请输入联系电话",
}, ...__VLS_functionalComponentArgsRest(__VLS_159));
var __VLS_157;
const __VLS_162 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_163 = __VLS_asFunctionalComponent(__VLS_162, new __VLS_162({
    label: "国家",
    prop: "country",
}));
const __VLS_164 = __VLS_163({
    label: "国家",
    prop: "country",
}, ...__VLS_functionalComponentArgsRest(__VLS_163));
__VLS_165.slots.default;
const __VLS_166 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_167 = __VLS_asFunctionalComponent(__VLS_166, new __VLS_166({
    modelValue: (__VLS_ctx.form.country),
    placeholder: "请输入国家",
}));
const __VLS_168 = __VLS_167({
    modelValue: (__VLS_ctx.form.country),
    placeholder: "请输入国家",
}, ...__VLS_functionalComponentArgsRest(__VLS_167));
var __VLS_165;
const __VLS_170 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_171 = __VLS_asFunctionalComponent(__VLS_170, new __VLS_170({
    label: "省份",
}));
const __VLS_172 = __VLS_171({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_171));
__VLS_173.slots.default;
const __VLS_174 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_175 = __VLS_asFunctionalComponent(__VLS_174, new __VLS_174({
    modelValue: (__VLS_ctx.form.province),
    placeholder: "可选",
}));
const __VLS_176 = __VLS_175({
    modelValue: (__VLS_ctx.form.province),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_175));
var __VLS_173;
const __VLS_178 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_179 = __VLS_asFunctionalComponent(__VLS_178, new __VLS_178({
    label: "城市",
    prop: "city",
}));
const __VLS_180 = __VLS_179({
    label: "城市",
    prop: "city",
}, ...__VLS_functionalComponentArgsRest(__VLS_179));
__VLS_181.slots.default;
const __VLS_182 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_183 = __VLS_asFunctionalComponent(__VLS_182, new __VLS_182({
    modelValue: (__VLS_ctx.form.city),
    placeholder: "请输入城市",
}));
const __VLS_184 = __VLS_183({
    modelValue: (__VLS_ctx.form.city),
    placeholder: "请输入城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_183));
var __VLS_181;
const __VLS_186 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_187 = __VLS_asFunctionalComponent(__VLS_186, new __VLS_186({
    label: "邮编",
}));
const __VLS_188 = __VLS_187({
    label: "邮编",
}, ...__VLS_functionalComponentArgsRest(__VLS_187));
__VLS_189.slots.default;
const __VLS_190 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_191 = __VLS_asFunctionalComponent(__VLS_190, new __VLS_190({
    modelValue: (__VLS_ctx.form.postcode),
    placeholder: "可选",
}));
const __VLS_192 = __VLS_191({
    modelValue: (__VLS_ctx.form.postcode),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_191));
var __VLS_189;
const __VLS_194 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_195 = __VLS_asFunctionalComponent(__VLS_194, new __VLS_194({
    label: "详细地址",
    prop: "address",
    ...{ class: "address-book-manager__form-grid-wide" },
}));
const __VLS_196 = __VLS_195({
    label: "详细地址",
    prop: "address",
    ...{ class: "address-book-manager__form-grid-wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_195));
__VLS_197.slots.default;
const __VLS_198 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_199 = __VLS_asFunctionalComponent(__VLS_198, new __VLS_198({
    modelValue: (__VLS_ctx.form.address),
    placeholder: "请输入详细地址",
}));
const __VLS_200 = __VLS_199({
    modelValue: (__VLS_ctx.form.address),
    placeholder: "请输入详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_199));
var __VLS_197;
const __VLS_202 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_203 = __VLS_asFunctionalComponent(__VLS_202, new __VLS_202({
    label: "备注",
    ...{ class: "address-book-manager__form-grid-wide" },
}));
const __VLS_204 = __VLS_203({
    label: "备注",
    ...{ class: "address-book-manager__form-grid-wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_203));
__VLS_205.slots.default;
const __VLS_206 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_207 = __VLS_asFunctionalComponent(__VLS_206, new __VLS_206({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (3),
    maxlength: "255",
    showWordLimit: true,
    placeholder: "可选，填写门牌提示、仓位说明等",
}));
const __VLS_208 = __VLS_207({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (3),
    maxlength: "255",
    showWordLimit: true,
    placeholder: "可选，填写门牌提示、仓位说明等",
}, ...__VLS_functionalComponentArgsRest(__VLS_207));
var __VLS_205;
const __VLS_210 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_211 = __VLS_asFunctionalComponent(__VLS_210, new __VLS_210({
    label: "默认地址",
    ...{ class: "address-book-manager__form-grid-wide" },
}));
const __VLS_212 = __VLS_211({
    label: "默认地址",
    ...{ class: "address-book-manager__form-grid-wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_211));
__VLS_213.slots.default;
const __VLS_214 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_215 = __VLS_asFunctionalComponent(__VLS_214, new __VLS_214({
    modelValue: (__VLS_ctx.form.is_default),
    activeValue: (1),
    inactiveValue: (0),
}));
const __VLS_216 = __VLS_215({
    modelValue: (__VLS_ctx.form.is_default),
    activeValue: (1),
    inactiveValue: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_215));
var __VLS_213;
var __VLS_119;
{
    const { footer: __VLS_thisSlot } = __VLS_115.slots;
    const __VLS_218 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_219 = __VLS_asFunctionalComponent(__VLS_218, new __VLS_218({
        ...{ 'onClick': {} },
    }));
    const __VLS_220 = __VLS_219({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_219));
    let __VLS_222;
    let __VLS_223;
    let __VLS_224;
    const __VLS_225 = {
        onClick: (...[$event]) => {
            __VLS_ctx.dialogVisible = false;
        }
    };
    __VLS_221.slots.default;
    var __VLS_221;
    const __VLS_226 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.submitting),
    }));
    const __VLS_228 = __VLS_227({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.submitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_227));
    let __VLS_230;
    let __VLS_231;
    let __VLS_232;
    const __VLS_233 = {
        onClick: (__VLS_ctx.submit)
    };
    __VLS_229.slots.default;
    var __VLS_229;
}
var __VLS_115;
/** @type {__VLS_StyleScopedClasses['address-book-manager']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__contact']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__address']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__muted']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__form-grid-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__form-grid-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['address-book-manager__form-grid-wide']} */ ;
// @ts-ignore
var __VLS_121 = __VLS_120;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            submitting: submitting,
            dialogVisible: dialogVisible,
            editingAddress: editingAddress,
            addresses: addresses,
            formRef: formRef,
            filters: filters,
            form: form,
            rules: rules,
            formatAddress: formatAddress,
            formatUnix: formatUnix,
            openCreateDialog: openCreateDialog,
            openEditDialog: openEditDialog,
            loadAddresses: loadAddresses,
            submit: submit,
            setDefault: setDefault,
            removeAddress: removeAddress,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
