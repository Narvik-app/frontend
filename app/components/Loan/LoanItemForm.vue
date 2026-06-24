<script setup lang="ts">
import type {PropType, Ref} from 'vue'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {LoanCategory} from '~/types/api/item/clubDependent/plugin/loan/loanCategory'
import LoanItemQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanItemQuery'
import LoanCategoryQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanCategoryQuery'
import FileQuery from '~/composables/api/query/FileQuery'
import type {FormError, FormErrorEvent} from '#ui/types'
import type {SelectApiItem} from '~/types/select'
import {getFileFormDataFromUInputChangeEvent, displayFileErrorToast} from '~/utils/file'

const props = defineProps({
  item: {
    type: Object as PropType<LoanItem>,
    required: false,
    default: undefined,
  },
  categories: {
    type: Object as PropType<LoanCategory[]>,
    required: false,
    default: undefined,
  },
  viewOnly: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits(['updated'])

const toast = useToast()
const loanItemQuery = new LoanItemQuery()
const loanCategoryQuery = new LoanCategoryQuery()
const fileQuery = new FileQuery()

const item: Ref<LoanItem> = props.item ? ref({...props.item}) : ref(getDefaultLoanItem())
const categories: Ref<LoanCategory[] | undefined> = ref(props.categories)
const isUpdating = ref(false)

// Image state
const currentImageBase64 = ref<string | undefined>()
const pendingFormData = ref<FormData | null>(null)
const imagePreviewUrl = ref<string | undefined>()
const isRemovingImage = ref(false)

// Category select
const selectedCategory = ref<SelectApiItem<LoanCategory> | undefined>(
  props.item?.category && typeof props.item.category === 'object'
    ? {label: props.item.category.name, value: props.item.category.uuid, item: props.item.category}
    : undefined
)
const categoryItems = computed(() => {
  const result: SelectApiItem<LoanCategory>[] = []
  categories.value?.forEach(cat => {
    result.push({label: cat.name, value: cat.uuid, item: cat})
  })
  return result
})

const statusOptions = [
  {label: 'Disponible', value: 'available'},
  {label: 'Maintenance', value: 'maintenance'},
  {label: 'Vendu', value: 'sold'},
  {label: 'Retiré', value: 'retired'},
]

watch(props, async () => {
  item.value = props.item ? {...props.item} : getDefaultLoanItem()
  selectedCategory.value = props.item?.category && typeof props.item.category === 'object'
    ? {label: props.item.category.name, value: props.item.category.uuid, item: props.item.category}
    : undefined
  pendingFormData.value = null
  imagePreviewUrl.value = undefined
  isRemovingImage.value = false
  if (!props.categories) {
    await fetchCategories()
  }
  if (props.item?.image?.privateUrl) {
    const {retrieved} = await fileQuery.getFromUrl(props.item.image.privateUrl)
    currentImageBase64.value = retrieved?.base64
  } else {
    currentImageBase64.value = undefined
  }
})

function getDefaultLoanItem(): LoanItem {
  return {id: undefined, status: 'available', visibleOnSalePage: true}
}

const validate = (state: LoanItem): FormError[] => {
  const errors: FormError[] = []
  if (!state.name) errors.push({name: 'name', message: 'Champ requis'})
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

async function updateItem() {
  isUpdating.value = true
  const isCreate = !item.value.uuid

  item.value.category = selectedCategory.value?.item?.['@id'] ?? null

  let errorMessage: string | undefined
  let savedItem: LoanItem | undefined

  if (isCreate) {
    const {created, error} = await loanItemQuery.post(item.value)
    if (created) savedItem = created as LoanItem
    if (error) errorMessage = error.message
  } else {
    const {updated, error} = await loanItemQuery.patch(item.value, item.value)
    if (updated) savedItem = updated as LoanItem
    if (error) errorMessage = error.message
  }

  if (errorMessage) {
    toast.add({title: 'Une erreur est survenue', description: errorMessage, color: 'error'})
    isUpdating.value = false
    return
  }

  // Upload image if pending (needs uuid to exist)
  if (savedItem && (pendingFormData.value !== null || isRemovingImage.value)) {
    const fd = isRemovingImage.value ? new FormData() : pendingFormData.value!
    const {error: imgError} = await loanItemQuery.updateImage(savedItem, fd)
    if (imgError) {
      displayFileErrorToast(imgError.message ?? "Erreur lors de l'envoi de l'image")
    }
  }

  // Re-fetch the complete item — POST-create plain-JSON lacks @id; this also pulls the image relation
  if (savedItem?.uuid) {
    const {retrieved} = await loanItemQuery.get(savedItem.uuid)
    if (retrieved) savedItem = retrieved as LoanItem
  }

  isUpdating.value = false
  if (savedItem) emit('updated', savedItem)
}

function onFileChange(event: Event) {
  const fd = getFileFormDataFromUInputChangeEvent(event)
  if (!fd) return
  pendingFormData.value = fd
  isRemovingImage.value = false
  // Local preview
  const files = (event.target as HTMLInputElement).files
  if (files?.[0]) {
    if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
    imagePreviewUrl.value = URL.createObjectURL(files[0])
  }
}

function removeImage() {
  pendingFormData.value = null
  imagePreviewUrl.value = undefined
  currentImageBase64.value = undefined
  isRemovingImage.value = true
}

if (!categories.value) {
  fetchCategories()
}
async function fetchCategories() {
  const {items} = await loanCategoryQuery.getAll()
  categories.value = items.sort((a, b) => (a.name ?? '').toLowerCase() > (b.name ?? '').toLowerCase() ? 1 : -1)
}

// Load existing image on mount if editing
onMounted(async () => {
  if (props.item?.image?.privateUrl) {
    const {retrieved} = await fileQuery.getFromUrl(props.item.image.privateUrl)
    currentImageBase64.value = retrieved?.base64
  }
})
</script>

<template>
  <UForm class="flex gap-2 flex-col" :state="item" :validate="validate" @submit="updateItem" @error="onError">
    <!-- Image -->
    <UFormField label="Image">
      <div class="flex items-center gap-3">
        <div class="w-16 h-16 rounded border flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
          <img
            v-if="imagePreviewUrl || currentImageBase64"
            :src="imagePreviewUrl ?? currentImageBase64"
            alt="Image de l'article"
            class="w-full h-full object-cover"
          />
          <UIcon v-else name="i-heroicons-photo" class="text-2xl text-muted" />
        </div>
        <div v-if="!props.viewOnly" class="flex flex-col gap-1">
          <UInput type="file" accept="image/png,image/jpeg,image/webp" size="sm" @change="onFileChange" />
          <UButton
            v-if="imagePreviewUrl || currentImageBase64"
            size="xs"
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            @click="removeImage"
          >
            Supprimer l'image
          </UButton>
        </div>
      </div>
    </UFormField>

    <!-- Category -->
    <UFormField label="Catégorie">
      <USelectMenu
        v-model="selectedCategory"
        :items="categoryItems"
        :class="props.viewOnly ? 'pointer-events-none' : ''"
        :tabindex="props.viewOnly ? '-1' : '0'"
      >
        <template #default>
          <span v-if="selectedCategory">{{ selectedCategory.label }}</span>
          <span v-else><i>Aucune catégorie</i></span>
        </template>
        <template v-if="!props.viewOnly && selectedCategory" #trailing>
          <UIcon class="cursor-pointer" name="i-heroicons-x-mark" @click="selectedCategory = undefined" />
        </template>
      </USelectMenu>
    </UFormField>

    <!-- Name -->
    <UFormField label="Nom" name="name" required>
      <UInput v-model="item.name" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <!-- Description -->
    <UFormField label="Description">
      <UInput v-model="item.description" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <!-- Status -->
    <UFormField label="Statut">
      <USelect
        v-model="item.status"
        :items="statusOptions"
        value-key="value"
        label-key="label"
        :disabled="props.viewOnly"
      />
    </UFormField>

    <!-- Loan price -->
    <UFormField label="Prix de prêt">
      <UInput v-model="item.loanPrice" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'">
        <template #trailing>
          <span class="text-gray-500 dark:text-gray-400 text-xs">EUR</span>
        </template>
      </UInput>
    </UFormField>

    <!-- Purchase price -->
    <UFormField label="Prix d'achat">
      <UInput v-model="item.purchasePrice" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'">
        <template #trailing>
          <span class="text-gray-500 dark:text-gray-400 text-xs">EUR</span>
        </template>
      </UInput>
    </UFormField>

    <!-- Sold price -->
    <UFormField label="Prix de vente">
      <UInput v-model="item.soldPrice" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'">
        <template #trailing>
          <span class="text-gray-500 dark:text-gray-400 text-xs">EUR</span>
        </template>
      </UInput>
    </UFormField>

    <!-- Visible on sale page -->
    <UFormField label="Visible sur la page de vente">
      <USwitch v-model="item.visibleOnSalePage" :disabled="props.viewOnly" />
    </UFormField>

    <UButton v-if="!props.viewOnly" type="submit" block class="mt-2" :loading="isUpdating">
      <template v-if="item.uuid">Modifier</template>
      <template v-else>Créer</template>
    </UButton>
  </UForm>
</template>
