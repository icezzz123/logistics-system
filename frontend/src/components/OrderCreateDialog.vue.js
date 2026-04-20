import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
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
const authStore = useAuthStore();
const formRef = ref();
const submitting = ref(false);
const addressLoading = ref(false);
const hsSuggesting = ref(false);
const addressBookList = ref([]);
const hsSuggestion = ref(null);
const selectedSenderAddressId = ref();
const selectedReceiverAddressId = ref();
const quickSaveLoading = reactive({ sender: false, receiver: false });
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
    customs_declaration: '',
    hs_code: '',
    declared_value: 0,
    customs_duty: 0,
    customs_vat: 0,
    customs_other_tax: 0,
    packages: [],
    transport_mode: 3,
    service_type: 'standard',
    remark: '',
});
const form = reactive(createDefaultForm());
const rules = {
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
const canUseAddressBook = computed(() => Boolean(authStore.user?.id));
const senderAddressOptions = computed(() => addressBookList.value.filter((item) => item.address_type === 'sender'));
const receiverAddressOptions = computed(() => addressBookList.value.filter((item) => item.address_type === 'receiver'));
watch(() => props.modelValue, async (visible) => {
    if (!visible)
        return;
    Object.assign(form, createDefaultForm());
    hsSuggestion.value = null;
    clearAddressSelections();
    await loadAddressBook();
    nextTick(() => formRef.value?.clearValidate());
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
function clearAddressSelections() {
    selectedSenderAddressId.value = undefined;
    selectedReceiverAddressId.value = undefined;
}
function formatAddressBookLabel(item) {
    return `${item.label} · ${item.contact_name} · ${item.city}`;
}
async function loadAddressBook() {
    if (!authStore.user?.id) {
        addressBookList.value = [];
        clearAddressSelections();
        return;
    }
    addressLoading.value = true;
    try {
        const data = await http.get('/address-book');
        addressBookList.value = data.list || [];
        applyDefaultAddressesIfNeeded();
    }
    finally {
        addressLoading.value = false;
    }
}
function applyDefaultAddressesIfNeeded() {
    if (!form.sender_name && !form.sender_phone && !form.sender_address) {
        const senderDefault = senderAddressOptions.value.find((item) => item.is_default === 1);
        if (senderDefault) {
            selectedSenderAddressId.value = senderDefault.id;
            applyAddressToForm('sender', senderDefault);
        }
    }
    if (!form.receiver_name && !form.receiver_phone && !form.receiver_address) {
        const receiverDefault = receiverAddressOptions.value.find((item) => item.is_default === 1);
        if (receiverDefault) {
            selectedReceiverAddressId.value = receiverDefault.id;
            applyAddressToForm('receiver', receiverDefault);
        }
    }
}
function applySelectedAddress(type, value) {
    if (!value)
        return;
    const target = addressBookList.value.find((item) => item.id === value && item.address_type === type);
    if (!target)
        return;
    applyAddressToForm(type, target);
}
function applyAddressToForm(type, item) {
    if (type === 'sender') {
        form.sender_name = item.contact_name;
        form.sender_phone = item.contact_phone;
        form.sender_country = item.country;
        form.sender_province = item.province;
        form.sender_city = item.city;
        form.sender_address = item.address;
        form.sender_postcode = item.postcode;
        return;
    }
    form.receiver_name = item.contact_name;
    form.receiver_phone = item.contact_phone;
    form.receiver_country = item.country;
    form.receiver_province = item.province;
    form.receiver_city = item.city;
    form.receiver_address = item.address;
    form.receiver_postcode = item.postcode;
}
function buildQuickSavePayload(type) {
    const payload = {
        address_type: type,
        label: '',
        contact_name: '',
        contact_phone: '',
        country: '',
        province: '',
        city: '',
        address: '',
        postcode: '',
        remark: '',
        is_default: 0,
    };
    if (type === 'sender') {
        payload.contact_name = form.sender_name.trim();
        payload.contact_phone = form.sender_phone.trim();
        payload.country = form.sender_country.trim();
        payload.province = form.sender_province.trim();
        payload.city = form.sender_city.trim();
        payload.address = form.sender_address.trim();
        payload.postcode = form.sender_postcode.trim();
        payload.label = `${payload.contact_name || '发件人'}-${payload.city || '常用地址'}`;
        payload.is_default = senderAddressOptions.value.length === 0 ? 1 : 0;
        return payload;
    }
    payload.contact_name = form.receiver_name.trim();
    payload.contact_phone = form.receiver_phone.trim();
    payload.country = form.receiver_country.trim();
    payload.province = form.receiver_province.trim();
    payload.city = form.receiver_city.trim();
    payload.address = form.receiver_address.trim();
    payload.postcode = form.receiver_postcode.trim();
    payload.label = `${payload.contact_name || '收件人'}-${payload.city || '常用地址'}`;
    payload.is_default = receiverAddressOptions.value.length === 0 ? 1 : 0;
    return payload;
}
function validateQuickSavePayload(payload) {
    if (!payload.contact_name)
        throw new Error('请先填写联系人姓名');
    if (!payload.contact_phone)
        throw new Error('请先填写联系电话');
    if (!payload.country)
        throw new Error('请先填写国家');
    if (!payload.city)
        throw new Error('请先填写城市');
    if (!payload.address)
        throw new Error('请先填写详细地址');
}
async function saveCurrentAddress(type) {
    if (!canUseAddressBook.value) {
        ElMessage.warning('当前账号不可用，请重新登录后重试');
        return;
    }
    const payload = buildQuickSavePayload(type);
    try {
        validateQuickSavePayload(payload);
    }
    catch (error) {
        ElMessage.warning(error instanceof Error ? error.message : '地址信息不完整');
        return;
    }
    const prompt = await ElMessageBox.prompt('请输入地址标签，方便下次快速选择。', '保存到地址簿', {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: payload.label,
        inputPattern: /^.{1,50}$/,
        inputErrorMessage: '地址标签长度需在 1-50 个字符之间',
    }).catch(() => null);
    if (!prompt || !prompt.value)
        return;
    payload.label = prompt.value.trim();
    quickSaveLoading[type] = true;
    try {
        const data = await http.post('/address-book', payload);
        ElMessage.success('地址已保存到地址簿');
        await loadAddressBook();
        if (type === 'sender') {
            selectedSenderAddressId.value = data.id;
        }
        else {
            selectedReceiverAddressId.value = data.id;
        }
    }
    finally {
        quickSaveLoading[type] = false;
    }
}
async function suggestHSCode() {
    hsSuggesting.value = true;
    try {
        const data = await http.post('/orders/hs-suggest', {
            goods_name: form.goods_name.trim(),
            goods_category: form.goods_category.trim(),
            customs_declaration: form.customs_declaration.trim(),
            packages: form.packages
                .map((item) => ({
                parcel_no: item.parcel_no.trim(),
                goods_name: item.goods_name.trim(),
                goods_category: item.goods_category.trim(),
                weight: Number(item.weight),
                volume: Number(item.volume),
                quantity: Number(item.quantity),
                goods_value: Number(item.goods_value),
                remark: item.remark.trim(),
            }))
                .filter((item) => item.goods_name),
        });
        hsSuggestion.value = data;
        if (data.suggestion) {
            form.hs_code = data.suggestion.hs_code;
            if (!form.customs_declaration.trim()) {
                form.customs_declaration = data.suggestion.customs_declaration;
            }
            ElMessage.success(`已匹配 HS Code：${data.suggestion.hs_code}`);
        }
        else {
            ElMessage.warning(data.note || '未匹配到常见 HS Code');
        }
    }
    finally {
        hsSuggesting.value = false;
    }
}
async function submit() {
    if (!formRef.value)
        return;
    const valid = await formRef.value.validate().catch(() => false);
    if (!valid)
        return;
    if (!authStore.user?.id) {
        ElMessage.warning('当前账号不可用，请重新登录后重试');
        return;
    }
    submitting.value = true;
    try {
        const payload = {
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
            customs_declaration: form.customs_declaration.trim(),
            hs_code: form.hs_code.trim(),
            declared_value: Number(form.declared_value),
            customs_duty: Number(form.customs_duty),
            customs_vat: Number(form.customs_vat),
            customs_other_tax: Number(form.customs_other_tax),
            packages: form.packages
                .map((item) => ({
                parcel_no: item.parcel_no.trim(),
                goods_name: item.goods_name.trim(),
                goods_category: item.goods_category.trim(),
                weight: Number(item.weight),
                volume: Number(item.volume),
                quantity: Number(item.quantity),
                goods_value: Number(item.goods_value),
                remark: item.remark.trim(),
            }))
                .filter((item) => item.goods_name),
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
/** @type {__VLS_StyleScopedClasses['create-order-section__head--inline']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__select']} */ ;
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
    ...{ class: "create-order-section__head create-order-section__head--inline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__actions" },
});
const __VLS_15 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedSenderAddressId),
    clearable: true,
    filterable: true,
    placeholder: "选择常用发件地址",
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.addressLoading),
    ...{ class: "create-order-section__select" },
}));
const __VLS_17 = __VLS_16({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedSenderAddressId),
    clearable: true,
    filterable: true,
    placeholder: "选择常用发件地址",
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.addressLoading),
    ...{ class: "create-order-section__select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_19;
let __VLS_20;
let __VLS_21;
const __VLS_22 = {
    onChange: (...[$event]) => {
        __VLS_ctx.applySelectedAddress('sender', $event);
    }
};
__VLS_18.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.senderAddressOptions))) {
    const __VLS_23 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        key: (item.id),
        label: (__VLS_ctx.formatAddressBookLabel(item)),
        value: (item.id),
    }));
    const __VLS_25 = __VLS_24({
        key: (item.id),
        label: (__VLS_ctx.formatAddressBookLabel(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
}
var __VLS_18;
const __VLS_27 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
    ...{ 'onClick': {} },
    plain: true,
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.quickSaveLoading.sender),
}));
const __VLS_29 = __VLS_28({
    ...{ 'onClick': {} },
    plain: true,
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.quickSaveLoading.sender),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
let __VLS_31;
let __VLS_32;
let __VLS_33;
const __VLS_34 = {
    onClick: (...[$event]) => {
        __VLS_ctx.saveCurrentAddress('sender');
    }
};
__VLS_30.slots.default;
var __VLS_30;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_35 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    label: "发件人",
    prop: "sender_name",
}));
const __VLS_37 = __VLS_36({
    label: "发件人",
    prop: "sender_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_38.slots.default;
const __VLS_39 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    modelValue: (__VLS_ctx.form.sender_name),
    placeholder: "请输入发件人姓名",
}));
const __VLS_41 = __VLS_40({
    modelValue: (__VLS_ctx.form.sender_name),
    placeholder: "请输入发件人姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
var __VLS_38;
const __VLS_43 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    label: "手机号",
    prop: "sender_phone",
}));
const __VLS_45 = __VLS_44({
    label: "手机号",
    prop: "sender_phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_46.slots.default;
const __VLS_47 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    modelValue: (__VLS_ctx.form.sender_phone),
    placeholder: "请输入发件人手机号",
}));
const __VLS_49 = __VLS_48({
    modelValue: (__VLS_ctx.form.sender_phone),
    placeholder: "请输入发件人手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
var __VLS_46;
const __VLS_51 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
    label: "国家",
    prop: "sender_country",
}));
const __VLS_53 = __VLS_52({
    label: "国家",
    prop: "sender_country",
}, ...__VLS_functionalComponentArgsRest(__VLS_52));
__VLS_54.slots.default;
const __VLS_55 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
    modelValue: (__VLS_ctx.form.sender_country),
    placeholder: "如：中国",
}));
const __VLS_57 = __VLS_56({
    modelValue: (__VLS_ctx.form.sender_country),
    placeholder: "如：中国",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
var __VLS_54;
const __VLS_59 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
    label: "省份",
}));
const __VLS_61 = __VLS_60({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
__VLS_62.slots.default;
const __VLS_63 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
    modelValue: (__VLS_ctx.form.sender_province),
    placeholder: "可选",
}));
const __VLS_65 = __VLS_64({
    modelValue: (__VLS_ctx.form.sender_province),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_64));
