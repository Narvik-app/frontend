<script lang="ts" setup>
import {displayFileErrorToast, displayFileSuccessToast, getFileFormDataFromUInputChangeEvent} from "~/utils/file";
import SaleQuery from "~/composables/api/query/clubDependent/plugin/sale/SaleQuery";
import InventoryItemQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery";

definePageMeta({
    layout: "pos"
  });

  useHead({
    title: "Import des ventes"
  })

  const saleQuery = new SaleQuery()
  const inventoryItemQuery = new InventoryItemQuery()

  const apiUploadResponse: Ref<object|undefined> = ref(undefined);
  const fileUploading = ref(false)
  const state = reactive({
    file: undefined
  })

  async function importSalesFromCsv(event: any) {
    const formData = getFileFormDataFromUInputChangeEvent(event);

    if (!formData) {
      return;
    }

    fileUploading.value = true
    const {created, error} = await saleQuery.importFromCsv(formData)
    fileUploading.value = false

    if (error) {
      return displayFileErrorToast(error.message)
    }

    apiUploadResponse.value = created
    displayFileSuccessToast()
  }

  async function importInventoriesFromCsv(event: any) {
    const formData = getFileFormDataFromUInputChangeEvent(event);

    if (!formData) {
      return;
    }

    fileUploading.value = true
    const {created, error} = await inventoryItemQuery.importFromCsv(formData)
    fileUploading.value = false

    if (error) {
      return displayFileErrorToast(error.message)
    }

    apiUploadResponse.value = created
    displayFileSuccessToast()
  }

</script>

<template>
  <div class="flex flex-col gap-4">
    <UAlert
      icon="i-heroicons-megaphone"
      color="warning"
      title="Import statique."
      description="Les ventes importées ne seront pas liées avec les produits de l'inventaire."
    />

    <UCard>
      <p>L'import ce fait grâce au fichier csv exporté depuis l'historique des ventes ou la page inventaire.</p>
      <p>Celui-ci doit obligatoirement être au format csv.</p>

      <div class="grid grid-cols-11 my-4">
        <div class="col-span-5 space-y-2">
          <p class="font-bold">Inventaire</p>
          <UInput
            :loading="fileUploading"
            :disabled="fileUploading"
            class="my-4"
            type="file"
            accept="text/csv"
            icon="i-heroicons-document-text"
            @change="importInventoriesFromCsv"
          />

          <p class="">Exemple</p>
          <GenericCode>
            name,description,purchasePrice,canBeSold,sellingPrice,sellingQuantity,category.name <br >
            Carabine 10M,sed laboriosam molestiae aliquid quia et,2.89,0,13.41,2,Cibles <br >
            Cible C50,,1.47,1,14.31,1,Cibles
          </GenericCode>
        </div>



        <USeparator class="col-span-1" orientation="vertical" />

        <div class="col-span-5 space-y-2">
          <p class="font-bold">Ventes</p>
          <UInput
            :loading="fileUploading"
            :disabled="fileUploading"
            class="my-4"
            type="file"
            accept="text/csv"
            icon="i-heroicons-document-text"
            @change="importSalesFromCsv"
          />

          <p class="">Exemple</p>

          <GenericCode>
            seller.licence,paymentMode.name,price,comment,item.0.name,item.0.category,item.0.price,item.0.quantity,uuid,createdAt <br >
            31394762,Espèces,14.31,test,"Cible C50",Cibles,14.31,1,01950394-b472-7135-beb6-f138d91d624c,2025-02-14T08:30:32+00:00
          </GenericCode>
        </div>
      </div>


      <GenericCode v-if="apiUploadResponse" class="mb-4">{{apiUploadResponse}}</GenericCode>

      <div class="flex gap-2">
        <UButton class="mt-4" target="_blank" to="https://docs.narvik.app/frontend/docs/import/narvik-pos.html">Documentation</UButton>
      </div>

    </UCard>
  </div>
</template>
