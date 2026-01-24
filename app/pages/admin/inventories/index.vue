<script setup lang="ts">
import InventoryItemQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery";
import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import InventoryCategoryQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryCategoryQuery";
import type {InventoryCategory} from "~/types/api/item/clubDependent/plugin/sale/inventoryCategory";
import {createBrowserCsvDownload, verifyCameraIsPresent} from "~/utils/browser";
import {convertUuidToUrlUuid, decodeUrlUuid} from "~/utils/resource";
import type {ColumnSort} from "@tanstack/table-core";
import {getTableSortVal} from "~/utils/table";
import type {TablePaginateInterface} from "~/types/table";
import type {SelectApiItem} from "~/types/select";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";

definePageMeta({
    layout: "pos"
  });

  useHead({
    title: 'Inventaire'
  })

  const queryParams = useRoute().query
  const selfStore = useSelfUserStore();
  const canEdit = computed(() => selfStore.can(Permission.SaleInventoryEdit));

  const isSideVisible = ref(false)

  const apiQuery = new InventoryItemQuery()
  const itemCategoryQuery = new InventoryCategoryQuery()

  const searchQuery: Ref<string> = ref('')
  const categories: Ref<InventoryCategory[]> = ref([])
  const categoriesSelect = computed( () => {
    const items: SelectApiItem<InventoryCategory>[] = []
    categories.value.forEach(value => {
      items.push({
        label: value.name,
        value: value.uuid,
        item: value
      })
    })
    return items;
  })
  const filteredCategories: Ref<SelectApiItem<InventoryCategory>[]> = ref([])
  itemCategoryQuery.getAll().then(value => {
    categories.value = value.items

    // Filter is apply on a category
    if (queryParams.category !== undefined) {
      const matchedCategory = value.items.find( (category) => category.uuid == decodeUrlUuid(queryParams.category?.toString()))
      if (matchedCategory) {
        filteredCategories.value.push({
          label: matchedCategory.name,
          value: matchedCategory.uuid,
          item: matchedCategory
        } as SelectApiItem<InventoryCategory>)
        useRouter().replace(useRouter().currentRoute.value.path) // We remove the param from the url
        getItemsPaginated()
      }
    }
  });

  const apiItems: Ref<InventoryItem[]> = ref([])
  const isLoading = ref(true);
  const isDownloadingCsv = ref(false)
  const totalApiItems = ref(0)
  const selectedItem: Ref<InventoryItem | undefined> = ref(undefined)

  watch(filteredCategories, () => {
    getItemsPaginated()
  })

  let inputTimer: NodeJS.Timeout;
  async function searchQueryUpdated() {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(async () => {
      page.value = 1;
      await getItemsPaginated()
    }, 500);
  }

  // Table settings
  const page = ref(1);
  const itemsPerPage = ref(30);
  const sort = ref([{
    id: 'quantity',
    desc: false,

  }] as ColumnSort[]);
  const columns = [
    {
      accessorKey: 'quantity',
      header: 'Quantité en stock',
    },
    {
      accessorKey: 'name',
      header: 'Nom',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: {
        class: {
          th: 'w-full',
        }
      }
    },
    {
      accessorKey: 'category',
      header: 'Catégorie'
    },
    {
      accessorKey: 'actions',
      header: ''
    }
  ]

  function rowClicked(item: InventoryItem) {
    selectedItem.value = {...item} // We make a shallow clone
    isSideVisible.value = true
  }

  // We get the data from the api on first page load
  getItemsPaginated()
  async function getItemsPaginated() {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString(),
    });

    if (filteredCategories.value.length > 0) {
      filteredCategories.value.forEach(filteredCategory => {
        if (!filteredCategory.item.uuid) return;
        urlParams.append('category.uuid[]', filteredCategory.item.uuid)
      })
    }

    // When filter by name the category is applied before
    if (sort.value.length > 0) {
      sort.value.forEach((value) => {
        if (value.id === 'name') {
          urlParams.append(`order[category.weight]`, 'asc')
        }

        urlParams.append(`order[${value.id}]`, getTableSortVal(value))

        // For remaining items we sort first by this then by category
        if (value.id === 'quantity') {
          urlParams.append(`order[category.weight]`, 'asc')
        }
      })
    }


    if (searchQuery.value.trim().length > 0) {
      urlParams.append('multiple[name, barcode]', searchQuery.value.trim())
    }

    const { totalItems, items } = await apiQuery.getAll(urlParams)
    apiItems.value = items
    if (totalItems) {
      totalApiItems.value = totalItems
    }

    isLoading.value = false

    if (totalApiItems.value === 1) {
      rowClicked(items.at(0) as InventoryItem)
    }

  }

  // InventoryItemModal
  const inventoryItemModalOpen = ref(false)

  function onItemUpdated(value: InventoryItem) {
    selectedItem.value = value
    inventoryItemModalOpen.value = false
    isSideVisible.value = false
    getItemsPaginated()
  }

  // Camera detection setup

  const cameraPreview = ref(false)
  const cameraIsPresent = verifyCameraIsPresent()

  function onDecoded(value: string) {
    searchQuery.value = value
    page.value = 1
    getItemsPaginated()
  }

  async function downloadCsv() {
    isDownloadingCsv.value = true

    const urlParams = new URLSearchParams({
      pagination: 'false',
    });

    if (searchQuery.value) {
      urlParams.append(`multiple[name, barcode]`, searchQuery.value);
    }

    // We make the search
    const { data } = await apiQuery.getAllCsv(urlParams)
    isDownloadingCsv.value = false
    createBrowserCsvDownload('inventory-items.csv', data)
  }
