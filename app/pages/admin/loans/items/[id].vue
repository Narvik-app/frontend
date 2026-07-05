<script setup lang="ts">
import LoanItemQuery, {type LoanItemUsagePerDay} from '~/composables/api/query/clubDependent/plugin/loan/LoanItemQuery'
import LoanQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanQuery'
import LoanRecordingQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingQuery'
import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {Loan} from '~/types/api/item/clubDependent/plugin/loan/loan'
import type {LoanRecording} from '~/types/api/item/clubDependent/plugin/loan/loanRecording'
import {decodeUrlUuid, convertUuidToUrlUuid} from '~/utils/resource'
import {formatMonetary} from '~/utils/string'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'
import LoanModalRecord from '~/components/Loan/LoanModalRecord.vue'
import LoanRecordingForm from '~/components/Loan/LoanRecordingForm.vue'
import type {ChartDataField, ChartLineData} from '~/utils/chart'
import dayjs from 'dayjs'
import {formatDate, formatDateTime} from '~/utils/date'

definePageMeta({layout: 'loan'})

const isLoading = ref(true)
const toast = useToast()
const overlay = useOverlay()
const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.LoanItemsEdit))
const canLoan = computed(() => selfStore.can(Permission.LoanEdit))

const route = useRoute()
const itemId = decodeUrlUuid(route.params.id.toString())

const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const itemModalOpen = ref(false)

const loanItem = ref<LoanItem | undefined>()

// Chart
const chartData = ref<ChartLineData | undefined>()
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {type: 'linear', position: 'left', title: {display: true, text: 'Prêts'}},
  },
}
type Period = '6m' | '1y' | '2y' | 'all'
const periods: {label: string; value: Period}[] = [
  {label: '6 mois', value: '6m'},
  {label: '1 an', value: '1y'},
  {label: '2 ans', value: '2y'},
  {label: 'Tout', value: 'all'},
]
const selectedPeriod = ref<Period>('1y')
const isLoadingChart = ref(false)

// Loans list
const loans = ref<Loan[]>([])
const totalLoans = ref(0)
const loansPage = ref(1)
const loansPerPage = ref(10)
const isLoadingLoans = ref(false)

// Recordings list
const recordings = ref<LoanRecording[]>([])
const totalRecordings = ref(0)
const recordingsPage = ref(1)
const recordingsPerPage = ref(10)
const isLoadingRecordings = ref(false)

const itemQuery = new LoanItemQuery()
const loanQuery = new LoanQuery()
const recordingQuery = new LoanRecordingQuery()

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  loaned: 'Prêté',
  maintenance: 'Maintenance',
  sold: 'Vendu',
  retired: 'Retiré',
}
const statusColors: Record<string, 'success' | 'primary' | 'warning' | 'neutral' | 'error'> = {
  available: 'success',
  loaned: 'primary',
  maintenance: 'warning',
  sold: 'neutral',
  retired: 'error',
}

function effectiveStatus(): string {
  if (loanItem.value?.isCurrentlyLoaned) return 'loaned'
  return loanItem.value?.status ?? 'available'
}

loadItem().then((ok) => {
  if (!ok) {
    toast.add({color: 'error', title: 'Article non trouvé'})
    navigateTo('/admin/loans')
  }
})

async function loadItem(): Promise<boolean> {
  isLoading.value = true
  const {retrieved, error} = await itemQuery.get(itemId.toString())
  isLoading.value = false
  if (!retrieved || error) return false
  loanItem.value = retrieved
  useHead({title: retrieved.name})
  loadChart()
  loadLoans()
  loadRecordings()
  return true
}

function onItemUpdated(updated: LoanItem) {
  itemModalOpen.value = false
  loanItem.value = updated
  useHead({title: updated.name})
}

function buildChartParams(paginate: boolean): URLSearchParams {
  const p = new URLSearchParams()
  if (selectedPeriod.value !== 'all') {
    const map: Record<string, [number, dayjs.ManipulateType]> = {
      '6m': [6, 'month'], '1y': [1, 'year'], '2y': [2, 'year'],
    }
    const [amount, unit] = map[selectedPeriod.value]!
    p.append('start', dayjs().subtract(amount, unit).format('YYYY-MM-DD'))
    p.append('end', dayjs().format('YYYY-MM-DD'))
  }
  if (paginate) {
    p.append('page', '1')
    p.append('itemsPerPage', '30')
  } else {
    p.append('pagination', 'false')
  }
  return p
}

async function loadChart() {
  isLoadingChart.value = true
  const {items, error} = await itemQuery.usagePerDay(itemId.toString(), buildChartParams(false))
  isLoadingChart.value = false
  if (error || !items.length) {chartData.value = undefined; return}

  const reversed = [...items].reverse() as LoanItemUsagePerDay[]
  const data: ChartDataField[] = reversed.map(r => ({x: r.day, y: r.count}))
  chartData.value = {datasets: [{label: 'Prêts', data}]}
}

function selectPeriod(p: Period) {
  selectedPeriod.value = p
  loadChart()
}

