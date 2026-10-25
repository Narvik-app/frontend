import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import {base64ToBlob, createBrowserFileDownload} from '~/utils/browser'
import FileQuery from '~/composables/api/query/FileQuery'
import type {File} from '~/types/api/item/file'
import type {DateRange, DateRangeFilter} from '~/types/date'
import {formatDateInput} from '~/utils/date'

/** Mirrors TimeAndTravelDeclaration::LOCATION_MAX_LENGTH / DESCRIPTION_MAX_LENGTH on the backend — kept short so a trajet still fits on one line in the exports. */
export const DECLARATION_LOCATION_MAX_LENGTH = 30

// Pre-filled when kilometers are declared on a new declaration: by far the most common trip.
export const DEFAULT_DEPARTURE_LOCATION = 'Domicile'
export const DEFAULT_ARRIVAL_LOCATION = 'Association'
export const DECLARATION_DESCRIPTION_MAX_LENGTH = 50

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
  const {base64, error} = await fetchFileBase64(file)
  if (base64 === undefined) {
    return {error}
  }

  return {url: URL.createObjectURL(base64ToBlob(base64, mimeType))}
}

async function fetchFileBase64(file: File | null | undefined): Promise<{ base64?: string, error?: Error }> {
  if (!file?.privateUrl) {
    return {error: new Error('Fichier introuvable')}
  }

  const {retrieved, error} = await new FileQuery().getFromUrl(file.privateUrl)
  if (error || !retrieved) {
    return {error: error ?? new Error('Fichier introuvable')}
  }

  return {base64: retrieved.base64}
}

/**
 * Fetches a File's content and triggers an immediate browser download — for a one-off download
 * button (e.g. in a list of many rows) where eagerly resolving every row's file into a persistent
 * link via getFileObjectUrl/useFileDownloadLinks would be wasteful. Mirrors the CSV export buttons
 * elsewhere in the app.
 */
export async function downloadFile(file: File | null | undefined, filename: string, mimeType = 'application/pdf'): Promise<{ error?: Error }> {
  const {base64, error} = await fetchFileBase64(file)
  if (base64 === undefined) {
    return {error}
  }

  createBrowserFileDownload(filename, base64, mimeType)
  return {}
}
