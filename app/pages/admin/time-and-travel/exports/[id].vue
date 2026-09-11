<script setup lang="ts">
import TimeAndTravelExportQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelExportQuery'
import type {TimeAndTravelExport, TimeAndTravelExportAttestation} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import {EXPORT_STATUS_COLORS, EXPORT_STATUS_LABELS, TimeAndTravelExportStatus} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import {decodeUrlUuid, convertUuidToUrlUuid, displayApiError} from '~/utils/resource'
import {formatAmount, downloadFilePdf} from '~/utils/timeAndTravel'
import {formatDateReadable} from '~/utils/date'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'

definePageMeta({layout: 'time-and-travel'})
useHead({title: 'Détail export'})

const route = useRoute()
const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const selfStore = useSelfUserStore()
const isAdmin = selfStore.isAdmin()
const canExport = selfStore.can(Permission.TimeAndTravelExport)

const exportQuery = new TimeAndTravelExportQuery()
const exportUuid = decodeUrlUuid(route.params.id.toString())

const item = ref<TimeAndTravelExport | undefined>()
const attestations = ref<TimeAndTravelExportAttestation[]>([])
const isLoading = ref(true)
const isProcessing = ref(false)
const isDownloading = ref<string | undefined>()

const isDraft = computed(() => item.value?.status === TimeAndTravelExportStatus.Draft)

async function loadItem() {
  isLoading.value = true
  const {retrieved, error} = await exportQuery.get(exportUuid)
  if (error) {
    displayApiError(error)
  } else {
    item.value = retrieved
  }
  isLoading.value = false
}

async function loadAttestations() {
  if (!item.value) return
  const {items} = await exportQuery.getAttestations(item.value)
  attestations.value = items
}

async function regenerate() {
  if (!item.value) return
  isProcessing.value = true
  const {error} = await exportQuery.regenerate(item.value)
  isProcessing.value = false
  if (error) {
    toast.add({color: 'error', title: 'Erreur', description: error.message})
    return
  }
  toast.add({title: 'Export régénéré'})
  await loadItem()
  await loadAttestations()
}

async function lock() {
  if (!item.value) return
  isProcessing.value = true
  const {error} = await exportQuery.lock(item.value)
  isProcessing.value = false
  if (error) {
    toast.add({color: 'error', title: 'Erreur', description: error.message})
    return
  }
  toast.add({title: 'Export verrouillé'})
  await loadItem()
}

async function unlock() {
  if (!item.value) return
  isProcessing.value = true
  const {error} = await exportQuery.unlock(item.value)
  isProcessing.value = false
  if (error) {
    toast.add({color: 'error', title: 'Erreur', description: error.message})
    return
  }
  toast.add({title: 'Export déverrouillé'})
  await loadItem()
}

async function deleteExport() {
  if (!item.value) return
  const {error} = await exportQuery.delete(item.value)
  if (error) {
    toast.add({color: 'error', title: 'Suppression impossible', description: error.message})
    return
  }
  toast.add({title: 'Export supprimé'})
  await navigateTo('/admin/time-and-travel/exports')
}

async function downloadRecap() {
  if (!item.value?.recapFile) return
  isDownloading.value = 'recap'
  const {error} = await downloadFilePdf(item.value.recapFile, `recapitulatif-${item.value.label ?? item.value.uuid}.pdf`)
  isDownloading.value = undefined
  if (error) {
    toast.add({color: 'error', title: 'Téléchargement impossible', description: error.message})
  }
}

async function downloadAttestation(attestation: TimeAndTravelExportAttestation) {
  isDownloading.value = attestation.uuid
  const memberName = typeof attestation.member === 'object' ? attestation.member?.fullName : attestation.uuid
  const {error} = await downloadFilePdf(attestation.file, `attestation-${memberName}.pdf`)
  isDownloading.value = undefined
  if (error) {
    toast.add({color: 'error', title: 'Téléchargement impossible', description: error.message})
  }
}

