<script lang="ts" setup>
import {useMetricStore} from "~/stores/useMetricStore";
import MetricQuery from "~/composables/api/query/MetricQuery";
import {formatDateRangeReadable, formatDateTimeReadable} from "~/utils/date";
import {print} from "~/utils/browser";
import type {DateRange, DateRangeFilter} from "~/types/date";
import type {TablePaginateInterface} from "~/types/table";
import dayjs from "dayjs";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Statistiques de présence par membre'
})

// Types
interface MemberPresenceStat {
  memberId: string;
  presenceCount: number;
  lastPresenceDate: string;
  firstname: string;
  lastname: string;
  licence: string;
}

// Stores
const metricStore = useMetricStore()
const {
  dateRange,
  lastRefreshDate
} = storeToRefs(metricStore)

// Query
const metricQuery = new MetricQuery();

// State
const isLoading = ref(false);
const items = ref<MemberPresenceStat[]>([]);
const totalItems = ref(0);
const page = ref(1);
const itemsPerPage = ref(10);
const order = ref('DESC');
const popoverOpen = ref(false);

const columns = [
  {
    accessorKey: 'firstname',
    header: 'Prénom',
  },
  {
    accessorKey: 'lastname',
    header: 'Nom',
  },
  {
    accessorKey: 'licence',
    header: 'Licence',
  },
  {
    accessorKey: 'presenceCount',
    header: 'Présences',
  },
  {
    accessorKey: 'lastPresenceDate',
    header: 'Dernière présence',
  },
  {
    accessorKey: 'actions',
    header: ' '
  }
];

// Methods
async function fetchMetrics() {
  isLoading.value = true;
  try {
    const urlParams = new URLSearchParams();
    urlParams.append('page', page.value.toString());
    urlParams.append('itemsPerPage', itemsPerPage.value.toString());
    urlParams.append('order', order.value);

    // Date filters from store
    if (dateRange.value) {
       // We emulate the metricStore logic for consistency
       if ('value' in dateRange.value) {
          // If custom filters provided (e.g. Current Season handled by backend)
       } else {
         const range = dateRange.value as DateRange;
         urlParams.append('start', dayjs(range.start).format('YYYY-MM-DD'));
         urlParams.append('end', dayjs(range.end).format('YYYY-MM-DD'));
       }
    }

    let endpoint = 'member-presence-stats';
    const queryString = urlParams.toString();
    if (queryString) {
      endpoint += '?' + queryString;
    }

    const { retrieved } = await metricQuery.get(endpoint);

    if (retrieved) {
      items.value = (retrieved.values as MemberPresenceStat[]) || [];
      // Pagination data from API
      if (retrieved.pagination) {
        totalItems.value = retrieved.pagination.totalItems;
      }

      // Update last refresh date in store manually since we bypass the store action
      lastRefreshDate.value = new Date();
    }
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

function handleDateRangeUpdate(range: DateRange | DateRangeFilter | undefined) {
  metricStore.setDateRange(range);
  page.value = 1; // Reset to first page
  fetchMetrics();
  popoverOpen.value = false;
}

function onPaginate(pagination: TablePaginateInterface) {
  page.value = pagination.page;
  itemsPerPage.value = pagination.itemsPerPage;
  fetchMetrics();
}

function refresh() {
  fetchMetrics();
}

// Watchers
watch(dateRange, () => {
  page.value = 1;
  fetchMetrics();
});

onMounted(() => {
  fetchMetrics();
});
</script>

<template>
  <div>
    <div class="flex flex-col gap-4">

      <!-- Toolbox -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-2">
         <div class="w-full md:w-1/3 flex justify-start">
             <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              to="/admin/statistics"
              label="Retour"
            />
         </div>

        <div class="w-full md:w-1/3 flex justify-center">
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
        </div>

        <div class="w-full md:w-1/3 flex justify-center md:justify-end gap-2">
            <UPopover v-model:open="popoverOpen">
              <UButton
                color="primary"
                icon="i-heroicons-calendar-days"
                :label="dateRange ? formatDateRangeReadable(dateRange) || 'Choisir une période' : 'Choisir une période'"
              />

              <template #content>
                <GenericDateRangePicker
                  :date-range="dateRange"
                  @range-updated="handleDateRangeUpdate"
                  :season-selectors="true"
                  :exclude-previous-season="true"
                />
              </template>
            </UPopover>

            <UButton :disabled="isLoading" icon="i-heroicons-printer" @click="print()" />
        </div>
      </div>

       <!-- Info Alert -->
       <UAlert
        icon="i-heroicons-information-circle"
        color="primary"
        variant="subtle"
        title="Information"
        description="Ces statistiques ne concernent que les membres licenciés dans la saison courante."
      />

      <GenericCard :title="`Membres (${totalItems})`">
        <UTable
          :loading="isLoading"
          :columns="columns"
          :data="items"
        >
           <template #lastPresenceDate-cell="{ row }">
             {{ formatDateTimeReadable(row.original.lastPresenceDate) }}
           </template>

           <template #actions-cell="{ row }">
             <div class="text-right print:hidden">
               <UButton
                 size="xs"
                 :to="`/admin/members/${convertUuidToUrlUuid(row.original.memberUuid)}`">
                 Fiche membre
               </UButton>
             </div>
           </template>
        </UTable>

        <GenericTablePagination
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :total-items="totalItems"
          @paginate="onPaginate"
        />
      </GenericCard>
    </div>
  </div>
</template>
