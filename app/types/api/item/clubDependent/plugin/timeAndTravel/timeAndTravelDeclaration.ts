import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {MemberVehicle} from "~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle";
import type {TimeAndTravelExport} from "~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport";

interface _TimeAndTravelDeclaration extends UuidItem, ClubLinkedItem, TimestampItem {
  member?: Member | string | null
  date?: string
  /** Only set (and required by the backend) when kilometers is declared */
  departureLocation?: string | null
  arrivalLocation?: string | null
  /** Optional — at least one of kilometers/hours is required, enforced by the backend */
  kilometers?: number | null
  hours?: string | null
  description?: string
  /** Only relevant when kilometers is declared */
  isRoundtrip?: boolean
  memberVehicle?: MemberVehicle | string | null
  /** Read-only, set only once attached to an export */
  export?: TimeAndTravelExport | string | null

  // Backend-computed, read-only
  travelAmount?: number
  timeAmount?: number
  totalAmount?: number
  isLocked?: boolean
}

export interface TimeAndTravelDeclaration extends _TimeAndTravelDeclaration {
  date: string
  description: string
  isRoundtrip: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WriteTimeAndTravelDeclaration extends _TimeAndTravelDeclaration {
}
