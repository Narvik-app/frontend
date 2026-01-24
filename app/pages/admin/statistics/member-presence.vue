<script lang="ts" setup>
import {useMetricStore} from "~/stores/useMetricStore";
import MetricQuery from "~/composables/api/query/MetricQuery";
import {formatDateRangeReadable, formatDateReadable, formatDateTimeReadable} from "~/utils/date";
import {print} from "~/utils/browser";
import type {DateRange, DateRangeFilter} from "~/types/date";
import type {TablePaginateInterface} from "~/types/table";
import dayjs from "dayjs";
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {ColumnDef} from '@tanstack/vue-table'
import {UCheckbox} from '#components';

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Statistiques de présence par membre'
})

// Types
interface MemberPresenceStat {
  memberId: string;
  memberUuid: string;
  presenceCount: number;
  lastPresenceDate: string;
  firstname: string;
  lastname: string;
  licence: string;
}

// Stores
const metricStore = useMetricStore()
const selfStore = useSelfUserStore()

const {
  dateRange,
  lastRefreshDate
} = storeToRefs(metricStore)

// Query
const metricQuery = new MetricQuery();

// State
const isAdmin = selfStore.isAdmin();
const isLoading = ref(false);
const items = ref<MemberPresenceStat[]>([]);
const totalItems = ref(0);
const page = ref(1);
const itemsPerPage = ref(10);
const order = ref('ASC');
const popoverOpen = ref(false);
const selectedMembers = ref<MemberPresenceStat[]>([]);

const columns: ColumnDef<MemberPresenceStat>[] = [
  {
    accessorKey: 'select',
    header: () => h(UCheckbox, {
      modelValue: someMembersSelectedInPage()
        ? 'indeterminate'
        : allMembersSelectedInPage(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
        if (value) {
          // Select all members in current page
          const uuidsAlreadySelected = selectedMembers.value.map(member => member.memberUuid)
          const newMembers = items.value.filter(member => !uuidsAlreadySelected.includes(member.memberUuid))
          selectedMembers.value = [...selectedMembers.value, ...newMembers]
        } else {
          // Only remove members in the current page
          const uuidsToRemove = items.value.map(member => member.memberUuid)
          selectedMembers.value = selectedMembers.value.filter(member => !uuidsToRemove.includes(member.memberUuid))
        }
      },
      disabled: items.value.length === 0
    }),
    cell: ({row}) => h(UCheckbox, {
      modelValue: selectedMembers.value.some(member => member.memberUuid === row.original.memberUuid),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
        if (value) {
          selectedMembers.value = [...selectedMembers.value, row.original]
        } else {
          selectedMembers.value = selectedMembers.value.filter(member => member.memberUuid !== row.original.memberUuid)
        }
      },
      key: row.original.memberUuid
    }),
    meta: {
      class: {
        th: 'print:hidden',
      }
    }
  },
  {
    accessorKey: 'licence',
    header: 'Licence',
  },
  {
    accessorKey: 'lastname',
    header: 'Nom',
  },
  {
    accessorKey: 'firstname',
    header: 'Prénom',
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
    header: 'Actions',
    meta: {
      class: {
        th: 'print:hidden text-right',
      }
    }
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

function someMembersSelectedInPage() {
  if (allMembersSelectedInPage()) return false;

  const uuidsToCheck = items.value.map(member => member.memberUuid)
  return selectedMembers.value.some(member => uuidsToCheck.includes(member.memberUuid))
}

function allMembersSelectedInPage() {
  const uuidsToCheck = items.value.map(member => member.memberUuid)
  return selectedMembers.value.filter(member => uuidsToCheck.includes(member.memberUuid)).length === items.value.length && items.value.length > 0
}

function sendEmailToSelected() {
  const memberUuids = selectedMembers.value.map(member => convertUuidToUrlUuid(member.memberUuid)).join(',')
  navigateTo(`/admin/email/new?members=${memberUuids}`)
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
                  :season-selectors="true"
                  :exclude-previous-season="true"
                  @range-updated="handleDateRangeUpdate"
                />
              </template>
            </UPopover>

            <UButton :disabled="isLoading" icon="i-heroicons-printer" @click="print()" />
        </div>
      </div>

       <UAlert
        icon="i-heroicons-information-circle"
        color="primary"
        variant="subtle"
        title="Information"
        description="Ces statistiques ne concernent que les membres licenciés dans la saison courante."
      />

      <GenericCardWithActions :title="`Membres (${totalItems})`">
        <template #actions>
          <div class="flex items-center gap-2">
            <USelect
              v-model="order"
              :items="[
                { label: 'Moins présents', value: 'ASC' },
                { label: 'Plus présents', value: 'DESC' }
              ]"
              @change="() => { page = 1; fetchMetrics() }"
            />
          </div>
        </template>

        <!-- Action bar for selected members -->
        <div v-if="selectedMembers.length > 0" class="mb-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-between print:hidden">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ selectedMembers.length }} membre{{ selectedMembers.length > 1 ? 's' : '' }} sélectionné{{ selectedMembers.length > 1 ? 's' : '' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="isAdmin"
              icon="i-heroicons-envelope"
              @click="sendEmailToSelected"
            >
              Envoyer un email
            </UButton>
          </div>
        </div>

        <UTable
          :loading="isLoading"
          :columns="columns"
          :data="items"
        >
           <template #lastPresenceDate-cell="{ row }">
             <p v-if="row.original.lastPresenceDate">
               {{ formatDateReadable(row.original.lastPresenceDate) }}
             </p>
             <i v-else>
               Aucune présences pour cette période
             </i>
           </template>

           <template #actions-cell="{ row }">
             <div class="flex gap-2 justify-end print:hidden">
               <UButton
                 :to="`/admin/members/${convertUuidToUrlUuid(row.original.memberUuid)}`">
                 Détail
               </UButton>

               <UButton
                 v-if="isAdmin"
                 icon="i-heroicons-envelope"
                 :to="`/admin/email/new?members=${convertUuidToUrlUuid(row.original.memberUuid)}`"
               />
             </div>
           </template>
        </UTable>

        <GenericTablePagination
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :total-items="totalItems"
          @paginate="onPaginate"
        />
      </GenericCardWithActions>
    </div>
  </div>
</template>
