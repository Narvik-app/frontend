<script setup lang="ts">
import type {PropType} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {TimeAndTravelExportAttestation} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import MemberTimeAndTravelAttestationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberTimeAndTravelAttestationQuery'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import {downloadFilePdf} from '~/utils/timeAndTravel'
import {formatDateReadable} from '~/utils/date'
import TimeAndTravelDeclarationsTable from '~/components/TimeAndTravel/TimeAndTravelDeclarationsTable.vue'

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

const selfStore = useSelfUserStore()
const canEditOthers = selfStore.can(Permission.TimeAndTravelEdit)
const canEdit = computed(() => props.self || canEditOthers)

const attestationQuery = computed(() => new MemberTimeAndTravelAttestationQuery(props.member))
const attestations = ref<TimeAndTravelExportAttestation[]>([])
const isDownloading = ref<string | undefined>()

const declarationsTable = ref<InstanceType<typeof TimeAndTravelDeclarationsTable>>()
const declarationModalOpen = ref(false)
const selectedDeclaration = ref<TimeAndTravelDeclaration | undefined>()

async function loadAttestations() {
  const {items} = await attestationQuery.value.getAll()
  attestations.value = items
}

function onCreate() {
  selectedDeclaration.value = undefined
  declarationModalOpen.value = true
}

function onEdit(declaration: TimeAndTravelDeclaration) {
  selectedDeclaration.value = declaration
  declarationModalOpen.value = true
}

function onUpdated() {
  declarationModalOpen.value = false
  selectedDeclaration.value = undefined
  declarationsTable.value?.refresh()
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

loadAttestations()
</script>

<template>
  <div class="flex flex-col gap-4">
    <TimeAndTravelDeclarationsTable ref="declarationsTable" :member="member" :can-edit="canEdit" @create="onCreate" @edit="onEdit" />

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
