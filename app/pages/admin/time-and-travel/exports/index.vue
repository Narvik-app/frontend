<script setup lang="ts">
import TimeAndTravelExportQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelExportQuery'
import type {TimeAndTravelExport} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import {EXPORT_STATUS_COLORS, EXPORT_STATUS_LABELS, TimeAndTravelExportStatus} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import {formatDateInput, formatDateReadable} from '~/utils/date'
import {formatMonetary} from '~/utils/string'
import {convertUuidToUrlUuid, displayApiError} from '~/utils/resource'
import {useSelfUserStore} from '~/stores/useSelfUser'
import ClubSettingQuery from '~/composables/api/query/clubDependent/ClubSettingQuery'
import type {WriteClubSetting} from '~/types/api/item/clubDependent/clubSetting'
import {downloadFile} from '~/utils/timeAndTravel'

definePageMeta({layout: 'time-and-travel'})
useHead({title: 'Exports'})

const toast = useToast()
const selfStore = useSelfUserStore()
const {selectedProfile} = storeToRefs(selfStore)
const isAdmin = selfStore.isAdmin()

const clubSettingQuery = new ClubSettingQuery()
const smicHourlyRate = ref(selectedProfile.value?.club.settings.smicHourlyRate ?? undefined)
const isSavingRate = ref(false)

async function saveSmicHourlyRate() {
  if (!selectedProfile.value?.club.settings) return

  isSavingRate.value = true
  // The backend maps this to a decimal-as-string column: always send a string, never a number.
  const payload: WriteClubSetting = {smicHourlyRate: smicHourlyRate.value !== undefined ? String(smicHourlyRate.value) : undefined}
  const {error} = await clubSettingQuery.patch(selectedProfile.value.club.settings, payload)
  isSavingRate.value = false

  if (error) {
    displayApiError(error)
    return
  }

  selfStore.refreshSelectedClub().then()
  toast.add({color: 'success', title: 'Taux horaire enregistré'})
}

const exportQuery = new TimeAndTravelExportQuery()

const exports = ref<TimeAndTravelExport[]>([])
const isLoading = ref(true)
const modalOpen = ref(false)
const isDownloadingZip = ref<string | undefined>()

const columns = [
  {accessorKey: 'period', header: 'Période', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'declarationCount', header: 'Déclarations'},
  {accessorKey: 'totalKilometers', header: 'Km'},
  {accessorKey: 'totalAmount', header: 'Montant'},
  {accessorKey: 'status', header: 'Statut'},
  {accessorKey: 'actions', header: ''},
]

async function loadExports() {
  isLoading.value = true
  const {items} = await exportQuery.getAll(new URLSearchParams({'order[startDate]': 'desc'}))
  exports.value = items
  isLoading.value = false
}

function onUpdated() {
  modalOpen.value = false
  loadExports()
}

async function downloadZip(item: TimeAndTravelExport) {
  if (!item.zipFile) return
  isDownloadingZip.value = item.uuid
  const {error} = await downloadFile(item.zipFile, `export-${formatDateInput(item.startDate)}-${formatDateInput(item.endDate)}.zip`, 'application/zip')
  isDownloadingZip.value = undefined
  if (error) {
    toast.add({color: 'error', title: 'Téléchargement impossible', description: error.message})
  }
}

loadExports()
</script>

<template>
  <UCard v-if="isAdmin" class="mb-4">
    <UForm :state="{smicHourlyRate}" class="flex flex-wrap items-end gap-4" @submit="saveSmicHourlyRate">
      <UFormField label="Taux horaire SMIC (€)" name="smicHourlyRate" description="Utilisé pour valoriser le temps déclaré par les bénévoles dans les attestations.">
        <UFieldGroup class="w-full">
          <UInput v-model="smicHourlyRate" type="number" step="0.01" min="0" class="flex-1"/>
          <UButton color="primary" variant="soft" disabled>
            €
          </UButton>
        </UFieldGroup>
      </UFormField>
      <UButton :loading="isSavingRate" type="submit">
        Enregistrer
      </UButton>
    </UForm>
  </UCard>

  <UCard>
    <div class="flex justify-between items-center mb-4">
      <div class="text-xl font-bold">Exports</div>
      <UButton icon="i-heroicons-plus" @click="modalOpen = true">
        Nouvel export
      </UButton>
    </div>

    <UTable :loading="isLoading" :columns="columns" :data="exports">
      <template #empty>
        <div class="py-6 text-center italic text-sm">Aucun export.</div>
      </template>
      <template #period-cell="{ row }">{{ formatDateReadable(row.original.startDate) }} — {{ formatDateReadable(row.original.endDate) }}</template>
      <template #totalAmount-cell="{ row }">{{ formatMonetary(row.original.totalAmount) }}</template>
      <template #status-cell="{ row }">
        <UBadge :color="EXPORT_STATUS_COLORS[row.original.status]" variant="soft" size="xs">
          {{ EXPORT_STATUS_LABELS[row.original.status] }}
        </UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-2 justify-end">
          <UButton
            v-if="row.original.status === TimeAndTravelExportStatus.Locked && row.original.zipFile"
            icon="i-heroicons-arrow-down-tray"
            variant="soft"
            :loading="isDownloadingZip === row.original.uuid"
            @click="downloadZip(row.original)"
          >
            ZIP
          </UButton>
          <UButton :to="`/admin/time-and-travel/exports/${convertUuidToUrlUuid(row.original.uuid)}`">
            Détail
          </UButton>
        </div>
      </template>
    </UTable>
  </UCard>

  <UModal v-model:open="modalOpen">
    <template #content>
      <UCard>
        <TimeAndTravelExportGenerateForm @updated="onUpdated" @canceled="modalOpen = false" />
      </UCard>
    </template>
  </UModal>
</template>
