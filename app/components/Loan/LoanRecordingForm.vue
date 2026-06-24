<script setup lang="ts">
import type {PropType} from 'vue'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {LoanRecordingType} from '~/types/api/item/clubDependent/plugin/loan/loanRecordingType'
import type {Member} from '~/types/api/item/clubDependent/member'
import LoanRecordingQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingQuery'
import LoanRecordingTypeQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingTypeQuery'
import MemberQuery from '~/composables/api/query/clubDependent/MemberQuery'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {ClubRole} from '~/types/api/item/club'
import type {SelectApiItem} from '~/types/select'

const props = defineProps({
  loanItem: {
    type: Object as PropType<LoanItem>,
    required: true,
  },
})

const emit = defineEmits(['updated', 'close'])

const toast = useToast()
const recordingQuery = new LoanRecordingQuery()
const recordingTypeQuery = new LoanRecordingTypeQuery()
const memberQuery = new MemberQuery()
const selfStore = useSelfUserStore()

const isLoading = ref(false)
const description = ref('')

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

// Author (admin+supervisor)
const sellers = ref<Member[]>([])
const sellerSelected = ref<SelectApiItem<Member> | undefined>()
const sellersSelect = computed(() => {
  const items: SelectApiItem<Member>[] = []
  sellers.value.forEach(m => {
    items.push({label: m.fullName, value: m.uuid, item: m})
  })
  return items
})

async function loadSellers(page: number = 1, acc: Member[] = []): Promise<Member[]> {
  const urlParams = new URLSearchParams({'order[lastname]': 'ASC', 'order[firstname]': 'ASC', 'exists[licence]': 'true'})
  urlParams.append('userMember.role[]', ClubRole.Admin)
  urlParams.append('userMember.role[]', ClubRole.Supervisor)
  const {items, view} = await memberQuery.getAll(urlParams)
  acc.push(...items)
  if (view?.['next']) return loadSellers(page + 1, acc)
  return acc
}

onMounted(async () => {
  const [types, sellerList] = await Promise.all([
    recordingTypeQuery.getAll().then(r => r.items),
    loadSellers(),
  ])
  recordingTypes.value = types
  sellers.value = sellerList
  // Default author to current user
  const currentMember = selfStore.member
  if (currentMember) {
    const match = sellerList.find(m => m.uuid === currentMember.uuid)
    if (match) {
      sellerSelected.value = {label: match.fullName, value: match.uuid, item: match}
    }
  }
})

async function submit() {
  if (!description.value.trim()) {
    toast.add({color: 'error', title: 'La description est requise'})
    return
  }
  isLoading.value = true
  const {created, error} = await recordingQuery.post({
    loanItem: props.loanItem['@id'],
    recordingType: selectedType.value?.item?.['@id'] ?? null,
    author: sellerSelected.value?.item?.['@id'] ?? null,
    description: description.value.trim(),
    date: new Date().toISOString(),
  })
  isLoading.value = false
  if (error || !created) {
    toast.add({color: 'error', title: "Erreur lors de l'enregistrement", description: error?.message})
    return
  }
  toast.add({color: 'success', title: 'Enregistrement ajouté'})
  emit('updated')
  emit('close', true)
}
</script>

<template>
  <ModalWithActions title="Ajouter un enregistrement" @close="emit('close', false)">
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
      <UFormField label="Description" required>
        <UTextarea v-model="description" :rows="3" placeholder="Décrivez l'intervention…" />
      </UFormField>
    </div>

    <template #actions>
      <UButton :loading="isLoading" @click="submit">Ajouter</UButton>
    </template>
  </ModalWithActions>
</template>
