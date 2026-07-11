<script setup lang="ts">
import LoanCategoryQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanCategoryQuery'
import type {LoanCategory} from '~/types/api/item/clubDependent/plugin/loan/loanCategory'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'
import type {FormError, TableRow} from '#ui/types'
import type {NuxtError} from '#app'
import type {ItemError} from '~/types/api/itemError'
import type {TablePaginateInterface} from '~/types/table'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'

definePageMeta({layout: 'loan'})
useHead({title: 'Catégories'})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.LoanCategoriesEdit))

const apiQuery = new LoanCategoryQuery()

const categories: Ref<LoanCategory[]> = ref([])
const isLoading = ref(true)
const totalCategories = ref(0)
const selectedCategory: Ref<LoanCategory | undefined> = ref(undefined)

const isVisible = ref(false)
watch(selectedCategory, (value) => {
  isVisible.value = value !== undefined
})

const page = ref(1)
const itemsPerPage = ref(30)
const sort = ref({column: 'weight', direction: 'asc'})
const columns = [
  {
    accessorKey: 'name',
    header: 'Nom',
    meta: {class: {th: 'w-full'}}
  },
  {accessorKey: 'actions', header: ''}
]

getCategories()

async function getCategories() {
  isLoading.value = true
  const urlParams = new URLSearchParams({
    pagination: '1',
    page: page.value.toString(),
    itemsPerPage: itemsPerPage.value.toString(),
  })
  urlParams.append(`order[${sort.value.column}]`, sort.value.direction)
  const {totalItems, items} = await apiQuery.getAll(urlParams)
  categories.value = items
  if (totalItems) totalCategories.value = totalItems
  isLoading.value = false
}

function rowClicked(row: TableRow<LoanCategory>) {
  selectedCategory.value = {...row.original}
  isVisible.value = true
}

async function move(row: LoanCategory, modifier: number) {
  isLoading.value = true
  const {error} = await apiQuery.move(row, modifier === 1 ? 'down' : 'up')
  isLoading.value = false
  if (error) {
    toast.add({color: 'error', title: 'La modification a échouée', description: error.message})
    return
  }
  await getCategories()
}

function createCategory() {
  selectedCategory.value = {name: ''}
}

async function updateCategory(category: LoanCategory) {
  isLoading.value = true
  const payload: LoanCategory = {name: category.name}
  if (category.weight) payload.weight = category.weight

  let error: NuxtError<ItemError> | undefined
  if (!category.uuid) {
    const {created, error: err} = await apiQuery.post(payload)
    error = err
    selectedCategory.value = created
  } else {
    const {error: err} = await apiQuery.patch(category, payload)
    error = err
  }

  isLoading.value = false
  if (error) {
    toast.add({color: 'error', title: !category.uuid ? 'La création a échouée' : 'La modification a échouée', description: error.message})
    return
  }

  toast.add({color: 'success', title: !category.uuid ? 'Catégorie créée' : 'Catégorie modifiée'})
  await getCategories()
}

async function deleteCategory() {
  isLoading.value = true
  const {error} = await apiQuery.delete(selectedCategory.value)
  isLoading.value = false
  if (error) {
    toast.add({color: 'error', title: 'La suppression a échouée', description: error.message})
    return
  }
  selectedCategory.value = undefined
  await getCategories()
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
    :mobile-side-title="selectedCategory?.name"
    tabindex="-1"
    @keyup.esc="isVisible = false; selectedCategory = undefined"
  >
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4 mb-4">
            <div class="flex-1" />
            <UButton v-if="canEdit" @click="createCategory">
              Créer une catégorie
            </UButton>
          </div>

          <UTable
            class="w-full"
            :loading="isLoading"
            :sort="sort"
            :columns="columns"
            :data="categories"
            @select="(evt, row) => rowClicked(row)"
          >
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucune catégorie.</span>
              </div>
            </template>

            <template #name-cell="{ row }">{{ row.original.name }}</template>

            <template #actions-cell="{ row }">
              <div v-if="canEdit" class="flex items-center gap-1">
                <p class="text-xs">{{ row.original.weight }}</p>
                <GenericStackedUpDown @changed="modifier => move(row.original, -modifier)" />
              </div>
            </template>
          </UTable>

          <GenericTablePagination
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :total-items="totalCategories"
            @paginate="(_: TablePaginateInterface) => getCategories()"
          />
        </div>
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedCategory && canEdit">
        <UForm
          :state="selectedCategory"
          :validate="validate"
          class="flex flex-col gap-4"
          @submit="updateCategory(selectedCategory)"
        >
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Nom" name="name">
                <UInput v-model="selectedCategory.name" />
              </UFormField>
              <UFormField label="Poids dans la liste" name="weight">
                <UInput v-model="selectedCategory.weight" type="number" />
              </UFormField>
            </div>
          </UCard>

          <UButton type="submit" block :loading="isLoading">Enregistrer</UButton>

          <UButton
            v-if="selectedCategory.uuid"
            block
            color="error"
            :loading="isLoading"
            :disabled="(selectedCategory?.items?.length ?? 0) > 0"
            @click="overlayDeleteConfirmation.open({
              async onDelete() {
                await deleteCategory()
                overlayDeleteConfirmation.close(true)
              }
            })"
          >
            Supprimer
          </UButton>
        </UForm>
      </template>
    </template>
  </GenericLayoutContentWithStickySide>
</template>
