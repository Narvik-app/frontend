import type {LoanCategory} from '~/types/api/item/clubDependent/plugin/loan/loanCategory'
import type {UuidItem} from '~/types/api/uuidItem'
import type {ClubLinkedItem} from '~/types/api/clubLinkedItem'
import type {TimestampItem} from '~/types/api/timestampItem'
import type {File} from '~/types/api/item/file'

export type LoanItemStatus = 'available' | 'maintenance' | 'sold' | 'retired'

export interface LoanItem extends UuidItem, ClubLinkedItem, TimestampItem {
  name?: string
  description?: string | null
  loanPrice?: string | null
  purchasePrice?: string | null
  soldPrice?: string | null
  status?: LoanItemStatus
  weight?: number | null
  category?: LoanCategory | string | null
  visibleOnSalePage?: boolean
  /** Computed: true if at least one open Loan exists (endDate IS NULL) */
  isCurrentlyLoaned?: boolean
  /** Computed: total number of times this item has been loaned */
  timesLoaned?: number
  image?: File | null
}
