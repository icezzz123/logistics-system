<template>
  <el-dialog :model-value="modelValue" title="录入新订单" width="960px" class="create-order-dialog" @update:model-value="updateVisible">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="create-order-form">
      <section class="create-order-section">
        <div class="create-order-section__head">
          <p class="eyebrow">Customer</p>
          <h3>下单客户</h3>
        </div>
        <div class="create-order-grid">
          <el-form-item label="客户账号" prop="customer_id" class="create-order-grid__wide">
            <el-select
              v-model="form.customer_id"
              filterable
              remote
              reserve-keyword
              clearable
              placeholder="请输入客户姓名、用户名、手机号搜索"
              :remote-method="loadCustomerOptions"
              :loading="customerLoading"
              style="width: 100%"
            >
              <el-option v-for="item in customerOptions" :key="item.id" :label="formatCustomerLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
        </div>
      </section>

      <section class="create-order-section">
        <div class="create-order-section__head">
          <p class="eyebrow">Sender</p>
          <h3>发件信息</h3>
        </div>
        <div class="create-order-grid">
          <el-form-item label="发件人" prop="sender_name">
            <el-input v-model="form.sender_name" placeholder="请输入发件人姓名" />
          </el-form-item>
          <el-form-item label="手机号" prop="sender_phone">
            <el-input v-model="form.sender_phone" placeholder="请输入发件人手机号" />
          </el-form-item>
          <el-form-item label="国家" prop="sender_country">
            <el-input v-model="form.sender_country" placeholder="如：中国" />
          </el-form-item>
          <el-form-item label="省份">
            <el-input v-model="form.sender_province" placeholder="可选" />
          </el-form-item>
          <el-form-item label="城市" prop="sender_city">
            <el-input v-model="form.sender_city" placeholder="请输入发件城市" />
          </el-form-item>
          <el-form-item label="邮编">
            <el-input v-model="form.sender_postcode" placeholder="可选" />
          </el-form-item>
          <el-form-item label="详细地址" prop="sender_address" class="create-order-grid__wide">
            <el-input v-model="form.sender_address" placeholder="请输入发件详细地址" />
          </el-form-item>
        </div>
      </section>

      <section class="create-order-section">
        <div class="create-order-section__head">
          <p class="eyebrow">Receiver</p>
          <h3>收件信息</h3>
        </div>
        <div class="create-order-grid">
          <el-form-item label="收件人" prop="receiver_name">
            <el-input v-model="form.receiver_name" placeholder="请输入收件人姓名" />
          </el-form-item>
          <el-form-item label="手机号" prop="receiver_phone">
            <el-input v-model="form.receiver_phone" placeholder="请输入收件人手机号" />
          </el-form-item>
          <el-form-item label="国家" prop="receiver_country">
            <el-input v-model="form.receiver_country" placeholder="如：美国" />
          </el-form-item>
          <el-form-item label="省份">
            <el-input v-model="form.receiver_province" placeholder="可选" />
          </el-form-item>
          <el-form-item label="城市" prop="receiver_city">
            <el-input v-model="form.receiver_city" placeholder="请输入收件城市" />
          </el-form-item>
          <el-form-item label="邮编">
            <el-input v-model="form.receiver_postcode" placeholder="可选" />
          </el-form-item>
          <el-form-item label="详细地址" prop="receiver_address" class="create-order-grid__wide">
            <el-input v-model="form.receiver_address" placeholder="请输入收件详细地址" />
          </el-form-item>
        </div>
      </section>

      <section class="create-order-section">
        <div class="create-order-section__head">
          <p class="eyebrow">Goods</p>
          <h3>货物信息</h3>
        </div>
        <div class="create-order-grid">
          <el-form-item label="货物名称" prop="goods_name">
            <el-input v-model="form.goods_name" placeholder="请输入货物名称" />
          </el-form-item>
          <el-form-item label="货物分类">
            <el-input v-model="form.goods_category" placeholder="如：文件 / 服装 / 电子产品" />
          </el-form-item>
          <el-form-item label="重量(kg)" prop="goods_weight">
            <el-input-number v-model="form.goods_weight" :min="0.1" :step="0.1" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="体积(m³)">
            <el-input-number v-model="form.goods_volume" :min="0" :step="0.1" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="件数">
            <el-input-number v-model="form.goods_quantity" :min="1" :step="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="货值">
            <el-input-number v-model="form.goods_value" :min="0" :step="10" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="是否投保">
            <el-switch v-model="form.is_insured" :inactive-value="0" :active-value="1" />
          </el-form-item>
          <el-form-item label="保价金额" prop="insured_amount">
            <el-input-number v-model="form.insured_amount" :min="0" :step="100" :precision="2" :disabled="form.is_insured !== 1" style="width: 100%" />
          </el-form-item>
        </div>
      </section>

      <section class="create-order-section">
        <div class="create-order-section__head create-order-section__head--inline">
          <div>
            <p class="eyebrow">Packages</p>
            <h3>包裹明细</h3>
          </div>
          <el-button type="primary" plain @click="addPackage">添加包裹</el-button>
        </div>

        <p class="create-order-tip">不填写包裹明细时，系统会按订单汇总信息自动生成 1 个包裹。</p>

        <div v-if="form.packages.length" class="package-list">
          <article v-for="(item, index) in form.packages" :key="index" class="package-card">
            <div class="package-card__head">
              <strong>包裹 {{ index + 1 }}</strong>
              <el-button link type="danger" @click="removePackage(index)">删除</el-button>
            </div>
            <div class="create-order-grid">
              <el-form-item label="包裹号">
                <el-input v-model="item.parcel_no" placeholder="可选，不填则自动生成" />
              </el-form-item>
              <el-form-item label="货物名称">
                <el-input v-model="item.goods_name" placeholder="请输入包裹货物名称" />
              </el-form-item>
              <el-form-item label="货物分类">
                <el-input v-model="item.goods_category" placeholder="如：服装 / 文件" />
              </el-form-item>
              <el-form-item label="重量(kg)">
                <el-input-number v-model="item.weight" :min="0.1" :step="0.1" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="体积(m³)">
                <el-input-number v-model="item.volume" :min="0" :step="0.1" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="件数">
                <el-input-number v-model="item.quantity" :min="1" :step="1" style="width: 100%" />
              </el-form-item>
              <el-form-item label="货值">
                <el-input-number v-model="item.goods_value" :min="0" :step="10" :precision="2" style="width: 100%" />
              </el-form-item>
              <el-form-item label="备注" class="create-order-grid__wide">
                <el-input v-model="item.remark" maxlength="120" placeholder="可选，填写包裹备注" />
              </el-form-item>
            </div>
          </article>
        </div>
      </section>

      <section class="create-order-section">
        <div class="create-order-section__head">
          <p class="eyebrow">Transport</p>
          <h3>运输信息</h3>
        </div>
        <div class="create-order-grid">
          <el-form-item label="运输方式" prop="transport_mode">
            <el-select v-model="form.transport_mode" placeholder="请选择运输方式" style="width: 100%">
              <el-option v-for="item in transportModeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="服务类型">
            <el-select v-model="form.service_type" placeholder="请选择服务类型" style="width: 100%">
              <el-option v-for="item in serviceTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注" class="create-order-grid__wide">
            <el-input v-model="form.remark" type="textarea" :rows="4" maxlength="255" show-word-limit placeholder="可选，填写特殊要求或业务备注" />
          </el-form-item>
        </div>
      </section>
    </el-form>

    <template #footer>
      <el-button @click="updateVisible(false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交订单</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

