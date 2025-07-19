<script setup lang="ts">
import {formatMonetary} from "~/utils/string";
import {formatDateRangeReadable, formatDateTimeReadable} from "~/utils/date";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import {useSaleStore} from "~/stores/useSaleStore";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {convertUuidToUrlUuid} from "~/utils/resource";

const props = defineProps({
  perItem: {
    type: Boolean,
    required: false,
    default: false
  },
})

const selfStore = useSelfUserStore()
const saleStore = useSaleStore()
const { selectedRange, isLoading, lastRefreshDate, sales, paymentModes } = storeToRefs(saleStore)

const isAdmin = selfStore.isAdmin()

const popoverOpen = ref(false)

const totalAmountSales = computed(() => {
  let amount = 0
  sales.value.forEach(sale => {
    amount += Number(sale.price)
  })
  return amount
})

const totalPerPaymentMode = computed(() => {
  const amountPerPayment: Map<string, {count: number, amount: number, icon: string}> = new Map()
  paymentModes.value.forEach(paymentMode => {
    if (!paymentMode.name) return
    amountPerPayment.set(paymentMode.name, {
      count: 0,
      amount: 0,
      icon: paymentMode.icon ?? ''
    })
  })

  sales.value.forEach(sale => {
    const paymentModeObject: SalePaymentMode = sale.paymentMode as SalePaymentMode
    if (!sale.paymentMode || !paymentModeObject.name) { return }

    let paymentMode = amountPerPayment.get(paymentModeObject.name)
    if (!paymentMode) {
      return;
    }

    paymentMode.count += 1
    paymentMode.amount += Number(sale.price)
    amountPerPayment.set(paymentModeObject.name, paymentMode)
  })
  return amountPerPayment
})

if (sales.value.length == 0 || saleStore.shouldRefreshSales) {
  saleStore.getSales() // We load the default setting
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
        @click="saleStore.getSales()"
      >
        Dernière mise à jour : {{ formatDateTimeReadable(lastRefreshDate.toString()) }}
      </UButton>

      <div class="w-full mb-2"></div>

      <UPopover v-model:open="popoverOpen">
        <UButton icon="i-heroicons-calendar-days-20-solid" :label="selectedRange ? formatDateRangeReadable(selectedRange) || 'Choisir une plage' : 'Choisir une plage'" />

        <template #content>
          <GenericDateRangePicker v-model="selectedRange" @range-updated="popoverOpen = false; saleStore.getSales();" />
        </template>
      </UPopover>

    </div>


    <div class="sm:grid sm:grid-flow-row sm:gap-4 sm:grid-cols-2">
      <GenericStatCard
        title="Nombres de ventes"
        :value="sales.length"
        :loading="isLoading">
      </GenericStatCard>

      <GenericStatCard
        title="Total"
        :value="formatMonetary(totalAmountSales.toFixed(2))"
        :loading="isLoading">
      </GenericStatCard>
    </div>

    <div class="sm:flex sm:gap-4 sm:justify-center sm:flex-wrap">
      <GenericStatCard
        class="basis-[calc(25%-1rem)]"
        v-for="[name, value] in totalPerPaymentMode"
        :title="name"
        :is-increasing="true"
        :value="formatMonetary(value.amount.toFixed(2))"
        :top-right="{
          value: value.count.toString(),
          tooltip: value.count + ' ventes en ' + name,
          icon: value.icon ? 'i-heroicons-' + value.icon : null
        }"
        :loading="isLoading">
      </GenericStatCard>
    </div>

    <template v-if="props.perItem">
      <SalePerItemList :is-loading="isLoading" />
    </template>
    <template v-else>
      <UCard>


        <div class="flex flex-wrap items-center gap-4">
          <div class="text-xl font-bold">Ventes</div>

          <div class="flex-1"></div>

          <template v-if="isAdmin">
            <UButton @click="saleStore.getSalesCsv()" icon="i-heroicons-arrow-down-tray" color="success" :loading="saleStore.isDownloadingCsv" :disabled="!selectedRange">
              CSV
            </UButton>
          </template>
        </div>
        <UTable
          class="w-full"
          :loading="isLoading"
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
          :sort="[{
            id: 'createdAt',
            desc: true
          }]"
          :data="sales">
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
            {{ row.original.paymentMode.name }}
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
      </UCard>
    </template>
  </div>
</template>

<style scoped lang="css">

</style>
