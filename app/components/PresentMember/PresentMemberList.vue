<script setup lang="ts">
import {usePresenceStore} from "~/stores/usePresenceStore";
import {formatDateInput} from "~/utils/date";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {createBrowserCsvDownload} from "~/utils/browser";
import type {TablePaginateInterface} from "~/types/table";
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

  const selfStore = useSelfUserStore()
  const presenceStore = usePresenceStore()
  const { selectedRange, searchQuery, selectedActivities } = storeToRefs(presenceStore)

  const isAdmin = selfStore.isAdmin()

  const selectedPresence: Ref<MemberPresence | undefined> = ref(undefined)
  const modalOpen: Ref<boolean> = ref(false);

  const isDownloadingCsv = ref(false)

  const page = ref(1);
  const itemsPerPage = ref(10);
  const sort = ref([{
    id: 'date',
    desc: true,

  }] as ColumnSort[]);

  const presences: Ref<MemberPresence[]> = ref([])
  const presenceQuery = new MemberPresenceQuery()

  getPresences();

  watch([selectedRange, searchQuery, selectedActivities], (value) => {
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
      urlParams.append(`multiple[member.firstname, member.lastname, member.licence]`, searchQuery.value);
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
        presenceStore.totalMembers = value.totalItems || 0
      }
    });
  }

  function rowClicked(row: TableRow<MemberPresence>) {
    selectedPresence.value = row.original
    modalOpen.value = true
  }

  function presenceUpdated(presence?: MemberPresence) {
    if (!presence) modalOpen.value = false
    getPresences()
  }

  async function downloadCsv() {
    isDownloadingCsv.value = true

    const urlParams = new URLSearchParams({
      pagination: 'false',
    });

    urlParams.append(`order[${sort.value.column}]`, sort.value.direction);

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
      urlParams.append(`multiple[member.firstname, member.lastname, member.licence]`, searchQuery.value);
    }

    // We make the search
    const { data } = await presenceQuery.getAllCsv(urlParams)
    isDownloadingCsv.value = false
    createBrowserCsvDownload('presences.csv', data)
  }

</script>

<template>
  <div>

    <div class="flex flex-wrap items-center gap-4">
      <div class="text-xl font-bold mb-4">Présences membres ({{presenceStore.totalMembers}})</div>

      <div class="flex-1"/>

      <template v-if="isAdmin">
        <UButton icon="i-heroicons-arrow-down-tray" color="success" :loading="isDownloadingCsv" :disabled="!selectedRange" @click="downloadCsv()">
          CSV
        </UButton>
      </template>
    </div>

    <PresenceTable
      :presences="presences"
      :total-presences="presenceStore.totalMembers"
      :can-sort="true"
      :display-no-data-register="false"
      :is-loading="isLoading"
      @row-clicked="rowClicked"
      @sort="(object: ColumnSort) => { sort = object; getPresences() }"
      @paginate="(object: TablePaginateInterface) => { page = object.page; itemsPerPage = object.itemsPerPage; getPresences() }"
    />

    <UModal
        v-model:open="modalOpen"
        :ui="{
           content: 'bg-transparent dark:bg-transparent shadow-none ring-transparent',
        }"
    >
      <template #content>
        <div>
          <PresentMemberDetails
            v-if="selectedPresence"
            :view-only="props.listOnly"
            :item="selectedPresence"
            @updated="presenceUpdated"
            @close="modalOpen = false; selectedPresence = undefined"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped lang="css">

</style>
