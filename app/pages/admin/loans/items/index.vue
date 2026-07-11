<script setup lang="ts">
import LoanItemQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanItemQuery'
import LoanCategoryQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanCategoryQuery'
import FileQuery from '~/composables/api/query/FileQuery'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {LoanCategory} from '~/types/api/item/clubDependent/plugin/loan/loanCategory'
import {convertUuidToUrlUuid} from '~/utils/resource'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import type {TableRow} from '#ui/types'
import type {TablePaginateInterface} from '~/types/table'
import {loadImageBase64} from '~/utils/file'
import {LOAN_ITEM_STATUS_COLORS, LOAN_ITEM_STATUS_LABELS} from '~/utils/loan'

definePageMeta({layout: 'loan'})
useHead({title: 'Articles'})

const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.LoanItemsEdit))

const itemQuery = new LoanItemQuery()
const categoryQuery = new LoanCategoryQuery()
const fileQuery = new FileQuery()

const items = ref<LoanItem[]>([])
const categories = ref<LoanCategory[]>([])
const totalItems = ref(0)
const isLoading = ref(true)
const page = ref(1)
const perPage = ref(30)
const selectedItem = ref<LoanItem | undefined>()
const isVisible = ref(false)
const itemModalOpen = ref(false)
// Image cache: uuid -> base64
const imageCache = ref<Record<string, string>>({})

watch(selectedItem, (v) => { isVisible.value = v !== undefined })

const columns = [
  {accessorKey: 'name', header: 'Nom', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'status', header: 'Statut'},
  {accessorKey: 'category', header: 'Catégorie'},
  {accessorKey: 'actions', header: ''},
]

categoryQuery.getAll().then(r => { categories.value = r.items })
loadItems()

async function loadItems() {
  isLoading.value = true
  const p = new URLSearchParams({
    pagination: '1',
    page: page.value.toString(),
    itemsPerPage: perPage.value.toString(),
  })
  const {items: fetched, totalItems: total} = await itemQuery.getAll(p)
  items.value = fetched
  totalItems.value = total ?? 0
  isLoading.value = false
  loadImages(fetched)
}

async function loadImages(list: LoanItem[]) {
  for (const item of list) {
    if (!item.uuid || imageCache.value[item.uuid]) continue
    const base64 = await loadImageBase64(fileQuery, item.image)
    if (base64) imageCache.value[item.uuid] = base64
  }
}

function onItemUpdated() {
  itemModalOpen.value = false
  selectedItem.value = undefined
  loadItems()
}

function rowClicked(row: TableRow<LoanItem>) {
  selectedItem.value = {...row.original}
  isVisible.value = true
}

function getCategoryName(item: LoanItem): string {
  if (!item.category) return '-'
  if (typeof item.category === 'object') return item.category.name ?? '-'
  return '-'
}
</script>

<template>
  <GenericLayoutContentWithStickySide
    :has-side-content="isVisible"
    :mobile-side-title="selectedItem?.name"
    tabindex="-1"
    @keyup.esc="isVisible = false; selectedItem = undefined"
  >
    <template #main>
      <UCard>
        <div class="flex gap-4 mb-4">
          <div class="flex-1" />
          <UButton v-if="canEdit" icon="i-heroicons-plus" @click="selectedItem = undefined; itemModalOpen = true">
            Créer un article
          </UButton>
        </div>

        <UTable
          class="w-full"
          :loading="isLoading"
          :columns="columns"
          :data="items"
          @select="(_, row) => rowClicked(row)"
        >
          <template #empty>
            <div class="py-6 text-center italic text-sm">Aucun article.</div>
          </template>
          <template #name-cell="{ row }">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                <img
                  v-if="row.original.uuid && imageCache[row.original.uuid]"
                  :src="imageCache[row.original.uuid]"
                  :alt="row.original.name"
                  class="w-full h-full object-cover"
                >
                <UIcon v-else name="i-heroicons-photo" class="text-sm text-muted" />
              </div>
              {{ row.original.name }}
            </div>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="LOAN_ITEM_STATUS_COLORS[row.original.status ?? 'available'] ?? 'neutral'" variant="soft" size="xs">
              {{ LOAN_ITEM_STATUS_LABELS[row.original.status ?? 'available'] ?? row.original.status }}
            </UBadge>
          </template>
          <template #category-cell="{ row }">{{ getCategoryName(row.original) }}</template>
          <template #actions-cell="{ row }">
            <UButton
              :to="'/admin/loans/items/' + convertUuidToUrlUuid(row.original.uuid)"
            >
              Détail
            </UButton>
          </template>
        </UTable>

        <GenericTablePagination
          v-model:page="page"
          v-model:items-per-page="perPage"
          :total-items="totalItems"
          @paginate="(_: TablePaginateInterface) => loadItems()"
        />
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedItem">
        <UButton
          block
          class="mb-4"
          :to="'/admin/loans/items/' + convertUuidToUrlUuid(selectedItem.uuid)"
        >
          Voir en détail
        </UButton>
        <UCard>
          <!-- Thumbnail -->
          <div v-if="selectedItem.uuid && imageCache[selectedItem.uuid]" class="mb-3">
            <img
              :src="imageCache[selectedItem.uuid]"
              :alt="selectedItem.name"
              class="w-full h-32 object-contain rounded"
            >
          </div>
          <div class="flex flex-col gap-2 text-sm">
            <div><span class="font-medium">Nom : </span>{{ selectedItem.name }}</div>
            <div v-if="selectedItem.description"><span class="font-medium">Description : </span>{{ selectedItem.description }}</div>
            <div v-if="selectedItem.loanPrice"><span class="font-medium">Prix de prêt : </span>{{ selectedItem.loanPrice }} €</div>
            <div v-if="selectedItem.purchasePrice"><span class="font-medium">Prix d'achat : </span>{{ selectedItem.purchasePrice }} €</div>
            <div><span class="font-medium">Catégorie : </span>{{ getCategoryName(selectedItem) }}</div>
          </div>
          <UButton v-if="canEdit" block class="mt-4" color="warning" variant="soft" @click="itemModalOpen = true">
            Modifier
          </UButton>
        </UCard>
      </template>
    </template>
  </GenericLayoutContentWithStickySide>

  <!-- Create/edit item modal -->
  <UModal v-model:open="itemModalOpen">
    <template #content>
      <UCard>
        <LoanItemForm
          :item="selectedItem ? {...selectedItem} : undefined"
          :categories="categories"
          @updated="onItemUpdated"
        />
      </UCard>
    </template>
  </UModal>
</template>
