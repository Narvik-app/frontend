<script setup lang="ts">
  import type { Member } from '~/types/api/item/clubDependent/member';
  import type { SelectApiItem } from '~/types/select';
  import { ClubRole, getAvailableClubRoles } from "~/types/api/item/club";
  import MemberQuery from '~/composables/api/query/clubDependent/MemberQuery';

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
      header: ''
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

  await getMembers()

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
      urlParams.append('currentSeason[memberSeasons.season]', 'true')
    }

    if (onlyPreviousSeason.value) {
      urlParams.append('previousSeason[memberSeasons.season]', 'true')
    }

    if (onlySeasonNotRenewed.value) {
      urlParams.append('seasonNotRenewed[memberSeasons.season]', 'true')
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
    const { error, items, totalItems } = await memberQuery.getAll(urlParams);

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
    const { error, items } = await memberQuery.getAll(urlParams)

    if (error) {
      toast.add({
        color: "error",
        title: "Une erreur s'est produite",
        description: error.message || error.toString()
      })
      return
    }

    emit('update:modelValue', items)
    emit('close')
  }

  function deselectAll() {
    emit('update:modelValue', [])
    emit('close')
  }

  let inputTimer: NodeJS.Timeout;
  function queryUpdated() {
    clearTimeout(inputTimer)
    inputTimer = setTimeout(async () => {
      page.value = 1
      getMembers()
    }, 800)
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

        <div class="sm:col-span-3"></div>

        <div class="sm:col-span-4 grid grid-cols-2 gap-2 gap-x-4">
          <UCheckbox label="Saison actuelle" v-model="onlyCurrentSeason" @change="onlySeasonNotRenewed = false; onlyPreviousSeason = false; page = 1; getMembers()" />
          <UCheckbox label="Non renouvelée" v-model="onlySeasonNotRenewed" @change="onlyCurrentSeason = false; page = 1; getMembers()" />
          <UCheckbox label="Saison précédente" v-model="onlyPreviousSeason" @change="onlyCurrentSeason = false; page = 1; getMembers()" />
          <UCheckbox label="Licence" v-model="onlyWithLicence" @change="page = 1; getMembers()" />
        </div>
      </div>
    </UCard>

    <UCard>
      <div class="flex flex-row flex-wrap gap-2">
        <div class="text-xl font-bold">Destinataires ({{ modelValue.length }})</div>
        <div class="flex-1"></div>
        <div class="flex justify-end" v-if="totalMembers > 0">
          <UButton v-if="modelValue.length < totalMembers" icon="i-heroicons-list-bullet" label="Tout sélectionner" @click="selectAll()" loading-auto />
          <UButton v-else label="Tout désélectionner" icon="i-heroicons-no-symbol" @click="deselectAll()" />
        </div>
      </div>

      <UTable
        class="w-full"
        v-model:sort="sort"
        sort-mode="manual"
        @update:sort="getMembers()"
        :columns="columns"
        :data="members"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucun membres trouvés.</span>
          </div>
        </template>

        <template #select-cell="{ row }">
          <UCheckbox
            :default-value="modelValue.some(member => member.email === row.original.email)"
            @update:model-value="selected => {
              if (selected) {
                emit('update:modelValue', [...modelValue, row.original])
              } else {
                const newArray = modelValue.filter(member => member.email !== row.original.email)
                emit('update:modelValue', newArray)
              }
            }"
          />
        </template>

        <template #status-cell="{ row }">
          <i v-if="!row.original.currentSeason">Saison non renouvelée</i>
          <p v-if="row.original.role && row.original.role !== ClubRole.Member">{{ getAvailableClubRoles().find((role) => role.value === row.original.role)?.text }}</p>
        </template>
      </UTable>
    </UCard>
  </div>
</template>