<script setup lang="ts">
import {usePresenceStore} from "~/stores/usePresenceStore";
import type {ExternalPresence} from "~/types/api/item/clubDependent/plugin/presence/externalPresence";
import ExternalPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/ExternalPresenceQuery";
import {formatDateInput} from "~/utils/date";
import type {TablePaginateInterface} from "~/types/table";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {createBrowserCsvDownload} from "~/utils/browser";
import type {TableRow} from "#ui/types";
import type {ColumnSort} from "@tanstack/table-core";
import {getTableSortVal} from "~/utils/table";

const props = defineProps({
    listOnly: {
      type: Boolean,
      required: false,
      default: true
    },
  });

  const toast = useToast();



  const isLoading = ref(true);
  const isDownloadingCsv = ref(false)

  const presenceStore = usePresenceStore()
  const selfStore = useSelfUserStore()

  const { selectedRange, searchQuery, selectedActivities } = storeToRefs(presenceStore)

  const isAdmin = selfStore.isAdmin()

  const selectedExternalPresence: Ref<ExternalPresence | undefined> = ref(undefined)
  const modalOpen: Ref<boolean> = ref(false);

  const page = ref(1);
  const itemsPerPage = ref(10);
  const sort = ref({
    column: 'date',
    direction: 'desc'
  });

  const presences: Ref<ExternalPresence[]> = ref([])
  const presenceQuery = new ExternalPresenceQuery()

  getPresences();

  watch([searchQuery, selectedRange, selectedActivities], (_value) => {
    page.value = 1
    getPresences()
  })

  function getPresences() {
    isLoading.value = true;

    const urlParams = new URLSearchParams({
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString(),
    });

    if (sort.value.length > 0) {
      sort.value.forEach((value) => {
        urlParams.append(`order[${value.id}]`, getTableSortVal(value))
      })
    }

    if (selectedRange.value) {
      if (typeof selectedRange.value.value === 'string') {
        urlParams.append(`${selectedRange.value.value}[date]`, 'true');
      } else {
        const formattedStartDate = formatDateInput(selectedRange.value.start.toString())
        const formattedEndDate = formatDateInput(selectedRange.value.end.toString())
        if (formattedStartDate) {
          urlParams.append(`date[after]`, formattedStartDate);

          if (formattedEndDate) {
            urlParams.append(`date[before]`, formattedEndDate);
          } else {
            urlParams.append(`date[before]`, formattedStartDate);
          }
        }
      }
    }

    if (searchQuery.value) {
      urlParams.append(`multiple[firstname, lastname, licence]`, searchQuery.value);
    }

    if (selectedActivities.value.length > 0) {
      selectedActivities.value.forEach(filteredActivity => {
        if (!filteredActivity.value) return;
        urlParams.append('activities.uuid[]', filteredActivity.value)
      })
    }

    presenceQuery.getAll(urlParams).then(value => {
      isLoading.value = false;

      if (value.error) {
        toast.add({
          color: "error",
          title: "Une erreur s'est produite",
          description: value.error.message || value.error.toString()
        })
        return;
      }

      if (value.items) {
        presences.value = value.items
        presenceStore.totalExternal = value.totalItems || 0
      }
    });
  }

  function rowClicked(row: TableRow<ExternalPresence>) {
    if (props.listOnly) return;

    selectedExternalPresence.value = row.original
    modalOpen.value = true
  }

  function externalPresenceUpdated(_externalPresence: ExternalPresence) {
    getPresences()
  }

  async function downloadCsv() {
    isDownloadingCsv.value = true

    const urlParams = new URLSearchParams({
      pagination: 'false',
    });

    urlParams.append(`order[${sort.value.column}]`, sort.value.direction);

    if (selectedRange.value) {
      if (typeof selectedRange.value === 'string') {
        urlParams.append(`${selectedRange.value.value}[date]`, 'true');
      } else {
        const formattedStartDate = formatDateInput(selectedRange.value.start.toString())
        const formattedEndDate = formatDateInput(selectedRange.value.end.toString())
        if (formattedStartDate) {
          urlParams.append(`date[after]`, formattedStartDate);

          if (formattedEndDate) {
            urlParams.append(`date[before]`, formattedEndDate);
          } else {
            urlParams.append(`date[before]`, formattedStartDate);
          }
        }
      }
    } else {
      isDownloadingCsv.value = false
      toast.add({
        color: "error",
        title: "Date non définie.",
        description: "Veuillez sélectionner une date afin de pouvoir télécharger le csv."
      })
      return;
    }

    if (searchQuery.value) {
      urlParams.append(`multiple[firstname, lastname, licence]`, searchQuery.value);
    }

    // We make the search
    const { data } = await presenceQuery.getAllCsv(urlParams)
    isDownloadingCsv.value = false
    createBrowserCsvDownload('external-presences.csv', data)
  }

</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-4">
      <div class="text-xl font-bold mb-4">Présences externe</div>

      <div class="flex-1"/>

      <template v-if="isAdmin">
        <UButton icon="i-heroicons-arrow-down-tray" color="success" :loading="isDownloadingCsv" :disabled="!selectedRange" @click="downloadCsv()">
          CSV
        </UButton>
      </template>
    </div>

    <PresenceTable
      :is-external-presences="true"
      :presences="presences"
      :total-presences="presenceStore.totalExternal"
      :can-sort="true"
      :display-no-data-register="false"
      :is-loading="isLoading"
      accent-color="warning"
      @row-clicked="rowClicked"
      @sort="(object: ColumnSort) => { sort = object; getPresences() }"
      @paginate="(object: TablePaginateInterface) => { page = object.page; itemsPerPage = object.itemsPerPage; getPresences() }"
    />

    <UModal
        v-model:open="modalOpen">
      <template #content>
        <div>
          <ExternalPresenceDetails
            v-if="selectedExternalPresence"
            :item="selectedExternalPresence"
            @updated="externalPresenceUpdated"
            @close="modalOpen = false; selectedExternalPresence = undefined"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped lang="css">

</style>
