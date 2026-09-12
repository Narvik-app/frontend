import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {TimestampItem} from "~/types/api/timestampItem";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {SelectMenuItem} from "#ui/types";
import {VehicleCategory, VEHICLE_CATEGORY_LABELS} from "~/types/api/item/clubDependent/plugin/timeAndTravel/mileageRate";

export {VehicleCategory, VEHICLE_CATEGORY_LABELS}

export function getSelectMenuVehicleCategory(): SelectMenuItem[] {
  return Object.values(VehicleCategory).map((value) => ({
    label: VEHICLE_CATEGORY_LABELS[value],
    value,
  }))
}

export enum VehicleEngineType {
  Petrol = 'petrol',
  Diesel = 'diesel',
  Electric = 'electric',
  Hybrid = 'hybrid',
}

export const VEHICLE_ENGINE_TYPE_LABELS: Record<VehicleEngineType, string> = {
  [VehicleEngineType.Petrol]: 'Essence',
  [VehicleEngineType.Diesel]: 'Diesel',
  [VehicleEngineType.Electric]: 'Électrique',
  [VehicleEngineType.Hybrid]: 'Hybride',
}

export function getSelectMenuVehicleEngineType(): SelectMenuItem[] {
  return Object.values(VehicleEngineType).map((value) => ({
    label: VEHICLE_ENGINE_TYPE_LABELS[value],
    value,
  }))
}

interface _MemberVehicle extends UuidItem, ClubLinkedItem, TimestampItem {
  member?: Member | string | null
  brand?: string
  model?: string | null
  licensePlate?: string
  engineType?: VehicleEngineType
  category?: VehicleCategory
  fiscalPower?: number
  isEnabled?: boolean
}

export interface MemberVehicle extends _MemberVehicle {
  brand: string
  licensePlate: string
  isEnabled: boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WriteMemberVehicle extends _MemberVehicle {
}
