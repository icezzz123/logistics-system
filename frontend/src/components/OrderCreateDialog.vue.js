import { nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import http from '@/utils/http';
const transportModeOptions = [
    { value: 1, label: '空运' },
    { value: 2, label: '海运' },
    { value: 3, label: '陆运' },
    { value: 4, label: '铁路' },
    { value: 5, label: '快递' },
];
const serviceTypeOptions = [
    { value: 'standard', label: '标准服务' },
    { value: 'express', label: '加急服务' },
    { value: 'economy', label: '经济服务' },
];
const props = defineProps();
const emit = defineEmits();
const formRef = ref();
const submitting = ref(false);
const customerLoading = ref(false);
const customerOptions = ref([]);
const createEmptyPackage = () => ({
    parcel_no: '',
    goods_name: '',
    goods_category: '',
    weight: 1,
    volume: 0,
    quantity: 1,
    goods_value: 0,
    remark: '',
});
const createDefaultForm = () => ({
    customer_id: undefined,
    sender_name: '',
    sender_phone: '',
    sender_country: '中国',
    sender_province: '',
    sender_city: '',
    sender_address: '',
    sender_postcode: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_country: '',
    receiver_province: '',
    receiver_city: '',
    receiver_address: '',
    receiver_postcode: '',
    goods_name: '',
    goods_category: '',
    goods_weight: 1,
    goods_volume: 0,
    goods_quantity: 1,
    goods_value: 0,
    is_insured: 0,
    insured_amount: 0,
    packages: [],
    transport_mode: 3,
    service_type: 'standard',
    remark: '',
});
const form = reactive(createDefaultForm());
const rules = {
    customer_id: [{ required: true, message: '请选择下单客户', trigger: 'change' }],
    sender_name: [{ required: true, message: '请输入发件人', trigger: 'blur' }],
    sender_phone: [{ required: true, message: '请输入发件人手机号', trigger: 'blur' }],
    sender_country: [{ required: true, message: '请输入发件国家', trigger: 'blur' }],
    sender_city: [{ required: true, message: '请输入发件城市', trigger: 'blur' }],
    sender_address: [{ required: true, message: '请输入发件详细地址', trigger: 'blur' }],
    receiver_name: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
    receiver_phone: [{ required: true, message: '请输入收件人手机号', trigger: 'blur' }],
    receiver_country: [{ required: true, message: '请输入收件国家', trigger: 'blur' }],
    receiver_city: [{ required: true, message: '请输入收件城市', trigger: 'blur' }],
    receiver_address: [{ required: true, message: '请输入收件详细地址', trigger: 'blur' }],
    goods_name: [{ required: true, message: '请输入货物名称', trigger: 'blur' }],
    goods_weight: [{ validator: validateGoodsWeight, trigger: 'change' }],
    transport_mode: [{ required: true, message: '请选择运输方式', trigger: 'change' }],
    insured_amount: [{ validator: validateInsuredAmount, trigger: 'change' }],
};
watch(() => props.modelValue, async (visible) => {
    if (!visible) {
        return;
    }
    Object.assign(form, createDefaultForm());
    await loadCustomerOptions('');
    nextTick(() => {
        formRef.value?.clearValidate();
    });
});
function validateGoodsWeight(_rule, value, callback) {
    callback(Number(value) > 0 ? undefined : new Error('货物重量必须大于 0'));
}
function validateInsuredAmount(_rule, value, callback) {
    if (form.is_insured !== 1) {
        callback();
        return;
    }
    callback(Number(value) > 0 ? undefined : new Error('投保时保价金额必须大于 0'));
}
function updateVisible(value) {
    emit('update:modelValue', value);
}
function addPackage() {
    form.packages.push(createEmptyPackage());
}
function removePackage(index) {
    form.packages.splice(index, 1);
}
function formatCustomerLabel(item) {
    const parts = [item.display_name];
    if (item.username && item.username !== item.display_name) {
        parts.push(`(${item.username})`);
    }
    if (item.phone) {
        parts.push(item.phone);
    }
    return parts.join(' ');
}
async function loadCustomerOptions(keyword) {
    customerLoading.value = true;
    try {
        const data = await http.get('/customers/options', {
            params: {
                keyword: keyword.trim(),
                page_size: 20,
            },
        });
        customerOptions.value = data.list || [];
    }
    finally {
        customerLoading.value = false;
    }
}
async function submit() {
    if (!formRef.value) {
        return;
    }
    const valid = await formRef.value.validate().catch(() => false);
    if (!valid) {
        return;
    }
    submitting.value = true;
    try {
        const payload = {
            customer_id: Number(form.customer_id),
            sender_name: form.sender_name.trim(),
            sender_phone: form.sender_phone.trim(),
            sender_country: form.sender_country.trim(),
            sender_province: form.sender_province.trim(),
            sender_city: form.sender_city.trim(),
            sender_address: form.sender_address.trim(),
            sender_postcode: form.sender_postcode.trim(),
            receiver_name: form.receiver_name.trim(),
            receiver_phone: form.receiver_phone.trim(),
            receiver_country: form.receiver_country.trim(),
            receiver_province: form.receiver_province.trim(),
            receiver_city: form.receiver_city.trim(),
            receiver_address: form.receiver_address.trim(),
            receiver_postcode: form.receiver_postcode.trim(),
            goods_name: form.goods_name.trim(),
            goods_category: form.goods_category.trim(),
            goods_weight: Number(form.goods_weight),
            goods_volume: Number(form.goods_volume),
            goods_quantity: Number(form.goods_quantity),
            goods_value: Number(form.goods_value),
            is_insured: form.is_insured,
            insured_amount: form.is_insured === 1 ? Number(form.insured_amount) : 0,
            packages: form.packages.map((item) => ({
                parcel_no: item.parcel_no.trim(),
                goods_name: item.goods_name.trim(),
                goods_category: item.goods_category.trim(),
                weight: Number(item.weight),
                volume: Number(item.volume),
                quantity: Number(item.quantity),
                goods_value: Number(item.goods_value),
                remark: item.remark.trim(),
            })).filter((item) => item.goods_name),
            transport_mode: Number(form.transport_mode),
            service_type: form.service_type,
            remark: form.remark.trim(),
        };
        const data = await http.post('/orders', payload);
        ElMessage.success(`订单创建成功：${data.order_no}`);
        emit('created', data);
        updateVisible(false);
    }
    finally {
        submitting.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.modelValue),
    title: "录入新订单",
    width: "960px",
    ...{ class: "create-order-dialog" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.modelValue),
    title: "录入新订单",
    width: "960px",
    ...{ class: "create-order-dialog" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    'onUpdate:modelValue': (__VLS_ctx.updateVisible)
};
var __VLS_8 = {};
__VLS_3.slots.default;
const __VLS_9 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    ...{ class: "create-order-form" },
}));
const __VLS_11 = __VLS_10({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPosition: "top",
    ...{ class: "create-order-form" },
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_13 = {};
__VLS_12.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "create-order-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_15 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    label: "客户账号",
    prop: "customer_id",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_17 = __VLS_16({
    label: "客户账号",
    prop: "customer_id",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
const __VLS_19 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    modelValue: (__VLS_ctx.form.customer_id),
    filterable: true,
    remote: true,
    reserveKeyword: true,
    clearable: true,
    placeholder: "请输入客户姓名、用户名、手机号搜索",
    remoteMethod: (__VLS_ctx.loadCustomerOptions),
    loading: (__VLS_ctx.customerLoading),
    ...{ style: {} },
}));
const __VLS_21 = __VLS_20({
    modelValue: (__VLS_ctx.form.customer_id),
    filterable: true,
    remote: true,
    reserveKeyword: true,
    clearable: true,
    placeholder: "请输入客户姓名、用户名、手机号搜索",
    remoteMethod: (__VLS_ctx.loadCustomerOptions),
    loading: (__VLS_ctx.customerLoading),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_22.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.customerOptions))) {
    const __VLS_23 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        key: (item.id),
        label: (__VLS_ctx.formatCustomerLabel(item)),
        value: (item.id),
    }));
    const __VLS_25 = __VLS_24({
        key: (item.id),
        label: (__VLS_ctx.formatCustomerLabel(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
}
var __VLS_22;
var __VLS_18;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "create-order-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_27 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    label: "发件人",
    prop: "sender_name",
}));
const __VLS_29 = __VLS_28({
    label: "发件人",
    prop: "sender_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
__VLS_30.slots.default;
const __VLS_31 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    modelValue: (__VLS_ctx.form.sender_name),
    placeholder: "请输入发件人姓名",
}));
const __VLS_33 = __VLS_32({
    modelValue: (__VLS_ctx.form.sender_name),
    placeholder: "请输入发件人姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
var __VLS_30;
const __VLS_35 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    label: "手机号",
    prop: "sender_phone",
}));
const __VLS_37 = __VLS_36({
    label: "手机号",
    prop: "sender_phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_38.slots.default;
const __VLS_39 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    modelValue: (__VLS_ctx.form.sender_phone),
    placeholder: "请输入发件人手机号",
}));
const __VLS_41 = __VLS_40({
    modelValue: (__VLS_ctx.form.sender_phone),
    placeholder: "请输入发件人手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
var __VLS_38;
const __VLS_43 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    label: "国家",
    prop: "sender_country",
}));
const __VLS_45 = __VLS_44({
    label: "国家",
    prop: "sender_country",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_46.slots.default;
const __VLS_47 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    modelValue: (__VLS_ctx.form.sender_country),
    placeholder: "如：中国",
}));
const __VLS_49 = __VLS_48({
    modelValue: (__VLS_ctx.form.sender_country),
    placeholder: "如：中国",
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
var __VLS_46;
const __VLS_51 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
    label: "省份",
}));
const __VLS_53 = __VLS_52({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
__VLS_54.slots.default;
const __VLS_55 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
    modelValue: (__VLS_ctx.form.sender_province),
    placeholder: "可选",
}));
const __VLS_57 = __VLS_56({
    modelValue: (__VLS_ctx.form.sender_province),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
var __VLS_54;
const __VLS_59 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    label: "城市",
    prop: "sender_city",
}));
const __VLS_61 = __VLS_60({
    label: "城市",
    prop: "sender_city",
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
__VLS_62.slots.default;
const __VLS_63 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    modelValue: (__VLS_ctx.form.sender_city),
    placeholder: "请输入发件城市",
}));
const __VLS_65 = __VLS_64({
    modelValue: (__VLS_ctx.form.sender_city),
    placeholder: "请输入发件城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
var __VLS_62;
const __VLS_67 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    label: "邮编",
}));
const __VLS_69 = __VLS_68({
    label: "邮编",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
const __VLS_71 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    modelValue: (__VLS_ctx.form.sender_postcode),
    placeholder: "可选",
}));
const __VLS_73 = __VLS_72({
    modelValue: (__VLS_ctx.form.sender_postcode),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
var __VLS_70;
const __VLS_75 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    label: "详细地址",
    prop: "sender_address",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_77 = __VLS_76({
    label: "详细地址",
    prop: "sender_address",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
__VLS_78.slots.default;
const __VLS_79 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
    modelValue: (__VLS_ctx.form.sender_address),
    placeholder: "请输入发件详细地址",
}));
const __VLS_81 = __VLS_80({
    modelValue: (__VLS_ctx.form.sender_address),
    placeholder: "请输入发件详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
var __VLS_78;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "create-order-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_83 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    label: "收件人",
    prop: "receiver_name",
}));
const __VLS_85 = __VLS_84({
    label: "收件人",
    prop: "receiver_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
__VLS_86.slots.default;
const __VLS_87 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
    modelValue: (__VLS_ctx.form.receiver_name),
    placeholder: "请输入收件人姓名",
}));
const __VLS_89 = __VLS_88({
    modelValue: (__VLS_ctx.form.receiver_name),
    placeholder: "请输入收件人姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_88));
var __VLS_86;
const __VLS_91 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
    label: "手机号",
    prop: "receiver_phone",
}));
const __VLS_93 = __VLS_92({
    label: "手机号",
    prop: "receiver_phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
__VLS_94.slots.default;
const __VLS_95 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
    modelValue: (__VLS_ctx.form.receiver_phone),
    placeholder: "请输入收件人手机号",
}));
const __VLS_97 = __VLS_96({
    modelValue: (__VLS_ctx.form.receiver_phone),
    placeholder: "请输入收件人手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
var __VLS_94;
const __VLS_99 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
    label: "国家",
    prop: "receiver_country",
}));
const __VLS_101 = __VLS_100({
    label: "国家",
    prop: "receiver_country",
}, ...__VLS_functionalComponentArgsRest(__VLS_100));
__VLS_102.slots.default;
const __VLS_103 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
    modelValue: (__VLS_ctx.form.receiver_country),
    placeholder: "如：美国",
}));
const __VLS_105 = __VLS_104({
    modelValue: (__VLS_ctx.form.receiver_country),
    placeholder: "如：美国",
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
var __VLS_102;
const __VLS_107 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
    label: "省份",
}));
const __VLS_109 = __VLS_108({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_108));
__VLS_110.slots.default;
const __VLS_111 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    modelValue: (__VLS_ctx.form.receiver_province),
    placeholder: "可选",
}));
const __VLS_113 = __VLS_112({
    modelValue: (__VLS_ctx.form.receiver_province),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
var __VLS_110;
const __VLS_115 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
    label: "城市",
    prop: "receiver_city",
}));
const __VLS_117 = __VLS_116({
    label: "城市",
    prop: "receiver_city",
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
__VLS_118.slots.default;
const __VLS_119 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
    modelValue: (__VLS_ctx.form.receiver_city),
    placeholder: "请输入收件城市",
}));
const __VLS_121 = __VLS_120({
    modelValue: (__VLS_ctx.form.receiver_city),
    placeholder: "请输入收件城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
var __VLS_118;
const __VLS_123 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
    label: "邮编",
}));
const __VLS_125 = __VLS_124({
    label: "邮编",
}, ...__VLS_functionalComponentArgsRest(__VLS_124));
__VLS_126.slots.default;
const __VLS_127 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
    modelValue: (__VLS_ctx.form.receiver_postcode),
    placeholder: "可选",
}));
const __VLS_129 = __VLS_128({
    modelValue: (__VLS_ctx.form.receiver_postcode),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_128));
