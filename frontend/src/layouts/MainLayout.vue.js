import { computed } from 'vue';
import { Connection, Document, Goods, Histogram, Location, Opportunity, Setting, Ship, User, Warning, } from '@element-plus/icons-vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { hasAccess } from '@/utils/access';
const router = useRouter();
const authStore = useAuthStore();
const navItems = computed(() => [
    { path: '/', label: '总览', icon: Histogram, access: { allowedRoles: [2, 3, 4, 5, 6, 7] } },
    { path: '/customer', label: '客户门户', icon: User, access: { allowedRoles: [1, 7] } },
    { path: '/courier', label: '快递员工作台', icon: Goods, access: { allowedRoles: [2, 5, 6, 7], requiredPermissions: ['pickup:view', 'delivery:view'] } },
    { path: '/users', label: '用户管理', icon: User, access: { allowedRoles: [7] } },
    { path: '/orders', label: '订单管理', icon: Document, access: { allowedRoles: [3, 4, 5, 6, 7], requiredPermissions: ['order:view'] } },
    { path: '/stations', label: '站点库存', icon: Location, access: { allowedRoles: [5, 6, 7], requiredPermissions: ['station:view'] } },
    { path: '/sorting', label: '分拣管理', icon: Goods, access: { allowedRoles: [3, 5, 6, 7], requiredPermissions: ['sorting:view'] } },
    { path: '/transport', label: '运输管理', icon: Ship, access: { allowedRoles: [4, 6, 7], requiredPermissions: ['transport:view'] } },
    { path: '/tracking', label: '物流追踪', icon: Connection, access: { allowedRoles: [2, 3, 4, 5, 6, 7], requiredPermissions: ['tracking:view'] } },
    { path: '/exceptions', label: '异常管理', icon: Warning, access: { allowedRoles: [2, 5, 6, 7], requiredPermissions: ['exception:view'] } },
    { path: '/dispatch', label: '运输调度', icon: Opportunity, access: { allowedRoles: [6, 7] } },
    { path: '/profile', label: '个人中心', icon: Setting },
]);
const visibleNavItems = computed(() => navItems.value.filter((item) => hasAccess(item.access, authStore.user?.role, authStore.permissions)));
function onLogout() {
    authStore.clearSession();
    router.replace('/login');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "shell-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "shell-layout__sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "brand-block" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav-stack" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.visibleNavItems))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-link" },
    }));
    const __VLS_2 = __VLS_1({
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-link" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    const __VLS_4 = ((item.icon));
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        ...{ class: "nav-link__icon" },
    }));
    const __VLS_6 = __VLS_5({
        ...{ class: "nav-link__icon" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    var __VLS_3;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "shell-layout__main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "shell-header card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.authStore.displayName);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "shell-header__actions" },
});
const __VLS_8 = {}.ElTag;
/** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    type: "success",
    effect: "dark",
}));
const __VLS_10 = __VLS_9({
    type: "success",
    effect: "dark",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
var __VLS_11;
const __VLS_12 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    ...{ 'onClick': {} },
    plain: true,
}));
const __VLS_14 = __VLS_13({
    ...{ 'onClick': {} },
    plain: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
let __VLS_16;
let __VLS_17;
let __VLS_18;
const __VLS_19 = {
    onClick: (__VLS_ctx.onLogout)
};
__VLS_15.slots.default;
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "shell-content" },
});
const __VLS_20 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({}));
const __VLS_22 = __VLS_21({}, ...__VLS_functionalComponentArgsRest(__VLS_21));
/** @type {__VLS_StyleScopedClasses['shell-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-layout__sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-block']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-layout__main']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-header']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-header__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['shell-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            RouterView: RouterView,
            authStore: authStore,
            visibleNavItems: visibleNavItems,
            onLogout: onLogout,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
