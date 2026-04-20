<template>
  <section class="user-management-view">
    <div class="user-hero card-panel">
      <div>
        <p class="eyebrow">User Administration</p>
        <h1>用户管理</h1>
        <p>
          当前页面已接入用户列表、关键词筛选、角色筛选、状态筛选、账号资料编辑、角色调整、启停和删除操作，适合作为后台管理起始页。
        </p>
      </div>
      <div class="user-hero__stats">
        <article>
          <span>当前总数</span>
          <strong>{{ pagination.total }}</strong>
        </article>
        <article>
          <span>启用账号</span>
          <strong>{{ activeCount }}</strong>
        </article>
        <article>
          <span>禁用账号</span>
          <strong>{{ disabledCount }}</strong>
        </article>
      </div>
    </div>

    <div class="card-panel user-panel">
      <div class="user-panel__toolbar">
        <div>
          <p class="eyebrow">Account Console</p>
          <strong>支持账号查询、编辑、角色调整、启停和管理员建号</strong>
        </div>
        <el-button v-if="authStore.user?.role === 7" type="primary" @click="openCreateDialog">注册用户</el-button>
      </div>

      <el-form :inline="true" :model="filters" class="user-filters" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="用户名 / 邮箱 / 手机 / 真实姓名" @keyup.enter="loadUsers" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" clearable placeholder="全部角色" style="width: 180px">
            <el-option label="全部角色" :value="undefined" />
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 160px">
            <el-option label="全部状态" :value="undefined" />
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadUsers">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="users" class="user-table" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="real_name" label="真实姓名" min-width="140">
          <template #default="scope">
            {{ scope.row.real_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="140">
          <template #default="scope">
            {{ scope.row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="220">
          <template #default="scope">
            {{ scope.row.email || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="角色" width="140">
          <template #default="scope">
            <el-tag effect="plain" type="warning">{{ scope.row.role_name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" effect="dark">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="c_time" label="创建时间" min-width="180" />
        <el-table-column label="操作" fixed="right" width="300">
          <template #default="scope">
            <div class="user-actions">
              <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
              <el-button link type="warning" @click="openRoleDialog(scope.row)">角色</el-button>
              <el-button link type="success" @click="toggleStatus(scope.row)">
                {{ scope.row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button link type="danger" :disabled="isCurrentUser(scope.row)" @click="removeUser(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="user-pagination">
        <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="pagination.total"
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <el-dialog v-model="createDialogVisible" title="注册用户" width="560px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="createForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="createForm.password" type="password" show-password placeholder="请输入初始密码" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="createForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">创建用户</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" title="编辑用户信息" width="520px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-position="top">
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="editForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialogVisible" title="调整用户角色" width="420px">
      <el-form label-position="top">
        <el-form-item label="目标角色">
          <el-select v-model="roleForm.role_id" placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitRole">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

type UserItem = {
  id: number
  username: string
  email?: string
  phone?: string
  real_name?: string
  role: number
  role_name: string
  status: number
  c_time: string
}

type UserListResponse = {
  list: UserItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

type RoleItem = {
  id: number
  name: string
  description: string
  permissions_count: number
}

type RoleListResponse = {
  roles: RoleItem[]
  total: number
}

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const createSubmitting = ref(false)
const users = ref<UserItem[]>([])
const roles = ref<RoleItem[]>([])
const pagination = reactive({
  total: 0,
  page: 1,
  pageSize: 10,
})

const filters = reactive<{ keyword: string; role?: number; status?: number }>({
  keyword: '',
  role: undefined,
  status: undefined,
})

const editDialogVisible = ref(false)
const roleDialogVisible = ref(false)
const createDialogVisible = ref(false)
const currentUser = ref<UserItem | null>(null)
const editFormRef = ref<FormInstance>()
const createFormRef = ref<FormInstance>()
const editForm = reactive({
  real_name: '',
  phone: '',
  email: '',
})
const createForm = reactive({
  username: '',
  password: '',
  role: 1,
  real_name: '',
  phone: '',
  email: '',
})
const roleForm = reactive({
  role_id: 1,
})

const editRules: FormRules<typeof editForm> = {
  email: [
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          callback()
          return
        }
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        callback(ok ? undefined : new Error('邮箱格式不正确'))
      },
      trigger: 'blur',
    },
  ],
}

const createRules: FormRules<typeof createForm> = {
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
}

const activeCount = computed(() => users.value.filter((item) => item.status === 1).length)
const disabledCount = computed(() => users.value.filter((item) => item.status === 0).length)

function isCurrentUser(user: UserItem) {
  return authStore.user?.id === user.id
}

async function loadRoles() {
  const data = await http.get<never, RoleListResponse>('/roles')
  roles.value = data.roles || []
}

async function loadUsers() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      page: pagination.page,
      page_size: pagination.pageSize,
    }

    if (filters.keyword.trim()) {
      params.keyword = filters.keyword.trim()
    }
    if (typeof filters.role === 'number') {
      params.role = filters.role
    }
    if (typeof filters.status === 'number') {
      params.status = filters.status
    }

    const data = await http.get<never, UserListResponse>('/users', { params })
    users.value = data.list || []
    pagination.total = data.total || 0
    pagination.page = data.page || 1
    pagination.pageSize = data.page_size || pagination.pageSize
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.role = undefined
  filters.status = undefined
  pagination.page = 1
  void loadUsers()
}

function handlePageChange(page: number) {
  pagination.page = page
  void loadUsers()
}

function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  void loadUsers()
}

function openEdit(user: UserItem) {
  currentUser.value = user
  editForm.real_name = user.real_name || ''
  editForm.phone = user.phone || ''
  editForm.email = user.email || ''
  editDialogVisible.value = true
}

function openCreateDialog() {
  createForm.username = ''
  createForm.password = ''
  createForm.role = 1
  createForm.real_name = ''
  createForm.phone = ''
  createForm.email = ''
  createDialogVisible.value = true
  createFormRef.value?.clearValidate()
}

async function submitEdit() {
  if (!currentUser.value || !editFormRef.value) {
    return
  }
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  saving.value = true
  try {
    await http.put(`/users/${currentUser.value.id}`, {
      real_name: editForm.real_name,
      phone: editForm.phone,
      email: editForm.email,
    })
    ElMessage.success('用户信息已更新')
    editDialogVisible.value = false
    await loadUsers()
  } finally {
    saving.value = false
  }
}

async function submitCreate() {
  if (!createFormRef.value) {
    return
  }
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  createSubmitting.value = true
  try {
    await http.post('/admin/users', {
      username: createForm.username.trim(),
      password: createForm.password,
      role: createForm.role,
      real_name: createForm.real_name.trim(),
      phone: createForm.phone.trim(),
      email: createForm.email.trim(),
    })
    ElMessage.success('用户创建成功')
    createDialogVisible.value = false
    await loadUsers()
  } finally {
    createSubmitting.value = false
  }
}

function openRoleDialog(user: UserItem) {
  currentUser.value = user
  roleForm.role_id = user.role
  roleDialogVisible.value = true
}

async function submitRole() {
  if (!currentUser.value) {
    return
  }

  saving.value = true
  try {
    await http.put(`/admin/users/${currentUser.value.id}/role`, {
      role_id: roleForm.role_id,
    })
    ElMessage.success('用户角色已更新')
    roleDialogVisible.value = false
    await loadUsers()
  } finally {
    saving.value = false
  }
}

async function toggleStatus(user: UserItem) {
  const nextStatus = user.status === 1 ? 0 : 1
  const actionText = nextStatus === 1 ? '启用' : '禁用'

  await ElMessageBox.confirm(`确认${actionText}账号 “${user.username}” 吗？`, '状态确认', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })

  await http.put(`/admin/users/${user.id}/status`, { status: nextStatus })
  ElMessage.success(`账号已${actionText}`)
  await loadUsers()
}

async function removeUser(user: UserItem) {
  await ElMessageBox.confirm(`确认删除账号 “${user.username}” 吗？此操作会将账号置为禁用状态。`, '删除确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning',
  })

  await http.delete(`/admin/users/${user.id}`)
  ElMessage.success('账号已删除')
  await loadUsers()
}

onMounted(async () => {
  await Promise.all([loadRoles(), loadUsers()])
})
</script>