var __VLS_126;
const __VLS_131 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    label: "详细地址",
    prop: "receiver_address",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_133 = __VLS_132({
    label: "详细地址",
    prop: "receiver_address",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
__VLS_134.slots.default;
const __VLS_135 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
    modelValue: (__VLS_ctx.form.receiver_address),
    placeholder: "请输入收件详细地址",
}));
const __VLS_137 = __VLS_136({
    modelValue: (__VLS_ctx.form.receiver_address),
    placeholder: "请输入收件详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
var __VLS_134;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "create-order-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_139 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    label: "货物名称",
    prop: "goods_name",
}));
const __VLS_141 = __VLS_140({
    label: "货物名称",
    prop: "goods_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
__VLS_142.slots.default;
const __VLS_143 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    modelValue: (__VLS_ctx.form.goods_name),
    placeholder: "请输入货物名称",
}));
const __VLS_145 = __VLS_144({
    modelValue: (__VLS_ctx.form.goods_name),
    placeholder: "请输入货物名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
var __VLS_142;
const __VLS_147 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
    label: "货物分类",
}));
const __VLS_149 = __VLS_148({
    label: "货物分类",
}, ...__VLS_functionalComponentArgsRest(__VLS_148));
__VLS_150.slots.default;
const __VLS_151 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
    modelValue: (__VLS_ctx.form.goods_category),
    placeholder: "如：文件 / 服装 / 电子产品",
}));
const __VLS_153 = __VLS_152({
    modelValue: (__VLS_ctx.form.goods_category),
    placeholder: "如：文件 / 服装 / 电子产品",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
var __VLS_150;
const __VLS_155 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
    label: "重量(kg)",
    prop: "goods_weight",
}));
const __VLS_157 = __VLS_156({
    label: "重量(kg)",
    prop: "goods_weight",
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
__VLS_158.slots.default;
const __VLS_159 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
    modelValue: (__VLS_ctx.form.goods_weight),
    min: (0.1),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_161 = __VLS_160({
    modelValue: (__VLS_ctx.form.goods_weight),
    min: (0.1),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_160));
var __VLS_158;
const __VLS_163 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
    label: "体积(m³)",
}));
const __VLS_165 = __VLS_164({
    label: "体积(m³)",
}, ...__VLS_functionalComponentArgsRest(__VLS_164));
__VLS_166.slots.default;
const __VLS_167 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
    modelValue: (__VLS_ctx.form.goods_volume),
    min: (0),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_169 = __VLS_168({
    modelValue: (__VLS_ctx.form.goods_volume),
    min: (0),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_168));
