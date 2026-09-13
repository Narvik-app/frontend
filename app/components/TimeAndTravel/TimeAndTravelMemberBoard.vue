<script setup lang="ts">
import type {PropType} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {TimeAndTravelSummaryRow} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelSummary'
import type {TimeAndTravelExportAttestation} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import MemberTimeAndTravelDeclarationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberTimeAndTravelDeclarationQuery'
import MemberTimeAndTravelAttestationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberTimeAndTravelAttestationQuery'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {useTimeAndTravelStore} from '~/stores/useTimeAndTravelStore'
import {Permission} from '~/types/api/permissions'
import {appendDateRangeParams, declarationIsEditable, downloadFilePdf, formatTrajet, vehicleDisplayName} from '~/utils/timeAndTravel'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'
import {displayApiError} from '~/utils/resource'
import {formatMonetary} from '~/utils/string'
import {formatDateRangeReadable, formatDateReadable} from '~/utils/date'
import type {TablePaginateInterface} from '~/types/table'
import {usePaginationValues} from '~/composables/api/list'

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: true,
  },
  self: {
    type: Boolean,
    required: false,
    default: false,
  },
  showVehicles: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const selfStore = useSelfUserStore()
const canEditOthers = selfStore.can(Permission.TimeAndTravelEdit)
const canEdit = computed(() => props.self || canEditOthers)

const declarationQuery = computed(() => new MemberTimeAndTravelDeclarationQuery(props.member))
const attestationQuery = computed(() => new MemberTimeAndTravelAttestationQuery(props.member))

const declarations = ref<TimeAndTravelDeclaration[]>([])
const totalItems = ref(0)
const isLoading = ref(true)
const page = ref(1)
const perPage = ref(usePaginationValues[0])

// Shared with the admin board and the member detail drill-down: one date range, kept in sync.
const timeAndTravelStore = useTimeAndTravelStore()
const {selectedRange} = storeToRefs(timeAndTravelStore)
const dateRangePopoverOpen = ref(false)

const summary = ref<TimeAndTravelSummaryRow | undefined>()
const attestations = ref<TimeAndTravelExportAttestation[]>([])
const isDownloading = ref<string | undefined>()

const declarationModalOpen = ref(false)
const selectedDeclaration = ref<TimeAndTravelDeclaration | undefined>()

const columns = [
  {accessorKey: 'date', header: 'Date'},
  {accessorKey: 'description', header: 'Motif', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'trajet', header: 'Trajet'},
  {accessorKey: 'kilometers', header: 'Km'},
  {accessorKey: 'hours', header: 'Heures'},
  {accessorKey: 'vehicle', header: 'Véhicule'},
  {accessorKey: 'totalAmount', header: 'Montant'},
  {accessorKey: 'status', header: 'Statut'},
  {accessorKey: 'actions', header: ''},
]

function buildFilterParams(): URLSearchParams {
  const p = new URLSearchParams()
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

async function loadSummary() {
  const {items} = await declarationQuery.value.summary(buildFilterParams())
  summary.value = items[0]
}

function refresh() {
  page.value = 1
  loadDeclarations()
  loadSummary()
}

watch(selectedRange, refresh)

async function loadAttestations() {
  const {items} = await attestationQuery.value.getAll()
  attestations.value = items
}

function onCreate() {
  selectedDeclaration.value = undefined
  declarationModalOpen.value = true
}

function onEdit(declaration: TimeAndTravelDeclaration) {
  selectedDeclaration.value = {...declaration}
  declarationModalOpen.value = true
}

function onUpdated() {
  declarationModalOpen.value = false
  selectedDeclaration.value = undefined
  loadDeclarations()
  loadSummary()
}

async function onDelete(declaration: TimeAndTravelDeclaration) {
  const {error} = await declarationQuery.value.delete(declaration)
  if (error) {
    displayApiError(error, 'Suppression impossible')
    return
  }
  toast.add({title: 'Déclaration supprimée'})
  loadDeclarations()
  loadSummary()
}

function attestationPeriodLabel(attestation: TimeAndTravelExportAttestation): string {
  const attestationExport = attestation.export
  if (!attestationExport || typeof attestationExport === 'string') return ''
  return `${formatDateReadable(attestationExport.startDate)} — ${formatDateReadable(attestationExport.endDate)}`
}

async function onDownloadAttestation(attestation: TimeAndTravelExportAttestation) {
  isDownloading.value = attestation.uuid
  const {error} = await downloadFilePdf(attestation.file, `attestation-${props.member.fullName}.pdf`)
  isDownloading.value = undefined
  if (error) {
    toast.add({color: 'error', title: 'Téléchargement impossible', description: error.message})
  }
}

loadDeclarations()
loadSummary()
loadAttestations()
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
      <GenericStatCard title="Déclarations" :value="summary?.declarationCount ?? 0" />
      <GenericStatCard title="Kilomètres" :value="summary?.totalKilometers ?? 0" />
      <GenericStatCard title="Heures" :value="summary?.totalHours ?? 0" />
      <GenericStatCard title="Montant valorisé" :value="formatMonetary(summary?.totalAmount ?? 0)" />
    </div>

    <UCard>
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <div class="text-xl font-bold">Déclarations de temps & kilomètres</div>
        <UButton v-if="canEdit" icon="i-heroicons-plus" @click="onCreate">
          Nouvelle déclaration
        </UButton>
      </div>

      <UTable :loading="isLoading" :columns="columns" :data="declarations">
        <template #empty>
          <div class="py-6 text-center italic text-sm">Aucune déclaration.</div>
        </template>
        <template #date-cell="{ row }">{{ formatDateReadable(row.original.date) }}</template>
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

    <TimeAndTravelVehicleList v-if="showVehicles" :member="member" :can-edit="canEdit" />

    <UCard v-if="attestations.length > 0">
      <div class="text-xl font-bold mb-4">Attestations</div>
      <div class="flex flex-col gap-2">
        <div v-for="attestation in attestations" :key="attestation.uuid" class="flex justify-between items-center">
          <div>
            <span class="font-medium">{{ attestationPeriodLabel(attestation) }}</span>
          </div>
          <UButton
            icon="i-heroicons-arrow-down-tray"
            variant="soft"
            :loading="isDownloading === attestation.uuid"
            @click="onDownloadAttestation(attestation)"
          >
            Télécharger
          </UButton>
        </div>
      </div>
    </UCard>
  </div>

  <UModal v-model:open="declarationModalOpen">
    <template #content>
      <UCard>
        <TimeAndTravelDeclarationForm
          :item="selectedDeclaration"
          :member="member"
          @updated="onUpdated"
          @canceled="declarationModalOpen = false"
        />
      </UCard>
    </template>
  </UModal>
</template>
