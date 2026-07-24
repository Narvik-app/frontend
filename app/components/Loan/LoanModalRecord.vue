<script setup lang="ts">
import type {PropType} from 'vue'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {Loan} from '~/types/api/item/clubDependent/plugin/loan/loan'
import type {Member} from '~/types/api/item/clubDependent/member'
import LoanQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanQuery'
import SearchMember from '~/components/Member/SearchMember.vue'
import {useSellerSelect} from '~/composables/useSellerSelect'
import {getMemberDisplayName} from '~/utils/string'

const props = defineProps({
  loanItem: {
    type: Object as PropType<LoanItem>,
    required: true,
  },
  loan: {
    type: Object as PropType<Loan>,
    default: undefined,
  },
  dateEditable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['updated', 'close'])

const toast = useToast()
const loanQuery = new LoanQuery()

const isEditing = computed(() => !!props.loan)

const isLoading = ref(false)
const borrowerType = ref<'member' | 'external'>(props.loan?.borrowerName ? 'external' : 'member')
const borrower = ref<Member | undefined>(typeof props.loan?.member === 'object' ? (props.loan.member ?? undefined) : undefined)
const borrowerName = ref<string>(props.loan?.borrowerName ?? '')
const comment = ref<string>(props.loan?.comment ?? '')
const startDate = ref<Date | null>(props.loan?.startDate ? new Date(props.loan.startDate) : null)
const endDate = ref<Date | null>(props.loan?.endDate ? new Date(props.loan.endDate) : null)

watch(borrowerType, () => {
  borrower.value = undefined
  borrowerName.value = ''
})

// Lender/author (admin+supervisor) — shared with the sale flow
const {sellerSelected, sellersSelect, ensureLoaded} = useSellerSelect()
onMounted(async () => {
  await ensureLoaded()
  if (props.loan?.author && typeof props.loan.author === 'object') {
    const author = props.loan.author
    sellerSelected.value = {label: author.fullName ?? `${author.firstname ?? ''} ${author.lastname ?? ''}`.trim(), value: author.uuid, item: author}
  }
})

async function submit() {
  isLoading.value = true
  const payload: Record<string, unknown> = {
    loanItem: props.loanItem['@id'],
    member: borrowerType.value === 'member' ? (borrower.value?.['@id'] ?? null) : null,
    borrowerName: borrowerType.value === 'external' ? (borrowerName.value.trim() || null) : null,
    author: sellerSelected.value?.item?.['@id'] ?? null,
    comment: comment.value.trim() || null,
  }
  if (props.dateEditable) {
    if (startDate.value) payload.startDate = startDate.value.toISOString()
    payload.endDate = endDate.value ? endDate.value.toISOString() : null
  }
  const {created, updated, error} = isEditing.value
    ? await loanQuery.patch(props.loan!, payload)
    : await loanQuery.post(payload)
  isLoading.value = false
  if (error || (!created && !updated)) {
    toast.add({color: 'error', title: "Erreur lors de l'enregistrement du prêt", description: error?.message})
    return
  }
  toast.add({color: 'success', title: isEditing.value ? 'Prêt modifié' : 'Prêt enregistré'})
  emit('updated')
  emit('close', true)
}
</script>

<template>
  <ModalWithActions :title="isEditing ? 'Modifier le prêt' : 'Enregistrer un prêt'" @close="emit('close', false)">
    <div class="flex flex-col gap-4">
      <!-- Dates (backdate) -->
      <div v-if="dateEditable" class="flex flex-wrap justify-between gap-2">
        <!-- Start date -->
        <UFormField label="Date de début" class="flex-1 min-w-56">
          <GenericDatePickerField v-model="startDate" mode="dateTime" placeholder="Choisir une date" />
        </UFormField>

        <!-- Return date -->
        <UFormField label="Date de retour (optionnel)" class="flex-1 min-w-56">
          <GenericDatePickerField v-model="endDate" mode="dateTime" placeholder="Aucune (prêt en cours)" can-be-clear />
        </UFormField>
      </div>

      <!-- Borrower -->
      <UFormField label="Emprunteur (optionnel)">
        <div class="flex gap-1 mb-3">
          <UButton
            label="Membre"
            icon="i-heroicons-user"
            size="sm"
            :variant="borrowerType === 'member' ? 'soft' : 'ghost'"
            :color="borrowerType === 'member' ? 'primary' : 'neutral'"
            @click="borrowerType = 'member'"
          />
          <UButton
            label="Personne extérieure"
            icon="i-heroicons-user-plus"
            size="sm"
            :variant="borrowerType === 'external' ? 'soft' : 'ghost'"
            :color="borrowerType === 'external' ? 'primary' : 'neutral'"
            @click="borrowerType = 'external'"
          />
        </div>

        <div v-if="borrowerType === 'member'" class="border rounded-lg p-3">
          <SearchMember compact @selected-member="(m: Member) => borrower = m" />
          <div v-if="borrower" class="mt-2 text-sm font-medium text-primary flex items-center gap-1">
            <UIcon name="i-heroicons-check-circle" />
            {{ getMemberDisplayName(borrower) }}
            <UIcon name="i-heroicons-x-mark" class="cursor-pointer ml-1" @click="borrower = undefined" />
          </div>
        </div>

        <UInput
          v-else
          v-model="borrowerName"
          placeholder="Nom de l'emprunteur"
        />
      </UFormField>

      <!-- Lender (author) -->
      <UFormField label="Prêté par">
        <UInputMenu
          v-model="sellerSelected"
          :items="sellersSelect"
          :filter-fields="['item.lastname', 'item.firstname']"
        >
          <template #default>
            <span v-if="sellerSelected">{{ sellerSelected.label }}</span>
            <span v-else class="text-muted italic">Sélectionner un responsable</span>
          </template>
        </UInputMenu>
      </UFormField>

      <!-- Comment -->
      <UFormField label="Commentaire (optionnel)">
        <UTextarea v-model="comment" :rows="2" placeholder="Remarques…" />
      </UFormField>
    </div>

    <template #actions>
      <UButton :loading="isLoading" @click="submit">{{ isEditing ? 'Enregistrer les modifications' : 'Enregistrer le prêt' }}</UButton>
    </template>
  </ModalWithActions>
</template>