var __VLS_166;
const __VLS_171 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
    label: "件数",
}));
const __VLS_173 = __VLS_172({
    label: "件数",
}, ...__VLS_functionalComponentArgsRest(__VLS_172));
__VLS_174.slots.default;
const __VLS_175 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
    modelValue: (__VLS_ctx.form.goods_quantity),
    min: (1),
    step: (1),
    ...{ style: {} },
}));
const __VLS_177 = __VLS_176({
    modelValue: (__VLS_ctx.form.goods_quantity),
    min: (1),
    step: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
var __VLS_174;
const __VLS_179 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
    label: "货值",
}));
const __VLS_181 = __VLS_180({
    label: "货值",
}, ...__VLS_functionalComponentArgsRest(__VLS_180));
__VLS_182.slots.default;
const __VLS_183 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
    modelValue: (__VLS_ctx.form.goods_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_185 = __VLS_184({
    modelValue: (__VLS_ctx.form.goods_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_184));
var __VLS_182;
const __VLS_187 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
    label: "是否投保",
}));
const __VLS_189 = __VLS_188({
    label: "是否投保",
}, ...__VLS_functionalComponentArgsRest(__VLS_188));
__VLS_190.slots.default;
const __VLS_191 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
    modelValue: (__VLS_ctx.form.is_insured),
    inactiveValue: (0),
    activeValue: (1),
}));
const __VLS_193 = __VLS_192({
    modelValue: (__VLS_ctx.form.is_insured),
    inactiveValue: (0),
    activeValue: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_192));
