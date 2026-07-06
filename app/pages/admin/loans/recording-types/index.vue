<script setup lang="ts">
import LoanRecordingTypeQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingTypeQuery'
import type {LoanRecordingType} from '~/types/api/item/clubDependent/plugin/loan/loanRecordingType'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'
import type {FormError, TableRow} from '#ui/types'
import type {NuxtError} from '#app'
import type {ItemError} from '~/types/api/itemError'
import type {TablePaginateInterface} from '~/types/table'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'

definePageMeta({layout: 'loan'})
useHead({title: "Types d'enregistrement"})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.LoanRecordingsEdit))

const apiQuery = new LoanRecordingTypeQuery()

const types: Ref<LoanRecordingType[]> = ref([])
const isLoading = ref(true)
const total = ref(0)
const selected: Ref<LoanRecordingType | undefined> = ref(undefined)
const isVisible = ref(false)
watch(selected, (v) => { isVisible.value = v !== undefined })

const page = ref(1)
const perPage = ref(30)
const columns = [
  {accessorKey: 'name', header: 'Nom', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'color', header: 'Couleur'},
  {accessorKey: 'actions', header: ''},
]

load()

async function load() {
  isLoading.value = true
  const p = new URLSearchParams({page: page.value.toString(), itemsPerPage: perPage.value.toString()})
  const {items, totalItems} = await apiQuery.getAll(p)
  types.value = items
  total.value = totalItems ?? 0
  isLoading.value = false
}

function rowClicked(row: TableRow<LoanRecordingType>) {
  selected.value = {...row.original}
}

async function save(type: LoanRecordingType) {
  isLoading.value = true
  const payload: LoanRecordingType = {name: type.name, color: type.color}
  let error: NuxtError<ItemError> | undefined
  if (!type.uuid) {
    const {error: err} = await apiQuery.post(payload)
    error = err
  } else {
    const {error: err} = await apiQuery.patch(type, payload)
    error = err
  }
  isLoading.value = false
  if (error) {
    toast.add({color: 'error', title: !type.uuid ? 'La création a échouée' : 'La modification a échouée', description: error.message})
    return
  }
  toast.add({color: 'success', title: !type.uuid ? 'Type créé' : 'Type modifié'})
  selected.value = undefined
  await load()
}

async function deleteType() {
  isLoading.value = true
  const {error} = await apiQuery.delete(selected.value)
  isLoading.value = false
  if (error) {
    toast.add({color: 'error', title: 'La suppression a échouée', description: error.message})
    return
  }
  selected.value = undefined
  await load()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.name) errors.push({path: 'name', message: 'Champ requis'})
  return errors
}
</script>

<template>
  <GenericLayoutContentWithStickySide
    :has-side-content="isVisible"
    :mobile-side-title="selected?.name"
    tabindex="-1"
    @keyup.esc="isVisible = false; selected = undefined"
  >
    <template #main>
      <UCard>
        <div class="flex gap-4 mb-4">
          <div class="flex-1" />
          <UButton v-if="canEdit" @click="selected = {name: ''}">
            Créer un type
          </UButton>
        </div>

        <UTable
          class="w-full"
          :loading="isLoading"
          :columns="columns"
          :data="types"
          @select="(_, row) => rowClicked(row)"
        >
          <template #empty>
            <div class="py-6 text-center italic text-sm">Aucun type d'enregistrement.</div>
          </template>
          <template #name-cell="{ row }">{{ row.original.name }}</template>
          <template #color-cell="{ row }">
            <span
              v-if="row.original.color"
              class="inline-flex items-center gap-1"
            >
              <span class="inline-block w-4 h-4 rounded-full border" :style="{backgroundColor: row.original.color}" />
              {{ row.original.color }}
            </span>
          </template>
        </UTable>

        <GenericTablePagination
          v-model:page="page"
          v-model:items-per-page="perPage"
          :total-items="total"
          @paginate="(_: TablePaginateInterface) => load()"
        />
      </UCard>
    </template>

    <template #side>
      <template v-if="selected && canEdit">
        <UForm :state="selected" :validate="validate" class="flex flex-col gap-4" @submit="save(selected)">
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Nom" name="name">
                <UInput v-model="selected.name" />
              </UFormField>
              <UFormField label="Couleur (hex)" name="color">
                <div class="flex items-center gap-2">
                  <UInput v-model="selected.color" placeholder="#3b82f6" class="flex-1" />
                  <input
                    v-model="selected.color"
                    type="color"
                    class="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  >
                </div>
              </UFormField>
            </div>
          </UCard>

          <UButton type="submit" block :loading="isLoading">Enregistrer</UButton>

          <UButton
            v-if="selected.uuid"
            block
            color="error"
            :loading="isLoading"
            @click="overlayDeleteConfirmation.open({
              async onDelete() { await deleteType(); overlayDeleteConfirmation.close(true) }
            })"
          >
            Supprimer
          </UButton>
        </UForm>
      </template>
    </template>
  </GenericLayoutContentWithStickySide>
</template>
