<script setup lang="ts">
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import type {PropType} from "vue";
import type {ExternalPresence} from "~/types/api/item/clubDependent/plugin/presence/externalPresence";
import {formatDateReadable} from "~/utils/date";
import type {TablePaginateInterface} from "~/types/table";
import type {TableRow} from "#ui/types";
import type {ColumnSort} from "@tanstack/table-core";

const props = defineProps({
  presences: {
    type: Object as PropType<MemberPresence[]|ExternalPresence[]>,
    required: true
  },
  totalPresences: {
    type: Number,
    required: true
  },

  accentColor: {
    type: String,
    default: 'primary'
  },
  isExternalPresences: {
    type: Boolean,
    default: false
  },
  canSort: {
    type: Boolean,
    default: true
  },
  displayFullDate: {
    type: Boolean,
    default: true
  },
  hasPagination: {
    type: Boolean,
    default: true
  },
  displayNoDataRegister: {
    type: Boolean,
    default: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
})

const emit = defineEmits<{
  register: [],
  rowClicked: [TableRow<ExternalPresence|MemberPresence>],
  sort: [ColumnSort],
  paginate: [TablePaginateInterface],
}>()

const page = ref(1);
const itemsPerPage = ref(10);

const sort = ref([{
  id: 'date',
  desc: true,

}] as ColumnSort[]);

const columns = [
  {
    accessorKey: 'date',
    header: props.displayFullDate ? 'Date' : 'Heure'
  },
  {
    accessorKey: 'licence',
    header: 'Licence',
    meta: {
      class: {
        th: 'w-24',
      }
    }
  }, {
    accessorKey: 'fullName',
    header: 'Nom',
    meta: {
      class: {
        th: 'w-1/4',
      }
    }
  }, {
    accessorKey: 'activities',
    header: 'Activités',
    meta: {
      class: {
        th: 'w-full',
      }
    }
  }
]

function rowClicked(row: TableRow<ExternalPresence|MemberPresence>) {
  if (!props.isExternalPresences && !row.original.member) {
    return;
  }
  emit('rowClicked', row)
}

function sortClicked() {
  if (props.canSort) {
    emit('sort', sort.value)
  }
}

</script>

<template>
  <UTable
    v-model:sorting="sort"
    :loading="props.isLoading"
    class="w-full"
    :sorting-options="{
      manualSorting: true,
      enableMultiSort: false,
    }"
    :columns="columns"
    :data="props.presences"
    :ui="{
      tr: 'cursor-pointer'
    }"
    @update:sorting="sortClicked()"
    @select="(evt, row) => rowClicked(row)"
  >
    <template #empty>
      <div class="flex flex-col items-center justify-center py-6 gap-3">
        <span class="italic text-sm">Aucune présences enregistrée.</span>
        <UButton v-if="props.displayNoDataRegister" class="mt-4" label="S'enregistrer" @click="emit('register')"/>
      </div>
    </template>

    <template v-if="props.displayFullDate" #date-header="{ column }">
      <GenericTableSortButton :column="column" />
    </template>
    <template #date-cell="{ row }">
      <template v-if="props.displayFullDate">
        {{ formatDateReadable(row.original.date) }} à {{ formatTimeReadable(row.original.createdAt) }}
      </template>
      <template v-else>
        {{ formatTimeReadable(row.original.createdAt) }}
      </template>
    </template>

    <template #licence-cell="{ row }">
      <template v-if="props.isExternalPresences">
        {{ row.original.licence }}
      </template>
      <template v-else>
        {{ row.original.member?.licence }}
      </template>
    </template>

    <template #fullName-cell="{ row }">
      <template v-if="props.isExternalPresences">
        {{ row.original.fullName }}
      </template>
      <template v-else>
        <div v-if="row.original.member" class="flex flex-wrap gap-2">
          <UBadge
v-if="row.original.member.currentSeason && row.original.member.currentSeason.isSecondaryClub"
            variant="subtle"
            color="success">
            Club secondaire
          </UBadge>

          <p class="inline-flex items-center w-full">{{ row.original.member.fullName }}</p>
        </div>
        <p v-else class="italic">Membre supprimé</p>
      </template>
    </template>

    <template #activities-cell="{ row }">
      <div class="flex flex-1 flex-wrap gap-2">
        <template v-if="!props.isExternalPresences && row.original.member">
          <div v-if="row.original.member.blacklisted" class="basis-full">
            <UButton
              color="neutral">
              Blacklisté
            </UButton>
          </div>

          <div v-if="!row.original.member.currentSeason" class="basis-full">
            <UButton
                color="error"
            >
              Saison non renouvelée
            </UButton>
          </div>

          <div v-if="row.original.member.medicalCertificateExpiration && row.original.member.medicalCertificateStatus !== 'valid'" class="basis-full">
            <UButton
              :color="row.original.member.medicalCertificateStatus === 'expired' ? 'error' : 'warning'"
            >
              Certificat médical : {{ formatDateReadable(row.original.member.medicalCertificateExpiration.toString()) }}
            </UButton>
          </div>

          <div
v-if="new Date((new Date()).setFullYear((new Date().getFullYear() - 1))) > new Date(row.original.member.lastControlShooting)"
               class="basis-full">
            <UButton
                color="error"
            >
              Dernier contrôle : {{ formatDateReadable(row.original.member.lastControlShooting) }}
            </UButton>
          </div>
        </template>

        <div v-if="row.original.activities.length == 0">
          <i>Aucune activités déclarées</i>
        </div>
        <UButton
v-for="activity in row.original.activities.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))"
          v-else
          :key="activity.uuid"
          :color="props.accentColor"
          :variant="props.isExternalPresences ? 'solid' : 'soft'"
        >
          {{ activity.name }}
        </UButton>
      </div>
    </template>

  </UTable>

  <GenericTablePagination
v-if="props.hasPagination"
    v-model:page="page"
    v-model:items-per-page="itemsPerPage"
    :total-items="props.totalPresences"
    @paginate="(object: TablePaginateInterface) => { emit('paginate', object) }"
  />
</template>

<style scoped lang="css">

</style>
