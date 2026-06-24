import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {UuidItem} from '~/types/api/uuidItem'
import type {ClubLinkedItem} from '~/types/api/clubLinkedItem'

export interface LoanCategory extends UuidItem, ClubLinkedItem {
  name?: string
  weight?: number
  items?: LoanItem[]
}