async function loadLoans() {
  isLoadingLoans.value = true
  const p = new URLSearchParams({
    'loanItem.uuid': itemId.toString(),
    page: loansPage.value.toString(),
    itemsPerPage: loansPerPage.value.toString(),
    'order[startDate]': 'desc',
  })
  const {items, totalItems} = await loanQuery.getAll(p)
  loans.value = items
  totalLoans.value = totalItems ?? 0
  isLoadingLoans.value = false
}

async function loadRecordings() {
  isLoadingRecordings.value = true
  const p = new URLSearchParams({
    'loanItem.uuid': itemId.toString(),
    page: recordingsPage.value.toString(),
    itemsPerPage: recordingsPerPage.value.toString(),
    'order[date]': 'desc',
  })
  const {items, totalItems} = await recordingQuery.getAll(p)
  recordings.value = items
  totalRecordings.value = totalItems ?? 0
  isLoadingRecordings.value = false
}

async function returnLoan(loan: Loan) {
  const {error} = await loanQuery.patch(loan, {endDate: new Date().toISOString()})
  if (error) {
    toast.add({color: 'error', title: 'Erreur lors du retour', description: error.message})
    return
  }
  toast.add({color: 'success', title: 'Retour enregistré'})
  await loadItem()
}

async function deleteItem() {
  if (!loanItem.value) return
  const {error} = await itemQuery.delete(loanItem.value)
  if (error) {
    toast.add({color: 'error', title: 'La suppression a échouée', description: error.message})
    return
  }
  toast.add({color: 'success', title: 'Article supprimé'})
  navigateTo('/admin/loans')
}

const loanColumns = [
  {accessorKey: 'startDate', header: 'Début'},
  {accessorKey: 'endDate', header: 'Retour'},
  {accessorKey: 'member', header: 'Emprunteur'},
  {accessorKey: 'author', header: 'Prêté par'},
  {accessorKey: 'comment', header: 'Commentaire'},
  {accessorKey: 'actions', header: ''},
]
const recordingColumns = [
  {accessorKey: 'date', header: 'Date'},
  {accessorKey: 'recordingType', header: 'Type'},
  {accessorKey: 'author', header: 'Auteur'},
  {accessorKey: 'description', header: 'Description'},
]

function getMemberName(m: unknown): string {
  if (!m) return '-'
  if (typeof m === 'object' && m !== null) {
    const member = m as {fullName?: string; firstname?: string; lastname?: string}
    return (member.fullName ?? `${member.firstname ?? ''} ${member.lastname ?? ''}`.trim()) || '-'
  }
  return '-'
}

function getBorrowerName(loan: Loan): string {
  if (loan.member) return getMemberName(loan.member)
  if (loan.borrowerName) return loan.borrowerName
  return '-'
}

const activeLoan = computed(() => loans.value.find(l => !l.endDate))

async function openLoanModal() {
  if (!loanItem.value) return
  if (loanItem.value.isCurrentlyLoaned) {
    toast.add({color: 'warning', title: 'Article déjà en prêt', description: 'Enregistrez le retour avant de créer un nouveau prêt.'})
    return
  }
  const instance = overlay.create(LoanModalRecord).open({loanItem: loanItem.value})
  if (await instance.result) await loadItem()
}

