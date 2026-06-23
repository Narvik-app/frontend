<script setup lang="ts">
import InventoryItemQuery from '~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery'
import type { InventoryItem } from '~/types/api/item/clubDependent/plugin/sale/inventoryItem'
import InventoryCategoryQuery from '~/composables/api/query/clubDependent/plugin/sale/InventoryCategoryQuery'
import type { InventoryCategory } from '~/types/api/item/clubDependent/plugin/sale/inventoryCategory'
import { createBrowserCsvDownload, verifyCameraIsPresent } from '~/utils/browser'
import { convertUuidToUrlUuid, decodeUrlUuid } from '~/utils/resource'
import { useSelfUserStore } from '~/stores/useSelfUser'
import { Permission } from '~/types/api/permissions'

definePageMeta({ layout: 'pos' })
useHead({ title: 'Inventaire' })

const queryParams = useRoute().query
const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.SaleInventoryEdit))

// Queries
const apiQuery = new InventoryItemQuery()
const itemCategoryQuery = new InventoryCategoryQuery()

// All items loaded in memory (full paginated load like /sales/new)
const allItems = ref<InventoryItem[]>([])
const categories = ref<InventoryCategory[]>([])
const isLoading = ref(true)
const isDownloadingCsv = ref(false)

// Search
const searchQuery = ref('')
const cameraPreview = ref(false)
const cameraIsPresent = verifyCameraIsPresent()

// Slideover / modal state
const isSideVisible = ref(false)
const selectedItem = ref<InventoryItem | undefined>(undefined)
const inventoryItemModalOpen = ref(false)

// Category highlight from URL param (?category=<urlUuid>)
const highlightedCategoryName = ref<string | null>(null)

// Tab
const activeTab = ref('stock')
const tabs = computed(() => [
  { label: `Stock géré (${stockManagedItems.value.length})`, value: 'stock' },
  { label: `Sans stock géré (${unmanagedItems.value.length})`, value: 'unmanaged' },
  { label: `Désactivés (${disabledItems.value.length})`, value: 'disabled' },
])

// Fetch all pages
async function loadAllItems() {
  isLoading.value = true
  const loaded: InventoryItem[] = []

  const urlParams = new URLSearchParams({ itemsPerPage: '100' })
  let page = 1

  while (true) {
    urlParams.set('page', page.toString())
    const { items, view } = await apiQuery.getAll(urlParams)
    loaded.push(...items)
    if (!view?.['next']) break
    page++
  }

  allItems.value = loaded
  isLoading.value = false

  // Auto-open if exactly one result after a search
  if (loaded.length === 1) {
    rowClicked(loaded[0])
  }
}

// Categories
itemCategoryQuery.getAll().then((value) => {
  categories.value = value.items

  if (queryParams.category !== undefined) {
    const matched = value.items.find(
      (c) => c.uuid === decodeUrlUuid(queryParams.category?.toString())
    )
    if (matched) {
      highlightedCategoryName.value = matched.name ?? null
      useRouter().replace(useRouter().currentRoute.value.path)
    }
  }
})

loadAllItems().then(() => {
  // After items are loaded, switch to the tab that contains the highlighted category
  if (highlightedCategoryName.value) {
    if (stockGroups.value.has(highlightedCategoryName.value)) activeTab.value = 'stock'
    else if (unmanagedGroups.value.has(highlightedCategoryName.value)) activeTab.value = 'unmanaged'
    else if (disabledGroups.value.has(highlightedCategoryName.value)) activeTab.value = 'disabled'
  }
})

// Filtering
const searchLower = computed(() => searchQuery.value.toLowerCase().trim())

function matchesSearch(item: InventoryItem): boolean {
  if (!searchLower.value) return true
  return (
    item.name?.toLowerCase().includes(searchLower.value) ||
    item.barcode?.toLowerCase().includes(searchLower.value) ||
    item.description?.toLowerCase().includes(searchLower.value) ||
    false
  )
}

