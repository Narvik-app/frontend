<script lang="ts" setup>
import type {TableRow} from "#ui/types";
import ClubQuery from "~/composables/api/query/ClubQuery";
import type {Club, WriteClub} from "~/types/api/item/club";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {formatDateReadable} from "~/utils/date";
import dayjs from "dayjs";
import {convertUuidToUrlUuid} from "~/utils/resource";
import type {TablePaginateInterface} from "~/types/table";

definePageMeta({
  layout: "super-admin"
});

useHead({
  title: 'Clubs'
})

const apiQuery = new ClubQuery();

const selfStore = useSelfUserStore()

const apiItems: Ref<Club[]> = ref([])
const isLoading = ref(true);
const apiTotalItems = ref(0)
const selectedItem: Ref<WriteClub | undefined> = ref(undefined)

const searchQuery: Ref<string> = ref('')

// Side menu visible
const isSideVisible = ref(false);

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
const columns = [
  {
    accessorKey: 'isActivated',
    header: 'Activé'
  },
  {
    accessorKey: 'name',
    header: 'Nom',
  },
  {
    accessorKey: 'renewDate',
    header: 'Renouvellement'
  },
  {
    accessorKey: 'comment',
    header: 'Commentaire',
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

  if (searchQuery.value.trim().length > 0) {
    urlParams.append('multiple[name]', searchQuery.value.trim())
  }

  urlParams.append(`order[renewDate]`, 'ASC');
  urlParams.append(`order[isActivated]`, 'ASC');
  urlParams.append(`order[name]`, 'ASC');

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
  const item: WriteClub = {
    name: '',
    isActivated: true,
    presencesEnabled: true,
    salesEnabled: true,
  }
  selectedItem.value = item
  isSideVisible.value = true
}

async function impersonate(club: Club) {
  const impersonated = await selfStore.impersonateClub(club)
  if (!impersonated) {
    console.error('Failed to impersonate.')
    return
  }
  navigateTo('/admin')
}
</script>

<template>
  <GenericLayoutContentWithSlideover v-model="isSideVisible" tabindex="-1">
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4">
            <UInput
              v-model="searchQuery"
              placeholder="Rechercher..."
              @update:model-value="searchQueryUpdated()"
            >
              <template v-if="searchQuery" #trailing>
                <UIcon
                  v-if="searchQuery"
                  class="cursor-pointer"
                  name="i-heroicons-x-mark"
                  @click="searchQuery = ''; getItemsPaginated()"
                />
              </template>
            </UInput>

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
                <span class="italic text-sm">Aucun club.</span>
              </div>
            </template>

            <template #isActivated-cell="{ row }">
              <USwitch class="pointer-events-none" :model-value="row.original.isActivated" />
            </template>

            <template #name-cell="{ row }">
              {{ row.original.name }}
            </template>

            <template #renewDate-cell="{ row }">
              <p :class="dayjs().isAfter(dayjs(row.original.renewDate).subtract(14, 'days')) ? 'text-error-500 font-bold' : ''">{{ formatDateReadable(row.original.renewDate) }}</p>
            </template>

            <template #actions-cell="{ row }">
              <div class="text-right">
                <UButton variant="soft" :to="`/super-admin/clubs/${convertUuidToUrlUuid(row.original.uuid)}`">Détails</UButton>
              </div>
            </template>

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
      <div v-if="selectedItem" class="flex flex-col gap-4">
        <UButton v-if="selectedItem.uuid" color="warning" block :loading="isLoading" @click="impersonate(selectedItem)">Impersonifier</UButton>
        <UButton
          v-if="selectedItem.uuid"
          block
          :to="`/super-admin/clubs/${convertUuidToUrlUuid(selectedItem.uuid)}`"
        >
          Voir en détail
        </UButton>

        <UCard>
          <ClubForm :item="selectedItem" :is-list="true" @updated="(value) => {selectedItem = value; getItemsPaginated()}" />
        </UCard>

      </div>
    </template>
  </GenericLayoutContentWithSlideover>
</template>
