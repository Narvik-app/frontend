import {defineStore} from "pinia";
import {DateRangeFilter} from "~/types/date";
import type {DateRange} from "~/types/date";

/**
 * Shared date range filter for the time-and-travel pages ("Mes déclarations",
 * "Toutes les déclarations", and the member detail drill-down): one picker,
 * kept in sync across all of them, driving both the declarations list and the
 * totals shown above it. Mirrors the /admin dashboard's metric store: always
 * set (defaults to the current season, never cleared to undefined).
 */
export const useTimeAndTravelStore = defineStore('timeAndTravel', () => {
  const selectedRange: Ref<DateRange | DateRangeFilter | undefined> = ref(DateRangeFilter.curent())

  function setSelectedRange(range: DateRange | DateRangeFilter | undefined) {
    selectedRange.value = range
  }

  return {
    selectedRange,
    setSelectedRange,
  }
})
