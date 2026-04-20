import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/utils/http';
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const createSubmitting = ref(false);
const users = ref([]);
const roles = ref([]);
const pagination = reactive({
    total: 0,
    page: 1,
    pageSize: 10,
});
const filters = reactive({
    keyword: '',
    role: undefined,
    status: undefined,
});
const editDialogVisible = ref(false);
const roleDialogVisible = ref(false);
const createDialogVisible = ref(false);
const currentUser = ref(null);
const editFormRef = ref();
const createFormRef = ref();
const editForm = reactive({
    real_name: '',
    phone: '',
    email: '',
});
const createForm = reactive({
    username: '',
    password: '',
    role: 1,
    real_name: '',
    phone: '',
    email: '',
});
const roleForm = reactive({
    role_id: 1,
});
const editRules = {
    email: [
        {
            validator: (_rule, value, callback) => {
                if (!value) {
                    callback();
                    return;
                }
                const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                callback(ok ? undefined : new Error('邮箱格式不正确'));
            },
            trigger: 'blur',
        },
    ],
};
const createRules = {
    username: [
        { required: true, message: '请输入用户名', trigger: 'blur' },
        { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' },
    ],
    password: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码至少 6 位', trigger: 'blur' },
    ],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }],
    email: editRules.email,
};
const activeCount = computed(() => users.value.filter((item) => item.status === 1).length);
const disabledCount = computed(() => users.value.filter((item) => item.status === 0).length);
function isCurrentUser(user) {
    return authStore.user?.id === user.id;
}
async function loadRoles() {
    const data = await http.get('/roles');
    roles.value = data.roles || [];
}
async function loadUsers() {
    loading.value = true;
    try {
        const params = {
            page: pagination.page,
            page_size: pagination.pageSize,
        };
        if (filters.keyword.trim()) {
            params.keyword = filters.keyword.trim();
        }
        if (typeof filters.role === 'number') {
            params.role = filters.role;
        }
        if (typeof filters.status === 'number') {
            params.status = filters.status;
        }
        const data = await http.get('/users', { params });
        users.value = data.list || [];
        pagination.total = data.total || 0;
        pagination.page = data.page || 1;
        pagination.pageSize = data.page_size || pagination.pageSize;
    }
    finally {
        loading.value = false;
    }
}
function resetFilters() {
    filters.keyword = '';
    filters.role = undefined;
    filters.status = undefined;
    pagination.page = 1;
    void loadUsers();
}
function handlePageChange(page) {
    pagination.page = page;
    void loadUsers();
}
function handleSizeChange(size) {
    pagination.pageSize = size;
    pagination.page = 1;
    void loadUsers();
}
function openEdit(user) {
    currentUser.value = user;
    editForm.real_name = user.real_name || '';
    editForm.phone = user.phone || '';
    editForm.email = user.email || '';
    editDialogVisible.value = true;
}
function openCreateDialog() {
    createForm.username = '';
    createForm.password = '';
    createForm.role = 1;
    createForm.real_name = '';
    createForm.phone = '';
    createForm.email = '';
    createDialogVisible.value = true;
    createFormRef.value?.clearValidate();
}
async function submitEdit() {
    if (!currentUser.value || !editFormRef.value) {
        return;
    }
    const valid = await editFormRef.value.validate().catch(() => false);
    if (!valid) {
        return;
    }
    saving.value = true;
    try {
        await http.put(`/users/${currentUser.value.id}`, {
            real_name: editForm.real_name,
            phone: editForm.phone,
            email: editForm.email,
        });
        ElMessage.success('用户信息已更新');
        editDialogVisible.value = false;
        await loadUsers();
    }
    finally {
        saving.value = false;
    }
}
async function submitCreate() {
    if (!createFormRef.value) {
        return;
    }
    const valid = await createFormRef.value.validate().catch(() => false);
    if (!valid) {
        return;
    }
    createSubmitting.value = true;
    try {
        await http.post('/admin/users', {
            username: createForm.username.trim(),
            password: createForm.password,
            role: createForm.role,
            real_name: createForm.real_name.trim(),
            phone: createForm.phone.trim(),
            email: createForm.email.trim(),
        });
        ElMessage.success('用户创建成功');
        createDialogVisible.value = false;
        await loadUsers();
    }
    finally {
        createSubmitting.value = false;
    }
}
function openRoleDialog(user) {
    currentUser.value = user;
    roleForm.role_id = user.role;
    roleDialogVisible.value = true;
}
async function submitRole() {
    if (!currentUser.value) {
        return;
    }
    saving.value = true;
    try {
        await http.put(`/admin/users/${currentUser.value.id}/role`, {
            role_id: roleForm.role_id,
        });
        ElMessage.success('用户角色已更新');
        roleDialogVisible.value = false;
        await loadUsers();
    }
    finally {
        saving.value = false;
    }
}
async function toggleStatus(user) {
    const nextStatus = user.status === 1 ? 0 : 1;
    const actionText = nextStatus === 1 ? '启用' : '禁用';
    await ElMessageBox.confirm(`确认${actionText}账号 “${user.username}” 吗？`, '状态确认', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
    });
    await http.put(`/admin/users/${user.id}/status`, { status: nextStatus });
    ElMessage.success(`账号已${actionText}`);
    await loadUsers();
}
async function removeUser(user) {
    await ElMessageBox.confirm(`确认删除账号 “${user.username}” 吗？此操作会将账号置为禁用状态。`, '删除确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
    });
    await http.delete(`/admin/users/${user.id}`);
    ElMessage.success('账号已删除');
    await loadUsers();
}
onMounted(async () => {
    await Promise.all([loadRoles(), loadUsers()]);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "user-management-view" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-hero card-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-hero__stats" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.pagination.total);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.activeCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.disabledCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-panel user-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-panel__toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
if (__VLS_ctx.authStore.user?.role === 7) {
    const __VLS_0 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        type: "primary",
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.openCreateDialog)
    };
    __VLS_3.slots.default;
    var __VLS_3;
}
const __VLS_8 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "user-filters" },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSubmit': {} },
    inline: (true),
    model: (__VLS_ctx.filters),
    ...{ class: "user-filters" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onSubmit: () => { }
};
__VLS_11.slots.default;
const __VLS_16 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    label: "关键词",
}));
const __VLS_18 = __VLS_17({
    label: "关键词",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.keyword),
    clearable: true,
    placeholder: "用户名 / 邮箱 / 手机 / 真实姓名",
}));
const __VLS_22 = __VLS_21({
    ...{ 'onKeyup': {} },
    modelValue: (__VLS_ctx.filters.keyword),
    clearable: true,
    placeholder: "用户名 / 邮箱 / 手机 / 真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    onKeyup: (__VLS_ctx.loadUsers)
};
var __VLS_23;
var __VLS_19;
const __VLS_28 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    label: "角色",
}));
const __VLS_30 = __VLS_29({
    label: "角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.filters.role),
    clearable: true,
    placeholder: "全部角色",
    ...{ style: {} },
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.filters.role),
    clearable: true,
    placeholder: "全部角色",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    label: "全部角色",
    value: (undefined),
}));
const __VLS_38 = __VLS_37({
    label: "全部角色",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
    const __VLS_40 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
        key: (role.id),
        label: (role.name),
        value: (role.id),
    }));
    const __VLS_42 = __VLS_41({
        key: (role.id),
        label: (role.name),
        value: (role.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_41));
}
var __VLS_35;
var __VLS_31;
const __VLS_44 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    label: "状态",
}));
const __VLS_46 = __VLS_45({
    label: "状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
const __VLS_48 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.filters.status),
    clearable: true,
    placeholder: "全部状态",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
__VLS_51.slots.default;
const __VLS_52 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    label: "全部状态",
    value: (undefined),
}));
const __VLS_54 = __VLS_53({
    label: "全部状态",
    value: (undefined),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
const __VLS_56 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
    label: "启用",
    value: (1),
}));
const __VLS_58 = __VLS_57({
    label: "启用",
    value: (1),
}, ...__VLS_functionalComponentArgsRest(__VLS_57));
const __VLS_60 = {}.ElOption;
/** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    label: "禁用",
    value: (0),
}));
const __VLS_62 = __VLS_61({
    label: "禁用",
    value: (0),
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
var __VLS_51;
var __VLS_47;
const __VLS_64 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({}));
const __VLS_66 = __VLS_65({}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_70 = __VLS_69({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
let __VLS_72;
let __VLS_73;
let __VLS_74;
const __VLS_75 = {
    onClick: (__VLS_ctx.loadUsers)
};
__VLS_71.slots.default;
var __VLS_71;
const __VLS_76 = {}.ElButton;
/** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    ...{ 'onClick': {} },
}));
const __VLS_78 = __VLS_77({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_80;
let __VLS_81;
let __VLS_82;
const __VLS_83 = {
    onClick: (__VLS_ctx.resetFilters)
};
__VLS_79.slots.default;
var __VLS_79;
var __VLS_67;
var __VLS_11;
const __VLS_84 = {}.ElTable;
/** @type {[typeof __VLS_components.ElTable, typeof __VLS_components.elTable, typeof __VLS_components.ElTable, typeof __VLS_components.elTable, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    data: (__VLS_ctx.users),
    ...{ class: "user-table" },
    stripe: true,
}));
const __VLS_86 = __VLS_85({
    data: (__VLS_ctx.users),
    ...{ class: "user-table" },
    stripe: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_asFunctionalDirective(__VLS_directives.vLoading)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.loading) }, null, null);
__VLS_87.slots.default;
const __VLS_88 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    prop: "id",
    label: "ID",
    width: "80",
}));
const __VLS_90 = __VLS_89({
    prop: "id",
    label: "ID",
    width: "80",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
const __VLS_92 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    prop: "username",
    label: "用户名",
    minWidth: "140",
}));
const __VLS_94 = __VLS_93({
    prop: "username",
    label: "用户名",
    minWidth: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
const __VLS_96 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    prop: "real_name",
    label: "真实姓名",
    minWidth: "140",
}));
const __VLS_98 = __VLS_97({
    prop: "real_name",
    label: "真实姓名",
    minWidth: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_99.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.real_name || '-');
}
var __VLS_99;
const __VLS_100 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    prop: "phone",
    label: "手机号",
    minWidth: "140",
}));
const __VLS_102 = __VLS_101({
    prop: "phone",
    label: "手机号",
    minWidth: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_103.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.phone || '-');
}
var __VLS_103;
const __VLS_104 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    prop: "email",
    label: "邮箱",
    minWidth: "220",
}));
const __VLS_106 = __VLS_105({
    prop: "email",
    label: "邮箱",
    minWidth: "220",
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_107.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    (scope.row.email || '-');
}
var __VLS_107;
const __VLS_108 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    label: "角色",
    width: "140",
}));
const __VLS_110 = __VLS_109({
    label: "角色",
    width: "140",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_111.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_112 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        effect: "plain",
        type: "warning",
    }));
    const __VLS_114 = __VLS_113({
        effect: "plain",
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    (scope.row.role_name);
    var __VLS_115;
}
var __VLS_111;
const __VLS_116 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    label: "状态",
    width: "120",
}));
const __VLS_118 = __VLS_117({
    label: "状态",
    width: "120",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_119.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    const __VLS_120 = {}.ElTag;
    /** @type {[typeof __VLS_components.ElTag, typeof __VLS_components.elTag, typeof __VLS_components.ElTag, typeof __VLS_components.elTag, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }));
    const __VLS_122 = __VLS_121({
        type: (scope.row.status === 1 ? 'success' : 'info'),
        effect: "dark",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    (scope.row.status === 1 ? '启用' : '禁用');
    var __VLS_123;
}
var __VLS_119;
const __VLS_124 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    prop: "c_time",
    label: "创建时间",
    minWidth: "180",
}));
const __VLS_126 = __VLS_125({
    prop: "c_time",
    label: "创建时间",
    minWidth: "180",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
const __VLS_128 = {}.ElTableColumn;
/** @type {[typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, typeof __VLS_components.ElTableColumn, typeof __VLS_components.elTableColumn, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    label: "操作",
    fixed: "right",
    width: "300",
}));
const __VLS_130 = __VLS_129({
    label: "操作",
    fixed: "right",
    width: "300",
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
__VLS_131.slots.default;
{
    const { default: __VLS_thisSlot } = __VLS_131.slots;
    const [scope] = __VLS_getSlotParams(__VLS_thisSlot);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "user-actions" },
    });
    const __VLS_132 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }));
    const __VLS_134 = __VLS_133({
        ...{ 'onClick': {} },
        link: true,
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_133));
    let __VLS_136;
    let __VLS_137;
    let __VLS_138;
    const __VLS_139 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openEdit(scope.row);
        }
    };
    __VLS_135.slots.default;
    var __VLS_135;
    const __VLS_140 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }));
    const __VLS_142 = __VLS_141({
        ...{ 'onClick': {} },
        link: true,
        type: "warning",
    }, ...__VLS_functionalComponentArgsRest(__VLS_141));
    let __VLS_144;
    let __VLS_145;
    let __VLS_146;
    const __VLS_147 = {
        onClick: (...[$event]) => {
            __VLS_ctx.openRoleDialog(scope.row);
        }
    };
    __VLS_143.slots.default;
    var __VLS_143;
    const __VLS_148 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }));
    const __VLS_150 = __VLS_149({
        ...{ 'onClick': {} },
        link: true,
        type: "success",
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    let __VLS_152;
    let __VLS_153;
    let __VLS_154;
    const __VLS_155 = {
        onClick: (...[$event]) => {
            __VLS_ctx.toggleStatus(scope.row);
        }
    };
    __VLS_151.slots.default;
    (scope.row.status === 1 ? '禁用' : '启用');
    var __VLS_151;
    const __VLS_156 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        disabled: (__VLS_ctx.isCurrentUser(scope.row)),
    }));
    const __VLS_158 = __VLS_157({
        ...{ 'onClick': {} },
        link: true,
        type: "danger",
        disabled: (__VLS_ctx.isCurrentUser(scope.row)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    let __VLS_160;
    let __VLS_161;
    let __VLS_162;
    const __VLS_163 = {
        onClick: (...[$event]) => {
            __VLS_ctx.removeUser(scope.row);
        }
    };
    __VLS_159.slots.default;
    var __VLS_159;
}
var __VLS_131;
var __VLS_87;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "user-pagination" },
});
const __VLS_164 = {}.ElPagination;
/** @type {[typeof __VLS_components.ElPagination, typeof __VLS_components.elPagination, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}));
const __VLS_166 = __VLS_165({
    ...{ 'onCurrentChange': {} },
    ...{ 'onSizeChange': {} },
    background: true,
    layout: "total, prev, pager, next, sizes",
    total: (__VLS_ctx.pagination.total),
    currentPage: (__VLS_ctx.pagination.page),
    pageSize: (__VLS_ctx.pagination.pageSize),
    pageSizes: ([10, 20, 50, 100]),
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
let __VLS_168;
let __VLS_169;
let __VLS_170;
const __VLS_171 = {
    onCurrentChange: (__VLS_ctx.handlePageChange)
};
const __VLS_172 = {
    onSizeChange: (__VLS_ctx.handleSizeChange)
};
var __VLS_167;
const __VLS_173 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_174 = __VLS_asFunctionalComponent(__VLS_173, new __VLS_173({
    modelValue: (__VLS_ctx.createDialogVisible),
    title: "注册用户",
    width: "560px",
}));
const __VLS_175 = __VLS_174({
    modelValue: (__VLS_ctx.createDialogVisible),
    title: "注册用户",
    width: "560px",
}, ...__VLS_functionalComponentArgsRest(__VLS_174));
__VLS_176.slots.default;
const __VLS_177 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_178 = __VLS_asFunctionalComponent(__VLS_177, new __VLS_177({
    ref: "createFormRef",
    model: (__VLS_ctx.createForm),
    rules: (__VLS_ctx.createRules),
    labelPosition: "top",
}));
const __VLS_179 = __VLS_178({
    ref: "createFormRef",
    model: (__VLS_ctx.createForm),
    rules: (__VLS_ctx.createRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_178));
/** @type {typeof __VLS_ctx.createFormRef} */ ;
var __VLS_181 = {};
__VLS_180.slots.default;
const __VLS_183 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_184 = __VLS_asFunctionalComponent(__VLS_183, new __VLS_183({
    label: "用户名",
    prop: "username",
}));
const __VLS_185 = __VLS_184({
    label: "用户名",
    prop: "username",
}, ...__VLS_functionalComponentArgsRest(__VLS_184));
__VLS_186.slots.default;
const __VLS_187 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_188 = __VLS_asFunctionalComponent(__VLS_187, new __VLS_187({
    modelValue: (__VLS_ctx.createForm.username),
    placeholder: "请输入用户名",
}));
const __VLS_189 = __VLS_188({
    modelValue: (__VLS_ctx.createForm.username),
    placeholder: "请输入用户名",
}, ...__VLS_functionalComponentArgsRest(__VLS_188));
var __VLS_186;
const __VLS_191 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_192 = __VLS_asFunctionalComponent(__VLS_191, new __VLS_191({
    label: "密码",
    prop: "password",
}));
const __VLS_193 = __VLS_192({
    label: "密码",
    prop: "password",
}, ...__VLS_functionalComponentArgsRest(__VLS_192));
__VLS_194.slots.default;
const __VLS_195 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_196 = __VLS_asFunctionalComponent(__VLS_195, new __VLS_195({
    modelValue: (__VLS_ctx.createForm.password),
    type: "password",
    showPassword: true,
    placeholder: "请输入初始密码",
}));
const __VLS_197 = __VLS_196({
    modelValue: (__VLS_ctx.createForm.password),
    type: "password",
    showPassword: true,
    placeholder: "请输入初始密码",
}, ...__VLS_functionalComponentArgsRest(__VLS_196));
var __VLS_194;
const __VLS_199 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_200 = __VLS_asFunctionalComponent(__VLS_199, new __VLS_199({
    label: "角色",
    prop: "role",
}));
const __VLS_201 = __VLS_200({
    label: "角色",
    prop: "role",
}, ...__VLS_functionalComponentArgsRest(__VLS_200));
__VLS_202.slots.default;
const __VLS_203 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_204 = __VLS_asFunctionalComponent(__VLS_203, new __VLS_203({
    modelValue: (__VLS_ctx.createForm.role),
    placeholder: "请选择角色",
    ...{ style: {} },
}));
const __VLS_205 = __VLS_204({
    modelValue: (__VLS_ctx.createForm.role),
    placeholder: "请选择角色",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_204));
