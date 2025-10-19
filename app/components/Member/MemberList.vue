<script setup lang="ts">

import type {Member} from "~/types/api/item/clubDependent/member";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import {convertUuidToUrlUuid} from "~/utils/resource";
import {ClubRole, getAvailableClubRoles} from "~/types/api/item/club";
import {createBrowserCsvDownload} from "~/utils/browser";
import type {TablePaginateInterface} from "~/types/table";
import type {SelectApiItem} from "~/types/select";

const toast = useToast();
const isLoading = ref(true);
const isDownloadingCsv = ref(false)

const page = ref(1);
const itemsPerPage = ref(30);
const sort = ref({
  column: 'lastname',
  direction: 'asc'
});
const totalMembers: Ref<number> = ref(0);

const query = ref('');
const onlyCurrentSeason = ref(true);
const onlySeasonNotRenewed = ref(false);
const onlyPreviousSeason = ref(false);
const onlyWithLicence = ref(true);

const selectedRoles = ref([])
const rolesSelect = getAvailableClubRoles().map(item => {
  return {
    label: item.text,
    value: item.value
  }
}) as SelectApiItem[]


const members: Ref<Member[]> = ref([]);
const memberQuery = new MemberQuery();
const createMemberModal = ref(false)

getMembers();

const columns = [
  {
    accessorKey: 'licence',
    header: 'Licence'
  },
  {
    accessorKey: 'lastname',
    header: 'Nom',
    sortable: true
  },
  {
    accessorKey: 'firstname',
    header: 'Prénom'
  },
  {
    accessorKey: 'status',
    header: 'Statut'
  },
  {
    accessorKey: 'actions',
    header: 'Actions'
  }
]

function getUrlParams(): URLSearchParams {
  const urlParams = new URLSearchParams();
  urlParams.append('page', page.value.toString())
  urlParams.append('itemsPerPage', itemsPerPage.value.toString())

  urlParams.append(`order[${sort.value.column}]`, sort.value.direction);
  urlParams.append(`order[firstname]`, 'asc');

  if (query.value.trim().length > 0) {
    urlParams.append('multiple[licence, firstname, lastname, email, phone, mobilePhone]', query.value.trim())
  }

  if (selectedRoles.value.length > 0) {
    selectedRoles.value.forEach(value => {
      urlParams.append('userMember.role[]', value)
    })
  }

  if (onlyCurrentSeason.value) {
    urlParams.append('currentSeason[memberSeasons.season]', 'true');
  }

  if (onlyPreviousSeason.value) {
    urlParams.append('previousSeason[memberSeasons.season]', 'true');
  }

  if (onlySeasonNotRenewed.value) {
    urlParams.append('seasonNotRenewed[memberSeasons.season]', 'true');
  }

  if (onlyWithLicence.value) {
    urlParams.append('exists[licence]', 'true');
  }

  return urlParams
}

async function getMembers() {
  isLoading.value = true;

  const urlParams = getUrlParams()
  const { error, items, totalItems } = await memberQuery.getAll(urlParams);
  isLoading.value = false;

  if (error) {
    toast.add({
      color: "error",
      title: "Une erreur s'est produite",
      description: error.message || error.toString()
    })
    return
  }

  members.value = items
  if (totalItems) {
    totalMembers.value = totalItems
  } else {
    totalMembers.value = 0
  }
}

let inputTimer: NodeJS.Timeout;
function queryUpdated() {
  clearTimeout(inputTimer);
  inputTimer = setTimeout(async () => {
    page.value = 1;
    getMembers()
  }, 800);
}

function displayMemberPage(member: Member) {
  navigateTo(`/admin/members/${convertUuidToUrlUuid(member.uuid)}`)
}

async function downloadCsv() {
  isDownloadingCsv.value = true

  const urlParams = getUrlParams()
  const { data } = await memberQuery.getAllCsv(urlParams)

  isDownloadingCsv.value = false
  // We download in the browser
  createBrowserCsvDownload('members.csv', data)
}

</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-2">
        <div class="sm:col-span-5 grid grid-cols-1 sm:grid-cols-9 gap-2">
          <UFormField class="sm:col-span-5" label="Recherche">
            <UInput
              v-model="query"
              @update:model-value="queryUpdated()"
              placeholder="Rechercher..."  />
          </UFormField>

          <UFormField label="Rôle" class="sm:col-span-4">
            <USelect multiple v-model="selectedRoles" :items="rolesSelect" placeholder="Tous" @change="page = 1; getMembers()" />
          </UFormField>
        </div>

        <div class="sm:col-span-2"></div>

        <div class="sm:col-span-4 grid grid-cols-2 gap-2 gap-x-4">
          <UCheckbox label="Saison actuelle" v-model="onlyCurrentSeason" @change="onlySeasonNotRenewed = false; onlyPreviousSeason = false; page = 1; getMembers()" />
          <UCheckbox label="Non renouvelée" v-model="onlySeasonNotRenewed" @change="onlyCurrentSeason = false; page = 1; getMembers()" />
          <UCheckbox label="Saison précédente" v-model="onlyPreviousSeason" @change="onlyCurrentSeason = false; page = 1; getMembers()" />
          <UCheckbox label="Licence" v-model="onlyWithLicence" @change="page = 1; getMembers()" />
        </div>

        <div class="text-right">
          <UButton @click="downloadCsv()" icon="i-heroicons-arrow-down-tray" color="success" :loading="isDownloadingCsv">
            CSV
          </UButton>
        </div>
      </div>

    </UCard>

    <UCard>
      <div class="flex gap-2 flex-row flex-wrap">
        <div class="text-xl font-bold">Membres ({{ totalMembers }})</div>
        <div class="flex-1"></div>
        <div class="flex justify-end">
          <UButton @click="createMemberModal = true" icon="i-heroicons-plus"></UButton>
        </div>
      </div>

      <UTable
        :loading="isLoading"
        class="w-full"
        v-model:sort="sort"
        sort-mode="manual"
        @update:sort="getMembers()"
        :columns="columns"
        :data="members"
        @select="(evt) => displayMemberPage(evt.original)"
        :ui="{
          tr: 'cursor-pointer'
        }"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucun membres trouvés.</span>
          </div>
        </template>

        <template #status-cell="{ row }">
          <i v-if="!row.original.currentSeason">Saison non renouvelée</i>
          <p v-if="row.original.role && row.original.role !== ClubRole.Member">{{ getAvailableClubRoles().find((role) => role.value === row.original.role)?.text }}</p>
        </template>

        <template #actions-cell="{ row }">
          <UButton :to="`/admin/members/${convertUuidToUrlUuid(row.original.uuid)}`">Détail</UButton>
        </template>

      </UTable>

      <GenericTablePagination
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :total-items="totalMembers"
        @paginate="(object: TablePaginateInterface) => { getMembers() }"
      />
    </UCard>
  </div>

  <UModal
    v-model:open="createMemberModal">
    <template #content>
      <div>
        <UCard>
          <MemberForm
            @updated="(value) => {createMemberModal = false; displayMemberPage(value) }"
          />
        </UCard>
      </div>
    </template>
  </UModal>
</template>

<style scoped lang="css">

</style>