async function openRecordingModal() {
  if (!loanItem.value) return
  const instance = overlay.create(LoanRecordingForm).open({loanItem: loanItem.value})
  if (await instance.result) await loadRecordings()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header row -->
    <div class="flex gap-2 flex-wrap">
      <UTooltip text="Retour aux prêts">
        <UButton to="/admin/loans" icon="i-heroicons-arrow-left" size="xs" variant="ghost" />
      </UTooltip>

      <div class="flex-1 text-center font-bold text-2xl flex justify-center gap-2">
        {{ loanItem?.name }}
        <UBadge
          v-if="loanItem"
          :color="statusColors[effectiveStatus()]"
          variant="soft"
          class="self-center"
        >
          {{ statusLabels[effectiveStatus()] }}
        </UBadge>
      </div>

      <UTooltip v-if="canLoan" :text="loanItem?.isCurrentlyLoaned ? 'Article déjà en prêt' : 'Enregistrer un prêt'">
        <UButton icon="i-heroicons-archive-box-arrow-down" color="primary" :disabled="loanItem?.isCurrentlyLoaned" @click="openLoanModal()" />
      </UTooltip>

      <UTooltip v-if="canEdit" text="Modifier">
        <UButton icon="i-heroicons-pencil-square" color="warning" @click="itemModalOpen = true" />
      </UTooltip>

      <UTooltip v-if="canEdit" text="Supprimer">
        <UButton
          icon="i-heroicons-trash"
          color="error"
          @click="overlayDeleteConfirmation.open({
            async onDelete() { await deleteItem(); overlayDeleteConfirmation.close(true) }
          })"
        />
      </UTooltip>
    </div>

    <!-- Active loan recap -->
    <UCard v-if="activeLoan" class="ring-1 ring-primary/40">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <UIcon name="i-heroicons-archive-box-arrow-down" class="text-2xl text-primary shrink-0" />
        <div class="flex-1 flex flex-col gap-0.5">
          <div class="font-semibold">Prêté à {{ getBorrowerName(activeLoan) }}</div>
          <div class="text-sm text-muted">
            Depuis le {{ formatDateTime(activeLoan.startDate) }}
            <template v-if="activeLoan.author"> · par {{ getMemberName(activeLoan.author) }}</template>
          </div>
          <div v-if="activeLoan.comment" class="text-sm italic">{{ activeLoan.comment }}</div>
        </div>
        <UButton
          v-if="canLoan"
          color="success"
          icon="i-heroicons-arrow-uturn-left"
          @click="returnLoan(activeLoan)"
        >
          Retourner
        </UButton>
      </div>
    </UCard>

    <!-- Stat cards -->
    <div class="sm:grid sm:grid-flow-row sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <GenericStatCard title="Prix de prêt" :value="loanItem?.loanPrice ? formatMonetary(loanItem.loanPrice) : '-'" :loading="isLoading" />
      <GenericStatCard title="Prix d'achat" :value="loanItem?.purchasePrice ? formatMonetary(loanItem.purchasePrice) : '-'" :loading="isLoading" />
      <GenericStatCard title="Nombre de prêts" :value="loanItem?.timesLoaned ?? 0" :loading="isLoading" />
      <GenericStatCard title="Catégorie" :value="typeof loanItem?.category === 'object' ? (loanItem?.category?.name ?? '-') : '-'" :loading="isLoading" />
    </div>

    <!-- Usage chart -->
    <GenericCard title="Utilisation par jour">
      <div class="flex justify-end gap-1 mb-4">
        <UButton
          v-for="p in periods"
          :key="p.value"
          :label="p.label"
          size="sm"
          :variant="selectedPeriod === p.value ? 'soft' : 'ghost'"
          :color="selectedPeriod === p.value ? 'primary' : 'neutral'"
          @click="selectPeriod(p.value)"
        />
      </div>
      <div v-if="isLoadingChart" class="h-48 flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      </div>
      <div v-else-if="chartData" class="relative h-48">
        <ChartLine :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="h-24 flex items-center justify-center text-muted italic text-sm">
        Aucune donnée sur cette période.
      </div>
    </GenericCard>

    <!-- Loans list -->
    <GenericCard title="Historique des prêts">
      <UTable :loading="isLoadingLoans" :columns="loanColumns" :data="loans">
        <template #empty>
          <div class="py-6 text-center italic text-sm">Aucun prêt enregistré.</div>
        </template>
        <template #startDate-cell="{ row }">
          {{ formatDateTime(row.original.startDate) }}
        </template>
        <template #endDate-cell="{ row }">
          <span v-if="row.original.endDate">{{ formatDateTime(row.original.endDate) }}</span>
          <UBadge v-else color="primary" variant="soft">En cours</UBadge>
        </template>
        <template #member-cell="{ row }">
          {{ getBorrowerName(row.original) }}
        </template>
        <template #author-cell="{ row }">
          {{ getMemberName(row.original.author) }}
        </template>
        <template #comment-cell="{ row }">
          <span class="text-xs text-muted">{{ row.original.comment ?? '-' }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            v-if="canLoan && !row.original.endDate"
            size="xs"
            color="success"
            @click="returnLoan(row.original)"
          >
            Retourner
          </UButton>
        </template>
      </UTable>
    </GenericCard>

    <!-- Recordings list -->
    <GenericCard title="Enregistrements">
      <div v-if="canEdit" class="flex justify-end mb-3">
        <UButton size="sm" icon="i-heroicons-plus" @click="openRecordingModal()">
          Ajouter un enregistrement
        </UButton>
      </div>
      <UTable :loading="isLoadingRecordings" :columns="recordingColumns" :data="recordings">
        <template #empty>
          <div class="py-6 text-center italic text-sm">Aucun enregistrement.</div>
        </template>
        <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>
        <template #recordingType-cell="{ row }">
          <template v-if="row.original.recordingType && typeof row.original.recordingType === 'object'">
            <span
              v-if="row.original.recordingType.color"
              class="inline-block w-2 h-2 rounded-full mr-1"
              :style="{backgroundColor: row.original.recordingType.color}"
            />
            {{ row.original.recordingType.name }}
          </template>
          <span v-else class="text-muted">-</span>
        </template>
        <template #author-cell="{ row }">{{ getMemberName(row.original.author) }}</template>
        <template #description-cell="{ row }">
          <span class="text-xs">{{ row.original.description ?? '-' }}</span>
        </template>
      </UTable>
    </GenericCard>
  </div>

  <!-- Edit item modal -->
  <UModal v-model:open="itemModalOpen">
    <template #content>
      <UCard>
        <LoanItemForm :item="loanItem" @updated="onItemUpdated" />
      </UCard>
    </template>
  </UModal>

</template>
