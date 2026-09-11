import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {File} from "~/types/api/item/file";

export enum TimeAndTravelExportStatus {
  Draft = 'draft',
  Locked = 'locked',
}

export const EXPORT_STATUS_LABELS: Record<TimeAndTravelExportStatus, string> = {
  [TimeAndTravelExportStatus.Draft]: 'Brouillon',
  [TimeAndTravelExportStatus.Locked]: 'Verrouillé',
}

export const EXPORT_STATUS_COLORS: Record<TimeAndTravelExportStatus, 'warning' | 'success'> = {
  [TimeAndTravelExportStatus.Draft]: 'warning',
  [TimeAndTravelExportStatus.Locked]: 'success',
}

interface _TimeAndTravelExport extends UuidItem, ClubLinkedItem, TimestampItem {
  status?: TimeAndTravelExportStatus
  startDate?: string
  endDate?: string
  label?: string | null
  smicHourlyRate?: string | null
  generatedBy?: Member | string | null
  lockedAt?: string | null
  lockedBy?: Member | string | null
  unlockedAt?: string | null
  unlockedBy?: Member | string | null
  recapFile?: File | null
  declarationCount?: number
  memberCount?: number
  totalAmount?: number
}

export interface TimeAndTravelExport extends _TimeAndTravelExport {
  status: TimeAndTravelExportStatus
  startDate: string
  endDate: string
}

export interface WriteTimeAndTravelExport {
  startDate: string
  endDate: string
  label?: string | null
}

export interface TimeAndTravelExportAttestation extends UuidItem, ClubLinkedItem, TimestampItem {
  export?: TimeAndTravelExport | string | null
  member?: Member | string | null
  file?: File | null
  totalKilometers?: number
  totalHours?: string
  totalTravelAmount?: string
  totalTimeAmount?: string
  totalAmount?: number
}