import http from '@/utils/http'

type CreateOrderResponse = {
  order_id: number
  order_no: string
  freight_charge: number
  insurance_fee: number
  total_amount: number
  estimated_days: number
  order_time: number
  package_count: number
}

type PackageFormItem = {
  parcel_no: string
  goods_name: string
  goods_category: string
  weight: number
  volume: number
  quantity: number
  goods_value: number
  remark: string
}

type CustomerOption = {
  id: number
  username: string
  real_name?: string
  phone?: string
  email?: string
  display_name: string
}

type CustomerOptionListResponse = {
  list: CustomerOption[]
  total: number
}

const transportModeOptions = [
  { value: 1, label: '空运' },
  { value: 2, label: '海运' },
  { value: 3, label: '陆运' },
  { value: 4, label: '铁路' },
  { value: 5, label: '快递' },
]

const serviceTypeOptions = [
  { value: 'standard', label: '标准服务' },
  { value: 'express', label: '加急服务' },
  { value: 'economy', label: '经济服务' },
]

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', payload: CreateOrderResponse): void
}>()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const customerLoading = ref(false)
const customerOptions = ref<CustomerOption[]>([])

const createEmptyPackage = (): PackageFormItem => ({
  parcel_no: '',
  goods_name: '',
  goods_category: '',
  weight: 1,
  volume: 0,
  quantity: 1,
  goods_value: 0,
  remark: '',
})

