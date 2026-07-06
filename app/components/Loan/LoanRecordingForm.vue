<script setup lang="ts">
import type {PropType} from 'vue'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {LoanRecording} from '~/types/api/item/clubDependent/plugin/loan/loanRecording'
import type {LoanRecordingType} from '~/types/api/item/clubDependent/plugin/loan/loanRecordingType'
import LoanRecordingQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingQuery'
import LoanRecordingTypeQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingTypeQuery'
import {useSellerSelect} from '~/composables/useSellerSelect'
import type {SelectApiItem} from '~/types/select'

const props = defineProps({
  loanItem: {
    type: Object as PropType<LoanItem>,
    required: true,
  },
  recording: {
    type: Object as PropType<LoanRecording>,
    default: undefined,
  },
})

const emit = defineEmits(['updated', 'close'])

const toast = useToast()
const recordingQuery = new LoanRecordingQuery()
const recordingTypeQuery = new LoanRecordingTypeQuery()

const isEditing = computed(() => !!props.recording)

const isLoading = ref(false)
const description = ref(props.recording?.description ?? '')

// Recording type
const recordingTypes = ref<LoanRecordingType[]>([])
const selectedType = ref<SelectApiItem<LoanRecordingType> | undefined>()
const typeItems = computed(() => {
  const items: SelectApiItem<LoanRecordingType>[] = []
  recordingTypes.value.forEach(t => {
    items.push({label: t.name, value: t.uuid, item: t})
  })
  return items
})

// Author (admin+supervisor) — shared with the sale flow
const {sellerSelected, sellersSelect, ensureLoaded} = useSellerSelect()

onMounted(async () => {
  const [types] = await Promise.all([
    recordingTypeQuery.getAll().then(r => r.items),
    ensureLoaded(),
  ])
  recordingTypes.value = types

  if (props.recording?.recordingType && typeof props.recording.recordingType === 'object') {
    const type = props.recording.recordingType
    selectedType.value = {label: type.name, value: type.uuid, item: type}
  }
  if (props.recording?.author && typeof props.recording.author === 'object') {
    const author = props.recording.author
    sellerSelected.value = {label: author.fullName ?? `${author.firstname ?? ''} ${author.lastname ?? ''}`.trim(), value: author.uuid, item: author}
  }
})

async function submit() {
  isLoading.value = true
  const payload = {
    loanItem: props.loanItem['@id'],
    recordingType: selectedType.value?.item?.['@id'] ?? null,
    author: sellerSelected.value?.item?.['@id'] ?? null,
    description: description.value.trim() || null,
    date: props.recording?.date ?? new Date().toISOString(),
  }
  const {created, updated, error} = isEditing.value
    ? await recordingQuery.patch(props.recording!, payload)
    : await recordingQuery.post(payload)
  isLoading.value = false
  if (error || (!created && !updated)) {
    toast.add({color: 'error', title: "Erreur lors de l'enregistrement", description: error?.message})
    return
  }
  toast.add({color: 'success', title: isEditing.value ? 'Enregistrement modifié' : 'Enregistrement ajouté'})
  emit('updated')
  emit('close', true)
}
</script>

<template>
  <ModalWithActions :title="isEditing ? `Modifier l'enregistrement` : 'Ajouter un enregistrement'" @close="emit('close', false)">
    <div class="flex flex-col gap-4">
      <!-- Recording type -->
      <UFormField label="Type d'enregistrement">
        <USelectMenu
          v-model="selectedType"
          :items="typeItems"
        >
          <template #default>
            <span v-if="selectedType" class="flex items-center gap-2">
              <span
                v-if="selectedType.item?.color"
                class="inline-block w-3 h-3 rounded-full flex-shrink-0"
                :style="{backgroundColor: selectedType.item.color}"
              />
              {{ selectedType.label }}
            </span>
            <span v-else class="text-muted italic">Aucun type</span>
          </template>
          <template v-if="selectedType" #trailing>
            <UIcon class="cursor-pointer" name="i-heroicons-x-mark" @click="selectedType = undefined" />
          </template>
        </USelectMenu>
      </UFormField>

      <!-- Author -->
      <UFormField label="Auteur">
        <UInputMenu
          v-model="sellerSelected"
          :items="sellersSelect"
          :filter-fields="['item.lastname', 'item.firstname']"
        >
          <template #default>
            <span v-if="sellerSelected">{{ sellerSelected.label }}</span>
            <span v-else class="text-muted italic">Sélectionner un auteur</span>
          </template>
        </UInputMenu>
      </UFormField>

      <!-- Description -->
      <UFormField label="Description (optionnel)">
        <UTextarea v-model="description" :rows="3" placeholder="Décrivez l'intervention…" />
      </UFormField>
    </div>

    <template #actions>
      <UButton :loading="isLoading" @click="submit">{{ isEditing ? 'Enregistrer les modifications' : 'Ajouter' }}</UButton>
    </template>
  </ModalWithActions>
</template>
