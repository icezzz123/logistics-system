import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AddressBookManager from '@/components/AddressBookManager.vue';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
const profile = reactive({ id: 0, username: '', email: '', phone: '', real_name: '', role: 0, status: 1, ctime: 0, mtime: 0 });
const permissions = ref([]);
const roleName = ref('未知角色');
const editDialogVisible = ref(false);
const passwordDialogVisible = ref(false);
const editSubmitting = ref(false);
const passwordSubmitting = ref(false);
const editFormRef = ref();
const editForm = reactive({ real_name: '', phone: '', email: '' });
const editRules = { email: [{ validator: validateEmail, trigger: 'blur' }] };
const passwordFormRef = ref();
const passwordForm = reactive({ old_password: '', new_password: '', confirm_password: '' });
const passwordRules = { old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }], new_password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '新密码至少 6 位', trigger: 'blur' }], confirm_password: [{ validator: validateConfirmPassword, trigger: 'blur' }] };
const displayName = computed(() => normalizeText(profile.real_name, profile.username));
function normalizeText(value, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text))
    return fallback; return text; }
function formatUnix(value) { if (!value)
    return '-'; const date = new Date(value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }); }
function validateEmail(_rule, value, callback) { if (!value) {
    callback();
    return;
} callback(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : new Error('邮箱格式不正确')); }
function validateConfirmPassword(_rule, value, callback) { if (!value) {
    callback(new Error('请确认新密码'));
    return;
} callback(value === passwordForm.new_password ? undefined : new Error('两次输入的新密码不一致')); }
async function loadProfile() { const data = await http.get('/profile'); Object.assign(profile, data); authStore.user = { ...(authStore.user || {}), ...data }; }
async function loadPermissions() { const data = await http.get('/permissions'); permissions.value = data.permissions || []; roleName.value = data.role_name || '未知角色'; authStore.permissions = permissions.value; }
function openEditDialog() { editForm.real_name = profile.real_name || ''; editForm.phone = profile.phone || ''; editForm.email = profile.email || ''; editDialogVisible.value = true; editFormRef.value?.clearValidate(); }
async function submitEdit() { if (!editFormRef.value)
    return; const valid = await editFormRef.value.validate().catch(() => false); if (!valid)
    return; editSubmitting.value = true; try {
    await http.put(`/users/${profile.id}`, { real_name: editForm.real_name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim() });
    ElMessage.success('个人资料已更新');
    editDialogVisible.value = false;
    await loadProfile();
}
finally {
    editSubmitting.value = false;
} }
function openPasswordDialog() { passwordForm.old_password = ''; passwordForm.new_password = ''; passwordForm.confirm_password = ''; passwordDialogVisible.value = true; passwordFormRef.value?.clearValidate(); }
async function submitPassword() { if (!passwordFormRef.value)
    return; const valid = await passwordFormRef.value.validate().catch(() => false); if (!valid)
    return; passwordSubmitting.value = true; try {
    await http.put('/user/password', { old_password: passwordForm.old_password, new_password: passwordForm.new_password });
    ElMessage.success('密码已修改');
    passwordDialogVisible.value = false;
}
finally {
    passwordSubmitting.value = false;
} }
onMounted(async () => { await Promise.all([loadProfile(), loadPermissions()]); });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['profile-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "profile-center-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
(__VLS_ctx.displayName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.profile.username);
(__VLS_ctx.roleName);
(__VLS_ctx.profile.status === 1 ? '账号正常' : '账号禁用');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.roleName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.permissions.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatUnix(__VLS_ctx.profile.ctime));
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatUnix(__VLS_ctx.profile.mtime));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel profile-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-panel__toolbar-actions" },
});
const __VLS_0 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.openPasswordDialog)
};
__VLS_3.slots.default;
var __VLS_3;
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
    onClick: (__VLS_ctx.openEditDialog)
};
__VLS_11.slots.default;
var __VLS_11;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
    ...{ class: "profile-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
(__VLS_ctx.profile.username);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
(__VLS_ctx.normalizeText(__VLS_ctx.profile.real_name, '未设置'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
(__VLS_ctx.normalizeText(__VLS_ctx.profile.email, '未设置'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
(__VLS_ctx.normalizeText(__VLS_ctx.profile.phone, '未设置'));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel profile-panel" },
});
/** @type {[typeof AddressBookManager, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(AddressBookManager, new AddressBookManager({}));
const __VLS_17 = __VLS_16({}, ...__VLS_functionalComponentArgsRest(__VLS_16));
const __VLS_19 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑个人资料",
    width: "520px",
}));
const __VLS_21 = __VLS_20({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑个人资料",
    width: "520px",
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
__VLS_22.slots.default;
const __VLS_23 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    ref: "editFormRef",
    model: (__VLS_ctx.editForm),
    rules: (__VLS_ctx.editRules),
    labelPosition: "top",
}));
const __VLS_25 = __VLS_24({
    ref: "editFormRef",
    model: (__VLS_ctx.editForm),
    rules: (__VLS_ctx.editRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
/** @type {typeof __VLS_ctx.editFormRef} */ ;
var __VLS_27 = {};
__VLS_26.slots.default;
const __VLS_29 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent(__VLS_29, new __VLS_29({
    label: "真实姓名",
}));
const __VLS_31 = __VLS_30({
    label: "真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
__VLS_32.slots.default;
const __VLS_33 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent(__VLS_33, new __VLS_33({
    modelValue: (__VLS_ctx.editForm.real_name),
    placeholder: "请输入真实姓名",
}));
const __VLS_35 = __VLS_34({
    modelValue: (__VLS_ctx.editForm.real_name),
    placeholder: "请输入真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
var __VLS_32;
const __VLS_37 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_38 = __VLS_asFunctionalComponent(__VLS_37, new __VLS_37({
    label: "手机号",
}));
const __VLS_39 = __VLS_38({
    label: "手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_38));
__VLS_40.slots.default;
const __VLS_41 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent(__VLS_41, new __VLS_41({
    modelValue: (__VLS_ctx.editForm.phone),
    placeholder: "请输入手机号",
}));
const __VLS_43 = __VLS_42({
    modelValue: (__VLS_ctx.editForm.phone),
    placeholder: "请输入手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_42));
var __VLS_40;
const __VLS_45 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent(__VLS_45, new __VLS_45({
    label: "邮箱",
    prop: "email",
}));
const __VLS_47 = __VLS_46({
    label: "邮箱",
    prop: "email",
}, ...__VLS_functionalComponentArgsRest(__VLS_46));
__VLS_48.slots.default;
const __VLS_49 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_50 = __VLS_asFunctionalComponent(__VLS_49, new __VLS_49({
    modelValue: (__VLS_ctx.editForm.email),
    placeholder: "请输入邮箱",
}));
const __VLS_51 = __VLS_50({
    modelValue: (__VLS_ctx.editForm.email),
    placeholder: "请输入邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_50));
var __VLS_48;
var __VLS_26;
{
    const { footer: __VLS_thisSlot } = __VLS_22.slots;
    const __VLS_53 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_54 = __VLS_asFunctionalComponent(__VLS_53, new __VLS_53({
        ...{ 'onClick': {} },
    }));
    const __VLS_55 = __VLS_54({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_54));
    let __VLS_57;
    let __VLS_58;
    let __VLS_59;
    const __VLS_60 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editDialogVisible = false;
        }
    };
    __VLS_56.slots.default;
    var __VLS_56;
    const __VLS_61 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_62 = __VLS_asFunctionalComponent(__VLS_61, new __VLS_61({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editSubmitting),
    }));
    const __VLS_63 = __VLS_62({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_62));
    let __VLS_65;
    let __VLS_66;
    let __VLS_67;
    const __VLS_68 = {
        onClick: (__VLS_ctx.submitEdit)
    };
    __VLS_64.slots.default;
    var __VLS_64;
}
var __VLS_22;
const __VLS_69 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_70 = __VLS_asFunctionalComponent(__VLS_69, new __VLS_69({
    modelValue: (__VLS_ctx.passwordDialogVisible),
    title: "修改密码",
    width: "520px",
}));
const __VLS_71 = __VLS_70({
    modelValue: (__VLS_ctx.passwordDialogVisible),
    title: "修改密码",
    width: "520px",
}, ...__VLS_functionalComponentArgsRest(__VLS_70));
__VLS_72.slots.default;
const __VLS_73 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_74 = __VLS_asFunctionalComponent(__VLS_73, new __VLS_73({
    ref: "passwordFormRef",
    model: (__VLS_ctx.passwordForm),
    rules: (__VLS_ctx.passwordRules),
    labelPosition: "top",
}));
const __VLS_75 = __VLS_74({
    ref: "passwordFormRef",
    model: (__VLS_ctx.passwordForm),
    rules: (__VLS_ctx.passwordRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_74));
/** @type {typeof __VLS_ctx.passwordFormRef} */ ;
var __VLS_77 = {};
__VLS_76.slots.default;
const __VLS_79 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
    label: "原密码",
    prop: "old_password",
}));
const __VLS_81 = __VLS_80({
    label: "原密码",
    prop: "old_password",
}, ...__VLS_functionalComponentArgsRest(__VLS_80));
__VLS_82.slots.default;
const __VLS_83 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    modelValue: (__VLS_ctx.passwordForm.old_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入原密码",
}));
const __VLS_85 = __VLS_84({
    modelValue: (__VLS_ctx.passwordForm.old_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入原密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
var __VLS_82;
const __VLS_87 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
    label: "新密码",
    prop: "new_password",
}));
const __VLS_89 = __VLS_88({
    label: "新密码",
    prop: "new_password",
}, ...__VLS_functionalComponentArgsRest(__VLS_88));
__VLS_90.slots.default;
const __VLS_91 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
    modelValue: (__VLS_ctx.passwordForm.new_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入新密码",
}));
const __VLS_93 = __VLS_92({
    modelValue: (__VLS_ctx.passwordForm.new_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入新密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
var __VLS_90;
const __VLS_95 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
    label: "确认密码",
    prop: "confirm_password",
}));
const __VLS_97 = __VLS_96({
    label: "确认密码",
    prop: "confirm_password",
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
__VLS_98.slots.default;
const __VLS_99 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
    modelValue: (__VLS_ctx.passwordForm.confirm_password),
    type: "password",
    showPassword: true,
    placeholder: "请再次输入新密码",
}));
const __VLS_101 = __VLS_100({
    modelValue: (__VLS_ctx.passwordForm.confirm_password),
    type: "password",
    showPassword: true,
    placeholder: "请再次输入新密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_100));
var __VLS_98;
var __VLS_76;
{
    const { footer: __VLS_thisSlot } = __VLS_72.slots;
    const __VLS_103 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_104 = __VLS_asFunctionalComponent(__VLS_103, new __VLS_103({
        ...{ 'onClick': {} },
    }));
    const __VLS_105 = __VLS_104({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_104));
    let __VLS_107;
    let __VLS_108;
    let __VLS_109;
    const __VLS_110 = {
        onClick: (...[$event]) => {
            __VLS_ctx.passwordDialogVisible = false;
        }
    };
    __VLS_106.slots.default;
    var __VLS_106;
    const __VLS_111 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_112 = __VLS_asFunctionalComponent(__VLS_111, new __VLS_111({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.passwordSubmitting),
    }));
    const __VLS_113 = __VLS_112({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.passwordSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_112));
    let __VLS_115;
    let __VLS_116;
    let __VLS_117;
    const __VLS_118 = {
        onClick: (__VLS_ctx.submitPassword)
    };
    __VLS_114.slots.default;
    var __VLS_114;
}
var __VLS_72;
/** @type {__VLS_StyleScopedClasses['profile-center-view']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-panel__toolbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-panel']} */ ;
// @ts-ignore
var __VLS_28 = __VLS_27, __VLS_78 = __VLS_77;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AddressBookManager: AddressBookManager,
            profile: profile,
            permissions: permissions,
            roleName: roleName,
            editDialogVisible: editDialogVisible,
            passwordDialogVisible: passwordDialogVisible,
            editSubmitting: editSubmitting,
            passwordSubmitting: passwordSubmitting,
            editFormRef: editFormRef,
            editForm: editForm,
            editRules: editRules,
            passwordFormRef: passwordFormRef,
            passwordForm: passwordForm,
            passwordRules: passwordRules,
            displayName: displayName,
            normalizeText: normalizeText,
            formatUnix: formatUnix,
            openEditDialog: openEditDialog,
            submitEdit: submitEdit,
            openPasswordDialog: openPasswordDialog,
            submitPassword: submitPassword,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
