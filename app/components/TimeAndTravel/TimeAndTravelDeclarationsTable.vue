<script setup lang="ts">
import type {PropType} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {TimeAndTravelSummaryRow} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelSummary'
import MemberTimeAndTravelDeclarationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberTimeAndTravelDeclarationQuery'
import TimeAndTravelDeclarationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelDeclarationQuery'
import {appendDateRangeParams, declarationIsEditable, formatTrajet, vehicleDisplayName} from '~/utils/timeAndTravel'
import {formatMonetary} from '~/utils/string'
import {formatDateRangeReadable, formatDateReadable} from '~/utils/date'
import {convertUuidToUrlUuid, displayApiError} from '~/utils/resource'
import {createBrowserCsvDownload} from '~/utils/browser'
import {usePaginationValues} from '~/composables/api/list'
import type {TablePaginateInterface} from '~/types/table'
import {useTimeAndTravelStore} from '~/stores/useTimeAndTravelStore'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'

const props = defineProps({
  // When set, the table is scoped to this member (personal board / member drill-down): no member
  // column/search/CSV export, and totals come from the member's own summary endpoint. When unset,
  // it lists every member's declarations (admin board).
  member: {
    type: Object as PropType<Member>,
    required: false,
    default: undefined,
  },
  canEdit: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits<{
  create: []
  edit: [declaration: TimeAndTravelDeclaration]
}>()

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const isAllMembers = computed(() => !props.member)
const declarationQuery = computed(() => props.member ? new MemberTimeAndTravelDeclarationQuery(props.member) : new TimeAndTravelDeclarationQuery())

const declarations = ref<TimeAndTravelDeclaration[]>([])
const totalItems = ref(0)
const isLoading = ref(true)
const isDownloadingCsv = ref(false)
const page = ref(1)
const perPage = ref(isAllMembers.value ? usePaginationValues[1] : usePaginationValues[0])

const searchQuery = ref('')
// Shared with the other time-and-travel boards: one date range, kept in sync.
const timeAndTravelStore = useTimeAndTravelStore()
const {selectedRange} = storeToRefs(timeAndTravelStore)
const dateRangePopoverOpen = ref(false)

const emptySummary = (): TimeAndTravelSummaryRow => ({declarationCount: 0, totalKilometers: 0, totalHours: 0, totalAmount: 0})
const summary = ref<TimeAndTravelSummaryRow>(emptySummary())

const columns = computed(() => [
  {accessorKey: 'date', header: 'Date'},
  isAllMembers.value
    ? {accessorKey: 'member', header: 'Membre'}
    : {accessorKey: 'description', header: 'Motif', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'trajet', header: 'Trajet', meta: isAllMembers.value ? {class: {th: 'w-full'}} : undefined},
  {accessorKey: 'kilometers', header: 'Km'},
  {accessorKey: 'hours', header: 'Heures'},
  {accessorKey: 'vehicle', header: 'Véhicule'},
  {accessorKey: 'totalAmount', header: 'Montant'},
  {accessorKey: 'status', header: 'Statut'},
  {accessorKey: 'actions', header: ''},
])

function buildFilterParams(): URLSearchParams {
  const p = new URLSearchParams()
  if (isAllMembers.value && searchQuery.value) {
    p.append('multiple[member.firstname, member.lastname, member.licence]', searchQuery.value)
  }
  appendDateRangeParams(p, selectedRange.value)
  return p
}

async function loadDeclarations() {
  isLoading.value = true
  const p = buildFilterParams()
  p.set('pagination', '1')
  p.set('page', page.value.toString())
  p.set('itemsPerPage', perPage.value.toString())
  p.append('order[date]', 'desc')

  const {items, totalItems: total, error} = await declarationQuery.value.getAll(p)
  if (error) {
    displayApiError(error)
  } else {
    declarations.value = items
    totalItems.value = total ?? 0
  }
  isLoading.value = false
}

/** Sums the per-member summary endpoint's rows, or the single-row personal summary — same shape either way. */
function sumRows(rows: TimeAndTravelSummaryRow[]): TimeAndTravelSummaryRow {
  return rows.reduce((acc, row) => ({
    declarationCount: acc.declarationCount + row.declarationCount,
    totalKilometers: acc.totalKilometers + row.totalKilometers,
    totalHours: acc.totalHours + row.totalHours,
    totalAmount: acc.totalAmount + row.totalAmount,
  }), emptySummary())
}

async function loadSummary() {
  const p = buildFilterParams()
  const query = declarationQuery.value
  const {items} = query instanceof MemberTimeAndTravelDeclarationQuery ? await query.summary(p) : await query.summaryPerMember(p)
  summary.value = sumRows(items)
}

function refresh() {
  page.value = 1
  loadDeclarations()
  loadSummary()
}

watch([searchQuery, selectedRange], refresh)

function getMemberName(declaration: TimeAndTravelDeclaration): string {
  return typeof declaration.member === 'object' ? declaration.member?.fullName ?? '-' : '-'
}

function getMemberUuid(declaration: TimeAndTravelDeclaration): string | undefined {
  return typeof declaration.member === 'object' ? declaration.member?.uuid : undefined
}

async function downloadCsv() {
  isDownloadingCsv.value = true
  const {data, error} = await declarationQuery.value.getAllCsv(buildFilterParams())
  isDownloadingCsv.value = false
  if (error || !data) return
  createBrowserCsvDownload('declarations.csv', data)
}

async function onDelete(declaration: TimeAndTravelDeclaration) {
  const {error} = await declarationQuery.value.delete(declaration)
  if (error) {
    displayApiError(error, 'Suppression impossible')
    return
  }
  toast.add({title: 'Déclaration supprimée'})
  refresh()
}

loadDeclarations()
loadSummary()

defineExpose({refresh})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap justify-center">
      <UPopover v-model:open="dateRangePopoverOpen">
        <UButton icon="i-heroicons-calendar-days-20-solid" :label="selectedRange ? formatDateRangeReadable(selectedRange) || 'Choisir une plage' : 'Choisir une plage'" />
        <template #content>
          <GenericDateRangePicker :date-range="selectedRange" :season-selectors="true" :exclude-previous-season="true" @range-updated="(range) => { dateRangePopoverOpen = false; selectedRange = range }" />
        </template>
      </UPopover>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <GenericStatCard title="Déclarations" :value="summary.declarationCount" />
      <GenericStatCard title="Kilomètres" :value="summary.totalKilometers" />
      <GenericStatCard title="Heures" :value="summary.totalHours" />
      <GenericStatCard title="Montant valorisé" :value="formatMonetary(summary.totalAmount)" />
    </div>

    <UCard>
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <template v-if="isAllMembers">
          <UInput v-model="searchQuery" placeholder="Rechercher un membre" icon="i-heroicons-magnifying-glass" class="flex-1" />
          <UButton icon="i-heroicons-arrow-down-tray" color="success" variant="soft" :loading="isDownloadingCsv" @click="downloadCsv">
            Export CSV
          </UButton>
        </template>
        <div v-else class="text-xl font-bold">Déclarations de temps & kilomètres</div>
        <UButton v-if="canEdit" icon="i-heroicons-plus" @click="emit('create')">
          Nouvelle déclaration
        </UButton>
      </div>

      <UTable :loading="isLoading" :columns="columns" :data="declarations">
        <template #empty>
          <div class="py-6 text-center italic text-sm">Aucune déclaration.</div>
        </template>
        <template #date-cell="{ row }">{{ formatDateReadable(row.original.date) }}</template>
        <template #member-cell="{ row }">
          <ULink :to="`/admin/members/${convertUuidToUrlUuid(getMemberUuid(row.original))}`">
            {{ getMemberName(row.original) }}
          </ULink>
        </template>
        <template #trajet-cell="{ row }">{{ formatTrajet(row.original) }}</template>
        <template #kilometers-cell="{ row }">{{ row.original.kilometers }}</template>
        <template #vehicle-cell="{ row }">{{ vehicleDisplayName(row.original.memberVehicle) }}</template>
        <template #totalAmount-cell="{ row }">{{ formatMonetary(row.original.totalAmount) }}</template>
        <template #status-cell="{ row }">
          <UBadge v-if="row.original.isLocked" color="success" variant="soft" size="xs">Verrouillée</UBadge>
          <UBadge v-else color="neutral" variant="soft" size="xs">Déclarée</UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div v-if="canEdit && declarationIsEditable(row.original)" class="flex gap-2 justify-end">
            <UButton icon="i-heroicons-pencil" color="neutral" variant="ghost" @click="emit('edit', row.original)" />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              @click="overlayDeleteConfirmation.open({
                alertTitle: 'La suppression de la déclaration sera définitive.',
                alertColor: 'error',
                async onDelete() {
                  await onDelete(row.original)
                  overlayDeleteConfirmation.close(true)
                }
              })"
            />
          </div>
        </template>
      </UTable>

      <GenericTablePagination
        v-model:page="page"
        v-model:items-per-page="perPage"
        :total-items="totalItems"
        @paginate="(_: TablePaginateInterface) => loadDeclarations()"
      />
    </UCard>
  </div>
</template>