const createDefaultForm = () => ({
  customer_id: undefined as number | undefined,
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
  packages: [] as PackageFormItem[],
  transport_mode: 3,
  service_type: 'standard',
  remark: '',
})

const form = reactive(createDefaultForm())

const rules: FormRules<typeof form> = {
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
}

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) {
      return
    }
    Object.assign(form, createDefaultForm())
    await loadCustomerOptions('')
    nextTick(() => {
      formRef.value?.clearValidate()
    })
  },
)

function validateGoodsWeight(_rule: unknown, value: number, callback: (error?: Error) => void) {
  callback(Number(value) > 0 ? undefined : new Error('货物重量必须大于 0'))
}

function validateInsuredAmount(_rule: unknown, value: number, callback: (error?: Error) => void) {
  if (form.is_insured !== 1) {
    callback()
    return
  }
  callback(Number(value) > 0 ? undefined : new Error('投保时保价金额必须大于 0'))
}

function updateVisible(value: boolean) {
  emit('update:modelValue', value)
}

function addPackage() {
  form.packages.push(createEmptyPackage())
}

function removePackage(index: number) {
  form.packages.splice(index, 1)
}

function formatCustomerLabel(item: CustomerOption) {
  const parts = [item.display_name]
  if (item.username && item.username !== item.display_name) {
    parts.push(`(${item.username})`)
  }
  if (item.phone) {
    parts.push(item.phone)
  }
  return parts.join(' ')
}

async function loadCustomerOptions(keyword: string) {
  customerLoading.value = true
  try {
    const data = await http.get<never, CustomerOptionListResponse>('/customers/options', {
      params: {
        keyword: keyword.trim(),
        page_size: 20,
      },
    })
    customerOptions.value = data.list || []
  } finally {
    customerLoading.value = false
  }
}

async function submit() {
  if (!formRef.value) {
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
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
    }

    const data = await http.post<never, CreateOrderResponse>('/orders', payload)
    ElMessage.success(`订单创建成功：${data.order_no}`)
    emit('created', data)
    updateVisible(false)
  } finally {
    submitting.value = false
  }
}
</script>
<style scoped>
.create-order-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.create-order-section {
  padding: 1.15rem;
  border-radius: 20px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 248, 243, 0.72);
}

.create-order-section__head {
  margin-bottom: 0.9rem;
}

.create-order-section__head--inline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.create-order-section__head h3 {
  margin: 0;
  font-size: 1.02rem;
}

.create-order-tip {
  margin: 0 0 0.9rem;
  color: var(--muted);
}

.create-order-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 1rem;
}

.create-order-grid__wide {
  grid-column: 1 / -1;
}

.create-order-dialog :deep(.el-dialog__body) {
  max-height: 72vh;
  overflow: auto;
}

.package-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.package-card {
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(238, 77, 45, 0.12);
  background: rgba(255, 255, 255, 0.88);
}

.package-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

@media (max-width: 900px) {
  .create-order-grid {
    grid-template-columns: 1fr;
  }
}
</style>
