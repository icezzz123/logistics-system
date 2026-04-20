<template>
  <el-dialog :model-value="modelValue" title="录入新订单" width="960px" class="create-order-dialog" @update:model-value="updateVisible">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="create-order-form">
      <section class="create-order-section">
        <div class="create-order-section__head create-order-section__head--inline">
          <div>
            <p class="eyebrow">Sender</p>
            <h3>发件信息</h3>
          </div>
          <div class="create-order-section__actions">
            <el-select
              v-model="selectedSenderAddressId"
              clearable
              filterable
              placeholder="选择常用发件地址"
              :disabled="!canUseAddressBook"
              :loading="addressLoading"
              class="create-order-section__select"
              @change="applySelectedAddress('sender', $event)"
            >
              <el-option v-for="item in senderAddressOptions" :key="item.id" :label="formatAddressBookLabel(item)" :value="item.id" />
            </el-select>
            <el-button plain :disabled="!canUseAddressBook" :loading="quickSaveLoading.sender" @click="saveCurrentAddress('sender')">保存到地址簿</el-button>
          </div>
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
        <div class="create-order-section__head create-order-section__head--inline">
          <div>
            <p class="eyebrow">Receiver</p>
            <h3>收件信息</h3>
          </div>
          <div class="create-order-section__actions">
            <el-select
              v-model="selectedReceiverAddressId"
              clearable
              filterable
              placeholder="选择常用收件地址"
              :disabled="!canUseAddressBook"
              :loading="addressLoading"
              class="create-order-section__select"
              @change="applySelectedAddress('receiver', $event)"
            >
              <el-option v-for="item in receiverAddressOptions" :key="item.id" :label="formatAddressBookLabel(item)" :value="item.id" />
            </el-select>
            <el-button plain :disabled="!canUseAddressBook" :loading="quickSaveLoading.receiver" @click="saveCurrentAddress('receiver')">保存到地址簿</el-button>
          </div>
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
            <p class="eyebrow">Customs</p>
            <h3>清关申报</h3>
          </div>
          <el-button plain :loading="hsSuggesting" @click="suggestHSCode">自动匹配 HS Code</el-button>
        </div>
        <p v-if="hsSuggestion?.suggestion" class="create-order-tip">
          推荐：{{ hsSuggestion.suggestion.hs_code }} / {{ hsSuggestion.suggestion.customs_declaration }}
          <template v-if="hsSuggestion.suggestion.reason"> · {{ hsSuggestion.suggestion.reason }}</template>
        </p>
        <div class="create-order-grid">
          <el-form-item label="申报品名">
            <el-input v-model="form.customs_declaration" placeholder="如：服装 / 电子配件" />
          </el-form-item>
          <el-form-item label="HS Code">
            <el-input v-model="form.hs_code" placeholder="请输入 HS Code" />
          </el-form-item>
          <el-form-item label="申报价值">
            <el-input-number v-model="form.declared_value" :min="0" :step="10" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="关税">
            <el-input-number v-model="form.customs_duty" :min="0" :step="10" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="增值税">
            <el-input-number v-model="form.customs_vat" :min="0" :step="10" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="其他税费">
            <el-input-number v-model="form.customs_other_tax" :min="0" :step="10" :precision="2" style="width: 100%" />
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
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

import http from '@/utils/http'
import { useAuthStore } from '@/stores/auth'

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

type HSCodeSuggestionItem = {
  hs_code: string
  customs_declaration: string
  category: string
  confidence: string
  reason: string
}

type HSCodeSuggestResponse = {
  matched: boolean
  suggestion?: HSCodeSuggestionItem
  alternatives: HSCodeSuggestionItem[]
  note: string
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
}

type AddressBookListResponse = {
  list: AddressBookItem[]
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

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', payload: CreateOrderResponse): void
}>()

const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const addressLoading = ref(false)
const hsSuggesting = ref(false)
const addressBookList = ref<AddressBookItem[]>([])
const hsSuggestion = ref<HSCodeSuggestResponse | null>(null)
const selectedSenderAddressId = ref<number | undefined>()
const selectedReceiverAddressId = ref<number | undefined>()
const quickSaveLoading = reactive({ sender: false, receiver: false })

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
  packages: [] as PackageFormItem[],
  transport_mode: 3,
  service_type: 'standard',
  remark: '',
})

const form = reactive(createDefaultForm())

