<script lang="ts" setup>
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useMetricStore} from "~/stores/useMetricStore";
import MetricQuery from "~/composables/api/query/MetricQuery";
import type {Metric} from "~/types/api/item/metric";
import {Permission} from "~/types/api/permissions";
import type {ChartBarData, ChartDataField} from "~/utils/chart";
import type {DateRangeFilter, DateRange} from "~/types/date";
import {formatDateInput, formatDateRangeReadable, formatDateTimeReadable} from "~/utils/date";
import {print} from "~/utils/browser";
import {convertUuidToUrlUuid} from "~/utils/resource";
import dayjs from "dayjs";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Statistiques des prêts'
})

const popoverOpen = ref(false)
const selectedMode = ref<string>('__global__')

const selfStore = useSelfUserStore();
const {selectedProfile} = storeToRefs(selfStore)
const canAccess = computed(() => selfStore.can(Permission.LoanAccess))
const metricStore = useMetricStore()

const {
  dateRange,
  isLoading,
  lastRefreshDate,
  loanMetrics,
  loanMetricsPreviousSeason,
  previousPeriodInfo,
} = storeToRefs(metricStore)

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric child type properly
function findItemMetric(metric: any, itemUuid: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric child type properly
  return metric?.childMetrics?.find((m: any) => m.name === itemUuid)
}

