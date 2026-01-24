<script setup lang="ts">
import type {InventoryCategory} from "~/types/api/item/clubDependent/plugin/sale/inventoryCategory";
import SalePaymentModeQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentModeQuery";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import type {FormError, TableRow} from "#ui/types";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import type {NuxtError} from "#app";
import type {ItemError} from "~/types/api/itemError";
import type {TablePaginateInterface} from "~/types/table";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";

definePageMeta({
    layout: "pos"
  });

  useHead({
    title: 'Moyen de paiement'
  })

  const toast = useToast()
  const overlay = useOverlay()
  const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
  const selfStore = useSelfUserStore();
  const canEdit = computed(() => selfStore.can(Permission.SalePaymentModesEdit));

  const apiQuery = new SalePaymentModeQuery()

  const paymentModes: Ref<SalePaymentMode[]> = ref([])
  const isLoading = ref(true);
  const totalPaymentModes = ref(0)
  const selectedPaymentMode: Ref<SalePaymentMode | undefined> = ref(undefined)

  // Side menu visible
  const isVisible = ref(false);
  // We watch the selected item so we close the side menu if unselected
  watch(selectedPaymentMode, (value, oldValue) => {
    isVisible.value = value !== undefined
  })

  // Table settings
  const page = ref(1);
  const itemsPerPage = ref(30);
  const sort = ref({
    column: 'weight',
    direction: 'asc'
  });
  const columns = [
    {
      accessorKey: 'name',
      header: 'Nom'
    },
    {
      accessorKey: 'icon',
      header: 'Icône',
      meta: {
        class: {
          th: 'w-full',
        }
      }
    },
    {
      accessorKey: 'actions',
      header: ''
    }
  ]

  // We get the data from the api on first page load
  getPaymentModesPaginated()

  async function getPaymentModesPaginated() {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      pagination: '1',
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString(),
    });

    urlParams.append(`order[${sort.value.column}]`, sort.value.direction);

    const { totalItems, items } = await apiQuery.getAll(urlParams)
    paymentModes.value = items
    if (totalItems) {
      totalPaymentModes.value = totalItems
    }

    isLoading.value = false
  }

  function rowClicked(row: TableRow<SalePaymentMode>) {
    selectedPaymentMode.value = {...row.original} // We make a shallow clone
    isVisible.value = true
  }

  async function move(row: InventoryCategory, modifier: number) {
    isLoading.value = true
    const { error } = await apiQuery.move(row, modifier === 1 ? 'down' : 'up');
    isLoading.value = false

    if (error) {
      toast.add({
        color: "error",
        title: "La modification a échouée",
        description: error.message
      });
      return;
    }

    // We refresh the list
    await getPaymentModesPaginated();
  }

  function createPaymentMode() {
    selectedPaymentMode.value = {
      available: true,
      name: '',
      icon: '',
    }
  }

  async function updatePaymentMode(paymentMode: SalePaymentMode) {
    isLoading.value = true
    const payload: SalePaymentMode = {
      available: paymentMode.available,
      name: paymentMode.name,
      icon: paymentMode.icon
    }

    if (paymentMode.weight) {
      payload.weight = paymentMode.weight
    }

    // We verify if it's a creation or an update
    let error: NuxtError<ItemError> | undefined = undefined
    if (!paymentMode.uuid) {
      const { created, error: errorMessage } = await apiQuery.post(payload);
      error = errorMessage
      selectedPaymentMode.value = created
    } else { // Update
      const { error: errorMessage } = await apiQuery.patch(paymentMode, payload);
      error = errorMessage
    }

    isLoading.value = false

    if (error) {
      toast.add({
        color: "error",
        title: !paymentMode.uuid ? "La création a échouée" : "La modification a échouée",
        description: error.message
      });
      return;
    }

    toast.add({
      color: "success",
      title: !paymentMode.uuid ? "Moyen de paiement crée" : "Moyen de paiement modifié",
    });

    // We refresh the list
    await getPaymentModesPaginated();
  }

  async function deletePaymentMode() {
    isLoading.value = true
    const { error } = await apiQuery.delete(selectedPaymentMode.value)
    isLoading.value = false

    if (error) {
      toast.add({
        color: "error",
        title: "La suppression a échouée",
        description: error.message
      });
      return;
    }

    selectedPaymentMode.value = undefined
    // We refresh the list
    await getPaymentModesPaginated();
  }

  const validate = (state: any): FormError[] => {
    const errors = []
    if (!state.name) errors.push({ name: 'name', message: 'Champ requis' })
    if (!state.icon) errors.push({ name: 'icon', message: 'Champ requis' })
    return errors
  }