var __VLS_62;
const __VLS_67 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    label: "城市",
    prop: "sender_city",
}));
const __VLS_69 = __VLS_68({
    label: "城市",
    prop: "sender_city",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
const __VLS_71 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    modelValue: (__VLS_ctx.form.sender_city),
    placeholder: "请输入发件城市",
}));
const __VLS_73 = __VLS_72({
    modelValue: (__VLS_ctx.form.sender_city),
    placeholder: "请输入发件城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
var __VLS_70;
const __VLS_75 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    label: "邮编",
}));
const __VLS_77 = __VLS_76({
    label: "邮编",
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
__VLS_78.slots.default;
const __VLS_79 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
    modelValue: (__VLS_ctx.form.sender_postcode),
    placeholder: "可选",
}));
const __VLS_81 = __VLS_80({
    modelValue: (__VLS_ctx.form.sender_postcode),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
var __VLS_78;
const __VLS_83 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    label: "详细地址",
    prop: "sender_address",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_85 = __VLS_84({
    label: "详细地址",
    prop: "sender_address",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
__VLS_86.slots.default;
const __VLS_87 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
    modelValue: (__VLS_ctx.form.sender_address),
    placeholder: "请输入发件详细地址",
}));
const __VLS_89 = __VLS_88({
    modelValue: (__VLS_ctx.form.sender_address),
    placeholder: "请输入发件详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_88));
var __VLS_86;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-section__actions" },
});
const __VLS_91 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedReceiverAddressId),
    clearable: true,
    filterable: true,
    placeholder: "选择常用收件地址",
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.addressLoading),
    ...{ class: "create-order-section__select" },
}));
const __VLS_93 = __VLS_92({
    ...{ 'onChange': {} },
    modelValue: (__VLS_ctx.selectedReceiverAddressId),
    clearable: true,
    filterable: true,
    placeholder: "选择常用收件地址",
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.addressLoading),
    ...{ class: "create-order-section__select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
let __VLS_95;
let __VLS_96;
let __VLS_97;
const __VLS_98 = {
    onChange: (...[$event]) => {
        __VLS_ctx.applySelectedAddress('receiver', $event);
    }
};
__VLS_94.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.receiverAddressOptions))) {
    const __VLS_99 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        key: (item.id),
        label: (__VLS_ctx.formatAddressBookLabel(item)),
        value: (item.id),
    }));
    const __VLS_101 = __VLS_100({
        key: (item.id),
        label: (__VLS_ctx.formatAddressBookLabel(item)),
        value: (item.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
}
var __VLS_94;
const __VLS_103 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
    ...{ 'onClick': {} },
    plain: true,
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.quickSaveLoading.receiver),
}));
const __VLS_105 = __VLS_104({
    ...{ 'onClick': {} },
    plain: true,
    disabled: (!__VLS_ctx.canUseAddressBook),
    loading: (__VLS_ctx.quickSaveLoading.receiver),
}, ...__VLS_functionalComponentArgsRest(__VLS_104));
let __VLS_107;
let __VLS_108;
let __VLS_109;
const __VLS_110 = {
    onClick: (...[$event]) => {
        __VLS_ctx.saveCurrentAddress('receiver');
    }
};
__VLS_106.slots.default;
var __VLS_106;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_111 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
    label: "收件人",
    prop: "receiver_name",
}));
const __VLS_113 = __VLS_112({
    label: "收件人",
    prop: "receiver_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_112));
__VLS_114.slots.default;
const __VLS_115 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
    modelValue: (__VLS_ctx.form.receiver_name),
    placeholder: "请输入收件人姓名",
}));
const __VLS_117 = __VLS_116({
    modelValue: (__VLS_ctx.form.receiver_name),
    placeholder: "请输入收件人姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
var __VLS_114;
const __VLS_119 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
    label: "手机号",
    prop: "receiver_phone",
}));
const __VLS_121 = __VLS_120({
    label: "手机号",
    prop: "receiver_phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_120));
__VLS_122.slots.default;
const __VLS_123 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
    modelValue: (__VLS_ctx.form.receiver_phone),
    placeholder: "请输入收件人手机号",
}));
const __VLS_125 = __VLS_124({
    modelValue: (__VLS_ctx.form.receiver_phone),
    placeholder: "请输入收件人手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_124));
var __VLS_122;
const __VLS_127 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_128 = __VLS_asFunctionalComponent(__VLS_127, new __VLS_127({
    label: "国家",
    prop: "receiver_country",
}));
const __VLS_129 = __VLS_128({
    label: "国家",
    prop: "receiver_country",
}, ...__VLS_functionalComponentArgsRest(__VLS_128));
__VLS_130.slots.default;
const __VLS_131 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
    modelValue: (__VLS_ctx.form.receiver_country),
    placeholder: "如：美国",
}));
const __VLS_133 = __VLS_132({
    modelValue: (__VLS_ctx.form.receiver_country),
    placeholder: "如：美国",
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
var __VLS_130;
const __VLS_135 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_136 = __VLS_asFunctionalComponent(__VLS_135, new __VLS_135({
    label: "省份",
}));
const __VLS_137 = __VLS_136({
    label: "省份",
}, ...__VLS_functionalComponentArgsRest(__VLS_136));
__VLS_138.slots.default;
const __VLS_139 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_140 = __VLS_asFunctionalComponent(__VLS_139, new __VLS_139({
    modelValue: (__VLS_ctx.form.receiver_province),
    placeholder: "可选",
}));
const __VLS_141 = __VLS_140({
    modelValue: (__VLS_ctx.form.receiver_province),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_140));
var __VLS_138;
const __VLS_143 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_144 = __VLS_asFunctionalComponent(__VLS_143, new __VLS_143({
    label: "城市",
    prop: "receiver_city",
}));
const __VLS_145 = __VLS_144({
    label: "城市",
    prop: "receiver_city",
}, ...__VLS_functionalComponentArgsRest(__VLS_144));
__VLS_146.slots.default;
const __VLS_147 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_148 = __VLS_asFunctionalComponent(__VLS_147, new __VLS_147({
    modelValue: (__VLS_ctx.form.receiver_city),
    placeholder: "请输入收件城市",
}));
const __VLS_149 = __VLS_148({
    modelValue: (__VLS_ctx.form.receiver_city),
    placeholder: "请输入收件城市",
}, ...__VLS_functionalComponentArgsRest(__VLS_148));
var __VLS_146;
const __VLS_151 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_152 = __VLS_asFunctionalComponent(__VLS_151, new __VLS_151({
    label: "邮编",
}));
const __VLS_153 = __VLS_152({
    label: "邮编",
}, ...__VLS_functionalComponentArgsRest(__VLS_152));
__VLS_154.slots.default;
const __VLS_155 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_156 = __VLS_asFunctionalComponent(__VLS_155, new __VLS_155({
    modelValue: (__VLS_ctx.form.receiver_postcode),
    placeholder: "可选",
}));
const __VLS_157 = __VLS_156({
    modelValue: (__VLS_ctx.form.receiver_postcode),
    placeholder: "可选",
}, ...__VLS_functionalComponentArgsRest(__VLS_156));
var __VLS_154;
const __VLS_159 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_160 = __VLS_asFunctionalComponent(__VLS_159, new __VLS_159({
    label: "详细地址",
    prop: "receiver_address",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_161 = __VLS_160({
    label: "详细地址",
    prop: "receiver_address",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_160));
__VLS_162.slots.default;
const __VLS_163 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_164 = __VLS_asFunctionalComponent(__VLS_163, new __VLS_163({
    modelValue: (__VLS_ctx.form.receiver_address),
    placeholder: "请输入收件详细地址",
}));
const __VLS_165 = __VLS_164({
    modelValue: (__VLS_ctx.form.receiver_address),
    placeholder: "请输入收件详细地址",
}, ...__VLS_functionalComponentArgsRest(__VLS_164));
var __VLS_162;
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
const __VLS_167 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_168 = __VLS_asFunctionalComponent(__VLS_167, new __VLS_167({
    label: "货物名称",
    prop: "goods_name",
}));
const __VLS_169 = __VLS_168({
    label: "货物名称",
    prop: "goods_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_168));
__VLS_170.slots.default;
const __VLS_171 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_172 = __VLS_asFunctionalComponent(__VLS_171, new __VLS_171({
    modelValue: (__VLS_ctx.form.goods_name),
    placeholder: "请输入货物名称",
}));
const __VLS_173 = __VLS_172({
    modelValue: (__VLS_ctx.form.goods_name),
    placeholder: "请输入货物名称",
}, ...__VLS_functionalComponentArgsRest(__VLS_172));
var __VLS_170;
const __VLS_175 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_176 = __VLS_asFunctionalComponent(__VLS_175, new __VLS_175({
    label: "货物分类",
}));
const __VLS_177 = __VLS_176({
    label: "货物分类",
}, ...__VLS_functionalComponentArgsRest(__VLS_176));
__VLS_178.slots.default;
const __VLS_179 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_180 = __VLS_asFunctionalComponent(__VLS_179, new __VLS_179({
    modelValue: (__VLS_ctx.form.goods_category),
    placeholder: "如：文件 / 服装 / 电子产品",
}));
const __VLS_181 = __VLS_180({
    modelValue: (__VLS_ctx.form.goods_category),
    placeholder: "如：文件 / 服装 / 电子产品",
}, ...__VLS_functionalComponentArgsRest(__VLS_180));
var __VLS_178;
const __VLS_183 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
    label: "重量(kg)",
    prop: "goods_weight",
}));
const __VLS_185 = __VLS_184({
    label: "重量(kg)",
    prop: "goods_weight",
}, ...__VLS_functionalComponentArgsRest(__VLS_184));
__VLS_186.slots.default;
const __VLS_187 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
    modelValue: (__VLS_ctx.form.goods_weight),
    min: (0.1),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_189 = __VLS_188({
    modelValue: (__VLS_ctx.form.goods_weight),
    min: (0.1),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_188));
var __VLS_186;
const __VLS_191 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
    label: "体积(m³)",
}));
const __VLS_193 = __VLS_192({
    label: "体积(m³)",
}, ...__VLS_functionalComponentArgsRest(__VLS_192));
__VLS_194.slots.default;
const __VLS_195 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
    modelValue: (__VLS_ctx.form.goods_volume),
    min: (0),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_197 = __VLS_196({
    modelValue: (__VLS_ctx.form.goods_volume),
    min: (0),
    step: (0.1),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_196));
var __VLS_194;
const __VLS_199 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
    label: "件数",
}));
const __VLS_201 = __VLS_200({
    label: "件数",
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
__VLS_202.slots.default;
const __VLS_203 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
    modelValue: (__VLS_ctx.form.goods_quantity),
    min: (1),
    step: (1),
    ...{ style: {} },
}));
const __VLS_205 = __VLS_204({
    modelValue: (__VLS_ctx.form.goods_quantity),
    min: (1),
    step: (1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
var __VLS_202;
const __VLS_207 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
    label: "货值",
}));
const __VLS_209 = __VLS_208({
    label: "货值",
}, ...__VLS_functionalComponentArgsRest(__VLS_208));
__VLS_210.slots.default;
const __VLS_211 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
    modelValue: (__VLS_ctx.form.goods_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_213 = __VLS_212({
    modelValue: (__VLS_ctx.form.goods_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
var __VLS_210;
const __VLS_215 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
    label: "是否投保",
}));
const __VLS_217 = __VLS_216({
    label: "是否投保",
}, ...__VLS_functionalComponentArgsRest(__VLS_216));
__VLS_218.slots.default;
const __VLS_219 = {}.ElSwitch;
/** @type {[typeof __VLS_components.ElSwitch, typeof __VLS_components.elSwitch, ]} */ ;
// @ts-ignore
const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
    modelValue: (__VLS_ctx.form.is_insured),
    inactiveValue: (0),
    activeValue: (1),
}));
const __VLS_221 = __VLS_220({
    modelValue: (__VLS_ctx.form.is_insured),
    inactiveValue: (0),
    activeValue: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_220));
