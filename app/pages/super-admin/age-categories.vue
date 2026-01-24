<script lang="ts" setup>
import type {FormError, TableRow} from "#ui/types";
import type {Club} from "~/types/api/item/club";
import type {NuxtError} from "#app";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import AgeCategoryQuery from "~/composables/api/query/AgeCategoryQuery";
import type {AgeCategory} from "~/types/api/item/ageCategory";

definePageMeta({
  layout: "super-admin"
});

useHead({
  title: 'Catégories d\'âge'
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const apiQuery = new AgeCategoryQuery();


const apiItems: Ref<AgeCategory[]> = ref([])
const isLoading = ref(true);
const apiTotalItems = ref(0)
const selectedItem: Ref<AgeCategory | undefined> = ref(undefined)


// Side menu visible
const isSideVisible = ref(false);

// Table settings
const page = ref(1);
const itemsPerPage = ref(30);
const columns = [
  {
    accessorKey: 'name',
    header: 'Nom',
  },
  {
    accessorKey: 'code',
    header: 'code',
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
getItemsPaginated()

async function getItemsPaginated() {
  isLoading.value = true

  const urlParams = new URLSearchParams({
    page: page.value.toString(),
    itemsPerPage: itemsPerPage.value.toString(),
  });

  const { totalItems, items } = await apiQuery.getAll(urlParams)
  apiItems.value = items
  if (totalItems) {
    apiTotalItems.value = totalItems
  }

  isLoading.value = false
}

function rowClicked(row: TableRow<Club>) {
  selectedItem.value = {...row.original} // We make a shallow clone
  isSideVisible.value = true
}

async function createItem() {
  const item: AgeCategory = {
    name: '',
    code: ''
  }
  selectedItem.value = item
  isSideVisible.value = true
}

async function updateItem(item: AgeCategory) {
  isLoading.value = true

  // We recreate the payload so we don't edit unwanted fields
  const payload: AgeCategory = {
    name: item.name,
    code: item.code
  }

  // We verify if it's a creation or an update
  let apiError: NuxtError | undefined = undefined
  if (!item.id) {
    const {error, created} = await apiQuery.post(payload);
    apiError = error
    selectedItem.value = created
  } else { // Update
    const {error, updated} = await apiQuery.patch(item, payload);
    apiError = error
    selectedItem.value = updated
  }

  isLoading.value = false
  isSideVisible.value = false

  if (apiError) {
    toast.add({
      color: "error",
      title: !item.id ? "La création a échouée" : "La modification a échouée",
      description: apiError.message
    });
    return;
  }

  toast.add({
    color: "success",
    title: !item.id ? "Catégorie créée" : "Catégorie modifiée",
  });

  // We refresh the list
  await getItemsPaginated();
}

async function deleteItem() {
  isLoading.value = true
  const { error } = await apiQuery.delete(selectedItem.value)
  isLoading.value = false

  if (error) {
    toast.add({
      color: "error",
      title: "La suppression a échouée",
      description: error.message
    });
    return;
  }

  selectedItem.value = undefined
  // We refresh the list
  await getItemsPaginated();
}

const validate = (state: { name?: string; code?: string }): FormError[] => {
  const errors = []
  if (!state.name) errors.push({ name: 'name', message: 'Champ requis' })
  if (!state.code) errors.push({ name: 'code', message: 'Champ requis' })
  return errors
}
</script>

<template>
  <GenericLayoutContentWithSlideover v-model="isSideVisible" tabindex="-1">
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4">
            <div class="flex-1"/>

            <UButton icon="i-heroicons-plus" @click="createItem"/>

          </div>

          <UTable
            class="w-full"
            :loading="isLoading"
            :columns="columns"
            :data="apiItems"
            @select="rowClicked">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucune catégories.</span>
              </div>
            </template>

            <template #actions-cell />

          </UTable>

          <GenericTablePagination
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :total-items="apiTotalItems"
            @paginate="(object: TablePaginateInterface) => { getItemsPaginated() }"
          />
        </div>
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedItem">
        <UForm :state="selectedItem" :validate="validate" class="flex flex-col gap-4" @submit="updateItem(selectedItem)">
          <UCard>
            <div class="flex gap-2 flex-col relative">
              <UFormField label="Nom" name="name" required>
                <UInput v-model="selectedItem.name" />
              </UFormField>
              <UFormField label="Code" name="code" required>
                <UInput v-model="selectedItem.code" />
              </UFormField>
            </div>

          </UCard>

          <UButton type="submit" block :loading="isLoading">Enregistrer</UButton>

          <UButton
            v-if="selectedItem.id"
            block
            color="error"
            :loading="isLoading"
            @click="
              overlayDeleteConfirmation.open({
                async onDelete() {
                  await deleteItem()
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
  </GenericLayoutContentWithSlideover>
</template>
