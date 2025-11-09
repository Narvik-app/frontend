import type {Ref} from "vue";
import {defineStore} from "pinia";
import dayjs from "dayjs";
import MetricQuery from "~/composables/api/query/MetricQuery";
import {type DateRange, DateRangeFilter} from "~/types/date";
import type {Metric} from "~/types/api/item/metric";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {formatDateInput} from "~/utils/date";

export const useMetricStore = defineStore('metric', () => {
  // Filter settings
  const previousSeason: Ref<boolean> = ref(false)
  const dateRange: Ref<DateRange | DateRangeFilter | undefined> = ref(DateRangeFilter.curent())

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
  function buildQueryParams(baseQuery: string, isSuperAdmin: boolean = false, isPreviousSeason: boolean = false): string {
    const urlParams = new URLSearchParams();

    if (dateRange.value) {
      if (typeof dateRange.value.value === 'string') {
        if (isPreviousSeason) {
          urlParams.append('previous-season', 'true');
        } else {
          urlParams.append(`${dateRange.value.value}`, 'true');
        }
      } else {
        const dateRangeObj = dateRange.value as DateRange;
        let startDate, endDate;

        if (isPreviousSeason) {
          // Subtract one year for previous season
          startDate = dayjs(dateRangeObj.start).subtract(1, 'year');
          endDate = dayjs(dateRangeObj.end).subtract(1, 'year');
        } else {
          startDate = dayjs(dateRangeObj.start);
          endDate = dayjs(dateRangeObj.end);
        }

        const formattedStartDate = formatDateInput(startDate.toString())
        const formattedEndDate = formatDateInput(endDate.add(1, 'days').toString())
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

  // Check if all required metrics are loaded
  function isMetricsLoaded(isSuperAdmin: boolean = false): boolean {
    // For super admin, we need all metrics
    if (isSuperAdmin) {
      return !!(
        openDaysMetrics.value &&
        openDaysMetricsPreviousSeason.value &&
        memberMetrics.value &&
        presenceMetrics.value &&
        presenceMetricsPreviousSeason.value &&
        externalPresenceMetrics.value &&
        externalPresenceMetricsPreviousSeason.value
      );
    }

    // For club, we need basic metrics and presence metrics only if presences are enabled
    const basicMetricsLoaded = !!(
      openDaysMetrics.value &&
      openDaysMetricsPreviousSeason.value &&
      memberMetrics.value
    );

    if (selectedProfile.value?.club.presencesEnabled) {
      return basicMetricsLoaded && !!(
        presenceMetrics.value &&
        presenceMetricsPreviousSeason.value &&
        externalPresenceMetrics.value &&
        externalPresenceMetricsPreviousSeason.value
      );
    }

    return basicMetricsLoaded;
  }

  // Clear all metrics data
  function clearMetrics() {
    openDaysMetrics.value = undefined;
    openDaysMetricsPreviousSeason.value = undefined;
    memberMetrics.value = undefined;
    presenceMetrics.value = undefined;
    presenceMetricsPreviousSeason.value = undefined;
    externalPresenceMetrics.value = undefined;
    externalPresenceMetricsPreviousSeason.value = undefined;
  }

  // Load metrics for super admin
  async function getSuperAdminMetrics(forceRefresh: boolean = false) {
    // Don't reload if metrics are already loaded and not forced
    if (!forceRefresh && isMetricsLoaded(true)) {
      return;
    }

    isLoading.value = true

    const promises = [
      metricsQuery.getSuperAdmin(buildQueryParams("opened-days", true, false)).then(value => {
        openDaysMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("opened-days", true, true)).then(value => {
        openDaysMetricsPreviousSeason.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin("members").then(value => {
        memberMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("presences", true, false)).then(value => {
        presenceMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("presences", true, true)).then(value => {
        presenceMetricsPreviousSeason.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("external-presences", true, false)).then(value => {
        externalPresenceMetrics.value = value.retrieved
      }),
      metricsQuery.getSuperAdmin(buildQueryParams("external-presences", true, true)).then(value => {
        externalPresenceMetricsPreviousSeason.value = value.retrieved
      })
    ];

    await Promise.all(promises)
    lastRefreshDate.value = new Date()
    isLoading.value = false
  }

  // Load metrics for club
  async function getClubMetrics(forceRefresh: boolean = false) {
    // Don't reload if metrics are already loaded and not forced
    if (!forceRefresh && areMetricsLoaded(false)) {
      return;
    }

    isLoading.value = true

    const promises = [
      metricsQuery.get(buildQueryParams("opened-days", false, false)).then(value => {
        openDaysMetrics.value = value.retrieved
      }),
      metricsQuery.get(buildQueryParams("opened-days", false, true)).then(value => {
        openDaysMetricsPreviousSeason.value = value.retrieved
      }),
      metricsQuery.get("members").then(value => {
        memberMetrics.value = value.retrieved
      })
    ];

    // We get presences stats
    if (selectedProfile.value?.club.presencesEnabled) {
      promises.push(
        metricsQuery.get(buildQueryParams("presences", false, false)).then(value => {
          presenceMetrics.value = value.retrieved
        }),
        metricsQuery.get(buildQueryParams("presences", false, true)).then(value => {
          presenceMetricsPreviousSeason.value = value.retrieved
        }),
        metricsQuery.get(buildQueryParams("external-presences", false, false)).then(value => {
          externalPresenceMetrics.value = value.retrieved
        }),
        metricsQuery.get(buildQueryParams("external-presences", false, true)).then(value => {
          externalPresenceMetricsPreviousSeason.value = value.retrieved
        })
      );
    }

    await Promise.all(promises)
    lastRefreshDate.value = new Date()
    isLoading.value = false
  }

  // Actions
  async function getMetrics(isSuperAdmin: boolean = false, forceRefresh: boolean = false) {
    if (isSuperAdmin) {
      await getSuperAdminMetrics(forceRefresh)
    } else {
      await getClubMetrics(forceRefresh)
    }
  }

  function setDateRange(range: DateRange | DateRangeFilter | undefined) {
    // Clear metrics when date range changes to force reload
    clearMetrics()
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
