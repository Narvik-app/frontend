<script setup lang="ts">
import InventoryCategoryQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryCategoryQuery";
import type {InventoryCategory} from "~/types/api/item/clubDependent/plugin/sale/inventoryCategory";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import type {FormError, TableRow} from "#ui/types";
import {convertUuidToUrlUuid} from "~/utils/resource";
import type {NuxtError} from "#app";
import type {ItemError} from "~/types/api/itemError";
import type {TablePaginateInterface} from "~/types/table";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";

definePageMeta({
    layout: "pos"
  });

  useHead({
    title: 'Catégorie d\'inventaire'
  })

  const toast = useToast()
  const overlay = useOverlay()
  const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
  const selfStore = useSelfUserStore();
  const canEdit = computed(() => selfStore.can(Permission.SaleCategoriesEdit));

  const apiQuery = new InventoryCategoryQuery();

  const categories: Ref<InventoryCategory[]> = ref([])
  const isLoading = ref(true);
  const totalCategories = ref(0)
  const selectedCategory: Ref<InventoryCategory | undefined> = ref(undefined)

  // Side menu visible
  const isVisible = ref(false);
  // We watch the selected item so we close the side menu if unselected
  watch(selectedCategory, (value, oldValue) => {
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
      header: 'Nom',
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
  getCategoriesPaginated()

  async function getCategoriesPaginated() {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      pagination: '1',
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString(),
    });

    urlParams.append(`order[${sort.value.column}]`, sort.value.direction);

    const { totalItems, items } = await apiQuery.getAll(urlParams)
    categories.value = items
    if (totalItems) {
      totalCategories.value = totalItems
    }

    isLoading.value = false
  }

  function rowClicked(row: TableRow<InventoryCategory>) {
    selectedCategory.value = {...row.original} // We make a shallow clone
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
    await getCategoriesPaginated();
  }

  async function createCategory() {
    let category: InventoryCategory = {
      name: ''
    }
    selectedCategory.value = category
  }

  async function updateCategory(category: InventoryCategory) {
    isLoading.value = true
    let payload: InventoryCategory = {
      name: category.name,
    }

    if (category.weight) {
      payload.weight = category.weight
    }

    // We verify if it's a creation or an update
    let error: NuxtError<ItemError> | undefined = undefined
    if (!category.uuid) {
      let { created, error: errorMessage } = await apiQuery.post(payload);
      error = errorMessage
      selectedCategory.value = created
    } else { // Update
      let { error: errorMessage } = await apiQuery.patch(category, payload);
      error = errorMessage
    }

    isLoading.value = false

    if (error) {
      toast.add({
        color: "error",
        title: !category.uuid ? "La création a échouée" : "La modification a échouée",
        description: error.message
      });
      return;
    }

    toast.add({
      color: "success",
      title: !category.uuid ? "Catégorie créée" : "Catégorie modifiée",
    });

    // We refresh the list
    await getCategoriesPaginated();
  }

  async function deleteCategory() {
    isLoading.value = true
    const { error } = await apiQuery.delete(selectedCategory.value)
    isLoading.value = false

    if (error) {
      toast.add({
        color: "error",
        title: "La suppression a échouée",
        description: error.message
      });
      return;
    }

    selectedCategory.value = undefined
    // We refresh the list
    await getCategoriesPaginated();
  }

  const validate = (state: any): FormError[] => {
    const errors = []
    if (!state.name) errors.push({ path: 'name', message: 'Champ requis' })
    return errors
  }

</script>

<template>
  <GenericLayoutContentWithStickySide @keyup.esc="isVisible = false; selectedCategory = undefined;" :has-side-content="isVisible" :mobile-side-title="selectedCategory?.name" tabindex="-1">
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4">
            <div class="flex-1"></div>
            <UButton v-if="canEdit" @click="createCategory">
              Créer une catégorie
            </UButton>
          </div>

          <UTable
            class="w-full"
            :loading="isLoading"
            :sort="sort"
            :columns="columns"
            :data="categories"
            @select="(evt, row) => rowClicked(row)">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucune catégories.</span>
              </div>
            </template>

            <template #name-cell="{ row }">
              {{ row.original.name }}
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
            :total-items="totalCategories"
            @paginate="(object: TablePaginateInterface) => { getCategoriesPaginated() }"
          />
        </div>
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedCategory && canEdit">
        <UForm :state="selectedCategory" @submit="updateCategory(selectedCategory)" :validate="validate" class="flex flex-col gap-4">
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Nom" name="name">
                <UInput v-model="selectedCategory.name" />
              </UFormField>
              <UFormField label="Poids dans la liste" name="weight">
                <UInput type="number" v-model="selectedCategory.weight" />
              </UFormField>
            </div>

          </UCard>

          <UButton v-if="selectedCategory.uuid" variant="soft" block :loading="isLoading" :to="'/admin/inventories?category=' + convertUuidToUrlUuid(selectedCategory.uuid)">Voir les articles</UButton>

          <UButton type="submit" block :loading="isLoading">Enregistrer</UButton>

          <UButton
            v-if="selectedCategory.uuid"
            block
            color="error"
            :loading="isLoading"
            :disabled="(selectedCategory?.items?.length ?? 0) > 0"
            @click="
              overlayDeleteConfirmation.open({
                async onDelete() {
                  await deleteCategory()
                  overlayDeleteConfirmation.close(true)
                }
              })
            "
          >
            Supprimer
          </UButton>
        </UForm>

      </template>
    </template>
  </GenericLayoutContentWithStickySide>
</template>

<style scoped lang="css">

</style>
