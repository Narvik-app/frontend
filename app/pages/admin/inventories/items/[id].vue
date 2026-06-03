<script setup lang="ts">
import InventoryItemQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery";
import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import type {InventoryItemHistory} from "~/types/api/item/clubDependent/plugin/sale/inventoryItemHistory";
import {formatMonetary} from "~/utils/string";
import {convertUuidToUrlUuid, decodeUrlUuid} from "~/utils/resource";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";
import {formatDate} from "~/utils/date";
import type {ChartDataField} from "~/utils/chart";
import dayjs from "dayjs";

definePageMeta({
    layout: "pos"
  });

  const isLoading = ref(true)

  const toast = useToast()
  const overlay = useOverlay()
  const selfStore = useSelfUserStore();
  const canEdit = computed(() => selfStore.can(Permission.SaleInventoryEdit));

  const route = useRoute()
  const itemId = decodeUrlUuid(route.params.id.toString());

  const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
  const inventoryItemModalOpen = ref(false)

  const inventoryItem: Ref<InventoryItem | undefined> = ref(undefined)

  const chartData: Ref<ChartLineData|undefined> = ref(undefined)
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Prix (€)' },
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Stock' },
        grid: { drawOnChartArea: false },
      },
    },
  }

  type Period = '6m' | '1y' | '2y' | 'all'
  const periods: { label: string; value: Period }[] = [
    { label: '6 mois', value: '6m' },
    { label: '1 an',   value: '1y' },
    { label: '2 ans',  value: '2y' },
    { label: 'Tout',   value: 'all' },
  ]
  const selectedPeriod = ref<Period>('1y')

  const dailyHistories = ref<InventoryItemHistory[]>([])
  const totalDailyHistories = ref(0)
  const page = ref(1)
  const itemsPerPage = ref(30)
  const isLoadingChart = ref(false)
  const isLoadingTable = ref(false)

  const itemQuery = new InventoryItemQuery()

  loadItem().then(value => {
    if (!value) {
      toast.add({
        color: "error",
        title: "Produit non trouvé",
      })

      navigateTo('/admin/inventories')
    }
  })

  async function loadItem(): Promise<boolean> {
    isLoading.value = true
    const { retrieved, error } = await itemQuery.get(itemId.toString())
    isLoading.value = false

    if (!retrieved || error) {
      return false
    }

    inventoryItem.value = retrieved

    useHead({
      title: retrieved.name
    })

    loadChart()
    loadTable()

    return true
  }

  function buildParams(includePagination: boolean): URLSearchParams {
    const params = new URLSearchParams()
    if (selectedPeriod.value !== 'all') {
      const periodMap: Record<string, [number, dayjs.ManipulateType]> = {
        '6m': [6, 'month'],
        '1y': [1, 'year'],
        '2y': [2, 'year'],
      }
      const [amount, unit] = periodMap[selectedPeriod.value]!
      params.append('start', dayjs().subtract(amount, unit).format('YYYY-MM-DD'))
      params.append('end', dayjs().format('YYYY-MM-DD'))
    }
    if (includePagination) {
      params.append('page', page.value.toString())
      params.append('itemsPerPage', itemsPerPage.value.toString())
    } else {
      params.append('pagination', 'false')
    }
    return params
  }

  function selectPeriod(p: Period) {
    selectedPeriod.value = p
    page.value = 1
    loadChart()
    loadTable()
  }

  async function loadChart() {
    isLoadingChart.value = true
    const { items, error } = await itemQuery.dailyHistories(itemId.toString(), buildParams(false))
    isLoadingChart.value = false

    if (error || !items.length) {
      chartData.value = undefined
      return
    }

    const reversed = [...items].reverse()
    const dataPurchasePrice: ChartDataField[] = reversed.map(r => ({
      x: formatDate(r.createdAt) ?? '',
      y: r.purchasePrice ?? undefined,
    }))
    const dataSellingPrice: ChartDataField[] = reversed.map(r => ({
      x: formatDate(r.createdAt) ?? '',
      y: r.sellingPrice ?? undefined,
    }))
    const dataQuantity: ChartDataField[] = reversed.map(r => ({
      x: formatDate(r.createdAt) ?? '',
      y: r.quantity ?? undefined,
    }))

    chartData.value = {
      datasets: [
        { label: "Prix d'achat",  data: dataPurchasePrice, yAxisID: 'y' },
        { label: 'Prix de vente', data: dataSellingPrice,  yAxisID: 'y' },
        { label: 'Stock',         data: dataQuantity,      yAxisID: 'y1' },
      ]
    }
  }

  async function loadTable() {
    isLoadingTable.value = true
    const { items, totalItems, error } = await itemQuery.dailyHistories(itemId.toString(), buildParams(true))
    isLoadingTable.value = false

    if (error) {
      dailyHistories.value = []
      totalDailyHistories.value = 0
      return
    }

    dailyHistories.value = items
    totalDailyHistories.value = totalItems ?? 0
  }

  async function deleteItem() {
    if (!inventoryItem.value) return

    const { error } = await itemQuery.delete(inventoryItem.value)

    if (error) {
      toast.add({
        color: "error",
        title: "La suppression a échouée",
        description: error.message
      })

      return
    }

    toast.add({
      color: "success",
      title: "Produit supprimé",
    })
    navigateTo('/admin/inventories')
  }

  const stockColumns = [
    { accessorKey: 'createdAt',     header: 'Date' },
    { accessorKey: 'quantity',      header: 'Stock fin de journée' },
    { accessorKey: 'purchasePrice', header: "Prix d'achat" },
    { accessorKey: 'sellingPrice',  header: 'Prix de vente' },
  ]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex gap-2">
      <UTooltip text="Inventaire">
        <UButton
          to="/admin/inventories"
          icon="i-heroicons-arrow-left"
          size="xs"
          variant="ghost"
        />
      </UTooltip>

      <div class="flex-1 text-center font-bold text-2xl flex justify-center gap-2 ">
        {{ inventoryItem?.name }}

        <UButton
            v-if="inventoryItem?.category"
            :to="'/admin/inventories?category=' + convertUuidToUrlUuid(inventoryItem.category.uuid)"
            variant="soft"
        >
          {{ inventoryItem.category.name }}
        </UButton>
      </div>

      <UTooltip v-if="canEdit" text="Modifier">
        <UButton
          icon="i-heroicons-pencil-square"
          color="warning"
          @click="inventoryItemModalOpen = true"
        />
      </UTooltip>

      <UTooltip v-if="canEdit" text="Supprimer">
        <UButton
          icon="i-heroicons-trash"
          color="error"
          @click="
            overlayDeleteConfirmation.open({
              async onDelete() {
                await deleteItem()
                overlayDeleteConfirmation.close(true)
              }
            })"
        />
      </UTooltip>
    </div>

    <div class="sm:grid sm:grid-flow-row sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GenericStatCard
        title="Prix d'achat"
        :value="formatMonetary(inventoryItem?.purchasePrice)"
        :loading="isLoading"/>

      <GenericStatCard
        title="Prix de vente"
        :value="formatMonetary(inventoryItem?.sellingPrice)"
        :loading="isLoading"/>

      <GenericStatCard
        title="En stock"
        :value="inventoryItem?.quantity ?? '∞' "
        :value-class="inventoryItem?.quantityAlert && (inventoryItem?.quantity || inventoryItem?.quantity === 0) && inventoryItem?.quantity <= inventoryItem?.quantityAlert ? 'text-error-600' : ''"
        :loading="isLoading"/>

      <GenericStatCard
        :title="inventoryItem?.canBeSold ? 'Vente activée' : 'Vente désactivée' "
        :value-class="inventoryItem?.canBeSold ? 'text-success-600' : 'text-error-600'"
        :loading="isLoading">
        <template #value>
          <UIcon
            :name="inventoryItem?.canBeSold ? 'i-heroicons-check': 'i-heroicons-x-mark'"
          />
        </template>
      </GenericStatCard>
    </div>

    <GenericCard title="Historique des prix et du stock">
      <div class="flex justify-end gap-1 mb-4">
        <UButton
          v-for="p in periods"
          :key="p.value"
          :label="p.label"
          size="sm"
          :variant="selectedPeriod === p.value ? 'soft' : 'ghost'"
          :color="selectedPeriod === p.value ? 'primary' : 'neutral'"
          @click="selectPeriod(p.value)"
        />
      </div>
      <div v-if="isLoadingChart" class="h-[55vh] sm:h-[65vh] flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>
      <div v-else-if="chartData" class="h-[55vh] sm:h-[65vh]">
        <ChartLine :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="h-[20vh] flex items-center justify-center italic text-sm">
        Aucun historique sur la période sélectionnée.
      </div>
    </GenericCard>

    <UCard>
      <div class="text-xl font-bold mb-4">Détail par jour</div>
      <UTable
        :loading="isLoadingTable"
        :columns="stockColumns"
        :data="dailyHistories"
      >
        <template #createdAt-cell="{ row }">{{ formatDate(row.original.createdAt) }}</template>
        <template #quantity-cell="{ row }">{{ row.original.quantity ?? '—' }}</template>
        <template #purchasePrice-cell="{ row }">{{ formatMonetary(row.original.purchasePrice) }}</template>
        <template #sellingPrice-cell="{ row }">{{ formatMonetary(row.original.sellingPrice) }}</template>
        <template #empty>
          <div class="italic text-sm py-6 text-center">Aucun mouvement sur la période.</div>
        </template>
      </UTable>
      <GenericTablePagination
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :total-items="totalDailyHistories"
        @paginate="loadTable()"
      />
    </UCard>
  </div>

  <UModal
    v-model:open="inventoryItemModalOpen">
    <template #content>
      <div>
        <UCard>
          <InventoryItemForm
            :item="inventoryItem ? {...inventoryItem} : undefined"
            @updated="(value) => {inventoryItemModalOpen = false; loadItem() }"
          />
        </UCard>
      </div>
    </template>
  </UModal>

</template>

<style scoped lang="css">

</style>