const stockManagedItems = computed(() =>
  allItems.value.filter((i) => i.quantity != null && i.canBeSold !== false && matchesSearch(i))
)
const unmanagedItems = computed(() =>
  allItems.value.filter((i) => i.quantity == null && i.canBeSold !== false && matchesSearch(i))
)
const disabledItems = computed(() =>
  allItems.value.filter((i) => i.canBeSold === false && matchesSearch(i))
)

// Group items by category into a sorted Map
function groupByCategory(items: InventoryItem[]): Map<string, InventoryItem[]> {
  const map = new Map<string, InventoryItem[]>()
  for (const item of items) {
    const key = item.category?.name ?? 'Sans catégorie'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  // Sort items within each section: low stock first, then by quantity asc
  for (const [, group] of map) {
    group.sort((a, b) => {
      const aAlert = a.quantity != null && a.quantityAlert != null && a.quantity <= a.quantityAlert
      const bAlert = b.quantity != null && b.quantityAlert != null && b.quantity <= b.quantityAlert
      if (aAlert && !bAlert) return -1
      if (!aAlert && bAlert) return 1
      return (a.quantity ?? Infinity) - (b.quantity ?? Infinity)
    })
  }
  return map
}

const stockGroups = computed(() => groupByCategory(stockManagedItems.value))
const unmanagedGroups = computed(() => groupByCategory(unmanagedItems.value))
const disabledGroups = computed(() => groupByCategory(disabledItems.value))

function hasLowStock(items: InventoryItem[]): boolean {
  return items.some(
    (i) => i.quantity != null && i.quantityAlert != null && i.quantity <= i.quantityAlert
  )
}

// Search debounce
let inputTimer: ReturnType<typeof setTimeout>
function searchQueryUpdated() {
  clearTimeout(inputTimer)
  inputTimer = setTimeout(() => {}, 0) // just triggers computed reactivity — already reactive
}

// Slideover
function rowClicked(item: InventoryItem) {
  selectedItem.value = { ...item }
  isSideVisible.value = true
}

function onItemUpdated(updated: InventoryItem) {
  mergeItem(updated)
  inventoryItemModalOpen.value = false
  isSideVisible.value = false
}

function onStockUpdated(updated: InventoryItem) {
  mergeItem(updated)
}

function mergeItem(updated: InventoryItem) {
  const idx = allItems.value.findIndex((i) => i.uuid === updated.uuid)
  if (idx !== -1) {
    allItems.value.splice(idx, 1, updated)
  } else {
    allItems.value.push(updated)
  }
  // Keep slideover in sync if it's showing this item
  if (selectedItem.value?.uuid === updated.uuid) {
    selectedItem.value = { ...updated }
  }
}

// Barcode scan
function onDecoded(value: string) {
  searchQuery.value = value
}

// CSV export
async function downloadCsv() {
  isDownloadingCsv.value = true
  const urlParams = new URLSearchParams({ pagination: 'false' })
  if (searchQuery.value) {
    urlParams.append('multiple[name, barcode]', searchQuery.value)
  }
  const { data } = await apiQuery.getAllCsv(urlParams)
  isDownloadingCsv.value = false
  createBrowserCsvDownload('inventory-items.csv', data)
}
</script>

<template>
  <GenericLayoutContentWithSlideover v-model="isSideVisible" tabindex="-1">
    <template #main>
      <UCard>
        <!-- Top bar -->
        <div class="flex items-center gap-2 mb-4 flex-wrap">
          <GenericBarcodeReader v-model="cameraPreview" @decoded="onDecoded" />

          <UInput
            v-model="searchQuery"
            placeholder="Rechercher…"
            class="w-64"
            @update:model-value="searchQueryUpdated()"
          >
            <template v-if="cameraIsPresent || searchQuery" #trailing>
              <UIcon
                v-if="cameraIsPresent"
                class="cursor-pointer"
                name="i-heroicons-qr-code"
                @click="cameraPreview = true"
              />
              <UIcon
                v-if="searchQuery"
                class="cursor-pointer"
                name="i-heroicons-x-mark"
                @click="searchQuery = ''"
              />
            </template>
          </UInput>

          <div class="flex-1" />

          <UButton
            icon="i-heroicons-arrow-down-tray"
            color="success"
            :loading="isDownloadingCsv"
            @click="downloadCsv()"
          >
            CSV
          </UButton>

          <UButton
            v-if="canEdit"
            icon="i-heroicons-plus"
            @click="selectedItem = undefined; inventoryItemModalOpen = true"
          />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-muted" />
        </div>

        <template v-else>
          <!-- Tabs -->
          <div class="flex gap-1 mb-4 border-b border-(--ui-border)">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
              :class="
                activeTab === tab.value
                  ? 'border-(--ui-primary) text-(--ui-primary)'
                  : 'border-transparent text-muted hover:text-default'
              "
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeTab === 'stock'" class="flex flex-col gap-2">
            <div v-if="stockGroups.size === 0" class="text-center py-8 text-muted italic text-sm">
              Aucun article avec stock géré.
            </div>
            <InventoryCategorySection
              v-for="[catName, items] in stockGroups"
              :key="catName"
              :title="catName"
              :items="items"
              :show-stock-control="true"
              :show-reactivate="false"
              :can-edit="canEdit"
              :default-expanded="hasLowStock(items) || catName === highlightedCategoryName"
              @item-updated="onStockUpdated"
              @item-clicked="rowClicked"
            />
          </div>

          <div v-else-if="activeTab === 'unmanaged'" class="flex flex-col gap-2">
            <div v-if="unmanagedGroups.size === 0" class="text-center py-8 text-muted italic text-sm">
              Aucun article sans stock géré.
            </div>
            <InventoryCategorySection
              v-for="[catName, items] in unmanagedGroups"
              :key="catName"
              :title="catName"
              :items="items"
              :show-stock-control="false"
              :show-reactivate="false"
              :can-edit="canEdit"
              :default-expanded="catName === highlightedCategoryName"
              @item-updated="onStockUpdated"
              @item-clicked="rowClicked"
            />
          </div>

          <div v-else-if="activeTab === 'disabled'" class="flex flex-col gap-2">
            <div v-if="disabledGroups.size === 0" class="text-center py-8 text-muted italic text-sm">
              Aucun article désactivé.
            </div>
            <InventoryCategorySection
              v-for="[catName, items] in disabledGroups"
              :key="catName"
              :title="catName"
              :items="items"
              :show-stock-control="false"
              :show-reactivate="true"
              :can-edit="canEdit"
              :default-expanded="catName === highlightedCategoryName"
              @item-updated="mergeItem"
              @item-clicked="rowClicked"
            />
          </div>
        </template>
      </UCard>
    </template>

    <!-- Slideover -->
    <template #side>
      <template v-if="selectedItem">
        <UButton
          block
          class="mb-4"
          :to="'/admin/inventories/items/' + convertUuidToUrlUuid(selectedItem.uuid)"
        >
          Voir en détail
        </UButton>

        <UCard class="overflow-y-auto">
          <InventoryItemForm
            :item="selectedItem"
            :categories="categories"
            :view-only="!canEdit"
            @updated="onItemUpdated"
          />
        </UCard>
      </template>
    </template>
  </GenericLayoutContentWithSlideover>

  <!-- Create modal -->
  <UModal v-model:open="inventoryItemModalOpen">
    <template #content>
      <UCard>
        <InventoryItemForm
          :item="selectedItem ? { ...selectedItem } : undefined"
          :categories="categories"
          @updated="onItemUpdated"
        />
      </UCard>
    </template>
  </UModal>
</template>
