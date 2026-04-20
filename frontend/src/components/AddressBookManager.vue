<template>
  <section class="address-book-manager">
    <div class="address-book-manager__toolbar">
      <div>
        <p class="eyebrow">Address Book</p>
        <strong>常用寄件与收件地址</strong>
      </div>
      <div class="address-book-manager__toolbar-actions">
        <el-input v-model="filters.keyword" clearable placeholder="搜索标签 / 联系人 / 城市 / 地址" style="width: 260px" @keyup.enter="loadAddresses" />
        <el-select v-model="filters.type" clearable placeholder="全部类型" style="width: 160px" @change="loadAddresses">
          <el-option label="全部类型" value="" />
          <el-option label="发件地址" value="sender" />
          <el-option label="收件地址" value="receiver" />
        </el-select>
        <el-button @click="loadAddresses">查询</el-button>
        <el-button type="primary" @click="openCreateDialog">新增地址</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="addresses" stripe>
      <el-table-column prop="address_type_name" label="类型" width="120">
        <template #default="scope">
          <el-tag :type="scope.row.address_type === 'sender' ? 'success' : 'warning'" effect="dark">
            {{ scope.row.address_type_name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="label" label="地址标签" min-width="150" />
      <el-table-column label="联系人" min-width="180">
        <template #default="scope">
          <div class="address-book-manager__contact">
            <strong>{{ scope.row.contact_name }}</strong>
            <span>{{ scope.row.contact_phone }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="地址" min-width="320">
        <template #default="scope">
          <div class="address-book-manager__address">
            <strong>{{ formatAddress(scope.row) }}</strong>
            <span v-if="scope.row.postcode">邮编：{{ scope.row.postcode }}</span>
            <small v-if="scope.row.remark">{{ scope.row.remark }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="默认" width="110">
        <template #default="scope">
          <el-tag v-if="scope.row.is_default === 1" type="danger" effect="dark">默认</el-tag>
          <span v-else class="address-book-manager__muted">否</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="scope">{{ formatUnix(scope.row.mtime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="scope">
          <div class="address-book-manager__actions">
            <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
            <el-button v-if="scope.row.is_default !== 1" link type="warning" @click="setDefault(scope.row)">设为默认</el-button>
            <el-button link type="danger" @click="removeAddress(scope.row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && !addresses.length" description="还没有地址簿记录，先新增一个常用地址吧" />

    <el-dialog v-model="dialogVisible" :title="editingAddress ? '编辑地址' : '新增地址'" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="address-book-manager__form-grid">
          <el-form-item label="地址类型" prop="address_type">
            <el-select v-model="form.address_type" placeholder="请选择地址类型" style="width: 100%">
              <el-option label="发件地址" value="sender" />
              <el-option label="收件地址" value="receiver" />
            </el-select>
          </el-form-item>
          <el-form-item label="地址标签" prop="label">
            <el-input v-model="form.label" placeholder="如：家里 / 公司 / 美国仓" />
          </el-form-item>
          <el-form-item label="联系人" prop="contact_name">
            <el-input v-model="form.contact_name" placeholder="请输入联系人姓名" />
          </el-form-item>
          <el-form-item label="联系电话" prop="contact_phone">
            <el-input v-model="form.contact_phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="国家" prop="country">
            <el-input v-model="form.country" placeholder="请输入国家" />
          </el-form-item>
          <el-form-item label="省份">
            <el-input v-model="form.province" placeholder="可选" />
          </el-form-item>
          <el-form-item label="城市" prop="city">
            <el-input v-model="form.city" placeholder="请输入城市" />
          </el-form-item>
          <el-form-item label="邮编">
            <el-input v-model="form.postcode" placeholder="可选" />
          </el-form-item>
          <el-form-item label="详细地址" prop="address" class="address-book-manager__form-grid-wide">
            <el-input v-model="form.address" placeholder="请输入详细地址" />
          </el-form-item>
          <el-form-item label="备注" class="address-book-manager__form-grid-wide">
            <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="255" show-word-limit placeholder="可选，填写门牌提示、仓位说明等" />
          </el-form-item>
          <el-form-item label="默认地址" class="address-book-manager__form-grid-wide">
            <el-switch v-model="form.is_default" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

type AddressBookItem = {
  id: number
  user_id: number
  label: string
  address_type: 'sender' | 'receiver'
  address_type_name: string
  contact_name: string
  contact_phone: string
  country: string
  province: string
  city: string
  address: string
  postcode: string
  remark: string
  is_default: number
  ctime: number
  mtime: number
}

type AddressBookListResponse = {
  list: AddressBookItem[]
  total: number
}

const props = withDefaults(defineProps<{
  customerId?: number
}>(), {
  customerId: 0,
})

const authStore = useAuthStore()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingAddress = ref<AddressBookItem | null>(null)
const addresses = ref<AddressBookItem[]>([])
const formRef = ref<FormInstance>()

const filters = reactive({
  keyword: '',
  type: '' as '' | 'sender' | 'receiver',
})

const createDefaultForm = () => ({
  label: '',
  address_type: 'sender' as 'sender' | 'receiver',
  contact_name: '',
  contact_phone: '',
  country: '中国',
  province: '',
  city: '',
  address: '',
  postcode: '',
  remark: '',
  is_default: 0,
})

const form = reactive(createDefaultForm())

const rules: FormRules<typeof form> = {
  label: [{ required: true, message: '请输入地址标签', trigger: 'blur' }],
  address_type: [{ required: true, message: '请选择地址类型', trigger: 'change' }],
  contact_name: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contact_phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  country: [{ required: true, message: '请输入国家', trigger: 'blur' }],
  city: [{ required: true, message: '请输入城市', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
}

watch(
  () => props.customerId,
  () => {
    void loadAddresses()
  },
)

function getRequestCustomerId() {
  if (props.customerId && props.customerId > 0 && props.customerId !== authStore.user?.id) {
    return props.customerId
  }
  return undefined
}

function formatAddress(item: Pick<AddressBookItem, 'country' | 'province' | 'city' | 'address'>) {
  return [item.country, item.province, item.city, item.address].filter(Boolean).join(' / ')
}

function formatUnix(value: number | undefined | null) {
  if (!value) return '-'
  const date = new Date(value * 1000)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

function openCreateDialog() {
  editingAddress.value = null
  Object.assign(form, createDefaultForm())
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function openEditDialog(item: AddressBookItem) {
  editingAddress.value = item
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
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

async function loadAddresses() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {}
    if (filters.keyword.trim()) params.keyword = filters.keyword.trim()
    if (filters.type) params.type = filters.type
    const customerId = getRequestCustomerId()
    if (customerId) params.customer_id = customerId
    const data = await http.get<never, AddressBookListResponse>('/address-book', { params })
    addresses.value = data.list || []
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload: Record<string, string | number> = {
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
    }
    const customerId = getRequestCustomerId()
    if (!editingAddress.value && customerId) {
      payload.customer_id = customerId
    }

    if (editingAddress.value) {
      await http.put(`/address-book/${editingAddress.value.id}`, payload)
      ElMessage.success('地址簿已更新')
    } else {
      await http.post('/address-book', payload)
      ElMessage.success('地址已保存到地址簿')
    }

    dialogVisible.value = false
    await loadAddresses()
  } finally {
    submitting.value = false
  }
}

async function setDefault(item: AddressBookItem) {
  await http.put(`/address-book/${item.id}/default`)
  ElMessage.success('默认地址已更新')
  await loadAddresses()
}

async function removeAddress(item: AddressBookItem) {
  await ElMessageBox.confirm(`确认删除地址簿记录“${item.label}”吗？`, '删除确认', { type: 'warning' })
  await http.delete(`/address-book/${item.id}`)
  ElMessage.success('地址簿记录已删除')
  await loadAddresses()
}

onMounted(() => {
  void loadAddresses()
})
</script>

<style scoped>
.address-book-manager {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.address-book-manager__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.address-book-manager__toolbar-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.address-book-manager__contact,
.address-book-manager__address {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.address-book-manager__contact strong,
.address-book-manager__address strong {
  color: var(--ink);
}

.address-book-manager__contact span,
.address-book-manager__address span,
.address-book-manager__address small,
.address-book-manager__muted {
  color: var(--muted);
}

.address-book-manager__actions {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.address-book-manager__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 1rem;
}

.address-book-manager__form-grid-wide {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .address-book-manager__toolbar {
    flex-direction: column;
  }

  .address-book-manager__toolbar-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .address-book-manager__form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