var __VLS_218;
const __VLS_223 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
    label: "保价金额",
    prop: "insured_amount",
}));
const __VLS_225 = __VLS_224({
    label: "保价金额",
    prop: "insured_amount",
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
__VLS_226.slots.default;
const __VLS_227 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
    modelValue: (__VLS_ctx.form.insured_amount),
    min: (0),
    step: (100),
    precision: (2),
    disabled: (__VLS_ctx.form.is_insured !== 1),
    ...{ style: {} },
}));
const __VLS_229 = __VLS_228({
    modelValue: (__VLS_ctx.form.insured_amount),
    min: (0),
    step: (100),
    precision: (2),
    disabled: (__VLS_ctx.form.is_insured !== 1),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_228));
var __VLS_226;
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
const __VLS_231 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
    ...{ 'onClick': {} },
    plain: true,
    loading: (__VLS_ctx.hsSuggesting),
}));
const __VLS_233 = __VLS_232({
    ...{ 'onClick': {} },
    plain: true,
    loading: (__VLS_ctx.hsSuggesting),
}, ...__VLS_functionalComponentArgsRest(__VLS_232));
let __VLS_235;
let __VLS_236;
let __VLS_237;
const __VLS_238 = {
    onClick: (__VLS_ctx.suggestHSCode)
};
__VLS_234.slots.default;
var __VLS_234;
if (__VLS_ctx.hsSuggestion?.suggestion) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "create-order-tip" },
    });
    (__VLS_ctx.hsSuggestion.suggestion.hs_code);
    (__VLS_ctx.hsSuggestion.suggestion.customs_declaration);
    if (__VLS_ctx.hsSuggestion.suggestion.reason) {
        (__VLS_ctx.hsSuggestion.suggestion.reason);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "create-order-grid" },
});
const __VLS_239 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_240 = __VLS_asFunctionalComponent(__VLS_239, new __VLS_239({
    label: "申报品名",
}));
const __VLS_241 = __VLS_240({
    label: "申报品名",
}, ...__VLS_functionalComponentArgsRest(__VLS_240));
__VLS_242.slots.default;
const __VLS_243 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
    modelValue: (__VLS_ctx.form.customs_declaration),
    placeholder: "如：服装 / 电子配件",
}));
const __VLS_245 = __VLS_244({
    modelValue: (__VLS_ctx.form.customs_declaration),
    placeholder: "如：服装 / 电子配件",
}, ...__VLS_functionalComponentArgsRest(__VLS_244));
var __VLS_242;
const __VLS_247 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_248 = __VLS_asFunctionalComponent(__VLS_247, new __VLS_247({
    label: "HS Code",
}));
const __VLS_249 = __VLS_248({
    label: "HS Code",
}, ...__VLS_functionalComponentArgsRest(__VLS_248));
__VLS_250.slots.default;
const __VLS_251 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.form.hs_code),
    placeholder: "请输入 HS Code",
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.form.hs_code),
    placeholder: "请输入 HS Code",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
