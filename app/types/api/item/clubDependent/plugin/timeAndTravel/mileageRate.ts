import type {Item} from "~/types/api/item";

export enum VehicleCategory {
  Car = 'car',
  Motorcycle = 'motorcycle',
  Moped = 'moped',
}

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  [VehicleCategory.Car]: 'Voiture',
  [VehicleCategory.Motorcycle]: 'Moto',
  [VehicleCategory.Moped]: 'Cyclomoteur (< 50 cm3)',
}

export interface MileageRate extends Item {
  category?: VehicleCategory
  minFiscalPower?: number | null
  maxFiscalPower?: number | null
  tierOrder?: number
  tierMaxKm?: number | null
  rate?: string
  addend?: string
}