</script>

<template>
  <GenericLayoutContentWithStickySide :has-side-content="isVisible" :mobile-side-title="selectedPaymentMode?.name" tabindex="-1" @keyup.esc="isVisible = false; selectedPaymentMode = undefined;">
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4">

            <div class="flex-1"/>
            <UButton v-if="canEdit" @click="createPaymentMode" >
              Créer un mode de paiement
            </UButton>
          </div>

          <UTable
            class="w-full"
            :loading="isLoading"
            :sort="sort"
            :columns="columns"
            :data="paymentModes"
            @select="rowClicked">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucun moyen de paiement.</span>
              </div>
            </template>

            <template #name-cell="{ row }">
              {{ row.original.name }}
            </template>


            <template #icon-cell="{ row }">
              <UIcon :name="'i-heroicons-' + row.original.icon" />
            </template>

            <template #actions-cell="{ row }">
              <div v-if="canEdit" class="flex items-center gap-1">
                <p class="text-xs">{{ row.original.weight }}</p>
                <GenericStackedUpDown @changed="modifier => { move(row.original, -modifier) }" />
              </div>
            </template>

          </UTable>

          <GenericTablePagination
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :total-items="totalPaymentModes"
            @paginate="(object: TablePaginateInterface) => { getPaymentModesPaginated() }"
          />
        </div>
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedPaymentMode && canEdit">
        <UForm :state="selectedPaymentMode" :validate="validate" @submit="updatePaymentMode(selectedPaymentMode)">
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Disponible" name="available">
                <USwitch v-model="selectedPaymentMode.available" />
              </UFormField>

              <UFormField label="Nom" name="name">
                <UInput v-model="selectedPaymentMode.name" />
              </UFormField>

              <UFormField label="Icône" name="icon">

                <template #description>
                  <ContentLink variant="link" to="https://heroicons.com/" target="_blank">Liste des icônes Heroicons</ContentLink>
                  <ul class="text-xs">
                    <li>Espèces : <code>banknotes</code></li>
                    <li>Chèque : <code>ticket</code></li>
                    <li>Carte : <code>credit-card</code></li>
                  </ul>
                </template>

                <template v-if="selectedPaymentMode.icon" #hint>
                  <UIcon :name="'i-heroicons-' + selectedPaymentMode.icon" />
                </template>

                <UInput v-model="selectedPaymentMode.icon" />

              </UFormField>

              <UFormField label="Poids dans la liste" name="weight">
                <UInput v-model="selectedPaymentMode.weight" type="number" />
              </UFormField>
            </div>

          </UCard>

          <UButton class="mt-4" block type="submit" :loading="isLoading">Enregistrer</UButton>
        </UForm>

        <UButton
          v-if="selectedPaymentMode.uuid"
          block
          color="error"
          :loading="isLoading"
          @click="
            overlayDeleteConfirmation.open({
              async onDelete() {
                await deletePaymentMode()
                overlayDeleteConfirmation.close(true)
              }
            })
          "
        >
          Supprimer
        </UButton>

      </template>
    </template>
  </GenericLayoutContentWithStickySide>
</template>

<style scoped lang="css">

</style>
