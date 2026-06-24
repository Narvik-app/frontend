<script setup lang="ts">
import type {PropType} from 'vue'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {Member} from '~/types/api/item/clubDependent/member'
import LoanQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanQuery'
import MemberQuery from '~/composables/api/query/clubDependent/MemberQuery'
import SearchMember from '~/components/Member/SearchMember.vue'
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
const loanQuery = new LoanQuery()
const memberQuery = new MemberQuery()
const selfStore = useSelfUserStore()

const isLoading = ref(false)
const borrower = ref<Member | undefined>()
const comment = ref<string>('')

// Lender/author (admin+supervisor)
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
  sellers.value = await loadSellers()
  // Default lender to current user if they're in the sellers list
  const currentMember = selfStore.member
  if (currentMember) {
    const match = sellers.value.find(m => m.uuid === currentMember.uuid)
    if (match) {
      sellerSelected.value = {label: match.fullName, value: match.uuid, item: match}
    }
  }
})

async function submit() {
  isLoading.value = true
  const {created, error} = await loanQuery.post({
    loanItem: props.loanItem['@id'],
    member: borrower.value?.['@id'] ?? null,
    author: sellerSelected.value?.item?.['@id'] ?? null,
    comment: comment.value.trim() || null,
  })
  isLoading.value = false
  if (error || !created) {
    toast.add({color: 'error', title: "Erreur lors de l'enregistrement du prêt", description: error?.message})
    return
  }
  toast.add({color: 'success', title: 'Prêt enregistré'})
  emit('updated')
  emit('close', true)
}
</script>

<template>
  <ModalWithActions title="Enregistrer un prêt" @close="emit('close', false)">
    <div class="flex flex-col gap-4">
      <!-- Borrower search -->
      <UFormField label="Emprunteur (optionnel)">
        <div class="border rounded-lg p-3">
          <SearchMember compact @selected-member="(m: Member) => borrower = m" />
          <div v-if="borrower" class="mt-2 text-sm font-medium text-primary flex items-center gap-1">
            <UIcon name="i-heroicons-check-circle" />
            {{ borrower.fullName ?? `${borrower.firstname ?? ''} ${borrower.lastname ?? ''}`.trim() }}
            <UIcon name="i-heroicons-x-mark" class="cursor-pointer ml-1" @click="borrower = undefined" />
          </div>
        </div>
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
      <UButton :loading="isLoading" @click="submit">Enregistrer le prêt</UButton>
    </template>
  </ModalWithActions>
</template>
