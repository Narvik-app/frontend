import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {UuidItem} from '~/types/api/uuidItem'
import type {ClubLinkedItem} from '~/types/api/clubLinkedItem'
import type {TimestampItem} from '~/types/api/timestampItem'

export interface Loan extends UuidItem, ClubLinkedItem, TimestampItem {
  loanItem?: LoanItem | string | null
  /** The member who borrows the item */
  member?: Member | string | null
  /** Free-text borrower name, used when the borrower is not a club member */
  borrowerName?: string | null
  /** The supervisor/admin who lent the item */
  author?: Member | string | null
  startDate?: string
  endDate?: string | null
  comment?: string | null
}
