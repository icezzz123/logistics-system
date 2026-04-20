<template>
  <section class="profile-center-view">
    <div class="profile-hero card-panel">
      <div>
        <p class="eyebrow">Profile Center</p>
        <h1>{{ displayName }}</h1>
        <p>{{ profile.username }} · {{ roleName }} · {{ profile.status === 1 ? '账号正常' : '账号禁用' }}</p>
      </div>
      <div class="profile-hero__stats">
        <article><span>角色</span><strong>{{ roleName }}</strong></article>
        <article><span>权限数</span><strong>{{ permissions.length }}</strong></article>
        <article><span>创建时间</span><strong>{{ formatUnix(profile.ctime) }}</strong></article>
        <article><span>更新时间</span><strong>{{ formatUnix(profile.mtime) }}</strong></article>
      </div>
    </div>

    <div class="profile-layout">
      <div class="card-panel profile-panel">
        <div class="profile-panel__toolbar">
          <div>
            <p class="eyebrow">Account</p>
            <strong>个人资料与联系信息</strong>
          </div>
          <div class="profile-panel__toolbar-actions">
            <el-button @click="openPasswordDialog">修改密码</el-button>
            <el-button type="primary" @click="openEditDialog">编辑资料</el-button>
          </div>
        </div>

        <div class="profile-grid">
          <article class="profile-card">
            <h3>基础信息</h3>
            <dl>
              <div><dt>用户名</dt><dd>{{ profile.username }}</dd></div>
              <div><dt>真实姓名</dt><dd>{{ normalizeText(profile.real_name, '未设置') }}</dd></div>
              <div><dt>邮箱</dt><dd>{{ normalizeText(profile.email, '未设置') }}</dd></div>
              <div><dt>手机号</dt><dd>{{ normalizeText(profile.phone, '未设置') }}</dd></div>
            </dl>
          </article>
        </div>
      </div>

      <div class="card-panel profile-panel">
        <AddressBookManager />
      </div>
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑个人资料" width="520px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-position="top">
        <el-form-item label="真实姓名">
          <el-input v-model="editForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="editDialogVisible = false">取消</el-button><el-button type="primary" :loading="editSubmitting" @click="submitEdit">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="520px">
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top">
        <el-form-item label="原密码" prop="old_password"><el-input v-model="passwordForm.old_password" type="password" show-password placeholder="请输入原密码" /></el-form-item>
        <el-form-item label="新密码" prop="new_password"><el-input v-model="passwordForm.new_password" type="password" show-password placeholder="请输入新密码" /></el-form-item>
        <el-form-item label="确认密码" prop="confirm_password"><el-input v-model="passwordForm.confirm_password" type="password" show-password placeholder="请再次输入新密码" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="passwordDialogVisible = false">取消</el-button><el-button type="primary" :loading="passwordSubmitting" @click="submitPassword">修改密码</el-button></template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import AddressBookManager from '@/components/AddressBookManager.vue'
import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

type Profile = { id: number; username: string; email?: string; phone?: string; real_name?: string; role: number; status: number; ctime?: number; mtime?: number }
type PermissionState = { role: number; role_name: string; permissions: string[] }

const authStore = useAuthStore()
const profile = reactive<Profile>({ id: 0, username: '', email: '', phone: '', real_name: '', role: 0, status: 1, ctime: 0, mtime: 0 })
const permissions = ref<string[]>([])
const roleName = ref('未知角色')
const editDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const editSubmitting = ref(false)
const passwordSubmitting = ref(false)

const editFormRef = ref<FormInstance>()
const editForm = reactive({ real_name: '', phone: '', email: '' })
const editRules: FormRules<typeof editForm> = { email: [{ validator: validateEmail, trigger: 'blur' }] }

const passwordFormRef = ref<FormInstance>()
const passwordForm = reactive({ old_password: '', new_password: '', confirm_password: '' })
const passwordRules: FormRules<typeof passwordForm> = { old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }], new_password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '新密码至少 6 位', trigger: 'blur' }], confirm_password: [{ validator: validateConfirmPassword, trigger: 'blur' }] }