var __VLS_250;
const __VLS_255 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    label: "申报价值",
}));
const __VLS_257 = __VLS_256({
    label: "申报价值",
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
__VLS_258.slots.default;
const __VLS_259 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_260 = __VLS_asFunctionalComponent(__VLS_259, new __VLS_259({
    modelValue: (__VLS_ctx.form.declared_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_261 = __VLS_260({
    modelValue: (__VLS_ctx.form.declared_value),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_260));
var __VLS_258;
const __VLS_263 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_264 = __VLS_asFunctionalComponent(__VLS_263, new __VLS_263({
    label: "关税",
}));
const __VLS_265 = __VLS_264({
    label: "关税",
}, ...__VLS_functionalComponentArgsRest(__VLS_264));
__VLS_266.slots.default;
const __VLS_267 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_268 = __VLS_asFunctionalComponent(__VLS_267, new __VLS_267({
    modelValue: (__VLS_ctx.form.customs_duty),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_269 = __VLS_268({
    modelValue: (__VLS_ctx.form.customs_duty),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_268));
var __VLS_266;
const __VLS_271 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_272 = __VLS_asFunctionalComponent(__VLS_271, new __VLS_271({
    label: "增值税",
}));
const __VLS_273 = __VLS_272({
    label: "增值税",
}, ...__VLS_functionalComponentArgsRest(__VLS_272));
__VLS_274.slots.default;
const __VLS_275 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_276 = __VLS_asFunctionalComponent(__VLS_275, new __VLS_275({
    modelValue: (__VLS_ctx.form.customs_vat),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_277 = __VLS_276({
    modelValue: (__VLS_ctx.form.customs_vat),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_276));
var __VLS_274;
const __VLS_279 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_280 = __VLS_asFunctionalComponent(__VLS_279, new __VLS_279({
    label: "其他税费",
}));
const __VLS_281 = __VLS_280({
    label: "其他税费",
}, ...__VLS_functionalComponentArgsRest(__VLS_280));
__VLS_282.slots.default;
const __VLS_283 = {}.ElInputNumber;
/** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
// @ts-ignore
const __VLS_284 = __VLS_asFunctionalComponent(__VLS_283, new __VLS_283({
    modelValue: (__VLS_ctx.form.customs_other_tax),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}));
const __VLS_285 = __VLS_284({
    modelValue: (__VLS_ctx.form.customs_other_tax),
    min: (0),
    step: (10),
    precision: (2),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_284));
var __VLS_282;
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
const __VLS_287 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_288 = __VLS_asFunctionalComponent(__VLS_287, new __VLS_287({
    ...{ 'onClick': {} },
    type: "primary",
    plain: true,
}));
const __VLS_289 = __VLS_288({
    ...{ 'onClick': {} },
    type: "primary",
    plain: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_288));
let __VLS_291;
let __VLS_292;
let __VLS_293;
const __VLS_294 = {
    onClick: (__VLS_ctx.addPackage)
};
__VLS_290.slots.default;
var __VLS_290;
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
        const __VLS_295 = {}.ElButton;
        /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
        // @ts-ignore
        const __VLS_296 = __VLS_asFunctionalComponent(__VLS_295, new __VLS_295({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }));
        const __VLS_297 = __VLS_296({
            ...{ 'onClick': {} },
            link: true,
            type: "danger",
        }, ...__VLS_functionalComponentArgsRest(__VLS_296));
        let __VLS_299;
        let __VLS_300;
        let __VLS_301;
        const __VLS_302 = {
            onClick: (...[$event]) => {
                if (!(__VLS_ctx.form.packages.length))
                    return;
                __VLS_ctx.removePackage(index);
            }
        };
        __VLS_298.slots.default;
        var __VLS_298;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "create-order-grid" },
        });
        const __VLS_303 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_304 = __VLS_asFunctionalComponent(__VLS_303, new __VLS_303({
            label: "包裹号",
        }));
        const __VLS_305 = __VLS_304({
            label: "包裹号",
        }, ...__VLS_functionalComponentArgsRest(__VLS_304));
        __VLS_306.slots.default;
        const __VLS_307 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_308 = __VLS_asFunctionalComponent(__VLS_307, new __VLS_307({
            modelValue: (item.parcel_no),
            placeholder: "可选，不填则自动生成",
        }));
        const __VLS_309 = __VLS_308({
            modelValue: (item.parcel_no),
            placeholder: "可选，不填则自动生成",
        }, ...__VLS_functionalComponentArgsRest(__VLS_308));
        var __VLS_306;
        const __VLS_311 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_312 = __VLS_asFunctionalComponent(__VLS_311, new __VLS_311({
            label: "货物名称",
        }));
        const __VLS_313 = __VLS_312({
            label: "货物名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_312));
        __VLS_314.slots.default;
        const __VLS_315 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_316 = __VLS_asFunctionalComponent(__VLS_315, new __VLS_315({
            modelValue: (item.goods_name),
            placeholder: "请输入包裹货物名称",
        }));
        const __VLS_317 = __VLS_316({
            modelValue: (item.goods_name),
            placeholder: "请输入包裹货物名称",
        }, ...__VLS_functionalComponentArgsRest(__VLS_316));
        var __VLS_314;
        const __VLS_319 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_320 = __VLS_asFunctionalComponent(__VLS_319, new __VLS_319({
            label: "货物分类",
        }));
        const __VLS_321 = __VLS_320({
            label: "货物分类",
        }, ...__VLS_functionalComponentArgsRest(__VLS_320));
        __VLS_322.slots.default;
        const __VLS_323 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_324 = __VLS_asFunctionalComponent(__VLS_323, new __VLS_323({
            modelValue: (item.goods_category),
            placeholder: "如：服装 / 文件",
        }));
        const __VLS_325 = __VLS_324({
            modelValue: (item.goods_category),
            placeholder: "如：服装 / 文件",
        }, ...__VLS_functionalComponentArgsRest(__VLS_324));
        var __VLS_322;
        const __VLS_327 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_328 = __VLS_asFunctionalComponent(__VLS_327, new __VLS_327({
            label: "重量(kg)",
        }));
        const __VLS_329 = __VLS_328({
            label: "重量(kg)",
        }, ...__VLS_functionalComponentArgsRest(__VLS_328));
        __VLS_330.slots.default;
        const __VLS_331 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_332 = __VLS_asFunctionalComponent(__VLS_331, new __VLS_331({
            modelValue: (item.weight),
            min: (0.1),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }));
        const __VLS_333 = __VLS_332({
            modelValue: (item.weight),
            min: (0.1),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_332));
        var __VLS_330;
        const __VLS_335 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_336 = __VLS_asFunctionalComponent(__VLS_335, new __VLS_335({
            label: "体积(m³)",
        }));
        const __VLS_337 = __VLS_336({
            label: "体积(m³)",
        }, ...__VLS_functionalComponentArgsRest(__VLS_336));
        __VLS_338.slots.default;
        const __VLS_339 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_340 = __VLS_asFunctionalComponent(__VLS_339, new __VLS_339({
            modelValue: (item.volume),
            min: (0),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }));
        const __VLS_341 = __VLS_340({
            modelValue: (item.volume),
            min: (0),
            step: (0.1),
            precision: (2),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_340));
        var __VLS_338;
        const __VLS_343 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_344 = __VLS_asFunctionalComponent(__VLS_343, new __VLS_343({
            label: "件数",
        }));
        const __VLS_345 = __VLS_344({
            label: "件数",
        }, ...__VLS_functionalComponentArgsRest(__VLS_344));
        __VLS_346.slots.default;
        const __VLS_347 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_348 = __VLS_asFunctionalComponent(__VLS_347, new __VLS_347({
            modelValue: (item.quantity),
            min: (1),
            step: (1),
            ...{ style: {} },
        }));
        const __VLS_349 = __VLS_348({
            modelValue: (item.quantity),
            min: (1),
            step: (1),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_348));
        var __VLS_346;
        const __VLS_351 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_352 = __VLS_asFunctionalComponent(__VLS_351, new __VLS_351({
            label: "货值",
        }));
        const __VLS_353 = __VLS_352({
            label: "货值",
        }, ...__VLS_functionalComponentArgsRest(__VLS_352));
        __VLS_354.slots.default;
        const __VLS_355 = {}.ElInputNumber;
        /** @type {[typeof __VLS_components.ElInputNumber, typeof __VLS_components.elInputNumber, ]} */ ;
        // @ts-ignore
        const __VLS_356 = __VLS_asFunctionalComponent(__VLS_355, new __VLS_355({
            modelValue: (item.goods_value),
            min: (0),
            step: (10),
            precision: (2),
            ...{ style: {} },
        }));
        const __VLS_357 = __VLS_356({
            modelValue: (item.goods_value),
            min: (0),
            step: (10),
            precision: (2),
            ...{ style: {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_356));
        var __VLS_354;
        const __VLS_359 = {}.ElFormItem;
        /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
        // @ts-ignore
        const __VLS_360 = __VLS_asFunctionalComponent(__VLS_359, new __VLS_359({
            label: "备注",
            ...{ class: "create-order-grid__wide" },
        }));
        const __VLS_361 = __VLS_360({
            label: "备注",
            ...{ class: "create-order-grid__wide" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_360));
        __VLS_362.slots.default;
        const __VLS_363 = {}.ElInput;
        /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
        // @ts-ignore
        const __VLS_364 = __VLS_asFunctionalComponent(__VLS_363, new __VLS_363({
            modelValue: (item.remark),
            maxlength: "120",
            placeholder: "可选，填写包裹备注",
        }));
        const __VLS_365 = __VLS_364({
            modelValue: (item.remark),
            maxlength: "120",
            placeholder: "可选，填写包裹备注",
        }, ...__VLS_functionalComponentArgsRest(__VLS_364));
        var __VLS_362;
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
const __VLS_367 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_368 = __VLS_asFunctionalComponent(__VLS_367, new __VLS_367({
    label: "运输方式",
    prop: "transport_mode",
}));
const __VLS_369 = __VLS_368({
    label: "运输方式",
    prop: "transport_mode",
}, ...__VLS_functionalComponentArgsRest(__VLS_368));
__VLS_370.slots.default;
const __VLS_371 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_372 = __VLS_asFunctionalComponent(__VLS_371, new __VLS_371({
    modelValue: (__VLS_ctx.form.transport_mode),
    placeholder: "请选择运输方式",
    ...{ style: {} },
}));
const __VLS_373 = __VLS_372({
    modelValue: (__VLS_ctx.form.transport_mode),
    placeholder: "请选择运输方式",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_372));
__VLS_374.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.transportModeOptions))) {
    const __VLS_375 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_376 = __VLS_asFunctionalComponent(__VLS_375, new __VLS_375({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_377 = __VLS_376({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_376));
}
var __VLS_374;
var __VLS_370;
const __VLS_379 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_380 = __VLS_asFunctionalComponent(__VLS_379, new __VLS_379({
    label: "服务类型",
}));
const __VLS_381 = __VLS_380({
    label: "服务类型",
}, ...__VLS_functionalComponentArgsRest(__VLS_380));
__VLS_382.slots.default;
const __VLS_383 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_384 = __VLS_asFunctionalComponent(__VLS_383, new __VLS_383({
    modelValue: (__VLS_ctx.form.service_type),
    placeholder: "请选择服务类型",
    ...{ style: {} },
}));
const __VLS_385 = __VLS_384({
    modelValue: (__VLS_ctx.form.service_type),
    placeholder: "请选择服务类型",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_384));
__VLS_386.slots.default;
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.serviceTypeOptions))) {
    const __VLS_387 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_388 = __VLS_asFunctionalComponent(__VLS_387, new __VLS_387({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }));
    const __VLS_389 = __VLS_388({
        key: (item.value),
        label: (item.label),
        value: (item.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_388));
}
var __VLS_386;
var __VLS_382;
const __VLS_391 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_392 = __VLS_asFunctionalComponent(__VLS_391, new __VLS_391({
    label: "备注",
    ...{ class: "create-order-grid__wide" },
}));
const __VLS_393 = __VLS_392({
    label: "备注",
    ...{ class: "create-order-grid__wide" },
}, ...__VLS_functionalComponentArgsRest(__VLS_392));
__VLS_394.slots.default;
const __VLS_395 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_396 = __VLS_asFunctionalComponent(__VLS_395, new __VLS_395({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (4),
    maxlength: "255",
    showWordLimit: true,
    placeholder: "可选，填写特殊要求或业务备注",
}));
const __VLS_397 = __VLS_396({
    modelValue: (__VLS_ctx.form.remark),
    type: "textarea",
    rows: (4),
    maxlength: "255",
    showWordLimit: true,
    placeholder: "可选，填写特殊要求或业务备注",
}, ...__VLS_functionalComponentArgsRest(__VLS_396));
var __VLS_394;
var __VLS_12;
{
    const { footer: __VLS_thisSlot } = __VLS_3.slots;
    const __VLS_399 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_400 = __VLS_asFunctionalComponent(__VLS_399, new __VLS_399({
        ...{ 'onClick': {} },
    }));
    const __VLS_401 = __VLS_400({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_400));
    let __VLS_403;
    let __VLS_404;
    let __VLS_405;
    const __VLS_406 = {
        onClick: (...[$event]) => {
            __VLS_ctx.updateVisible(false);
        }
    };
    __VLS_402.slots.default;
    var __VLS_402;
    const __VLS_407 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_408 = __VLS_asFunctionalComponent(__VLS_407, new __VLS_407({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.submitting),
    }));
    const __VLS_409 = __VLS_408({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.submitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_408));
    let __VLS_411;
    let __VLS_412;
    let __VLS_413;
    const __VLS_414 = {
        onClick: (__VLS_ctx.submit)
    };
    __VLS_410.slots.default;
    var __VLS_410;
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['create-order-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-form']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head--inline']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__select']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-grid__wide']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__head--inline']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['create-order-section__select']} */ ;
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
            addressLoading: addressLoading,
            hsSuggesting: hsSuggesting,
            hsSuggestion: hsSuggestion,
            selectedSenderAddressId: selectedSenderAddressId,
            selectedReceiverAddressId: selectedReceiverAddressId,
            quickSaveLoading: quickSaveLoading,
            form: form,
            rules: rules,
            canUseAddressBook: canUseAddressBook,
            senderAddressOptions: senderAddressOptions,
            receiverAddressOptions: receiverAddressOptions,
            updateVisible: updateVisible,
            addPackage: addPackage,
            removePackage: removePackage,
            formatAddressBookLabel: formatAddressBookLabel,
            applySelectedAddress: applySelectedAddress,
            saveCurrentAddress: saveCurrentAddress,
            suggestHSCode: suggestHSCode,
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