function getMemberName(attestation: TimeAndTravelExportAttestation): string {
  return typeof attestation.member === 'object' ? attestation.member?.fullName ?? '-' : '-'
}

function getMemberUuid(attestation: TimeAndTravelExportAttestation): string | undefined {
  return typeof attestation.member === 'object' ? attestation.member?.uuid : undefined
}

loadItem().then(loadAttestations)
</script>

<template>
  <div v-if="isLoading" class="flex justify-center">
    <USkeleton class="h-32 w-full" />
  </div>

  <div v-else-if="item" class="flex flex-col gap-4">
    <UCard>
      <div class="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div class="text-2xl font-bold">{{ item.label ?? 'Export' }}</div>
          <div class="text-muted">{{ formatDateReadable(item.startDate) }} — {{ formatDateReadable(item.endDate) }}</div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <UBadge :color="EXPORT_STATUS_COLORS[item.status]" variant="soft">{{ EXPORT_STATUS_LABELS[item.status] }}</UBadge>
          <div class="text-sm text-muted">{{ item.declarationCount }} déclarations · {{ item.memberCount }} membres</div>
          <div class="text-lg font-semibold">{{ formatAmount(item.totalAmount) }}</div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-4">
        <UButton
          v-if="item.recapFile"
          icon="i-heroicons-arrow-down-tray"
          variant="soft"
          :loading="isDownloading === 'recap'"
          @click="downloadRecap"
        >
          Récapitulatif (PDF)
        </UButton>

        <template v-if="isDraft && canExport">
          <UButton icon="i-heroicons-arrow-path" variant="soft" :loading="isProcessing" @click="regenerate">
            Régénérer
          </UButton>
          <UButton
            icon="i-heroicons-lock-closed"
            color="error"
            :loading="isProcessing"
            @click="overlayDeleteConfirmation.open({
              alertTitle: 'Le verrouillage est définitif : les déclarations ne pourront plus être modifiées.',
              alertColor: 'error',
              async onDelete() {
                await lock()
                overlayDeleteConfirmation.close(true)
              }
            })"
          >
            Verrouiller définitivement
          </UButton>
        </template>

        <UButton v-if="!isDraft && isAdmin" icon="i-heroicons-lock-open" color="warning" :loading="isProcessing" @click="unlock">
          Déverrouiller
        </UButton>

        <UButton
          v-if="isDraft && canExport"
          icon="i-heroicons-trash"
          color="error"
          variant="ghost"
          @click="overlayDeleteConfirmation.open({
            alertTitle: 'La suppression de cet export est définitive.',
            alertColor: 'error',
            async onDelete() {
              await deleteExport()
              overlayDeleteConfirmation.close(true)
            }
          })"
        >
          Supprimer
        </UButton>
      </div>
    </UCard>

    <UCard>
      <div class="text-xl font-bold mb-4">Attestations par membre</div>
      <UTable
        :data="attestations"
        :columns="[
          {accessorKey: 'member', header: 'Membre'},
          {accessorKey: 'totalKilometers', header: 'Km'},
          {accessorKey: 'totalHours', header: 'Heures'},
          {accessorKey: 'totalAmount', header: 'Montant'},
          {accessorKey: 'actions', header: ''},
        ]"
      >
        <template #empty>
          <div class="py-6 text-center italic text-sm">Aucune attestation.</div>
        </template>
        <template #member-cell="{ row }">
          <ULink :to="`/admin/members/${convertUuidToUrlUuid(getMemberUuid(row.original))}`">
            {{ getMemberName(row.original) }}
          </ULink>
        </template>
        <template #totalAmount-cell="{ row }">{{ formatAmount(row.original.totalAmount) }}</template>
        <template #actions-cell="{ row }">
          <UButton
            icon="i-heroicons-arrow-down-tray"
            variant="ghost"
            :loading="isDownloading === row.original.uuid"
            @click="downloadAttestation(row.original)"
          >
            Attestation
          </UButton>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
