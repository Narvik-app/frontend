export interface TimeAndTravelSummaryRow {
  memberUuid: string
  firstname: string
  lastname: string
  licence: string | null
  declarationCount: number
  totalKilometers: number
  totalHours: number
  totalTravelAmount: number
  totalTimeAmount: number
  totalAmount: number
}