</script>

<template>
  <GenericLayoutContentWithSlideover v-model="isSideVisible" tabindex="-1">
    <template #main>
      <UCard>
        <div class="flex mb-2">
          <div class="flex-1"/>
          <UButton icon="i-heroicons-arrow-down-tray" color="success" :loading="isDownloadingCsv" @click="downloadCsv()">
            CSV
          </UButton>
        </div>
        <div class="flex gap-2 flex-col flex-wrap sm:flex-row">
          <GenericBarcodeReader
            v-model="cameraPreview"
            @decoded="onDecoded"
          />

          <div>
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher..."
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
                  @click="searchQuery = ''; getItemsPaginated()"
                />
              </template>
            </UInput>
          </div>


          <div class="flex-1"/>

          <div class="flex gap-4 justify-between">
            <USelectMenu
              v-model="filteredCategories"
              class="w-44"
              :items="categoriesSelect"
              multiple
            >
              <template #default>
              <span v-if="filteredCategories.length" class="truncate">
                {{ filteredCategories.map(fa => fa.label).join(', ') }}
              </span>
                <span v-else>Catégories</span>
              </template>
            </USelectMenu>

            <UButton v-if="canEdit" icon="i-heroicons-plus" @click="selectedItem = undefined; inventoryItemModalOpen = true" />
          </div>


        </div>

        <UTable
          v-model:sorting="sort"
          class="w-full"
          :loading="isLoading"
          :sorting-options="{
            manualSorting: true,
            enableMultiSort: false,
          }"
          :columns="columns"
          :data="apiItems"
          @update:sorting="getItemsPaginated()"
          @select="(evt, row) => rowClicked(row.original)">
          <template #empty>
            <div class="flex flex-col items-center justify-center py-6 gap-3">
              <span class="italic text-sm">Aucun articles.</span>
            </div>
          </template>

          <template #name-header="{ column }">
            <GenericTableSortButton :column="column" :can-be-unsorted="true" />
          </template>
          <template #name-cell="{ row }">
            <UBadge v-if="!row.original.canBeSold" color="error" class="mr-2">Désactivé</UBadge>
            {{ row.original.name }}
          </template>

          <template #quantity-header="{ column }">
            <GenericTableSortButton :column="column" :can-be-unsorted="true" />
          </template>
          <template #quantity-cell="{ row }">
            <p v-if="row.original.quantity || row.original.quantity === 0" :class="row.original.quantityAlert && row.original.quantity <= row.original.quantityAlert ? 'font-bold text-error-600' : ''">
              {{ row.original.quantity }}
            </p>
            <i v-else>Non définie</i>
          </template>

          <template #category-cell="{ row }">
            <UButton
                v-if="row.original.category"
                variant="soft"
            >
              {{ row.original.category.name }}
            </UButton>

            <i v-else>
              Pas de catégorie.
            </i>
          </template>

          <template #actions-cell="{ row }">
            <div class="text-right">
              <UButton @click="rowClicked(row.original)">Détails</UButton>
            </div>
          </template>

        </UTable>

        <GenericTablePagination
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :total-items="totalApiItems"
          @paginate="(object: TablePaginateInterface) => { getItemsPaginated() }"
        />

      </UCard>
    </template>

    <template #side>
      <template v-if="selectedItem">
        <UButton block class="mb-4" :to="'/admin/inventories/items/' + convertUuidToUrlUuid(selectedItem.uuid)">Voir en détail</UButton>

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

  <UModal
    v-model:open="inventoryItemModalOpen">
    <template #content>
      <div>
        <UCard>
          <InventoryItemForm
            :item="selectedItem ? {...selectedItem} : undefined"
            :categories="categories"
            @updated="onItemUpdated"
          />
        </UCard>
      </div>
    </template>
  </UModal>

</template>

<style scoped lang="css">

</style>
