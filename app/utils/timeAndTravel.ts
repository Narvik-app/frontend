import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import {base64ToBlob, createBrowserFileDownload} from '~/utils/browser'
import FileQuery from '~/composables/api/query/FileQuery'
import type {File} from '~/types/api/item/file'
import type {DateRange, DateRangeFilter} from '~/types/date'
import {formatDateInput} from '~/utils/date'

export {VEHICLE_ENGINE_TYPE_LABELS, getSelectMenuVehicleEngineType} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
export {EXPORT_STATUS_LABELS, EXPORT_STATUS_COLORS} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'

/** Mirrors TimeAndTravelDeclaration::LOCATION_MAX_LENGTH / DESCRIPTION_MAX_LENGTH on the backend — kept short so a trajet still fits on one line in the exports. */
export const DECLARATION_LOCATION_MAX_LENGTH = 30
export const DECLARATION_DESCRIPTION_MAX_LENGTH = 50

/** A declaration can be edited/deleted by its owner or an authorized supervisor/admin only while it's not locked. */
export function declarationIsEditable(declaration: TimeAndTravelDeclaration): boolean {
  return !declaration.isLocked
}

/** Mirrors TimeAndTravelDeclaration::validateHoursGranularity on the backend — half-hour steps only, to avoid ambiguous entries like "1.3" (meant as 1h30, actually 1.3h). */
export function isValidHoursGranularity(hours: number): boolean {
  return Math.abs(hours * 2 - Math.round(hours * 2)) < 0.001
}

export function vehicleDisplayName(vehicle?: MemberVehicle | string | null): string {
  if (!vehicle || typeof vehicle === 'string') return ''
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ') + (vehicle.licensePlate ? ` — ${vehicle.licensePlate}` : '')
}

/**
 * Trajet display for the declarations tables — blank for an hours-only declaration (no distance), ↔ for a round trip.
 * The text-presentation variation selector (U+FE0E) forces the plain Unicode glyph instead of a colorful emoji
 * rendering, which some browsers/fonts otherwise substitute for U+2194.
 */
export function formatTrajet(declaration: TimeAndTravelDeclaration): string {
  if (!declaration.departureLocation && !declaration.arrivalLocation) return '-'
  const arrow = declaration.isRoundtrip ? '↔︎' : '→︎'
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
 * Fetches a File's content through the private files endpoint and turns it into a blob: object
 * URL, so callers can bind it as a real <a href> (download links need an actual href up front to
 * support the browser's native middle-click/ctrl-click/"open in new tab" behavior — a click handler
 * firing an async fetch can't). Shared by the export page (recap, zip) and the member board
 * (attestations) so there is one implementation. The returned URL must be revoked (URL.revokeObjectURL)
 * once no longer needed.
 */
export async function getFileObjectUrl(file: File | null | undefined, mimeType = 'application/pdf'): Promise<{ url?: string, error?: Error }> {
  if (!file?.privateUrl) {
    return {error: new Error('Fichier introuvable')}
  }

  const fileQuery = new FileQuery()
  const {retrieved, error} = await fileQuery.getFromUrl(file.privateUrl)
  if (error || !retrieved) {
    return {error: error ?? new Error('Fichier introuvable')}
  }

  return {url: URL.createObjectURL(base64ToBlob(retrieved.base64, mimeType))}
}

/**
 * Fetches a File's content and triggers an immediate browser download — for a one-off download
 * button (e.g. in a list of many rows) where eagerly resolving every row's file into a persistent
 * link via getFileObjectUrl/useFileDownloadLinks would be wasteful. Mirrors the CSV export buttons
 * elsewhere in the app.
 */
export async function downloadFile(file: File | null | undefined, filename: string, mimeType = 'application/pdf'): Promise<{ error?: Error }> {
  if (!file?.privateUrl) {
    return {error: new Error('Fichier introuvable')}
  }

  const fileQuery = new FileQuery()
  const {retrieved, error} = await fileQuery.getFromUrl(file.privateUrl)
  if (error || !retrieved) {
    return {error: error ?? new Error('Fichier introuvable')}
  }

  createBrowserFileDownload(filename, retrieved.base64, mimeType)
  return {}
}
