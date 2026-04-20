import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import http from '@/utils/http';
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const activeMode = ref('login');
const loginFormRef = ref();
const registerFormRef = ref();
const loginSubmitting = ref(false);
const registerSubmitting = ref(false);
const loginForm = reactive({
    username: '',
    password: '',
});
const registerForm = reactive({
    username: '',
    real_name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
});
const loginRules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};
const registerRules = {
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, max: 50, message: '用户名长度需在 3-50 位之间', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名仅支持字母、数字和下划线', trigger: 'blur' },
    ],
    real_name: [{ max: 50, message: '真实姓名不能超过 50 个字符', trigger: 'blur' }],
    phone: [{ validator: validatePhone, trigger: 'blur' }],
    email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, max: 50, message: '密码长度需在 6-50 位之间', trigger: 'blur' },
    ],
    confirm_password: [{ validator: validateConfirmPassword, trigger: 'blur' }],
};
function switchMode(mode) {
    activeMode.value = mode;
}
function validatePhone(_rule, value, callback) {
    if (!value) {
        callback();
        return;
    }
    callback(/^1[3-9]\d{9}$/.test(value) ? undefined : new Error('手机号格式不正确'));
}
function validateConfirmPassword(_rule, value, callback) {
    if (!value) {
        callback(new Error('请再次输入密码'));
        return;
    }
    callback(value === registerForm.password ? undefined : new Error('两次输入的密码不一致'));
}
async function submitLogin() {
    if (!loginFormRef.value)
        return;
    const valid = await loginFormRef.value.validate().catch(() => false);
    if (!valid)
        return;
    loginSubmitting.value = true;
    try {
        await authStore.login(loginForm);
        ElMessage.success('登录成功');
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
        router.replace(redirect);
    }
    finally {
        loginSubmitting.value = false;
    }
}
async function submitRegister() {
    if (!registerFormRef.value)
        return;
    const valid = await registerFormRef.value.validate().catch(() => false);
    if (!valid)
        return;
    registerSubmitting.value = true;
    try {
        await http.post('/auth/register', {
            username: registerForm.username.trim(),
            real_name: registerForm.real_name.trim(),
            phone: registerForm.phone.trim(),
            email: registerForm.email.trim(),
            password: registerForm.password,
        });
        ElMessage.success('注册成功，请使用新账号登录');
        loginForm.username = registerForm.username.trim();
        loginForm.password = '';
        registerForm.username = '';
        registerForm.real_name = '';
        registerForm.phone = '';
        registerForm.email = '';
        registerForm.password = '';
        registerForm.confirm_password = '';
        activeMode.value = 'login';
    }
    finally {
        registerSubmitting.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "login-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-view__art" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "summary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-view__signal-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-view__panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-card__switch" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.switchMode('login');
        } },
    type: "button",
    ...{ class: "login-card__switch-item" },
    ...{ class: ({ 'is-active': __VLS_ctx.activeMode === 'login' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.switchMode('register');
        } },
    type: "button",
    ...{ class: "login-card__switch-item" },
    ...{ class: ({ 'is-active': __VLS_ctx.activeMode === 'register' }) },
});
if (__VLS_ctx.activeMode === 'login') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "login-card__helper" },
    });
    const __VLS_0 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onSubmit': {} },
        ref: "loginFormRef",
        model: (__VLS_ctx.loginForm),
        rules: (__VLS_ctx.loginRules),
        labelPosition: "top",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onSubmit': {} },
        ref: "loginFormRef",
        model: (__VLS_ctx.loginForm),
        rules: (__VLS_ctx.loginRules),
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onSubmit: () => { }
    };
    /** @type {typeof __VLS_ctx.loginFormRef} */ ;
    var __VLS_8 = {};
    __VLS_3.slots.default;
    const __VLS_10 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
        label: "用户名",
        prop: "username",
    }));
    const __VLS_12 = __VLS_11({
        label: "用户名",
        prop: "username",
    }, ...__VLS_functionalComponentArgsRest(__VLS_11));
    __VLS_13.slots.default;
    const __VLS_14 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
        modelValue: (__VLS_ctx.loginForm.username),
        size: "large",
        placeholder: "请输入用户名",
    }));
    const __VLS_16 = __VLS_15({
        modelValue: (__VLS_ctx.loginForm.username),
        size: "large",
        placeholder: "请输入用户名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    var __VLS_13;
    const __VLS_18 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
        label: "密码",
        prop: "password",
    }));
    const __VLS_20 = __VLS_19({
        label: "密码",
        prop: "password",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    __VLS_21.slots.default;
    const __VLS_22 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.loginForm.password),
        type: "password",
        size: "large",
        showPassword: true,
        placeholder: "请输入密码",
    }));
    const __VLS_24 = __VLS_23({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.loginForm.password),
        type: "password",
        size: "large",
        showPassword: true,
        placeholder: "请输入密码",
    }, ...__VLS_functionalComponentArgsRest(__VLS_23));
    let __VLS_26;
    let __VLS_27;
    let __VLS_28;
    const __VLS_29 = {
        onKeyup: (__VLS_ctx.submitLogin)
    };
    var __VLS_25;
    var __VLS_21;
    const __VLS_30 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loginSubmitting),
        ...{ class: "login-card__button" },
        size: "large",
        type: "primary",
    }));
    const __VLS_32 = __VLS_31({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.loginSubmitting),
        ...{ class: "login-card__button" },
        size: "large",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    let __VLS_34;
    let __VLS_35;
    let __VLS_36;
    const __VLS_37 = {
        onClick: (__VLS_ctx.submitLogin)
    };
    __VLS_33.slots.default;
    var __VLS_33;
    var __VLS_3;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "login-card__helper" },
    });
    const __VLS_38 = {}.ElForm;
    /** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
        ...{ 'onSubmit': {} },
        ref: "registerFormRef",
        model: (__VLS_ctx.registerForm),
        rules: (__VLS_ctx.registerRules),
        labelPosition: "top",
    }));
    const __VLS_40 = __VLS_39({
        ...{ 'onSubmit': {} },
        ref: "registerFormRef",
        model: (__VLS_ctx.registerForm),
        rules: (__VLS_ctx.registerRules),
        labelPosition: "top",
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    let __VLS_42;
    let __VLS_43;
    let __VLS_44;
    const __VLS_45 = {
        onSubmit: () => { }
    };
    /** @type {typeof __VLS_ctx.registerFormRef} */ ;
    var __VLS_46 = {};
    __VLS_41.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "login-card__grid" },
    });
    const __VLS_48 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        label: "用户名",
        prop: "username",
    }));
    const __VLS_50 = __VLS_49({
        label: "用户名",
        prop: "username",
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_51.slots.default;
    const __VLS_52 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        modelValue: (__VLS_ctx.registerForm.username),
        size: "large",
        placeholder: "3-50位，仅支持字母数字下划线",
    }));
    const __VLS_54 = __VLS_53({
        modelValue: (__VLS_ctx.registerForm.username),
        size: "large",
        placeholder: "3-50位，仅支持字母数字下划线",
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    var __VLS_51;
    const __VLS_56 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        label: "真实姓名",
        prop: "real_name",
    }));
    const __VLS_58 = __VLS_57({
        label: "真实姓名",
        prop: "real_name",
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_59.slots.default;
    const __VLS_60 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        modelValue: (__VLS_ctx.registerForm.real_name),
        size: "large",
        placeholder: "可选，建议填写真实姓名",
    }));
    const __VLS_62 = __VLS_61({
        modelValue: (__VLS_ctx.registerForm.real_name),
        size: "large",
        placeholder: "可选，建议填写真实姓名",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    var __VLS_59;
    const __VLS_64 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        label: "手机号",
        prop: "phone",
    }));
    const __VLS_66 = __VLS_65({
        label: "手机号",
        prop: "phone",
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    const __VLS_68 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        modelValue: (__VLS_ctx.registerForm.phone),
        size: "large",
        placeholder: "请输入手机号",
    }));
    const __VLS_70 = __VLS_69({
        modelValue: (__VLS_ctx.registerForm.phone),
        size: "large",
        placeholder: "请输入手机号",
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    var __VLS_67;
    const __VLS_72 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        label: "邮箱",
        prop: "email",
    }));
    const __VLS_74 = __VLS_73({
        label: "邮箱",
        prop: "email",
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    const __VLS_76 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        modelValue: (__VLS_ctx.registerForm.email),
        size: "large",
        placeholder: "请输入邮箱",
    }));
    const __VLS_78 = __VLS_77({
        modelValue: (__VLS_ctx.registerForm.email),
        size: "large",
        placeholder: "请输入邮箱",
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    var __VLS_75;
    const __VLS_80 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
        label: "密码",
        prop: "password",
    }));
    const __VLS_82 = __VLS_81({
        label: "密码",
        prop: "password",
    }, ...__VLS_functionalComponentArgsRest(__VLS_81));
    __VLS_83.slots.default;
    const __VLS_84 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
        modelValue: (__VLS_ctx.registerForm.password),
        type: "password",
        size: "large",
        showPassword: true,
        placeholder: "至少6位密码",
    }));
    const __VLS_86 = __VLS_85({
        modelValue: (__VLS_ctx.registerForm.password),
        type: "password",
        size: "large",
        showPassword: true,
        placeholder: "至少6位密码",
    }, ...__VLS_functionalComponentArgsRest(__VLS_85));
    var __VLS_83;
    const __VLS_88 = {}.ElFormItem;
    /** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        label: "确认密码",
        prop: "confirm_password",
    }));
    const __VLS_90 = __VLS_89({
        label: "确认密码",
        prop: "confirm_password",
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_91.slots.default;
    const __VLS_92 = {}.ElInput;
    /** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.registerForm.confirm_password),
        type: "password",
        size: "large",
        showPassword: true,
        placeholder: "请再次输入密码",
    }));
    const __VLS_94 = __VLS_93({
        ...{ 'onKeyup': {} },
        modelValue: (__VLS_ctx.registerForm.confirm_password),
        type: "password",
        size: "large",
        showPassword: true,
        placeholder: "请再次输入密码",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    let __VLS_96;
    let __VLS_97;
    let __VLS_98;
    const __VLS_99 = {
        onKeyup: (__VLS_ctx.submitRegister)
    };
    var __VLS_95;
    var __VLS_91;
    const __VLS_100 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.registerSubmitting),
        ...{ class: "login-card__button" },
        size: "large",
        type: "primary",
    }));
    const __VLS_102 = __VLS_101({
        ...{ 'onClick': {} },
        loading: (__VLS_ctx.registerSubmitting),
        ...{ class: "login-card__button" },
        size: "large",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_101));
    let __VLS_104;
    let __VLS_105;
    let __VLS_106;
    const __VLS_107 = {
        onClick: (__VLS_ctx.submitRegister)
    };
    __VLS_103.slots.default;
    var __VLS_103;
    var __VLS_41;
}
/** @type {__VLS_StyleScopedClasses['login-view']} */ ;
/** @type {__VLS_StyleScopedClasses['login-view__art']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['summary']} */ ;
/** @type {__VLS_StyleScopedClasses['login-view__signal-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['login-view__panel']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__switch']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__switch-item']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__switch-item']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__helper']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__button']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__helper']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__grid']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card__button']} */ ;
// @ts-ignore
var __VLS_9 = __VLS_8, __VLS_47 = __VLS_46;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            activeMode: activeMode,
            loginFormRef: loginFormRef,
            registerFormRef: registerFormRef,
            loginSubmitting: loginSubmitting,
            registerSubmitting: registerSubmitting,
            loginForm: loginForm,
            registerForm: registerForm,
            loginRules: loginRules,
            registerRules: registerRules,
            switchMode: switchMode,
            submitLogin: submitLogin,
            submitRegister: submitRegister,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
