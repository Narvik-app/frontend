<script setup lang="ts">
import {formatMonetary} from "~/utils/string";
import type {Sale} from "~/types/api/item/clubDependent/plugin/sale/sale";
import SaleQuery from "~/composables/api/query/clubDependent/plugin/sale/SaleQuery";
import {formatDateTimeReadable} from "~/utils/date";
import {useSelfUserStore} from "~/stores/useSelfUser";
import dayjs from "dayjs";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import SaleModalEdit from "~/components/Sale/SaleModalEdit.vue";
import {useSaleStore} from "~/stores/useSaleStore";
import {convertUuidToUrlUuid, decodeUrlUuid} from "~/utils/resource";
import {Permission} from "~/types/api/permissions";

definePageMeta({
    layout: "pos"
  })

  useHead({
    title: "Détail vente"
  })

  const saleStore = useSaleStore()
  const selfStore = useSelfUserStore()
  const isAdmin = selfStore.isAdmin()
  const canEditSales = selfStore.can(Permission.SaleHistoryEdit)
  const canMakeSales = selfStore.can(Permission.SaleNew)

  // Can edit/delete if:
  // - Admin or has SaleHistoryEdit (can edit any sale)
  // - OR has SaleNew permission AND sale was created today
  const canModifySale = computed(() => {
    if (isAdmin || canEditSales) return true;
    if (!canMakeSales || !sale.value?.createdAt) return false;
    return dayjs(sale.value.createdAt).isAfter(dayjs().startOf('day'));
  })

  const toast = useToast()

  const overlay = useOverlay()
  const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

  const route = useRoute()
  const itemId = decodeUrlUuid(route.params.id.toString());

  const isLoading = ref(true)

  const sale: Ref<Sale | undefined> = ref(undefined)

  const saleQuery = new SaleQuery()

  const columns = [
    {
      accessorKey: 'itemCategory',
      header: 'Catégorie',
      sortable: true
    },
    {
      accessorKey: 'itemName',
      header: 'Nom',
      meta: {
        class: {
          th: 'w-full',
        }
      },
      sortable: true
    },
    {
      accessorKey: 'itemPrice',
      header: 'Prix unitaire'
    },
    {
      accessorKey: 'total',
      header: 'Total'
    }
  ]

  async function loadSale() {
    isLoading.value = true
    const { retrieved, error } = await saleQuery.get(itemId.toString())
    isLoading.value = false

    if (!retrieved || error) {
      toast.add({
        color: "error",
        title: "Vente non trouvé",
      })

      navigateTo('/admin/sales/history')
      return
    }

    sale.value = retrieved
  }

  async function deleteSale() {
    if (!sale.value) {
      return
    }

    const { error } = await saleQuery.delete(sale.value)

    if (error) {
      toast.add({
        color: "error",
        title: "La suppression a échouée",
        description: error.message
      })

      return
    }

    saleStore.shouldRefreshSales = true
    navigateTo('/admin/sales/history')
  }

  // Main code
  loadSale()
  if (isAdmin) {
    columns.push({
      accessorKey: 'item',
      header: 'Article'
    })
  }
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col lg:flex-row gap-2">
      <UButton
        to="/admin/sales/new"
        icon="i-heroicons-shopping-cart"
        size="xs"
        label="Faire une vente"
      />

      <div class="flex-1 text-center font-bold text-2xl flex justify-center gap-2 ">
        {{ formatDateTimeReadable(sale?.createdAt) }}
      </div>

      <div
          v-if="canModifySale"
          class="flex justify-between gap-2"
      >
        <UButton
            v-if="sale"
            icon="i-heroicons-pencil"
            color="warning"
            size="xs"
            label="Modifier"
            @click="overlay.create(SaleModalEdit).open({
             sale: sale
           })"
        />

        <UButton
          icon="i-heroicons-trash"
          color="error"
          size="xs"
          label="Supprimer"
          @click="overlayDeleteConfirmation.open({
            async onDelete() {
              await deleteSale()
              overlayDeleteConfirmation.close(true)
            }
          })"
        />
      </div>
    </div>

    <div class="sm:grid sm:grid-flow-row sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GenericStatCard
        title="Total"
        :value="formatMonetary(sale?.price?.toString())"
        :loading="isLoading"/>

      <GenericStatCard
        title="Articles achetés"
        :value="sale?.salePurchasedItems?.length"
        :loading="isLoading"/>

      <GenericStatCard
        title="Moyen de paiement"
        :value="sale?.paymentMode?.name"
        :top-right="{
          icon: sale?.paymentMode?.icon ? 'i-heroicons-' + sale?.paymentMode?.icon : null
        }"
        :loading="isLoading"/>

      <GenericStatCard
        title="Vendeur"
        :value="sale?.seller?.fullName"
        :loading="isLoading"/>
    </div>

    <GenericCard v-if="sale?.comment" title="Commentaire">
      <div class="whitespace-pre-line">
        {{ sale.comment }}
      </div>
    </GenericCard>

    <GenericCard title="Articles achetés">
      <UTable
        class="w-full"
        :loading="isLoading"
        :columns="columns"
        :sort="{
          column: 'itemCategory',
          direction: 'asc'
        }"
        :data="sale?.salePurchasedItems">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucun articles.</span>
          </div>
        </template>

        <template #itemCategory-cell="{ row }">
          <UButton
              v-if="row.original.itemCategory"
              variant="soft"
          >
            {{ row.original.itemCategory }}
          </UButton>

          <i v-else>
            Pas de catégorie.
          </i>

        </template>

        <template #itemPrice-cell="{ row }">
          {{ row.original.quantity }} x {{ formatMonetary(row.original.itemPrice) }}
        </template>

        <template #total-cell="{ row }">
          {{ formatMonetary(Number(Number(row.original.itemPrice) * Number(row.original.quantity)).toFixed(2)) }}
        </template>

        <template #item-cell="{ row }">
          <UButton
              v-if="row.original.item"
              :to="'/admin/inventories/items/' + convertUuidToUrlUuid(row.original.item.uuid)"
              variant="soft"
          >
            Voir l'article
          </UButton>
          <i v-else>
            Article non existant
          </i>
        </template>

      </UTable>
    </GenericCard>
  </div>
</template>

<style scoped lang="css">

</style>
