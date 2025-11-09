import type {Ref} from "vue";
import {defineStore} from "pinia";
import dayjs from "dayjs";
import MetricQuery from "~/composables/api/query/MetricQuery";
import type {DateRange, DateRangeFilter} from "~/types/date";
import type {Metric} from "~/types/api/item/metric";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {formatDateInput} from "~/utils/date";

export const useMetricStore = defineStore('metric', () => {
  // Filter settings
  const previousSeason: Ref<boolean> = ref(false)
  const dateRange: Ref<DateRange | DateRangeFilter | undefined> = ref(undefined)

  const isLoading: Ref<boolean> = ref(false)
  const lastRefreshDate: Ref<Date> = ref(new Date())
  const metricsQuery = new MetricQuery()

  // Metric data
  const openDaysMetrics: Ref<Metric | undefined> = ref(undefined);
  const openDaysMetricsPreviousSeason: Ref<Metric | undefined> = ref(undefined);
  const memberMetrics: Ref<Metric | undefined> = ref(undefined);
  const presenceMetrics: Ref<Metric | undefined> = ref(undefined);
  const presenceMetricsPreviousSeason: Ref<Metric | undefined> = ref(undefined);
  const externalPresenceMetrics: Ref<Metric | undefined> = ref(undefined);
  const externalPresenceMetricsPreviousSeason: Ref<Metric | undefined> = ref(undefined);

  const selfStore = useSelfUserStore();
  const { selectedProfile } = storeToRefs(selfStore)

  // Build query parameters based on current filters
  function buildQueryParams(baseQuery: string, isSuperAdmin: boolean = false): string {
    const urlParams = new URLSearchParams();

    if (dateRange.value) {
      if (typeof dateRange.value.value === 'string') {
        urlParams.append(`${dateRange.value.value}`, 'true');
      } else {
        const dateRangeObj = dateRange.value as DateRange;
        const formattedStartDate = formatDateInput(dateRangeObj.start.toString())
        const formattedEndDate = formatDateInput(dayjs(dateRangeObj.end).add(1, 'days').toString())
        if (formattedStartDate) {
          urlParams.append(`start`, formattedStartDate);

          if (formattedEndDate) {
            urlParams.append(`end`, formattedEndDate);
          } else {
            urlParams.append(`end`, formattedStartDate);
          }
        }
      }
    }

    const queryString = urlParams.toString();
    if (queryString) {
      return baseQuery + '?' + queryString;
    }
    return baseQuery;
  }

  // Load metrics for super admin
  async function getSuperAdminMetrics() {
    isLoading.value = true

    const promises = [
      metricsQuery.getSuperAdmin(buildQueryParams("opened-days", true)).then(value => {
        openDaysMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("opened-days", true)).then(value => {
        openDaysMetricsPreviousSeason.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin("members").then(value => {
        memberMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("presences", true)).then(value => {
        presenceMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("presences", true)).then(value => {
        presenceMetricsPreviousSeason.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("external-presences", true)).then(value => {
        externalPresenceMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("external-presences", true)).then(value => {
        externalPresenceMetricsPreviousSeason.value = value.retrieved
      })
    ];

    await Promise.all(promises)
    lastRefreshDate.value = new Date()
    isLoading.value = false
  }

  // Load metrics for club
  async function getClubMetrics() {
    isLoading.value = true

    const promises = [
      metricsQuery.get(buildQueryParams("opened-days")).then(value => {
        openDaysMetrics.value = value.retrieved
      }),
      metricsQuery.get(buildQueryParams("opened-days")).then(value => {
        openDaysMetricsPreviousSeason.value = value.retrieved
      }),
      metricsQuery.get("members").then(value => {
        memberMetrics.value = value.retrieved
      })
    ];

    // We get presences stats
    if (selectedProfile.value?.club.presencesEnabled) {
      promises.push(
        metricsQuery.get(buildQueryParams("presences")).then(value => {
          presenceMetrics.value = value.retrieved
        }),
        metricsQuery.get(buildQueryParams("presences")).then(value => {
          presenceMetricsPreviousSeason.value = value.retrieved
        }),
        metricsQuery.get(buildQueryParams("external-presences")).then(value => {
          externalPresenceMetrics.value = value.retrieved
        }),
        metricsQuery.get(buildQueryParams("external-presences")).then(value => {
          externalPresenceMetricsPreviousSeason.value = value.retrieved
        })
      );
    }

    await Promise.all(promises)
    lastRefreshDate.value = new Date()
    isLoading.value = false
  }

  // Actions
  async function getMetrics(isSuperAdmin: boolean = false) {
    if (isSuperAdmin) {
      await getSuperAdminMetrics()
    } else {
      await getClubMetrics()
    }
  }

  function setDateRange(range: DateRange | DateRangeFilter | undefined) {
    dateRange.value = range
  }

  return {
    // State
    previousSeason,
    dateRange,
    isLoading,
    lastRefreshDate,

    // Metric data
    openDaysMetrics,
    openDaysMetricsPreviousSeason,
    memberMetrics,
    presenceMetrics,
    presenceMetricsPreviousSeason,
    externalPresenceMetrics,
    externalPresenceMetricsPreviousSeason,

    // Actions
    getMetrics,
    setDateRange,
  }
})
