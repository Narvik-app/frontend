import type {Sale} from "~/types/api/item/clubDependent/plugin/sale/sale";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import type {SalePerItemStat, SaleStatsPaymentMode} from "~/types/api/item/clubDependent/plugin/sale/saleStats";
import {formatDateInput} from "~/utils/date";
import dayjs from "dayjs";
import SaleQuery from "~/composables/api/query/clubDependent/plugin/sale/SaleQuery";
import SalePaymentModeQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentModeQuery";
import MetricQuery from "~/composables/api/query/MetricQuery";
import type {Member} from "~/types/api/item/clubDependent/member";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import {createBrowserCsvDownload} from "~/utils/browser";
import {defineStore} from "pinia";
import {ClubRole} from "~/types/api/item/club";
import type {DateRangeFilter, DateRange} from "~/types/date";

export const useSaleStore = defineStore('sale', () => {
  const saleQuery = new SaleQuery()
  const paymentModeQuery = new SalePaymentModeQuery()
  const memberQuery = new MemberQuery()
  const saleStatsQuery = new MetricQuery<SaleStatsPaymentMode[]>()
  const salePerItemStatsQuery = new MetricQuery<SalePerItemStat[]>()

  const isLoading = ref(false)
  const isLoadingStats = ref(false)
  const isDownloadingCsv = ref(false)
  const selectedRange: Ref<DateRange | DateRangeFilter | undefined> = ref({start: new Date(), end: new Date()})
  const lastRefreshDate: Ref<Date> = ref(new Date())

  const sales: Ref<Sale[]> = ref([])
  const totalItems = ref(0)
  const page = ref(1)
  const itemsPerPage = ref(30)
  const sortDesc: Ref<boolean | undefined> = ref(true)

  const saleStats: Ref<SaleStatsPaymentMode[]> = ref([])
  const totalCount = ref(0)
  const totalAmount = ref(0)
  const perItemStats: Ref<SalePerItemStat[]> = ref([])

  const seller: Ref<Member | undefined> = ref(undefined)
  const sellers: Ref<Member[]> = ref([])
  const sellersLoading: Ref<Member[]> = ref([])

  const paymentModes: Ref<SalePaymentMode[]> = ref([])

  // Bumped on every getSales()/getSalePerItemStats() call so an in-flight request whose
  // response arrives after a newer one (e.g. rapidly switching date ranges) is discarded
  // instead of overwriting the more recent, already-displayed result.
  let requestGeneration = 0
  // Set to the generation that currently owns isLoading/isLoadingStats, cleared once that
  // generation's fetch settles. Lets a cache-hit ensure*() know it's safe to clear a
  // loading flag without racing a fetch that's still in flight for a newer generation.
  let pendingGeneration: number | null = null

  // A string key derived from the filters that produced the currently loaded `sales`/
  // `perItemStats`. Comparing it against the *current* filters (below) tells us whether the
  // cached data actually matches what's on screen, instead of relying on dirty flags that
  // are easy to forget to set on every mutation site.
  function serializeRange(range: DateRange | DateRangeFilter | undefined): string {
    if (!range) return 'none'
    if (typeof (range as DateRangeFilter).value === 'string') {
      return `filter:${(range as DateRangeFilter).value}`
    }
    const r = range as DateRange
    return `range:${formatDateInput(r.start?.toString()) ?? '-'}:${formatDateInput(r.end?.toString()) ?? '-'}`
  }

  const rangeKey = computed(() => serializeRange(selectedRange.value))
  // The sales list also depends on pagination/sorting; the per-item stats endpoint doesn't.
  const salesFilterKey = computed(() => [rangeKey.value, page.value, itemsPerPage.value, sortDesc.value ?? 'unsorted'].join('|'))
  const perItemFilterKey = computed(() => rangeKey.value)

  const salesLoadedKey: Ref<string | null> = ref(null)
  const perItemLoadedKey: Ref<string | null> = ref(null)

  function buildListDateParams(): URLSearchParams {
    const urlParams = new URLSearchParams()

    if (selectedRange.value) {
      if (typeof selectedRange.value.value === 'string') {
        urlParams.append(`${selectedRange.value.value}[createdAt]`, 'true');
      } else {
        const formattedStartDate = formatDateInput(selectedRange.value.start.toString())
        const formattedEndDate = formatDateInput(dayjs(selectedRange.value.end).add(1, 'days').toString())
        if (formattedStartDate) {
          urlParams.append(`createdAt[after]`, formattedStartDate);

          if (formattedEndDate) {
            urlParams.append(`createdAt[strictly_before]`, formattedEndDate);
          } else {
            urlParams.append(`createdAt[strictly_before]`, formattedStartDate);
          }
        }
      }
    }

    return urlParams
  }

  function buildMetricDateParams(): URLSearchParams {
    const urlParams = new URLSearchParams()

    if (selectedRange.value) {
      if (typeof selectedRange.value.value === 'string') {
        if (selectedRange.value.value === 'previous-season') {
          urlParams.append('previous-season', 'true');
        }
        // current-season: the metric endpoint already defaults to it
      } else {
        const formattedStartDate = formatDateInput(selectedRange.value.start.toString())
        const formattedEndDate = formatDateInput(selectedRange.value.end.toString())
        if (formattedStartDate) {
          urlParams.append('start', formattedStartDate);
          urlParams.append('end', formattedEndDate ?? formattedStartDate);
        }
      }
    }

    return urlParams
  }

  async function getSales() {
    const generation = ++requestGeneration
    pendingGeneration = generation
    const key = salesFilterKey.value
    isLoading.value = true

    const urlParams = buildListDateParams()
    urlParams.set('page', page.value.toString())
    urlParams.set('itemsPerPage', itemsPerPage.value.toString())
    if (sortDesc.value !== undefined) {
      urlParams.set('order[createdAt]', sortDesc.value ? 'desc' : 'asc')
    }

    let ok = true
    await Promise.all([
      saleQuery.getAll(urlParams).then(({ items, totalItems: total, error }) => {
        // On a transient fetch failure, or if a newer request has since started, keep
        // the last known-good list/count instead of flashing to empty/0 or a stale value.
        if (error) { ok = false; return }
        if (generation !== requestGeneration) return
        sales.value = items
        totalItems.value = total ?? 0
      }),
      getSaleStats(generation),
      getPaymentModes(),
    ])

    if (generation !== requestGeneration) return
    pendingGeneration = null
    isLoading.value = false
    // Never cache a failed load as "loaded for this key" - the next ensureSalesLoaded()
    // call must retry instead of silently keeping stale data on screen.
    salesLoadedKey.value = ok ? key : null
    lastRefreshDate.value = new Date()
  }

  async function getSaleStats(generation: number = ++requestGeneration) {
    isLoadingStats.value = true

    const urlParams = buildMetricDateParams()
    const queryString = urlParams.toString()
    const { retrieved, error } = await saleStatsQuery.get('sales-stats' + (queryString ? '?' + queryString : ''))

    // On a transient fetch failure, or if a newer request has since started (e.g. rapidly
    // switching date ranges), keep the last known-good stats instead of overwriting them
    // with 0 or with a result that no longer matches the currently selected range.
    if (generation !== requestGeneration) return

    if (!error) {
      saleStats.value = retrieved?.values ?? []
      totalCount.value = retrieved?.value ?? 0
      totalAmount.value = retrieved?.childMetrics?.find(m => m.name === 'total-amount')?.value ?? 0
    }

    isLoadingStats.value = false
  }

  async function getSalePerItemStats() {
    const generation = ++requestGeneration
    pendingGeneration = generation
    const key = perItemFilterKey.value
    isLoadingStats.value = true

    const urlParams = buildMetricDateParams()
    const queryString = urlParams.toString()

    let ok = true
    await Promise.all([
      salePerItemStatsQuery.get('sales-per-item-stats' + (queryString ? '?' + queryString : '')).then(({ retrieved, error }) => {
        if (error) { ok = false; return }
        if (generation !== requestGeneration) return
        perItemStats.value = retrieved?.values ?? []
      }),
      getSaleStats(generation),
      getPaymentModes(),
    ])

    if (generation !== requestGeneration) return
    pendingGeneration = null
    isLoadingStats.value = false
    perItemLoadedKey.value = ok ? key : null
    lastRefreshDate.value = new Date()
  }

  // Only clears loading flags when nothing is in flight, so it can never stomp on a
  // fetch that owns them for a newer generation.
  function settleIdleLoading() {
    if (pendingGeneration !== null) return
    isLoading.value = false
    isLoadingStats.value = false
  }

  function ensureSalesLoaded() {
    if (salesLoadedKey.value === salesFilterKey.value) {
      settleIdleLoading()
      return Promise.resolve()
    }
    return getSales()
  }

  function ensurePerItemStatsLoaded() {
    if (perItemLoadedKey.value === perItemFilterKey.value) {
      settleIdleLoading()
      return Promise.resolve()
    }
    return getSalePerItemStats()
  }

  function ensureLoaded(perItem: boolean) {
    return perItem ? ensurePerItemStatsLoaded() : ensureSalesLoaded()
  }

  function invalidateSales() {
    salesLoadedKey.value = null
  }

  function invalidatePerItemStats() {
    perItemLoadedKey.value = null
  }

  function invalidateSaleData() {
    invalidateSales()
    invalidatePerItemStats()
  }

  async function getSalesCsv() {
    isDownloadingCsv.value = true

    if (!selectedRange.value) {
      isDownloadingCsv.value = false
      useToast().add({
        color: "error",
        title: "Date non définie.",
        description: "Veuillez sélectionner une date afin de pouvoir télécharger le csv."
      })
      return;
    }

    const urlParams = buildListDateParams()

    // We make the search
    const { data } = await saleQuery.getAllCsv(urlParams)
    isDownloadingCsv.value = false
    createBrowserCsvDownload('sales.csv', data)
  }

  async function getPaymentModes() {
    const { items: paymentModesResponse } = await paymentModeQuery.getAll()
    paymentModes.value = paymentModesResponse
  }

  async function getSellers(page: number = 1) {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      'order[lastname]': 'ASC',
      'order[firstname]': 'ASC',
      'exists[licence]': 'true', // Exclude super admin
    });
    // URLSearchParams ways so both filter are applied
    urlParams.append('userMember.role[]', ClubRole.Admin)
    urlParams.append('userMember.role[]', ClubRole.Supervisor)

    const { items, view } = await memberQuery.getAll(urlParams)
    sellersLoading.value = sellersLoading.value.concat(items)

    // We load the next page
    if (view && view["next"]) {
      await getSellers(page + 1)
      return;
    }

    // No more pages to load
    isLoading.value = false

    sellers.value = sellersLoading.value
    sellersLoading.value = []
  }

  function setSelectedRange(range: DateRange | DateRangeFilter | undefined) {
    selectedRange.value = range
    page.value = 1
  }

  return {
    sales,
    totalItems,
    page,
    itemsPerPage,
    sortDesc,

    saleStats,
    totalCount,
    totalAmount,
    perItemStats,

    seller,
    sellers,
    paymentModes,

    isLoading,
    isLoadingStats,
    isDownloadingCsv,
    selectedRange,
    lastRefreshDate,

    salesFilterKey,
    perItemFilterKey,
    salesLoadedKey,
    perItemLoadedKey,

    getSales,
    getSaleStats,
    getSalePerItemStats,
    getSalesCsv,
    getSellers,
    getPaymentModes,
    setSelectedRange,
    ensureSalesLoaded,
    ensurePerItemStatsLoaded,
    ensureLoaded,
    invalidateSales,
    invalidatePerItemStats,
    invalidateSaleData,
  }
}, {
  persist: {
    pick: ['seller'],
  },
})
