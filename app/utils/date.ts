import dayjs from "dayjs";
import type {DateRangeFilter, DateRange} from "~/types/date";

export function formatDate(date?: string): string | null {
  if (!date) return null;

  return dayjs(date).format("DD/MM/YYYY");
}

export function formatDateTime(date?: string): string | null {
  if (!date) return null;

  return dayjs(date).format("DD/MM/YYYY HH:mm");
}

export function formatDateTimeReadable(date?: string): string | null {
  if (!date) return null;

  return formatDateReadable(date) + " à " + formatTimeReadable(date);
}

export function formatDateReadable(date?: string): string | null {
  if (!date) return null;

  return new Date(date).toLocaleString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'});
}

export function formatDateRangeReadable(dateRange?: DateRange|DateRangeFilter): string | null {
  if (!dateRange) return null;
  let response = '';

  const isFilter = typeof dateRange.label === 'string';
  if (isFilter) {
    return dateRange.label
  }

  if (dateRange.start) {
    response += formatDateReadable(dateRange.start.toString())
  }

  if (dateRange.end) {
    if (dayjs(dateRange.start).isSame(dateRange.end)) return response;

    if (response != '') response += ' - '
    response += formatDateReadable(dateRange.end.toString())
  }

  return response
}

export function formatTimeReadable(date?: string): string | null {
  if (!date) return null;
  return new Date(date).toLocaleString('fr-FR', {hour: '2-digit', minute: '2-digit'});
}

export function formatDateInput(value?: string): string | null {
  if (!value) {
    return null;
  }

  return dayjs(value).format("YYYY-MM-DD");
}

/** Appends date[after]/date[before] (or the current-season/previous-season filter) to a URLSearchParams, matching PresentMemberList's convention. */
export function appendDateRangeParams(urlParams: URLSearchParams, range?: DateRange | DateRangeFilter): void {
  if (!range) return

  if ('value' in range && typeof range.value === 'string') {
    urlParams.append(`${range.value}[date]`, 'true')
    return
  }

  const dateRange = range as DateRange
  const formattedStartDate = formatDateInput(dateRange.start.toString())
  const formattedEndDate = formatDateInput(dateRange.end.toString())
  if (formattedStartDate) {
    urlParams.append('date[after]', formattedStartDate)
    urlParams.append('date[before]', formattedEndDate ?? formattedStartDate)
  }
}