const modeItems = computed(() => {
  const items = [{label: 'Global (tous les articles)', value: '__global__'}]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric child type properly
  const children = (loanMetrics.value?.childMetrics ?? []) as any[]
  children.forEach(cm => {
    items.push({label: cm.values?.itemName ?? cm.name, value: cm.name})
  })
  return items
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric type properly
const currentNode = computed<any>(() => {
  if (selectedMode.value === '__global__') return loanMetrics.value
  return findItemMetric(loanMetrics.value, selectedMode.value)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric type properly
const previousNode = computed<any>(() => {
  if (selectedMode.value === '__global__') return loanMetricsPreviousSeason.value
  return findItemMetric(loanMetricsPreviousSeason.value, selectedMode.value)
})

const isGlobalMode = computed(() => selectedMode.value === '__global__')
const hasData = computed(() => !!currentNode.value)

// Number of days covered by the currently selected date range — used to normalize the per-item
// "Moy. / jour" table column so periods of different lengths stay comparable.
const daysInPeriod = computed(() => {
  if (dateRange.value && !('value' in dateRange.value)) {
    const range = dateRange.value as DateRange
    return Math.max(1, dayjs(range.end).diff(dayjs(range.start), 'day') + 1)
  }
  return 30
})

const loanStats = computed(() => {
  const current = currentNode.value?.value ?? 0
  const previous = previousNode.value?.value ?? 0
  return {
    total: current,
    previousTotal: previous,
    isIncreasing: current >= previous,
    // Global mode exposes "openNow" (live count); per-item mode exposes "openCount" (0 or 1 for that item)
    openNow: currentNode.value?.values?.openNow ?? currentNode.value?.values?.openCount ?? 0,
    distinctItems: currentNode.value?.values?.distinctItems ?? 0,
    distinctBorrowers: currentNode.value?.values?.distinctBorrowers ?? 0,
    dailyAverage: current / daysInPeriod.value,
  }
})

function formatRate(value: number): string {
  return value.toFixed(2)
}

// Real (non-estimated) monthly/yearly totals — fetched as their own fixed rolling windows,
// independent of the main date-range picker, each compared to the equivalent prior window.
const metricsQuery = new MetricQuery()
const monthlyMetric = ref<Metric | undefined>()
const monthlyMetricPrevious = ref<Metric | undefined>()
const yearlyMetric = ref<Metric | undefined>()
const yearlyMetricPrevious = ref<Metric | undefined>()

function buildFixedWindowQuery(windowDays: number, offsetDays: number): string {
  const end = dayjs().subtract(offsetDays, 'day')
  const start = end.clone().subtract(windowDays - 1, 'day')
  const params = new URLSearchParams()
  params.append('start', formatDateInput(start.toString()) ?? '')
  params.append('end', formatDateInput(end.add(1, 'day').toString()) ?? '')
  return 'loans?' + params.toString()
}

async function loadFixedWindowMetrics() {
  if (!selectedProfile.value?.club.loansEnabled) return
  const [monthly, monthlyPrevious, yearly, yearlyPrevious] = await Promise.all([
    metricsQuery.get(buildFixedWindowQuery(30, 0)),
    metricsQuery.get(buildFixedWindowQuery(30, 30)),
    metricsQuery.get(buildFixedWindowQuery(365, 0)),
    metricsQuery.get(buildFixedWindowQuery(365, 365)),
  ])
  monthlyMetric.value = monthly.retrieved
  monthlyMetricPrevious.value = monthlyPrevious.retrieved
  yearlyMetric.value = yearly.retrieved
  yearlyMetricPrevious.value = yearlyPrevious.retrieved
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric type properly
function nodeFor(metric: any, mode: string) {
  if (!metric) return undefined
  return mode === '__global__' ? metric : findItemMetric(metric, mode)
}

const fixedWindowStats = computed(() => {
  const monthlyTotal = nodeFor(monthlyMetric.value, selectedMode.value)?.value ?? 0
  const previousMonthlyTotal = nodeFor(monthlyMetricPrevious.value, selectedMode.value)?.value ?? 0
  const yearlyTotal = nodeFor(yearlyMetric.value, selectedMode.value)?.value ?? 0
  const previousYearlyTotal = nodeFor(yearlyMetricPrevious.value, selectedMode.value)?.value ?? 0
  return {monthlyTotal, previousMonthlyTotal, yearlyTotal, previousYearlyTotal}
})

const currentPeriodStart = computed<Date | undefined>(() => {
  if (dateRange.value && !('value' in dateRange.value)) {
    return (dateRange.value as DateRange).start
  }
  return undefined
})

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Loans are infrequent (often just 1-2 per day), so a daily breakdown is mostly empty bars —
// group into months instead. Daily counts also land on different calendar dates for the current
// vs. previous period (shifted by a year), so each series is bucketed against its OWN start
// (bucketAnchor) but labeled using the current period's months (labelAnchor) — same relative
// position, real month names, letting the two series overlay meaningfully.
function toMonthlyOffsetSeries(
  dailyCounts: {day: string, count: number}[] | undefined,
  bucketAnchor: Date | undefined,
  labelAnchor: Date | undefined,
): ChartDataField[] {
  if (!dailyCounts || !bucketAnchor || !labelAnchor) return []
  const bucketStart = dayjs(bucketAnchor)
  const labelStart = dayjs(labelAnchor)
  const buckets = new Map<number, number>()
  dailyCounts.forEach(d => {
    const offset = dayjs(d.day).diff(bucketStart, 'month')
    buckets.set(offset, (buckets.get(offset) ?? 0) + d.count)
  })
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([offset, count]) => ({
      x: capitalize(labelStart.add(offset, 'month').toDate().toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'})),
      y: count,
    }))
}

const chartData = computed(() => {
  const response: ChartBarData = {datasets: []}

  const previousSeries = toMonthlyOffsetSeries(previousNode.value?.values?.dailyCounts, previousPeriodInfo.value?.dates?.start, currentPeriodStart.value)
  if (previousSeries.length > 0) {
    response.datasets.push({label: 'Période précédente', data: previousSeries})
  }

  const currentSeries = toMonthlyOffsetSeries(currentNode.value?.values?.dailyCounts, currentPeriodStart.value, currentPeriodStart.value)
  if (currentSeries.length > 0) {
    response.datasets.push({label: 'Période courante', data: currentSeries})
  }

  return response
})

const itemsBreakdown = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric child type properly
  const currentItems = (loanMetrics.value?.childMetrics ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define Metric child type properly
  const previousItems = (loanMetricsPreviousSeason.value?.childMetrics ?? []) as any[]

  return currentItems.map(cm => {
    const previous = previousItems.find(pm => pm.name === cm.name)
    const currentValue = cm.value ?? 0
    const previousValue = previous?.value ?? 0
    return {
      uuid: cm.name,
      name: cm.values?.itemName ?? cm.name,
      count: currentValue,
      openCount: cm.values?.openCount ?? 0,
      dailyAverage: currentValue / daysInPeriod.value,
      previousValue,
      isIncreasing: currentValue >= previousValue,
    }
  })
})

const topLoanedItems = computed(() =>
  [...itemsBreakdown.value].sort((a, b) => b.count - a.count).slice(0, 3)
)

const columns = [
  {accessorKey: 'name', header: 'Article'},
  {accessorKey: 'count', header: 'Prêts (période)'},
  {accessorKey: 'openCount', header: 'En cours'},
  {accessorKey: 'dailyAverage', header: 'Moy. / jour'},
  {accessorKey: 'evolution', header: 'Évolution'},
]

function handleDateRangeUpdate(range: DateRange | DateRangeFilter | undefined) {
  metricStore.setDateRange(range)
  metricStore.getMetrics(false, true)
  popoverOpen.value = false
}

function refreshMetrics() {
  metricStore.getMetrics(false, true)
  loadFixedWindowMetrics()
}

onMounted(() => {
  // Loans aren't season-bound — force a concrete date range (default: last 30 days) so daily
  // counts from the current and previous period can be aligned by day-offset in the chart.
  if (dateRange.value && 'value' in dateRange.value) {
    metricStore.setDateRange({start: dayjs().subtract(29, 'day').toDate(), end: new Date()})
  } else {
    metricStore.getMetrics()
  }
  loadFixedWindowMetrics()
})

watch(dateRange, () => {
  metricStore.getMetrics(false, true)
})
</script>

<template>
  <div>
    <div id="wrapper" class="mx-auto">

      <!-- Toolbox -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div class="w-full md:w-1/3 flex justify-start">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            to="/admin/statistics"
            label="Retour"
          />
        </div>

        <div class="w-full md:w-1/3 flex justify-center">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-heroicons-arrow-path"
            :loading="isLoading"
            @click="refreshMetrics()"
          >
            Dernière mise à jour : {{ formatDateTimeReadable(lastRefreshDate.toString()) }}
          </UButton>
        </div>

        <div class="w-full md:w-1/3 flex justify-center md:justify-end gap-2">
          <UPopover v-model:open="popoverOpen">
            <UButton
              color="primary"
              icon="i-heroicons-calendar-days"
              :label="dateRange ? formatDateRangeReadable(dateRange) || 'Choisir une période' : 'Choisir une période'"
            />

            <template #content>
              <GenericDateRangePicker
                :date-range="dateRange"
                :season-selectors="false"
                @range-updated="(range) => handleDateRangeUpdate(range)"
              />
            </template>
          </UPopover>

          <UButton :disabled="isLoading" icon="i-heroicons-printer" @click="print()" />
        </div>
      </div>

      <div v-if="previousPeriodInfo" class="text-sm text-center md:text-right text-gray-600 dark:text-gray-400 md:-mt-2 mb-2">
        <span class="font-medium">Période précédente : </span>
        <span class="ml-1">{{ previousPeriodInfo.description }}</span>
      </div>

      <div class="text-center mb-4">
        <USelect
          v-model="selectedMode"
          :items="modeItems"
          placeholder="Sélectionner une vue"
          class="w-full max-w-sm"
          :disabled="modeItems.length <= 1"
        />
      </div>

      <template v-if="!canAccess">
        <div class="text-center py-8">
          <p class="text-gray-500">Vous n'avez pas accès aux statistiques de prêt.</p>
        </div>
      </template>

      <template v-else-if="!selectedProfile?.club.loansEnabled">
        <div class="text-center py-8">
          <p class="text-gray-500">Les prêts ne sont pas activés pour ce club.</p>
        </div>
      </template>

      <template v-else-if="hasData">
        <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <GenericStatCard
            title="Total prêts"
            tooltip="Période courante"
            :value="loanStats.total"
            :is-increasing="loanStats.isIncreasing"
            :top-right="{
              tooltip: 'Période précédente',
              value: loanStats.previousTotal,
              useDefaultIcon: true
            }"
            :loading="isLoading"/>

          <GenericStatCard
            title="Évolution"
            tooltip="Variation par rapport à la période précédente"
            :value="(loanStats.isIncreasing ? '+' : '-') + Math.abs(loanStats.total - loanStats.previousTotal)"
            :is-increasing="loanStats.isIncreasing"
            :top-right="{
              tooltip: 'Variation relative',
              value: loanStats.previousTotal > 0 ? Math.round(((loanStats.total - loanStats.previousTotal) / loanStats.previousTotal) * 100) + '%' : 'N/A',
              useDefaultIcon: true
            }"
            :loading="isLoading"/>

          <GenericStatCard
            title="Moyenne journalière"
            tooltip="Prêts par jour, période courante"
            :value="formatRate(loanStats.dailyAverage)"
            :loading="isLoading"/>

          <GenericStatCard
            title="Total mensuel"
            tooltip="30 derniers jours"
            :value="fixedWindowStats.monthlyTotal"
            :is-increasing="fixedWindowStats.monthlyTotal >= fixedWindowStats.previousMonthlyTotal"
            :top-right="{
              tooltip: '30 jours précédents',
              value: fixedWindowStats.previousMonthlyTotal,
              useDefaultIcon: true
            }"
            :loading="isLoading"/>

          <GenericStatCard
            title="Total annuel"
            tooltip="365 derniers jours"
            :value="fixedWindowStats.yearlyTotal"
            :is-increasing="fixedWindowStats.yearlyTotal >= fixedWindowStats.previousYearlyTotal"
            :top-right="{
              tooltip: '365 jours précédents',
              value: fixedWindowStats.previousYearlyTotal,
              useDefaultIcon: true
            }"
            :loading="isLoading"/>

          <GenericStatCard
            v-if="isGlobalMode"
            title="Prêts en cours"
            tooltip="Actuellement, tous articles"
            :value="loanStats.openNow"
            :loading="isLoading"/>

          <GenericStatCard
            v-if="isGlobalMode"
            title="Articles distincts prêtés"
            tooltip="Période courante"
            :value="loanStats.distinctItems"
            :loading="isLoading"/>

          <GenericStatCard
            v-if="isGlobalMode"
            title="Emprunteurs distincts"
            tooltip="Période courante"
            :value="loanStats.distinctBorrowers"
            :loading="isLoading"/>
        </div>

        <GenericCard
          v-if="chartData.datasets.length > 0"
          class="mt-4"
          title="Prêts par mois">
          <div class="h-[40vh] sm:h-[55vh]">
            <ChartBar :data="chartData"/>
          </div>
        </GenericCard>

        <div v-if="isGlobalMode" class="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-4">
          <GenericCard title="Articles les plus demandés" class="lg:col-span-1">
            <div v-if="topLoanedItems.length === 0" class="text-sm italic text-muted py-4 text-center">
              Aucun prêt sur cette période.
            </div>
            <div v-else class="flex flex-col gap-2">
              <NuxtLink
                v-for="item in topLoanedItems"
                :key="item.uuid"
                :to="'/admin/loans/items/' + convertUuidToUrlUuid(item.uuid)"
                class="flex items-center justify-between hover:underline"
              >
                <span class="text-sm truncate">{{ item.name }}</span>
                <UBadge color="primary" variant="soft">{{ item.count }}</UBadge>
              </NuxtLink>
            </div>
          </GenericCard>

          <GenericCard title="Répartition par article" class="lg:col-span-2">
            <UTable :columns="columns" :data="itemsBreakdown">
              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">Aucune donnée disponible pour cette période.</span>
                </div>
              </template>

              <template #name-cell="{ row }">
                <NuxtLink :to="'/admin/loans/items/' + convertUuidToUrlUuid(row.original.uuid)" class="hover:underline">
                  {{ row.original.name }}
                </NuxtLink>
              </template>

              <template #dailyAverage-cell="{ row }">
                {{ formatRate(row.original.dailyAverage) }}
              </template>

              <template #evolution-cell="{ row }">
                <span :class="row.original.isIncreasing ? 'text-green-600' : 'text-red-600'">
                  {{ row.original.isIncreasing ? '+' : '-' }} {{ Math.abs(row.original.count - row.original.previousValue) }}
                  <span v-if="row.original.previousValue > 0">
                    / {{ row.original.isIncreasing ? '+' : '' }}{{ Math.round(((row.original.count - row.original.previousValue) / row.original.previousValue) * 100) }}%
                  </span>
                </span>
              </template>
            </UTable>
          </GenericCard>
        </div>
      </template>

      <div v-else-if="!isLoading" class="text-center py-8">
        <p class="text-gray-500">Aucune donnée disponible pour cette période.</p>
      </div>
    </div>
  </div>
</template>
