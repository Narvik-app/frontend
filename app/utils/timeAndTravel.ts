import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import {formatMonetary} from '~/utils/string'
import {createBrowserPdfDownload} from '~/utils/browser'
import FileQuery from '~/composables/api/query/FileQuery'
import type {File} from '~/types/api/item/file'
import type {DateRange, DateRangeFilter} from '~/types/date'
import {formatDateInput} from '~/utils/date'

export {VEHICLE_ENGINE_TYPE_LABELS, getSelectMenuVehicleEngineType} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
export {EXPORT_STATUS_LABELS, EXPORT_STATUS_COLORS} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'

/** A declaration can be edited/deleted by its owner or an authorized supervisor/admin only while it's not locked. */
export function declarationIsEditable(declaration: TimeAndTravelDeclaration): boolean {
  return !declaration.isLocked
}

export function vehicleDisplayName(vehicle?: MemberVehicle | string | null): string {
  if (!vehicle || typeof vehicle === 'string') return ''
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ') + (vehicle.licensePlate ? ` — ${vehicle.licensePlate}` : '')
}

export function formatAmount(value?: number | string | null): string {
  if (value === undefined || value === null) return formatMonetary(undefined)
  return formatMonetary(value)
}

/** Trajet display for the declarations tables — blank for an hours-only declaration (no distance), ↔ for a round trip. */
export function formatTrajet(declaration: TimeAndTravelDeclaration): string {
  if (!declaration.departureLocation && !declaration.arrivalLocation) return '-'
  const arrow = declaration.isRoundtrip ? '↔' : '→'
  return `${declaration.departureLocation ?? ''} ${arrow} ${declaration.arrivalLocation ?? ''}`
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

/**
 * Fetches a File's content through the public files endpoint and triggers a
 * browser download of the PDF. Shared by the export page (recap) and the
 * member board (attestations) so there is one implementation.
 */
export async function downloadFilePdf(file: File | null | undefined, filename: string): Promise<{ error?: Error }> {
  if (!file?.privateUrl) {
    return {error: new Error('Fichier introuvable')}
  }

  const fileQuery = new FileQuery()
  const {retrieved, error} = await fileQuery.getFromUrl(file.privateUrl)
  if (error || !retrieved) {
    return {error: error ?? new Error('Fichier introuvable')}
  }

  createBrowserPdfDownload(filename, retrieved.base64)
  return {}
}