__VLS_206.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
    const __VLS_207 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_208 = __VLS_asFunctionalComponent(__VLS_207, new __VLS_207({
        key: (role.id),
        label: (role.name),
        value: (role.id),
    }));
    const __VLS_209 = __VLS_208({
        key: (role.id),
        label: (role.name),
        value: (role.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_208));
}
var __VLS_206;
var __VLS_202;
const __VLS_211 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_212 = __VLS_asFunctionalComponent(__VLS_211, new __VLS_211({
    label: "真实姓名",
    prop: "real_name",
}));
const __VLS_213 = __VLS_212({
    label: "真实姓名",
    prop: "real_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_212));
__VLS_214.slots.default;
const __VLS_215 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_216 = __VLS_asFunctionalComponent(__VLS_215, new __VLS_215({
    modelValue: (__VLS_ctx.createForm.real_name),
    placeholder: "请输入真实姓名",
}));
const __VLS_217 = __VLS_216({
    modelValue: (__VLS_ctx.createForm.real_name),
    placeholder: "请输入真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_216));
var __VLS_214;
const __VLS_219 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_220 = __VLS_asFunctionalComponent(__VLS_219, new __VLS_219({
    label: "手机号",
    prop: "phone",
}));
const __VLS_221 = __VLS_220({
    label: "手机号",
    prop: "phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_220));
__VLS_222.slots.default;
const __VLS_223 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_224 = __VLS_asFunctionalComponent(__VLS_223, new __VLS_223({
    modelValue: (__VLS_ctx.createForm.phone),
    placeholder: "请输入手机号",
}));
const __VLS_225 = __VLS_224({
    modelValue: (__VLS_ctx.createForm.phone),
    placeholder: "请输入手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_224));
var __VLS_222;
const __VLS_227 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_228 = __VLS_asFunctionalComponent(__VLS_227, new __VLS_227({
    label: "邮箱",
    prop: "email",
}));
const __VLS_229 = __VLS_228({
    label: "邮箱",
    prop: "email",
}, ...__VLS_functionalComponentArgsRest(__VLS_228));
__VLS_230.slots.default;
const __VLS_231 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_232 = __VLS_asFunctionalComponent(__VLS_231, new __VLS_231({
    modelValue: (__VLS_ctx.createForm.email),
    placeholder: "请输入邮箱",
}));
const __VLS_233 = __VLS_232({
    modelValue: (__VLS_ctx.createForm.email),
    placeholder: "请输入邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_232));
var __VLS_230;
var __VLS_180;
{
    const { footer: __VLS_thisSlot } = __VLS_176.slots;
    const __VLS_235 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_236 = __VLS_asFunctionalComponent(__VLS_235, new __VLS_235({
        ...{ 'onClick': {} },
    }));
    const __VLS_237 = __VLS_236({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_236));
    let __VLS_239;
    let __VLS_240;
    let __VLS_241;
    const __VLS_242 = {
        onClick: (...[$event]) => {
            __VLS_ctx.createDialogVisible = false;
        }
    };
    __VLS_238.slots.default;
    var __VLS_238;
    const __VLS_243 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_244 = __VLS_asFunctionalComponent(__VLS_243, new __VLS_243({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createSubmitting),
    }));
    const __VLS_245 = __VLS_244({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.createSubmitting),
    }, ...__VLS_functionalComponentArgsRest(__VLS_244));
    let __VLS_247;
    let __VLS_248;
    let __VLS_249;
    const __VLS_250 = {
        onClick: (__VLS_ctx.submitCreate)
    };
    __VLS_246.slots.default;
    var __VLS_246;
}
var __VLS_176;
const __VLS_251 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_252 = __VLS_asFunctionalComponent(__VLS_251, new __VLS_251({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑用户信息",
    width: "520px",
}));
const __VLS_253 = __VLS_252({
    modelValue: (__VLS_ctx.editDialogVisible),
    title: "编辑用户信息",
    width: "520px",
}, ...__VLS_functionalComponentArgsRest(__VLS_252));
__VLS_254.slots.default;
const __VLS_255 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_256 = __VLS_asFunctionalComponent(__VLS_255, new __VLS_255({
    ref: "editFormRef",
    model: (__VLS_ctx.editForm),
    rules: (__VLS_ctx.editRules),
    labelPosition: "top",
}));
const __VLS_257 = __VLS_256({
    ref: "editFormRef",
    model: (__VLS_ctx.editForm),
    rules: (__VLS_ctx.editRules),
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_256));
/** @type {typeof __VLS_ctx.editFormRef} */ ;
var __VLS_259 = {};
__VLS_258.slots.default;
const __VLS_261 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_262 = __VLS_asFunctionalComponent(__VLS_261, new __VLS_261({
    label: "真实姓名",
    prop: "real_name",
}));
const __VLS_263 = __VLS_262({
    label: "真实姓名",
    prop: "real_name",
}, ...__VLS_functionalComponentArgsRest(__VLS_262));
__VLS_264.slots.default;
const __VLS_265 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_266 = __VLS_asFunctionalComponent(__VLS_265, new __VLS_265({
    modelValue: (__VLS_ctx.editForm.real_name),
    placeholder: "请输入真实姓名",
}));
const __VLS_267 = __VLS_266({
    modelValue: (__VLS_ctx.editForm.real_name),
    placeholder: "请输入真实姓名",
}, ...__VLS_functionalComponentArgsRest(__VLS_266));
var __VLS_264;
const __VLS_269 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_270 = __VLS_asFunctionalComponent(__VLS_269, new __VLS_269({
    label: "手机号",
    prop: "phone",
}));
const __VLS_271 = __VLS_270({
    label: "手机号",
    prop: "phone",
}, ...__VLS_functionalComponentArgsRest(__VLS_270));
__VLS_272.slots.default;
const __VLS_273 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_274 = __VLS_asFunctionalComponent(__VLS_273, new __VLS_273({
    modelValue: (__VLS_ctx.editForm.phone),
    placeholder: "请输入手机号",
}));
const __VLS_275 = __VLS_274({
    modelValue: (__VLS_ctx.editForm.phone),
    placeholder: "请输入手机号",
}, ...__VLS_functionalComponentArgsRest(__VLS_274));
var __VLS_272;
const __VLS_277 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_278 = __VLS_asFunctionalComponent(__VLS_277, new __VLS_277({
    label: "邮箱",
    prop: "email",
}));
const __VLS_279 = __VLS_278({
    label: "邮箱",
    prop: "email",
}, ...__VLS_functionalComponentArgsRest(__VLS_278));
__VLS_280.slots.default;
const __VLS_281 = {}.ElInput;
/** @type {[typeof __VLS_components.ElInput, typeof __VLS_components.elInput, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(__VLS_281, new __VLS_281({
    modelValue: (__VLS_ctx.editForm.email),
    placeholder: "请输入邮箱",
}));
const __VLS_283 = __VLS_282({
    modelValue: (__VLS_ctx.editForm.email),
    placeholder: "请输入邮箱",
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
var __VLS_280;
var __VLS_258;
{
    const { footer: __VLS_thisSlot } = __VLS_254.slots;
    const __VLS_285 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_286 = __VLS_asFunctionalComponent(__VLS_285, new __VLS_285({
        ...{ 'onClick': {} },
    }));
    const __VLS_287 = __VLS_286({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_286));
    let __VLS_289;
    let __VLS_290;
    let __VLS_291;
    const __VLS_292 = {
        onClick: (...[$event]) => {
            __VLS_ctx.editDialogVisible = false;
        }
    };
    __VLS_288.slots.default;
    var __VLS_288;
    const __VLS_293 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_294 = __VLS_asFunctionalComponent(__VLS_293, new __VLS_293({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_295 = __VLS_294({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_294));
    let __VLS_297;
    let __VLS_298;
    let __VLS_299;
    const __VLS_300 = {
        onClick: (__VLS_ctx.submitEdit)
    };
    __VLS_296.slots.default;
    var __VLS_296;
}
var __VLS_254;
const __VLS_301 = {}.ElDialog;
/** @type {[typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, typeof __VLS_components.ElDialog, typeof __VLS_components.elDialog, ]} */ ;
// @ts-ignore
const __VLS_302 = __VLS_asFunctionalComponent(__VLS_301, new __VLS_301({
    modelValue: (__VLS_ctx.roleDialogVisible),
    title: "调整用户角色",
    width: "420px",
}));
const __VLS_303 = __VLS_302({
    modelValue: (__VLS_ctx.roleDialogVisible),
    title: "调整用户角色",
    width: "420px",
}, ...__VLS_functionalComponentArgsRest(__VLS_302));
__VLS_304.slots.default;
const __VLS_305 = {}.ElForm;
/** @type {[typeof __VLS_components.ElForm, typeof __VLS_components.elForm, typeof __VLS_components.ElForm, typeof __VLS_components.elForm, ]} */ ;
// @ts-ignore
const __VLS_306 = __VLS_asFunctionalComponent(__VLS_305, new __VLS_305({
    labelPosition: "top",
}));
const __VLS_307 = __VLS_306({
    labelPosition: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_306));
__VLS_308.slots.default;
const __VLS_309 = {}.ElFormItem;
/** @type {[typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, typeof __VLS_components.ElFormItem, typeof __VLS_components.elFormItem, ]} */ ;
// @ts-ignore
const __VLS_310 = __VLS_asFunctionalComponent(__VLS_309, new __VLS_309({
    label: "目标角色",
}));
const __VLS_311 = __VLS_310({
    label: "目标角色",
}, ...__VLS_functionalComponentArgsRest(__VLS_310));
__VLS_312.slots.default;
const __VLS_313 = {}.ElSelect;
/** @type {[typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, typeof __VLS_components.ElSelect, typeof __VLS_components.elSelect, ]} */ ;
// @ts-ignore
const __VLS_314 = __VLS_asFunctionalComponent(__VLS_313, new __VLS_313({
    modelValue: (__VLS_ctx.roleForm.role_id),
    placeholder: "请选择角色",
    ...{ style: {} },
}));
const __VLS_315 = __VLS_314({
    modelValue: (__VLS_ctx.roleForm.role_id),
    placeholder: "请选择角色",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_314));
__VLS_316.slots.default;
for (const [role] of __VLS_getVForSourceType((__VLS_ctx.roles))) {
    const __VLS_317 = {}.ElOption;
    /** @type {[typeof __VLS_components.ElOption, typeof __VLS_components.elOption, ]} */ ;
    // @ts-ignore
    const __VLS_318 = __VLS_asFunctionalComponent(__VLS_317, new __VLS_317({
        key: (role.id),
        label: (role.name),
        value: (role.id),
    }));
    const __VLS_319 = __VLS_318({
        key: (role.id),
        label: (role.name),
        value: (role.id),
    }, ...__VLS_functionalComponentArgsRest(__VLS_318));
}
var __VLS_316;
var __VLS_312;
var __VLS_308;
{
    const { footer: __VLS_thisSlot } = __VLS_304.slots;
    const __VLS_321 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_322 = __VLS_asFunctionalComponent(__VLS_321, new __VLS_321({
        ...{ 'onClick': {} },
    }));
    const __VLS_323 = __VLS_322({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_322));
    let __VLS_325;
    let __VLS_326;
    let __VLS_327;
    const __VLS_328 = {
        onClick: (...[$event]) => {
            __VLS_ctx.roleDialogVisible = false;
        }
    };
    __VLS_324.slots.default;
    var __VLS_324;
    const __VLS_329 = {}.ElButton;
    /** @type {[typeof __VLS_components.ElButton, typeof __VLS_components.elButton, typeof __VLS_components.ElButton, typeof __VLS_components.elButton, ]} */ ;
    // @ts-ignore
    const __VLS_330 = __VLS_asFunctionalComponent(__VLS_329, new __VLS_329({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }));
    const __VLS_331 = __VLS_330({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.saving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_330));
    let __VLS_333;
    let __VLS_334;
    let __VLS_335;
    const __VLS_336 = {
        onClick: (__VLS_ctx.submitRole)
    };
    __VLS_332.slots.default;
    var __VLS_332;
}
var __VLS_304;
/** @type {__VLS_StyleScopedClasses['user-management-view']} */ ;
/** @type {__VLS_StyleScopedClasses['user-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['user-hero__stats']} */ ;
/** @type {__VLS_StyleScopedClasses['card-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['user-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['user-panel__toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['user-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['user-table']} */ ;
/** @type {__VLS_StyleScopedClasses['user-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['user-pagination']} */ ;
// @ts-ignore
var __VLS_182 = __VLS_181, __VLS_260 = __VLS_259;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            authStore: authStore,
            loading: loading,
            saving: saving,
            createSubmitting: createSubmitting,
            users: users,
            roles: roles,
            pagination: pagination,
            filters: filters,
            editDialogVisible: editDialogVisible,
            roleDialogVisible: roleDialogVisible,
            createDialogVisible: createDialogVisible,
            editFormRef: editFormRef,
            createFormRef: createFormRef,
            editForm: editForm,
            createForm: createForm,
            roleForm: roleForm,
            editRules: editRules,
            createRules: createRules,
            activeCount: activeCount,
            disabledCount: disabledCount,
            isCurrentUser: isCurrentUser,
            loadUsers: loadUsers,
            resetFilters: resetFilters,
            handlePageChange: handlePageChange,
            handleSizeChange: handleSizeChange,
            openEdit: openEdit,
            openCreateDialog: openCreateDialog,
            submitEdit: submitEdit,
            submitCreate: submitCreate,
            openRoleDialog: openRoleDialog,
            submitRole: submitRole,
            toggleStatus: toggleStatus,
            removeUser: removeUser,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
