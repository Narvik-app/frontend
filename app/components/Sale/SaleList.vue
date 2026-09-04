<script setup lang="ts">
import {formatMonetary} from "~/utils/string";
import {formatDateRangeReadable, formatDateTimeReadable} from "~/utils/date";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import {useSaleStore} from "~/stores/useSaleStore";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {convertUuidToUrlUuid} from "~/utils/resource";
import type {TablePaginateInterface} from "~/types/table";
import type {ColumnSort} from "@tanstack/table-core";

const props = defineProps({
  perItem: {
    type: Boolean,
    required: false,
    default: false
  },
})

const selfStore = useSelfUserStore()
const saleStore = useSaleStore()
const {
  selectedRange, isLoading, isLoadingStats, lastRefreshDate,
  sales, totalItems, page, itemsPerPage, sortDesc,
  saleStats, totalCount, totalAmount,
} = storeToRefs(saleStore)

const isAdmin = selfStore.isAdmin()

const popoverOpen = ref(false)
const sort = ref(sortDesc.value === undefined ? [] : [{id: 'createdAt', desc: sortDesc.value}] as ColumnSort[])

const isStockRemoval = (sale: { paymentMode?: SalePaymentMode | string | null }) =>
  typeof sale.paymentMode === 'object' && sale.paymentMode?.kind === 'stock_removal'

function refresh() {
  if (props.perItem) {
    saleStore.getSalePerItemStats()
  } else {
    saleStore.getSales()
  }
}

function onRangeUpdated(range: Parameters<typeof saleStore.setSelectedRange>[0]) {
  saleStore.setSelectedRange(range)
  popoverOpen.value = false
  refresh()
}

function onPaginate(pagination: TablePaginateInterface) {
  page.value = pagination.page
  itemsPerPage.value = pagination.itemsPerPage
  saleStore.getSales()
}

function onSortChanged() {
  sortDesc.value = sort.value.length ? sort.value[0].desc : undefined
  page.value = 1
  saleStore.getSales()
}

const needsInitialLoad = props.perItem
  ? saleStore.perItemStats.length === 0 || saleStore.shouldRefreshPerItemStats
  : sales.value.length === 0 || saleStore.shouldRefreshSales

if (needsInitialLoad) {
  refresh() // We load the default setting
}
</script>

<template>
  <div class="flex flex-col gap-4 relative">
    <div class="flex flex-wrap justify-center">
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-heroicons-arrow-path"
        :loading="isLoading"
        @click="refresh"
      >
        Dernière mise à jour : {{ formatDateTimeReadable(lastRefreshDate.toString()) }}
      </UButton>

      <div class="w-full mb-2"/>

      <UPopover v-model:open="popoverOpen">
        <UButton data-testid="date-range-picker-trigger" icon="i-heroicons-calendar-days-20-solid" :label="selectedRange ? formatDateRangeReadable(selectedRange) || 'Choisir une plage' : 'Choisir une plage'" />

        <template #content>
          <GenericDateRangePicker :date-range="selectedRange" @range-updated="onRangeUpdated" />
        </template>
      </UPopover>

    </div>


    <div class="sm:grid sm:grid-flow-row sm:gap-4 sm:grid-cols-2">
      <GenericStatCard
        data-testid="stat-sale-count"
        title="Nombres de ventes"
        :value="totalCount"
        :loading="isLoadingStats"/>

      <GenericStatCard
        data-testid="stat-sale-total"
        title="Total"
        :value="formatMonetary(totalAmount.toFixed(2))"
        :loading="isLoadingStats"/>
    </div>

    <div class="sm:flex sm:gap-4 sm:justify-center sm:flex-wrap">
      <GenericStatCard
        v-for="paymentMode in saleStats.filter(pm => pm.kind !== 'stock_removal')"
        :key="paymentMode.uuid"
        class="basis-[calc(25%-1rem)]"
        :title="paymentMode.name"
        :is-increasing="true"
        :value="formatMonetary(paymentMode.amount.toFixed(2))"
        :top-right="{
          value: paymentMode.count.toString(),
          tooltip: paymentMode.count + ' ventes en ' + paymentMode.name,
          icon: paymentMode.icon ? 'i-heroicons-' + paymentMode.icon : null
        }"
        :loading="isLoadingStats"/>
    </div>

    <template v-if="props.perItem">
      <SalePerItemList :is-loading="isLoadingStats" />
    </template>
    <template v-else>
      <UCard>


        <div class="flex flex-wrap items-center gap-4">
          <div class="text-xl font-bold">Ventes ({{ totalItems }})</div>

          <div class="flex-1"/>

          <template v-if="isAdmin">
            <UButton icon="i-heroicons-arrow-down-tray" color="success" :loading="saleStore.isDownloadingCsv" :disabled="!selectedRange" @click="saleStore.getSalesCsv()">
              CSV
            </UButton>
          </template>
        </div>
        <UTable
          v-model:sorting="sort"
          class="w-full"
          :loading="isLoading"
          :sorting-options="{
            manualSorting: true,
            enableMultiSort: false,
          }"
          :columns="[
            {
              accessorKey: 'createdAt',
              header: 'Date',
              meta: {
                class: {
                  th: 'w-40',
                }
              },
            },
            {
              accessorKey: 'paymentMode',
              header: 'Moyen de paiement',
              meta: {
                class: {
                  th: 'w-48',
                }
              },
            },
            {
              accessorKey: 'price',
              header: 'Montant',
            },
            {
              accessorKey: 'comment',
              header: 'Commentaire'
            },
            {
              accessorKey: 'id',
              header: 'Détail'
            }
          ]"
          :data="sales"
          @update:sorting="onSortChanged">
          <template #empty>
            <div class="flex flex-col items-center justify-center py-6 gap-3">
              <span class="italic text-sm">Aucun articles.</span>
            </div>
          </template>

          <template #createdAt-header="{ column }">
            <GenericTableSortButton :column="column" :can-be-unsorted="true" />
          </template>
          <template #createdAt-cell="{ row }">
            {{ formatDateTimeReadable(row.original.createdAt) }}
          </template>

<!--          <template #paymentMode-header="{ column }">-->
<!--            <GenericTableSortButton :column="column" />-->
<!--          </template>-->
          <template #paymentMode-cell="{ row }">
            <div class="flex items-center gap-1">
              {{ row.original.paymentMode.name }}
              <UBadge
                v-if="isStockRemoval(row.original)"
                color="warning"
                size="sm"
              >
                <UIcon name="i-heroicons-archive-box-arrow-down" />
                Sortie de stock
              </UBadge>
            </div>
          </template>

          <template #price-cell="{ row }">
            {{ formatMonetary(row.original.price) }}
          </template>

          <template #total-cell="{ row }">
            {{ formatMonetary(Number(Number(row.original.itemPrice) * Number(row.original.quantity)).toFixed(2)) }}
          </template>

          <template #id-cell="{ row }">
            <UButton
              :to="'/admin/sales/' + convertUuidToUrlUuid(row.original.uuid)"
              variant="soft"
            >
              Voir le détail
            </UButton>
          </template>

        </UTable>

        <GenericTablePagination
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :total-items="totalItems"
          @paginate="onPaginate"
        />
      </UCard>
    </template>
  </div>
</template>

<style scoped lang="css">

</style>