const displayName = computed(() => normalizeText(profile.real_name, profile.username))

function normalizeText(value: string | null | undefined, fallback = '-') { const text = String(value ?? '').trim(); if (!text || /^[?？�]+$/.test(text)) return fallback; return text }
function formatUnix(value: number | undefined | null) { if (!value) return '-'; const date = new Date(value * 1000); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false }) }
function validateEmail(_rule: unknown, value: string, callback: (error?: Error) => void) { if (!value) { callback(); return } callback(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : new Error('邮箱格式不正确')) }
function validateConfirmPassword(_rule: unknown, value: string, callback: (error?: Error) => void) { if (!value) { callback(new Error('请确认新密码')); return } callback(value === passwordForm.new_password ? undefined : new Error('两次输入的新密码不一致')) }

async function loadProfile() { const data = await http.get<never, Profile>('/profile'); Object.assign(profile, data); authStore.user = { ...(authStore.user || {}), ...data } as typeof authStore.user }
async function loadPermissions() { const data = await http.get<never, PermissionState>('/permissions'); permissions.value = data.permissions || []; roleName.value = data.role_name || '未知角色'; authStore.permissions = permissions.value }

function openEditDialog() { editForm.real_name = profile.real_name || ''; editForm.phone = profile.phone || ''; editForm.email = profile.email || ''; editDialogVisible.value = true; editFormRef.value?.clearValidate() }
async function submitEdit() { if (!editFormRef.value) return; const valid = await editFormRef.value.validate().catch(() => false); if (!valid) return; editSubmitting.value = true; try { await http.put(`/users/${profile.id}`, { real_name: editForm.real_name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim() }); ElMessage.success('个人资料已更新'); editDialogVisible.value = false; await loadProfile() } finally { editSubmitting.value = false } }

function openPasswordDialog() { passwordForm.old_password = ''; passwordForm.new_password = ''; passwordForm.confirm_password = ''; passwordDialogVisible.value = true; passwordFormRef.value?.clearValidate() }
async function submitPassword() { if (!passwordFormRef.value) return; const valid = await passwordFormRef.value.validate().catch(() => false); if (!valid) return; passwordSubmitting.value = true; try { await http.put('/user/password', { old_password: passwordForm.old_password, new_password: passwordForm.new_password }); ElMessage.success('密码已修改'); passwordDialogVisible.value = false } finally { passwordSubmitting.value = false } }

onMounted(async () => { await Promise.all([loadProfile(), loadPermissions()]) })
</script>

<style scoped>
.profile-center-view, .profile-layout { display: flex; flex-direction: column; gap: 1rem; }
.profile-hero, .profile-panel { padding: 1.5rem; }
.profile-hero { display: flex; justify-content: space-between; gap: 1.5rem; }
.profile-hero h1 { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: clamp(2.2rem, 4vw, 3.4rem); }
.profile-hero p { max-width: 48rem; color: var(--muted); line-height: 1.75; }
.profile-hero__stats { min-width: 18rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.profile-hero__stats article, .profile-card { padding: 1rem 1.15rem; border-radius: 18px; background: rgba(238, 77, 45, 0.08); border: 1px solid rgba(238, 77, 45, 0.14); }
.profile-hero__stats span { display: block; color: var(--muted); font-size: 0.85rem; margin-bottom: 0.35rem; }
.profile-hero__stats strong { font-size: 1.2rem; color: var(--accent-deep); }
.profile-panel__toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1rem; }
.profile-panel__toolbar strong { color: var(--ink); }
.profile-panel__toolbar-actions { display: flex; gap: 0.75rem; }
.profile-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
.profile-card h3 { margin: 0 0 0.8rem; color: var(--ink); }
.profile-card dl { display: flex; flex-direction: column; gap: 0.75rem; margin: 0; }
.profile-card dl div { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: 0.75rem; }
.profile-card dt { color: var(--muted); }
.profile-card dd { margin: 0; color: var(--ink); line-height: 1.6; }
@media (max-width: 1024px) { .profile-hero, .profile-panel__toolbar { flex-direction: column; } .profile-hero__stats, .profile-grid { grid-template-columns: 1fr; } }
</style>
