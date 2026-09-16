<script setup lang="ts">
import TimeAndTravelExportQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelExportQuery'
import type {TimeAndTravelExport, TimeAndTravelExportAttestation} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import {EXPORT_STATUS_COLORS, EXPORT_STATUS_LABELS, TimeAndTravelExportStatus} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import {decodeUrlUuid, convertUuidToUrlUuid, displayApiError} from '~/utils/resource'
import {formatMonetary} from '~/utils/string'
import {formatDateReadable} from '~/utils/date'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import {useFileDownloadLinks} from '~/composables/useFileDownloadLinks'
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

const {hrefs: fileHrefs, errors: fileErrors, resolve: resolveFileHref} = useFileDownloadLinks()
// Keyed by the File's own uuid rather than the owning export/attestation, so a regenerated
// recap/attestation (a new File) naturally resolves a fresh link instead of reusing a stale one.
const recapHref = computed(() => item.value?.recapFile?.uuid ? fileHrefs.value[item.value.recapFile.uuid] : undefined)
const recapError = computed(() => item.value?.recapFile?.uuid ? fileErrors.value[item.value.recapFile.uuid] : undefined)
const recapFilename = computed(() => `recapitulatif-${item.value?.startDate}-${item.value?.endDate}.pdf`)

const isDraft = computed(() => item.value?.status === TimeAndTravelExportStatus.Draft)

// The export has no name of its own — its period is its name.
const exportTitle = computed(() => {
  if (!item.value) return 'Export'
  return `${formatDateReadable(item.value.startDate)} — ${formatDateReadable(item.value.endDate)}`
})

// Regeneration (triggered by the button here, by locking, or automatically by a declaration
// change elsewhere — see documentation/FEATURE_MERCURE.md) runs in the background. There's no
// push notification yet, so this page polls while the export reports itself as regenerating.
let pollTimeout: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => { if (pollTimeout) clearTimeout(pollTimeout) })

async function pollWhileRegenerating() {
  if (!item.value?.isRegenerating) {
    isProcessing.value = false
    return
  }
  pollTimeout = setTimeout(async () => {
    await loadItem()
    if (item.value?.isRegenerating) {
      pollWhileRegenerating()
    } else {
      isProcessing.value = false
      await loadAttestations()
    }
  }, 2000)
}

async function loadItem() {
  isLoading.value = true
  const {retrieved, error} = await exportQuery.get(exportUuid)
  if (error) {
    displayApiError(error)
  } else {
    item.value = retrieved
    if (item.value?.recapFile) {
      resolveFileHref(item.value.recapFile.uuid, item.value.recapFile)
    }
  }
  isLoading.value = false
}

async function loadAttestations() {
  if (!item.value) return
  const {items} = await exportQuery.getAttestations(item.value)
  attestations.value = items
  items.forEach(attestation => {
    if (attestation.file) resolveFileHref(attestation.file.uuid, attestation.file)
  })
}

async function regenerate() {
  if (!item.value) return
  isProcessing.value = true
  const {error} = await exportQuery.regenerate(item.value)
  if (error) {
    isProcessing.value = false
    toast.add({color: 'error', title: 'Erreur', description: error.message})
    return
  }
  toast.add({title: 'Régénération en cours…'})
  await loadItem()
  await pollWhileRegenerating()
}

async function lock() {
  if (!item.value) return
  isProcessing.value = true
  const {error} = await exportQuery.lock(item.value)
  if (error) {
    isProcessing.value = false
    toast.add({color: 'error', title: 'Erreur', description: error.message})
    return
  }
  toast.add({title: 'Verrouillage en cours…'})
  await loadItem()
  await pollWhileRegenerating()
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
    displayApiError(error, 'Suppression impossible')
    return
  }
  toast.add({title: 'Export supprimé'})
  await navigateTo('/admin/time-and-travel/exports')
}

function attestationFilename(attestation: TimeAndTravelExportAttestation): string {
  return `attestation-${getMemberName(attestation)}.pdf`
}

function getMemberName(attestation: TimeAndTravelExportAttestation): string {
  return typeof attestation.member === 'object' ? attestation.member?.fullName ?? '-' : '-'
}

function getMemberUuid(attestation: TimeAndTravelExportAttestation): string | undefined {
  return typeof attestation.member === 'object' ? attestation.member?.uuid : undefined
}

loadItem().then(async () => {
  await loadAttestations()
  if (item.value?.isRegenerating) {
    isProcessing.value = true
    await pollWhileRegenerating()
  }
})
</script>

<template>
  <div v-if="isLoading" class="flex justify-center">
    <USkeleton class="h-32 w-full" />
  </div>

  <div v-else-if="item" class="flex flex-col gap-4">
    <UCard>
      <div class="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div class="text-2xl font-bold">{{ exportTitle }}</div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <UBadge :color="EXPORT_STATUS_COLORS[item.status]" variant="soft">{{ EXPORT_STATUS_LABELS[item.status] }}</UBadge>
          <UBadge v-if="item.isRegenerating" color="neutral" variant="subtle" icon="i-heroicons-arrow-path">
            Régénération en cours…
          </UBadge>
          <div class="text-sm text-muted">{{ item.declarationCount }} déclarations · {{ item.memberCount }} membres</div>
          <div class="text-lg font-semibold">{{ item.totalKilometers ?? 0 }} km · {{ formatMonetary(item.totalAmount) }}</div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-4">
        <UButton
          v-if="item.recapFile"
          icon="i-heroicons-arrow-down-tray"
          variant="soft"
          :color="recapError ? 'error' : 'primary'"
          :disabled="!!recapError"
          :loading="!recapHref && !recapError"
          :to="recapHref"
          :download="recapFilename"
        >
          {{ recapError ? 'Récapitulatif indisponible' : 'Récapitulatif (PDF)' }}
        </UButton>

        <template v-if="isDraft && canExport">
          <UButton icon="i-heroicons-arrow-path" variant="soft" :disabled="item.isRegenerating" :loading="isProcessing" @click="regenerate">
            Régénérer
          </UButton>
          <UButton
            icon="i-heroicons-lock-closed"
            color="warning"
            :disabled="item.isRegenerating"
            :loading="isProcessing"
            @click="overlayDeleteConfirmation.open({
              alertTitle: 'Le verrouillage est définitif : les déclarations ne pourront plus être modifiées.',
              alertColor: 'warning',
              confirmLabel: 'Verrouiller',
              confirmColor: 'warning',
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

        <div class="flex-1"></div>

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
        <template #totalAmount-cell="{ row }">{{ formatMonetary(row.original.totalAmount) }}</template>
        <template #actions-cell="{ row }">
          <UButton
            icon="i-heroicons-arrow-down-tray"
            variant="ghost"
            :color="row.original.file && fileErrors[row.original.file.uuid] ? 'error' : 'primary'"
            :disabled="!!(row.original.file && fileErrors[row.original.file.uuid])"
            :loading="!(row.original.file && (fileHrefs[row.original.file.uuid] || fileErrors[row.original.file.uuid]))"
            :to="row.original.file ? fileHrefs[row.original.file.uuid] : undefined"
            :download="attestationFilename(row.original)"
          >
            Attestation
          </UButton>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
