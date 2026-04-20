import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
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
const __VLS_16 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑个人资料",
    width: "520px",
}));
const __VLS_18 = __VLS_17({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑个人资料",
    width: "520px",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ref: "editFormRef",
    model: (__VLS_ctx.editForm),
    rules: (__VLS_ctx.editRules),
    labelPosition: "top",
}));
const __VLS_22 = __VLS_21({
    ref: "editFormRef",
    model: (__VLS_ctx.editForm),
    rules: (__VLS_ctx.editRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
/** @type {typeof __VLS_ctx.editFormRef} */ ;
var __VLS_24 = {};
__VLS_23.slots.default;
const __VLS_26 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    label: "真实姓名",
}));
const __VLS_28 = __VLS_27({
    label: "真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_29.slots.default;
const __VLS_30 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    modelValue: (__VLS_ctx.editForm.real_name),
    placeholder: "请输入真实姓名",
}));
const __VLS_32 = __VLS_31({
    modelValue: (__VLS_ctx.editForm.real_name),
    placeholder: "请输入真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
var __VLS_29;
const __VLS_34 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
    label: "手机号",
}));
const __VLS_36 = __VLS_35({
    label: "手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_35));
__VLS_37.slots.default;
const __VLS_38 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    modelValue: (__VLS_ctx.editForm.phone),
    placeholder: "请输入手机号",
}));
const __VLS_40 = __VLS_39({
    modelValue: (__VLS_ctx.editForm.phone),
    placeholder: "请输入手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
var __VLS_37;
const __VLS_42 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    label: "邮箱",
    prop: "email",
}));
const __VLS_44 = __VLS_43({
    label: "邮箱",
    prop: "email",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
__VLS_45.slots.default;
const __VLS_46 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent(__VLS_46, new __VLS_46({
    modelValue: (__VLS_ctx.editForm.email),
    placeholder: "请输入邮箱",
}));
const __VLS_48 = __VLS_47({
    modelValue: (__VLS_ctx.editForm.email),
    placeholder: "请输入邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_47));
var __VLS_45;
var __VLS_23;
{
    const { footer: __VLS_thisSlot } = __VLS_19.slots;
    const __VLS_50 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        ...{ 'onClick': {} },
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_54;
    let __VLS_55;
    let __VLS_56;
    const __VLS_57 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editDialogVisible = false;
        }
    };
    __VLS_53.slots.default;
    var __VLS_53;
    const __VLS_58 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editSubmitting),
    }));
    const __VLS_60 = __VLS_59({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.editSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    let __VLS_62;
    let __VLS_63;
    let __VLS_64;
    const __VLS_65 = {
        onClick: (__VLS_ctx.submitEdit)
    };
    __VLS_61.slots.default;
    var __VLS_61;
}
var __VLS_19;
const __VLS_66 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    modelValue: (__VLS_ctx.passwordDialogVisible),
    title: "修改密码",
    width: "520px",
}));
const __VLS_68 = __VLS_67({
    modelValue: (__VLS_ctx.passwordDialogVisible),
    title: "修改密码",
    width: "520px",
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
__VLS_69.slots.default;
const __VLS_70 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
    ref: "passwordFormRef",
    model: (__VLS_ctx.passwordForm),
    rules: (__VLS_ctx.passwordRules),
    labelPosition: "top",
}));
const __VLS_72 = __VLS_71({
    ref: "passwordFormRef",
    model: (__VLS_ctx.passwordForm),
    rules: (__VLS_ctx.passwordRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_71));
/** @type {typeof __VLS_ctx.passwordFormRef} */ ;
var __VLS_74 = {};
__VLS_73.slots.default;
const __VLS_76 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    label: "原密码",
    prop: "old_password",
}));
const __VLS_78 = __VLS_77({
    label: "原密码",
    prop: "old_password",
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    modelValue: (__VLS_ctx.passwordForm.old_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入原密码",
}));
const __VLS_82 = __VLS_81({
    modelValue: (__VLS_ctx.passwordForm.old_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入原密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
var __VLS_79;
const __VLS_84 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    label: "新密码",
    prop: "new_password",
}));
const __VLS_86 = __VLS_85({
    label: "新密码",
    prop: "new_password",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
const __VLS_88 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    modelValue: (__VLS_ctx.passwordForm.new_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入新密码",
}));
const __VLS_90 = __VLS_89({
    modelValue: (__VLS_ctx.passwordForm.new_password),
    type: "password",
    showPassword: true,
    placeholder: "请输入新密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
var __VLS_87;
const __VLS_92 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    label: "确认密码",
    prop: "confirm_password",
}));
const __VLS_94 = __VLS_93({
    label: "确认密码",
    prop: "confirm_password",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
const __VLS_96 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    modelValue: (__VLS_ctx.passwordForm.confirm_password),
    type: "password",
    showPassword: true,
    placeholder: "请再次输入新密码",
}));
const __VLS_98 = __VLS_97({
    modelValue: (__VLS_ctx.passwordForm.confirm_password),
    type: "password",
    showPassword: true,
    placeholder: "请再次输入新密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
var __VLS_95;
var __VLS_73;
{
    const { footer: __VLS_thisSlot } = __VLS_69.slots;
    const __VLS_100 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (...[$event]) => {
            __VLS_ctx.passwordDialogVisible = false;
        }
    };
    __VLS_103.slots.default;
    var __VLS_103;
    const __VLS_108 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.passwordSubmitting),
    }));
    const __VLS_110 = __VLS_109({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.passwordSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_109));
    let __VLS_112;
    let __VLS_113;
    let __VLS_114;
    const __VLS_115 = {
        onClick: (__VLS_ctx.submitPassword)
    };
    __VLS_111.slots.default;
    var __VLS_111;
}
var __VLS_69;
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
// @ts-ignore
var __VLS_25 = __VLS_24, __VLS_75 = __VLS_74;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
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
