<script setup lang="ts">
  import InventoryItemQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery";
  import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
  import type {InventoryItemHistory} from "~/types/api/item/clubDependent/plugin/sale/inventoryItemHistory";

  import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors } from 'chart.js'
  import { Line } from 'vue-chartjs'
  import {formatMonetary} from "~/utils/string";
  import {convertUuidToUrlUuid, decodeUrlUuid} from "~/utils/resource";
  import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors)

  definePageMeta({
    layout: "pos"
  });

  const isLoading = ref(true)

  const toast = useToast()
  const overlay = useOverlay()

  const route = useRoute()
  const itemId = decodeUrlUuid(route.params.id.toString());


  const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
  const inventoryItemModalOpen = ref(false)

  const inventoryItem: Ref<InventoryItem | undefined> = ref(undefined)
  const inventoryItemHistories: Ref<InventoryItemHistory[]> = ref([])

  const chartData: Ref<object|undefined> = ref(undefined)
  const chartOptions = ref({
    responsive: true,
    maintainAspectRatio: true,
  })

  const itemQuery = new InventoryItemQuery()

  // We load the item
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

    // We update the page title
    useHead({
      title: retrieved.name
    })

    loadHistories(itemId.toString())

    return true
  }

  async function loadHistories(itemId: string) {
    // We load the history
    const { items, error } = await itemQuery.histories(itemId)

    if (error) {
      inventoryItemHistories.value = []
      return;
    }

    inventoryItemHistories.value = items



    let labels: string[] = [];
    let dataPurchasePrice: string[] = [];
    let dataSellingPrice: string[] = [];

    items.reverse().forEach(value => {
      labels.push(formatDate(value.createdAt) ?? '')
      dataPurchasePrice.push(value.purchasePrice ?? '')
      dataSellingPrice.push(value.sellingPrice ?? '')
    })

    chartData.value = {
      labels: labels,
      datasets: [
        {
          label: 'Prix d\'achat',
          data: dataPurchasePrice
        },
        {
          label: 'Prix de vente',
          data: dataSellingPrice
        }
      ]
    }
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

        <UButton v-if="inventoryItem?.category"
           :to="'/admin/inventories?category=' + convertUuidToUrlUuid(inventoryItem.category.uuid)"
           variant="soft"
        >
          {{ inventoryItem.category.name }}
        </UButton>
      </div>

      <UTooltip text="Modifier">
        <UButton
          icon="i-heroicons-pencil-square"
          color="warning"
          @click="inventoryItemModalOpen = true"
        />
      </UTooltip>

      <UTooltip text="Supprimer">
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
        :loading="isLoading">
      </GenericStatCard>

      <GenericStatCard
        title="Prix de vente"
        :value="formatMonetary(inventoryItem?.sellingPrice)"
        :loading="isLoading">
      </GenericStatCard>

      <GenericStatCard
        title="En stock"
        :value="inventoryItem?.quantity ?? '∞' "
        :value-class="inventoryItem?.quantityAlert && (inventoryItem?.quantity || inventoryItem?.quantity === 0) && inventoryItem?.quantity <= inventoryItem?.quantityAlert ? 'text-error-600' : ''"
        :loading="isLoading">
      </GenericStatCard>

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

    <GenericCard v-if="chartData" title="Historique des prix de ventes/achats">
      <Line
        :data="chartData"
        :options="chartOptions"
      />
    </GenericCard>
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
