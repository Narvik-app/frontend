<script setup lang="ts">
import TimeAndTravelDeclarationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelDeclarationQuery'
import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {TimeAndTravelSummaryRow} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelSummary'
import type {Member} from '~/types/api/item/clubDependent/member'
import {appendDateRangeParams, declarationIsEditable, formatAmount, formatTrajet, vehicleDisplayName} from '~/utils/timeAndTravel'
import {formatDateRangeReadable, formatDateReadable} from '~/utils/date'
import {convertUuidToUrlUuid} from '~/utils/resource'
import {createBrowserCsvDownload} from '~/utils/browser'
import {usePaginationValues} from '~/composables/api/list'
import type {TablePaginateInterface} from '~/types/table'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {useTimeAndTravelStore} from '~/stores/useTimeAndTravelStore'
import {Permission} from '~/types/api/permissions'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'

definePageMeta({layout: 'time-and-travel'})
useHead({title: 'Déclarations'})

const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.TimeAndTravelEdit))

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const declarationQuery = new TimeAndTravelDeclarationQuery()
const declarationModalOpen = ref(false)
const newDeclarationMember = ref<Member | undefined>()
const selectedDeclaration = ref<TimeAndTravelDeclaration | undefined>()
const selectedDeclarationMember = ref<Member | undefined>()

function onCreate() {
  newDeclarationMember.value = undefined
  selectedDeclaration.value = undefined
  selectedDeclarationMember.value = undefined
  declarationModalOpen.value = true
}

function onEdit(declaration: TimeAndTravelDeclaration) {
  selectedDeclaration.value = {...declaration}
  selectedDeclarationMember.value = typeof declaration.member === 'object' ? declaration.member : undefined
  newDeclarationMember.value = undefined
  declarationModalOpen.value = true
}

function onDeclarationCreated() {
  declarationModalOpen.value = false
  newDeclarationMember.value = undefined
  selectedDeclaration.value = undefined
  selectedDeclarationMember.value = undefined
  refresh()
}

async function onDelete(declaration: TimeAndTravelDeclaration) {
  const {error} = await declarationQuery.delete(declaration)
  if (error) {
    toast.add({color: 'error', title: 'Suppression impossible', description: error.message})
    return
  }
  toast.add({title: 'Déclaration supprimée'})
  refresh()
}

const declarations = ref<TimeAndTravelDeclaration[]>([])
const totalItems = ref(0)
const isLoading = ref(true)
const isDownloadingCsv = ref(false)
const page = ref(1)
const perPage = ref(usePaginationValues[1])

const searchQuery = ref('')
// Shared with the personal board and the member detail drill-down: one date range, kept in sync.
const timeAndTravelStore = useTimeAndTravelStore()
const {selectedRange} = storeToRefs(timeAndTravelStore)
const dateRangePopoverOpen = ref(false)

const totals = ref<TimeAndTravelSummaryRow[]>([])

const columns = [
  {accessorKey: 'date', header: 'Date'},
  {accessorKey: 'member', header: 'Membre'},
  {accessorKey: 'trajet', header: 'Trajet', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'kilometers', header: 'Km'},
  {accessorKey: 'hours', header: 'Heures'},
  {accessorKey: 'vehicle', header: 'Véhicule'},
  {accessorKey: 'totalAmount', header: 'Montant'},
  {accessorKey: 'status', header: 'Statut'},
  {accessorKey: 'actions', header: ''},
]

function buildFilterParams(): URLSearchParams {
  const p = new URLSearchParams()
  if (searchQuery.value) {
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

  const {items, totalItems: total} = await declarationQuery.getAll(p)
  declarations.value = items
  totalItems.value = total ?? 0
  isLoading.value = false
}

async function loadTotals() {
  const p = buildFilterParams()
  const {items} = await declarationQuery.summaryPerMember(p)
  totals.value = items
}

const grandTotal = computed(() => {
  return totals.value.reduce((acc, row) => ({
    declarationCount: acc.declarationCount + row.declarationCount,
    totalKilometers: acc.totalKilometers + row.totalKilometers,
    totalHours: acc.totalHours + row.totalHours,
    totalAmount: acc.totalAmount + row.totalAmount,
  }), {declarationCount: 0, totalKilometers: 0, totalHours: 0, totalAmount: 0})
})

function refresh() {
  page.value = 1
  loadDeclarations()
  loadTotals()
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
  const {data, error} = await declarationQuery.getAllCsv(buildFilterParams())
  isDownloadingCsv.value = false
  if (error || !data) return
  createBrowserCsvDownload('declarations.csv', data)
}

loadDeclarations()
loadTotals()
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
      <GenericStatCard title="Déclarations" :value="grandTotal.declarationCount" />
      <GenericStatCard title="Kilomètres" :value="grandTotal.totalKilometers" />
      <GenericStatCard title="Heures" :value="grandTotal.totalHours" />
      <GenericStatCard title="Montant valorisé" :value="formatAmount(grandTotal.totalAmount)" />
    </div>

    <UCard>
      <div class="flex flex-col md:flex-row gap-4 mb-4">
        <UInput v-model="searchQuery" placeholder="Rechercher un membre" icon="i-heroicons-magnifying-glass" class="flex-1" />

        <UButton icon="i-heroicons-arrow-down-tray" color="success" variant="soft" :loading="isDownloadingCsv" @click="downloadCsv">
          Export CSV
        </UButton>

        <UButton v-if="canEdit" icon="i-heroicons-plus" @click="onCreate">
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
        <template #totalAmount-cell="{ row }">{{ formatAmount(row.original.totalAmount) }}</template>
        <template #status-cell="{ row }">
          <UBadge v-if="row.original.isLocked" color="success" variant="soft" size="xs">Verrouillée</UBadge>
          <UBadge v-else color="neutral" variant="soft" size="xs">Déclarée</UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div v-if="canEdit && declarationIsEditable(row.original)" class="flex gap-2 justify-end">
            <UButton icon="i-heroicons-pencil" color="neutral" variant="ghost" @click="onEdit(row.original)" />
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

  <UModal v-model:open="declarationModalOpen">
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <GenericMemberPicker v-if="!selectedDeclaration" v-model="newDeclarationMember" label="Membre" />
          <TimeAndTravelDeclarationForm
            v-if="selectedDeclaration ? selectedDeclarationMember : newDeclarationMember"
            :item="selectedDeclaration"
            :member="(selectedDeclaration ? selectedDeclarationMember : newDeclarationMember)!"
            @updated="onDeclarationCreated"
            @canceled="declarationModalOpen = false"
          />
        </div>
      </UCard>
    </template>
  </UModal>
</template>