const rules: FormRules<typeof form> = {
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

const canUseAddressBook = computed(() => Boolean(authStore.user?.id))
const senderAddressOptions = computed(() => addressBookList.value.filter((item) => item.address_type === 'sender'))
const receiverAddressOptions = computed(() => addressBookList.value.filter((item) => item.address_type === 'receiver'))

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    Object.assign(form, createDefaultForm())
    hsSuggestion.value = null
    clearAddressSelections()
    await loadAddressBook()
    nextTick(() => formRef.value?.clearValidate())
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

function clearAddressSelections() {
  selectedSenderAddressId.value = undefined
  selectedReceiverAddressId.value = undefined
}

function formatAddressBookLabel(item: AddressBookItem) {
  return `${item.label} · ${item.contact_name} · ${item.city}`
}

async function loadAddressBook() {
  if (!authStore.user?.id) {
    addressBookList.value = []
    clearAddressSelections()
    return
  }

  addressLoading.value = true
  try {
    const data = await http.get<never, AddressBookListResponse>('/address-book')
    addressBookList.value = data.list || []
    applyDefaultAddressesIfNeeded()
  } finally {
    addressLoading.value = false
  }
}

function applyDefaultAddressesIfNeeded() {
  if (!form.sender_name && !form.sender_phone && !form.sender_address) {
    const senderDefault = senderAddressOptions.value.find((item) => item.is_default === 1)
    if (senderDefault) {
      selectedSenderAddressId.value = senderDefault.id
      applyAddressToForm('sender', senderDefault)
    }
  }

  if (!form.receiver_name && !form.receiver_phone && !form.receiver_address) {
    const receiverDefault = receiverAddressOptions.value.find((item) => item.is_default === 1)
    if (receiverDefault) {
      selectedReceiverAddressId.value = receiverDefault.id
      applyAddressToForm('receiver', receiverDefault)
    }
  }
}

function applySelectedAddress(type: 'sender' | 'receiver', value: number | undefined) {
  if (!value) return
  const target = addressBookList.value.find((item) => item.id === value && item.address_type === type)
  if (!target) return
  applyAddressToForm(type, target)
}

function applyAddressToForm(type: 'sender' | 'receiver', item: AddressBookItem) {
  if (type === 'sender') {
    form.sender_name = item.contact_name
    form.sender_phone = item.contact_phone
    form.sender_country = item.country
    form.sender_province = item.province
    form.sender_city = item.city
    form.sender_address = item.address
    form.sender_postcode = item.postcode
    return
  }

  form.receiver_name = item.contact_name
  form.receiver_phone = item.contact_phone
  form.receiver_country = item.country
  form.receiver_province = item.province
  form.receiver_city = item.city
  form.receiver_address = item.address
  form.receiver_postcode = item.postcode
}

function buildQuickSavePayload(type: 'sender' | 'receiver') {
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
  }

  if (type === 'sender') {
    payload.contact_name = form.sender_name.trim()
    payload.contact_phone = form.sender_phone.trim()
    payload.country = form.sender_country.trim()
    payload.province = form.sender_province.trim()
    payload.city = form.sender_city.trim()
    payload.address = form.sender_address.trim()
    payload.postcode = form.sender_postcode.trim()
    payload.label = `${payload.contact_name || '发件人'}-${payload.city || '常用地址'}`
    payload.is_default = senderAddressOptions.value.length === 0 ? 1 : 0
    return payload
  }

  payload.contact_name = form.receiver_name.trim()
  payload.contact_phone = form.receiver_phone.trim()
  payload.country = form.receiver_country.trim()
  payload.province = form.receiver_province.trim()
  payload.city = form.receiver_city.trim()
  payload.address = form.receiver_address.trim()
  payload.postcode = form.receiver_postcode.trim()
  payload.label = `${payload.contact_name || '收件人'}-${payload.city || '常用地址'}`
  payload.is_default = receiverAddressOptions.value.length === 0 ? 1 : 0
  return payload
}

function validateQuickSavePayload(payload: ReturnType<typeof buildQuickSavePayload>) {
  if (!payload.contact_name) throw new Error('请先填写联系人姓名')
  if (!payload.contact_phone) throw new Error('请先填写联系电话')
  if (!payload.country) throw new Error('请先填写国家')
  if (!payload.city) throw new Error('请先填写城市')
  if (!payload.address) throw new Error('请先填写详细地址')
}

async function saveCurrentAddress(type: 'sender' | 'receiver') {
  if (!canUseAddressBook.value) {
    ElMessage.warning('当前账号不可用，请重新登录后重试')
    return
  }

  const payload = buildQuickSavePayload(type)
  try {
    validateQuickSavePayload(payload)
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '地址信息不完整')
    return
  }

  const prompt = await ElMessageBox.prompt('请输入地址标签，方便下次快速选择。', '保存到地址簿', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputValue: payload.label,
    inputPattern: /^.{1,50}$/,
    inputErrorMessage: '地址标签长度需在 1-50 个字符之间',
  }).catch(() => null)

  if (!prompt || !prompt.value) return

  payload.label = prompt.value.trim()
  quickSaveLoading[type] = true
  try {
    const data = await http.post<never, AddressBookItem>('/address-book', payload)
    ElMessage.success('地址已保存到地址簿')
    await loadAddressBook()
    if (type === 'sender') {
      selectedSenderAddressId.value = data.id
    } else {
      selectedReceiverAddressId.value = data.id
    }
  } finally {
    quickSaveLoading[type] = false
  }
}

async function suggestHSCode() {
  hsSuggesting.value = true
  try {
    const data = await http.post<never, HSCodeSuggestResponse>('/orders/hs-suggest', {
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
    })
    hsSuggestion.value = data
    if (data.suggestion) {
      form.hs_code = data.suggestion.hs_code
      if (!form.customs_declaration.trim()) {
        form.customs_declaration = data.suggestion.customs_declaration
      }
      ElMessage.success(`已匹配 HS Code：${data.suggestion.hs_code}`)
    } else {
      ElMessage.warning(data.note || '未匹配到常见 HS Code')
    }
  } finally {
    hsSuggesting.value = false
  }
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!authStore.user?.id) {
    ElMessage.warning('当前账号不可用，请重新登录后重试')
    return
  }

  submitting.value = true
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

.create-order-section__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.create-order-section__select {
  width: 280px;
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
  .create-order-section__head--inline,
  .create-order-section__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .create-order-section__select {
    width: 100%;
  }

  .create-order-grid {
    grid-template-columns: 1fr;
  }
}
</style>