var __VLS_190;
const __VLS_195 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
    label: "保价金额",
    prop: "insured_amount",
}));
const __VLS_197 = __VLS_196({
    label: "保价金额",
    prop: "insured_amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_196));
__VLS_198.slots.default;
const __VLS_199 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
    modelValue: (__VLS_ctx.form.insured_amount),
    min: (0),
    step: (100),
    precision: (2),
    disabled: (__VLS_ctx.form.is_insured !== 1),
    ...{ style: {} },
}));
const __VLS_201 = __VLS_200({
    modelValue: (__VLS_ctx.form.insured_amount),
    min: (0),
    step: (100),
    precision: (2),
    disabled: (__VLS_ctx.form.is_insured !== 1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
var __VLS_198;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "create-order-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__head create-order-section__head--inline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
const __VLS_203 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
    ...{ 'onClick': {} },
    type: "primary",
    plain: true,
}));
const __VLS_205 = __VLS_204({
    ...{ 'onClick': {} },
    type: "primary",
    plain: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
let __VLS_207;
let __VLS_208;
let __VLS_209;
const __VLS_210 = {
    onClick: (__VLS_ctx.addPackage)
};
__VLS_206.slots.default;
var __VLS_206;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "create-order-tip" },
});
if (__VLS_ctx.form.packages.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "package-list" },
    });
    for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.form.packages))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (index),
            ...{ class: "package-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "package-card__head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (index + 1);
        const __VLS_211 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }));
        const __VLS_213 = __VLS_212({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_212));
        let __VLS_215;
        let __VLS_216;
        let __VLS_217;
        const __VLS_218 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.form.packages.length))
                    return;
                __VLS_ctx.removePackage(index);
            }
        };
        __VLS_214.slots.default;
        var __VLS_214;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "create-order-grid" },
        });
        const __VLS_219 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
            label: "包裹号",
        }));
        const __VLS_221 = __VLS_220({
            label: "包裹号",
        }, ...__VLS_functionalComponentArgsRest(__VLS_220));
        __VLS_222.slots.default;
        const __VLS_223 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
            modelValue: (item.parcel_no),
            placeholder: "可选，不填则自动生成",
        }));
        const __VLS_225 = __VLS_224({
            modelValue: (item.parcel_no),
            placeholder: "可选，不填则自动生成",
        }, ...__VLS_functionalComponentArgsRest(__VLS_224));
        var __VLS_222;
        const __VLS_227 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
            label: "货物名称",
        }));
        const __VLS_229 = __VLS_228({
            label: "货物名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_228));
        __VLS_230.slots.default;
        const __VLS_231 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
            modelValue: (item.goods_name),
            placeholder: "请输入包裹货物名称",
        }));
        const __VLS_233 = __VLS_232({
            modelValue: (item.goods_name),
            placeholder: "请输入包裹货物名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_232));
        var __VLS_230;
        const __VLS_235 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
            label: "货物分类",
        }));
        const __VLS_237 = __VLS_236({
            label: "货物分类",
        }, ...__VLS_functionalComponentArgsRest(__VLS_236));
        __VLS_238.slots.default;
        const __VLS_239 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
            modelValue: (item.goods_category),
            placeholder: "如：服装 / 文件",
        }));
        const __VLS_241 = __VLS_240({
            modelValue: (item.goods_category),
            placeholder: "如：服装 / 文件",
        }, ...__VLS_functionalComponentArgsRest(__VLS_240));
        var __VLS_238;
        const __VLS_243 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
            label: "重量(kg)",
        }));
        const __VLS_245 = __VLS_244({
            label: "重量(kg)",
        }, ...__VLS_functionalComponentArgsRest(__VLS_244));
        __VLS_246.slots.default;
        const __VLS_247 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
            modelValue: (item.weight),
            min: (0.1),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }));
        const __VLS_249 = __VLS_248({
            modelValue: (item.weight),
            min: (0.1),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_248));
        var __VLS_246;
        const __VLS_251 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
            label: "体积(m³)",
        }));
        const __VLS_253 = __VLS_252({
            label: "体积(m³)",
        }, ...__VLS_functionalComponentArgsRest(__VLS_252));
        __VLS_254.slots.default;
        const __VLS_255 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
            modelValue: (item.volume),
            min: (0),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }));
        const __VLS_257 = __VLS_256({
            modelValue: (item.volume),
            min: (0),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_256));
        var __VLS_254;
        const __VLS_259 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
            label: "件数",
        }));
        const __VLS_261 = __VLS_260({
            label: "件数",
        }, ...__VLS_functionalComponentArgsRest(__VLS_260));
        __VLS_262.slots.default;
        const __VLS_263 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
            modelValue: (item.quantity),
            min: (1),
            step: (1),
            ...{ style: {} },
        }));
        const __VLS_265 = __VLS_264({
            modelValue: (item.quantity),
            min: (1),
            step: (1),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_264));
        var __VLS_262;
        const __VLS_267 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
            label: "货值",
        }));
        const __VLS_269 = __VLS_268({
            label: "货值",
        }, ...__VLS_functionalComponentArgsRest(__VLS_268));
        __VLS_270.slots.default;
        const __VLS_271 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
            modelValue: (item.goods_value),
            min: (0),
            step: (10),
            precision: (2),
            ...{ style: {} },
        }));
        const __VLS_273 = __VLS_272({
            modelValue: (item.goods_value),
            min: (0),
            step: (10),
            precision: (2),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_272));
        var __VLS_270;
        const __VLS_275 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_276 = __VLS_asFunctionalComponent(__VLS_275, new __VLS_275({
            label: "备注",
            ...{ class: "create-order-grid__wide" },
        }));
        const __VLS_277 = __VLS_276({
            label: "备注",
            ...{ class: "create-order-grid__wide" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_276));
        __VLS_278.slots.default;
        const __VLS_279 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
            modelValue: (item.remark),
            maxlength: "120",
            placeholder: "可选，填写包裹备注",
        }));
        const __VLS_281 = __VLS_280({
            modelValue: (item.remark),
            maxlength: "120",
            placeholder: "可选，填写包裹备注",
        }, ...__VLS_functionalComponentArgsRest(__VLS_280));
        var __VLS_278;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "create-order-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_283 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
    label: "运输方式",
    prop: "transport_mode",
}));
const __VLS_285 = __VLS_284({
    label: "运输方式",
    prop: "transport_mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_284));
__VLS_286.slots.default;
const __VLS_287 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
    modelValue: (__VLS_ctx.form.transport_mode),
    placeholder: "请选择运输方式",
    ...{ style: {} },
}));
const __VLS_289 = __VLS_288({
    modelValue: (__VLS_ctx.form.transport_mode),
    placeholder: "请选择运输方式",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_288));
