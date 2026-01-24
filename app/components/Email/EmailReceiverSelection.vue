<script setup lang="ts">
import type {Member} from '~/types/api/item/clubDependent/member';
import type {SelectApiItem} from '~/types/select';
import type {TablePaginateInterface} from "~/types/table";
import {ClubRole, getAvailableClubRoles} from "~/types/api/item/club";
import MemberQuery from '~/composables/api/query/clubDependent/MemberQuery';
import {UCheckbox} from '#components';
import type {TableRow} from '@nuxt/ui'

const props = defineProps({
    "newsletterEnabled": {
      type: Boolean,
      required: true
    },
    modelValue: {
      type: Object as PropType<Member[]>,
      required: true
    }
  })

  const emit = defineEmits(["update:modelValue", "close"])
  const toast = useToast()

  const isLoading = ref(true);
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

  const columns = [
    {
      accessorKey: 'select',
      header: ({table: _table}) => h(UCheckbox, {
        modelValue: someMembersSelectedInPage()
        ? 'indeterminate'
        : allMembersSelectedInPage(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          if (value) {
            // Select all members
            const newMembers: Member[] = []
            const emailsAlreadySelected = props.modelValue.map(member => member.email)

            members.value.forEach(member => {
              if (!emailsAlreadySelected.includes(member.email)) {
                newMembers.push(member)
              }
            })

            emit('update:modelValue', [...props.modelValue, ...newMembers])
          } else {
            // Only remove members in the current page
            const emailsToRemove = members.value.map(member => member.email)
            const updatedList = props.modelValue.filter(member => !emailsToRemove.includes(member.email))
            emit('update:modelValue', updatedList)
          }
        },
        disabled: members.value.length === 0
      }),
      cell: ({row}) => h(UCheckbox, {
        modelValue: props.modelValue.some(member => member.email === row.original.email),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => {
          if (value) {
            emit('update:modelValue', [...props.modelValue, row.original])
          } else {
            emit('update:modelValue', props.modelValue.filter(member => member.email !== row.original.email))
          }
        },
        key: row.original.uuid
      })
    },
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
    }
  ]

  function onSelect(row: TableRow<Member>, _e?: Event) {
    const foundMember = props.modelValue.some(member => member.email === row.original.email)
    if (!foundMember) {
      emit('update:modelValue', [...props.modelValue, row.original])
    } else {
      emit('update:modelValue', props.modelValue.filter(member => member.email !== row.original.email))
    }
  }

  function getUrlParams(paginationEnabled = true): URLSearchParams {
    const urlParams = new URLSearchParams()

    if (paginationEnabled) {
      urlParams.append('page', page.value.toString())
      urlParams.append('itemsPerPage', itemsPerPage.value.toString())
    }
    urlParams.append('exists[email]', 'true')
    urlParams.append(`order[${sort.value.column}]`, sort.value.direction)
    urlParams.append(`order[firstname]`, 'asc')

    if (query.value.trim().length > 0) {
      urlParams.append('multiple[licence, firstname, lastname, email, phone, mobilePhone]', query.value.trim())
    }

    if (selectedRoles.value.length > 0) {
      selectedRoles.value.forEach(value => {
        urlParams.append('userMember.role[]', value)
      })
    }

    if (onlyCurrentSeason.value) {
      urlParams.append('current-season[memberSeasons.season]', 'true')
    }

    if (onlyPreviousSeason.value) {
      urlParams.append('previous-season[memberSeasons.season]', 'true')
    }

    if (onlySeasonNotRenewed.value) {
      urlParams.append('season-not-renewed[memberSeasons.season]', 'true')
    }

    if (onlyWithLicence.value) {
      urlParams.append('exists[licence]', 'true')
    }

    if (props.newsletterEnabled) {
      urlParams.append('clubNewsletter', 'true')
    }

    return urlParams
  }

  async function getMembers() {
    const urlParams = getUrlParams()

    isLoading.value = true
    const { error, items, totalItems } = await memberQuery.getAll(urlParams);
    isLoading.value = false

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

  async function selectAll() {
    const urlParams = getUrlParams(false)
    const results = await memberQuery.getAllWithoutPagination(urlParams)

    if (!results) {
      toast.add({
        color: "error",
        title: "Une erreur s'est produite",
        description: "Impossible de sélectionner tous les destinataires"
      })
      return
    }

    emit('update:modelValue', results)
    emit('close')
  }

  function unselectAll() {
    emit('update:modelValue', [])
  }

  function someMembersSelectedInPage() {
    if (allMembersSelectedInPage()) return false;

    const emailsToCheck = members.value.map(member => member.email)
    return props.modelValue.some(member => emailsToCheck.includes(member.email))
  }

  function allMembersSelectedInPage() {
    const emailsToCheck = members.value.map(member => member.email)
    let count = 0

    props.modelValue.forEach(member => {
      if (emailsToCheck.includes(member.email)) count++;
    })

    return count === itemsPerPage.value
  }

  let inputTimer: NodeJS.Timeout;
  function queryUpdated() {
    clearTimeout(inputTimer)
    inputTimer = setTimeout(async () => {
      page.value = 1
      await getMembers()
    }, 800)
  }

  getMembers()
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-2">
        <div class="sm:col-span-5 grid grid-cols-1 sm:grid-cols-9 gap-2">
          <UFormField class="sm:col-span-5" label="Recherche">
            <UInput
              v-model="query"
              placeholder="Rechercher..."
              @update:model-value="queryUpdated()"  />
          </UFormField>

          <UFormField label="Rôle" class="sm:col-span-4">
            <USelect v-model="selectedRoles" multiple :items="rolesSelect" placeholder="Tous" @change="page = 1; getMembers()" />
          </UFormField>
        </div>

        <div class="sm:col-span-3"/>

        <div class="sm:col-span-4 grid grid-cols-2 gap-2 gap-x-4">
          <UCheckbox v-model="onlyCurrentSeason" label="Saison actuelle" @change="onlySeasonNotRenewed = false; onlyPreviousSeason = false; page = 1; getMembers()" />
          <UCheckbox v-model="onlySeasonNotRenewed" label="Non renouvelée" @change="onlyCurrentSeason = false; page = 1; getMembers()" />
          <UCheckbox v-model="onlyPreviousSeason" label="Saison précédente" @change="onlyCurrentSeason = false; page = 1; getMembers()" />
          <UCheckbox v-model="onlyWithLicence" label="Licence" @change="page = 1; getMembers()" />
          <span/>
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="flex flex-row flex-wrap gap-2">
        <div class="text-xl font-bold">Destinataires ({{ modelValue.length }})</div>
        <div class="flex-1"/>
        <div v-if="totalMembers > 0" class="flex justify-end">
          <UButton v-if="modelValue.length < totalMembers" icon="i-heroicons-list-bullet" label="Tout sélectionner" loading-auto @click="selectAll()" />
          <UButton v-else label="Tout désélectionner" icon="i-heroicons-no-symbol" @click="unselectAll()" />
        </div>
      </div>

      <UTable
        v-model:sort="sort"
        class="w-full"
        sort-mode="manual"
        :columns="columns"
        :loading="isLoading"
        :data="members"
        @update:sort="getMembers()"
        @select="(evt, row) => onSelect(row, evt)"
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
      </UTable>

      <GenericTablePagination
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :total-items="totalMembers"
        @paginate="(object: TablePaginateInterface) => { getMembers() }"
      />

      <div class="text-right">
        <UButton @click="emit('close')">Sauvegarder</UButton>
      </div>
    </UCard>
  </div>
</template>