__VLS_290.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.transportModeOptions))) {
    const __VLS_291 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_292 = __VLS_asFunctionalComponent(__VLS_291, new __VLS_291({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_293 = __VLS_292({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_292));
}
var __VLS_290;
var __VLS_286;
const __VLS_295 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
    label: "服务类型",
}));
const __VLS_297 = __VLS_296({
    label: "服务类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_296));
__VLS_298.slots.default;
const __VLS_299 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_300 = __VLS_asFunctionalComponent(__VLS_299, new __VLS_299({
    modelValue: (__VLS_ctx.form.service_type),
    placeholder: "请选择服务类型",
    ...{ style: {} },
}));
const __VLS_301 = __VLS_300({
    modelValue: (__VLS_ctx.form.service_type),
    placeholder: "请选择服务类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_300));
__VLS_302.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.serviceTypeOptions))) {
    const __VLS_303 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_305 = __VLS_304({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_304));
}
var __VLS_302;
var __VLS_298;
const __VLS_307 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
    label: "备注",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_309 = __VLS_308({
    label: "备注",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_308));
__VLS_310.slots.default;
const __VLS_311 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (4),
    maxlength: "255",
    showWordLimit: true,
    placeholder: "可选，填写特殊要求或业务备注",
}));
const __VLS_313 = __VLS_312({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (4),
    maxlength: "255",
    showWordLimit: true,
    placeholder: "可选，填写特殊要求或业务备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_312));
var __VLS_310;
var __VLS_12;
{
    const { footer: __VLS_thisSlot } = __VLS_3.slots;
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
            __VLS_ctx.updateVisible(false);
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
        loading: (__VLS_ctx.submitting),
    }));
    const __VLS_325 = __VLS_324({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.submitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_324));
    let __VLS_327;
    let __VLS_328;
    let __VLS_329;
    const __VLS_330 = {
        onClick: (__VLS_ctx.submit)
    };
    __VLS_326.slots.default;
    var __VLS_326;
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['create-order-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-form']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head--inline']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['package-list']} */ ;
/** @type {__VLS_StyleScopedClasses['package-card']} */ ;
/** @type {__VLS_StyleScopedClasses['package-card__head']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid__wide']} */ ;
// @ts-ignore
var __VLS_14 = __VLS_13;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            transportModeOptions: transportModeOptions,
            serviceTypeOptions: serviceTypeOptions,
            formRef: formRef,
            submitting: submitting,
            customerLoading: customerLoading,
            customerOptions: customerOptions,
            form: form,
            rules: rules,
            updateVisible: updateVisible,
            addPackage: addPackage,
            removePackage: removePackage,
            formatCustomerLabel: formatCustomerLabel,
            loadCustomerOptions: loadCustomerOptions,
            submit: submit,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
